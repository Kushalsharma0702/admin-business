# Diamond Accounts Tax — AWS EC2 Deployment Guide

## Architecture (cost-optimised for ~5k users)

```
Internet → Elastic IP
              ↓
         EC2 t3.small  (~$17/mo)
         Ubuntu 22.04
              ↓
           nginx :443 (SSL)
          /          \
    :3000              :3001
  Frontend SSR      Backend API
(TanStack/Nitro)   (Express/Node)
                        ↓
              RDS PostgreSQL (existing)
              S3 taxease-documents-prod (existing)
              SES no-reply@diamondaccounts.ca (existing)
```

**Monthly cost estimate:**
| Service | Cost |
|---------|------|
| EC2 t3.small | ~$15.33/mo |
| EBS gp3 20 GB | ~$1.60/mo |
| Elastic IP | $0 (free while attached) |
| Data transfer (5k users, light) | ~$1–3/mo |
| RDS / S3 / SES | already running |
| **Total new cost** | **~$18–20/mo** |

---

## Step 1 — Launch the EC2 instance in AWS Console

1. Go to **EC2 → Launch Instance**
2. Settings:
   - **Name:** `taxease-admin-prod`
   - **AMI:** Ubuntu Server 22.04 LTS (64-bit x86)
   - **Instance type:** `t3.small` (2 vCPU, 2 GB RAM)
   - **Key pair:** create or select one → download `.pem` file
   - **Network:** default VPC, auto-assign public IP **enabled**
   - **Security Group (create new):**
     | Type | Port | Source |
     |------|------|--------|
     | SSH  | 22   | Your IP only (e.g. 203.0.113.0/32) |
     | HTTP | 80   | 0.0.0.0/0 |
     | HTTPS| 443  | 0.0.0.0/0 |
   - **Storage:** 20 GB gp3 (change from gp2 — 20% cheaper, faster)
3. Launch the instance.

4. **Allocate an Elastic IP** → EC2 → Elastic IPs → Allocate → Associate with your new instance.

5. **Point DNS** → add an A record for `adminbusiness.diamondaccounts.ca` → your Elastic IP.
   - Wait for propagation (usually 2–5 min on Route 53, up to 30 min elsewhere)

---

## Step 2 — Bootstrap the server (run once)

```bash
# Copy your key and the setup script to the server
chmod 400 ~/taxease-ec2.pem
scp -i ~/taxease-ec2.pem deploy/setup.sh ubuntu@<EC2_IP>:~/
scp -i ~/taxease-ec2.pem deploy/backend.env.production ubuntu@<EC2_IP>:~/backend.env

# SSH in and run setup
ssh -i ~/taxease-ec2.pem ubuntu@<EC2_IP>
sudo bash setup.sh
```

The script will:
- Install Node.js 22, nginx, certbot, PM2, fail2ban, UFW
- Issue a Let's Encrypt SSL certificate for `adminbusiness.diamondaccounts.ca`
- Configure firewall (only ports 22, 80, 443 open)
- Set up log rotation and auto SSL renewal

---

## Step 3 — Upload the production .env

```bash
# Still on the EC2 server:
mv ~/backend.env /var/www/taxease/backend/.env
```

---

## Step 4 — Deploy (first time and every future update)

Edit `deploy/deploy.sh` and set your EC2 IP and key path at the top, then:

```bash
# From your LOCAL machine, in the project root:
bash deploy/deploy.sh
```

This will:
1. Build the frontend with `NITRO_PRESET=node-server`
2. `rsync` frontend + backend to EC2
3. Run `npm ci` and database migrations on the server
4. Install the nginx config
5. Reload PM2 with **zero downtime**

---

## Step 5 — Enable PM2 auto-start on reboot

```bash
# On the EC2 server:
pm2 startup
# Copy and run the command it prints, e.g.:
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
pm2 save
```

---

## Useful commands (on EC2)

```bash
# View live logs
pm2 logs

# View logs for just the API
pm2 logs taxease-api

# Check status of both processes
pm2 status

# Restart everything
pm2 restart all

# Zero-downtime reload (use this on deploy)
pm2 reload all

# nginx status
sudo systemctl status nginx
sudo nginx -t          # test config
sudo systemctl reload nginx

# Check SSL expiry
sudo certbot certificates

# DB: connect to RDS
psql "postgresql://postgres:Diamondaccount321@database-1.ct2g4wqam4oi.ca-central-1.rds.amazonaws.com:5432/postgres"
```

---

## Cost-saving tips already applied

- **t3.small** not t3.medium — sufficient for ~5k registered users (tax portal has low concurrency)
- **gp3** storage not gp2 — same price, 3000 IOPS vs 100 baseline
- **Single EC2** for both frontend and backend — no load balancer needed at this scale
- **Existing RDS** reused — no new database instance
- **Let's Encrypt** — free SSL, no ACM or certificate costs
- **No NAT Gateway** — EC2 in public subnet, direct internet access

## Scaling path (when you need it)

When you exceed ~500 concurrent users:
1. Upgrade EC2 to `t3.medium` ($30/mo) — double the RAM
2. Add RDS read replica for reporting queries
3. Put CloudFront in front (free tier covers most admin traffic)
4. Split frontend to Vercel (free) — EC2 only serves the API
