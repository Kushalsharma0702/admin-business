# Domain Setup + Resource Isolation Guide

## The problem this solves

You have two applications sharing the same AWS account:
| App | Purpose |
|-----|---------|
| **Flutter client app** | Client-facing mobile app (existing) |
| **This admin panel** | Internal admin dashboard (new) |

Without isolation they would fight over the same database tables and S3 files.

---

## What is now isolated

### ✅ Database — separate database on the same RDS

| App | Database |
|-----|----------|
| Flutter client API | `postgres` (the default db, already in use) |
| **Admin panel (this app)** | `taxease_admin` ← **new, already created** |

Both run on the same RDS instance (`database-1.ct2g4wqam4oi...`).
Zero extra cost — you pay for the RDS instance, not the number of databases on it.

### ✅ S3 — separate folder prefix in the same bucket

| App | S3 prefix |
|-----|-----------|
| Flutter client uploads | `uploads/...` (whatever it uses today) |
| **Admin panel uploads** | `taxease-admin/...` ← **all admin files go here** |

Both share `taxease-documents-prod`. Files can never collide because the prefix is different.

If you want a fully separate bucket later (cleaner billing visibility):
1. Go to AWS Console → S3 → Create bucket → `diamond-admin-documents` (ca-central-1)
2. Change `S3_BUCKET=diamond-admin-documents` in `backend/.env`

---

## Domain Setup

### Subdomains you need

| Subdomain | Points to | Purpose |
|-----------|-----------|---------|
| `adminbusiness.diamondaccounts.ca` | EC2 Elastic IP | Admin panel (frontend + backend API) |

> The backend API lives at `https://adminbusiness.diamondaccounts.ca/api/...`
> The frontend admin UI lives at `https://adminbusiness.diamondaccounts.ca/`
> Both are served by the same nginx on the EC2 instance.

### Step-by-step: Add DNS record

#### If DNS is managed in AWS Route 53:

1. Go to **Route 53 → Hosted Zones → diamondaccounts.ca**
2. Click **Create record**
3. Fill in:
   ```
   Record name:  admin
   Record type:  A
   Value:        <your EC2 Elastic IP>  (e.g. 35.182.100.50)
   TTL:          300
   ```
4. Click **Create records**
5. Wait ~2 minutes for propagation.
6. Verify: `nslookup adminbusiness.diamondaccounts.ca` should return your EC2 IP.

#### If DNS is managed elsewhere (Cloudflare, GoDaddy, etc.):

Add an **A record**:
```
Host:   admin
Points to: <your EC2 Elastic IP>
TTL:    Auto / 300
```

---

## How the traffic flows (full picture)

```
Browser / Admin user
        ↓
adminbusiness.diamondaccounts.ca  (DNS A record → EC2 Elastic IP)
        ↓
EC2 t3.small  (Ubuntu 22.04)
        ↓
    nginx :443 (SSL — Let's Encrypt)
        │
        ├── /api/*  and  /v3/api/*
        │       ↓
        │   Node.js backend (PM2, port 3001)
        │       ↓
        │   RDS PostgreSQL → database: taxease_admin
        │   S3 taxease-documents-prod/taxease-admin/...
        │   SES no-reply@diamondaccounts.ca
        │
        └── / (everything else)
                ↓
            TanStack Start SSR (PM2, port 3000)
```

```
Flutter mobile app  ← completely unaffected
        ↓
api.diamondaccounts.ca  (your existing backend)
        ↓
RDS PostgreSQL → database: postgres  (unchanged)
S3 taxease-documents-prod/uploads/...  (unchanged)
```

---

## After launching EC2: final checklist

- [ ] EC2 t3.small launched, Elastic IP attached
- [ ] DNS A record added: `adminbusiness.diamondaccounts.ca` → Elastic IP
- [ ] `setup.sh` run on EC2 (installs nginx, Node, PM2, certbot)
- [ ] SSL certificate issued by certbot for `adminbusiness.diamondaccounts.ca`
- [ ] `/var/www/taxease/backend/.env` uploaded (from `deploy/backend.env.production`)
- [ ] `deploy.sh` run — code deployed, migrations skipped (already applied to RDS)
- [ ] `pm2 startup && pm2 save` — survives reboots
- [ ] Confirm at https://adminbusiness.diamondaccounts.ca

---

## Want a separate S3 bucket? (Optional — cleaner but requires AWS Console)

1. **AWS Console → S3 → Create bucket**
   - Name: `diamond-admin-documents`
   - Region: `ca-central-1`
   - Block all public access: ✅ (keep on)
   - Click Create

2. **Add IAM permissions** for the `diamondaccounts-backend` IAM user:
   ```json
   {
     "Effect": "Allow",
     "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
     "Resource": "arn:aws:s3:::diamond-admin-documents/*"
   }
   ```

3. **Update `deploy/backend.env.production`:**
   ```
   S3_BUCKET=diamond-admin-documents
   ```

4. Redeploy.
