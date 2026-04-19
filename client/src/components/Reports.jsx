import React, { useState, useEffect } from "react";
import axios from "axios";

const Reports = () => {
  const [reportType, setReportType] = useState("");
  const [hajjiList, setHajjiList] = useState([]);
  const [agencyList, setAgencyList] = useState([]);
  const [statementList, setStatementList] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    // Fetch Hajji list
    axios
      .get("http://localhost:5000/api/hajji")
      .then((res) => setHajjiList(res.data || []));
    // Fetch Agency list
    axios
      .get("http://localhost:5000/api/agencies")
      .then((res) => setAgencyList(res.data || []));
    // Fetch Bank Statements
    axios
      .get("http://localhost:5000/api/statements")
      .then((res) => setStatementList(res.data || []));
  }, []);

  const generateReport = () => {
    if (!reportType || !selectedId) {
      alert("Please select type & item");
      return;
    }

    let url = "";
    if (reportType === "hajji")
      url = `http://localhost:5000/api/reports/hajji-ledger/${selectedId}`;
    else if (reportType === "agency")
      url = `http://localhost:5000/api/agencies/${selectedId}`;
    else if (reportType === "statement")
      url = `http://localhost:5000/api/reports/bank-statement/${selectedId}`;

    axios
      .get(url)
      .then((res) => setReportData(res.data))
      .catch((err) => console.error("Error generating report:", err));
  };

  const handlePrint = () => {
    const printContent = document.getElementById("reportSection").innerHTML;
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  return (
    <div className="report-container">
      <h2>Reports</h2>

      <div className="report-controls">
        <select
          value={reportType}
          onChange={(e) => {
            setReportType(e.target.value);
            setSelectedId("");
          }}
        >
          <option value="">-- Select Report Type --</option>
          <option value="agency">Agency Ledger</option>
          <option value="hajji">Hajji Ledger</option>
          <option value="statement">Bank Statement</option>
        </select>

        {reportType === "hajji" && (
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="">-- Select Hajji --</option>
            {hajjiList.map((h) => (
              <option key={h._id} value={h._id}>
                {h.fullName} ({h.passportNumber})
              </option>
            ))}
          </select>
        )}

        {reportType === "agency" && (
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="">-- Select Agency --</option>
            {agencyList.map((a) => (
              <option key={a._id} value={a._id}>
                {a.name}
              </option>
            ))}
          </select>
        )}

        {reportType === "statement" && (
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            <option value="">-- Select Statement --</option>
            {statementList.map((s) => (
              <option key={s._id} value={s._id}>
                {s.statementNo}
              </option>
            ))}
          </select>
        )}

        <button onClick={generateReport}>Generate</button>
        <button onClick={handlePrint}>Print</button>
      </div>

      <div id="reportSection" className="report-section">
        {reportData && reportType === "hajji" && (
          <div>
            <h3>Hajji Ledger: {reportData.hajji.fullName}</h3>
            <p>Agency: {reportData.hajji.agency?.name}</p>
            <p>Package Amount: {reportData.hajji.packageAmount}</p>
            <p>Paid Amount: {reportData.hajji.paidAmount}</p>
            <p>
              Due Amount:{" "}
              {reportData.hajji.packageAmount - reportData.hajji.paidAmount}
            </p>

            <h4>Payments</h4>
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Statement No</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {reportData.payments.map((p) => (
                  <tr key={p._id}>
                    <td>{p.statement?.statementNo || "-"}</td>
                    <td>{p.amount}</td>
                    <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h4>Adjustments</h4>
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Adjustment Ref</th>
                  <th>Amount</th>
                  <th>Reason</th>
                  <th>Note</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {reportData.adjustments.map((a) => (
                  <tr key={a._id}>
                    <td>{a.adjustmentRef}</td>
                    <td>{a.amount}</td>
                    <td>{a.reason}</td>
                    <td>{a.note || "-"}</td>
                    <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportData && reportType === "agency" && (
          <div>
            <h3>Agency Ledger: {reportData.agency.name}</h3>
            <p>Contact: {reportData.agency.contactPerson}</p>
            <p>Mobile: {reportData.agency.mobile}</p>
            <p>Address: {reportData.agency.address}</p>

            <h4>Hajji List</h4>
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Hajji Name</th>
                  <th>Passport</th>
                  <th>Package Amount</th>
                  <th>Paid</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {reportData.hajji.map((h) => (
                  <tr key={h._id}>
                    <td>{h.fullName}</td>
                    <td>{h.passportNumber}</td>
                    <td>{h.packageAmount}</td>
                    <td>{h.paidAmount}</td>
                    <td>{h.packageAmount - h.paidAmount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportData && reportType === "statement" && (
          <div>
            <h3>Bank Statement: {reportData.statementNo}</h3>
            <p>Bank Name: {reportData.bankName}</p>
            <p>
              Date: {new Date(reportData.statementDate).toLocaleDateString()}
            </p>
            <p>Total Amount: {reportData.totalAmount}</p>
            <p>Allocated Amount: {reportData.allocatedAmount}</p>

            <h4>Allocations</h4>
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Hajji Name</th>
                  <th>Agency</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {reportData.allocations?.map((a) => (
                  <tr key={a._id}>
                    <td>{a.hajji?.fullName}</td>
                    <td>{a.agency?.name}</td>
                    <td>{a.amount}</td>
                    <td>{new Date(a.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .report-container {
          padding: 20px;
          font-family: Arial, sans-serif;
          max-width: 1000px;
          margin: 0 auto;
        }
        .report-controls {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        select, button {
          padding: 6px 12px;
          font-size: 16px;
        }
        .ledger-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .ledger-table th, .ledger-table td {
          border: 1px solid #ccc;
          padding: 8px;
          text-align: left;
        }
        .ledger-table th {
          background-color: #f0f0f0;
        }
        button {
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default Reports;
