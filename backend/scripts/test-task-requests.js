// Edit-Task features: admin status -> client status, "Request Data" (default note + document list),
// editable missing-data items, and the General Documentation ZIP.
//
// Runs the real Express app IN-PROCESS against a LOCAL database. SES and S3 are stubbed, so nothing is
// sent or stored anywhere; the script refuses to run unless DATABASE_URL is local.
//   DATABASE_URL=postgresql://postgres@127.0.0.1:55432/biz_test JWT_SECRET=x FRONTEND_URL=http://x node scripts/test-task-requests.js
process.chdir(__dirname + "/..");
if (!/@(127\.0\.0\.1|localhost)[:/]/.test(process.env.DATABASE_URL || "")) { console.error("refusing: DATABASE_URL is not local"); process.exit(2); }
process.env.PORT = "3104"; process.env.NODE_APP_INSTANCE = "9";             // no hourly chaser cron in this process

// ── stubs (installed BEFORE the app loads its modules) ──
const { SESClient } = require("@aws-sdk/client-ses");
const EMAILS = [];
SESClient.prototype.send = async function (cmd) { const i = cmd.input || {}; EMAILS.push({ to: (i.Destination?.ToAddresses || [])[0], subject: i.Message?.Subject?.Data, html: i.Message?.Body?.Html?.Data || "", text: i.Message?.Body?.Text?.Data || "" }); return { MessageId: "stub" }; };
const aws = require("../src/config/aws");
const STORE = new Map();
aws.putObject = async ({ key, body }) => { STORE.set(key, Buffer.from(body)); };
aws.getObjectBuffer = async ({ key }) => { if (!STORE.has(key)) throw new Error("NoSuchKey " + key); return STORE.get(key); };

const jwt = require("jsonwebtoken");
const db = require("../src/db");
const env = require("../src/config/env");
require("../src/index.js");

const BASE = "http://127.0.0.1:3104";
let pass = 0, total = 0;
const check = (n, ok, d) => { total++; if (ok) pass++; console.log((ok ? "PASS " : "FAIL ") + n + (ok ? "" : `  -> ${String(d).slice(0, 220)}`)); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(method, path, token, body, form) {
  const r = await fetch(BASE + path, { method, headers: { ...(form ? {} : { "Content-Type": "application/json" }), ...(token ? { Authorization: "Bearer " + token } : {}) }, body: form || (body ? JSON.stringify(body) : undefined) });
  const buf = Buffer.from(await r.arrayBuffer()); let j = null; try { j = JSON.parse(buf.toString("utf8")); } catch {}
  return { s: r.status, j, buf, h: r.headers };
}
// minimal ZIP central-directory reader: [{ name, data }]
function readZip(buf) {
  const out = []; let eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])); const n = buf.readUInt16LE(eocd + 10); let p = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < n; i++) { const csize = buf.readUInt32LE(p + 20), nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), cmtLen = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nameLen).toString("utf8"); const lh = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28);
    out.push({ name, data: buf.slice(lh, lh + csize) }); p += 46 + nameLen + extraLen + cmtLen; }
  return out;
}

