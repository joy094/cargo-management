import { useEffect, useState } from "react";

export default function Adjustments() {
  const [statements, setStatements] = useState([]);
  const [hajjiList, setHajjiList] = useState([]);
  const [selectedStatement, setSelectedStatement] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [amounts, setAmounts] = useState({});

  // Load statements & hajji
  useEffect(() => {
    fetch("http://localhost:5000/api/statements")
      .then((res) => res.json())
      .then(setStatements);

    fetch("http://localhost:5000/api/hajji")
      .then((res) => res.json())
      .then(setHajjiList);
  }, []);

  const handleAmountChange = (hajjiId, value) => {
    setAmounts({
      ...amounts,
      [hajjiId]: Number(value),
    });
  };

  const submitAdjustment = async () => {
    if (!selectedStatement || !reason) {
      alert("Statement ও Reason বাধ্যতামূলক");
      return;
    }

    const entries = Object.entries(amounts).filter(([_, amt]) => amt !== 0);

    if (entries.length === 0) {
      alert("কমপক্ষে এক জন হাজির adjustment দিন");
      return;
    }

    for (const [hajjiId, amount] of entries) {
      await fetch("http://localhost:5000/api/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statementId: selectedStatement,
          hajjiId,
          amount,
          reason,
          note,
        }),
      });
    }

    alert("Adjustment Completed");
    setAmounts({});
    setReason("");
    setNote("");
  };

  return (
    <div className="adjustment-box">
      <h2>Payment Adjustment</h2>

      <label>Bank Statement</label>
      <select
        value={selectedStatement}
        onChange={(e) => setSelectedStatement(e.target.value)}
      >
        <option value="">Select Statement</option>
        {statements.map((s) => (
          <option key={s._id} value={s._id}>
            {s.statementNo}
          </option>
        ))}
      </select>

      <label>Reason *</label>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. Over allocation correction"
      />

      <label>Note</label>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} />

      <table>
        <thead>
          <tr>
            <th>Hajji</th>
            <th>Agency</th>
            <th>Paid</th>
            <th>Adjustment (+ / -)</th>
          </tr>
        </thead>
        <tbody>
          {hajjiList.map((h) => (
            <tr key={h._id}>
              <td>{h.fullName}</td>
              <td>{h.agency?.name}</td>
              <td>{h.paidAmount}</td>
              <td>
                <input
                  type="number"
                  value={amounts[h._id] || ""}
                  onChange={(e) => handleAmountChange(h._id, e.target.value)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={submitAdjustment}>Finalize Adjustment</button>

      {/* ================= PURE CSS ================= */}
      <style>{`
        .adjustment-box {
          background: #fff;
          padding: 20px;
          border-radius: 8px;
        }

        h2 {
          margin-bottom: 15px;
        }

        label {
          display: block;
          margin-top: 10px;
          font-weight: 600;
        }

        select, input, textarea {
          width: 100%;
          padding: 8px;
          margin-top: 4px;
          border: 1px solid #ccc;
          border-radius: 4px;
        }

        textarea {
          resize: vertical;
        }

        table {
          width: 100%;
          margin-top: 15px;
          border-collapse: collapse;
        }

        th, td {
          padding: 8px;
          border-bottom: 1px solid #ddd;
          text-align: left;
        }

        button {
          margin-top: 15px;
          padding: 10px 20px;
          background: #dc3545;
          color: #fff;
          border: none;
          border-radius: 5px;
          cursor: pointer;
        }

        button:hover {
          background: #bb2d3b;
        }
      `}</style>
    </div>
  );
}
