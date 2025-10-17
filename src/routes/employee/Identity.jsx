import React, { useState } from "react";
import { insertIdentity } from "../../lib/db";
import * as circomlibjs from "circomlibjs";

function rand32() {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  // 转 BigInt
  return BigInt("0x" + [...a].map(b => b.toString(16).padStart(2,"0")).join(""));
}

export default function Identity() {
  const [weight, setWeight] = useState(1);
  const [commitment, setCommitment] = useState("");

  async function generateAndSave() {
    // 生成本地身份秘密
    const nullifier = rand32();
    const trapdoor  = rand32();
    // Poseidon
    const poseidon = await circomlibjs.buildPoseidon();
    const F = poseidon.F;
    const c = poseidon([nullifier, trapdoor]);
    const commitmentHex = "0x" + F.toString(c, 16);

    setCommitment(commitmentHex);
    // 保存到 SQLite（这里先把权重也定下；也可以让 HR 在 roster 页设置）
    await insertIdentity({ commitment: commitmentHex, weight });
    alert("已写入本地 SQLite。请妥善备份你的 nullifier/trapdoor（本页未保存它们）！");
  }

  return (
    <div style={{padding:20}}>
      <h2>生成身份承诺（commitment）</h2>
      <div>
        <label>权重：</label>
        <select value={weight} onChange={e => setWeight(Number(e.target.value))}>
          <option value={1}>员工（1）</option>
          <option value={3}>经理（3）</option>
        </select>
      </div>
      <button onClick={generateAndSave}>生成 & 写入本地库</button>
      {commitment && (
        <div>
          <p>你的 commitment：</p>
          <code>{commitment}</code>
          <p style={{color:"#c00"}}>注意：此处未保存 nullifier/trapdoor，请你自己保存！</p>
        </div>
      )}
    </div>
  );
}
