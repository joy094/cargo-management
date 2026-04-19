import express from "express";
import dotenv from "dotenv";
dotenv.config();

import {
  Agency,
  Customer,
  Shipment, // নতুন মডেল
  BankStatement,
  PaymentAllocation,
  // Adjustment,
  GlobalBankStatement,
} from "./models.js";
import { authMiddleware, loginHandler, LOGIN_RATE_LIMIT } from "./auth.js";

const APP_SOURCE = process.env.APP_TYPE || "CARGO";
const router = express.Router();

// Auth Routes
router.post("/auth/login", LOGIN_RATE_LIMIT, loginHandler);
router.use(authMiddleware);

/* =====================================================
   1️⃣ BRANCH / AGENCY CONTROLLERS
===================================================== */

router.post("/agencies", async (req, res) => {
  try {
    const agency = await Agency.create(req.body);
    res.json(agency);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/agencies", async (req, res) => {
  const agencies = await Agency.find();
  const result = await Promise.all(
    agencies.map(async (agency) => {
      const shipments = await Shipment.find({ agency: agency._id });
      const total = shipments.reduce((s, ship) => s + ship.totalCharge, 0);
      const paid = shipments.reduce((s, ship) => s + ship.paidAmount, 0);

      return {
        ...agency.toObject(),
        totalShipments: shipments.length,
        totalAmount: total,
        paidAmount: paid,
        dueAmount: total - paid,
      };
    }),
  );
  res.json(result);
});

/* =====================================================
   এজেন্সি/ব্রাঞ্চ প্রোফাইল দেখার রাউট (এটি যোগ করুন)
===================================================== */
router.get("/agencies/:id", async (req, res) => {
  try {
    // ১. আইডি দিয়ে এজেন্সি বা ব্রাঞ্চ খুঁজবে
    const agency = await Agency.findById(req.params.id);

    if (!agency) {
      return res.status(404).json({ error: "Branch not found" });
    }

    // ২. এই ব্রাঞ্চের অধীনে থাকা সকল শিপমেন্ট বের করবে
    // এখানে Hajji এর বদলে Shipment মডেল ব্যবহার করা হয়েছে
    const shipments = await Shipment.find({ agency: agency._id }).populate(
      "customer",
    );

    res.json({ agency, shipments }); // ফ্রন্টএন্ড এই ফরম্যাটেই ডাটা আশা করছে
  } catch (err) {
    console.error("Single Agency Fetch Error:", err);
    res.status(500).json({ error: "সার্ভার এরর: ডাটা লোড করা যায়নি।" });
  }
});

/* =====================================================
   ১. সিঙ্গেল ব্রাঞ্চ/এজেন্সি ডাটা লোড (GET /api/agencies/:id)
===================================================== */
router.get("/agencies/:id", async (req, res) => {
  try {
    const agency = await Agency.findById(req.params.id);
    if (!agency) return res.status(404).json({ error: "Branch not found" });

    // ওই ব্রাঞ্চের আন্ডারে থাকা সকল শিপমেন্ট
    const shipments = await Shipment.find({ agency: agency._id }).populate(
      "customer",
    );

    res.json({ agency, shipments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   ২. ব্রাঞ্চ লেজার রিপোর্ট (GET /api/reports/agency-ledger/:agencyId)
   (যেটি আপনার স্ক্রিনশটে ফেইল করছে)
===================================================== */
router.get("/reports/agency-ledger/:agencyId", async (req, res) => {
  try {
    const { agencyId } = req.params;

    // ওই ব্রাঞ্চের সকল পেমেন্ট অ্যালোকেশন খুঁজে বের করা
    const allocations = await PaymentAllocation.find({ agency: agencyId })
      .populate("shipment")
      .populate("customer")
      .populate("statement");

    if (!allocations.length) return res.json([]);

    const ledgerMap = {};

    allocations.forEach((a) => {
      const st = a.statement;
      if (!st) return; // স্টেটমেন্ট ডিলিট হয়ে থাকলে স্কিপ করবে

      if (!ledgerMap[st._id]) {
        ledgerMap[st._id] = {
          statementId: st._id,
          paymentType: st.paymentType,
          statementNo: st.statementNo,
          sourceName: st.bankName || st.mobileBank || "CASH",
          receivedDate: st.receivedDate,
          totalAmount: st.totalAmount,
          allocatedAmount: st.allocatedAmount,
          hajjiList: [], // ফ্রন্টএন্ড হাজি লিস্ট নামেই ডাটা আশা করছে (লজিক অনুযায়ী)
        };
      }

      ledgerMap[st._id].hajjiList.push({
        trackingNumber: a.shipment?.trackingNumber,
        name: a.customer?.fullName || "Unknown",
        amount: a.amount,
      });
    });

    res.json(Object.values(ledgerMap));
  } catch (err) {
    console.error("Ledger Error:", err);
    res.status(500).json({ error: "সার্ভার এরর: লেজার ডাটা লোড হয়নি।" });
  }
});
//update agency route
router.put("/agencies/:id", async (req, res) => {
  try {
    const updated = await Agency.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated) return res.status(404).json({ error: "Branch not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//delete agency route
router.delete("/agencies/:id", async (req, res) => {
  try {
    const deleted = await Agency.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Branch not found" });
    // ঐ ব্রাঞ্চের অধীনে থাকা সকল শিপমেন্ট ডিলিট করা হবে
    await Shipment.deleteMany({ agency: req.params.id });
    res.json({ success: true, message: "Branch and its shipments deleted." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   2️⃣ CUSTOMER & SHIPMENT CONTROLLERS (New Feature)
===================================================== */

// Add New Shipment (সাথে কাস্টমার অটো ক্রিয়েট বা লিংক)
// router.post("/shipments", async (req, res) => {
//   try {
//     const { customerData, shipmentData } = req.body;

//     // ১. কাস্টমার চেক বা নতুন তৈরি
//     let customer;
//     if (customerData._id) {
//       customer = await Customer.findById(customerData._id);
//     } else {
//       customer = await Customer.create({
//         ...customerData,
//         agency: shipmentData.agency,
//       });
//     }

//     // ২. ইউনিক ট্র্যাকিং নম্বর জেনারেশন (উদা: CRG-171355)
//     const trackingNumber = `TRK-${Date.now().toString().slice(-6)}`;

//     // ৩. শিপমেন্ট তৈরি
//     const shipment = await Shipment.create({
//       ...shipmentData,
//       customer: customer._id,
//       trackingNumber,
//     });

//     res.json({ success: true, shipment, customer });
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// });

/* =====================================================
   Add New Shipment (Customer Check সহ ফিক্সড লজিক)
===================================================== */
router.post("/shipments", async (req, res) => {
  try {
    const { customerData, shipmentData } = req.body;

    // ১. ফোন নাম্বার দিয়ে কাস্টমার চেক করা (Duplicate Error এড়াতে)
    let customer = await Customer.findOne({
      phoneNumber: customerData.phoneNumber,
    });

    if (!customer) {
      // যদি কাস্টমার না থাকে, তবেই নতুন তৈরি করবে
      customer = await Customer.create({
        ...customerData,
        agency: shipmentData.agency,
      });
      console.log("New customer created");
    } else {
      // যদি কাস্টমার থাকে, তবে তার তথ্য আপডেট করতে চাইলে করতে পারেন (অপশনাল)
      customer.fullName = customerData.fullName;
      customer.agency = shipmentData.agency;
      await customer.save();
      console.log("Existing customer used");
    }

    // ২. ট্র্যাকিং নম্বর জেনারেট করা
    const trackingNumber = `TRK-${Date.now().toString().slice(-6)}`;

    // ৩. শিপমেন্ট তৈরি করা এবং কাস্টমার আইডি লিংক করা
    const shipment = await Shipment.create({
      ...shipmentData,
      customer: customer._id, // আগের বা নতুন কাস্টমার আইডি
      trackingNumber,
    });

    res.json({ success: true, shipment, customer });
  } catch (err) {
    console.error("Shipment Save Error:", err);

    // যদি অন্য কোনো কারণে ডুপ্লিকেট এরর আসে (যেমন ট্র্যাকিং নম্বর)
    if (err.code === 11000) {
      return res.status(400).json({
        error: "এই কাস্টমার বা ট্র্যাকিং নম্বরটি ইতিমধ্যে ডাটাবেজে রয়েছে।",
      });
    }

    res.status(400).json({ error: err.message });
  }
});


//update shipment route
router.put("/shipments/:id", async (req, res) => {
  try {
    const updated = await Shipment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated) return res.status(404).json({ error: "Shipment not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//delete shipment route
router.delete("/shipments/:id", async (req, res) => {
  try {
    const deleted = await Shipment.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Shipment not found" });
    res.json({ success: true, message: "Shipment deleted." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// Get All Shipments
router.get("/shipments", async (req, res) => {
  const list = await Shipment.find().populate("customer").populate("agency");
  res.json(list);
});

/* =====================================================
   3️⃣ PAYMENT ALLOCATION (With Duplicate Filter)
===================================================== */

router.post("/payments/allocate", async (req, res) => {
  try {
    const {
      paymentType,
      statementNo,
      bankName,
      totalAmount,
      allocations, // [{ shipmentId, amount }]
      receivedDate,
    } = req.body;

    // --- ডুপ্লিকেট চেক (Global Lock) ---
    const normalizedStatement = statementNo.trim().toUpperCase();
    const lockExists = await GlobalBankStatement.findOne({
      statementNo: normalizedStatement,
    });

    if (lockExists) {
      return res.status(400).json({
        error: `এই স্টেটমেন্ট নম্বরটি ইতিমধ্যে ${lockExists.appSource} সিস্টেমে ব্যবহার করা হয়েছে।`,
      });
    }

    // --- ব্যাংক স্টেটমেন্ট তৈরি ---
    const statement = await BankStatement.create({
      paymentType,
      statementNo: normalizedStatement,
      bankName: bankName || "CASH",
      totalAmount,
      receivedDate: new Date(receivedDate),
    });

    // --- গ্লোবাল লক সেট করা ---
    await GlobalBankStatement.create({
      statementNo: normalizedStatement,
      paymentType,
      appSource: APP_SOURCE,
      linkedStatement: statement._id,
      totalAmount,
      status: "FINALIZED",
    });

    let totalAllocated = 0;

    // --- অ্যালোকেশন লুপ ---
    for (const item of allocations) {
      const shipment = await Shipment.findById(item.shipmentId);
      if (!shipment) continue;

      const amount = parseFloat(item.amount);

      await PaymentAllocation.create({
        statement: statement._id,
        shipment: shipment._id, // কারগোতে শিপমেন্ট আইডি দরকার
        customer: shipment.customer,
        agency: shipment.agency,
        amount,
        paymentDate: new Date(receivedDate),
      });

      // শিপমেন্টে পেইড অ্যামাউন্ট আপডেট
      shipment.paidAmount += amount;
      await shipment.save();
      totalAllocated += amount;
    }

    statement.allocatedAmount = totalAllocated;
    statement.isFinalized = true;
    await statement.save();

    res.json({ success: true, message: "পেমেন্ট সফলভাবে এন্ট্রি করা হয়েছে।" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   4️⃣ REPORTS (Cargo Focused)
===================================================== */

// Shipment Ledger (আগে ছিল Hajji Ledger)
router.get("/reports/shipment-ledger/:id", async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id)
      .populate("customer")
      .populate("agency");

    if (!shipment)
      return res.status(404).json({ error: "শিপমেন্ট পাওয়া যায়নি।" });

    const payments = await PaymentAllocation.find({
      shipment: shipment._id,
    }).populate("statement");

    res.json({ shipment, payments });
  } catch (err) {
    res.status(500).json({ error: "ডাটা লোড করতে সমস্যা হয়েছে।" });
  }
});

/* =====================================================
   5️⃣ DELETE & ROLLBACK (Strict Logic)
===================================================== */

router.delete("/statements/:id", async (req, res) => {
  try {
    const statement = await BankStatement.findById(req.params.id);
    if (!statement) return res.status(404).json({ error: "স্টেটমেন্ট নেই।" });

    const allocations = await PaymentAllocation.find({
      statement: statement._id,
    });

    // শিপমেন্ট পেমেন্ট রোলব্যাক
    for (const alloc of allocations) {
      await Shipment.findByIdAndUpdate(alloc.shipment, {
        $inc: { paidAmount: -alloc.amount },
      });
    }

    await PaymentAllocation.deleteMany({ statement: statement._id });
    await GlobalBankStatement.findOneAndDelete({
      statementNo: statement.statementNo,
    });
    await BankStatement.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "স্টেটমেন্ট এবং পেমেন্ট রোলব্যাক করা হয়েছে।",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
