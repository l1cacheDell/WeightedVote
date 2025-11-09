pragma circom 2.1.5;

include "poseidon.circom";

template WeightedVote(depth) {
    // private input
    signal input identity_nullifier;
    signal input identity_trapdoor;
    signal input weight;
    signal input pathElements[depth];
    signal input pathIndices[depth];

    // public input
    signal input merkleRoot;
    signal input externalNullifier;
    signal input option;
    
    // output
    signal output nullifierHash;
    signal output outWeight;

    // 1. computing the commitment: commitment = Poseidon(nullifier, trapdoor)
    component identityHasher = Poseidon(2);
    identityHasher.inputs[0] <== identity_nullifier;
    identityHasher.inputs[1] <== identity_trapdoor;
    signal identityCommitment <== identityHasher.out;

    // 2. computing the leaves: leaf = Poseidon(commitment, weight)
    component leafHasher = Poseidon(2);
    leafHasher.inputs[0] <== identityCommitment;
    leafHasher.inputs[1] <== weight;
    signal leaf <== leafHasher.out;

    // 3. validate the merkle path
    signal merkleNodes[depth + 1];
    merkleNodes[0] <== leaf;

    component merkleHashers[depth];
    
    for (var i = 0; i < depth; i++) {
        // make sure the pathIndices[i] is 0 or 1
        pathIndices[i] * (pathIndices[i] - 1) === 0;
        
        merkleHashers[i] = Poseidon(2);
        
        merkleHashers[i].inputs[0] <== merkleNodes[i] + pathIndices[i] * (pathElements[i] - merkleNodes[i]);
        merkleHashers[i].inputs[1] <== pathElements[i] + pathIndices[i] * (merkleNodes[i] - pathElements[i]);
        
        merkleNodes[i + 1] <== merkleHashers[i].out;
    }

    // 4. validate Merkle root
    merkleNodes[depth] === merkleRoot;

    // 5. compute the nullifierHash, to avoid the double-voting
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== identity_nullifier;
    nullifierHasher.inputs[1] <== externalNullifier;
    nullifierHash <== nullifierHasher.out;

    // 6. weight validation: could only be 1 or 3
    (weight - 1) * (weight - 3) === 0;
    outWeight <== weight;
}

// main component: The depth=20 Merkle Tree
component main { public [ merkleRoot, externalNullifier, option ] } = WeightedVote(20);

