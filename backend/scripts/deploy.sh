#!/bin/bash
# scripts/deploy.sh — deploy this backend and verify it actually works before
# declaring victory, instead of finding out from a client's support ticket.
#
# Run this ON THE SERVER (16.52.210.136), from /var/www/taxease/backend:
#   bash scripts/deploy.sh
#
# What it does:
#   1. If this directory is a git checkout, pull the latest main.
#      (It currently is NOT — see the note below.)
#   2. Restart the pm2 process.
#   3. Wait for it to come up.
#   4. Run scripts/smoke-test.js, which drives a disposable test client through
#      invite -> accept-invite -> login -> customer-type against the real
#      production stack (this server AND the Python services on the other
#      host), then deletes it.
#   5. Exit non-zero if ANY of the above failed, so this composes with a CI
#      step or a human just reading $?.
#
# ── Why step 1 is conditional ────────────────────────────────────────────────
# /var/www/taxease/backend is not a git checkout today — code has been getting
# here via `scp`, so there is no local history and no way to know what SHA is
# actually running. That's worth fixing (`git clone` the repo here once, then
# every future deploy is a real `git pull`), but this script does not do that
# automatically: turning a live production directory into a fresh git checkout
# needs a deliberate one-time decision, not something a deploy script silently
# does the first time it runs.
#
# Until that happens, step 1 is skipped with a warning and you keep deploying
# by scp — this script still restarts + verifies whatever you just copied in.

set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."   # -> /var/www/taxease/backend

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
fail=0

echo "── 1/4  pull ──────────────────────────────────────────────"
if [ -d .git ]; then
  git pull --ff-only origin main || { echo -e "${RED}git pull failed${NC}"; exit 1; }
else
  echo -e "${YELLOW}Not a git checkout — skipping pull. Deploy your changes via scp before running this script.${NC}"
fi

echo ""
echo "── 2/4  restart ───────────────────────────────────────────"
pm2 restart taxease-api || { echo -e "${RED}pm2 restart failed${NC}"; exit 1; }

echo ""
echo "── 3/4  wait for it to come up ────────────────────────────"
up=0
for i in $(seq 1 15); do
  if curl -sf "http://127.0.0.1:${PORT:-3001}/api/auth/invite-info/healthcheck-nonexistent-token" \
       -o /dev/null -w "%{http_code}" 2>/dev/null | grep -qE "^(200|404)$"; then
    up=1; break
  fi
  sleep 1
done
if [ "$up" -ne 1 ]; then
  echo -e "${RED}Service did not respond within 15s — check: pm2 logs taxease-api${NC}"
  exit 1
fi
echo "  up."

echo ""
echo "── 4/4  smoke test (full stack, disposable test client) ────"
node scripts/smoke-test.js
smoke_status=$?

echo ""
if [ "$smoke_status" -eq 0 ]; then
  echo -e "${GREEN}DEPLOY OK — all checks passed.${NC}"
else
  echo -e "${RED}DEPLOY VERIFICATION FAILED — see the failed checks above.${NC}"
  echo -e "${YELLOW}The service is running; the smoke test caught a real problem in the code path it just tested. Do not consider this deploy done.${NC}"
fi
exit "$smoke_status"
