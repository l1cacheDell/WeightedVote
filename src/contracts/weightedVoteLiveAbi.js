export const WEIGHTED_VOTE_LIVE_ABI = [
  {
    "inputs": [{ "internalType": "address", "name": "_verifier", "type": "address" }],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "closeElection",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "electionId",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "merkleRoot",
    "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "optionsCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "status",
    "outputs": [{ "internalType": "enum WeightedVoteLive.Status", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_electionId", "type": "uint256" },
      { "internalType": "bytes32", "name": "_merkleRoot", "type": "bytes32" },
      { "internalType": "uint256", "name": "_optionsCount", "type": "uint256" }
    ],
    "name": "setElection",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];
