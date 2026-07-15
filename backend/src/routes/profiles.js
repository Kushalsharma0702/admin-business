// routes/profiles.js — User profile management for multi-profile support
const express = require("express");
const db      = require("../db");
const { fail, ok } = require("../helpers");
const { requireAuth } = require("../middleware/auth");

// ── Admin Router ──────────────────────────────────────────────────────────────
const adminRouter = express.Router();
adminRouter.use(requireAuth("admin"));

// GET /api/admin/clients/:clientId/profiles
adminRouter.get("/clients/:clientId/profiles", async (req, res) => {
  const { rows: [client] } = await db.query(
    "SELECT id, name, email FROM users WHERE (id::text=$1 OR slug=$1) AND role='client'",
    [req.params.clientId]
  );
  if (!client) return res.status(404).json(fail("Client not found"));

  const { rows } = await db.query(
    "SELECT * FROM user_profiles WHERE user_id=$1 ORDER BY is_default DESC, created_at ASC",
    [client.id]
  );
  return res.json(ok(rows.map(formatProfile), "Profiles fetched"));
});

// POST /api/admin/clients/:clientId/profiles
adminRouter.post("/clients/:clientId/profiles", async (req, res) => {
  const { rows: [client] } = await db.query(
    "SELECT id FROM users WHERE (id::text=$1 OR slug=$1) AND role='client'",
    [req.params.clientId]
  );
  if (!client) return res.status(404).json(fail("Client not found"));

  const { profileName, businessName, profileType = "business", isDefault = false } = req.body;
  if (!profileName) return res.status(400).json(fail("profileName is required"));

  if (isDefault) {
    await db.query("UPDATE user_profiles SET is_default=FALSE WHERE user_id=$1", [client.id]);
  }

  const { rows: [profile] } = await db.query(
    `INSERT INTO user_profiles (user_id, profile_type, profile_name, business_name, is_default)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [client.id, profileType, profileName, businessName || null, isDefault]
  );
  return res.status(201).json(ok(formatProfile(profile), "Profile created"));
});

// PATCH /api/admin/profiles/:profileId
adminRouter.patch("/profiles/:profileId", async (req, res) => {
  const { rows: [profile] } = await db.query(
    "SELECT * FROM user_profiles WHERE id=$1",
    [req.params.profileId]
  );
  if (!profile) return res.status(404).json(fail("Profile not found"));

  const { profileName, businessName, isDefault, metadata } = req.body;

  if (isDefault) {
    await db.query("UPDATE user_profiles SET is_default=FALSE WHERE user_id=$1", [profile.user_id]);
  }

  const sets = ["updated_at=NOW()"]; const vals = []; let i = 1;
  if (profileName  !== undefined) { sets.push(`profile_name=$${i++}`);  vals.push(profileName); }
  if (businessName !== undefined) { sets.push(`business_name=$${i++}`); vals.push(businessName); }
  if (isDefault    !== undefined) { sets.push(`is_default=$${i++}`);    vals.push(isDefault); }
  if (metadata     !== undefined) { sets.push(`metadata=$${i++}`);      vals.push(JSON.stringify(metadata)); }
  vals.push(req.params.profileId);

  const { rows: [updated] } = await db.query(
    `UPDATE user_profiles SET ${sets.join(",")} WHERE id=$${i} RETURNING *`,
    vals
  );
  return res.json(ok(formatProfile(updated), "Profile updated"));
});

// DELETE /api/admin/profiles/:profileId
adminRouter.delete("/profiles/:profileId", async (req, res) => {
  const { rows: [profile] } = await db.query(
    "SELECT * FROM user_profiles WHERE id=$1",
    [req.params.profileId]
  );
  if (!profile) return res.status(404).json(fail("Profile not found"));

  const { rows: others } = await db.query(
    "SELECT COUNT(*)::int AS cnt FROM user_profiles WHERE user_id=$1",
    [profile.user_id]
  );
  if (others[0].cnt <= 1) return res.status(400).json(fail("Cannot delete the only profile"));

  await db.query("DELETE FROM user_profiles WHERE id=$1", [profile.id]);
  return res.json(ok({ id: profile.id }, "Profile deleted"));
});

// ── Client Router ─────────────────────────────────────────────────────────────
const clientRouter = express.Router();
clientRouter.use(requireAuth("client"));

// GET /v3/api/v1/profiles — list my profiles
clientRouter.get("/", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM user_profiles WHERE user_id=$1 ORDER BY is_default DESC, created_at ASC",
      [req.user.sub]
    );

    // Auto-create default profile if none exist (e.g. legacy users)
    if (rows.length === 0) {
      const { rows: [user] } = await db.query(
        "SELECT id, name FROM users WHERE id=$1",
        [req.user.sub]
      );
      if (!user) {
        // User exists in Flutter DB but not in taxease_admin — UUID mismatch.
        // This happens when a client is deleted and re-invited without re-accepting the invite.
        return res.status(404).json(fail("Account not found. Please use the latest invite link to set up your account."));
      }
      const { rows: [newProfile] } = await db.query(
        `INSERT INTO user_profiles (user_id, profile_type, profile_name, is_default)
         VALUES ($1,'business',$2,TRUE)
         RETURNING *`,
        [req.user.sub, user.name || "Business"]
      );
      return res.json(ok([formatProfile(newProfile)], "Profiles fetched"));
    }

    return res.json(ok(rows.map(formatProfile), "Profiles fetched"));
  } catch (err) {
    console.error("GET /profiles error:", err.message);
    return res.status(500).json(fail("Could not load profiles. Please try again."));
  }
});

// PATCH /v3/api/v1/profiles/:profileId/select — set active profile
clientRouter.patch("/:profileId/select", async (req, res) => {
  const { rows: [profile] } = await db.query(
    "SELECT * FROM user_profiles WHERE id=$1 AND user_id=$2",
    [req.params.profileId, req.user.sub]
  );
  if (!profile) return res.status(404).json(fail("Profile not found"));

  // Mark selected profile as default
  await db.query("UPDATE user_profiles SET is_default=FALSE WHERE user_id=$1", [req.user.sub]);
  await db.query("UPDATE user_profiles SET is_default=TRUE WHERE id=$1", [profile.id]);

  return res.json(ok(formatProfile({ ...profile, is_default: true }), "Profile selected"));
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatProfile(r) {
  return {
    id:           r.id,
    userId:       r.user_id,
    profileType:  r.profile_type,
    profileName:  r.profile_name,
    businessName: r.business_name,
    isDefault:    r.is_default,
    metadata:     r.metadata,
    createdAt:    r.created_at,
    updatedAt:    r.updated_at,
  };
}

module.exports = { adminRouter, clientRouter };
