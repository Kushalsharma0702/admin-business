// routes/admin-templates.js — task template CRUD + versioning
const express = require("express");
const db = require("../db");
const { fail, ok, paged, formatTemplate, formatTemplateVersion } = require("../helpers");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth("admin"));

// GET /api/admin/templates
router.get("/", async (req, res) => {
  const page     = Math.max(1, Number(req.query.page     || 1));
  const per_page = Math.max(1, Number(req.query.per_page || 20));
  const offset   = (page - 1) * per_page;
  const search   = req.query.search || "";
  const isActive = req.query.isActive !== "false";

  const { rows } = await db.query(
    `SELECT t.*,
       (SELECT MAX(version) FROM task_template_versions WHERE template_id=t.id) AS latest_version
     FROM task_templates t
     WHERE t.is_active=$1 AND (t.name ILIKE $2 OR t.description ILIKE $2)
     ORDER BY t.created_at DESC LIMIT $3 OFFSET $4`,
    [isActive, `%${search}%`, per_page, offset]
  );

  const { rows: cnt } = await db.query(
    "SELECT COUNT(*)::int AS total FROM task_templates WHERE is_active=$1 AND (name ILIKE $2 OR description ILIKE $2)",
    [isActive, `%${search}%`]
  );

  return res.json(paged(rows.map(formatTemplate), "Templates fetched", page, per_page, cnt[0].total));
});

// POST /api/admin/templates
router.post("/", async (req, res) => {
  const { name, description, taskType, category } = req.body;
  if (!name) return res.status(400).json(fail("name is required"));

  const { rows: [row] } = await db.query(
    `INSERT INTO task_templates (name, description, task_type, category, created_by)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [name, description || null, taskType || "form", category || null, req.user.sub]
  );
  return res.status(201).json(ok(formatTemplate(row), "Template created"));
});

// GET /api/admin/templates/:id
router.get("/:id", async (req, res) => {
  const { rows: [template] } = await db.query(
    "SELECT * FROM task_templates WHERE id=$1",
    [req.params.id]
  );
  if (!template) return res.status(404).json(fail("Template not found"));

  const { rows: versions } = await db.query(
    "SELECT id,version,is_published,published_at,created_at FROM task_template_versions WHERE template_id=$1 ORDER BY version DESC",
    [template.id]
  );

  return res.json(ok({
    ...formatTemplate(template),
    versions: versions.map(formatTemplateVersion),
  }, "Template fetched"));
});

// PATCH /api/admin/templates/:id
router.patch("/:id", async (req, res) => {
  const { rows: [existing] } = await db.query("SELECT id FROM task_templates WHERE id=$1", [req.params.id]);
  if (!existing) return res.status(404).json(fail("Template not found"));

  const { name, description, category, isActive } = req.body;
  const sets = ["updated_at=NOW()"]; const vals = []; let i = 1;
  if (name        !== undefined) { sets.push(`name=$${i++}`);        vals.push(name); }
  if (description !== undefined) { sets.push(`description=$${i++}`); vals.push(description); }
  if (category    !== undefined) { sets.push(`category=$${i++}`);    vals.push(category); }
  if (isActive    !== undefined) { sets.push(`is_active=$${i++}`);   vals.push(isActive); }

  vals.push(req.params.id);
  const { rows: [updated] } = await db.query(
    `UPDATE task_templates SET ${sets.join(",")} WHERE id=$${i} RETURNING *`,
    vals
  );
  return res.json(ok(formatTemplate(updated), "Template updated"));
});

// DELETE /api/admin/templates/:id — soft delete
router.delete("/:id", async (req, res) => {
  const { rows: [existing] } = await db.query("SELECT id FROM task_templates WHERE id=$1", [req.params.id]);
  if (!existing) return res.status(404).json(fail("Template not found"));
  await db.query("UPDATE task_templates SET is_active=FALSE, updated_at=NOW() WHERE id=$1", [req.params.id]);
  return res.json(ok({ id: req.params.id }, "Template archived"));
});

// POST /api/admin/templates/:id/versions — create new version
router.post("/:id/versions", async (req, res) => {
  const { rows: [template] } = await db.query("SELECT * FROM task_templates WHERE id=$1", [req.params.id]);
  if (!template) return res.status(404).json(fail("Template not found"));

  const { formSchema } = req.body;
  if (!Array.isArray(formSchema)) return res.status(400).json(fail("formSchema must be an array of fields"));

  // Validate each field has id, type, label
  for (const field of formSchema) {
    if (!field.id || !field.type || !field.label) {
      return res.status(400).json(fail("Each field requires id, type, and label"));
    }
  }

  const VALID_TYPES = ["text","textarea","number","email","phone","date","select","checkbox","radio","file_upload","signature"];
  const invalidType = formSchema.find((f) => !VALID_TYPES.includes(f.type));
  if (invalidType) {
    return res.status(400).json(fail(`Invalid field type: "${invalidType.type}". Allowed: ${VALID_TYPES.join(", ")}`));
  }

  // Get next version number
  const { rows: [vRow] } = await db.query(
    "SELECT COALESCE(MAX(version),0)+1 AS next_version FROM task_template_versions WHERE template_id=$1",
    [template.id]
  );

  const { rows: [version] } = await db.query(
    `INSERT INTO task_template_versions (template_id, version, form_schema, created_by)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [template.id, vRow.next_version, JSON.stringify(formSchema), req.user.sub]
  );

  return res.status(201).json(ok(formatTemplateVersion(version), "Template version created"));
});

