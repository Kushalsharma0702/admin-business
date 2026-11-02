#!/usr/bin/env node
// scripts/smoke-test-tasks.js — post-deploy verification for the task workflow:
// statuses, per-document "done" -> missing-data request, Mark as done / Active
// vs Closed paging, client-view filtering, ZIP builder, Atlantic send window,
// and the ONBOARDING notification default.
//
// Same shape as smoke-test.js: runs against this host's own .env, creates ONE
// disposable superadmin + ONE disposable client (tagged smoketest-tasks+...),
// signs their JWTs locally (no password, no email), and deletes both in a
// `finally` block. No email is sent: the missing-data call never sets sendEmail.
//
// Usage:  node scripts/smoke-test-tasks.js      (run on the server)

const path = require("path");
process.chdir(path.join(__dirname, ".."));

const jwt = require("jsonwebtoken");
const db = require("../src/db");
const env = require("../src/config/env");
const { hashPassword } = require("../src/helpers");
const { canSendAt } = require("../src/send-window");
const { buildZip } = require("../src/zip");

const STAMP = Date.now();
const BASE = process.env.BUSINESS_API_BASE || `http://127.0.0.1:${process.env.PORT || 3001}/api`;
const CLIENT_BASE = BASE.replace(/\/api$/, "/v3/api/v1");

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass });
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${!pass && detail ? " — " + detail : ""}`);
}

async function http(method, url, token, body) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const buf = Buffer.from(await res.arrayBuffer());
  let json = null;
  try { json = JSON.parse(buf.toString("utf8")); } catch { /* binary / non-JSON */ }
  return { status: res.status, json, buf, headers: res.headers };
}

const ids = { admin: null, client: null };

async function main() {
  console.log(`\nTask workflow smoke test (${BASE})\n`);

  // ── 1. Send window (pure) — Atlantic time, July is ADT = UTC-3 ──────────────
  const at = (iso) => canSendAt(new Date(iso)).ok;
  check("send window: Tue 08:59 ADT blocked", at("2026-07-07T11:59:00Z") === false);
  check("send window: Tue 09:00 ADT allowed", at("2026-07-07T12:00:00Z") === true);
  check("send window: Mon 12:59 ADT blocked", at("2026-07-06T15:59:00Z") === false);
  check("send window: Mon 13:00 ADT allowed", at("2026-07-06T16:00:00Z") === true);
  check("send window: Saturday blocked", at("2026-07-04T15:00:00Z") === false);
  check("send window: Sunday blocked", at("2026-07-05T15:00:00Z") === false);
  check("send window: Canada Day (Wed) blocked", at("2026-07-01T15:00:00Z") === false);
  check("send window: Good Friday blocked", at("2026-04-03T15:00:00Z") === false);
  check("send window: Labour Day blocked", at("2026-09-07T15:00:00Z") === false);
  check("send window: ordinary Wednesday allowed", at("2026-07-08T15:00:00Z") === true);

  // ── 2. ZIP builder (pure) ───────────────────────────────────────────────────
  const zip = buildZip([
    { name: "bank_0010_1_jan.pdf", data: Buffer.from("alpha"), date: new Date() },
    { name: "bank_0547_1_jan.pdf", data: Buffer.from("beta"), date: new Date() },
  ]);
  check("zip: valid local-file header (PK\\x03\\x04)", zip.slice(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])));
  check("zip: end-of-central-directory present", zip.includes(Buffer.from([0x50, 0x4b, 0x05, 0x06])));
  check("zip: both entry names stored", zip.includes("bank_0010_1_jan.pdf") && zip.includes("bank_0547_1_jan.pdf"));

  // ── 3. Seed disposable superadmin + client, sign JWTs locally ───────────────
  const hash = await hashPassword(require("crypto").randomBytes(24).toString("hex"));
  const { rows: [admin] } = await db.query(
    `INSERT INTO users (email, password_hash, name, role, portal_status, must_change_password)
     VALUES ($1,$2,'Smoke Admin','superadmin','active',FALSE) RETURNING id`,
    [`smoketest-tasks-admin+${STAMP}@diamondaccounts.ca`, hash]);
  const { rows: [client] } = await db.query(
    `INSERT INTO users (email, password_hash, name, role, portal_status, must_change_password)
     VALUES ($1,$2,'Smoke Tasks Client','client','active',FALSE) RETURNING id`,
    [`smoketest-tasks+${STAMP}@diamondaccounts.ca`, hash]);
  ids.admin = admin.id; ids.client = client.id;

  const A = jwt.sign({ sub: admin.id, role: "superadmin", name: "Smoke Admin" }, env.JWT_SECRET, { expiresIn: "10m" });
  const C = jwt.sign({ sub: client.id, role: "client", name: "Smoke Tasks Client" }, env.JWT_SECRET, { expiresIn: "10m" });

  // ── 4. Create a task with two requests for the same document type ───────────
  const created = await http("POST", `${BASE}/admin/clients/${client.id}/tasks`, A, {
    title: "Smoke bookkeeping", taskType: "info",
    description: "Visible to the client",
    documentRequests: [
      { name: "Bank Statement 0010", maxCount: 2, acceptedTypes: ["pdf", "csv"], required: true },
      { name: "Bank Statement 0547", maxCount: 2, acceptedTypes: ["pdf", "csv"], required: true },
    ],
  });
  const task = created.json?.data;
  check("create task with 2 same-type document requests", created.status === 201 || created.status === 200, `HTTP ${created.status} ${created.json?.message}`);
  const taskId = task?.id;
  if (!taskId) throw new Error("task not created — cannot continue");
  const reqs = task.metadata?.documentRequests || [];
  check("both requests kept with distinct keys", reqs.length === 2 && reqs[0].key !== reqs[1].key, JSON.stringify(reqs.map((r) => r.key)));

  // ── 5. New admin statuses ───────────────────────────────────────────────────
  for (const s of ["Send for automation", "Received from automation"]) {
    const r = await http("PATCH", `${BASE}/admin/tasks/${taskId}`, A, { adminStatus: s });
    check(`status "${s}" accepted`, r.status === 200 && r.json?.data?.adminStatus === s, `HTTP ${r.status}`);
  }
  const bad = await http("PATCH", `${BASE}/admin/tasks/${taskId}`, A, { adminStatus: "Not A Status" });
  check("invalid status rejected (400)", bad.status === 400, `HTTP ${bad.status}`);

  // ── 6. Per-document done -> missing-data defaults to the NOT-done items ─────
  const marked = await http("PATCH", `${BASE}/admin/tasks/${taskId}`, A, {
    documentRequests: [{ ...reqs[0], done: true }, { ...reqs[1], done: false }],
  });
  const savedReqs = marked.json?.data?.metadata?.documentRequests || [];
  check("done flag persisted per request", savedReqs[0]?.done === true && savedReqs[1]?.done === false, JSON.stringify(savedReqs.map((r) => r.done)));

  const missing = await http("POST", `${BASE}/admin/tasks/${taskId}/missing-data-request`, A,
    { period: "Oct 1 to 15", note: "Bank - 0547 - Oct 1 to 15 data missing" });
  const mdr = missing.json?.data?.missingDataRequest;
  check("missing-data request defaults to not-done items only",
    JSON.stringify(mdr?.outstandingKeys) === JSON.stringify([reqs[1].key]), JSON.stringify(mdr?.outstandingKeys));
  check("status moved to Partial Data received", missing.json?.data?.adminStatus === "Partial Data received", missing.json?.data?.adminStatus);
  check("no email sent (sendEmail not set)", missing.json?.data?.emailed === false);

  // ── 7. Client view hides admin-only data ────────────────────────────────────
  const clientList = await http("GET", `${CLIENT_BASE}/tasks`, C);
  const row = (clientList.json?.data || []).find((t) => t.id === taskId);
  check("client sees the task", !!row, `HTTP ${clientList.status}`);
  const leaked = row ? ["adminStatus", "admin_status", "metadata", "assignedTo", "closedAt", "missingDataRequest"].filter((k) => k in row) : ["(no row)"];
  check("client list exposes no admin-only fields", row && leaked.length === 0, leaked.join(", "));
  const clientDetails = await http("GET", `${CLIENT_BASE}/tasks/${taskId}/details`, C);
  const detailsText = JSON.stringify(clientDetails.json || {});
  check("client details expose no adminStatus / internal notes",
    clientDetails.status === 200 && !/adminStatus|admin_status|internal|adminComment/i.test(detailsText), `HTTP ${clientDetails.status}`);

  // ── 8. Active vs Closed, Mark as done, 10-per-page ──────────────────────────
  const active1 = await http("GET", `${BASE}/admin/clients/${client.id}/tasks?closed=false`, A);
  check("task is in Active list", (active1.json?.data || []).some((t) => t.id === taskId));

  const closeRes = await http("POST", `${BASE}/admin/tasks/${taskId}/close`, A, {});
  check("Mark as done closes the task and records closing date", closeRes.status === 200 && !!closeRes.json?.data?.closedAt, `HTTP ${closeRes.status}`);
  const closeAgain = await http("POST", `${BASE}/admin/tasks/${taskId}/close`, A, {});
  check("closing twice is rejected (409)", closeAgain.status === 409, `HTTP ${closeAgain.status}`);

  const active2 = await http("GET", `${BASE}/admin/clients/${client.id}/tasks?closed=false`, A);
  check("closed task leaves Active list", !(active2.json?.data || []).some((t) => t.id === taskId));

  // 11 more closed tasks so there are 12 in total -> page 1 = 10, page 2 = 2.
  for (let i = 0; i < 11; i++) {
    await db.query(
      `INSERT INTO tasks (client_id, title, task_type, closed_at, closed_by)
       VALUES ($1,$2,'info', NOW() - ($3 || ' minutes')::interval, $4)`,
      [client.id, `Smoke closed ${i}`, String(i + 1), admin.id]);
  }
  const p1 = await http("GET", `${BASE}/admin/clients/${client.id}/tasks?closed=true`, A);
  check("Closed list defaults to 10 rows", p1.json?.data?.length === 10, `got ${p1.json?.data?.length}`);
  check("Closed list reports 12 items over 2 pages", p1.json?.pagination?.total_items === 12 && p1.json?.pagination?.total_pages === 2, JSON.stringify(p1.json?.pagination));
  check("Closed list newest-closed first", p1.json?.data?.[0]?.id === taskId, p1.json?.data?.[0]?.title);
  const p2 = await http("GET", `${BASE}/admin/clients/${client.id}/tasks?closed=true&page=2`, A);
  check("Load more (page 2) returns the remaining 2", p2.json?.data?.length === 2, `got ${p2.json?.data?.length}`);

  const reopen = await http("POST", `${BASE}/admin/tasks/${taskId}/reopen`, A, {});
  check("reopen returns the task to Active", reopen.status === 200 && !reopen.json?.data?.closedAt, `HTTP ${reopen.status}`);

  // ── 9. ZIP endpoint, no uploads yet ─────────────────────────────────────────
  const archive = await http("GET", `${BASE}/admin/tasks/${taskId}/documents/archive`, A);
  check("archive with no uploads returns 404 (not a corrupt zip)", archive.status === 404, `HTTP ${archive.status}`);

  // ── 10. Notification routing: ONBOARDING default + permission gate ──────────
  const cfg = await http("GET", `${BASE}/admin/notification-configs`, A);
  const onboarding = (cfg.json?.data || []).find((c) => c.taskType === "ONBOARDING");
  const emails = String(onboarding?.email || "").split(",").map((e) => e.trim()).sort();
  check("ONBOARDING recipients = support@, accounts@, admin@",
    JSON.stringify(emails) === JSON.stringify(["accounts@diamondaccounts.ca", "admin@diamondaccounts.ca", "support@diamondaccounts.ca"]), emails.join(","));
  const forbidden = await http("GET", `${BASE}/admin/notification-configs`, C);
  check("client token cannot read notification configs", forbidden.status === 403 || forbidden.status === 401, `HTTP ${forbidden.status}`);
}

(async () => {
  try {
    await main();
  } catch (err) {
    check("smoke test completed without throwing", false, err.message);
  } finally {
    try {
      // tasks / task_* rows cascade from users; remove the two seeded users.
      for (const id of [ids.client, ids.admin].filter(Boolean)) {
        await db.query("DELETE FROM tasks WHERE client_id=$1", [id]);
        await db.query("DELETE FROM users WHERE id=$1", [id]);
      }
      console.log("\n  cleanup: removed disposable admin + client and their tasks");
    } catch (e) {
      console.error(`\n  CLEANUP FAILED — smoketest-tasks+${STAMP} rows may remain: ${e.message}`);
      process.exitCode = 1;
    }
    const failed = results.filter((r) => !r.pass);
    console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
    if (failed.length) { console.log("\nFAILED:\n" + failed.map((f) => "  - " + f.name).join("\n")); process.exitCode = 1; }
    await db.pool.end();
    if (db.mainPool) await db.mainPool.end();
  }
})();
