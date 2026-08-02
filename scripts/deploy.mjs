import { mkdir, cp, rm, writeFile, readFile, access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const backupDir = path.join(projectRoot, 'server', 'data', 'backups');
const deployDir = path.join(projectRoot, 'deploy');
const backendDir = path.join(deployDir, 'backend');
const frontendDir = path.join(deployDir, 'frontend');
const dbFile = path.join(projectRoot, 'server', 'data', 'receipts.sqlite');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

async function ensurePath(dir) {
  await mkdir(dir, { recursive: true });
}

async function copyDir(src, dest) {
  await rm(dest, { recursive: true, force: true });
  await cp(src, dest, { recursive: true });
}

async function createBackup() {
  if (!existsSync(dbFile)) {
    console.log('No SQLite database found at server/data/receipts.sqlite; skipping backup.');
    return;
  }

  await ensurePath(backupDir);
  const backupFile = path.join(backupDir, `receipts-${timestamp}.sqlite`);
  await cp(dbFile, backupFile);
  console.log(`Database backup created at ${backupFile}`);
}

async function buildFrontend() {
  console.log('Building frontend...');
  execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' });
}

async function prepareDeployment() {
  await ensurePath(deployDir);
  await ensurePath(backendDir);
  await ensurePath(frontendDir);

  await copyDir(path.join(projectRoot, 'dist'), frontendDir);

  const filesToCopy = [
    'package.json',
    'package-lock.json',
    'server',
    '.env',
    '.env.local',
  ];

  for (const item of filesToCopy) {
    const src = path.join(projectRoot, item);
    const dest = path.join(backendDir, item);
    try {
      await access(src);
      await cp(src, dest, { recursive: true });
    } catch {
      // skip missing optional files
    }
  }

  const backendDataDir = path.join(backendDir, 'server', 'data');
  await ensurePath(backendDataDir);
  if (existsSync(dbFile)) {
    await cp(dbFile, path.join(backendDataDir, 'receipts.sqlite'))
  }

  const manifest = {
    createdAt: new Date().toISOString(),
    databaseBackup: path.relative(projectRoot, path.join(backupDir, `receipts-${timestamp}.sqlite`)),
    frontendDir: 'deploy/frontend',
    backendDir: 'deploy/backend',
  };

  await writeFile(path.join(deployDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Deployment package prepared in ${deployDir}`);
}

async function main() {
  await createBackup();
  await buildFrontend();
  await prepareDeployment();
  console.log('Deployment prep complete.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
