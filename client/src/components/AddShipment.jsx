import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

export default function AddShipment() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    customerName: "",
    customerMobile: "",
    agency: "",
    receiverName: "",
    receiverMobile: "",
    receiverAddress: "",
    itemName: "",
    weight: "",
    boxCount: 1,
    shipmentType: "Air",
    totalCharge: "",
    status: "Booked",
    notes: "",
  });

  // ১. ব্রাঞ্চ/এজেন্সি লোড করা
  useEffect(() => {
    const loadAgencies = async () => {
      try {
        const res = await axios.get("/api/agencies");
        setAgencies(res.data);
      } catch (err) {
        handleError(err);
      }
    };
    loadAgencies();
  }, []);

  // ২. এডিট মোড হলে শিপমেন্ট ডাটা লোড করা
  useEffect(() => {
    if (!id) return;

    const loadShipment = async () => {
      try {
        const res = await axios.get(`/api/reports/shipment-ledger/${id}`);
        const s = res.data.shipment;
        setForm({
          customerName: s.customer?.fullName || "",
          customerMobile: s.customer?.phoneNumber || "",
          agency: s.agency?._id || "",
          receiverName: s.receiverName,
          receiverMobile: s.receiverMobile,
          receiverAddress: s.receiverAddress || "",
          itemName: s.itemName || "",
          weight: s.weight,
          boxCount: s.boxCount,
          shipmentType: s.shipmentType,
          totalCharge: s.totalCharge,
          status: s.status,
          notes: s.notes || "",
        });
      } catch (err) {
        handleError(err);
      }
    };
    loadShipment();
  }, [id]);

  const handleError = (err) => {
    if (err.response?.status === 401) {
      localStorage.clear();
      navigate("/login");
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ফোন নাম্বার দিয়ে কাস্টমার সার্চ এবং অটো-ফিল লজিক
  const handleCustomerSearch = async (phone) => {
    if (!phone || phone.length < 11) return;

    try {
      const res = await axios.get(`/api/customers/search/${phone}`);
      if (res.data) {
        // ✅ Regex লজিক: নামের শেষে থাকা (শিপমেন্ট ১) বা (শিপমেন্ট ২) মুছে ফেলবে
        const cleanName = res.data.fullName
          .replace(/\s*\(\s*শিপমেন্ট\s*\d+\s*\)/g, "")
          .trim();

        setForm((prev) => ({
          ...prev,
          customerName: `${cleanName} (শিপমেন্ট ${res.data.nextShipmentNumber})`,
          customerMobile: res.data.phoneNumber,
          agency: res.data.agency || prev.agency,
        }));
      }
    } catch (err) {
      // নতুন কাস্টমার হলে
      const cleanName = form.customerName
        .replace(/\s*\(\s*শিপমেন্ট\s*\d+\s*\)/g, "")
        .trim();
      setForm((prev) => ({
        ...prev,
        customerName: cleanName ? `${cleanName} (শিপমেন্ট 1)` : "",
      }));
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      customerData: {
        fullName: form.customerName,
        phoneNumber: form.customerMobile,
      },
      shipmentData: {
        agency: form.agency,
        receiverName: form.receiverName,
        receiverMobile: form.receiverMobile,
        receiverAddress: form.receiverAddress,
        itemName: form.itemName,
        weight: parseFloat(form.weight) || 0,
        boxCount: parseInt(form.boxCount) || 1,
        shipmentType: form.shipmentType,
        totalCharge: parseFloat(form.totalCharge) || 0,
        status: form.status,
        notes: form.notes,
      },
    };

    try {
      const url = id ? `/api/shipments/${id}` : "/api/shipments";
      const method = id ? "put" : "post";
      await axios[method](url, payload);

      alert(id ? "শিপমেন্ট আপডেট হয়েছে" : "নতুন শিপমেন্ট বুকিং সম্পন্ন হয়েছে");
      navigate("/shipment-list");
    } catch (err) {
      alert(err.response?.data?.error || "সেভ করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shipment-form-container">
      <div className="form-card">
        <h2>{id ? "📝 Edit Shipment" : "📦 New Cargo Booking"}</h2>

        <form onSubmit={handleSubmit}>
          {/* Section 1: Customer (Sender) */}
          <div className="form-section">
            <h3>👤 Sender Information</h3>
            <div className="grid-2">
              <div>
                <label>
                  Sender Mobile (সার্চ করতে নম্বর লিখে বাইরে ক্লিক করুন) *
                </label>
                <input
                  name="customerMobile"
                  placeholder="017XXXXXXXX"
                  value={form.customerMobile}
                  onChange={handleChange}
                  onBlur={(e) => handleCustomerSearch(e.target.value)} // ফোকাস হারালে সার্চ করবে
                  required
                />
              </div>
              <div>
                <label>Sender Name *</label>
                <input
                  name="customerName"
                  placeholder="পুরো নাম লিখুন"
                  value={form.customerName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <label>Booking Branch/Party *</label>
            <select
              name="agency"
              value={form.agency}
              onChange={handleChange}
              required
            >
              <option value="">Select Branch</option>
              {agencies.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section 2: Receiver */}
          <div className="form-section">
            <h3>📍 Receiver Information</h3>
            <div className="grid-2">
              <div>
                <label>Receiver Name *</label>
                <input
                  name="receiverName"
                  value={form.receiverName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label>Receiver Mobile *</label>
                <input
                  name="receiverMobile"
                  value={form.receiverMobile}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <label>Delivery Address</label>
            <textarea
              name="receiverAddress"
              value={form.receiverAddress}
              onChange={handleChange}
            />
          </div>

          {/* Section 3: Cargo Details */}
          <div className="form-section">
            <h3>⚖️ Cargo & Pricing</h3>
            <div className="grid-3">



            <div>
                <label>Item Name</label>
                <input
                  type="text"
                  name="itemName"
                  value={form.itemName}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label>Weight (KG)</label>
                <input
                  type="number"
                  name="weight"
                  className="no-spin"
                  value={form.weight}
                  onChange={handleChange}
                  step="0.01"
                />
              </div>
              <div>
                <label>Total Boxes</label>
                <input
                  type="number"
                  name="boxCount"
                  className="no-spin"
                  value={form.boxCount}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label>Shipment Type</label>
                <select
                  name="shipmentType"
                  value={form.shipmentType}
                  onChange={handleChange}
                >
                  <option value="Air">Air (Fast)</option>
                  <option value="Sea">Sea (Standard)</option>
                  <option value="Road">Road</option>
                </select>
              </div>
            </div>

            <div className="grid-2">
              <div>
                <label>Total Charge (Amount) *</label>
                <input
                  type="number"
                  name="totalCharge"
                  className="total-input"
                  value={form.totalCharge}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label>Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                >
                  <option value="Booked">Booked</option>
                  <option value="In-Transit">In-Transit</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          <button type="submit" className="btn-save" disabled={loading}>
            {loading
              ? "Processing..."
              : id
                ? "Update Shipment"
                : "Confirm Booking"}
          </button>
        </form>
      </div>

      <style>{`
        .shipment-form-container { background: #f0f2f5; padding: 30px; min-height: 100vh; display: flex; justify-content: center; }
        .form-card { background: #fff; padding: 25px; border-radius: 12px; width: 100%; max-width: 800px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .form-section { background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #007bff; }
        h2 { color: #333; margin-bottom: 20px; text-align: center; }
        h3 { font-size: 16px; color: #007bff; margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; }
        label { display: block; margin-top: 10px; font-weight: 600; font-size: 13px; color: #555; }
        input, select, textarea { width: 100%; padding: 10px; margin-top: 5px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; }
        .total-input { border: 2px solid #007bff; font-weight: bold; font-size: 18px; color: #007bff; }
        .btn-save { margin-top: 25px; padding: 15px; width: 100%; background: #007bff; color: #fff; border: none; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: pointer; transition: 0.3s; }
        .btn-save:hover { background: #0056b3; }
        .btn-save:disabled { background: #ccc; }
        .no-spin::-webkit-outer-spin-button, .no-spin::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>
    </div>
  );
}
