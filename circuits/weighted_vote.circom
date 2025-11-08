pragma circom 2.1.5;

include "poseidon.circom";

template WeightedVote(depth) {
    // 私有输入
    signal input identity_nullifier;
    signal input identity_trapdoor;
    signal input weight;
    signal input pathElements[depth];
    signal input pathIndices[depth];

    // 公共输入
    signal input merkleRoot;
    signal input externalNullifier;
    signal input option;
    
    // 输出
    signal output nullifierHash;
    signal output outWeight;

    // 1. 计算身份承诺: commitment = Poseidon(nullifier, trapdoor)
    component identityHasher = Poseidon(2);
    identityHasher.inputs[0] <== identity_nullifier;
    identityHasher.inputs[1] <== identity_trapdoor;
    signal identityCommitment <== identityHasher.out;

    // 2. 计算叶子节点: leaf = Poseidon(commitment, weight)
    component leafHasher = Poseidon(2);
    leafHasher.inputs[0] <== identityCommitment;
    leafHasher.inputs[1] <== weight;
    signal leaf <== leafHasher.out;

    // 3. 验证Merkle路径
    signal merkleNodes[depth + 1];
    merkleNodes[0] <== leaf;

    component merkleHashers[depth];
    
    for (var i = 0; i < depth; i++) {
        // 确保pathIndices[i]是0或1
        pathIndices[i] * (pathIndices[i] - 1) === 0;
        
        merkleHashers[i] = Poseidon(2);
        
        // 根据pathIndices[i]决定左右子树的顺序
        // pathIndices[i] = 0: 当前节点在左边，兄弟节点在右边  
        // pathIndices[i] = 1: 当前节点在右边，兄弟节点在左边
        merkleHashers[i].inputs[0] <== merkleNodes[i] + pathIndices[i] * (pathElements[i] - merkleNodes[i]);
        merkleHashers[i].inputs[1] <== pathElements[i] + pathIndices[i] * (merkleNodes[i] - pathElements[i]);
        
        merkleNodes[i + 1] <== merkleHashers[i].out;
    }

    // 4. 验证Merkle根
    merkleNodes[depth] === merkleRoot;

    // 5. 计算nullifierHash防止双重投票
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== identity_nullifier;
    nullifierHasher.inputs[1] <== externalNullifier;
    nullifierHash <== nullifierHasher.out;

    // 6. 验证权重只能是1或3
    (weight - 1) * (weight - 3) === 0;
    outWeight <== weight;
}

// 主组件：深度为20的Merkle树
component main = WeightedVote(20);
