# from your zk artifacts folder
snarkjs zkey export solidityverifier circuit_final.zkey Verifier.sol

function verifyProof(
    uint256[2] calldata a,
    uint256[2][2] calldata b,
    uint256[2] calldata c,
    uint256[] calldata input
) external view returns (bool);