// GET /api/admin/templates/:id/versions/:versionId
router.get("/:id/versions/:versionId", async (req, res) => {
  const { rows: [version] } = await db.query(
    "SELECT * FROM task_template_versions WHERE id=$1 AND template_id=$2",
    [req.params.versionId, req.params.id]
  );
  if (!version) return res.status(404).json(fail("Version not found"));
  return res.json(ok(formatTemplateVersion(version), "Version fetched"));
});

// PATCH /api/admin/templates/:id/versions/:versionId — update draft (unpublished only)
router.patch("/:id/versions/:versionId", async (req, res) => {
  const { rows: [version] } = await db.query(
    "SELECT * FROM task_template_versions WHERE id=$1 AND template_id=$2",
    [req.params.versionId, req.params.id]
  );
  if (!version) return res.status(404).json(fail("Version not found"));
  if (version.is_published) return res.status(409).json(fail("Published versions are immutable. Create a new version."));

  const { formSchema } = req.body;
  if (!Array.isArray(formSchema)) return res.status(400).json(fail("formSchema must be an array"));

  const { rows: [updated] } = await db.query(
    "UPDATE task_template_versions SET form_schema=$1 WHERE id=$2 RETURNING *",
    [JSON.stringify(formSchema), version.id]
  );
  return res.json(ok(formatTemplateVersion(updated), "Version updated"));
});

// POST /api/admin/templates/:id/versions/:versionId/publish
router.post("/:id/versions/:versionId/publish", async (req, res) => {
  const { rows: [version] } = await db.query(
    "SELECT * FROM task_template_versions WHERE id=$1 AND template_id=$2",
    [req.params.versionId, req.params.id]
  );
  if (!version) return res.status(404).json(fail("Version not found"));
  if (version.is_published) return res.status(409).json(fail("Already published"));
  if (!version.form_schema || version.form_schema.length === 0) {
    return res.status(400).json(fail("Cannot publish an empty form schema"));
  }

  const { rows: [updated] } = await db.query(
    "UPDATE task_template_versions SET is_published=TRUE, published_at=NOW() WHERE id=$1 RETURNING *",
    [version.id]
  );
  return res.json(ok(formatTemplateVersion(updated), "Version published"));
});

module.exports = router;
