import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "data");
const dbFile = path.join(dataDir, "receipts.sqlite");
const port = Number(process.env.PORT || 4000);
let writeQueue = Promise.resolve();

function getAuthUser(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return null;
  }

  const token = match[1];
  const [scheme, username] = token.split(":");
  if (scheme === "login" || scheme === "register" || scheme === "social") {
    return { username, token };
  }

  return null;
}

await fs.mkdir(dataDir, { recursive: true });
const initSqlJs = (await import("sql.js")).default;
const SQL = await initSqlJs();
let db = null;

function normalizeReceiptRow(row) {
  return {
    ...row,
    uploaded: Boolean(row.uploaded),
  };
}

async function loadDatabase() {
  try {
    const raw = await fs.readFile(dbFile);
    db = new SQL.Database(new Uint8Array(raw));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      db = new SQL.Database();
    } else {
      throw error;
    }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS receipts (
      id TEXT PRIMARY KEY,
      createdAt TEXT NOT NULL,
      url TEXT NOT NULL,
      uploaded INTEGER NOT NULL,
      username TEXT NOT NULL,
      UNIQUE(username, url)
    );
  `);
}

async function saveDatabase() {
  const data = db.export();
  await fs.writeFile(dbFile, Buffer.from(data));
}

function readReceipts(username) {
  const stmt = db.prepare(
    username
      ? "SELECT id, createdAt, url, uploaded, username FROM receipts WHERE username = ? ORDER BY createdAt"
      : "SELECT id, createdAt, url, uploaded, username FROM receipts ORDER BY createdAt"
  );
  if (username) {
    stmt.bind([username]);
  }
  const receipts = [];
  while (stmt.step()) {
    receipts.push(normalizeReceiptRow(stmt.getAsObject()));
  }
  stmt.free();
  return receipts;
}

function getReceiptByUrl(url, username) {
  const stmt = db.prepare("SELECT id, createdAt, url, uploaded, username FROM receipts WHERE username = ? AND url = ?");
  stmt.bind([username, url]);
  const found = stmt.step() ? normalizeReceiptRow(stmt.getAsObject()) : null;
  stmt.free();
  return found;
}

async function insertReceipt(receipt) {
  const stmt = db.prepare(
    "INSERT INTO receipts (id, createdAt, url, uploaded, username) VALUES (?, ?, ?, ?, ?)"
  );
  stmt.run([receipt.id, receipt.createdAt, receipt.url, receipt.uploaded ? 1 : 0, receipt.username]);
  stmt.free();
  await saveDatabase();
}

await loadDatabase();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const normalizeUrl = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return raw;

  try {
    const u = new URL(raw);
    // remove trailing slashes from pathname
    const pathname = u.pathname.replace(/\/+$|^$/g, "");
    const normalizedPath = pathname === "" ? "" : `/${pathname}`;
    const host = u.hostname.toLowerCase();
    const normalized = `${u.protocol}//${host}${normalizedPath}${u.search}${u.hash}`;
    return normalized;
  } catch (e) {
    // not a valid absolute URL, fall back to trimmed string
    return raw;
  }
};

async function migrateJsonToSqlite() {
  const legacyFile = path.join(dataDir, "receipts.json");
  try {
    const raw = await fs.readFile(legacyFile, "utf8");
    if (!raw || !raw.trim()) return;

    const receipts = JSON.parse(raw);
    const seen = new Set();

    for (const item of receipts) {
      const normalizedUrl = normalizeUrl(item?.url);
      if (!normalizedUrl || seen.has(normalizedUrl)) continue;
      seen.add(normalizedUrl);

      if (getReceiptByUrl(normalizedUrl, "legacy")) continue;

      await insertReceipt({
        id: item.id ?? randomUUID(),
        createdAt: item.createdAt ?? new Date().toISOString(),
        url: normalizedUrl,
        uploaded: true,
        username: "legacy",
      });
    }
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) {
      console.warn("Failed to migrate legacy receipts.json:", error);
    }
  }
}

await migrateJsonToSqlite();

