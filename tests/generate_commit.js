const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const circomlibjs = require('circomlibjs');
const crypto = require('crypto');

// 数据库文件路径
const DB_PATH = path.join(__dirname, '../db/employee.db');

// 数据库schema
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS identities(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  commitment TEXT UNIQUE NOT NULL,
  weight INTEGER CHECK(weight IN (1,3)) NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS elections(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  merkle_root TEXT,
  external_nullifier TEXT,
  contract_address TEXT,
  verifier_address TEXT,
  status TEXT CHECK(status IN ('draft','open','closed')) DEFAULT 'draft',
  tree_json TEXT
);
CREATE TABLE IF NOT EXISTS votes_local(
  election_id INTEGER,
  nullifier_hash TEXT,
  option INTEGER,
  weight INTEGER,
  tx_hash TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`;

// 生成circomlibjs兼容的随机数
function rand32(F) {
  // 使用31字节避免溢出有限域
  const a = crypto.randomBytes(31);
  const randomHex = "0x" + a.toString('hex');
  return F.e(randomHex);
}

// 生成单个commitment
async function generateCommitment(weight) {
  // 使用Poseidon哈希
  const poseidon = await circomlibjs.buildPoseidon();
  const F = poseidon.F;
  
  // 生成在有限域内的随机数
  const nullifier = rand32(F);
  const trapdoor = rand32(F);
  
  const commitment = poseidon([nullifier, trapdoor]);
  const commitmentHex = "0x" + F.toString(commitment, 16);
  
  return {
    nullifier: F.toString(nullifier, 10),
    trapdoor: F.toString(trapdoor, 10),
    commitment: commitmentHex,
    weight: weight
  };
}

// 主函数
async function main() {
  console.log('🚀 开始生成测试commitment数据...');
  
  // 确保db目录存在
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`📁 创建目录: ${dbDir}`);
  }
  
  // 初始化SQLite
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  
  // 创建表结构
  db.exec(SCHEMA_SQL);
  console.log('📋 数据库表结构创建完成');
  
  // 生成5个commitment（3个权重1，2个权重3）
  const commitments = [];
  const weights = [1, 1, 1, 3, 3]; // 3个员工，2个经理
  
  console.log('🔐 生成commitment中...');
  for (let i = 0; i < 5; i++) {
    const data = await generateCommitment(weights[i]);
    commitments.push(data);
    
    // 插入数据库（只存储commitment和weight）
    const stmt = db.prepare("INSERT INTO identities(commitment, weight) VALUES(?, ?)");
    stmt.run([data.commitment, data.weight]);
    stmt.free();
    
    console.log(`  ✅ 员工${i+1}: ${data.commitment} (权重: ${data.weight})`);
  }
  
  // 保存数据库文件
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  console.log(`💾 数据库已保存到: ${DB_PATH}`);
  
  // 保存完整的身份数据到JSON文件（用于测试）
  const identitiesPath = path.join(__dirname, 'test_identities.json');
  fs.writeFileSync(identitiesPath, JSON.stringify(commitments, null, 2));
  console.log(`📄 完整身份数据已保存到: ${identitiesPath}`);
  
  // 显示统计信息
  console.log('\n📊 生成统计:');
  console.log(`  - 总数: ${commitments.length}`);
  console.log(`  - 权重1 (员工): ${commitments.filter(c => c.weight === 1).length}`);
  console.log(`  - 权重3 (经理): ${commitments.filter(c => c.weight === 3).length}`);
  console.log(`  - 总权重: ${commitments.reduce((sum, c) => sum + c.weight, 0)}`);
  
  console.log('\n🎉 测试数据生成完成！');
  console.log('\n📋 下一步:');
  console.log('  1. 运行HR建树脚本');
  console.log('  2. 测试投票流程');
}

// 错误处理
main().catch(error => {
  console.error('❌ 生成失败:', error);
  process.exit(1);
});