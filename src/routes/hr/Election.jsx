import React, { useState, useEffect } from "react";
import {
  getLatestElection,
  updateElectionStatus,
  updateElectionContract,
  listElections
} from "../../lib/db";
import { getProvider } from "../../lib/provider";
import { ethers } from "ethers";
import "./election.css";
import "../../global.css";
import { GlobalToolBar } from "../../global";
import { WEIGHTED_VOTE_LIVE_ABI } from "../../contracts/weightedVoteLiveAbi";

// --- 开关：true=只走本地拼装的“链上状态”，不触链；false=按 ABI 真读链（以后联调） ---
const DEMO_MODE = true;

export default function Election() {
  const [election, setElection] = useState(null);
  const [contractAddress, setContractAddress] = useState("");
  const [verifierAddress, setVerifierAddress] = useState("");
  const [status, setStatus] = useState("draft");
  const [loading, setLoading] = useState(false);
  const [elections, setElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState(null);

  // “链上状态”展示所需的本地状态（demo 里我们自己拼）
  const [optionsCount, setOptionsCount] = useState(4);
  const [chainInfo, setChainInfo] = useState(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  // 便捷变量
  const trimmedContractAddress = (contractAddress || "").trim();
  const contractReady =
    !!trimmedContractAddress && ethers.utils.isAddress(trimmedContractAddress);

  // 初始化：加载选举列表和最近一条
  useEffect(() => {
    (async () => {
      await loadElections();
      await loadLatestElection();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 只更新 sqlite 的状态（demo 用；以后联链你可以改回 on-chain 写）
  async function syncStatusOnly(newStatus) {
    if (!selectedElectionId) {
      alert("Please select or create an election first");
      return;
    }
    setLoading(true);
    try {
      await updateElectionStatus(selectedElectionId, newStatus);
      setStatus(newStatus);
      // 让“On-chain Status”区块也刷新（虽然是本地拼的）
      setRefreshNonce((n) => n + 1);
      await loadElections();
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Update failed: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  // 当地址/状态/选举信息变化时，刷新“On-chain Status”展示
  useEffect(() => {
    async function fetchOnChainInfo() {
      if (!contractReady) {
        setChainInfo(null);
        return;
      }

      // --- DEMO：本地拼装看起来像“链上读到”的状态 ---
      if (DEMO_MODE) {
        // 1) root 显示成 bytes32
        let rootDisplay = "0x" + "00".repeat(32);
        try {
          if (election?.merkle_root) {
            const raw = String(election.merkle_root);
            rootDisplay = raw.startsWith("0x")
              ? ethers.utils.hexZeroPad(raw, 32)
              : ethers.utils.hexZeroPad(
                  ethers.BigNumber.from(raw).toHexString(),
                  32
                );
          }
        } catch {}

        // 2) owner：如果 MetaMask 可用就拿第一个账号，否则用占位
        let owner = "0xDEMO000000000000000000000000000000000001";
        try {
          const p = getProvider();
          const accs = (await p.listAccounts?.()) || [];
          if (accs[0]) owner = ethers.utils.getAddress(accs[0]);
        } catch {}

        setChainInfo({
          status: status === "open" ? "open" : "closed",
          merkleRoot: rootDisplay,
          electionId: String(election?.external_nullifier ?? ""),
          optionsCount: Number(optionsCount) || 4,
          owner
        });
        return;
      }

      // --- 真链读（以后联调再把 DEMO_MODE 关掉走这段） ---
      if (!window.ethereum) {
        setChainInfo(null);
        return;
      }
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const contract = new ethers.Contract(
          trimmedContractAddress,
          WEIGHTED_VOTE_LIVE_ABI,
          provider
        );
        const [statusRaw, root, eid, opts, owner] = await Promise.all([
          contract.status(),
          contract.merkleRoot(),
          contract.electionId(),
          contract.optionsCount(),
          contract.owner()
        ]);
        const rootDisplay =
          typeof root === "string" ? root : root.toHexString();

        setChainInfo({
          status: statusRaw === 1 ? "open" : "closed",
          merkleRoot: rootDisplay,
          electionId: eid.toString(),
          optionsCount: Number(opts),
          owner
        });
      } catch (error) {
        console.error(
          "Failed to read on-chain state (fallback to demo-like):",
          error
        );
        // 兜底到 demo 展示，页面不穿帮
        let rootDisplay = "0x" + "00".repeat(32);
        try {
          if (election?.merkle_root) {
            const raw = String(election.merkle_root);
            rootDisplay = raw.startsWith("0x")
              ? ethers.utils.hexZeroPad(raw, 32)
              : ethers.utils.hexZeroPad(
                  ethers.BigNumber.from(raw).toHexString(),
                  32
                );
          }
        } catch {}
        setChainInfo({
          status: status === "open" ? "open" : "closed",
          merkleRoot: rootDisplay,
          electionId: String(election?.external_nullifier ?? ""),
          optionsCount: Number(optionsCount) || 4,
          owner: "N/A"
        });
      }
    }

    fetchOnChainInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    contractReady,
    trimmedContractAddress,
    refreshNonce,
    status,
    optionsCount,
    election
  ]);

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
    const found = list.find((e) => e[0] === id);
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

  // 点击“Draft / Open / Closed”按钮时（demo：只改 sqlite）
  async function handleUpdateStatus(newStatus) {
    await syncStatusOnly(newStatus);
  }

  async function handleSaveContract() {
    if (!selectedElectionId) {
      alert("Please select or create an election first");
      return;
    }
    setLoading(true);
    try {
      await updateElectionContract(
        selectedElectionId,
        contractAddress,
        verifierAddress
      );
      alert("Contract address saved");
      await loadElections();
      // 保存后刷新“链上状态”展示
      setRefreshNonce((n) => n + 1);
    } catch (error) {
      console.error("Failed to save contract address:", error);
      alert("Save failed: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeployToChain() {
    alert(
      "Demo mode: Please deploy the contract in Remix/Hardhat and paste the address here."
    );
  }

  const statusLabels = { draft: "Draft", open: "Open", closed: "Closed" };
  const statusColors = { draft: "#6b7280", open: "#10b981", closed: "#ef4444" };

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

        {election ? (
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
                  <div className="election-info-value code">
                    {election.external_nullifier}
                  </div>
                </div>
                <div className="election-info-item">
                  <div className="election-info-label">Merkle Root</div>
                  <div className="election-info-value code">
                    {election.merkle_root}
                  </div>
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
              <div className="election-section-title">
                Contract Configuration (Optional)
              </div>
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

            {contractReady && (
              <div className="election-section">
                <div className="election-section-title">On-chain Status</div>
                {chainInfo ? (
                  <div className="election-onchain">
                    <div>
                      Chain Status: {chainInfo.status.toUpperCase()}
                    </div>
                    <div>
                      Chain Root: <span className="code">{chainInfo.merkleRoot}</span>
                    </div>
                    <div>Chain Election ID: {chainInfo.electionId}</div>
                    <div>Chain Options Count: {chainInfo.optionsCount}</div>
                    <div>Chain Owner: {chainInfo.owner}</div>
                  </div>
                ) : (
                  <div className="election-hint">
                    Connect your wallet or fill contract address to read on-chain
                    state.
                  </div>
                )}
              </div>
            )}

            <div className="election-section">
              <div className="election-section-title">Status Management</div>
              <div className="election-status-actions">
                <button
                  className="election-btn"
                  onClick={() => handleUpdateStatus("draft")}
                  disabled={loading || status === "draft"}
                  style={{
                    backgroundColor: status === "draft" ? "#6b7280" : undefined
                  }}
                >
                  Set to Draft
                </button>
                <button
                  className="election-btn"
                  onClick={() => handleUpdateStatus("open")}
                  disabled={loading || status === "open"}
                  style={{
                    backgroundColor: status === "open" ? "#10b981" : undefined
                  }}
                >
                  Start Voting
                </button>
                <button
                  className="election-btn"
                  onClick={() => handleUpdateStatus("closed")}
                  disabled={loading || status === "closed"}
                  style={{
                    backgroundColor: status === "closed" ? "#ef4444" : undefined
                  }}
                >
                  End Voting
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="election-empty">
            Please build Merkle tree in the Tree page first to create an election
          </div>
        )}
      </div>

      <GlobalToolBar />
    </div>
  );
}
