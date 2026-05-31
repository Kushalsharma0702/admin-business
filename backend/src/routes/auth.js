// routes/auth.js
const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { fail, ok, verifyPassword } = require("../helpers");
const { JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json(fail("email and password are required"));

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json(fail("Invalid email or password"));
  }

  const token = jwt.sign(
    { sub: user.id, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: "24h" }
  );

  return res.json(ok({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, portalStatus: user.portal_status },
  }, "Login successful"));
});

router.get("/me", (req, res) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim();
  if (!token) return res.status(401).json(fail("Unauthorized"));
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare("SELECT id,email,name,role,portal_status FROM users WHERE id=?").get(payload.sub);
    if (!user) return res.status(404).json(fail("User not found"));
    return res.json(ok({ id: user.id, email: user.email, name: user.name, role: user.role, portalStatus: user.portal_status }));
  } catch {
    return res.status(401).json(fail("Invalid token"));
  }
});

module.exports = router;
