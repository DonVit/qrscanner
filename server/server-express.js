import express from 'express';
import cors from 'cors';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import SQLInit from 'sql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dataDir = path.join(__dirname, 'data');
const dbFile = path.join(dataDir, 'receipts.sqlite');
const port = Number(process.env.PORT || 4000);

await fs.mkdir(dataDir, { recursive: true });
// sql.js may export the initializer as the default export or the module itself,
// handle both shapes and fall back to a dynamic import if needed.
let initSqlJsFn = SQLInit && SQLInit.default ? SQLInit.default : SQLInit;
if (typeof initSqlJsFn !== 'function') {
  const mod = await import('sql.js');
  initSqlJsFn = mod.default ?? mod;
}
const SQL = await initSqlJsFn();
let db = null;

function normalizeReceiptRow(row) {
  return { ...row, uploaded: Boolean(row.uploaded) };
}

async function loadDatabase() {
  try {
    const raw = await fs.readFile(dbFile);
    db = new SQL.Database(new Uint8Array(raw));
  } catch (error) {
    if (error.code === 'ENOENT') {
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
      username TEXT NOT NULL
    );
  `);

  const tableInfo = db.exec('PRAGMA table_info(receipts)');
  const columns = tableInfo[0]?.values?.map((row) => row[1]) ?? [];
  if (!columns.includes('username')) {
    db.exec('ALTER TABLE receipts ADD COLUMN username TEXT NOT NULL DEFAULT ""');
  }

  const indexes = db.exec('PRAGMA index_list(receipts)');
  const hasUsernameUrlUniqueIndex = (indexes[0]?.values ?? []).some(
    (row) => row[1] === 'sqlite_autoindex_receipts_1' && Number(row[2]) === 1
  );

  if (hasUsernameUrlUniqueIndex) {
    db.exec(`
      DROP TABLE IF EXISTS receipts_new;
      CREATE TABLE receipts_new (
        id TEXT PRIMARY KEY,
        createdAt TEXT NOT NULL,
        url TEXT NOT NULL,
        uploaded INTEGER NOT NULL,
        username TEXT NOT NULL
      );
      INSERT INTO receipts_new (id, createdAt, url, uploaded, username)
      SELECT id, createdAt, url, uploaded, username FROM receipts;
      DROP TABLE receipts;
      ALTER TABLE receipts_new RENAME TO receipts;
    `);
  }
}

async function saveDatabase() {
  const data = db.export();
  await fs.writeFile(dbFile, Buffer.from(data));
}

function readReceipts(username) {
  const stmt = db.prepare(
    username
      ? 'SELECT id, createdAt, url, uploaded, username FROM receipts WHERE username = ? ORDER BY createdAt'
      : 'SELECT id, createdAt, url, uploaded, username FROM receipts ORDER BY createdAt'
  );
  if (username) stmt.bind([username]);
  const receipts = [];
  while (stmt.step()) receipts.push(normalizeReceiptRow(stmt.getAsObject()));
  stmt.free();
  return receipts;
}

function getReceiptById(receiptId, username) {
  if (!receiptId) return null;

  const stmt = db.prepare('SELECT id, createdAt, url, uploaded, username FROM receipts WHERE id = ? AND username = ?');
  stmt.bind([receiptId, username]);
  const found = stmt.step() ? normalizeReceiptRow(stmt.getAsObject()) : null;
  stmt.free();
  return found;
}

function getReceiptByUrl(url, username) {
  if (!url || !username) return null;

  const stmt = db.prepare('SELECT id, createdAt, url, uploaded, username FROM receipts WHERE username = ? AND url = ?');
  stmt.bind([normalizeUsername(username), url]);
  const found = stmt.step() ? normalizeReceiptRow(stmt.getAsObject()) : null;
  stmt.free();
  return found;
}

async function insertReceipt(receipt) {
  const stmt = db.prepare(
    'INSERT INTO receipts (id, createdAt, url, uploaded, username) VALUES (?, ?, ?, ?, ?)'
  );
  stmt.run([receipt.id, receipt.createdAt, receipt.url, receipt.uploaded ? 1 : 0, receipt.username]);
  stmt.free();
  await saveDatabase();
}

async function backfillMissingUsername(username) {
  if (!username) return;

  const stmt = db.prepare(
    'UPDATE receipts SET username = ? WHERE (username IS NULL OR TRIM(username) = "") AND url IS NOT NULL'
  );
  stmt.run([username]);
  stmt.free();
  await saveDatabase();
}

async function assignReceiptToUser(url, username) {
  if (!url || !username) return;

  const stmt = db.prepare(
    'UPDATE receipts SET username = ? WHERE url = ? AND (username IS NULL OR TRIM(username) = "")'
  );
  stmt.run([username, url]);
  stmt.free();
  await saveDatabase();
}

await loadDatabase();

const app = express();
const corsOptions = {
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(passport.initialize());

function normalizeUsername(value) {
  return String(value ?? '').trim().toLowerCase();
}

function getAuthUser(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const token = match[1];
  const parts = token.split(':');
  const scheme = parts[0];
  const username = parts[1];

  if (!username) return null;

  if (scheme === 'login' || scheme === 'register' || scheme === 'social') {
    return { username: normalizeUsername(username), token, scheme };
  }

  return null;
}

const makeUserFromProfile = (provider, profile) => {
  const username = profile.emails?.[0]?.value || profile.username || profile.id;
  return {
    id: `${provider}-${profile.id}`,
    username,
    displayName: profile.displayName || profile.username || username,
    provider,
  };
};

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.SERVER_BASE_URL || `http://localhost:${port}`}/auth/google/callback`,
      },
      (accessToken, refreshToken, profile, done) => done(null, makeUserFromProfile('google', profile))
    )
  );
}

