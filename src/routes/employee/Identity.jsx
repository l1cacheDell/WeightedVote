import React, { useState } from "react";
import { insertIdentity } from "../../lib/db";
import * as circomlibjs from "circomlibjs";
import "./identity.css";
import "../../global.css";
import { GlobalToolBar } from "../../global";

function rand32() {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  // 转 BigInt
  return BigInt("0x" + [...a].map(b => b.toString(16).padStart(2,"0")).join(""));
}

export default function Identity() {
  const [weight, setWeight] = useState(1);
  const [commitment, setCommitment] = useState("");
  const [nullifier, setNullifier] = useState("");
  const [trapdoor, setTrapdoor] = useState("");

  async function generateAndSave() {
    const nullifierBig = rand32();
    const trapdoorBig  = rand32();
    const poseidon = await circomlibjs.buildPoseidon();
    const F = poseidon.F;
    const c = poseidon([nullifierBig, trapdoorBig]);
    const commitmentHex = "0x" + F.toString(c, 16);

    setCommitment(commitmentHex);
    setNullifier(nullifierBig.toString());
    setTrapdoor(trapdoorBig.toString());

    await insertIdentity({ commitment: commitmentHex, weight });

    // 导出身份文件
    const identityData = {
      nullifier: nullifierBig.toString(),
      trapdoor: trapdoorBig.toString(),
      commitment: commitmentHex,
      weight: weight
    };

    const blob = new Blob([JSON.stringify(identityData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `identity_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert("Identity generated and saved to local SQLite. Identity file downloaded. Please keep it safe!");
  }

  return (
    <div className="identity-background">
      <div className="identity-card">
        <div className="identity-title">Generate Identity Commitment</div>

        <div className="identity-field">
          <label className="identity-label">Weight</label>
          <select
            className="identity-select"
            value={weight}
            onChange={e => setWeight(Number(e.target.value))}
          >
            <option value={1}>Employee (1)</option>
            <option value={3}>Manager (3)</option>
          </select>
        </div>

        <div className="identity-actions">
          <button className="identity-btn" onClick={generateAndSave}>
            Generate and Save to Local Database
          </button>
        </div>

        {commitment && (
          <div className="identity-commitment">
            <div className="identity-commitment-title">Your Commitment</div>
            <div className="identity-commitment-code">{commitment}</div>
            <div className="identity-warning">
              Note: nullifier/trapdoor are not saved here. Please backup the downloaded identity file!
            </div>
          </div>
        )}
      </div>

      <GlobalToolBar />
    </div>
  );
}
