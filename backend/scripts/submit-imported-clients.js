#!/usr/bin/env node
// ONE-TIME follow-up to import-csv-clients.js: flips the 5 imported clients'
// take-on submissions from 'draft' to 'submitted' and generates their
// recurring tasks immediately (same call the real submit flow and the hourly
// sweep both make - see routes/client-take-on.js's PUT handler).
//
// This IS the step that goes from "admin preview only" to "live, real
// automation" - from here on, these are real tasks that the chaser scheduler
// can email reminders about to the client's real address.
const db = require("../src/db");
const { recurringConfigFromAnswers } = require("../src/routes/client-take-on");
const { generateTasksForClient } = require("../src/task-generation");

const EMAILS = [
  "inders1989@gmail.com",
  "satwantsingh62@yahoo.com",
  "amckitchens@yahoo.com",
  "mmingalls@gmail.com",
  "doverconv@gmail.com",
];

async function main() {
  for (const email of EMAILS) {
    const { rows: [row] } = await db.query(
      `SELECT u.id, u.name, cts.answers
       FROM users u JOIN client_take_on_submissions cts ON cts.client_id = u.id
       WHERE LOWER(u.email) = LOWER($1)`,
      [email]
    );
    if (!row) { console.log(`SKIP ${email} - no take-on submission found`); continue; }

    await db.query(
      `UPDATE client_take_on_submissions SET status='submitted', submitted_at=NOW(), updated_at=NOW()
       WHERE client_id=$1`,
      [row.id]
    );

    const config = recurringConfigFromAnswers(row.answers || {});
    const result = config
      ? await generateTasksForClient(row.id, config, null)
      : { count: 0, created: [] };

    console.log(`${row.name} (${email}): submitted, ${result.count} task(s) generated`,
      result.created.map((t) => t.taskType).join(", ") || "(none)");
  }
  await db.pool?.end?.();
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
