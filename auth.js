const express = require("express");
const bcrypt = require("bcryptjs");
const { transact } = require("./db");
const { sign } = require("./auth-helper");

const router = express.Router();
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(process.env.ADMIN_PASSWORD || "admin123", 8);

router.post("/admin/login", (req, res) => {
  const { username, password } = req.body || {};
  if (username !== ADMIN_USER || !bcrypt.compareSync(password || "", ADMIN_PASSWORD_HASH)) return res.status(401).json({ error: "Wrong username or password" });
  res.json({ token: sign({ role: "admin", username }), role: "admin" });
});

router.post("/client/setup", async (req, res) => {
  const { businessId, passcode, password } = req.body || {};
  if (!businessId || !passcode || !password) return res.status(400).json({ error: "Business ID, setup passcode and new password are required" });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  const result = await transact((data) => {
    const biz = data.businesses.find((b) => b.id === businessId);
    if (!biz) return { error: "Business not found" };
    if (biz.passwordHash) return { error: "Password is already set. Please log in." };
    if (!bcrypt.compareSync(passcode, biz.passcodeHash)) return { error: "Wrong setup passcode" };
    biz.passwordHash = bcrypt.hashSync(password, 10);
    biz.passwordSetAt = new Date().toISOString();
    return { ok: true, biz };
  });
  if (result.error) return res.status(400).json({ error: result.error });
  res.json({ token: sign({ role: "client", businessId: result.biz.id }), role: "client", business: publicBiz(result.biz) });
});

router.post("/client/login", async (req, res) => {
  const { businessId, password } = req.body || {};
  const result = await transact((data) => {
    const biz = data.businesses.find((b) => b.id === businessId);
    if (!biz) return { error: "Business not found" };
    if (!biz.passwordHash) return { error: "Set your password first using your setup passcode" };
    if (!bcrypt.compareSync(password || "", biz.passwordHash)) return { error: "Wrong password" };
    return { ok: true, biz };
  });
  if (result.error) return res.status(401).json({ error: result.error });
  res.json({ token: sign({ role: "client", businessId: result.biz.id }), role: "client", business: publicBiz(result.biz) });
});

function publicBiz(b) { const { passcodeHash, passwordHash, ...rest } = b; return rest; }
module.exports = router;
