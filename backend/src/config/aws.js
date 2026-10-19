// config/aws.js — AWS SES + S3 clients + helpers
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const env = require("./env");

const ses = new SESClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId:     env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId:     env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

// ── SES ───────────────────────────────────────────────────────────────────────

// Client web portal — the client Flutter app built for web, for clients who
// don't want (or can't use) the mobile app. Hash routing is the Flutter Web
// default, so in-app routes live after the '#'.
const WEB_PORTAL_URL = "https://tax.diamondaccounts.ca/#/login";

async function sendInviteEmail({ toEmail, toName, inviteUrl }) {
  const htmlBody = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <div style="background:#4f46e5;padding:20px 24px;border-radius:8px 8px 0 0">
        <h1 style="color:#fff;margin:0;font-size:20px">Diamond Accounts Tax</h1>
      </div>
      <div style="background:#f8fafc;padding:32px 24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none">
        <h2 style="color:#1e293b;margin-top:0">You've been invited to your client portal</h2>
        <p style="color:#475569">Hi ${toName},</p>
        <p style="color:#475569">Your accounting team at Diamond Accounts has set up your client portal. Setting your password is step 1 of 3 — here is the whole process:</p>
        <ol style="color:#475569;font-size:14px;padding-left:20px;margin:16px 0">
          <li style="margin-bottom:6px">Set your password using the button below.</li>
          <li style="margin-bottom:6px">Log in — you'll be taken straight to your <strong>on-boarding form</strong>.</li>
          <li>Complete on-boarding, then upload the documents we've requested.</li>
        </ol>
        <p style="margin:32px 0;text-align:center">
          <a href="${inviteUrl}"
             style="background:#4f46e5;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">
            Start Step 1 &mdash; Set Your Password
          </a>
        </p>
        <p style="color:#475569;font-size:13px">After setting your password you can use either the <strong>Diamond Accounts mobile app</strong> or your browser at
          <a href="${WEB_PORTAL_URL}" style="color:#4f46e5">tax.diamondaccounts.ca</a>. The next screen gives you both options.</p>
        <p style="color:#94a3b8;font-size:13px">This link expires in <strong>7 days</strong>. If you did not expect this email, you can safely ignore it.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
        <p style="color:#94a3b8;font-size:12px;margin:0">— Diamond Accounts Tax Team<br/>
          <a href="https://diamondaccounts.ca" style="color:#94a3b8">diamondaccounts.ca</a>
        </p>
      </div>
    </div>
  `;

  const textBody = [
    `Hi ${toName},`,
    "",
    "Your accounting team at Diamond Accounts has set up your client portal.",
    "Setting your password is step 1 of 3:",
    "",
    "  1. Set your password using the link below.",
    "  2. Log in — you'll be taken straight to your on-boarding form.",
    "  3. Complete on-boarding, then upload the documents we've requested.",
    "",
    "Step 1 — set your password here:",
    inviteUrl,
    "",
    `After that, log in from the Diamond Accounts mobile app or your browser at ${WEB_PORTAL_URL}`,
    "",
    "This link expires in 7 days.",
    "",
    "— Diamond Accounts Tax Team",
    "https://diamondaccounts.ca",
  ].join("\n");

  console.log(`  📧  Sending invite email via SES → ${toEmail}`);

  try {
    const cmd = new SendEmailCommand({
      Source: `${env.SES_FROM_NAME} <${env.SES_FROM_EMAIL}>`,
      Destination: { ToAddresses: [toEmail] },
      Message: {
        Subject: { Data: "You've been invited to Diamond Accounts Tax" },
        Body: {
          Html: { Data: htmlBody, Charset: "UTF-8" },
          Text: { Data: textBody, Charset: "UTF-8" },
        },
      },
    });

    const result = await ses.send(cmd);
    console.log(`  ✅  SES delivered — MessageId: ${result.MessageId}`);
    return result;
  } catch (err) {
    console.error(`  ❌  SES failed for ${toEmail}:`, err.message);
    throw err;
  }
}

async function sendClientTakeOnCompletedEmail({
  clientName,
  clientEmail,
  submittedAt,
  toEmail = "admin@diamondaccounts.ca",
}) {
  const when = submittedAt ? new Date(submittedAt).toLocaleString() : new Date().toLocaleString();
  const htmlBody = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <div style="background:#4f46e5;padding:20px 24px;border-radius:8px 8px 0 0">
        <h1 style="color:#fff;margin:0;font-size:20px">Diamond Accounts Tax</h1>
      </div>
      <div style="background:#f8fafc;padding:32px 24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none">
        <h2 style="color:#1e293b;margin-top:0">Client Take-On Completed</h2>
        <p style="color:#475569">A client take-on form has just been marked as completed.</p>
        <ul style="color:#475569;line-height:1.6">
          <li><strong>Client Name:</strong> ${clientName || "-"}</li>
          <li><strong>Client Email:</strong> ${clientEmail || "-"}</li>
          <li><strong>Completed At:</strong> ${when}</li>
        </ul>
      </div>
    </div>
  `;

  const textBody = [
    "Client Take-On Completed",
    "",
    `Client Name: ${clientName || "-"}`,
    `Client Email: ${clientEmail || "-"}`,
    `Completed At: ${when}`,
  ].join("\n");

  const cmd = new SendEmailCommand({
    Source: `${env.SES_FROM_NAME} <${env.SES_FROM_EMAIL}>`,
    Destination: { ToAddresses: [toEmail] },
    Message: {
      Subject: { Data: "Client Take-On Completed" },
      Body: {
        Html: { Data: htmlBody, Charset: "UTF-8" },
        Text: { Data: textBody, Charset: "UTF-8" },
      },
    },
  });

  return ses.send(cmd);
}

