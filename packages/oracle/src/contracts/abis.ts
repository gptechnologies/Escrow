/**
 * Contract ABIs for EscrowFactory, Escrow, and ERC20
 */

export const EscrowFactoryABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "creator", "type": "address" },
      { "indexed": true, "name": "escrow", "type": "address" },
      { "indexed": true, "name": "token", "type": "address" },
      { "indexed": false, "name": "targetAmount", "type": "uint256" },
      { "indexed": false, "name": "confirmationAmount", "type": "uint256" },
      { "indexed": false, "name": "deadline", "type": "uint64" },
      { "indexed": false, "name": "tweetId", "type": "uint256" }
    ],
    "name": "EscrowCreated",
    "type": "event"
  },
  {
    "inputs": [
      {
        "components": [
          { "name": "token", "type": "address" },
          { "name": "targetAmount", "type": "uint256" },
          { "name": "confirmationAmount", "type": "uint256" },
          { "name": "deadline", "type": "uint64" },
          { "name": "tweetId", "type": "uint256" },
          { "name": "expectedFunder", "type": "address" }
        ],
        "name": "p",
        "type": "tuple"
      }
    ],
    "name": "createEscrow",
    "outputs": [{ "name": "escrow", "type": "address" }],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export const EscrowABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "confirmer", "type": "address" },
      { "indexed": false, "name": "amount", "type": "uint256" },
      { "indexed": false, "name": "txHash", "type": "bytes32" }
    ],
    "name": "ConfirmationRecorded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "funder", "type": "address" },
      { "indexed": false, "name": "amountProvided", "type": "uint256" },
      { "indexed": false, "name": "amountRecognized", "type": "uint256" },
      { "indexed": false, "name": "excessSwept", "type": "uint256" },
      { "indexed": false, "name": "txHash", "type": "bytes32" }
    ],
    "name": "FundingRecorded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "to", "type": "address" },
      { "indexed": false, "name": "amount", "type": "uint256" },
      { "indexed": false, "name": "pollId", "type": "uint256" }
    ],
    "name": "ResolvedPaid",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "to", "type": "address" },
      { "indexed": false, "name": "amount", "type": "uint256" },
      { "indexed": false, "name": "creatorEvidence", "type": "bytes32" },
      { "indexed": false, "name": "confirmerEvidence", "type": "bytes32" }
    ],
    "name": "ResolvedPaidByConsent",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "to", "type": "address" },
      { "indexed": false, "name": "amount", "type": "uint256" },
      { "indexed": false, "name": "reason", "type": "string" }
    ],
    "name": "ResolvedRefunded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "confirmer", "type": "address" },
      { "indexed": false, "name": "confirmBy", "type": "uint64" }
    ],
    "name": "ExpectedConfirmerSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "funder", "type": "address" }
    ],
    "name": "ExpectedFunderSet",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "phase",
    "outputs": [{ "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "a", "type": "address" },
      { "name": "byTs", "type": "uint64" }
    ],
    "name": "setExpectedConfirmer",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "_confirmer", "type": "address" },
      { "name": "amount", "type": "uint256" },
      { "name": "txHash", "type": "bytes32" }
    ],
    "name": "recordConfirmation",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "_funder", "type": "address" },
      { "name": "amount", "type": "uint256" },
      { "name": "txHash", "type": "bytes32" }
    ],
    "name": "recordFunding",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "success", "type": "bool" },
      { "name": "pollId", "type": "uint256" }
    ],
    "name": "resolve",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "creatorEvidence", "type": "bytes32" },
      { "name": "confirmerEvidence", "type": "bytes32" }
    ],
    "name": "resolveByMutualDMConsent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "expectedFunder",
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "expectedConfirmer",
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "confirmer",
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "funder",
    "outputs": [{ "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const ERC20ABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "from", "type": "address" },
      { "indexed": true, "name": "to", "type": "address" },
      { "indexed": false, "name": "value", "type": "uint256" }
    ],
    "name": "Transfer",
    "type": "event"
  }
] as const;

