pragma circom 2.1.5;

include "poseidon.circom";

template WeightedVote(depth) {
    // private
    signal input identity_nullifier;
    signal input identity_trapdoor;
    signal input weight;
    signal input pathElements[depth];
    signal input pathIndices[depth];

    // public
    signal input merkleRoot;
    signal input externalNullifier;
    signal input option;
    signal output nullifierHash;
    signal output outWeight;

    // 身份承诺 & 叶子
    component pId = Poseidon(2);
    pId.inputs[0] <== identity_nullifier;
    pId.inputs[1] <== identity_trapdoor;
    signal identityCommitment <== pId.out;

    component pLeaf = Poseidon(2);
    pLeaf.inputs[0] <== identityCommitment;
    pLeaf.inputs[1] <== weight;
    signal leaf <== pLeaf.out;

    // Merkle 路径
    signal cur[depth + 1];
    signal left[depth];
    signal right[depth];
    signal diffL[depth];
    signal diffR[depth];
    component hp[depth];

    cur[0] <== leaf;

    for (var i = 0; i < depth; i++) {
        // s ∈ {0,1}
        pathIndices[i] * (pathIndices[i] - 1) === 0;

        // 只用一个乘法的选择器写法
        diffL[i]  <== pathElements[i] - cur[i];   // sib - cur
        left[i]   <== cur[i] + pathIndices[i] * diffL[i];

        diffR[i]  <== cur[i] - pathElements[i];   // cur - sib
        right[i]  <== pathElements[i] + pathIndices[i] * diffR[i];

        hp[i] = Poseidon(2);
        hp[i].inputs[0] <== left[i];
        hp[i].inputs[1] <== right[i];
        cur[i + 1] <== hp[i].out;
    }

    // 根一致
    cur[depth] === merkleRoot;

    // nullifierHash
    component pN = Poseidon(2);
    pN.inputs[0] <== identity_nullifier;
    pN.inputs[1] <== externalNullifier;
    nullifierHash <== pN.out;

    // 权重限制
    (weight - 1) * (weight - 3) === 0;
    outWeight <== weight;

    // option 仅公开，不参与约束
}

component main = WeightedVote(20);