async function sendOnboardingCompletedEmail({ clientName, clientEmail, submittedAt, toEmails }) {
  const when = submittedAt ? new Date(submittedAt).toLocaleString() : new Date().toLocaleString();
  const htmlBody = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <div style="background:#4f46e5;padding:20px 24px;border-radius:8px 8px 0 0">
        <h1 style="color:#fff;margin:0;font-size:20px">Diamond Accounts Tax</h1>
      </div>
      <div style="background:#f8fafc;padding:32px 24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none">
        <h2 style="color:#1e293b;margin-top:0">On-Boarding Details Submitted</h2>
        <p style="color:#475569">A client has just completed their On-Boarding Details form.</p>
        <ul style="color:#475569;line-height:1.6">
          <li><strong>Client Name:</strong> ${clientName || "-"}</li>
          <li><strong>Client Email:</strong> ${clientEmail || "-"}</li>
          <li><strong>Submitted At:</strong> ${when}</li>
        </ul>
      </div>
    </div>
  `;
  const textBody = [
    "On-Boarding Details Submitted",
    "",
    `Client Name: ${clientName || "-"}`,
    `Client Email: ${clientEmail || "-"}`,
    `Submitted At: ${when}`,
  ].join("\n");

  const cmd = new SendEmailCommand({
    Source: `${env.SES_FROM_NAME} <${env.SES_FROM_EMAIL}>`,
    Destination: { ToAddresses: toEmails },
    Message: {
      Subject: { Data: "On-Boarding Details Submitted" },
      Body: { Html: { Data: htmlBody, Charset: "UTF-8" }, Text: { Data: textBody, Charset: "UTF-8" } },
    },
  });
  return ses.send(cmd);
}

async function sendTaskChangeNotification({
  toEmail,
  clientName,
  taskTitle,
  taskType,
  action, // human-readable, e.g. "marked complete" / "submitted"
}) {
  const htmlBody = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <div style="background:#4f46e5;padding:20px 24px;border-radius:8px 8px 0 0">
        <h1 style="color:#fff;margin:0;font-size:20px">Diamond Accounts Tax</h1>
      </div>
      <div style="background:#f8fafc;padding:32px 24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none">
        <h2 style="color:#1e293b;margin-top:0">A client task was ${action}</h2>
        <ul style="color:#475569;line-height:1.6">
          <li><strong>Client:</strong> ${clientName || "-"}</li>
          <li><strong>Task:</strong> ${taskTitle || "-"}</li>
          <li><strong>Task Type:</strong> ${taskType || "-"}</li>
        </ul>
      </div>
    </div>
  `;

  const textBody = [
    `A client task was ${action}`,
    "",
    `Client: ${clientName || "-"}`,
    `Task: ${taskTitle || "-"}`,
    `Task Type: ${taskType || "-"}`,
  ].join("\n");

  const cmd = new SendEmailCommand({
    Source: `${env.SES_FROM_NAME} <${env.SES_FROM_EMAIL}>`,
    Destination: { ToAddresses: Array.isArray(toEmail) ? toEmail : [toEmail] },
    Message: {
      Subject: { Data: `[${taskType || "Task"}] ${taskTitle || "Task"} — ${action}` },
      Body: {
        Html: { Data: htmlBody, Charset: "UTF-8" },
        Text: { Data: textBody, Charset: "UTF-8" },
      },
    },
  });

  return ses.send(cmd);
}

