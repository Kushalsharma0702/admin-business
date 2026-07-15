// PM2 ecosystem — manages both frontend SSR and backend API processes
// Usage:
//   pm2 start ecosystem.config.cjs
//   pm2 save
//   pm2 startup   (then run the printed command to auto-start on reboot)

module.exports = {
  apps: [
    // ── Backend API (Express + PostgreSQL) ───────────────────────────────────
    {
      name:           "taxease-api",
      script:         "src/index.js",
      cwd:            "/var/www/taxease/backend",
      interpreter:    "node",

      // Auto-restart settings
      watch:          false,
      max_memory_restart: "400M",

      // Cluster mode gives you N workers for CPU-bound load.
      // For 5k users on t3.small (2 vCPU) keep at 2.
      instances:      2,
      exec_mode:      "cluster",

      // Zero-downtime reload on deploy
      wait_ready:     true,
      listen_timeout: 10000,

      env: {
        NODE_ENV:  "production",
        PORT:      3001,
      },
    },

    // ── Frontend SSR (TanStack Start / Nitro node-server) ───────────────────
    {
      name:           "taxease-web",
      script:         "index.mjs",
      cwd:            "/var/www/taxease/frontend/server",
      interpreter:    "node",

      watch:          false,
      max_memory_restart: "300M",

      // Single instance — SSR on t3.small. Increase if you upgrade to t3.medium
      instances:      1,
      exec_mode:      "fork",

      env: {
        NODE_ENV:    "production",
        PORT:        3000,
        // SSR server-side fetch goes to the API domain
        VITE_API_BASE_URL: "https://apibusiness.diamondaccounts.ca",
      },
    },
  ],
};
