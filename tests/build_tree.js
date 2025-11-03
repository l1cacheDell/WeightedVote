const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const circomlibjs = require('circomlibjs');
const crypto = require('crypto');

// 文件路径
const DB_PATH = path.join(__dirname, '../db/employee.db');
const TREE_OUTPUT_PATH = path.join(__dirname, '../db/tree.json');
const ELECTION_OUTPUT_PATH = path.join(__dirname, '../db/election.json');

// Merkle树深度（与电路保持一致）
const TREE_DEPTH = 20;

class MerkleTree {
  constructor(depth, poseidon) {
    this.depth = depth;
    this.poseidon = poseidon;
    this.F = poseidon.F;
    this.zeroValue = this.F.zero;
    this.layers = [];
    this.elements = [];
  }

  // 构建树
  buildTree(leaves) {
    console.log(`🌳 构建深度为 ${this.depth} 的Merkle树，叶子节点数: ${leaves.length}`);
    
    // 初始化所有层
    this.layers = [];
    for (let i = 0; i <= this.depth; i++) {
      this.layers[i] = [];
    }
    
    // 第0层是叶子节点
    this.elements = [...leaves];
    this.layers[0] = [...leaves];
    
    // 用零值填充到2^depth个叶子
    const maxLeaves = 2 ** this.depth;
    while (this.layers[0].length < maxLeaves) {
      this.layers[0].push(this.zeroValue);
    }
    
    // 自底向上构建树
    for (let level = 0; level < this.depth; level++) {
      const currentLayer = this.layers[level];
      const nextLayer = [];
      
      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i];
        const right = currentLayer[i + 1];
        const parent = this.poseidon([left, right]);
        nextLayer.push(parent);
      }
      
      this.layers[level + 1] = nextLayer;
      console.log(`  层 ${level + 1}: ${nextLayer.length} 个节点`);
    }
    
    return this.layers[this.depth][0]; // 返回根节点
  }

  // 获取Merkle路径
  getMerkleProof(leafIndex) {
    if (leafIndex >= this.elements.length) {
      throw new Error(`叶子索引 ${leafIndex} 超出范围`);
    }
    
    const pathElements = [];
    const pathIndices = [];
    let currentIndex = leafIndex;
    
    for (let level = 0; level < this.depth; level++) {
      const isRightNode = currentIndex % 2 === 1;
      const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;
      
      pathElements.push(this.F.toString(this.layers[level][siblingIndex], 10));
      pathIndices.push(isRightNode ? 0 : 1);
      
      currentIndex = Math.floor(currentIndex / 2);
    }
    
    return {
      pathElements,
      pathIndices,
      leaf: this.F.toString(this.layers[0][leafIndex], 10),
      root: this.F.toString(this.layers[this.depth][0], 10)
    };
  }

  // 导出树结构
  exportTree() {
    const treeData = {
      depth: this.depth,
      root: this.F.toString(this.layers[this.depth][0], 10),
      leaves: this.elements.map(leaf => this.F.toString(leaf, 10)),
      layers: this.layers.map(layer => 
        layer.map(node => this.F.toString(node, 10))
      )
    };
    return treeData;
  }
}

// 从数据库读取身份数据
async function loadIdentitiesFromDB() {
  console.log('📖 从数据库读取身份数据...');
  
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`数据库文件不存在: ${DB_PATH}`);
  }
  
  const SQL = await initSqlJs();
  const dbBuffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(dbBuffer);
  
  const result = db.exec("SELECT id, commitment, weight FROM identities ORDER BY id ASC");
  
  if (!result[0] || !result[0].values) {
    throw new Error('数据库中没有找到身份数据');
  }
  
  const identities = result[0].values.map(row => ({
    id: row[0],
    commitment: row[1],
    weight: row[2]
  }));
  
  console.log(`  ✅ 读取到 ${identities.length} 个身份记录`);
  return identities;
}

