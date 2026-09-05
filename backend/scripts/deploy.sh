#!/bin/bash
# scripts/deploy.sh — deploy this backend and verify it actually works before
# declaring victory, instead of finding out from a client's support ticket.
#
# Run this ON THE PRODUCTION SERVER, from /home/ubuntu/admin-business/backend:
#   bash scripts/deploy.sh
#
# IMPORTANT — there are (at least) two EC2 hosts with a copy of this backend:
#   - 15.223.66.58   (this one) runs admin-business-api.service on :3001,
#     which is what nginx actually proxies adminbusiness.diamondaccounts.ca
#     /api/ to. THIS is production. Confirmed 2026-09-04 by reading nginx's
#     sites-enabled directly — do not assume from memory, re-check if this
#     ever seems to disagree with what you observe.
#   - 16.52.210.136 also runs a copy under pm2, but is NOT in nginx's proxy
#     path for any current site config on 15.223.66.58. Deploying there alone
#     changes nothing for real users. What that host actually is has not been
#     established — do not treat it as a deploy target until that's resolved.
#
# What it does:
#   1. If this directory is a git checkout, pull the latest main.
#      (It currently is NOT — see the note below.)
#   2. Restart via systemd (sudo systemctl restart admin-business-api).
#   3. Wait for it to come up.
#   4. Run scripts/smoke-test.js, which drives a disposable test client through
#      invite -> accept-invite -> login -> customer-type against the real
#      production stack, then deletes it.
#   5. Exit non-zero if ANY of the above failed.
#
# ── Why step 1 is conditional ────────────────────────────────────────────────
# /home/ubuntu/admin-business/backend is not a git checkout today — code has
# been getting here via `scp`, so there is no local history and no way to know
# what SHA is actually running. That's worth fixing (`git clone` the repo here
# once, then every future deploy is a real `git pull`), but this script does
# not do that automatically: turning a live production directory into a fresh
# git checkout needs a deliberate one-time decision, not something a deploy
# script silently does the first time it runs.

set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."   # -> /home/ubuntu/admin-business/backend

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

echo "── 1/4  pull ──────────────────────────────────────────────"
if [ -d .git ]; then
  git pull --ff-only origin main || { echo -e "${RED}git pull failed${NC}"; exit 1; }
else
  echo -e "${YELLOW}Not a git checkout — skipping pull. Deploy your changes via scp before running this script.${NC}"
fi

echo ""
echo "── 2/4  restart ───────────────────────────────────────────"
sudo systemctl restart admin-business-api || { echo -e "${RED}systemctl restart failed${NC}"; exit 1; }

echo ""
echo "── 3/4  wait for it to come up ────────────────────────────"
up=0
for i in $(seq 1 15); do
  if curl -s "http://127.0.0.1:${PORT:-3001}/api/auth/invite-info/healthcheck-nonexistent-token" \
       -o /dev/null -w "%{http_code}" 2>/dev/null | grep -qE "^(200|404)$"; then
    up=1; break
  fi
  sleep 1
done
if [ "$up" -ne 1 ]; then
  echo -e "${RED}Service did not respond within 15s — check: sudo journalctl -u admin-business-api -n 50 --no-pager${NC}"
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
