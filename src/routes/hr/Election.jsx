import React, { useState, useEffect } from "react";
import { getLatestElection, updateElectionStatus, updateElectionContract, listElections } from "../../lib/db";
import { getProvider, getSigner } from "../../lib/provider";
import { ethers } from "ethers";
import "./election.css";
import "../../global.css";
import { GlobalToolBar } from "../../global";

export default function Election() {
  const [election, setElection] = useState(null);
  const [contractAddress, setContractAddress] = useState("");
  const [verifierAddress, setVerifierAddress] = useState("");
  const [status, setStatus] = useState("draft");
  const [loading, setLoading] = useState(false);
  const [elections, setElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState(null);

  useEffect(() => {
    loadElections();
    loadLatestElection();
  }, []);

  async function loadElections() {
    const list = await listElections();
    setElections(list);
    if (list.length > 0 && !selectedElectionId) {
      setSelectedElectionId(list[0][0]);
      await loadElection(list[0][0]);
    }
  }

  async function loadLatestElection() {
    const latest = await getLatestElection();
    if (latest) {
      setElection(latest);
      setContractAddress(latest.contract_address || "");
      setVerifierAddress(latest.verifier_address || "");
      setStatus(latest.status || "draft");
      setSelectedElectionId(latest.id);
    }
  }

  async function loadElection(id) {
    const list = await listElections();
    const found = list.find(e => e[0] === id);
    if (found) {
      const latest = await getLatestElection();
      if (latest && latest.id === id) {
        setElection(latest);
        setContractAddress(latest.contract_address || "");
        setVerifierAddress(latest.verifier_address || "");
        setStatus(latest.status || "draft");
      }
    }
  }

  async function handleUpdateStatus(newStatus) {
    if (!selectedElectionId) {
      alert("Please select or create an election first");
      return;
    }
    setLoading(true);
    try {
      await updateElectionStatus(selectedElectionId, newStatus);
      setStatus(newStatus);
      alert(`Election status updated to: ${newStatus}`);
      await loadElections();
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Update failed: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveContract() {
    if (!selectedElectionId) {
      alert("Please select or create an election first");
      return;
    }
    setLoading(true);
    try {
      await updateElectionContract(selectedElectionId, contractAddress, verifierAddress);
      alert("Contract address saved");
      await loadElections();
    } catch (error) {
      console.error("Failed to save contract address:", error);
      alert("Save failed: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeployToChain() {
    if (!election || !election.merkle_root) {
      alert("Please build Merkle tree in the Tree page first");
      return;
    }
    
    if (!window.ethereum) {
      alert("Please install MetaMask first");
      return;
    }

    setLoading(true);
    try {
      // 这里应该是实际部署合约的逻辑
      // 由于没有完整的合约ABI，这里只是演示
      alert("Contract deployment requires complete contract code and ABI. Currently in demo mode, please deploy manually and fill in the address.");
      // const provider = getProvider();
      // const signer = await getSigner();
      // ... 部署逻辑
    } catch (error) {
      console.error("Deployment failed:", error);
      alert("Deployment failed: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  const statusLabels = {
    draft: "Draft",
    open: "Open",
    closed: "Closed"
  };

  const statusColors = {
    draft: "#6b7280",
    open: "#10b981",
    closed: "#ef4444"
  };

  return (
    <div className="election-background">
      <div className="election-card">
        <div className="election-title">Election Management</div>

        {elections.length > 0 && (
          <div className="election-section">
            <div className="election-section-title">Select Election</div>
            <select
              className="election-select"
              value={selectedElectionId || ""}
              onChange={(e) => {
                setSelectedElectionId(Number(e.target.value));
                loadElection(Number(e.target.value));
              }}
            >
              {elections.map((e) => (
                <option key={e[0]} value={e[0]}>
                  {e[1]} - {e[5]} ({statusLabels[e[4]] || e[4]})
                </option>
              ))}
            </select>
          </div>
        )}

        {election && (
          <>
            <div className="election-section">
              <div className="election-section-title">Election Information</div>
              <div className="election-info-grid">
                <div className="election-info-item">
                  <div className="election-info-label">Name</div>
                  <div className="election-info-value">{election.name}</div>
                </div>
                <div className="election-info-item">
                  <div className="election-info-label">Election ID</div>
                  <div className="election-info-value code">{election.external_nullifier}</div>
                </div>
                <div className="election-info-item">
                  <div className="election-info-label">Merkle Root</div>
                  <div className="election-info-value code">{election.merkle_root}</div>
                </div>
                <div className="election-info-item">
                  <div className="election-info-label">Status</div>
                  <div
                    className="election-status-badge"
                    style={{ backgroundColor: statusColors[status] || "#6b7280" }}
                  >
                    {statusLabels[status] || status}
                  </div>
                </div>
              </div>
            </div>

            <div className="election-section">
              <div className="election-section-title">Contract Configuration (Optional)</div>
              <div className="election-field">
                <label className="election-label">Contract Address</label>
                <input
                  type="text"
                  className="election-input"
                  value={contractAddress}
                  onChange={(e) => setContractAddress(e.target.value)}
                  placeholder="0x..."
                />
              </div>
              <div className="election-field">
                <label className="election-label">Verifier Address</label>
                <input
                  type="text"
                  className="election-input"
                  value={verifierAddress}
                  onChange={(e) => setVerifierAddress(e.target.value)}
                  placeholder="0x..."
                />
              </div>
              <div className="election-actions">
                <button
                  className="election-btn election-btn-secondary"
                  onClick={handleSaveContract}
                  disabled={loading}
                >
                  Save Contract Address
                </button>
                <button
                  className="election-btn election-btn-secondary"
                  onClick={handleDeployToChain}
                  disabled={loading}
                >
                  Deploy to Chain
                </button>
              </div>
            </div>

            <div className="election-section">
              <div className="election-section-title">Status Management</div>
              <div className="election-status-actions">
                <button
                  className="election-btn"
                  onClick={() => handleUpdateStatus("draft")}
                  disabled={loading || status === "draft"}
                  style={{ backgroundColor: status === "draft" ? "#6b7280" : undefined }}
                >
                  Set to Draft
                </button>
                <button
                  className="election-btn"
                  onClick={() => handleUpdateStatus("open")}
                  disabled={loading || status === "open"}
                  style={{ backgroundColor: status === "open" ? "#10b981" : undefined }}
                >
                  Start Voting
                </button>
                <button
                  className="election-btn"
                  onClick={() => handleUpdateStatus("closed")}
                  disabled={loading || status === "closed"}
                  style={{ backgroundColor: status === "closed" ? "#ef4444" : undefined }}
                >
                  End Voting
                </button>
              </div>
            </div>
          </>
        )}

        {!election && (
          <div className="election-empty">
            Please build Merkle tree in the Tree page first to create an election
          </div>
        )}
      </div>

      <GlobalToolBar />
    </div>
  );
}

