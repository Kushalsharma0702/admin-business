/**
 * TaxEase Backend — Main Entry Point
 *
 * Port: 3001
 * Client API:  /v3/api/v1/*
 * Admin API:   /api/admin/*
 * Auth:        /api/auth/*
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { initSchema } from "./schema";
import auth from "./routes/auth";
import clientTasks from "./routes/client-tasks";
import clientDocuments from "./routes/client-documents";
import clientPayroll from "./routes/client-payroll";
import adminRoutes from "./routes/admin";

// Initialise DB schema on startup (idempotent)
initSchema();

const app = new Hono();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Authorization", "Content-Type"],
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  }),
);
app.use("*", logger());

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/", (c) =>
  c.json({
    name: "TaxEase API",
    version: "1.0.0",
    status: "running",
    baseUrl: "http://localhost:3001",
    routes: {
      auth: "/api/auth/login",
      clientApi: "/v3/api/v1/",
      adminApi: "/api/admin/",
    },
  }),
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
app.route("/api/auth", auth);

// ─── Client-facing API  (matches Flutter app's base URL path) ─────────────────
app.route("/v3/api/v1/tasks", clientTasks);
app.route("/v3/api/v1/documents", clientDocuments);
app.route("/v3/api/v1/payroll", clientPayroll);

// ─── Admin API ────────────────────────────────────────────────────────────────
app.route("/api/admin", adminRoutes);

// ─── 404 fallback ─────────────────────────────────────────────────────────────
app.notFound((c) => c.json({ success: false, message: "Route not found" }, 404));

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 3001);

export default {
  port: PORT,
  fetch: app.fetch,
};

console.log(`\n  TaxEase Backend running on http://localhost:${PORT}`);
console.log(`  Health:     GET  http://localhost:${PORT}/`);
console.log(`  Auth:       POST http://localhost:${PORT}/api/auth/login`);
console.log(`  Client API: GET  http://localhost:${PORT}/v3/api/v1/tasks`);
console.log(`  Admin API:  GET  http://localhost:${PORT}/api/admin/dashboard\n`);
