// middleware/auth.js — JWT verification middleware
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "taxease-dev-secret-2026";

function requireAuth(role) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return res.status(401).json({ success: false, message: "Unauthorized — missing token" });
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (role && payload.role !== role) {
        return res.status(403).json({ success: false, message: "Forbidden — insufficient role" });
      }
      req.user = payload;
      next();
    } catch {
      return res.status(401).json({ success: false, message: "Unauthorized — invalid or expired token" });
    }
  };
}

module.exports = { requireAuth, JWT_SECRET };