async function runExclusive(operation) {
  const previous = writeQueue;
  let release;
  writeQueue = new Promise((resolve) => {
    release = resolve;
  });

  await previous;

  try {
    return await operation();
  } finally {
    release();
  }
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  if (requestUrl.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json", ...corsHeaders });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (requestUrl.pathname === "/api/receipts" && req.method === "GET") {
    const authUser = getAuthUser(req);
    const receipts = readReceipts(authUser?.username);
    res.writeHead(200, { "Content-Type": "application/json", ...corsHeaders });
    res.end(JSON.stringify(receipts));
    return;
  }

  // OAuth start endpoint: /auth/:provider
  if (requestUrl.pathname.startsWith("/auth/") && req.method === "GET") {
    const parts = requestUrl.pathname.split("/").filter(Boolean);
    // parts => ["auth", ":provider"]
    const provider = parts[1];
    if (provider !== "google") {
      res.writeHead(400, { "Content-Type": "application/json", ...corsHeaders });
      res.end(JSON.stringify({ error: "Unsupported provider" }));
      return;
    }

    const serverBase = process.env.SERVER_BASE_URL || `http://localhost:${port}`;
    const redirectUri = `${serverBase}/auth/google/callback`;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const scope = encodeURIComponent("openid email profile");
    const state = ""; // TODO: implement state
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&access_type=online&prompt=select_account&state=${state}`;
    res.writeHead(302, { Location: authUrl });
    res.end();
    return;
  }

  // OAuth callback: /auth/:provider/callback
  if (requestUrl.pathname.startsWith("/auth/") && requestUrl.pathname.endsWith("/callback") && req.method === "GET") {
    const parts = requestUrl.pathname.split("/").filter(Boolean);
    const provider = parts[1];
    const code = requestUrl.searchParams.get("code");

    if (provider !== "google") {
      res.writeHead(400, { "Content-Type": "application/json", ...corsHeaders });
      res.end(JSON.stringify({ error: "Unsupported provider" }));
      return;
    }

    if (!code) {
      res.writeHead(400, { "Content-Type": "application/json", ...corsHeaders });
      res.end(JSON.stringify({ error: "Missing code" }));
      return;
    }

    try {
      const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: `${process.env.SERVER_BASE_URL || `http://localhost:${port}`}/auth/google/callback`,
          grant_type: "authorization_code",
        }),
      });
      const tokenData = await tokenResp.json();
      const userInfoResp = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const profile = await userInfoResp.json();
      // profile: { sub, email, name, picture }

      const username = (profile && (profile.email || profile.sub)) || `social-google`;
      const displayName = (profile && (profile.name || profile.email || profile.sub)) || username;
      const appToken = `social:${username}:google`;

      // Redirect back to frontend with token in query params
      const frontend = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
      const redirect = `${frontend}?authToken=${encodeURIComponent(appToken)}&username=${encodeURIComponent(
        displayName
      )}`;

      res.writeHead(302, { Location: redirect });
      res.end();
      return;
    } catch (error) {
      res.writeHead(500, { "Content-Type": "application/json", ...corsHeaders });
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
      return;
    }
  }

  if (requestUrl.pathname === "/api/receipts" && req.method === "POST") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const authUser = getAuthUser(req);
        if (!authUser?.username) {
          res.writeHead(401, { "Content-Type": "application/json", ...corsHeaders });
          res.end(JSON.stringify({ error: "Authentication required" }));
          return;
        }

        const result = await runExclusive(async () => {
          const normalizedUrlValue = normalizeUrl(payload.url ?? "");
          if (!normalizedUrlValue) {
            throw new Error("Invalid URL");
          }

          const existingReceipt = getReceiptByUrl(normalizedUrlValue, authUser.username);
          if (existingReceipt) {
            return { statusCode: 200, payload: existingReceipt };
          }

          const normalizedReceipt = {
            id: payload.id ?? randomUUID(),
            createdAt: payload.createdAt ?? new Date().toISOString(),
            url: normalizedUrlValue,
            uploaded: true,
            username: authUser.username,
          };

          await insertReceipt(normalizedReceipt);
          return { statusCode: 201, payload: normalizedReceipt };
        });

        res.writeHead(result.statusCode, { "Content-Type": "application/json", ...corsHeaders });
        res.end(JSON.stringify(result.payload));
      } catch (error) {
        res.writeHead(400, { "Content-Type": "application/json", ...corsHeaders });
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Invalid payload" }));
      }
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json", ...corsHeaders });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(port, () => {
  console.log(`Receipt backend running on http://localhost:${port}`);
});
