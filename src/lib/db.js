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

export async function upsertElection({ name, merkle_root, external_nullifier, tree_json }) {
  const db = await openDb();
  const stmt = db.prepare("INSERT INTO elections(name, merkle_root, external_nullifier, tree_json, status) VALUES(?,?,?,?, 'draft')");
  stmt.run([name, merkle_root, external_nullifier, JSON.stringify(tree_json || null)]);
  stmt.free();
  await saveDb();
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
