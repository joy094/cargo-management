import React, { useEffect, useState, useRef } from "react";
import axios from "axios";

export default function PaymentAllocation() {
  const [paymentType, setPaymentType] = useState("");
  const [statementNo, setStatementNo] = useState("");
  const [bankName, setBankName] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [mobileBank, setMobileBank] = useState("");
  const [receiptNo, setReceiptNo] = useState("");
  const [amount, setAmount] = useState("");
  const [shipmentList, setShipmentList] = useState([]); // Hajji -> Shipment
  const [allocations, setAllocations] = useState([]);
  const [selectedShipments, setSelectedShipments] = useState([]);
  const [receivedDate, setReceivedDate] = useState("");

  const [agencyList, setAgencyList] = useState([]);
  const [selectedAgency, setSelectedAgency] = useState("");

  // App source updated for Cargo
  const APP_SOURCE = "CARGO";

  const errorAudioRef = useRef(null);

  // ১. রেফারেন্স নম্বর নরমালাইজ করা (ডুপ্লিকেট ফিল্টারের জন্য জরুরি)
  const normalizeRef = (value = "") => {
    return value
      .toString()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .trim();
  };

  // ২. শিপমেন্ট লিস্ট লোড করা (বকেয়া থাকা শিপমেন্টগুলো আগে দেখাবে)
  useEffect(() => {
    axios
      .get("/api/shipments")
      .then((res) => {
        setShipmentList(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => console.error("Error fetching Shipment list:", err));
  }, []);

  // ৩. ব্রাঞ্চ/এজেন্সি লিস্ট লোড করা
  useEffect(() => {
    axios
      .get("/api/agencies")
      .then((res) => {
        setAgencyList(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => console.error("Error fetching agencies:", err));
  }, []);

  // ৪. শিপমেন্ট সিলেকশন হ্যান্ডলার
  const handleShipmentSelect = (shipmentId) => {
    setSelectedShipments((prev) =>
      prev.includes(shipmentId)
        ? prev.filter((id) => id !== shipmentId)
        : [...prev, shipmentId],
    );
    setAllocations((prev) => {
      if (!prev.find((a) => a.shipmentId === shipmentId)) {
        return [...prev, { shipmentId, amount: "" }];
      }
      return prev;
    });
  };

  // ৫. ইন্ডিভিজুয়াল পেমেন্ট ইনপুট হ্যান্ডলার
  const handleAmountChange = (shipmentId, value) => {
    setAllocations((prev) =>
      prev.map((a) =>
        a.shipmentId === shipmentId
          ? { ...a, amount: value === "" ? "" : parseFloat(value) || 0 }
          : a,
      ),
    );
  };

  // ৬. সাবমিট লজিক (ডুপ্লিকেট চেক সহ)
  const handleSubmit = async () => {
    if (!paymentType || !receivedDate || !amount) {
      alert("Please fill all basic payment info!");
      return;
    }

    if (selectedShipments.length === 0) {
      alert("Select at least one Shipment to allocate money");
      return;
    }

    const totalAllocated = allocations
      .filter((a) => selectedShipments.includes(a.shipmentId))
      .reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);

    if (totalAllocated !== parseFloat(amount)) {
      alert(
        `Error: Allocated sum (৳${totalAllocated}) doesn't match Total Amount (৳${amount})`,
      );
      return;
    }

    const payload = {
      paymentType,
      receivedDate,
      totalAmount: Number(amount),
      appSource: APP_SOURCE,
      allocations: allocations
        .filter((a) => selectedShipments.includes(a.shipmentId))
        .map((a) => ({
          shipmentId: a.shipmentId,
          amount: Number(a.amount),
        })),
    };

    // পেমেন্ট মেথড অনুযায়ী স্টেটমেন্ট নম্বর সেট করা
    if (paymentType === "bank") {
      if (!statementNo || !bankName) return alert("Bank details required");
      payload.statementNo = normalizeRef(statementNo);
      payload.bankName = bankName;
    } else if (paymentType === "mobile") {
      if (!transactionId || !mobileBank)
        return alert("Mobile banking details required");
      payload.statementNo = normalizeRef(transactionId);
      payload.mobileBank = mobileBank;
    } else {
      if (!receiptNo) return alert("Receipt Number required");
      payload.statementNo = normalizeRef(receiptNo);
    }

    try {
      const res = await axios.post("/api/payments/allocate", payload);
      alert(res.data.message || "Payment allocated successfully!");
      window.location.reload(); // ফর্ম রিসেট করার সহজ উপায়
    } catch (err) {
      const msg = err.response?.data?.error || "Error in allocation";
      if (msg.includes("already used") || msg.includes("exists")) {
        errorAudioRef.current?.play(); // ডুপ্লিকেট হলে এলার্ম বাজবে
      }
      alert(msg);
    }
  };

  const filteredShipments = selectedAgency
    ? shipmentList.filter((s) => s.agency?._id === selectedAgency)
    : shipmentList;

  return (
    <div className="payment-allocation">
      <div className="header-flex">
        <h2>💳 Payment Allocation (Cargo)</h2>
        <span className="source-tag">{APP_SOURCE} SYSTEM</span>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label>Payment Method:</label>
          <select
            value={paymentType}
            onChange={(e) => setPaymentType(e.target.value)}
          >
            <option value="">-- Choose --</option>
            <option value="bank">🏦 Bank Transfer</option>
            <option value="mobile">📱 Mobile Banking (Bkash/Nagad)</option>
            <option value="cash">💵 Cash / Receipt</option>
          </select>
        </div>

        <div className="form-group">
          <label>Received Date:</label>
          <input
            type="date"
            value={receivedDate}
            onChange={(e) => setReceivedDate(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
          />
        </div>

        <div className="form-group">
          <label>Total Amount to Allocate:</label>
          <input
            type="number"
            className="total-amt-input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="৳ 0.00"
          />
        </div>
      </div>

      {/* Dynamic Fields Based on Payment Type */}
      <div className="dynamic-fields">
        {paymentType === "bank" && (
          <div className="grid-2">
            <input
              placeholder="Statement / Check No"
              value={statementNo}
              onChange={(e) => setStatementNo(e.target.value)}
            />
            <input
              placeholder="Bank Name"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
            />
          </div>
        )}
        {paymentType === "mobile" && (
          <div className="grid-2">
            <input
              placeholder="Transaction ID (TrxID)"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
            />
            <input
              placeholder="Mobile Bank (e.g. Bkash)"
              value={mobileBank}
              onChange={(e) => setMobileBank(e.target.value)}
            />
          </div>
        )}
        {paymentType === "cash" && (
          <input
            placeholder="Voucher / Receipt Number"
            value={receiptNo}
            onChange={(e) => setReceiptNo(e.target.value)}
          />
        )}
      </div>

      <hr />

      <div className="shipment-selection-area">
        <h3>📦 Select Shipments for Allocation</h3>
        <div className="filter-row">
          <select
            value={selectedAgency}
            onChange={(e) => setSelectedAgency(e.target.value)}
          >
            <option value="">All Branches / Agencies</option>
            {agencyList.map((a) => (
              <option key={a._id} value={a._id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="table-wrapper">
          <table className="cargo-table">
            <thead>
              <tr>
                <th>Select</th>
                <th>Tracking No</th>
                <th>Sender / Customer</th>
                <th>Branch</th>
                <th>Charge</th>
                <th>Due</th>
                <th>Allocate</th>
              </tr>
            </thead>
            <tbody>
              {filteredShipments.map((s) => {
                const due = s.totalCharge - s.paidAmount;
                return (
                  <tr
                    key={s._id}
                    className={
                      selectedShipments.includes(s._id) ? "selected-row" : ""
                    }
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedShipments.includes(s._id)}
                        onChange={() => handleShipmentSelect(s._id)}
                      />
                    </td>
                    <td className="trk-no">{s.trackingNumber}</td>
                    <td>{s.customer?.fullName}</td>
                    <td>{s.agency?.name}</td>
                    <td>৳ {s.totalCharge}</td>
                    <td className="due-text">৳ {due}</td>
                    <td>
                      <input
                        type="number"
                        className="cell-input"
                        placeholder="0"
                        disabled={!selectedShipments.includes(s._id)}
                        value={
                          allocations.find((a) => a.shipmentId === s._id)
                            ?.amount || ""
                        }
                        onChange={(e) =>
                          handleAmountChange(s._id, e.target.value)
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <button className="submit-btn" onClick={handleSubmit}>
        ✅ Finalize Allocation
      </button>
      <audio ref={errorAudioRef} src="/sounds/error.mp3" preload="auto" />

      <style>{`
        .payment-allocation { max-width: 1000px; margin: auto; padding: 25px; background: #fff; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .header-flex { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 20px; }
        .source-tag { background: #6c5ce7; color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        
        .form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .form-group label { display: block; margin-bottom: 8px; font-weight: bold; color: #444; }
        input, select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
        
        .total-amt-input { border: 2px solid #6c5ce7; font-size: 18px; font-weight: bold; color: #6c5ce7; }
        .dynamic-fields { margin: 20px 0; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }

        .table-wrapper { max-height: 400px; overflow-y: auto; margin-top: 15px; border: 1px solid #eee; border-radius: 10px; }
        .cargo-table { width: 100%; border-collapse: collapse; }
        .cargo-table th { background: #f8f9fa; position: sticky; top: 0; padding: 12px; text-align: left; font-size: 13px; }
        .cargo-table td { padding: 12px; border-bottom: 1px solid #f1f1f1; font-size: 14px; }
        
        .selected-row { background: #f0f7ff; }
        .trk-no { font-weight: bold; color: #0d6efd; }
        .due-text { color: #e74c3c; font-weight: bold; }
        .cell-input { width: 100px; border: 1px solid #6c5ce7; }

        .submit-btn { width: 100%; padding: 15px; margin-top: 25px; background: linear-gradient(135deg, #6c5ce7, #a29bfe); color: #fff; border: none; border-radius: 10px; font-size: 18px; font-weight: bold; cursor: pointer; transition: 0.3s; }
        .submit-btn:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(108, 92, 231, 0.3); }
      `}</style>
    </div>
  );
}
