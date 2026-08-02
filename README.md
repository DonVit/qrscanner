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

## Deployment overview

This project requires both:

- A built frontend deployed to nginx under `/qrscanner/`
- A Node backend running separately on the server and proxied by nginx at `/api/`

### One-command deployment helper

Run the helper from the project root:

```bash
npm run deploy
```

This will:

1. Create a timestamped backup of the current SQLite database at `server/data/backups/`
2. Build the frontend into `dist/`
3. Create a deployment package in `deploy/` with:
   - built frontend files under `deploy/frontend/`
   - backend files and runtime scripts under `deploy/backend/`

The generated deployment bundle is ready to copy to your server.

### Frontend deployment

1. Build the frontend:

```bash
npm run build
```

2. Copy `dist/` to the nginx document root at `/var/www/apps.doni.md/qrscanner`:

```bash
scp -i ~/.ssh/id_ed25519 -r dist/* donvit@138.68.79.138:/var/www/apps.doni.md/qrscanner
```

### Backend deployment

1. Install Node and npm on the server if missing:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt update
apt install -y nodejs npm
```

2. Copy the backend source files to a server folder, for example:

- `package.json`
- `package-lock.json` (if present)
- `server/server.js`
- All files under `server/` needed by the backend
- `server/data/` (or create it on the server)

3. In the backend folder, install dependencies and start the server:

```bash
npm install --omit=dev --no-audit
npm run server
```

4. If `node_modules` is missing, `npm run server` will fail with package not found errors such as `sql.js`.

5. If `npm install` is killed with out-of-memory errors, add swap on the server, or install locally and copy `node_modules` to the server:

```bash
# on your local machine
npm install --omit=dev --no-audit
tar czf qrscanner-backend.tar.gz package.json server package-lock.json node_modules
scp -i ~/.ssh/id_ed25519 qrscanner-backend.tar.gz donvit@138.68.79.138:/var/www/apps.doni.md/qrscanner
```

```bash
# on the server
cd /var/www/apps.doni.md/qrscanner
tar xzf qrscanner-backend.tar.gz
npm run server
```

6. Keep the backend running in production with a process manager such as `pm2` or systemd.

### nginx configuration

Below is a minimal nginx configuration for serving the frontend and proxying API requests:

```nginx
server {
    server_name apps.doni.md;

    root /var/www/apps.doni.md;
    index index.html index.htm;

    location /qrscanner/ {
        try_files $uri $uri/ /qrscanner/index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/apps.doni.md/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/apps.doni.md/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if ($host = apps.doni.md) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    server_name apps.doni.md;
    return 404; # managed by Certbot
}
```

### Important

- `dist/` is static frontend only
- The backend must be installed and run from the project source tree
- `npm run server` will fail without `node_modules` and `package.json`
