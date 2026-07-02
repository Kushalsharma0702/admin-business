// middleware/auth.js — JWT verification + role-based guard (async for pg)
const jwt = require("jsonwebtoken");
const env = require("../config/env");

const JWT_SECRET = env.JWT_SECRET;

function requireAuth(role) {
  return async (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.replace("Bearer ", "").trim();
    if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });

    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (role && payload.role !== role) {
        return res.status(403).json({ success: false, message: "Forbidden: insufficient role" });
      }
      req.user = payload;
      return next();
    } catch {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
  };
}

module.exports = { requireAuth, JWT_SECRET };
