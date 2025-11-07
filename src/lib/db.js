import initSqlJs from "sql.js";
import { get, set } from "idb-keyval";

let SQL, db;

const DB_KEY = "weighted_voting.sqlite";
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

export async function openDb() {
  if (db) return db;
  SQL = await initSqlJs({
    locateFile: (f) => `/sql-wasm.wasm` // 你刚复制到 public 的位置
  });
  const buf = await get(DB_KEY); // 从 IndexedDB 读
  db = buf ? new SQL.Database(new Uint8Array(buf)) : new SQL.Database();
  db.exec(SCHEMA_SQL);
  await saveDb();
  return db;
}

export async function saveDb() {
  if (!db) return;
  const data = db.export();
  await set(DB_KEY, data);
}

// 常用操作封装：
export async function insertIdentity({ commitment, weight }) {
  const db = await openDb();
  const stmt = db.prepare("INSERT INTO identities(commitment,weight) VALUES(?,?)");
  stmt.run([commitment, weight]);
  stmt.free();
  await saveDb();
}

export async function listIdentities() {
  const db = await openDb();
  const res = db.exec("SELECT id, commitment, weight, created_at FROM identities ORDER BY id ASC");
  return res[0]?.values || [];
}

export async function upsertElection({ name, merkle_root, external_nullifier, tree_json, contract_address, verifier_address, status }) {
  const db = await openDb();
  const stmt = db.prepare("INSERT INTO elections(name, merkle_root, external_nullifier, tree_json, contract_address, verifier_address, status) VALUES(?,?,?,?,?,?,?)");
  stmt.run([name, merkle_root, external_nullifier, JSON.stringify(tree_json || null), contract_address || null, verifier_address || null, status || 'draft']);
  stmt.free();
  await saveDb();
}

export async function getElection(electionId) {
  const db = await openDb();
  const stmt = db.prepare("SELECT * FROM elections WHERE id = ?");
  stmt.bind([electionId]);
  const result = stmt.getAsObject({});
  stmt.free();
  if (result && result.id !== undefined) {
    const obj = {
      id: result.id,
      name: result.name,
      merkle_root: result.merkle_root,
      external_nullifier: result.external_nullifier,
      contract_address: result.contract_address,
      verifier_address: result.verifier_address,
      status: result.status,
      tree_json: result.tree_json ? JSON.parse(result.tree_json) : null
    };
    return obj;
  }
  return null;
}

export async function getLatestElection() {
  const db = await openDb();
  const res = db.exec("SELECT * FROM elections ORDER BY id DESC LIMIT 1");
  if (res[0] && res[0].values.length > 0) {
    const cols = res[0].columns;
    const row = res[0].values[0];
    const obj = {};
    cols.forEach((col, i) => {
      obj[col] = row[i];
    });
    if (obj.tree_json) obj.tree_json = JSON.parse(obj.tree_json);
    return obj;
  }
  return null;
}

export async function listElections() {
  const db = await openDb();
  const res = db.exec("SELECT id, name, merkle_root, external_nullifier, status, created_at FROM elections ORDER BY id DESC");
  return res[0]?.values || [];
}

export async function updateElectionStatus(electionId, status) {
  const db = await openDb();
  const stmt = db.prepare("UPDATE elections SET status = ? WHERE id = ?");
  stmt.run([status, electionId]);
  stmt.free();
  await saveDb();
}

export async function updateElectionContract(electionId, contract_address, verifier_address) {
  const db = await openDb();
  const stmt = db.prepare("UPDATE elections SET contract_address = ?, verifier_address = ? WHERE id = ?");
  stmt.run([contract_address, verifier_address, electionId]);
  stmt.free();
  await saveDb();
}

export async function updateIdentityWeight(id, weight) {
  const db = await openDb();
  const stmt = db.prepare("UPDATE identities SET weight = ? WHERE id = ?");
  stmt.run([weight, id]);
  stmt.free();
  await saveDb();
}

export async function deleteIdentity(id) {
  const db = await openDb();
  const stmt = db.prepare("DELETE FROM identities WHERE id = ?");
  stmt.run([id]);
  stmt.free();
  await saveDb();
}

export async function insertVote({ election_id, nullifier_hash, option, weight, tx_hash }) {
  const db = await openDb();
  const stmt = db.prepare("INSERT INTO votes_local(election_id, nullifier_hash, option, weight, tx_hash) VALUES(?,?,?,?,?)");
  stmt.run([election_id, nullifier_hash, option, weight, tx_hash || null]);
  stmt.free();
  await saveDb();
}

export async function getVoteResults(electionId) {
  const db = await openDb();
  const res = db.exec("SELECT option, SUM(weight) as total_weight FROM votes_local WHERE election_id = ? GROUP BY option ORDER BY option ASC");
  if (res[0] && res[0].values.length > 0) {
    const results = {};
    res[0].values.forEach(row => {
      results[row[0]] = row[1];
    });
    return results;
  }
  return {};
}

export async function checkNullifierUsed(electionId, nullifier_hash) {
  const db = await openDb();
  const stmt = db.prepare("SELECT COUNT(*) as count FROM votes_local WHERE election_id = ? AND nullifier_hash = ?");
  stmt.bind([electionId, nullifier_hash]);
  const result = stmt.getAsObject();
  stmt.free();
  return result.count > 0;
}

export async function exportDbFile() {
  const db = await openDb();
  const data = db.export();
  return new Blob([data], { type: "application/octet-stream" });
}

export async function importDbFile(arrayBuffer) {
  SQL = SQL || await initSqlJs({ locateFile: f => `/sql-wasm.wasm` });
  db = new SQL.Database(new Uint8Array(arrayBuffer));
  db.exec(SCHEMA_SQL);
  await saveDb();
}
