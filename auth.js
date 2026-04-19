// auth.js - updated with rate-limit & brute-force protection

import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import { User } from "./models.js";

const LOCK_MINUTES = parseInt(process.env.ACCOUNT_LOCK_MINUTES || "15", 10);

// -----------------------------
// Login Rate Limiter
// -----------------------------
export const LOGIN_RATE_LIMIT = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 8, // max 8 attempts per IP per minute
  message: { error: "Too many login attempts from this IP, try again later." },
});

// -----------------------------
// Auth Middleware
// -----------------------------
export async function authMiddleware(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer "))
      return res.status(401).json({ error: "Authorization required" });

    const token = auth.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ error: "Invalid token" });

    req.user = { id: user._id, username: user.username, role: user.role };

    // Only admin can access protected routes
    if (user.role !== "admin")
      return res.status(403).json({ error: "Admin role required" });

    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// -----------------------------
// Seed Admin from ENV
// -----------------------------
export async function seedAdmin() {
  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;
  if (!adminUser || !adminPass) return;

  const exists = await User.findOne({ username: adminUser.toLowerCase() });
  if (exists) {
    console.log("ℹ️ Admin user already exists, skipping seed");
    return;
  }

  const hash = await bcrypt.hash(adminPass, 12);
  await User.create({
    username: adminUser.toLowerCase(),
    passwordHash: hash,
    role: "admin",
  });
  console.log("✅ Admin user seeded from env");
}

// -----------------------------
// Login Handler
// -----------------------------
export async function loginHandler(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: "Username & password required" });

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res
        .status(423)
        .json({
          error: `Account locked. Try again after ${Math.ceil(
            (user.lockUntil - Date.now()) / 60000
          )} min.`,
        });
    }

    const match = await bcrypt.compare(password, user.passwordHash);

    if (!match) {
      // Wrong password
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 3) {
        user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      }
      await user.save();
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Successful login
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "8h" }
    );

    res.json({ token, user: { username: user.username, role: user.role } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
}
