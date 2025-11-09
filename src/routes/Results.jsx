import React, { useState, useEffect } from "react";
import { getLatestElection, getVoteResults, getVoteTotals, listElections } from "../lib/db";
import "./results.css";
import "../global.css";
import { GlobalToolBar } from "../global";

export default function Results() {
  const [election, setElection] = useState(null);
  const [results, setResults] = useState({});
  const [totalVotes, setTotalVotes] = useState(0);
  const [totalWeight, setTotalWeight] = useState(0);
  const [elections, setElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState(null);
  const [loading, setLoading] = useState(false);

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
      setSelectedElectionId(latest.id);
      await loadResults(latest.id);
    }
  }

  async function loadElection(id) {
    const list = await listElections();
    const found = list.find(e => e[0] === id);
    if (found) {
      const latest = await getLatestElection();
      if (latest && latest.id === id) {
        setElection(latest);
        await loadResults(id);
      }
    }
  }

  async function loadResults(electionId) {
    setLoading(true);
    try {
      const [voteResults, totals] = await Promise.all([
        getVoteResults(electionId),
        getVoteTotals(electionId),
      ]);
      setResults(voteResults);
      setTotalVotes(totals.votes);        // 真正的“投了多少张票（行数）”
      setTotalWeight(totals.totalWeight); // 权重总和

      // 计算统计信息
      let votes = 0;
      let weight = 0;
      Object.values(voteResults).forEach((w) => {
        votes++;
        weight += Number(w);
      });
      setTotalVotes(votes);
      setTotalWeight(weight);
    } catch (error) {
      console.error("Failed to load results:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedElectionId) {
      loadResults(selectedElectionId);
    }
  }, [selectedElectionId]);

  const getMaxWeight = () => {
    if (Object.keys(results).length === 0) return 0;
    return Math.max(...Object.values(results).map(w => Number(w)));
  };

  const maxWeight = getMaxWeight();

  return (
    <div className="results-background">
      <div className="results-card">
        <div className="results-title">Vote Results Statistics</div>

        {elections.length > 0 && (
          <div className="results-section">
            <div className="results-section-title">Select Election</div>
            <select
              className="results-select"
              value={selectedElectionId || ""}
              onChange={(e) => {
                setSelectedElectionId(Number(e.target.value));
                loadElection(Number(e.target.value));
              }}
            >
              {elections.map((e) => (
                <option key={e[0]} value={e[0]}>
                  {e[1]} - {e[4]}
                </option>
              ))}
            </select>
          </div>
        )}

        {election && (
          <>
            <div className="results-section">
              <div className="results-section-title">Election Information</div>
              <div className="results-election-info">
                <div className="results-election-item">
                  <span className="results-election-label">Name:</span>
                  <span className="results-election-value">{election.name}</span>
                </div>
                <div className="results-election-item">
                  <span className="results-election-label">Status:</span>
                  <span
                    className="results-election-status"
                    style={{
                      color:
                        election.status === "open"
                          ? "#10b981"
                          : election.status === "closed"
                          ? "#ef4444"
                          : "#6b7280"
                    }}
                  >
                    {election.status === "open"
                      ? "Open"
                      : election.status === "closed"
                      ? "Closed"
                      : "Draft"}
                  </span>
                </div>
              </div>
            </div>

            <div className="results-section">
              <div className="results-section-title">Statistics Overview</div>
              <div className="results-stats">
                <div className="results-stat-item">
                  <div className="results-stat-value">{totalVotes}</div>
                  <div className="results-stat-label">Total Votes</div>
                </div>
                <div className="results-stat-item">
                  <div className="results-stat-value">{totalWeight}</div>
                  <div className="results-stat-label">Total Weight</div>
                </div>
              </div>
            </div>

            <div className="results-section">
              <div className="results-section-title">Vote Results</div>
              {loading ? (
                <div className="results-loading">Loading...</div>
              ) : Object.keys(results).length === 0 ? (
                <div className="results-empty">No vote data available</div>
              ) : (
                <div className="results-list">
                  {Object.entries(results)
                    .sort((a, b) => Number(b[1]) - Number(a[1]))
                    .map(([option, weight]) => {
                      const percentage =
                        maxWeight > 0 ? ((Number(weight) / maxWeight) * 100).toFixed(1) : 0;
                      const totalPercentage =
                        totalWeight > 0 ? ((Number(weight) / totalWeight) * 100).toFixed(1) : 0;
                      return (
                        <div key={option} className="results-item">
                          <div className="results-item-header">
                            <div className="results-item-option">Option {option}</div>
                            <div className="results-item-weight">
                              {weight} weight ({totalPercentage}%)
                            </div>
                          </div>
                          <div className="results-item-bar-container">
                            <div
                              className="results-item-bar"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </>
        )}

        {!election && (
          <div className="results-section">
            <div className="results-empty">No election available</div>
          </div>
        )}
      </div>

      <GlobalToolBar />
    </div>
  );
}

