import React, { useState, useEffect } from "react";
import { listIdentities, upsertElection, getLatestElection } from "../../lib/db";
import { poseidonLeaf, buildMerkle } from "../../lib/merkle";
import "./tree.css";
import "../../global.css";
import { GlobalToolBar } from "../../global";

export default function Tree() {
  const [root, setRoot] = useState("");
  const [electionId, setElectionId] = useState("");
  const [electionName, setElectionName] = useState("MVP-Election");
  const [building, setBuilding] = useState(false);
  const [identityCount, setIdentityCount] = useState(0);
  const [treeInfo, setTreeInfo] = useState(null);

  useEffect(() => {
    loadLatestElection();
    loadIdentityCount();
  }, []);

  async function loadIdentityCount() {
    const rows = await listIdentities();
    setIdentityCount(rows.length);
  }

  async function loadLatestElection() {
    const election = await getLatestElection();
    if (election) {
      setRoot(election.merkle_root || "");
      setElectionId(election.external_nullifier || String(Date.now()));
      setElectionName(election.name || "MVP-Election");
      if (election.tree_json) {
        setTreeInfo({
          root: election.merkle_root,
          leavesCount: election.tree_json.leaves?.length || 0,
          levels: election.tree_json.layers?.length - 1 || 0
        });
      }
    } else {
      setElectionId(String(Date.now()));
    }
  }

  async function build() {
    if (identityCount === 0) {
      alert("Please add identity data in the Roster page first");
      return;
    }

    setBuilding(true);
    try {
      const rows = await listIdentities();
      const leaves = [];
      for (const r of rows) {
        const commitment = r[1];
        const weight = r[2];
        const leaf = await poseidonLeaf(commitment, weight);
        leaves.push(leaf);
      }

      const tree = await buildMerkle(leaves, 20);
      setRoot(tree.root);
      setTreeInfo({
        root: tree.root,
        leavesCount: tree.leaves.length,
        levels: tree.layers.length - 1
      });

      await upsertElection({
        name: electionName,
        merkle_root: tree.root,
        external_nullifier: electionId,
        tree_json: tree,
        status: 'draft'
      });

      alert("Merkle tree has been built and saved!");
    } catch (error) {
      console.error("Failed to build tree:", error);
      alert("Build failed: " + error.message);
    } finally {
      setBuilding(false);
    }
  }

  function downloadTree() {
    if (!treeInfo) {
      alert("Please build the tree first");
      return;
    }
    // 这里可以添加下载tree.json的功能
    alert("Tree data has been saved to the local database");
  }

  return (
    <div className="tree-background">
      <div className="tree-card">
        <div className="tree-title">Build Merkle Tree</div>

        <div className="tree-section">
          <div className="tree-field">
            <label className="tree-label">Election Name</label>
            <input
              type="text"
              className="tree-input"
              value={electionName}
              onChange={(e) => setElectionName(e.target.value)}
              placeholder="MVP-Election"
            />
          </div>

          <div className="tree-field">
            <label className="tree-label">Election ID (externalNullifier)</label>
            <input
              type="text"
              className="tree-input"
              value={electionId}
              onChange={(e) => setElectionId(e.target.value)}
              placeholder="Auto-generated timestamp"
            />
          </div>

          <div className="tree-info-box">
            <div className="tree-info-item">
              <span className="tree-info-label">Current Identity Count:</span>
              <span className="tree-info-value">{identityCount}</span>
            </div>
            {treeInfo && (
              <>
                <div className="tree-info-item">
                  <span className="tree-info-label">Tree Depth:</span>
                  <span className="tree-info-value">{treeInfo.levels} levels</span>
                </div>
                <div className="tree-info-item">
                  <span className="tree-info-label">Leaf Count:</span>
                  <span className="tree-info-value">{treeInfo.leavesCount}</span>
                </div>
              </>
            )}
          </div>

          <div className="tree-actions">
            <button
              className="tree-btn"
              onClick={build}
              disabled={building || identityCount === 0}
            >
              {building ? "Building..." : "Build Merkle Tree"}
            </button>
            {treeInfo && (
              <button className="tree-btn tree-btn-secondary" onClick={downloadTree}>
                Download Tree Data
              </button>
            )}
          </div>
        </div>

        {root && (
          <div className="tree-result">
            <div className="tree-result-title">Merkle Root</div>
            <div className="tree-result-code">{root}</div>
            <div className="tree-result-hint">
              This root will be used to verify zero-knowledge proofs during voting
            </div>
          </div>
        )}
      </div>

      <GlobalToolBar />
    </div>
  );
}
