# DigitalOcean $6 Droplet First-Day Checklist (QR Scanner)

This runbook is tailored to this repository's deployment flow:

- frontend built with Vite
- backend run with Node + PM2
- nginx reverse proxy
- SQLite data file at `server/data/receipts.sqlite`

## 1) Create the Droplet

- Plan: Basic shared CPU, 1 vCPU, 1 GB RAM, 25 GB SSD, 1 TB transfer.
- OS: Ubuntu 24.04 LTS.
- Auth: SSH key only.
- Add-ons: Monitoring enabled, Backups enabled if budget allows.
- Region: closest to your users.

## 2) Initial Server Hardening

SSH into the server as `root` for first-time setup.

```bash
adduser deploy
usermod -aG sudo deploy
```

Edit SSH settings:

```bash
nano /etc/ssh/sshd_config
```

Set these values:

- `PasswordAuthentication no`
- `PermitRootLogin no`

Reload SSH:

```bash
systemctl reload ssh || systemctl restart ssh
```

Firewall:

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

Fail2ban:

```bash
apt update
apt install -y fail2ban
systemctl enable --now fail2ban
```

## 3) Install Runtime Dependencies (Node.js, npm, PM2, Nginx)

Run these on the Droplet:

```bash
apt update
apt install -y curl ca-certificates gnupg
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx
npm install -g pm2
systemctl enable --now nginx
node -v
npm -v
pm2 -v
nginx -v
```

Notes:

- This project expects Node 20.
- The deploy script can install these automatically, but running this step manually first helps verify the base server state.

## 4) Add Swap Immediately (Important on 1 GB RAM)

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
sysctl vm.swappiness=10
echo 'vm.swappiness=10' >> /etc/sysctl.conf
```

## 5) Point DNS Before SSL

- Create an A record for your domain to the Droplet public IP.
- Wait for DNS propagation.

## 6) Configure Local Deploy Variables (PowerShell, Local/Manual Deploy Only)

Skip this step if deployment is triggered from GitHub Actions.

Run from your local machine:

```powershell
$env:DEPLOY_HOST="your_server_ip"
$env:DEPLOY_USER="deploy"
$env:DEPLOY_PORT="22"
$env:DEPLOY_DIR="/var/www/qrscanner"
$env:DEPLOY_SERVER_NAME="yourdomain.com"
$env:DEPLOY_FRONTEND_URL="https://yourdomain.com"
```

## 7) Deploy with Existing Script (Local/Manual Deploy Only)

Skip this step if deployment is triggered from GitHub Actions.

From project root:

```bash
npm run deploy -- --remote --host $DEPLOY_HOST --user $DEPLOY_USER --port $DEPLOY_PORT --deploy-dir $DEPLOY_DIR --server-name $DEPLOY_SERVER_NAME --frontend-url $DEPLOY_FRONTEND_URL
```

For PowerShell, this equivalent command is usually easier:

```powershell
npm run deploy -- --remote --host $env:DEPLOY_HOST --user $env:DEPLOY_USER --port $env:DEPLOY_PORT --deploy-dir $env:DEPLOY_DIR --server-name $env:DEPLOY_SERVER_NAME --frontend-url $env:DEPLOY_FRONTEND_URL
```

## 8) GitHub-Triggered Deploy with GitHub Secrets

If you deploy through GitHub Actions, this is your deploy path and you can skip steps 6 and 7.

This repository already includes a workflow at `.github/workflows/deploy.yml` that deploys over SSH.

Add these repository secrets in GitHub:

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_PORT`
- `DEPLOY_DIR`
- `DEPLOY_SSH_KEY`
- `DEPLOY_SERVER_NAME`
- `DEPLOY_FRONTEND_URL`

Add these runtime app secrets in GitHub (used to generate backend `.env` on deploy):

- `APP_PORT` (example: `4000`)
- `APP_NODE_ENV` (example: `production`)
- `APP_FRONTEND_URL` (example: `https://apps.example.com`)
- `APP_FRONTEND_ORIGIN` (optional CORS override, example: `https://apps.example.com`)
- `APP_GOOGLE_CLIENT_ID` (optional if OAuth disabled)
- `APP_GOOGLE_CLIENT_SECRET` (optional if OAuth disabled)
- `APP_SESSION_SECRET` (required, long random value)

CORS secret note:

- Set `APP_FRONTEND_ORIGIN` to the browser origin that is allowed to call `/api` (scheme + host + optional port, no path).
- Example: if your app is served from `https://apps.doni.md/qrscanner/`, set `APP_FRONTEND_ORIGIN` to `https://apps.doni.md`.
- If `APP_FRONTEND_ORIGIN` is not provided, deploy derives `FRONTEND_ORIGIN` from `APP_FRONTEND_URL`.

Secret definitions (what value goes in each):

