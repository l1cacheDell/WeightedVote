import React, { useState, useEffect } from "react";
import { getLatestElection, insertVote, checkNullifierUsed } from "../../lib/db";
import { buildPoseidon, poseidonLeaf } from "../../lib/merkle";
import { getMerklePath, findLeafIndex } from "../../lib/merkle";
import { genProof } from "../../lib/zk";
import * as circomlibjs from "circomlibjs";
import "./vote.css";
import "../../global.css";
import { GlobalToolBar } from "../../global";

export default function Vote() {
  const [identityFile, setIdentityFile] = useState(null);
  const [identityData, setIdentityData] = useState(null);
  const [election, setElection] = useState(null);
  const [selectedOption, setSelectedOption] = useState(0);
  const [voting, setVoting] = useState(false);
  const [voteStatus, setVoteStatus] = useState("");
  const [proof, setProof] = useState(null);

  useEffect(() => {
    loadElection();
  }, []);

  async function loadElection() {
    const latest = await getLatestElection();
    if (latest) {
      setElection(latest);
    }
  }

  function handleIdentityFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.nullifier && data.trapdoor && data.commitment && data.weight) {
          setIdentityData(data);
          setIdentityFile(file.name);
        } else {
          alert("Identity file format error: missing required fields");
        }
      } catch (error) {
        alert("Failed to parse identity file: " + error.message);
      }
    };
    reader.readAsText(file);
  }

  async function handleVote() {
    if (!identityData) {
      alert("Please load identity file first");
      return;
    }
    if (!election) {
      alert("No election available");
      return;
    }
    if (election.status !== "open") {
      alert("Election is not open for voting");
      return;
    }
    if (!election.tree_json) {
      alert("Election data incomplete: missing tree structure");
      return;
    }

    setVoting(true);
    setVoteStatus("Calculating Merkle path...");

    try {
      // 1. 计算 commitment 和 leaf
      const poseidon = await buildPoseidon();
      const F = poseidon.F;
      const nullifierBig = BigInt(identityData.nullifier);
      const trapdoorBig = BigInt(identityData.trapdoor);
      const commitment = poseidon([nullifierBig, trapdoorBig]);
      const commitmentHex = "0x" + F.toString(commitment, 16);

      // 验证 commitment
      if (commitmentHex.toLowerCase() !== identityData.commitment.toLowerCase()) {
        throw new Error("Commitment in identity file does not match calculated value");
      }

      const leaf = await poseidonLeaf(commitmentHex, identityData.weight);
      const leafHex = "0x" + leaf.toString(16);

      setVoteStatus("Finding leaf node...");

      // 2. 查找叶子节点索引
      const leafIndex = await findLeafIndex(election.tree_json, leafHex);
      if (leafIndex === -1) {
        throw new Error("Leaf node not found. You may not be in the voting roster.");
      }

      setVoteStatus("Generating Merkle path...");

      // 3. 获取 Merkle 路径
      const { pathElements, pathIndices } = await getMerklePath(election.tree_json, leafIndex);

      setVoteStatus("Generating zero-knowledge proof...");

      // 4. 计算 nullifierHash
      const externalNullifierBig = BigInt(election.external_nullifier);
      const nullifierHash = poseidon([nullifierBig, externalNullifierBig]);
      const nullifierHashHex = "0x" + F.toString(nullifierHash, 16);

      // 检查是否已投票
      const alreadyVoted = await checkNullifierUsed(election.id, nullifierHashHex);
      if (alreadyVoted) {
        throw new Error("You have already voted");
      }

      // 5. 准备电路输入
      const input = {
        identity_nullifier: nullifierBig.toString(),
        identity_trapdoor: trapdoorBig.toString(),
        weight: identityData.weight.toString(),
        pathElements: pathElements,
        pathIndices: pathIndices,
        merkleRoot: BigInt(election.merkle_root).toString(),
        externalNullifier: externalNullifierBig.toString(),
        option: selectedOption.toString()
      };

      setVoteStatus("Computing proof...");

      // 6. 生成证明
      const { proof: proofObj, publicSignals } = await genProof(input);

      setProof({ proof: proofObj, publicSignals });

      setVoteStatus("Proof generated successfully. Submitting vote...");

      // 7. 提交投票（本地模式）
      // 如果配置了合约地址，可以调用合约的 vote 函数
      // 这里先保存到本地数据库
      await insertVote({
        election_id: election.id,
        nullifier_hash: nullifierHashHex,
        option: selectedOption,
        weight: identityData.weight,
        tx_hash: null // 本地模式没有 tx_hash
      });

      setVoteStatus("Vote submitted successfully!");
      alert("Vote submitted successfully!");

    } catch (error) {
      console.error("Vote failed:", error);
      setVoteStatus("Vote failed: " + error.message);
      alert("Vote failed: " + error.message);
    } finally {
      setVoting(false);
    }
  }

  return (
    <div className="vote-background">
      <div className="vote-card">
        <div className="vote-title">Employee Vote</div>

        <div className="vote-section">
          <div className="vote-section-title">1. Load Identity File</div>
          <div className="vote-field">
            <label className="vote-label">Identity File (identity.json)</label>
            <input
              type="file"
              accept=".json"
              onChange={handleIdentityFile}
              className="vote-file-input"
            />
            {identityFile && (
              <div className="vote-file-info">
                ✓ Loaded: {identityFile}
                {identityData && (
                  <div className="vote-identity-details">
                    <div>Commitment: {identityData.commitment.substring(0, 20)}...</div>
                    <div>Weight: {identityData.weight === 3 ? "Manager (3)" : "Employee (1)"}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {election && (
          <>
            <div className="vote-section">
              <div className="vote-section-title">2. Election Information</div>
              <div className="vote-election-info">
                <div className="vote-election-item">
                  <span className="vote-election-label">Name:</span>
                  <span className="vote-election-value">{election.name}</span>
                </div>
                <div className="vote-election-item">
                  <span className="vote-election-label">Status:</span>
                  <span
                    className="vote-election-status"
                    style={{
                      color: election.status === "open" ? "#10b981" : "#6b7280"
                    }}
                  >
                    {election.status === "open" ? "Open" : election.status === "draft" ? "Draft" : "Closed"}
                  </span>
                </div>
                <div className="vote-election-item">
                  <span className="vote-election-label">Election ID:</span>
                  <span className="vote-election-value code">{election.external_nullifier}</span>
                </div>
              </div>
            </div>

            {election.status === "open" && (
              <>
                <div className="vote-section">
                  <div className="vote-section-title">3. Select Vote Option</div>
                  <div className="vote-options">
                    {[0, 1, 2, 3].map((opt) => (
                      <label key={opt} className="vote-option">
                        <input
                          type="radio"
                          name="option"
                          value={opt}
                          checked={selectedOption === opt}
                          onChange={() => setSelectedOption(opt)}
                        />
                        <span>Option {opt}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="vote-section">
                  <div className="vote-section-title">4. Submit Vote</div>
                  <button
                    className="vote-btn"
                    onClick={handleVote}
                    disabled={voting || !identityData}
                  >
                    {voting ? "Voting..." : "Submit Vote"}
                  </button>
                  {voteStatus && (
                    <div className={`vote-status ${voting ? "vote-status-loading" : "vote-status-done"}`}>
                      {voteStatus}
                    </div>
                  )}
                </div>
              </>
            )}

            {election.status !== "open" && (
              <div className="vote-section">
                <div className="vote-message vote-message-warning">
                  Election is not open for voting
                </div>
              </div>
            )}
          </>
        )}

        {!election && (
          <div className="vote-section">
            <div className="vote-message vote-message-info">
              No election available. Please wait for HR to create an election.
            </div>
          </div>
        )}
      </div>

      <GlobalToolBar />
    </div>
  );
}

