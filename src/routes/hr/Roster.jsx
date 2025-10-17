import React, { useState } from "react";
import Papa from "papaparse";
import { insertIdentity, listIdentities } from "../../lib/db";

export default function Roster() {
  const [rows, setRows] = useState([]);

  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      complete: async (res) => {
        const data = res.data.filter(r => r.commitment && r.weight);
        for (const r of data) {
          try { await insertIdentity({ commitment: r.commitment.trim(), weight: Number(r.weight) }); }
          catch(e) { /* 可能重复，忽略 */ }
        }
        const all = await listIdentities();
        setRows(all);
        alert(`导入完成：${data.length} 条`);
      }
    });
  }

  return (
    <div style={{padding:20}}>
      <h2>HR 名册导入</h2>
      <input type="file" accept=".csv" onChange={onFile} />
      <p>CSV 列：commitment, weight</p>
      <ul>
        {rows.map(r => <li key={r[0]}>{r[1]} — weight={r[2]}</li>)}
      </ul>
    </div>
  );
}
