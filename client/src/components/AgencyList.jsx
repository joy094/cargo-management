import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function AgencyList() {
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ১. ব্রাঞ্চ/এজেন্সি লিস্ট লোড করা
  const loadAgencies = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/agencies");
      setAgencies(res.data);
    } catch (err) {
      console.error("Failed to load agencies:", err);
      if (err.response?.status === 401) {
        localStorage.clear();
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgencies();
  }, []);

  // ২. ব্রাঞ্চ ডিলিট করা
  const deleteAgency = async (id) => {
    if (
      !window.confirm(
        "সতর্কবার্তা: এই ব্রাঞ্চটি ডিলিট করলে এর অধীনে থাকা সকল শিপমেন্টের লিংক হারিয়ে যাবে। আপনি কি নিশ্চিত?",
      )
    )
      return;

    try {
      await axios.delete(`/api/agencies/${id}`);
      loadAgencies(); // রিফ্রেশ লিস্ট
    } catch (err) {
      alert(err.response?.data?.error || "ডিলিট করতে সমস্যা হয়েছে।");
    }
  };

  return (
    <div className="agency-list-container">
      {/* Top Header */}
      <div className="top-bar">
        <div className="title-area">
          <h2>🏢 Branch & Agency Management</h2>
          <p>আপনার সকল কার্গো বুকিং পয়েন্টের তালিকা এখানে দেখুন</p>
        </div>
        <button className="add-btn" onClick={() => navigate("/agencies/new")}>
          + Add New Branch
        </button>
      </div>

      {/* Statistics Cards (Optional) */}
      <div className="list-stats">
        <div className="stat-item">
          Total Branches: <strong>{agencies.length}</strong>
        </div>
      </div>

      {/* Data Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Branch/Agency Name</th>
              <th>Contact Person</th>
              <th>Mobile</th>
              <th>Total Shipments</th>
              <th>Status/Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="text-center">
                  Loading branches...
                </td>
              </tr>
            ) : (
              agencies.map((a) => (
                <tr key={a._id}>
                  <td className="branch-name">
                    <strong>{a.name}</strong>
                  </td>
                  <td>{a.contactPerson || "N/A"}</td>
                  <td>{a.mobile || "N/A"}</td>
                  <td className="shipment-count">
                    <span className="count-badge">
                      {a.totalShipments || a.totalHajji || 0}
                    </span>
                  </td>
                  <td className="actions">
                    <button
                      className="view"
                      title="View Profile"
                      onClick={() => navigate(`/agencies/${a._id}`)}
                    >
                      📂 Profile
                    </button>

                    <button
                      className="edit"
                      title="Edit Data"
                      onClick={() => navigate(`/agencies/${a._id}/edit`)}
                    >
                      ✏️ Edit
                    </button>

                    <button
                      className="delete"
                      title="Delete Branch"
                      onClick={() => deleteAgency(a._id)}
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))
            )}

            {!loading && agencies.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center empty-msg">
                  No branches found. Please add a new branch to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ================= STYLES ================= */}
      <style>{`
        .agency-list-container {
          background: #ffffff;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        }

        .top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
          border-bottom: 2px solid #f8f9fa;
          padding-bottom: 15px;
        }

        .title-area h2 { margin: 0; color: #2c3e50; font-size: 22px; }
        .title-area p { margin: 5px 0 0; color: #7f8c8d; font-size: 14px; }

        .add-btn {
          padding: 10px 20px;
          background: #007bff;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.3s;
        }
        .add-btn:hover { background: #0056b3; transform: translateY(-2px); }

        .list-stats { margin-bottom: 15px; font-size: 14px; color: #555; }

        .table-wrapper { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }
        
        th {
          background: #f8f9fa;
          text-align: left;
          padding: 15px 12px;
          color: #34495e;
          font-weight: 700;
          border-bottom: 2px solid #dee2e6;
        }

        td {
          padding: 15px 12px;
          border-bottom: 1px solid #eee;
          color: #444;
          font-size: 14px;
        }

        .branch-name { color: #007bff; }
        
        .count-badge {
          background: #eef6ff;
          color: #007bff;
          padding: 4px 10px;
          border-radius: 20px;
          font-weight: bold;
        }

        .actions { display: flex; gap: 8px; }
        .actions button {
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: 0.2s;
        }

        .actions .view { background: #eef6ff; color: #007bff; }
        .actions .view:hover { background: #007bff; color: #fff; }

        .actions .edit { background: #fff3cd; color: #856404; }
        .actions .edit:hover { background: #ffc107; color: #000; }

        .actions .delete { background: #fff0f0; color: #e74c3c; }
        .actions .delete:hover { background: #dc3545; color: #fff; }

        .text-center { text-align: center; }
        .empty-msg { padding: 40px !important; color: #999; font-style: italic; }
      `}</style>
    </div>
  );
}
