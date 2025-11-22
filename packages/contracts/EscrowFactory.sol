// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./utils/Ownable.sol";
import "./Escrow.sol";

contract EscrowFactory is Ownable {
    address public oracle; // trusted oracle EOA or contract

    event EscrowCreated(
        address indexed creator,
        address indexed escrow,
        address indexed token,
        uint256 targetAmount,
        uint256 confirmationAmount,
        uint64  deadline,
        uint256 tweetId
    );
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);

    // Optional registry to find escrows by tweet
    mapping(uint256 => address) public escrowByTweet;

    constructor(address _oracle) {
        require(_oracle != address(0), "Factory: zero oracle");
        oracle = _oracle;
        emit OracleUpdated(address(0), _oracle);
    }

    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Factory: zero oracle");
        emit OracleUpdated(oracle, _oracle);
        oracle = _oracle;
    }

    struct CreateParams {
        address token;              // e.g., native USDC on Arbitrum or MockUSDC in tests
        uint256 targetAmount;       // Creator total deposit target
        uint256 confirmationAmount; // usually 1e6 (1 USDC)
        uint64  deadline;           // unix ts; 0 to disable
        uint256 tweetId;            // optional off-chain link
        address expectedFunder;     // wallet allowed to fund the escrow
    }

    function createEscrow(CreateParams calldata p) external returns (address escrow) {
        require(p.token != address(0), "Factory: zero token");
        require(p.targetAmount > 0 && p.confirmationAmount > 0, "Factory: bad amounts");
        require(p.expectedFunder != address(0), "Factory: zero funder");

        escrow = address(new Escrow(
            address(this),
            oracle,
            p.token,
            p.targetAmount,
            p.confirmationAmount,
            p.deadline,
            p.tweetId,
            p.expectedFunder
        ));

        if (p.tweetId != 0) {
            escrowByTweet[p.tweetId] = escrow;
        }

        emit EscrowCreated(msg.sender, escrow, p.token, p.targetAmount, p.confirmationAmount, p.deadline, p.tweetId);
    }
}
