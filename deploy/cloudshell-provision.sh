#!/usr/bin/env bash
# ============================================================
# cloudshell-provision.sh
# Run this ONCE inside AWS CloudShell (ca-central-1 region).
# It creates the EC2, security group, Elastic IP, and key pair.
#
# HOW TO RUN:
#   1. Open AWS Console → click the CloudShell icon (top toolbar)
#   2. Make sure region is set to ca-central-1 (top-right dropdown)
#   3. Paste and run:
#        curl -fsSL https://raw.githubusercontent.com/<YOUR_REPO>/main/deploy/cloudshell-provision.sh | bash
#      OR upload this file and run:
#        bash cloudshell-provision.sh
# ============================================================
set -euo pipefail

REGION="ca-central-1"
VPC_ID="vpc-09c5385689739c36b"
SUBNET_ID="subnet-07deabfec7fa0c328"   # ca-central-1a
AMI_ID="ami-0c2a8e8153d22e023"         # Ubuntu 22.04 LTS (latest as of Jun 2026)
INSTANCE_TYPE="t3.small"               # 2 vCPU 2GB ~$15/mo
KEY_NAME="taxease-admin-business"
SG_NAME="taxease-admin-business"
INSTANCE_NAME="taxease-admin-business"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  Diamond Accounts — Admin Business EC2 Setup    ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── 1. Create Key Pair ────────────────────────────────────────────────────────
echo "→ [1/5] Creating key pair '$KEY_NAME'..."
if aws ec2 describe-key-pairs --key-names "$KEY_NAME" --region $REGION &>/dev/null; then
    echo "  ℹ  Key pair already exists — skipping."
else
    aws ec2 create-key-pair \
        --key-name "$KEY_NAME" \
        --region $REGION \
        --query 'KeyMaterial' \
        --output text > ~/${KEY_NAME}.pem
    chmod 400 ~/${KEY_NAME}.pem
    echo "  ✅  Key saved to ~/${KEY_NAME}.pem"
    echo "  ⚠   DOWNLOAD THIS FILE NOW from CloudShell → Actions → Download file"
    echo "      Path: /root/${KEY_NAME}.pem"
fi

# ── 2. Security Group ─────────────────────────────────────────────────────────
echo ""
echo "→ [2/5] Creating security group..."
SG_ID=$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=$SG_NAME" "Name=vpc-id,Values=$VPC_ID" \
    --query 'SecurityGroups[0].GroupId' --output text --region $REGION 2>/dev/null || echo "None")

if [ "$SG_ID" = "None" ] || [ -z "$SG_ID" ]; then
    SG_ID=$(aws ec2 create-security-group \
        --group-name "$SG_NAME" \
        --description "Admin Business Panel - HTTP HTTPS SSH" \
        --vpc-id $VPC_ID \
        --region $REGION \
        --query 'GroupId' --output text)

    # SSH — restrict to YOUR IP for security (open here; tighten manually later)
    aws ec2 authorize-security-group-ingress --group-id $SG_ID --region $REGION \
        --ip-permissions \
        'IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges=[{CidrIp=0.0.0.0/0,Description="SSH"}]' \
        'IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges=[{CidrIp=0.0.0.0/0,Description="HTTP"}]' \
        'IpProtocol=tcp,FromPort=443,ToPort=443,IpRanges=[{CidrIp=0.0.0.0/0,Description="HTTPS"}]' &>/dev/null

    aws ec2 create-tags --resources $SG_ID --region $REGION \
        --tags Key=Name,Value=$SG_NAME
    echo "  ✅  Security group: $SG_ID"
else
    echo "  ℹ  Security group already exists: $SG_ID"
fi

# ── 3. Launch EC2 with cloud-init ─────────────────────────────────────────────
echo ""
echo "→ [3/5] Launching EC2 instance ($INSTANCE_TYPE, Ubuntu 22.04)..."

