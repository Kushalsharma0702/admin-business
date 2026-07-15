// config/env.js — validate required environment variables at startup
require("dotenv").config();

const required = [
  "DATABASE_URL",
  "JWT_SECRET",
  "FRONTEND_URL",
];

const missing = required.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`\n  ❌  Missing required environment variables:\n  ${missing.join(", ")}\n`);
  console.error("  Copy .env.example to .env and fill in the values.\n");
  process.exit(1);
}

module.exports = {
  DATABASE_URL:        process.env.DATABASE_URL,
  NODE_ENV:            process.env.NODE_ENV || "development",
  PORT:                Number(process.env.PORT) || 3001,
  FRONTEND_URL:        process.env.FRONTEND_URL,
  JWT_SECRET:          process.env.JWT_SECRET,
  JWT_EXPIRES_IN:      process.env.JWT_EXPIRES_IN || "24h",
  AWS_REGION:          process.env.AWS_REGION        || "ca-central-1",
  AWS_ACCESS_KEY_ID:   process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  S3_BUCKET:           process.env.S3_BUCKET         || process.env.S3_BUCKET_NAME || "taxease-documents-prod",
  S3_PRESIGN_EXPIRY:   Number(process.env.S3_PRESIGN_EXPIRY) || 3600,
  SES_FROM_EMAIL:      process.env.SES_FROM_EMAIL     || "no-reply@diamondaccounts.ca",
  SES_FROM_NAME:       process.env.SES_FROM_NAME      || process.env.SENDER_NAME || "Diamond Accounts Tax",
};