const hasGoogle = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
if (!hasGoogle) {
  console.warn('Google OAuth is disabled: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local or environment.');
}

const normalizeUrl = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return raw;
  try {
    const u = new URL(raw);
    const pathname = u.pathname.replace(/\/+$/g, '');
    const normalizedPath = pathname === '' ? '' : `/${pathname}`;
    const host = u.hostname.toLowerCase();
    return `${u.protocol}//${host}${normalizedPath}${u.search}${u.hash}`;
  } catch (e) {
    return raw;
  }
};

function ensureAuth(req, res, next) {
  const authUser = getAuthUser(req);
  if (!authUser?.username) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.authUser = authUser;
  next();
}

app.get('/health', (req, res) => res.json({ ok: true }));
// Callback handler used by configured Passport strategies.
function authCallbackHandler(req, res) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication failed' });
  }

  const token = `social:${req.user.username}:${req.user.provider}`;
  const frontend = process.env.FRONTEND_URL || process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
  let redirect;

  try {
    const redirectUrl = new URL(frontend);
    redirectUrl.searchParams.set('authToken', token);
    redirectUrl.searchParams.set('username', req.user.displayName || req.user.username);
    redirect = redirectUrl.toString();
  } catch {
    const separator = frontend.includes('?') ? '&' : '?';
    redirect = `${frontend}${separator}authToken=${encodeURIComponent(token)}&username=${encodeURIComponent(
      req.user.displayName || req.user.username
    )}`;
  }

  res.redirect(redirect);
}

if (hasGoogle) {
  app.get('/auth/google', passport.authenticate('google', { scope: ['openid', 'email', 'profile'], session: false }));
  app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/auth/failure', session: false }), authCallbackHandler);
} else {
  app.get('/auth/google', (req, res) => res.status(501).json({ error: 'Google auth not configured on server' }));
  app.get('/auth/google/callback', (req, res) => res.status(501).json({ error: 'Google auth not configured on server' }));
}

app.get('/auth/failure', (req, res) => res.status(401).json({ error: 'Authentication failed' }));

app.get('/api/receipts', ensureAuth, async (req, res) => {
  await backfillMissingUsername(req.authUser.username);
  const receipts = readReceipts(req.authUser.username);
  res.json(receipts);
});

app.get('/api/stats', async (req, res) => {
  const authUser = getAuthUser(req);
  if (authUser?.username) {
    await backfillMissingUsername(authUser.username);
  }

  const allReceipts = readReceipts(null);
  const uploadedReceipts = allReceipts.filter((receipt) => receipt.uploaded).length;
  const normalizedReceipts = allReceipts.map((receipt) => ({
    ...receipt,
    username: normalizeUsername(receipt.username),
  }));
  const populatedUsers = normalizedReceipts
    .map((receipt) => receipt.username)
    .filter(Boolean);
  const uniqueUsernames = new Set(populatedUsers);
  const breakdown = Array.from(uniqueUsernames).map((username) => ({
    username,
    receiptCount: normalizedReceipts.filter((receipt) => receipt.username === username).length,
  })).sort((a, b) => b.receiptCount - a.receiptCount || a.username.localeCompare(b.username));
  const visibleReceiptCount = breakdown.reduce((sum, entry) => sum + entry.receiptCount, 0);

  res.json({
    users: uniqueUsernames.size,
    uploadedReceipts,
    totalReceipts: visibleReceiptCount,
    userBreakdown: breakdown,
  });
});

app.get('/api/public/urls', (req, res) => {
  const urls = readReceipts(null)
    .map((receipt) => String(receipt.url || '').trim())
    .filter(Boolean);

  res.json({ urls });
});

app.post('/api/receipts', ensureAuth, async (req, res) => {
  try {
    const payload = req.body || {};
    const normalizedUrlValue = normalizeUrl(payload.url ?? '');
    if (!normalizedUrlValue) {
      throw new Error('Invalid URL');
    }

    const receiptId = payload.id ?? randomUUID();
    const existingReceipt = getReceiptById(receiptId, req.authUser.username) || getReceiptByUrl(normalizedUrlValue, req.authUser.username);
    if (existingReceipt) {
      return res.status(200).json(existingReceipt);
    }

    const normalizedReceipt = {
      id: receiptId,
      createdAt: payload.createdAt ?? new Date().toISOString(),
      url: normalizedUrlValue,
      uploaded: true,
      username: req.authUser.username,
    };

    await assignReceiptToUser(normalizedUrlValue, req.authUser.username);
    await backfillMissingUsername(req.authUser.username);
    await insertReceipt(normalizedReceipt);
    res.status(201).json(normalizedReceipt);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid payload' });
  }
});

app.listen(port, () => console.log(`Receipt backend running on http://localhost:${port}`));
