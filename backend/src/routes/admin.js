// routes/admin.js — admin-only routes
const express = require("express");
const db = require("../db");
const { fail, ok, paged, formatTask, nowIso, hashPassword } = require("../helpers");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth("admin"));

const ADMIN_STATUSES = [
  "On Hold","Not to Do","Data not received","Partial Data received",
  "Data Missing Closed","Work in Progress","Query sent to Support team",
  "Query sent to client","Partial Query received","Review",
  "Sent for Approval to support team","Sent for Approval to client",
  "Approval received","Filed",
];

// GET /api/admin/meta/admin-statuses
router.get("/meta/admin-statuses", (_, res) => res.json(ok(ADMIN_STATUSES, "Admin statuses fetched")));

// ── Dashboard ──────────────────────────────────────────────────────────────────
router.get("/dashboard", (_, res) => {
  const totalClients = db.prepare("SELECT COUNT(*) as n FROM users WHERE role='client'").get().n;
  const totalTasks   = db.prepare("SELECT COUNT(*) as n FROM tasks").get().n;
  const pendingTasks = db.prepare("SELECT COUNT(*) as n FROM tasks WHERE status='pending'").get().n;
  const completedTasks = db.prepare("SELECT COUNT(*) as n FROM tasks WHERE status='complete'").get().n;
  const statusBreakdown = db.prepare("SELECT admin_status, COUNT(*) as count FROM tasks GROUP BY admin_status ORDER BY count DESC").all();
  return res.json(ok({ totalClients, totalTasks, pendingTasks, completedTasks, statusBreakdown }, "Dashboard data fetched"));
});

// ── Clients ────────────────────────────────────────────────────────────────────
router.get("/clients", (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const per_page = Math.max(1, Number(req.query.per_page || 20));
  const search = req.query.search || "";
  const like = `%${search}%`;
  const offset = (page - 1) * per_page;
  const rows = db.prepare("SELECT id,email,name,phone,occupation,client_since,portal_status,created_at FROM users WHERE role='client' AND (name LIKE ? OR email LIKE ?) ORDER BY name ASC LIMIT ? OFFSET ?").all(like,like,per_page,offset);
  const { total } = db.prepare("SELECT COUNT(*) as total FROM users WHERE role='client' AND (name LIKE ? OR email LIKE ?)").get(like,like);
  return res.json(paged(rows.map(r=>({id:r.id,email:r.email,name:r.name,phone:r.phone,occupation:r.occupation,clientSince:r.client_since,portalStatus:r.portal_status,createdAt:r.created_at})), "Clients fetched", page, per_page, total));
});

router.get("/clients/:clientId", (req, res) => {
  const row = db.prepare("SELECT id,email,name,phone,ssn,dob,occupation,client_since,portal_status,created_at FROM users WHERE id=? AND role='client'").get(req.params.clientId);
  if (!row) return res.status(404).json(fail("Client not found"));
  return res.json(ok({ id:row.id,email:row.email,name:row.name,phone:row.phone,ssn:row.ssn,dob:row.dob,occupation:row.occupation,clientSince:row.client_since,portalStatus:row.portal_status,createdAt:row.created_at },"Client fetched"));
});

