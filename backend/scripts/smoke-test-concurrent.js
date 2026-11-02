#!/usr/bin/env node
// scripts/smoke-test-concurrent.js — role-based access + three actors working
// at the SAME time on one task: Admin One, Admin Two, and the Client.
//
//   Admin One  (role admin, no permissions)            — status, doc requests, missing-data
//   Admin Two  (role admin, manage_notifications only) — comments, assignee, dates, description
//   Client     (role client)                           — polls its own view the whole time and
//                                                        must never see anything admin-internal
//
// Same safety model as smoke-test.js / smoke-test-tasks.js: runs against this
// host's own .env, seeds disposable users tagged smoketest-conc+..., signs
// their JWTs locally, deletes everything in `finally`. It NEVER submits the
// onboarding or take-on forms (a submit emails the real support@/accounts@/
// admin@ addresses) and never sets sendEmail on a missing-data request.
//
// Usage:  node scripts/smoke-test-concurrent.js      (run on the server)

const path = require("path");
process.chdir(path.join(__dirname, ".."));

const jwt = require("jsonwebtoken");
const db = require("../src/db");
const env = require("../src/config/env");
const { hashPassword } = require("../src/helpers");

const STAMP = Date.now();
const BASE = process.env.BUSINESS_API_BASE || `http://127.0.0.1:${process.env.PORT || 3001}/api`;
const CBASE = BASE.replace(/\/api$/, "/v3/api/v1");

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass });
  console.log(`  ${pass ? "PASS" : "FAIL"}  ${name}${!pass && detail ? " — " + detail : ""}`);
}

async function http(method, url, token, body) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON */ }
  return { status: res.status, json, text };
}