- `DEPLOY_HOST`: Droplet public IPv4 address. Example: `203.0.113.10`
- `DEPLOY_USER`: SSH user used for deployment. Recommended: `deploy`
- `DEPLOY_PORT`: SSH port. Default: `22`
- `DEPLOY_DIR`: Absolute path on server where app is deployed. Recommended: `/var/www/qrscanner`
- `DEPLOY_SSH_KEY`: Full private SSH key text used by GitHub Actions to connect to the Droplet.
  Include all lines exactly, for example:

```text
-----BEGIN OPENSSH PRIVATE KEY-----
...
-----END OPENSSH PRIVATE KEY-----
```

Important key pairing rule:

- Put the private key in GitHub secret `DEPLOY_SSH_KEY`.
- Put the matching public key on the Droplet in `~/.ssh/authorized_keys` for `DEPLOY_USER`.
- Do not store the public key in `DEPLOY_SSH_KEY`.

Troubleshooting note (`Permission denied (publickey)`):

- If `ssh-copy-id` to `root` fails and `PermitRootLogin no` is set, this is expected.
- Add your public key to the `deploy` user instead, then connect as `deploy`.
- If needed, use the DigitalOcean web console once to create `/home/deploy/.ssh/authorized_keys` and set permissions:
  - `/home/deploy/.ssh` -> `700`
  - `/home/deploy/.ssh/authorized_keys` -> `600`

- `DEPLOY_SERVER_NAME`: Domain or host used in nginx server_name. Example: `apps.example.com`
  - Use host only (no `http://`, no `https://`, no path, no trailing slash).
- `DEPLOY_FRONTEND_URL`: Public frontend base URL used by backend config. Example: `https://apps.example.com`

Recommended alignment:

- If `DEPLOY_SERVER_NAME` is `apps.example.com`, set `DEPLOY_FRONTEND_URL` to `https://apps.example.com`.
- If you deploy by IP only (no domain yet), use the IP for `DEPLOY_SERVER_NAME` and `http://<ip>` for `DEPLOY_FRONTEND_URL` until SSL is added.

Set secrets in GitHub:

1. Repository -> Settings -> Secrets and variables -> Actions.
2. Click New repository secret.
3. Add each secret value.
4. For `DEPLOY_SSH_KEY`, paste the full private key text including begin/end lines.

One-time server requirement for CI deploy user:

- GitHub Actions is non-interactive, so `DEPLOY_USER` must have passwordless sudo.
- On the Droplet (as root), run:

```bash
echo 'deploy ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/deploy
chmod 0440 /etc/sudoers.d/deploy
visudo -cf /etc/sudoers.d/deploy
```

- Replace `deploy` with your actual `DEPLOY_USER` if different.

Trigger deployment:

1. Open GitHub Actions.
2. Select Build and Deploy.
3. Click Run workflow on branch `main`.

The same workflow also runs automatically on every push to `main`.

Fail-fast validation in workflow:

- Deployment stops if any required secret is missing.
- Runtime deploy secrets `APP_PORT`, `APP_NODE_ENV`, and `APP_SESSION_SECRET` are required.
- `APP_PORT` must be `1024` or higher when deploying as a non-root user such as `deploy`.
- `DEPLOY_PORT` must be numeric and in range `1..65535`.
- `DEPLOY_DIR` must be an absolute Linux path (starts with `/`).
- `DEPLOY_FRONTEND_URL` must start with `http://` or `https://`.
- Host in `DEPLOY_FRONTEND_URL` must exactly match `DEPLOY_SERVER_NAME`.
- If `DEPLOY_SERVER_NAME` is a domain (not raw IP host), `DEPLOY_FRONTEND_URL` must use `https://`.

CI runtime note:

- GitHub Actions workflow uses Node.js 24 for build steps.

## 9) Configure HTTPS (After HTTP Works)

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com -d www.yourdomain.com
systemctl status certbot.timer
certbot renew --dry-run
```

## 10) Verify Health

```bash
pm2 status
pm2 logs qrscanner --lines 100
nginx -t
systemctl status nginx
curl -I http://yourdomain.com
curl -I https://yourdomain.com
curl https://yourdomain.com/health
```

## 11) Backups and Restore Drill

- This repo already creates timestamped SQLite backups during deploy.
- Keep periodic Droplet snapshots.
- Test restore once:
  - stop the app
  - restore a backup sqlite file
  - start the app
  - verify data integrity

## 12) Upgrade Triggers ($6 -> $12)

Move to the $12 plan when one or more conditions persist:

- RAM above ~75% during normal usage windows
- swap consistently above ~300 to 500 MB
- PM2 restarts from memory pressure or OOM
- CPU saturation during routine traffic

## Fast Rollback Plan

1. Keep the latest backup path from deploy output.
2. On bad deploy:
   - `pm2 stop qrscanner`
   - restore prior `receipts.sqlite` from `server/data/backups`
   - `pm2 start qrscanner`
   - `systemctl reload nginx`
3. Verify health endpoint and a core user flow.

## Suggested Next Improvement

Improve deployment safety by using release directories and a `current` symlink for atomic switches and faster rollback.