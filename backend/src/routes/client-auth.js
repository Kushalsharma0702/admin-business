// routes/client-auth.js — Flutter client auth endpoints (accept Python JWTs)
const express = require("express");
const db      = require("../db");
const { ok }  = require("../helpers");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth("client"));

// GET /v3/api/v1/auth/customer-type
// Resolves the customer_type from the main Flutter RDS for the token's user.
// Flutter calls this after login because the Python backend never returns customer_type.
router.get("/customer-type", async (req, res) => {
  if (!db.mainQuery) {
    return res.json(ok({ customerType: null }, "Main DB not configured"));
  }
  try {
    const { rows } = await db.mainQuery(
      "SELECT customer_type FROM users WHERE id=$1",
      [req.user.sub]
    );
    return res.json(ok({ customerType: rows[0]?.customer_type ?? null }, "OK"));
  } catch (err) {
    console.error("customer-type lookup failed:", err.message);
    return res.json(ok({ customerType: null }, "Could not resolve customer type"));
  }
});

module.exports = router;