# cloud-init script bootstraps the server automatically on first boot
USER_DATA=$(cat <<'USERDATA'
#!/bin/bash
set -e
export DEBIAN_FRONTEND=noninteractive

# System packages
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx git curl build-essential fail2ban ufw

# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - -qq
apt-get install -y nodejs

# PM2
npm install -g pm2 --silent

# App directories
mkdir -p /var/www/taxease/frontend
mkdir -p /var/www/taxease/backend
mkdir -p /var/www/taxease/logs
chown -R ubuntu:ubuntu /var/www/taxease

# Firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

# fail2ban
cat > /etc/fail2ban/jail.local <<'EOF'
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5
[sshd]
enabled = true
[nginx-limit-req]
enabled  = true
filter   = nginx-limit-req
logpath  = /var/log/nginx/error.log
maxretry = 10
EOF
systemctl enable fail2ban && systemctl start fail2ban

# Temporary nginx (needed for certbot challenge later)
cat > /etc/nginx/sites-available/taxease-admin-business <<'EOF'
server {
    listen 80;
    server_name adminbusiness.diamondaccounts.ca apibusiness.diamondaccounts.ca;
    root /var/www/html;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 200 "Taxease admin-business - setup in progress"; }
}
EOF
ln -sf /etc/nginx/sites-available/taxease-admin-business /etc/nginx/sites-enabled/taxease-admin-business
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# sysctl tuning
echo "net.core.somaxconn = 1024" >> /etc/sysctl.conf
echo "net.ipv4.tcp_tw_reuse = 1" >> /etc/sysctl.conf
sysctl -p

# Signal ready
echo "BOOTSTRAP_DONE" > /tmp/bootstrap.status
USERDATA
)

INSTANCE_ID=$(aws ec2 run-instances \
    --image-id $AMI_ID \
    --instance-type $INSTANCE_TYPE \
    --key-name "$KEY_NAME" \
    --security-group-ids $SG_ID \
    --subnet-id $SUBNET_ID \
    --region $REGION \
    --user-data "$USER_DATA" \
    --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":20,"VolumeType":"gp3","DeleteOnTermination":true}}]' \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME},{Key=Project,Value=diamond-accounts},{Key=App,Value=admin-business}]" \
    --metadata-options "HttpTokens=required,HttpEndpoint=enabled" \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "  ✅  Instance launched: $INSTANCE_ID"
echo "  ⏳  Waiting for instance to be running..."
aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $REGION
echo "  ✅  Instance is running"

# ── 4. Elastic IP ─────────────────────────────────────────────────────────────
echo ""
echo "→ [4/5] Allocating Elastic IP..."
ALLOC_ID=$(aws ec2 allocate-address \
    --domain vpc \
    --region $REGION \
    --tag-specifications "ResourceType=elastic-ip,Tags=[{Key=Name,Value=$INSTANCE_NAME}]" \
    --query 'AllocationId' --output text)

ELASTIC_IP=$(aws ec2 describe-addresses \
    --allocation-ids $ALLOC_ID \
    --region $REGION \
    --query 'Addresses[0].PublicIp' --output text)

aws ec2 associate-address \
    --instance-id $INSTANCE_ID \
    --allocation-id $ALLOC_ID \
    --region $REGION &>/dev/null

echo "  ✅  Elastic IP: $ELASTIC_IP  (attached to $INSTANCE_ID)"

# ── 5. Summary ────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ✅  PROVISIONING COMPLETE                                   ║"
echo "╠══════════════════════════════════════════════════════════════╣"
printf "║  Instance ID : %-47s ║\n" "$INSTANCE_ID"
printf "║  Elastic IP  : %-47s ║\n" "$ELASTIC_IP"
printf "║  Key file    : %-47s ║\n" "~/${KEY_NAME}.pem  (download from CloudShell)"
printf "║  Region      : %-47s ║\n" "$REGION"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  NEXT STEPS:                                                 ║"
echo "║                                                              ║"
echo "║  1. Download key from CloudShell → Actions → Download file   ║"
printf "║     Path: /root/%s.pem%-33s ║\n" "$KEY_NAME" ""
echo "║                                                              ║"
echo "║  2. Add BOTH DNS A records in Hostinger:                     ║"
printf "║     adminbusiness  →  %-41s ║\n" "$ELASTIC_IP"
printf "║     apibusiness    →  %-41s ║\n" "$ELASTIC_IP"
echo "║                                                              ║"
echo "║  3. Wait ~5 min for DNS, then run from your local machine:   ║"
echo "║     bash deploy/deploy.sh                                    ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "ELASTIC_IP=$ELASTIC_IP" > ~/taxease-admin-business-info.txt
echo "INSTANCE_ID=$INSTANCE_ID" >> ~/taxease-admin-business-info.txt
echo "KEY_FILE=~/${KEY_NAME}.pem" >> ~/taxease-admin-business-info.txt
echo "Info saved to ~/taxease-admin-business-info.txt"
