const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "change-this-demo-secret";

function sign(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

function requireAuth(role) {
  return (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Authentication required" });
    try {
      const user = jwt.verify(token, JWT_SECRET);
      if (role && user.role !== role) return res.status(403).json({ error: "Not allowed" });
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}

module.exports = { sign, requireAuth };
