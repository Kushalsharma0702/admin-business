#!/usr/bin/env bash
# deploy/deploy.sh — build locally and push to EC2
# Run from your LOCAL machine after provisioning: bash deploy/deploy.sh
set -euo pipefail

# ── CONFIG — fill in after running cloudshell-provision.sh ───────────────────
EC2_HOST="ubuntu@16.52.210.136"
EC2_KEY="$HOME/taxease-admin-business"   # private key (no .pem extension)
ADMIN_DOMAIN="adminbusiness.diamondaccounts.ca"
API_DOMAIN="apibusiness.diamondaccounts.ca"
APP_DIR="/var/www/taxease"
# ─────────────────────────────────────────────────────────────────────────────

SSH="ssh -i $EC2_KEY -o StrictHostKeyChecking=no $EC2_HOST"

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║  Diamond Accounts Admin Business — Deploy  ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# ── 1. Build frontend ─────────────────────────────────────────────────────────
echo "→ [1/6] Building frontend (nitro node-server)..."
cd "$(dirname "$0")/.."
VITE_API_BASE_URL="https://$ADMIN_DOMAIN" NITRO_PRESET=node-server npm run build
echo "  ✓ Built → .output/"

# ── 2. Upload frontend ────────────────────────────────────────────────────────
echo "→ [2/6] Uploading frontend..."
rsync -az --delete \
    -e "ssh -i $EC2_KEY -o StrictHostKeyChecking=no" \
    --exclude='.git' \
    .output/ $EC2_HOST:$APP_DIR/frontend/

# ── 3. Upload backend ─────────────────────────────────────────────────────────
echo "→ [3/6] Uploading backend..."
rsync -az --delete \
    -e "ssh -i $EC2_KEY -o StrictHostKeyChecking=no" \
    --exclude='node_modules' \
    --exclude='.env' \
    --exclude='*.db' \
    --exclude='nohup.out' \
    backend/ $EC2_HOST:$APP_DIR/backend/

# ── 4. Upload nginx config + PM2 ecosystem ────────────────────────────────────
echo "→ [4/6] Uploading configs..."
scp -i $EC2_KEY -o StrictHostKeyChecking=no \
    deploy/nginx.conf $EC2_HOST:/tmp/nginx-admin-business.conf
scp -i $EC2_KEY -o StrictHostKeyChecking=no \
    deploy/ecosystem.config.cjs $EC2_HOST:$APP_DIR/ecosystem.config.cjs

# ── 5. Remote: install + SSL + start ─────────────────────────────────────────
echo "→ [5/6] Setting up server..."
$SSH bash << REMOTE
set -e

echo "  → Installing backend dependencies..."
cd $APP_DIR/backend
npm ci --omit=dev --silent

echo "  → Running database migrations..."
DATABASE_URL="postgresql://postgres:Diamondaccount321@database-1.ct2g4wqam4oi.ca-central-1.rds.amazonaws.com:5432/taxease_admin" \\
NODE_ENV=production \\
JWT_SECRET="txe-prod-jwt-secret-key-2026-secure-ca-central-1" \\
FRONTEND_URL="https://$ADMIN_DOMAIN" \\
npm run migrate

echo "  → Configuring nginx..."
if [ -f "/etc/letsencrypt/live/$ADMIN_DOMAIN/fullchain.pem" ]; then
    sudo cp /tmp/nginx-admin-business.conf /etc/nginx/sites-available/taxease-admin-business
    sudo nginx -t && sudo systemctl reload nginx
    echo "  ✅  HTTPS nginx config applied"
else
    # HTTP-only until DNS is live and certbot can run
    sudo tee /etc/nginx/sites-available/taxease-admin-business > /dev/null << NGINXHTTP
server {
    listen 80;
    server_name $ADMIN_DOMAIN $API_DOMAIN;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location ~ ^/(api|v3)/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 15M;
    }
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINXHTTP
    sudo mkdir -p /var/www/certbot
    sudo ln -sf /etc/nginx/sites-available/taxease-admin-business /etc/nginx/sites-enabled/taxease-admin-business
    sudo nginx -t && sudo systemctl reload nginx
    echo "  ℹ  HTTP nginx active (run certbot after DNS propagates)"
    sudo certbot --nginx -d $ADMIN_DOMAIN -d $API_DOMAIN \\
        --non-interactive --agree-tos --email no-reply@diamondaccounts.ca --redirect 2>/dev/null \\
        && sudo cp /tmp/nginx-admin-business.conf /etc/nginx/sites-available/taxease-admin-business \\
        && sudo nginx -t && sudo systemctl reload nginx \\
        && echo "  ✅  SSL issued" || echo "  ⚠  SSL skipped — add DNS A records first, then run certbot on server"
fi

echo "  → Starting/reloading PM2..."
cd $APP_DIR
if pm2 list | grep -q "taxease-api"; then
    pm2 reload ecosystem.config.cjs --update-env
else
    pm2 start ecosystem.config.cjs
    # Auto-start on reboot
    pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -1 | sudo bash || true
    pm2 save
fi

echo "  ✅  Services running"
REMOTE

# ── 6. Smoke test ─────────────────────────────────────────────────────────────
echo "→ [6/6] Smoke testing..."
sleep 3
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$API_DOMAIN/health 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
    echo "  ✅  API health check passed"
else
    echo "  ⚠  API returned HTTP $HTTP_STATUS (DNS may still be propagating)"
fi

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  ✅  DEPLOY COMPLETE                             ║"
echo "╠══════════════════════════════════════════════════╣"
printf "║  Frontend  : https://%-30s ║\n" "$ADMIN_DOMAIN"
printf "║  API       : https://%-30s ║\n" "$API_DOMAIN"
printf "║  Swagger   : https://%-36s ║\n" "$API_DOMAIN/api-docs"
echo "╚══════════════════════════════════════════════════╝"
echo ""
