import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "data");
const dataFile = path.join(dataDir, "receipts.json");
const port = Number(process.env.PORT || 4000);
let writeQueue = Promise.resolve();

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

async function readReceipts() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    const raw = await fs.readFile(dataFile, "utf8");
    if (!raw || !raw.trim()) return [];

    try {
      return JSON.parse(raw);
    } catch (err) {
      // Backup the corrupted file and start fresh to avoid crashing the server
      const backup = `${dataFile}.corrupt.${Date.now()}`;
      await fs.writeFile(backup, raw, "utf8");
      console.error(`Backed up corrupted receipts to ${backup}`);
      return [];
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function writeReceipts(receipts) {
  await fs.mkdir(dataDir, { recursive: true });
  const tempFile = `${dataFile}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(receipts, null, 2));
  await fs.rename(tempFile, dataFile);
}

function dedupeReceipts(receipts) {
  const seen = new Set();
  const deduped = [];

  for (const receipt of receipts) {
    const normalizedUrl = normalizeUrl(receipt?.url);
    if (!normalizedUrl || seen.has(normalizedUrl)) {
      continue;
    }

    seen.add(normalizedUrl);
    deduped.push(receipt);
  }

  return deduped;
}

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
          // Read and dedupe existing receipts first
          const receipts = dedupeReceipts(await readReceipts());
          const normalizedUrlValue = normalizeUrl(payload.url ?? "");

          // If the URL already exists, return it and do not write anything
          const existingReceipt = receipts.find((receipt) => normalizeUrl(receipt.url) === normalizedUrlValue);
          if (existingReceipt) {
            return { statusCode: 200, payload: existingReceipt };
          }

          // Create new record and persist
          const normalizedReceipt = {
            id: payload.id ?? randomUUID(),
            createdAt: payload.createdAt ?? new Date().toISOString(),
            url: normalizedUrlValue,
            uploaded: true,
          };

          const finalList = dedupeReceipts([...receipts, normalizedReceipt]);
          await writeReceipts(finalList);

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
