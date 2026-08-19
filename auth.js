const express = require("express");
const bcrypt = require("bcryptjs");
const { transact } = require("./db");
const { sign } = require("./auth-helper");

const router = express.Router();

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(process.env.ADMIN_PASSWORD || "admin123", 8);

router.post("/admin/login", (req, res) => {
  const { username, password } = req.body || {};
  if (username !== ADMIN_USER || !bcrypt.compareSync(password || "", ADMIN_PASSWORD_HASH)) {
    return res.status(401).json({ error: "Wrong username or password" });
  }
  const token = sign({ role: "admin", username });
  res.json({ token, role: "admin" });
});

router.post("/client/login", async (req, res) => {
  const { businessId, passcode } = req.body || {};
  const result = await transact((data) => {
    const biz = data.businesses.find((b) => b.id === businessId);
    if (!biz) return { error: "Business not found" };
    if (!bcrypt.compareSync(passcode || "", biz.passcodeHash)) {
      return { error: "Wrong passcode" };
    }
    return { ok: true, biz };
  });
  if (result.error) return res.status(401).json({ error: result.error });
  const token = sign({ role: "client", businessId: result.biz.id });
  res.json({ token, role: "client", business: publicBiz(result.biz) });
});

function publicBiz(b) {
  const { passcodeHash, ...rest } = b;
  return rest;
}

module.exports = router;