// All actors wait here so their first requests really do go out together.
function barrier(n) {
  let waiting = [];
  return () => new Promise((resolve) => {
    waiting.push(resolve);
    if (waiting.length === n) { const w = waiting; waiting = []; w.forEach((r) => r()); }
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ids = [];
async function seedUser(label, role, permissions = []) {
  const hash = await hashPassword(require("crypto").randomBytes(24).toString("hex"));
  const { rows: [u] } = await db.query(
    `INSERT INTO users (email, password_hash, name, role, portal_status, must_change_password, permissions)
     VALUES ($1,$2,$3,$4,'active',FALSE,$5) RETURNING id`,
    [`smoketest-conc-${label.toLowerCase().replace(/\s+/g, "")}+${STAMP}@diamondaccounts.ca`, hash, label, role, permissions]);
  ids.push(u.id);
  const token = jwt.sign({ sub: u.id, role, name: label }, env.JWT_SECRET, { expiresIn: "10m" });
  return { id: u.id, token, name: label };
}

const SECRET_1 = `INTERNAL-ONE-${STAMP}`;
const SECRET_2 = `INTERNAL-TWO-${STAMP}`;

async function main() {
  console.log(`\nConcurrent role-based smoke test (${BASE})\n`);

  const a1 = await seedUser("Smoke Admin One", "admin");
  const a2 = await seedUser("Smoke Admin Two", "admin", ["manage_notifications"]);
  const cl = await seedUser("Smoke Conc Client", "client");

  // ── Role-based access (sequential, before the concurrent phase) ─────────────
  console.log("  — role-based access —");
  const noTok = await http("GET", `${BASE}/admin/dashboard`, null);
  check("no token -> 401", noTok.status === 401, `HTTP ${noTok.status}`);
  const clientOnAdmin = await http("GET", `${BASE}/admin/dashboard`, cl.token);
  check("client token on admin route -> 403", clientOnAdmin.status === 403, `HTTP ${clientOnAdmin.status}`);
  const adminOnClient = await http("GET", `${CBASE}/tasks`, a1.token);
  check("admin token on client route -> 403", adminOnClient.status === 403, `HTTP ${adminOnClient.status}`);
  const a1Notif = await http("GET", `${BASE}/admin/notification-configs`, a1.token);
  check("admin WITHOUT manage_notifications -> 403 on notification configs", a1Notif.status === 403, `HTTP ${a1Notif.status}`);
  const a2Notif = await http("GET", `${BASE}/admin/notification-configs`, a2.token);
  // The spec makes notification recipients a SUPER-admin setting, and an earlier
  // router's blanket superadmin guard enforces that, so the manage_notifications
  // permission does not unlock it for a plain admin. Pinned so a change is noticed.
  check("plain admin is refused even WITH manage_notifications (settings are super-admin only)", a2Notif.status === 403, `HTTP ${a2Notif.status}`);
  const a1Put = await http("PUT", `${BASE}/admin/notification-configs/SMOKETEST`, a1.token, { email: "x@example.com" });
  check("admin without permission cannot change recipients (PUT -> 403)", a1Put.status === 403, `HTTP ${a1Put.status}`);
  const cTakeOn = await http("GET", `${BASE}/admin/clients/${cl.id}/client-take-on`, cl.token);
  check("client cannot read the admin take-on endpoint -> 403", cTakeOn.status === 403, `HTTP ${cTakeOn.status}`);

  // ── Business-side config by an admin, read back by the right roles ──────────
  console.log("\n  — take-on / general docs / onboarding —");
  const future = new Date(Date.now() + 40 * 86400000).toISOString().slice(0, 10);
  const toSave = await http("PUT", `${BASE}/admin/clients/${cl.id}/client-take-on`, a1.token, {
    answers: { bookkeeping: "Yes", bookkeeping_period: "Monthly", bookkeeping_first_date: future,
               bookkeeping_method: "Online", accounting_software: "Others", accounting_software_other: "Wave" },
    submit: false,
  });
  check("admin saves Bookkeeping tab answers as DRAFT (no email, no task generation)",
    toSave.status === 200 && toSave.json?.data?.status === "draft", `HTTP ${toSave.status} ${toSave.json?.data?.status}`);
  const toGet = await http("GET", `${BASE}/admin/clients/${cl.id}/client-take-on`, a2.token);
  const sec = (toGet.json?.data?.schema?.sections || []).find((s) => s.key === "bookkeeping_details");
  check("Bookkeeping service tab is schema-driven (own tab, shown only when bookkeeping=Yes)",
    sec?.tab === "bookkeeping" && sec?.showWhen?.value === "Yes");
  const keys = (sec?.fields || []).map((f) => f.key);
  check("Bookkeeping tab has frequency, first date, method, software(+other), due rule",
    ["bookkeeping_period", "bookkeeping_first_date", "bookkeeping_method", "accounting_software", "accounting_software_other", "bookkeeping_due_rule"].every((k) => keys.includes(k)), keys.join(","));
  const sw = (sec?.fields || []).find((f) => f.key === "accounting_software");
  check("Accounting software options are Quickbooks/Xero/VT/Sage/Others",
    JSON.stringify(sw?.options) === JSON.stringify(["Quickbooks", "Xero", "VT", "Sage", "Others"]), JSON.stringify(sw?.options));
  const ans = toGet.json?.data?.submission?.answers || {};
  check("a second admin reads back the first admin's answers (incl. 'Others' text)",
    ans.bookkeeping_period === "Monthly" && ans.accounting_software_other === "Wave");

  // Bookkeeping Method default, future-only first date, Chaser Email Schedule.
  const fld = (k) => (sec?.fields || []).find((f) => f.key === k);
  check("schema: Bookkeeping Method defaults to Online", fld("bookkeeping_method")?.defaultValue === "Online");
  check("schema: First Bookkeeping Date is flagged future-only", fld("bookkeeping_first_date")?.futureOnly === true);
  check("schema: Chaser Email Schedule field exists", fld("bookkeeping_chaser_schedule")?.type === "chaser");

  const pastDate = new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10);
  const pastRes = await http("PUT", `${BASE}/admin/clients/${cl.id}/client-take-on`, a1.token, {
    answers: { bookkeeping: "Yes", bookkeeping_period: "Monthly", bookkeeping_first_date: pastDate }, submit: false,
  });
  check("a past First Bookkeeping Date is rejected (400)", pastRes.status === 400, `HTTP ${pastRes.status} ${pastRes.json?.message}`);

  const chRes = await http("PUT", `${BASE}/admin/clients/${cl.id}/client-take-on`, a1.token, {
    answers: { bookkeeping: "Yes", bookkeeping_period: "Weekly", bookkeeping_first_date: future,
               bookkeeping_chaser_schedule: { mode: "custom", intervalDays: "abc", durationDays: 9999, extraDates: ["2026-12-24", "nope"] } },
    submit: false,
  });
  const chAns = chRes.json?.data?.answers || {};
  check("Bookkeeping Method saved as Online when left blank", chAns.bookkeeping_method === "Online", String(chAns.bookkeeping_method));
  check("Chaser schedule is clamped/cleaned on save",
    chAns.bookkeeping_chaser_schedule?.intervalDays === 2 && chAns.bookkeeping_chaser_schedule?.durationDays === 120
    && JSON.stringify(chAns.bookkeeping_chaser_schedule?.extraDates) === JSON.stringify(["2026-12-24"]), JSON.stringify(chAns.bookkeeping_chaser_schedule));
  const defRes = await http("PUT", `${BASE}/admin/clients/${cl.id}/client-take-on`, a1.token, {
    answers: { ...chAns, bookkeeping_chaser_schedule: { mode: "default" } }, submit: false,
  });
  check("switching the schedule back to default removes it", defRes.json?.data?.answers?.bookkeeping_chaser_schedule === undefined);

  const gdSave = await http("PUT", `${BASE}/admin/clients/${cl.id}/general-docs`, a1.token, {
    enabled: true,
    fields: [
      { key: "bank_0010", name: "Bank Account 0010", maxCount: 3, required: true, acceptedTypes: ["pdf", "csv"], notes: "Last 3 months" },
      { key: "bank_0547", name: "Bank Account 0547", maxCount: 3, required: true, acceptedTypes: ["pdf", "csv"] },
      { key: "cc_visa",  name: "Credit Card Statement", maxCount: 3, required: false, acceptedTypes: ["pdf"] },
    ],
  });
  check("admin saves General Documentation template (same type twice)", gdSave.status === 200, `HTTP ${gdSave.status} ${gdSave.json?.message}`);
  const gdClient = await http("GET", `${CBASE}/general-docs`, cl.token);
  const gdFields = gdClient.json?.data?.fields || gdClient.json?.data?.config?.fields || [];
  check("client sees the template with multi-file limits", gdClient.status === 200 && JSON.stringify(gdClient.json).includes("Bank Account 0547") && JSON.stringify(gdClient.json).includes("\"maxCount\":3"), `HTTP ${gdClient.status} fields=${gdFields.length}`);

  const ob = await http("GET", `${CBASE}/onboarding`, cl.token);
  const obKeys = JSON.stringify(ob.json?.data?.schema || {});
  check("client onboarding schema: split director names + structured address + Rotessa + incorporation ack",
    ["director_first_name", "director_last_name", "registered_address_street", "registered_address_city", "registered_address_province", "registered_address_postal_code", "registered_address_country", "rotessa_authorization", "incorporation_documents_ack", "app.rotessa.com/authorize/diamondaccounts"].every((k) => obKeys.includes(k)));
  const obDraft = await http("PUT", `${CBASE}/onboarding`, cl.token, { answers: { company_name: "Smoke Co" }, submit: false });
  check("client saves onboarding draft", obDraft.status === 200 && obDraft.json?.data?.status === "draft", `HTTP ${obDraft.status}`);
  const obBad = await http("PUT", `${CBASE}/onboarding`, cl.token, { answers: { shareholders: [{}] }, submit: true });
  check("blank submit rejected (400) and names the blank shareholder name fields",
    obBad.status === 400 && /Share Holder 1 — First Name/.test(obBad.json?.message || "") && /Share Holder 1 — Last Name/.test(obBad.json?.message || ""), `HTTP ${obBad.status} ${(obBad.json?.message || "").slice(0, 120)}`);
  const obState = await http("GET", `${BASE}/admin/clients/${cl.id}/onboarding`, a1.token);
  check("rejected submit did NOT mark onboarding submitted (no email fired)", obState.json?.data?.status !== "submitted", obState.json?.data?.status);

  // ── The task all three actors will hit ──────────────────────────────────────
  const created = await http("POST", `${BASE}/admin/clients/${cl.id}/tasks`, a1.token, {
    title: "Concurrent bookkeeping", taskType: "info", description: "initial",
    documentRequests: [
      { name: "Bank 0010", maxCount: 2, acceptedTypes: ["pdf"], required: true },
      { name: "Bank 0547", maxCount: 2, acceptedTypes: ["pdf"], required: true },
    ],
  });
  const task = created.json?.data;
  if (!task?.id) throw new Error(`task not created: HTTP ${created.status} ${created.json?.message}`);
  const taskId = task.id;
  const reqs = task.metadata?.documentRequests || [];

  // ── Concurrent phase ────────────────────────────────────────────────────────
  console.log("\n  — Admin One, Admin Two and the Client, simultaneously —");
  const go = barrier(3);
  const clientSnapshots = [];
  const clientStatuses = [];
  let adminsDone = false;
  const out = {};

  const admin1 = async () => {
    await go();
    out.a1Status = await http("PATCH", `${BASE}/admin/tasks/${taskId}`, a1.token, { adminStatus: "Send for automation" });
    out.a1Comment = await http("POST", `${BASE}/admin/tasks/${taskId}/comments`, a1.token, { text: SECRET_1 });
    out.a1Docs = await http("PATCH", `${BASE}/admin/tasks/${taskId}`, a1.token, {
      documentRequests: [{ ...reqs[0], done: true }, { ...reqs[1], done: false }],
    });
    out.a1Missing = await http("POST", `${BASE}/admin/tasks/${taskId}/missing-data-request`, a1.token,
      { period: "Oct 1 to 15", note: "Bank - 0547 - Oct 1 to 15 data missing" });
  };

  const admin2 = async () => {
    await go();
    out.a2Comment = await http("POST", `${BASE}/admin/tasks/${taskId}/comments`, a2.token, { text: SECRET_2 });
    out.a2Assign = await http("PATCH", `${BASE}/admin/tasks/${taskId}`, a2.token, { assignedTo: a2.id });
    out.a2Fields = await http("PATCH", `${BASE}/admin/tasks/${taskId}`, a2.token,
      { description: "Please send October statements", openDate: "2026-11-01", dueDate: "2026-11-15" });
    out.a2Reject = await http("PATCH", `${BASE}/admin/tasks/${taskId}`, a2.token, { adminStatus: "Nonsense" });
  };

  const client = async () => {
    await go();
    // Poll the client's own view while both admins are writing.
    for (let i = 0; i < 12; i++) {
      const list = await http("GET", `${CBASE}/tasks`, cl.token);
      const det = await http("GET", `${CBASE}/tasks/${taskId}/details`, cl.token);
      const one = await http("GET", `${CBASE}/tasks/${taskId}`, cl.token);
      clientSnapshots.push(list.text, det.text, one.text);
      clientStatuses.push(list.status, det.status, one.status);
      if (adminsDone && i >= 6) break;
      await sleep(40);
    }
    // And try to reach admin-internal things directly.
    out.cComments = await http("GET", `${BASE}/admin/tasks/${taskId}/comments`, cl.token);
    out.cDetail   = await http("GET", `${BASE}/admin/tasks/${taskId}/detail`, cl.token);
    out.cPatch    = await http("PATCH", `${BASE}/admin/tasks/${taskId}`, cl.token, { adminStatus: "Filed" });
    out.cClose    = await http("POST", `${BASE}/admin/tasks/${taskId}/close`, cl.token, {});
    out.cActivity = await http("GET", `${BASE}/admin/tasks/${taskId}/activity`, cl.token);
  };

  await Promise.all([
    admin1().then(() => { adminsDone = true; }),
    admin2(),
    client(),
  ]);

  // ── Verify the concurrent outcome ───────────────────────────────────────────
  check("no request errored (5xx) during the concurrent phase",
    ![out.a1Status, out.a1Comment, out.a1Docs, out.a1Missing, out.a2Comment, out.a2Assign, out.a2Fields].some((r) => r.status >= 500)
    && !clientStatuses.some((s) => s >= 500),
    JSON.stringify({ a1: [out.a1Status.status, out.a1Comment.status, out.a1Docs.status, out.a1Missing.status], a2: [out.a2Comment.status, out.a2Assign.status, out.a2Fields.status], c: [...new Set(clientStatuses)] }));
  check("Admin Two's invalid status was rejected (400) mid-race", out.a2Reject.status === 400, `HTTP ${out.a2Reject.status}`);

  const after = (await http("GET", `${BASE}/admin/clients/${cl.id}/tasks`, a1.token)).json?.data?.find((t) => t.id === taskId) || {};
  const comments = (await http("GET", `${BASE}/admin/tasks/${taskId}/comments`, a2.token)).json?.data || [];
  const texts = comments.map((c) => c.text);
  check("both admins' internal comments persisted (none lost)", texts.includes(SECRET_1) && texts.includes(SECRET_2), JSON.stringify(texts));
  check("comments attributed to the right admin",
    comments.find((c) => c.text === SECRET_1)?.authorName === a1.name && comments.find((c) => c.text === SECRET_2)?.authorName === a2.name);
  check("Admin Two's fields survived (description, dates, assignee)",
    after.description === "Please send October statements" && String(after.dueDate).startsWith("2026-11-15") && String(after.openDate).startsWith("2026-11-01") && after.assignedTo === a2.id,
    JSON.stringify({ d: after.description, due: after.dueDate, open: after.openDate, as: after.assignedTo }));
  check("Admin One's status survived Admin Two's concurrent edits (Partial Data received)",
    after.adminStatus === "Partial Data received", after.adminStatus);
  check("missing-data request targets only the not-done document",
    JSON.stringify(out.a1Missing.json?.data?.missingDataRequest?.outstandingKeys) === JSON.stringify([reqs[1].key]),
    JSON.stringify(out.a1Missing.json?.data?.missingDataRequest?.outstandingKeys));

  const detail = (await http("GET", `${BASE}/admin/tasks/${taskId}/detail`, a2.token)).json?.data;
  const actNames = new Set((detail?.activity || []).map((a) => a.performedByName));
  check("activity log records BOTH admins by name", actNames.has(a1.name) && actNames.has(a2.name), [...actNames].join(","));

  // Client isolation
  const everything = clientSnapshots.join("\n");
  check("client saw the task throughout", clientStatuses.every((s) => s === 200), JSON.stringify([...new Set(clientStatuses)]));
  check("client never saw either admin's internal comment (across all polls)",
    !everything.includes(SECRET_1) && !everything.includes(SECRET_2));
  check("client never saw adminStatus / admin_status / missingDataRequest / outstandingKeys",
    !/adminStatus|admin_status|missingDataRequest|outstandingKeys/.test(everything));
  // The details payload's `metadata` is a curated UI-hint block; only these keys may appear.
  const detJson = JSON.parse(clientSnapshots[1]);
  const metaKeys = Object.keys(detJson?.data?.fields?.metadata || {});
  check("client-visible task metadata is limited to the 4 UI-hint keys",
    metaKeys.every((k) => ["route", "submissionModes", "editableField", "readOnlyFields"].includes(k)), metaKeys.join(","));
  check("client never saw the activity log or assignee",
    !/performedBy|activity|assignedTo|assigned_to|closedBy/i.test(everything));
  check("client can reach none of the admin task endpoints (all 403)",
    [out.cComments, out.cDetail, out.cPatch, out.cClose, out.cActivity].every((r) => r.status === 403),
    JSON.stringify([out.cComments.status, out.cDetail.status, out.cPatch.status, out.cClose.status, out.cActivity.status]));
  const still = (await http("GET", `${BASE}/admin/clients/${cl.id}/tasks`, a1.token)).json?.data?.find((t) => t.id === taskId) || {};
  check("client's attempted status change / close did not take effect", still.adminStatus === "Partial Data received" && !still.closedAt, `${still.adminStatus} closedAt=${still.closedAt}`);

  // ── Race probe: two admins write task metadata at once ──────────────────────
  // missing-data-request does read-modify-write of the whole metadata blob, so
  // a simultaneous documentRequests edit can be overwritten. This asks the
  // question directly instead of assuming.
  console.log("\n  — race probe: simultaneous metadata writes —");
  const cur = (await http("GET", `${BASE}/admin/clients/${cl.id}/tasks`, a1.token)).json?.data?.find((t) => t.id === taskId);
  const curReqs = cur?.metadata?.documentRequests || [];
  const NOTE = `race-note-${STAMP}`;
  const go2 = barrier(2);
  await Promise.all([
    (async () => { await go2(); await http("POST", `${BASE}/admin/tasks/${taskId}/missing-data-request`, a1.token, { period: "Race period", note: "race" }); })(),
    (async () => { await go2(); await http("PATCH", `${BASE}/admin/tasks/${taskId}`, a2.token, { documentRequests: curReqs.map((r, i) => (i === 0 ? { ...r, notes: NOTE } : r)) }); })(),
  ]);
  const fin = (await http("GET", `${BASE}/admin/clients/${cl.id}/tasks`, a1.token)).json?.data?.find((t) => t.id === taskId);
  const keptNote = (fin?.metadata?.documentRequests || [])[0]?.notes === NOTE;
  const keptMdr = fin?.metadata?.missingDataRequest?.period === "Race period";
  check("simultaneous doc-request edit and missing-data request: neither write is lost", keptNote && keptMdr,
    `docRequestEditKept=${keptNote} missingDataRequestKept=${keptMdr}`);
}

(async () => {
  try {
    await main();
  } catch (err) {
    check("smoke test completed without throwing", false, err.message);
  } finally {
    try {
      // Tasks first (activity-log rows cascade from them), then the users —
      // otherwise deleting an admin can trip the performed_by foreign key.
      await db.query("DELETE FROM tasks WHERE client_id = ANY($1) OR assigned_to = ANY($1)", [ids]);
      for (const id of ids) await db.query("DELETE FROM users WHERE id=$1", [id]);
      const { rows: [left] } = await db.query("SELECT count(*)::int n FROM users WHERE email LIKE 'smoketest-conc-%'");
      console.log(`\n  cleanup: removed ${ids.length} disposable users (leftover: ${left.n})`);
      if (left.n) process.exitCode = 1;
    } catch (e) {
      console.error(`\n  CLEANUP FAILED — smoketest-conc rows may remain: ${e.message}`);
      process.exitCode = 1;
    }
    const failed = results.filter((r) => !r.pass);
    console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
    if (failed.length) { console.log("\nFAILED:\n" + failed.map((f) => "  - " + f.name).join("\n")); process.exitCode = 1; }
    await db.pool.end();
    if (db.mainPool) await db.mainPool.end();
  }
})();
