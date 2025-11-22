// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./utils/IERC20.sol";
import "./utils/SafeERC20.sol";
import "./utils/ReentrancyGuard.sol";

/**
 * @title Escrow
 * @notice USDC-style escrow (6 decimals) with:
 *         - $1 push confirmation by counterparty (expectedConfirmer + TTL)
 *         - Buyer funding via push transfer, limited to expectedFunder
 *         - Oracle-driven resolution (poll or mutual DM-consent)
 *         - Optional mutual on-chain release (both parties call signalRelease)
 *
 * Lifecycle:
 *   AwaitingConfirmation -> ConfirmedAwaitingFunding -> Funded -> Resolved
 */
contract Escrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---- State machine / results ---------------------------------------------------------------
    enum Phase { AwaitingConfirmation, ConfirmedAwaitingFunding, Funded, Resolved }
    enum Resolution { None, Paid, Refunded }

    // ---- Immutable configuration ---------------------------------------------------------------
    address public immutable factory;
    address public immutable oracle;                // trusted bot/oracle (EOA or contract)
    IERC20  public immutable token;                 // e.g., USDC on Arbitrum
    uint256 public immutable confirmationAmount;    // typically 1e6 = 1 USDC (6 decimals)
    uint256 public immutable targetAmount;          // required buyer funding
    uint64  public immutable deadline;              // unix ts (0 = no deadline)
    uint256 public immutable tweetId;               // optional off-chain reference

    // ---- Guards (set at creation / by oracle) --------------------------------------------------
    address public expectedFunder;                  // ONLY this address may deposit
    address public expectedConfirmer;               // ONLY this address may be recorded as confirmer
    uint64  public confirmBy;                       // TTL for $1 confirmation (0 = no limit)

    // ---- Dynamic state -------------------------------------------------------------------------
    Phase public phase;
    Resolution public resolution;

    address public confirmer;       // beneficiary on success ($1 sender recorded by oracle)
    address public funder;          // actual depositor (first deposit; must equal expectedFunder)
    uint256 public funded;          // total funded (excludes the $1 confirmation)
    bool    public confirmationRecorded;

    // Mutual on-chain release flags (no oracle if both agree)
    bool public releaseOkByFunder;
    bool public releaseOkByConfirmer;

    // ---- Events --------------------------------------------------------------------------------
    event ExpectedFunderSet(address indexed funder);
    event ExpectedConfirmerSet(address indexed confirmer, uint64 confirmBy);
    event ConfirmationRecorded(address indexed confirmer, uint256 amount, bytes32 txHash);
    event Deposited(address indexed from, uint256 amount, uint256 total);
    event FundingRecorded(
        address indexed funder,
        uint256 amountProvided,
        uint256 amountRecognized,
        uint256 excessSwept,
        bytes32 txHash
    );
    event FundedFully(uint256 total);
    event ReleaseSignaled(address indexed from);
    event ResolvedPaid(address indexed to, uint256 amount, uint256 pollId);
    event ResolvedPaidByConsent(address indexed to, uint256 amount, bytes32 creatorEvidence, bytes32 confirmerEvidence);
    event ResolvedRefunded(address indexed to, uint256 amount, string reason);

    // ---- Modifiers -----------------------------------------------------------------------------
    modifier onlyOracle() {
        require(msg.sender == oracle, "Escrow: not oracle");
        _;
    }
    modifier inPhase(Phase p) {
        require(phase == p, "Escrow: bad phase");
        _;
    }

    // ---- Constructor ---------------------------------------------------------------------------
    /**
     * @param _factory          EscrowFactory address
     * @param _oracle           trusted oracle who can advance/resolve
     * @param _token            ERC-20 token address (USDC)
     * @param _targetAmount     total amount the buyer must deposit
     * @param _confirmationAmount exact amount required for $1 handshake (e.g., 1e6)
     * @param _deadline         unix timestamp after which oracle may refund if unresolved (0 = none)
     * @param _tweetId          optional off-chain reference
     * @param expectedFunder_   wallet allowed to call deposit() (from the form)
     */
    constructor(
        address _factory,
        address _oracle,
        address _token,
        uint256 _targetAmount,
        uint256 _confirmationAmount,
        uint64  _deadline,
        uint256 _tweetId,
        address expectedFunder_
    ) {
        require(_oracle != address(0) && _token != address(0), "Escrow: zero addr");
        require(_targetAmount > 0, "Escrow: bad target amt");
        require(_confirmationAmount > 0, "Escrow: bad confirm amt");
        require(expectedFunder_ != address(0), "Escrow: zero funder");

        factory = _factory;
        oracle  = _oracle;
        token   = IERC20(_token);

        targetAmount       = _targetAmount;
        confirmationAmount = _confirmationAmount;
        deadline           = _deadline;
        tweetId            = _tweetId;

        expectedFunder = expectedFunder_;
        emit ExpectedFunderSet(expectedFunder_);

        phase = Phase.AwaitingConfirmation;
        resolution = Resolution.None;
    }

    // ---- Oracle-set guards ---------------------------------------------------------------------
    /**
     * @notice Lock who may confirm the $1 handshake; optionally set a TTL.
     *         Call BEFORE revealing the escrow address to the counterparty.
     */
    function setExpectedConfirmer(address a, uint64 byTs)
        external onlyOracle inPhase(Phase.AwaitingConfirmation)
    {
        require(a != address(0), "Escrow: zero confirmer");
        expectedConfirmer = a;
        confirmBy = byTs; // 0 allowed (no limit)
        emit ExpectedConfirmerSet(a, byTs);
    }

    /**
     * @notice (Optional) Correct a typo: rotate expectedFunder BEFORE any funding.
     */
    function updateExpectedFunder(address a)
        external onlyOracle inPhase(Phase.ConfirmedAwaitingFunding)
    {
        require(funded == 0, "Escrow: already funded");
        require(a != address(0), "Escrow: zero funder");
        expectedFunder = a;
        emit ExpectedFunderSet(a);
    }

    // ---- Core flow -----------------------------------------------------------------------------
    /**
     * @notice Oracle acknowledges the $1 push transfer (after observing token logs).
     *         Must be called AFTER a token Transfer(to=this, value=confirmationAmount).
     */
    function recordConfirmation(address _confirmer, uint256 amount, bytes32 txHash)
        external onlyOracle inPhase(Phase.AwaitingConfirmation)
    {
        require(!confirmationRecorded, "Escrow: already confirmed");
        require(amount == confirmationAmount, "Escrow: wrong confirm amt");

        if (expectedConfirmer != address(0)) {
            require(_confirmer == expectedConfirmer, "Escrow: wrong confirmer");
        }
        if (confirmBy != 0) {
            require(block.timestamp <= confirmBy, "Escrow: confirm window over");
        }

        // Liveness: ensure funds are present from the push transfer.
        require(token.balanceOf(address(this)) >= confirmationAmount, "Escrow: token not received");

        confirmer = _confirmer;
        confirmationRecorded = true;
        phase = Phase.ConfirmedAwaitingFunding;

        emit ConfirmationRecorded(_confirmer, amount, txHash);
    }

    /**
     * @notice Oracle acknowledges the funder's push transfer (after observing token logs).
     *         Must be called AFTER a token Transfer(to=this, value>=targetAmount).
     *         Excess over targetAmount is immediately swept to oracle wallet.
     */
    function recordFunding(address _funder, uint256 amount, bytes32 txHash)
        external onlyOracle inPhase(Phase.ConfirmedAwaitingFunding) nonReentrant
    {
        require(_funder == expectedFunder, "Escrow: wrong funder");
        require(amount > 0, "Escrow: zero amount");
        require(confirmationRecorded, "Escrow: no $1 confirmation");

        // Must hold the entire amount (plus the reserved $1), so sweep is safe.
        uint256 reserved = confirmationAmount;
        uint256 bal = token.balanceOf(address(this));
        require(bal >= reserved + amount, "Escrow: token not received");

        // Clamp and sweep
        uint256 recognized = targetAmount;
        require(amount >= recognized, "Escrow: insufficient to reach target");

        funder = _funder;
        funded = recognized;
        phase  = Phase.Funded;

        uint256 excess = amount - recognized;
        if (excess > 0) {
            token.safeTransfer(oracle, excess); // sweep excess to oracle immediately
        }

        emit Deposited(_funder, recognized, funded);
        emit FundingRecorded(_funder, amount, recognized, excess, txHash);
        emit FundedFully(funded);
    }

    /**
     * @notice Oracle can immediately refund a stray/wrong-sender push before any official funding.
     *         Useful for "Jeremy accidentally sent 100 USDC" support tickets.
     */
    function refundStrayFunding(address straySender, uint256 amt)
        external onlyOracle inPhase(Phase.ConfirmedAwaitingFunding) nonReentrant
    {
        require(funder == address(0), "Escrow: already funded");
        uint256 reserved = confirmationRecorded ? confirmationAmount : 0;
        uint256 bal = token.balanceOf(address(this));
        require(bal >= reserved + amt, "Escrow: insufficient free balance");
        token.safeTransfer(straySender, amt);
    }

    /**
     * @notice On-chain mutual release (no oracle): BOTH parties call this.
     *         Works in ConfirmedAwaitingFunding or Funded.
     */
    function signalRelease() external nonReentrant {
        require(phase == Phase.Funded || phase == Phase.ConfirmedAwaitingFunding, "Escrow: not releasable");
        require(msg.sender == funder || msg.sender == confirmer, "Escrow: not a party");

        if (msg.sender == funder)     releaseOkByFunder = true;
        if (msg.sender == confirmer)  releaseOkByConfirmer = true;

        emit ReleaseSignaled(msg.sender);

        if (releaseOkByFunder && releaseOkByConfirmer) {
            uint256 paid = _payOut();
            
            // Transfer the reserved $1 to oracle as platform fee
            if (confirmationRecorded && confirmationAmount > 0) {
                token.safeTransfer(oracle, confirmationAmount);
            }
            
            resolution = Resolution.Paid;
            phase = Phase.Resolved;
            emit ResolvedPaid(confirmer, paid, 0); // pollId = 0 for on-chain mutual release
        }
    }

    /**
     * @notice Oracle resolves after an off-chain poll/decision.
     * @param success true => pay confirmer; false => refund funder (+ $1 back to confirmer)
     * @param pollId  external reference (e.g., X poll id)
     */
    function resolve(bool success, uint256 pollId)
        external onlyOracle inPhase(Phase.Funded) nonReentrant
    {
        if (success) {
            uint256 paid = _payOut();
            
            // Transfer the reserved $1 to oracle as platform fee
            if (confirmationRecorded && confirmationAmount > 0) {
                token.safeTransfer(oracle, confirmationAmount);
            }
            
            resolution = Resolution.Paid;
            phase = Phase.Resolved;
            emit ResolvedPaid(confirmer, paid, pollId);
        } else {
            _refundAll("Poll rejected");
        }
    }

    /**
     * @notice Oracle resolves based on BOTH parties DM'ing "#confirm".
     *         Pass message IDs or content hashes as lightweight evidence.
     */
    function resolveByMutualDMConsent(bytes32 creatorEvidence, bytes32 confirmerEvidence)
        external onlyOracle inPhase(Phase.Funded) nonReentrant
    {
        uint256 paid = _payOut();
        
        // Transfer the reserved $1 to oracle as platform fee
        if (confirmationRecorded && confirmationAmount > 0) {
            token.safeTransfer(oracle, confirmationAmount);
        }
        
        resolution = Resolution.Paid;
        phase = Phase.Resolved;
        emit ResolvedPaidByConsent(confirmer, paid, creatorEvidence, confirmerEvidence);
    }

    /**
     * @notice Oracle can unwind after the deadline if unresolved.
     */
    function refundAfterDeadline() external onlyOracle nonReentrant {
        require(phase != Phase.Resolved, "Escrow: already resolved");
        require(deadline != 0 && block.timestamp >= deadline, "Escrow: not due");
        _refundAll("Deadline passed");
    }

    /**
     * @notice Emergency sweep for accidental/spam tokens or leftover tokens after resolution.
     *         Cannot sweep escrow token until Resolved. Cannot sweep during active escrow.
     */
    function sweepStray(IERC20 erc20, address to, uint256 amt)
        external onlyOracle
    {
        require(to != address(0), "Escrow: zero address");
        require(phase != Phase.Funded, "Escrow: active escrow");
        
        // Prevent sweeping the main escrow token unless resolved
        if (address(erc20) == address(token)) {
            require(phase == Phase.Resolved, "Escrow: not resolved");
        }
        
        erc20.safeTransfer(to, amt);
    }

    // ---- Internals -----------------------------------------------------------------------------
    function _payOut() internal returns (uint256 paid) {
        require(confirmer != address(0), "Escrow: no confirmer");
        uint256 main = funded; // exactly target (excludes the $1 fee)
        if (main > 0) {
            token.safeTransfer(confirmer, main);
        }
        return main;
    }

    function _refundAll(string memory reason) internal {
        uint256 bal = token.balanceOf(address(this));

        // Return the $1 to the confirmer only if it was recorded.
        uint256 toConfirmer = confirmationRecorded ? confirmationAmount : 0;
        uint256 toFunder    = bal > toConfirmer ? (bal - toConfirmer) : 0;

        if (toConfirmer > 0 && confirmer != address(0)) {
            token.safeTransfer(confirmer, toConfirmer);
        }
        
        // Safety: fall back to expectedFunder if funder was never recorded
        address refundTo = (funder != address(0)) ? funder : expectedFunder;
        if (toFunder > 0 && refundTo != address(0)) {
            token.safeTransfer(refundTo, toFunder);
        }

        resolution = Resolution.Refunded;
        phase = Phase.Resolved;
        emit ResolvedRefunded(refundTo, toFunder, reason);
    }
}