// 主函数
async function main() {
  console.log('🚀 开始构建HR Merkle树...');
  
  try {
    // 1. 读取身份数据
    const identities = await loadIdentitiesFromDB();
    
    // 2. 初始化Poseidon哈希
    console.log('🔧 初始化Poseidon哈希...');
    const poseidon = await circomlibjs.buildPoseidon();
    const F = poseidon.F;
    
    // 3. 计算叶子节点：leaf = Poseidon(commitment, weight)
    console.log('🍃 计算叶子节点...');
    const leaves = [];
    const leafMappings = [];
    
    for (let i = 0; i < identities.length; i++) {
      const identity = identities[i];
      const commitment = F.e(identity.commitment);
      const weight = F.e(identity.weight);
      const leaf = poseidon([commitment, weight]);
      
      leaves.push(leaf);
      leafMappings.push({
        index: i,
        id: identity.id,
        commitment: identity.commitment,
        weight: identity.weight,
        leaf: F.toString(leaf, 10)
      });
      
      console.log(`  叶子 ${i}: commitment=${identity.commitment.slice(0,10)}... weight=${identity.weight} → leaf=${F.toString(leaf, 16).slice(0,10)}...`);
    }
    
    // 4. 构建Merkle树
    const tree = new MerkleTree(TREE_DEPTH, poseidon);
    const root = tree.buildTree(leaves);
    
    console.log(`🌲 Merkle树构建完成！`);
    console.log(`  根节点: 0x${F.toString(root, 16)}`);
    
    // 5. 生成选举ID
    const electionId = Date.now().toString();
    console.log(`🗳️  选举ID: ${electionId}`);
    
    // 6. 导出树结构
    const treeData = tree.exportTree();
    treeData.leafMappings = leafMappings;
    treeData.electionId = electionId;
    treeData.createdAt = new Date().toISOString();
    
    // 7. 保存树数据
    fs.writeFileSync(TREE_OUTPUT_PATH, JSON.stringify(treeData, null, 2));
    console.log(`💾 树结构已保存到: ${TREE_OUTPUT_PATH}`);
    
    // 8. 生成选举配置
    const electionConfig = {
      electionId: electionId,
      merkleRoot: F.toString(root, 10),
      merkleRootHex: "0x" + F.toString(root, 16),
      participantCount: identities.length,
      totalWeight: identities.reduce((sum, id) => sum + id.weight, 0),
      treeDepth: TREE_DEPTH,
      status: 'ready',
      createdAt: new Date().toISOString()
    };
    
    fs.writeFileSync(ELECTION_OUTPUT_PATH, JSON.stringify(electionConfig, null, 2));
    console.log(`📋 选举配置已保存到: ${ELECTION_OUTPUT_PATH}`);
    
    // 9. 生成测试用的Merkle路径（前3个叶子）
    console.log('\n🔍 生成测试Merkle路径:');
    for (let i = 0; i < Math.min(3, identities.length); i++) {
      const proof = tree.getMerkleProof(i);
      console.log(`  叶子 ${i} 的路径长度: ${proof.pathElements.length}`);
      
      // 保存单个路径文件（用于测试）
      const proofPath = path.join(__dirname, `../db/proof_${i}.json`);
      fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2));
    }
    
    // 10. 显示统计信息
    console.log('\n📊 构建统计:');
    console.log(`  - 参与者数量: ${identities.length}`);
    console.log(`  - 权重1 (员工): ${identities.filter(id => id.weight === 1).length}`);
    console.log(`  - 权重3 (经理): ${identities.filter(id => id.weight === 3).length}`);
    console.log(`  - 总投票权重: ${identities.reduce((sum, id) => sum + id.weight, 0)}`);
    console.log(`  - 树深度: ${TREE_DEPTH}`);
    console.log(`  - 最大容量: ${2 ** TREE_DEPTH} 个叶子`);
    
    console.log('\n🎉 HR建树完成！');
    console.log('\n📋 产出文件:');
    console.log(`  - ${TREE_OUTPUT_PATH} (完整树结构)`);
    console.log(`  - ${ELECTION_OUTPUT_PATH} (选举配置)`);
    console.log(`  - db/proof_*.json (测试用Merkle路径)`);
    
  } catch (error) {
    console.error('❌ 建树失败:', error.message);
    process.exit(1);
  }
}

// 运行主函数
main();