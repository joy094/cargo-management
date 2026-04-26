import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // ✅ নেভিগেশনের জন্য
import axios from "axios";
import "./BatchList.css";

export default function BatchList() {
  const [batches, setBatches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate(); // ✅ বিস্তারিত পেজে যাওয়ার জন্য

  const [newBatch, setNewBatch] = useState({
    batchName: "",
    flightNumber: "",
    flightDate: "",
  });

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const res = await axios.get("/api/batches");
      setBatches(res.data);
    } catch (err) {
      console.error("Error fetching batches:", err);
    }
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/batches", newBatch);
      setShowModal(false);
      setNewBatch({ batchName: "", flightNumber: "", flightDate: "" }); // রিসেট
      fetchBatches();
    } catch (err) {
      alert(
        "ব্যাচ তৈরি করতে সমস্যা হয়েছে। সম্ভবত এই নামে অন্য একটি ব্যাচ আছে।",
      );
    }
  };

  return (
    <div className="batch-page">
      <div className="batch-header">
        <h1>📑 ব্যাচ ম্যানেজমেন্ট (Batching)</h1>
        <button className="add-batch-btn" onClick={() => setShowModal(true)}>
          + নতুন ব্যাচ তৈরি করুন
        </button>
      </div>

      <div className="batch-grid">
        {batches.map((b) => (
          <div key={b._id} className="batch-card">
            <div className={`batch-status status-${b.status.toLowerCase()}`}>
              {b.status}
            </div>
            <h3>{b.batchName}</h3>
            <p>✈️ ফ্লাইট: {b.flightNumber || "N/A"}</p>
            <p>
              📅 তারিখ: {new Date(b.flightDate).toLocaleDateString("bn-BD")}
            </p>
            <div className="batch-footer">
              {/* ✅ ব্যাকএন্ড থেকে আসা আসল শিপমেন্ট সংখ্যা এখানে দেখাবে */}
              <span>📦 {b.shipmentCount || 0}টি শিপমেন্ট</span>

              <button
                className="details-btn"
                onClick={() => navigate(`/batches/${b._id}`)} // ✅ বিস্তারিত পেজে রাউট করা
              >
                বিস্তারিত
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal for New Batch */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>নতুন চালান গ্রুপ করুন</h2>
            <form onSubmit={handleCreateBatch}>
              <div className="input-group">
                <label>ব্যাচের নাম *</label>
                <input
                  placeholder="যেমন: MAY-20-DXB"
                  required
                  value={newBatch.batchName}
                  onChange={(e) =>
                    setNewBatch({ ...newBatch, batchName: e.target.value })
                  }
                />
              </div>
              <div className="input-group">
                <label>ফ্লাইট নম্বর</label>
                <input
                  placeholder="যেমন: EK582"
                  value={newBatch.flightNumber}
                  onChange={(e) =>
                    setNewBatch({ ...newBatch, flightNumber: e.target.value })
                  }
                />
              </div>
              <div className="input-group">
                <label>ফ্লাইট তারিখ *</label>
                <input
                  type="date"
                  required
                  value={newBatch.flightDate}
                  onChange={(e) =>
                    setNewBatch({ ...newBatch, flightDate: e.target.value })
                  }
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  বাতিল
                </button>
                <button type="submit" className="save-btn">
                  সেভ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
