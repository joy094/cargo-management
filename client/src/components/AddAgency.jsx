import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

export default function AddAgency() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    contactPerson: "",
    mobile: "",
    address: "",
    notes: "",
  });

  // Edit mode হলে ডাটা লোড করা
  useEffect(() => {
    if (!id) return;

    const loadAgency = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/api/agencies/${id}`);
        const agency = res.data?.agency || res.data || {};
        setForm({
          name: agency.name || "",
          contactPerson: agency.contactPerson || "",
          mobile: agency.mobile || "",
          address: agency.address || "",
          notes: agency.notes || "",
        });
      } catch (err) {
        handleError(err);
      } finally {
        setLoading(false);
      }
    };

    loadAgency();
  }, [id]);

  // এরর হ্যান্ডলিং ফাংশন
  const handleError = (err) => {
    console.error("Error:", err);
    if (err.response?.status === 401) {
      localStorage.clear();
      navigate("/login");
    } else {
      alert(err.response?.data?.error || "Something went wrong!");
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const url = id ? `/api/agencies/${id}` : "/api/agencies";
      const method = id ? "put" : "post";

      await axios[method](url, form);

      alert(
        id ? "Branch Updated Successfully" : "New Branch Added Successfully",
      );
      navigate("/agency-list");
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && id)
    return <div className="loader">Loading Agency Data...</div>;

  return (
    <div className="agency-container">
      <div className="agency-card">
        <div className="card-header">
          <h2>{id ? "📝 Edit Branch/Agency" : "🏢 Add New Branch"}</h2>
          <p>কারগো বুকিং পয়েন্ট বা এজেন্সির তথ্য এখানে ইনপুট দিন</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Agency/Branch Name *</label>
            <input
              name="name"
              placeholder="e.g. Dhaka Main Branch"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="row">
            <div className="form-group">
              <label>Contact Person</label>
              <input
                name="contactPerson"
                placeholder="Manager Name"
                value={form.contactPerson}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Mobile Number</label>
              <input
                name="mobile"
                placeholder="017xxxxxxxx"
                value={form.mobile}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Full Address</label>
            <textarea
              name="address"
              placeholder="Detailed office address..."
              value={form.address}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Internal Notes</label>
            <textarea
              name="notes"
              placeholder="Extra information if any..."
              value={form.notes}
              onChange={handleChange}
            />
          </div>

          <div className="button-group">
            <button
              type="button"
              className="btn-cancel"
              onClick={() => navigate("/agency-list")}
            >
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? "Saving..." : id ? "Update Branch" : "Save Branch"}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .agency-container { 
          display: flex; justify-content: center; padding: 40px 20px; 
          background: #f4f7f6; min-height: 100vh;
        }
        .agency-card { 
          width: 100%; max-width: 650px; background: #fff; 
          padding: 30px; border-radius: 12px; 
          box-shadow: 0 4px 20px rgba(0,0,0,0.08); 
        }
        .card-header { margin-bottom: 25px; border-bottom: 2px solid #eee; padding-bottom: 15px; }
        .card-header h2 { color: #2c3e50; margin: 0; font-size: 24px; }
        .card-header p { color: #7f8c8d; margin-top: 5px; font-size: 14px; }
        
        .form-group { margin-bottom: 18px; }
        .row { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        
        label { display: block; margin-bottom: 6px; font-weight: 600; color: #34495e; font-size: 14px; }
        input, textarea { 
          width: 100%; padding: 12px; border: 1px solid #dcdde1; 
          border-radius: 6px; font-size: 15px; transition: 0.3s;
          box-sizing: border-box;
        }
        input:focus, textarea:focus { border-color: #3498db; outline: none; box-shadow: 0 0 5px rgba(52,152,219,0.2); }
        textarea { resize: vertical; min-height: 80px; }
        
        .button-group { display: flex; gap: 10px; margin-top: 25px; }
        .btn-submit { 
          flex: 2; padding: 12px; background: #2ecc71; color: #fff; 
          border: none; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer; transition: 0.3s;
        }
        .btn-submit:hover { background: #27ae60; }
        .btn-submit:disabled { background: #95a5a6; cursor: not-allowed; }
        
        .btn-cancel { 
          flex: 1; padding: 12px; background: #e74c3c; color: #fff; 
          border: none; border-radius: 6px; font-size: 16px; cursor: pointer; transition: 0.3s;
        }
        .btn-cancel:hover { background: #c0392b; }

        .loader { text-align: center; margin-top: 50px; font-size: 18px; color: #3498db; }

        @media (max-width: 480px) {
          .row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
