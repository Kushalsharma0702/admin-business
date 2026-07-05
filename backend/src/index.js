// index.js — TaxEase Backend Entry Point (PostgreSQL edition)
require("./config/env");
const express = require("express");
const cors = require("cors");

const app = express();

// Middleware
const allowedOrigins = process.env.NODE_ENV === "production"
  ? [
      "https://adminbusiness.diamondaccounts.ca",  // admin panel frontend
      "https://apibusiness.diamondaccounts.ca",     // API domain (Swagger UI, direct calls)
      "https://tax.diamondaccounts.ca",             // client mobile web
    ]
  : true; // allow all in dev

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET","POST","PATCH","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Logger
app.use((req, _, next) => {
  console.log(`${new Date().toISOString()}  ${req.method}  ${req.path}`);
  next();
});

// Swagger UI
require("./swagger").setupSwagger(app);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",            require("./routes/auth"));
app.use("/api/admin",           require("./routes/admin"));
app.use("/api/admin/templates", require("./routes/admin-templates"));
app.use("/api/admin/submissions", require("./routes/admin-submissions"));

const { adminRouter: adminS3, clientRouter: clientS3 } = require("./routes/admin-s3");
app.use("/api/admin/s3",        adminS3);
app.use("/v3/api/v1/s3",        clientS3);

const { adminRouter: adminGenDocs, clientRouter: clientGenDocs } = require("./routes/general-docs");
app.use("/api/admin",           adminGenDocs);
app.use("/v3/api/v1/general-docs", clientGenDocs);

const { adminRouter: adminProfiles, clientRouter: clientProfiles } = require("./routes/profiles");
app.use("/api/admin",              adminProfiles);
app.use("/v3/api/v1/profiles",     clientProfiles);

// Client auth — customer-type lookup for Flutter post-login
app.use("/v3/api/v1/auth",     require("./routes/client-auth"));

// Client routes (kept on same paths for mobile app compatibility)
app.use("/v3/api/v1/tasks",     require("./routes/client-tasks"));
app.use("/v3/api/v1",           require("./routes/client-forms"));
app.use("/v3/api/v1/documents", require("./routes/client-documents"));
app.use("/v3/api/v1/payroll",   require("./routes/client-payroll"));

// Health check — used by nginx, PM2, and load balancers
app.get("/health", (_, res) => res.json({
  status: "ok", uptime: process.uptime(), ts: Date.now(),
}));

app.get("/", (_, res) => res.json({
  name: "Diamond Accounts Tax API", version: "2.0.0", status: "running",
  docs: "/api-docs",
  database: "PostgreSQL",
}));

app.use((_, res) => res.status(404).json({ success: false, message: "Route not found" }));

// Global error handler
app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ success: false, message: "Internal server error" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n  TaxEase Backend v2.0  →  http://localhost:${PORT}`);
  console.log(`  Swagger UI            →  http://localhost:${PORT}/api-docs`);
  console.log(`  Database              →  PostgreSQL`);
  console.log("  ────────────────────────────────────────────");
  console.log("  POST http://localhost:3001/api/auth/login");
  console.log("  POST http://localhost:3001/api/auth/accept-invite");
  console.log("  GET  http://localhost:3001/api/admin/templates\n");
});