router.post("/clients", (req, res) => {
  const b = req.body;
  if (!b.email || !b.name) return res.status(400).json(fail("email and name are required"));
  if (db.prepare("SELECT id FROM users WHERE email=?").get(b.email)) return res.status(409).json(fail("Email already in use"));
  const id = `client-${Date.now()}`;
  const now = nowIso();
  db.prepare("INSERT INTO users (id,email,password_hash,name,role,phone,ssn,dob,occupation,client_since,portal_status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
    .run(id,b.email,hashPassword(b.password||"client123"),b.name,"client",b.phone||null,b.ssn||null,b.dob||null,b.occupation||null,now.split("T")[0],"active",now,now);
  const row = db.prepare("SELECT id,email,name,phone,portal_status,created_at FROM users WHERE id=?").get(id);
  return res.status(201).json(ok({id:row.id,email:row.email,name:row.name,phone:row.phone,portalStatus:row.portal_status,createdAt:row.created_at,temporaryPassword:b.password||"client123"},"Client created"));
});

router.patch("/clients/:clientId", (req, res) => {
  if (!db.prepare("SELECT id FROM users WHERE id=? AND role='client'").get(req.params.clientId)) return res.status(404).json(fail("Client not found"));
  const b = req.body;
  const now = nowIso();
  const map = { name:"name",phone:"phone",occupation:"occupation",ssn:"ssn",dob:"dob",portalStatus:"portal_status" };
  const sets=["updated_at=?"]; const vals=[now];
  for(const[k,v]of Object.entries(map)){if(k in b){sets.push(`${v}=?`);vals.push(b[k]);}}
  vals.push(req.params.clientId);
  db.prepare(`UPDATE users SET ${sets.join(",")} WHERE id=?`).run(...vals);
  return res.json(ok({ id:req.params.clientId,updatedAt:now },"Client updated"));
});

router.delete("/clients/:clientId", (req, res) => {
  if (!db.prepare("SELECT id FROM users WHERE id=? AND role='client'").get(req.params.clientId)) return res.status(404).json(fail("Client not found"));
  db.prepare("DELETE FROM users WHERE id=?").run(req.params.clientId);
  return res.json(ok({ id:req.params.clientId,deletedAt:nowIso() },"Client deleted"));
});

// ── Tasks — Admin management ───────────────────────────────────────────────────
router.get("/tasks", (req, res) => {
  const { clientId, adminStatus, status, page:p=1, per_page:pp=20 } = req.query;
  const page = Math.max(1,Number(p)); const per_page = Math.max(1,Number(pp));
  const offset = (page-1)*per_page;
  const conds=[]; const args=[];
  if(clientId){conds.push("t.client_id=?");args.push(clientId);}
  if(adminStatus){conds.push("t.admin_status=?");args.push(adminStatus);}
  if(status){conds.push("t.status=?");args.push(status);}
  const where = conds.length ? "WHERE "+conds.join(" AND "):"";
  const rows = db.prepare(`SELECT t.*,u.name as client_name,u.email as client_email FROM tasks t JOIN users u ON t.client_id=u.id ${where} ORDER BY t.created_at DESC LIMIT ? OFFSET ?`).all(...args,per_page,offset);
  const { total } = db.prepare(`SELECT COUNT(*) as total FROM tasks t ${where}`).get(...args);
  return res.json(paged(rows.map(r=>({...formatTask(r),clientName:r.client_name,clientEmail:r.client_email})),"Tasks fetched",page,per_page,total));
});

router.get("/clients/:clientId/tasks", (req, res) => {
  const rows = db.prepare("SELECT * FROM tasks WHERE client_id=? ORDER BY created_at DESC").all(req.params.clientId);
  return res.json(ok(rows.map(formatTask),"Client tasks fetched"));
});

router.post("/clients/:clientId/tasks", (req, res) => {
  const adminId = req.user.sub;
  if (!db.prepare("SELECT id FROM users WHERE id=? AND role='client'").get(req.params.clientId)) return res.status(404).json(fail("Client not found"));
  const b = req.body;
  if (!b.title) return res.status(400).json(fail("title is required"));
  const adminStatus = b.adminStatus || "Data not received";
  if (!ADMIN_STATUSES.includes(adminStatus)) return res.status(400).json(fail(`Invalid adminStatus. Allowed: ${ADMIN_STATUSES.join(", ")}`));
  const id = `task-${req.params.clientId.slice(0,8)}-${Date.now()}`;
  const now = nowIso();
  db.prepare("INSERT INTO tasks (id,client_id,assigned_by,title,description,status,admin_status,task_type,metadata,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)")
    .run(id,req.params.clientId,adminId,b.title,b.description||null,"pending",adminStatus,b.taskType||"info",JSON.stringify(b.metadata||{}),now,now);
  return res.status(201).json(ok(formatTask(db.prepare("SELECT * FROM tasks WHERE id=?").get(id)),"Task assigned to client"));
});

router.patch("/tasks/:taskId", (req, res) => {
  if (!db.prepare("SELECT id FROM tasks WHERE id=?").get(req.params.taskId)) return res.status(404).json(fail("Task not found"));
  const b = req.body;
  if (b.adminStatus && !ADMIN_STATUSES.includes(b.adminStatus)) return res.status(400).json(fail(`Invalid adminStatus. Allowed: ${ADMIN_STATUSES.join(", ")}`));
  const now = nowIso();
  const sets=["updated_at=?"]; const vals=[now];
  if("adminStatus" in b){sets.push("admin_status=?");vals.push(b.adminStatus);}
  if("title" in b){sets.push("title=?");vals.push(b.title);}
  if("description" in b){sets.push("description=?");vals.push(b.description);}
  if("metadata" in b){sets.push("metadata=?");vals.push(JSON.stringify(b.metadata));}
  if("status" in b){sets.push("status=?");vals.push(b.status);}
  vals.push(req.params.taskId);
  db.prepare(`UPDATE tasks SET ${sets.join(",")} WHERE id=?`).run(...vals);
  return res.json(ok(formatTask(db.prepare("SELECT * FROM tasks WHERE id=?").get(req.params.taskId)),"Task updated"));
});

router.delete("/tasks/:taskId", (req, res) => {
  if (!db.prepare("SELECT id FROM tasks WHERE id=?").get(req.params.taskId)) return res.status(404).json(fail("Task not found"));
  db.prepare("DELETE FROM tasks WHERE id=?").run(req.params.taskId);
  return res.json(ok({ id:req.params.taskId,deletedAt:nowIso() },"Task deleted"));
});

// POST /api/admin/tasks/:taskId/query-sheet — set Excel rows for a sheet_remarks task
router.post("/tasks/:taskId/query-sheet", (req, res) => {
  const task = db.prepare("SELECT * FROM tasks WHERE id=?").get(req.params.taskId);
  if (!task) return res.status(404).json(fail("Task not found"));
  const { rows, downloadUrl } = req.body;
  if (!Array.isArray(rows) || !rows.length) return res.status(400).json(fail("rows array is required"));
  const upsert = db.prepare(`INSERT INTO query_sheet_rows (task_id,row_index,date,details,payment,receipt,hst,our_remarks,client_remarks) VALUES (?,?,?,?,?,?,?,?,'') ON CONFLICT(task_id,row_index) DO UPDATE SET date=excluded.date,details=excluded.details,payment=excluded.payment,receipt=excluded.receipt,hst=excluded.hst,our_remarks=excluded.our_remarks,updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now')`);
  rows.forEach(r => upsert.run(req.params.taskId,r.rowIndex,r.date||null,r.details||null,r.payment||null,r.receipt||null,r.hst||null,r.ourRemarks||null));
  if (downloadUrl) {
    const meta = JSON.parse(task.metadata || "{}");
    meta.downloadUrl = downloadUrl;
    db.prepare("UPDATE tasks SET metadata=?,updated_at=? WHERE id=?").run(JSON.stringify(meta),nowIso(),req.params.taskId);
  }
  return res.json(ok({ taskId:req.params.taskId,rowsUploaded:rows.length },"Query sheet rows set"));
});

module.exports = router;
