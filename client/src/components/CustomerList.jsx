import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./CustomerList.css"; // স্টাইলিং ফাইল
export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [agencies, setAgencies] = useState([]); // ব্রাঞ্চ লিস্টের জন্য
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAgency, setSelectedAgency] = useState(""); // সিলেক্টেড ব্রাঞ্চ
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // ১. কাস্টমার সামারি এবং ব্রাঞ্চ লিস্ট একসাথে আনা
        const [custRes, agencyRes] = await Promise.all([
          axios.get("/api/reports/customer-summary"),
          axios.get("/api/agencies"),
        ]);
        setCustomers(custRes.data);
        setAgencies(agencyRes.data);
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // সার্চ এবং ব্রাঞ্চ ফিল্টার লজিক
  const filtered = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.mobile.includes(searchTerm);
    const matchesBranch =
      selectedAgency === "" || c.agencyId === selectedAgency;

    return matchesSearch && matchesBranch;
  });

  return (
    <div className="customer-list-page">
      <div className="header-flex">
        <div className="title-section">
          <h2>👥 কাস্টমার ডাটাবেজ</h2>
          <p>ব্রাঞ্চ ও নাম অনুযায়ী কাস্টমার লেজার ফিল্টার করুন</p>
        </div>

        <div className="filter-controls">
          {/* ব্রাঞ্চ ফিল্টার ড্রপডাউন */}
          <select
            className="branch-select"
            value={selectedAgency}
            onChange={(e) => setSelectedAgency(e.target.value)}
          >
            <option value="">সকল ব্রাঞ্চ (All Branches)</option>
            {agencies.map((a) => (
              <option key={a._id} value={a._id}>
                {a.name}
              </option>
            ))}
          </select>

          {/* নাম/মোবাইল সার্চ */}
          <input
            placeholder="নাম বা মোবাইল দিয়ে সার্চ..."
            className="search-input"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center">লোডিং হচ্ছে...</div>
      ) : (
        <div className="table-wrapper">
          <table className="cargo-table">
            <thead>
              <tr>
                <th>কাস্টমারের নাম</th>
                <th>মোবাইল</th>
                <th className="text-center">শিপমেন্ট</th>
                <th>মোট বিল</th>
                <th>মোট জমা</th>
                <th>বকেয়া</th>
                <th>অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c._id}>
                  <td data-label="নাম">
                    <strong>{c.name}</strong>
                  </td>
                  <td data-label="মোবাইল">{c.mobile}</td>
                  <td data-label="শিপমেন্ট" className="text-center">
                    <span className="count-badge">{c.totalShipments}</span>
                  </td>
                  <td data-label="বিল">৳ {c.totalBill.toLocaleString()}</td>
                  <td data-label="জমা" style={{ color: "green" }}>
                    ৳ {c.totalPaid.toLocaleString()}
                  </td>
                  <td
                    data-label="বকেয়া"
                    style={{ color: "red", fontWeight: "bold" }}
                  >
                    ৳ {c.totalDue.toLocaleString()}
                  </td>
                  <td>
                    <button
                      className="view-btn"
                      onClick={() => navigate(`/customer-profile/${c._id}`)}
                    >
                      লেজার দেখুন
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="no-data">কোনো কাস্টমার পাওয়া যায়নি!</div>
          )}
        </div>
      )}
    </div>
  );
}