// Data request / chaser email — sent to the CLIENT asking them to provide the
// information/documents for a recurring task (bookkeeping, etc). isChaser
// distinguishes the first request from reminders for subject-line clarity.
async function sendDataRequestEmail({ toEmail, clientName, taskTitle, taskType, isChaser }) {
  const heading = isChaser ? "Reminder: We're still waiting on your information" : "We need your information";
  const htmlBody = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <div style="background:#4f46e5;padding:20px 24px;border-radius:8px 8px 0 0">
        <h1 style="color:#fff;margin:0;font-size:20px">Diamond Accounts Tax</h1>
      </div>
      <div style="background:#f8fafc;padding:32px 24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none">
        <h2 style="color:#1e293b;margin-top:0">${heading}</h2>
        <p style="color:#475569">Hi ${clientName || "there"},</p>
        <p style="color:#475569">
          ${isChaser
            ? `This is a reminder that we still need your information for <strong>${taskTitle || taskType}</strong> to continue your bookkeeping.`
            : `Please provide your information/documents for <strong>${taskTitle || taskType}</strong> so we can proceed with your bookkeeping.`}
        </p>
        <p style="color:#475569;font-size:13px">Log in to your client portal to upload what's needed.</p>
      </div>
    </div>
  `;
  const textBody = `${heading}\n\nHi ${clientName || "there"},\n\n${isChaser
    ? `This is a reminder that we still need your information for ${taskTitle || taskType}.`
    : `Please provide your information/documents for ${taskTitle || taskType}.`}`;

  const cmd = new SendEmailCommand({
    Source: `${env.SES_FROM_NAME} <${env.SES_FROM_EMAIL}>`,
    Destination: { ToAddresses: [toEmail] },
    Message: {
      Subject: { Data: `${isChaser ? "Reminder: " : ""}Information Needed — ${taskTitle || taskType}` },
      Body: { Html: { Data: htmlBody, Charset: "UTF-8" }, Text: { Data: textBody, Charset: "UTF-8" } },
    },
  });
  return ses.send(cmd);
}

// Admin flagged a General Documentation upload as needing to be re-sent
// (wrong document, unreadable scan, etc.) — tells the client which document
// and, if given, why.
async function sendReuploadRequestEmail({ toEmail, clientName, fieldName, reason }) {
  const htmlBody = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <div style="background:#4f46e5;padding:20px 24px;border-radius:8px 8px 0 0">
        <h1 style="color:#fff;margin:0;font-size:20px">Diamond Accounts Tax</h1>
      </div>
      <div style="background:#f8fafc;padding:32px 24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none">
        <h2 style="color:#1e293b;margin-top:0">Please re-send a document</h2>
        <p style="color:#475569">Hi ${clientName || "there"},</p>
        <p style="color:#475569">
          We need you to upload <strong>${fieldName}</strong> again — the copy we have isn't usable.
        </p>
        ${reason ? `<p style="color:#475569"><strong>Note from our team:</strong> ${reason}</p>` : ""}
        <p style="color:#475569;font-size:13px">Log in to your client portal to upload the replacement.</p>
      </div>
    </div>
  `;
  const textBody = `Please re-send a document\n\nHi ${clientName || "there"},\n\nWe need you to upload ${fieldName} again — the copy we have isn't usable.${reason ? `\n\nNote from our team: ${reason}` : ""}`;

  const cmd = new SendEmailCommand({
    Source: `${env.SES_FROM_NAME} <${env.SES_FROM_EMAIL}>`,
    Destination: { ToAddresses: [toEmail] },
    Message: {
      Subject: { Data: `Action needed — please re-send ${fieldName}` },
      Body: { Html: { Data: htmlBody, Charset: "UTF-8" }, Text: { Data: textBody, Charset: "UTF-8" } },
    },
  });
  return ses.send(cmd);
}

