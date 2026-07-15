#!/usr/bin/env bash
# deploy/setup.sh — ONE-TIME bootstrap for a fresh Ubuntu 22.04 EC2 instance
# Run as:  sudo bash setup.sh
# After this script finishes, run deploy.sh to push your code.
set -euo pipefail

DOMAIN="adminbusiness.diamondaccounts.ca"
APP_DIR="/var/www/taxease"
NODE_VERSION="22"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  Diamond Accounts Tax — EC2 Bootstrap        ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── 1. System packages ──────────────────────────────────────────────────────
echo "→ Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
    nginx certbot python3-certbot-nginx \
    git curl wget unzip \
    build-essential \
    htop logrotate ufw fail2ban

# ── 2. Node.js via nvm ──────────────────────────────────────────────────────
echo "→ Installing Node.js $NODE_VERSION..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - -qq
apt-get install -y nodejs
node -v && npm -v

# ── 3. PM2 ──────────────────────────────────────────────────────────────────
echo "→ Installing PM2..."
npm install -g pm2 --silent

# ── 4. Firewall ─────────────────────────────────────────────────────────────
echo "→ Configuring UFW firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

# ── 5. fail2ban (brute-force protection) ────────────────────────────────────
echo "→ Configuring fail2ban..."
cat > /etc/fail2ban/jail.local <<'EOF'
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled  = true
filter   = nginx-limit-req
logpath  = /var/log/nginx/error.log
maxretry = 10
EOF
systemctl enable fail2ban
systemctl start fail2ban

# ── 6. App directories ──────────────────────────────────────────────────────
echo "→ Creating app directories..."
mkdir -p "$APP_DIR/frontend"
mkdir -p "$APP_DIR/backend"
mkdir -p "$APP_DIR/logs"
chown -R ubuntu:ubuntu "$APP_DIR"

# ── 7. nginx config ─────────────────────────────────────────────────────────
echo "→ Configuring nginx..."
# Temporary HTTP-only config so Certbot can do its challenge
cat > /etc/nginx/sites-available/taxease <<NGINXEOF
server {
    listen 80;
    server_name $DOMAIN;
    root /var/www/html;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 200 "OK - TaxEase setup in progress"; }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/taxease /etc/nginx/sites-enabled/taxease
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ── 8. SSL certificate via Let's Encrypt ────────────────────────────────────
echo ""
echo "→ Obtaining SSL certificate for $DOMAIN..."
echo "  Make sure DNS A record for $DOMAIN points to this server's IP before proceeding."
echo ""
read -p "  Press ENTER when DNS is propagated (or Ctrl+C to skip SSL and do it later)..."

certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
    --email admin@diamondaccounts.ca --redirect || {
    echo "  ⚠  Certbot failed — you can run it manually later:"
    echo "     certbot --nginx -d $DOMAIN"
}

# ── 9. Full nginx config (with SSL) ─────────────────────────────────────────
echo "→ Installing full nginx config..."
# This will be overwritten by deploy.sh after certbot runs successfully

# ── 10. Auto-renew SSL (cron) ───────────────────────────────────────────────
echo "→ Setting up SSL auto-renewal..."
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -

# ── 11. Log rotation ────────────────────────────────────────────────────────
cat > /etc/logrotate.d/taxease <<'EOF'
/var/www/taxease/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# ── 12. System tuning for Node.js ───────────────────────────────────────────
cat >> /etc/sysctl.conf <<'EOF'
# Node.js performance tuning
net.core.somaxconn = 1024
net.ipv4.tcp_tw_reuse = 1
EOF
sysctl -p >/dev/null

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  Setup complete!                             ║"
echo "║  Next: run  bash deploy.sh  as ubuntu user   ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
