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
      url TEXT NOT NULL UNIQUE,
      uploaded INTEGER NOT NULL
    );
  `);
}

async function saveDatabase() {
  const data = db.export();
  await fs.writeFile(dbFile, Buffer.from(data));
}

function readReceipts() {
  const stmt = db.prepare("SELECT id, createdAt, url, uploaded FROM receipts ORDER BY createdAt");
  const receipts = [];
  while (stmt.step()) {
    receipts.push(normalizeReceiptRow(stmt.getAsObject()));
  }
  stmt.free();
  return receipts;
}

function getReceiptByUrl(url) {
  const stmt = db.prepare("SELECT id, createdAt, url, uploaded FROM receipts WHERE url = ?");
  stmt.bind([url]);
  const found = stmt.step() ? normalizeReceiptRow(stmt.getAsObject()) : null;
  stmt.free();
  return found;
}

async function insertReceipt(receipt) {
  const stmt = db.prepare("INSERT INTO receipts (id, createdAt, url, uploaded) VALUES (?, ?, ?, ?)");
  stmt.run([receipt.id, receipt.createdAt, receipt.url, receipt.uploaded ? 1 : 0]);
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

      if (getReceiptByUrl(normalizedUrl)) continue;

      await insertReceipt({
        id: item.id ?? randomUUID(),
        createdAt: item.createdAt ?? new Date().toISOString(),
        url: normalizedUrl,
        uploaded: true,
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
    const receipts = await readReceipts();
    res.writeHead(200, { "Content-Type": "application/json", ...corsHeaders });
    res.end(JSON.stringify(receipts));
    return;
  }

  if (requestUrl.pathname === "/api/receipts" && req.method === "POST") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const result = await runExclusive(async () => {
          const normalizedUrlValue = normalizeUrl(payload.url ?? "");
          if (!normalizedUrlValue) {
            throw new Error("Invalid URL");
          }

          const existingReceipt = getReceiptByUrl(normalizedUrlValue);
          if (existingReceipt) {
            return { statusCode: 200, payload: existingReceipt };
          }

          const normalizedReceipt = {
            id: payload.id ?? randomUUID(),
            createdAt: payload.createdAt ?? new Date().toISOString(),
            url: normalizedUrlValue,
            uploaded: true,
          };

          insertReceipt(normalizedReceipt);
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