// Reminder that a query or HST return sent to the client for response/approval
// is still awaiting their reply.
async function sendQueryReminderEmail({ toEmail, clientName, taskTitle, taskType, isApproval }) {
  const subject = isApproval ? `Reminder: HST Return Awaiting Your Approval` : `Reminder: Query Awaiting Your Response`;
  const htmlBody = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <div style="background:#4f46e5;padding:20px 24px;border-radius:8px 8px 0 0">
        <h1 style="color:#fff;margin:0;font-size:20px">Diamond Accounts Tax</h1>
      </div>
      <div style="background:#f8fafc;padding:32px 24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none">
        <h2 style="color:#1e293b;margin-top:0">${subject}</h2>
        <p style="color:#475569">Hi ${clientName || "there"},</p>
        <p style="color:#475569">
          ${isApproval
            ? `We sent your <strong>${taskTitle || taskType}</strong> HST return for approval and haven't heard back yet. Please review and approve at your earliest convenience.`
            : `We sent you a query regarding <strong>${taskTitle || taskType}</strong> and haven't received a response yet.`}
        </p>
        <p style="color:#475569;font-size:13px">Log in to your client portal to respond.</p>
      </div>
    </div>
  `;
  const textBody = `${subject}\n\nHi ${clientName || "there"},\n\n${isApproval
    ? `We sent your ${taskTitle || taskType} HST return for approval and haven't heard back yet.`
    : `We sent you a query regarding ${taskTitle || taskType} and haven't received a response yet.`}`;

  const cmd = new SendEmailCommand({
    Source: `${env.SES_FROM_NAME} <${env.SES_FROM_EMAIL}>`,
    Destination: { ToAddresses: [toEmail] },
    Message: {
      Subject: { Data: subject },
      Body: { Html: { Data: htmlBody, Charset: "UTF-8" }, Text: { Data: textBody, Charset: "UTF-8" } },
    },
  });
  return ses.send(cmd);
}

// ── S3 ────────────────────────────────────────────────────────────────────────

async function getPresignedUploadUrl({ bucket, key, contentType, expiresIn }) {
  const cmd = new PutObjectCommand({
    Bucket: bucket || env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, cmd, { expiresIn: expiresIn || env.S3_PRESIGN_EXPIRY });
}

// All files for this admin app are scoped under "taxease-admin/" prefix
// so they never collide with other apps using the same S3 bucket.
function buildS3Key({ clientId, taskId, fieldId, fileName }) {
  const ts = Date.now();
  const safe = (fileName || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
  const parts = ["taxease-admin", clientId, taskId, fieldId, `${ts}_${safe}`].filter(Boolean);
  return parts.join("/");
}

async function getDownloadUrl({ bucket, key, expiresIn = 3600, forceDownload = false, fileName }) {
  const cmd = new GetObjectCommand({
    Bucket: bucket || env.S3_BUCKET,
    Key: key,
    // "View" wants the browser to render inline (PDFs/images); "Download" wants
    // a Save-As prompt regardless of type — S3 honours this per-request via
    // ResponseContentDisposition, no change to the stored object needed.
    ...(forceDownload ? { ResponseContentDisposition: `attachment; filename="${(fileName || "file").replace(/"/g, "")}"` } : {}),
  });
  return getSignedUrl(s3, cmd, { expiresIn });
}

async function putObject({ bucket, key, body, contentType }) {
  const cmd = new PutObjectCommand({
    Bucket: bucket || env.S3_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  return s3.send(cmd);
}

module.exports = {
  ses,
  s3,
  sendInviteEmail,
  sendClientTakeOnCompletedEmail,
  sendOnboardingCompletedEmail,
  sendTaskChangeNotification,
  sendDataRequestEmail,
  sendReuploadRequestEmail,
  sendQueryReminderEmail,
  getPresignedUploadUrl,
  getDownloadUrl,
  putObject,
  buildS3Key,
};
