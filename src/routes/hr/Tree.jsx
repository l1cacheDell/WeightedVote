import React, { useState } from "react";
import { listIdentities, upsertElection } from "../../lib/db";
import { poseidonLeaf, buildMerkle } from "../../lib/merkle";

export default function Tree() {
  const [root, setRoot] = useState("");
  const [electionId, setElectionId] = useState(String(Date.now()));

  async function build() {
    const rows = await listIdentities(); // [id, commitment, weight, created_at]
    const leaves = [];
    for (const r of rows) {
      const commitment = r[1];
      const weight = r[2];
      leaves.push(await poseidonLeaf(commitment, weight));
    }
    const tree = await buildMerkle(leaves, 20);
    setRoot(tree.root);
    await upsertElection({ name: "MVP-Election", merkle_root: tree.root, external_nullifier: electionId, tree_json: tree });
    alert("树已构建并写入本地 elections 表");
  }

  return (
    <div style={{padding:20}}>
      <h2>构建 Merkle 树</h2>
      <div>Election ID（externalNullifier）：<input value={electionId} onChange={e=>setElectionId(e.target.value)} /></div>
      <button onClick={build}>构建并保存</button>
      {root && <p>Root: <code>{root}</code></p>}
    </div>
  );
}
