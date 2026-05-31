// index.js — TaxEase Backend Entry Point
const express = require("express");
const cors = require("cors");
const { initSchema } = require("./schema");

// Init DB schema
initSchema();

const app = express();

// Middleware
app.use(cors({ origin: "*", methods: ["GET","POST","PATCH","PUT","DELETE","OPTIONS"] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger
app.use((req, _, next) => {
  console.log(`${new Date().toISOString()}  ${req.method}  ${req.path}`);
  next();
});

// Swagger UI
require("./swagger").setupSwagger(app);

// Routes
app.use("/api/auth",            require("./routes/auth"));
app.use("/v3/api/v1/tasks",     require("./routes/client-tasks"));
app.use("/v3/api/v1/documents", require("./routes/client-documents"));
app.use("/v3/api/v1/payroll",   require("./routes/client-payroll"));
app.use("/api/admin",           require("./routes/admin"));

// Health check
app.get("/", (_, res) => res.json({
  name: "TaxEase API", version: "1.0.0", status: "running",
  docs: "http://localhost:3001/api-docs",
  openapi: "http://localhost:3001/api-docs.json",
  routes: {
    auth:      "POST /api/auth/login",
    me:        "GET  /api/auth/me",
    tasks:     "GET  /v3/api/v1/tasks          (client JWT)",
    documents: "POST /v3/api/v1/documents/upload (client JWT)",
    payroll:   "GET  /v3/api/v1/payroll/employees (client JWT)",
    adminDash: "GET  /api/admin/dashboard       (admin JWT)",
    adminMeta: "GET  /api/admin/meta/admin-statuses",
  },
}));

app.use((_, res) => res.status(404).json({ success: false, message: "Route not found" }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n  TaxEase Backend  →  http://localhost:${PORT}`);
  console.log(`  Swagger UI       →  http://localhost:${PORT}/api-docs`);
  console.log("  ────────────────────────────────────────────");
  console.log("  POST http://localhost:3001/api/auth/login");
  console.log("  GET  http://localhost:3001/api/admin/dashboard");
  console.log("  GET  http://localhost:3001/api/admin/meta/admin-statuses");
  console.log("  GET  http://localhost:3001/v3/api/v1/tasks\n");
});