(async () => {
  await sleep(1500);
  const ids = [];
  const mkUser = async (label, role) => { const { rows: [u] } = await db.query("INSERT INTO users (email,password_hash,name,role,portal_status,must_change_password) VALUES ($1,'x',$2,$3,'active',FALSE) RETURNING id", [`${label}-${Date.now()}@example.com`, label, role]); ids.push(u.id); return u; };
  try {
    const admin = await mkUser("TR Admin", "superadmin"), client = await mkUser("TR Client", "client"), other = await mkUser("TR Other Client", "client");
    const A = jwt.sign({ sub: admin.id, role: "superadmin", name: "TR Admin" }, env.JWT_SECRET), C = jwt.sign({ sub: client.id, role: "client", name: "TR Client" }, env.JWT_SECRET);
    const O = jwt.sign({ sub: other.id, role: "client", name: "x" }, env.JWT_SECRET);

    // ── 1. Admin status -> what the client sees ─────────────────────────────────
    const reqsBody = [{ name: "Bank 0010", maxCount: 2, acceptedTypes: ["pdf"], required: true }, { name: "Bank 0547", maxCount: 2, acceptedTypes: ["pdf"], required: true }];
    let r = await api("POST", `/api/admin/clients/${client.id}/tasks`, A, { title: "Bookkeeping", taskType: "BOOKKEEPING", documentRequests: reqsBody });
    const t = r.j?.data; check("setup: bookkeeping task created with two document requests", r.s === 201 && t?.id, `${r.s} ${r.buf}`);
    const clientSees = async (id) => (await api("GET", `/v3/api/v1/tasks/${id}`, C)).j?.data?.clientProgress;
    const MAP = require("../src/workflows").BOOKKEEPING_ADMIN_STATUS_CLIENT_LABEL;
    let allOk = true, firstBad = null;
    for (const [adminStatus, label] of Object.entries(MAP)) {
      const before = await clientSees(t.id);
      const p = await api("PATCH", `/api/admin/tasks/${t.id}`, A, { adminStatus });
      const after = await clientSees(t.id);
      const want = label ?? before;
      if (p.s !== 200 || after !== want) { allOk = false; firstBad ||= `${adminStatus}: got ${after}, want ${want} (http ${p.s})`; }
    }
    check("every admin status updates the status the client sees (16 statuses)", allOk, firstBad);
    check("'Send for automation' / 'Received from automation' show the client 'Work in Progress'", MAP["Send for automation"] === "Work in Progress" && MAP["Received from automation"] === "Work in Progress");
    await api("PATCH", `/api/admin/tasks/${t.id}`, A, { adminStatus: "Query sent to client" });
    check("'Query sent to client' tells the client a response is pending", (await clientSees(t.id)) === "Query response pending");
    const info = (await api("POST", `/api/admin/clients/${client.id}/tasks`, A, { title: "Other task", taskType: "info" })).j.data;
    const infoBefore = (await db.query("SELECT client_progress FROM tasks WHERE id=$1", [info.id])).rows[0].client_progress;
    await api("PATCH", `/api/admin/tasks/${info.id}`, A, { adminStatus: "Work in Progress" });
    check("other task types keep their own client status (not changed by the new mapping)", (await db.query("SELECT client_progress FROM tasks WHERE id=$1", [info.id])).rows[0].client_progress === infoBefore, infoBefore);
    check("editing without touching the status does not alter the client status", await (async () => { const b = await clientSees(t.id); await api("PATCH", `/api/admin/tasks/${t.id}`, A, { description: "d" }); return (await clientSees(t.id)) === b; })());
    const bad = await api("PATCH", `/api/admin/tasks/${t.id}`, A, { adminStatus: "Nonsense" });
    check("an invalid status is still rejected (400)", bad.s === 400, bad.s);

    // ── 2. "Request Data": first request with a note ─────────────────────────────
    await api("PATCH", `/api/admin/tasks/${t.id}`, A, { adminStatus: "Data not received" });
    const statusBefore = (await db.query("SELECT admin_status, reminder_count FROM tasks WHERE id=$1", [t.id])).rows[0];
    const noteText = "Please upload the requested data for Oct 1 to Oct 31. <script>alert(1)</script>";
    let m = EMAILS.length; r = await api("POST", `/api/admin/tasks/${t.id}/request-data`, A, { period: "Oct 1 - Oct 31", note: noteText, sendEmail: true });
    check("Request Data accepted and emailed", r.s === 200 && r.j?.data?.emailed === true, `${r.s} ${r.buf}`);
    const mail = EMAILS.slice(m)[0] || {};
    check("email goes to the client", String(mail.to).toLowerCase().startsWith("tr client-"), mail.to);
    check("email lists BOTH document fields", mail.html?.includes("Bank 0010") && mail.html?.includes("Bank 0547"), mail.html?.slice(0, 80));
    check("email carries the note and the period", mail.html?.includes("requested data for Oct 1 to Oct 31") && mail.html?.includes("Oct 1 - Oct 31"));
    check("admin-typed HTML is escaped (no script tag in the email)", !mail.html?.includes("<script>") && mail.html?.includes("&lt;script&gt;"));
    check("it is the FIRST-request wording, not 'still missing'", /We need your information/.test(mail.html || "") && !/still missing/i.test(mail.html || ""));
    const after2 = (await db.query("SELECT admin_status, reminder_count, metadata FROM tasks WHERE id=$1", [t.id])).rows[0];
    check("status is unchanged by a Request Data", after2.admin_status === statusBefore.admin_status, after2.admin_status);
    check("the first request is counted so the chaser knows it was sent", after2.reminder_count === statusBefore.reminder_count + 1);
    const bk = (await api("GET", `/v3/api/v1/tasks/${t.id}/document-buckets`, C)).j?.data;
    check("client sees the note and period for the upload fields", bk?.dataRequest?.note === noteText && bk?.dataRequest?.period === "Oct 1 - Oct 31", JSON.stringify(bk?.dataRequest));
    const noReq = (await api("POST", `/api/admin/tasks/${info.id}/request-data`, A, {}));
    check("nothing to request (no fields, no note) is refused (400)", noReq.s === 400, noReq.s);
    check("a client cannot call Request Data (403)", (await api("POST", `/api/admin/tasks/${t.id}/request-data`, C, { note: "x" })).s === 403);
    await api("POST", `/api/admin/tasks/${t.id}/request-data`, A, { note: "no email this time" });
    check("saving without emailing sends nothing", EMAILS.length === m + 1, EMAILS.length - m);

    // ── 3. Partial data: unfinished fields become editable copies ────────────────
    const reqs = (await api("GET", `/api/admin/clients/${client.id}/tasks`, A)).j.data.find((x) => x.id === t.id).metadata.documentRequests;
    await api("PATCH", `/api/admin/tasks/${t.id}`, A, { documentRequests: [{ ...reqs[0], done: true }, reqs[1]] });
    m = EMAILS.length;
    r = await api("POST", `/api/admin/tasks/${t.id}/missing-data-request`, A, {
      period: "Oct 1 to 15", note: "We have received your data but some are missing, please upload these.", sendEmail: true,
      items: [{ key: reqs[1].key, name: "Bank - 0547 - Oct 1 to 15 Data missing" }, { key: "not_a_real_key", name: "should be dropped" }] });
    check("missing-data request accepted", r.s === 200 && r.j?.data?.missingDataRequest, `${r.s} ${r.buf}`);
    const mdr = r.j?.data?.missingDataRequest;
    check("only real outstanding fields keep an edited name (unknown key dropped)", JSON.stringify(mdr.items) === JSON.stringify([{ key: reqs[1].key, name: "Bank - 0547 - Oct 1 to 15 Data missing" }]), JSON.stringify(mdr.items));
    const mm = EMAILS.slice(m)[0] || {};
    check("email lists the ADMIN'S edited wording", mm.html?.includes("Bank - 0547 - Oct 1 to 15 Data missing") && !mm.html?.includes(">Bank 0547<"), mm.html?.slice(0, 80));
    check("email does not list the finished field (Bank 0010)", !mm.html?.includes("Bank 0010"));
    check("email says 'still missing'", /still missing/i.test(mm.html || ""));
    const row = (await db.query("SELECT admin_status, client_progress, metadata FROM tasks WHERE id=$1", [t.id])).rows[0];
    check("original document requests are untouched (names, order, done flags)", JSON.stringify(row.metadata.documentRequests.map((q) => [q.name, q.done])) === JSON.stringify([["Bank 0010", true], ["Bank 0547", false]]), JSON.stringify(row.metadata.documentRequests.map((q) => [q.name, q.done])));
    check("status -> Partial Data received; client sees 'Data pending'", row.admin_status === "Partial Data received" && row.client_progress === "Data pending", `${row.admin_status} / ${row.client_progress}`);
    const bk2 = (await api("GET", `/v3/api/v1/tasks/${t.id}/document-buckets`, C)).j?.data;
    const out = (bk2?.requirements || []).find((q) => q.outstanding);
    check("client's upload list shows the admin's wording for the outstanding field", out?.outstandingLabel === "Bank - 0547 - Oct 1 to 15 Data missing" && (bk2.requirements || []).filter((q) => q.outstanding).length === 1, JSON.stringify(out));
    check("a different client cannot see this task's requests (404)", (await api("GET", `/v3/api/v1/tasks/${t.id}/document-buckets`, O)).s === 404);
    const noItems = await api("POST", `/api/admin/tasks/${t.id}/missing-data-request`, A, { period: "p", note: "n" });
    check("a request without edited items still works (defaults to original names)", noItems.s === 200 && Array.isArray(noItems.j?.data?.missingDataRequest?.items) && noItems.j.data.missingDataRequest.items.length === 0);

    // ── 4. General Documentation: download everything as one ZIP ─────────────────
    const up = async (field, name, body, slot = 1) => { const fd = new FormData(); fd.append("file", new Blob([Buffer.from(body)], { type: "application/pdf" }), name); fd.append("fieldKey", field); fd.append("slotIndex", String(slot)); return api("POST", "/v3/api/v1/general-docs/upload", C, null, fd); };
    check("archive with no uploads is 404 (not an empty zip)", (await api("GET", `/api/admin/clients/${client.id}/general-docs/archive`, A)).s === 404);
    await api("PUT", `/api/admin/clients/${client.id}/general-docs`, A, { enabled: true, fields: [{ key: "bank_0010", name: "Bank Account 0010", maxCount: 3, acceptedTypes: ["pdf"] }, { key: "bank_0547", name: "Bank Account 0547", maxCount: 3, acceptedTypes: ["pdf"] }] });
    const u1 = await up("bank_0010", "jan.pdf", "%PDF-0010-jan", 1), u2 = await up("bank_0010", "feb.pdf", "%PDF-0010-feb", 2), u3 = await up("bank_0547", "jan.pdf", "%PDF-0547-jan", 1);
    check("client uploads three files (two fields; two for the same account)", [u1, u2, u3].every((x) => x.s === 200 || x.s === 201), [u1.s, u2.s, u3.s]);
    const z = await api("GET", `/api/admin/clients/${client.id}/general-docs/archive`, A);
    check("ZIP download works (200, application/zip, attachment)", z.s === 200 && z.h.get("content-type") === "application/zip" && /attachment; filename=".*general_documents\.zip"/.test(z.h.get("content-disposition") || ""), `${z.s} ${z.h.get("content-type")}`);
    const entries = z.s === 200 ? readZip(z.buf) : [];
    check("ZIP holds all three files, named by document field", JSON.stringify(entries.map((e) => e.name).sort()) === JSON.stringify(["Bank Account 0010_1_jan.pdf", "Bank Account 0010_2_feb.pdf", "Bank Account 0547_1_jan.pdf"]), entries.map((e) => e.name));
    check("ZIP contents are byte-identical to what the client uploaded", entries.every((e) => (e.data.toString() === { "Bank Account 0010_1_jan.pdf": "%PDF-0010-jan", "Bank Account 0010_2_feb.pdf": "%PDF-0010-feb", "Bank Account 0547_1_jan.pdf": "%PDF-0547-jan" }[e.name])));
    check("a client cannot download the admin archive (403)", (await api("GET", `/api/admin/clients/${client.id}/general-docs/archive`, C)).s === 403);
    check("unknown client -> 404", (await api("GET", "/api/admin/clients/00000000-0000-0000-0000-000000000000/general-docs/archive", A)).s === 404);
  } catch (e) { check("test completed without throwing", false, e.stack || e.message); }
  finally {
    await db.query("DELETE FROM tasks WHERE client_id = ANY($1)", [ids]); await db.query("DELETE FROM general_doc_uploads WHERE client_id = ANY($1)", [ids]);
    await db.query("DELETE FROM users WHERE id = ANY($1)", [ids]);
    console.log(`\n${pass}/${total} passed`); process.exit(pass === total ? 0 : 1);
  }
})();
