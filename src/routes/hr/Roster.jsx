import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import { listIdentities, insertIdentity, updateIdentityWeight, deleteIdentity } from "../../lib/db";
import "./roster.css";
import "../../global.css";
import { GlobalToolBar } from "../../global";

export default function Roster() {
  const [rows, setRows] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingWeight, setEditingWeight] = useState(1);

  async function loadIdentities() {
    const all = await listIdentities();
    setRows(all);
  }

  useEffect(() => {
    loadIdentities();
  }, []);

  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      complete: async (res) => {
        const data = res.data.filter(r => r.commitment && r.weight);
        let imported = 0;
        for (const r of data) {
          try {
            await insertIdentity({ commitment: r.commitment.trim(), weight: Number(r.weight) });
            imported++;
          } catch(e) {
            console.warn("Import failed (possibly duplicate):", r.commitment, e);
          }
        }
        await loadIdentities();
        alert(`Import completed: ${imported} records`);
      }
    });
  }

  async function handleUpdateWeight(id, newWeight) {
    await updateIdentityWeight(id, newWeight);
    setEditingId(null);
    await loadIdentities();
  }

  async function handleDelete(id) {
    if (window.confirm("Are you sure you want to delete this record?")) {
      await deleteIdentity(id);
      await loadIdentities();
    }
  }

  return (
    <div className="roster-background">
      <div className="roster-card">
        <div className="roster-title">HR Roster Management</div>

        <div className="roster-section">
          <div className="roster-section-title">Import CSV</div>
          <input 
            type="file" 
            accept=".csv" 
            onChange={onFile}
            className="roster-file-input"
          />
          <div className="roster-hint">CSV format: commitment, weight</div>
        </div>

        <div className="roster-section">
          <div className="roster-section-title">Identity List ({rows.length})</div>
          <div className="roster-table-container">
            <table className="roster-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Commitment</th>
                  <th>Weight</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r[0]}>
                    <td>{r[0]}</td>
                    <td className="roster-commitment">{r[1]}</td>
                    <td>
                      {editingId === r[0] ? (
                        <select
                          value={editingWeight}
                          onChange={(e) => setEditingWeight(Number(e.target.value))}
                          className="roster-weight-select"
                        >
                          <option value={1}>Employee (1)</option>
                          <option value={3}>Manager (3)</option>
                        </select>
                      ) : (
                        <span className={`roster-weight-badge ${r[2] === 3 ? 'manager' : 'employee'}`}>
                          {r[2] === 3 ? 'Manager (3)' : 'Employee (1)'}
                        </span>
                      )}
                    </td>
                    <td>{r[3]}</td>
                    <td>
                      {editingId === r[0] ? (
                        <>
                          <button
                            className="roster-btn-small roster-btn-save"
                            onClick={() => handleUpdateWeight(r[0], editingWeight)}
                          >
                            Save
                          </button>
                          <button
                            className="roster-btn-small roster-btn-cancel"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="roster-btn-small roster-btn-edit"
                            onClick={() => {
                              setEditingId(r[0]);
                              setEditingWeight(r[2]);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="roster-btn-small roster-btn-delete"
                            onClick={() => handleDelete(r[0])}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <div className="roster-empty">No data available. Please import CSV or add from Employee Identity page.</div>
            )}
          </div>
        </div>
      </div>

      <GlobalToolBar />
    </div>
  );
}
