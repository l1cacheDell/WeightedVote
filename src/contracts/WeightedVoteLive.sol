// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @notice Match your generated Verifier.sol signature exactly.
/// If your Verifier uses `uint256[] calldata`, change both places accordingly.
interface IVerifier {
    function verifyProof(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[5] calldata input   // [root, en, option, nullifierHash, outWeight]
    ) external view returns (bool);
}

contract WeightedVoteLive {
    // ---- Admin / config ----
    address public owner;
    IVerifier public verifier;

    enum Status { CLOSED, OPEN }
    Status public status;

    // Current election params (must match publicSignals)
    uint256 public electionId;   // == externalNullifier
    uint256 public merkleRoot;   // store as uint256 to match publicSignals[0]
    uint256 public optionsCount;
    uint256 public constant MAX_OPTIONS = 8;

    // Tallies & anti-double-vote (scoped by electionId)
    mapping(uint256 => mapping(uint256 => uint256)) public tally;          // electionId -> option -> sum(weight)
    mapping(uint256 => mapping(uint256 => bool))   public nullifierUsed;   // electionId -> nullifierHash(uint256) -> used?

    event ElectionConfigured(uint256 indexed electionId, uint256 merkleRoot, uint256 optionsCount);
    event ElectionStatusChanged(uint8 indexed newStatus);
    event VoteSubmitted(uint256 indexed electionId, uint256 nullifierHash, uint256 option, uint256 outWeight);

    modifier onlyOwner { require(msg.sender == owner, "not owner"); _; }
    modifier onlyWhenOpen { require(status == Status.OPEN, "election not open"); _; }

    constructor(address _verifier) {
        owner = msg.sender;
        verifier = IVerifier(_verifier);
        status = Status.CLOSED;
    }

    // ---- Admin ----
    function setElection(uint256 _electionId, uint256 _merkleRoot, uint256 _optionsCount) external onlyOwner {
        require(_optionsCount >= 2 && _optionsCount <= MAX_OPTIONS, "bad optionsCount");
        electionId = _electionId;
        merkleRoot = _merkleRoot;
        optionsCount = _optionsCount;
        status = Status.OPEN;
        emit ElectionConfigured(_electionId, _merkleRoot, _optionsCount);
        emit ElectionStatusChanged(uint8(status));
    }

    function closeElection() external onlyOwner {
        status = Status.CLOSED;
        emit ElectionStatusChanged(uint8(status));
    }

    function setVerifier(address _verifier) external onlyOwner {
        verifier = IVerifier(_verifier);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    // ---- Voting ----
    /// @dev input MUST be: [0]=root, [1]=externalNullifier, [2]=option, [3]=nullifierHash, [4]=outWeight
    function vote(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[5] calldata input
    ) external onlyWhenOpen {
        uint256 rootPub   = input[0];
        uint256 enPub     = input[1];
        uint256 option    = input[2];
        uint256 nullHash  = input[3];
        uint256 weight    = input[4];

        // Bind to this election
        require(rootPub == merkleRoot, "root mismatch");
        require(enPub   == electionId, "electionId mismatch");
        require(option  <  optionsCount, "option OOB");

        // Circuit already enforces domain, but guard anyway (your circuit uses {1,3})
        require(weight == 1 || weight == 3, "bad weight");

        // Per-election uniqueness
        require(!nullifierUsed[electionId][nullHash], "already voted");

        // Verify proof (after cheap checks)
        require(verifier.verifyProof(a, b, c, input), "invalid proof");

        nullifierUsed[electionId][nullHash] = true;
        tally[electionId][option] += weight;

        emit VoteSubmitted(electionId, nullHash, option, weight);
    }

    // ---- Views ----
    function getTallies(uint256 _electionId, uint256[] calldata options)
        external view returns (uint256[] memory totals)
    {
        totals = new uint256[](options.length);
        for (uint256 i = 0; i < options.length; i++) {
            totals[i] = tally[_electionId][options[i]];
        }
    }
}
