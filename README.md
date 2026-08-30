# QR Scanner

A simple React/Vite app for scanning QR codes, storing receipts locally, and syncing them to a backend.

## Setup

Install dependencies:

```bash
npm install
```

## Start the client

Run the Vite development server:

```bash
npm run dev
```

Open the app in your browser at the URL shown by Vite.

## Start the backend

Run the backend server from the `qrscanner` root:

```bash
node -r dotenv/config server/server-express.js
```

The backend listens on `http://localhost:4000` by default.

## Notes

- The backend now stores receipt data in a local SQLite file at `server/data/receipts.sqlite`.
- If you need to reset backend storage, stop the server and remove `server/data/receipts.sqlite`.
- The `dist/` folder is the built frontend only; it does not include backend code, `package.json`, or `npm` scripts.

## Deployment

This project deploys as two parts:

- Frontend static files served by nginx (typically under `/qrscanner/`)
- Backend Node process managed by PM2, proxied by nginx at `/api/`

For full production setup and operations, use the runbook:

- [docs/digitalocean-first-day-checklist.md](docs/digitalocean-first-day-checklist.md)

That document is the source of truth for:

- Droplet hardening and base packages
- GitHub Actions deploy secrets and validation rules
- CORS secret (`APP_FRONTEND_ORIGIN`) guidance
- HTTPS/Certbot, health checks, and rollback steps

Quick commands:

```bash
# Build + package deployment bundle locally
npm run deploy

# Deploy directly to remote host over SSH
npm run deploy:remote -- --host <host> --user <user> --deploy-dir /var/www/qrscanner --server-name <domain> --frontend-url https://<domain>
```
