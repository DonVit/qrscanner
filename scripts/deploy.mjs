import { mkdir, cp, rm, writeFile, access } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const backupDir = path.join(projectRoot, 'server', 'data', 'backups');
const deployDir = path.join(projectRoot, 'deploy');
const backendDir = path.join(deployDir, 'backend');
const frontendDir = path.join(deployDir, 'frontend');
const dbFile = path.join(projectRoot, 'server', 'data', 'receipts.sqlite');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const templateDir = path.join(projectRoot, 'scripts', 'templates');

function parseArgs(argv) {
  const options = {
    remote: false,
    host: process.env.DEPLOY_HOST || '',
    user: process.env.DEPLOY_USER || 'donvit',
    port: process.env.DEPLOY_PORT || '22',
    deployDir: process.env.DEPLOY_DIR || '/var/www/qrscanner',
    sshKey: process.env.DEPLOY_SSH_KEY || '',
    serverName: process.env.DEPLOY_SERVER_NAME || '',
    frontendUrl: process.env.DEPLOY_FRONTEND_URL || '',
    appPort: process.env.APP_PORT || '4000',
    appNodeEnv: process.env.APP_NODE_ENV || 'production',
    appFrontendUrl: process.env.APP_FRONTEND_URL || process.env.DEPLOY_FRONTEND_URL || '',
    appFrontendOrigin: process.env.APP_FRONTEND_ORIGIN || '',
    appServerBaseUrl: process.env.APP_SERVER_BASE_URL || '',
    appGoogleClientId: process.env.APP_GOOGLE_CLIENT_ID || '',
    appGoogleClientSecret: process.env.APP_GOOGLE_CLIENT_SECRET || '',
    appSessionSecret: process.env.APP_SESSION_SECRET || 'change-me',
    skipInstall: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--remote':
        options.remote = true;
        break;
      case '--host':
        options.host = argv[++index] || '';
        break;
      case '--user':
        options.user = argv[++index] || options.user;
        break;
      case '--port':
        options.port = argv[++index] || options.port;
        break;
      case '--deploy-dir':
        options.deployDir = argv[++index] || options.deployDir;
        break;
      case '--ssh-key':
        options.sshKey = argv[++index] || options.sshKey;
        break;
      case '--server-name':
        options.serverName = argv[++index] || options.serverName;
        break;
      case '--frontend-url':
        options.frontendUrl = argv[++index] || options.frontendUrl;
        break;
      case '--skip-install':
        options.skipInstall = true;
        break;
      case '--help':
      case '-h':
        console.log('Usage: npm run deploy -- [--remote] [--host <ip>] [--user <user>] [--port <port>] [--deploy-dir <path>] [--ssh-key <path>] [--server-name <name>] [--frontend-url <url>]');
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function buildSshArgs(config, command) {
  const args = [];
  if (config.sshKey) {
    args.push('-i', config.sshKey);
  }
  if (config.port) {
    args.push('-p', String(config.port));
  }
  args.push(`${config.user}@${config.host}`, command);
  return args;
}

function normalizeRemotePath(value) {
  if (!value) {
    return '/var/www/qrscanner';
  }

  const normalized = String(value).trim().replace(/\\/g, '/');
  if (/^[A-Za-z]:\//.test(normalized)) {
    console.warn(`Ignoring Windows-style deploy path "${normalized}" and using "/var/www/qrscanner" instead.`);
    return '/var/www/qrscanner';
  }

  return normalized;
}

function shellSingleQuote(value) {
  return `'${String(value).replace(/'/g, `'"'"'`)}'`;
}

function runCommand(command, args, options = {}) {
  execFileSync(command, args, {
    stdio: 'inherit',
    cwd: projectRoot,
    ...options,
  });
}

function getOrigin(value, fallback) {
  const raw = String(value || '').trim();
  if (!raw) {
    return fallback;
  }

  try {
    const parsed = new URL(raw);
    return parsed.origin;
  } catch {
    return fallback;
  }
}

function getHostname(value, fallback) {
  const raw = String(value || '').trim();
  if (!raw) {
    return fallback;
  }

  try {
    const parsed = new URL(raw);
    return parsed.hostname || fallback;
  } catch {
    return fallback;
  }
}

function renderTemplate(templateName, replacements) {
  let template = readFileSync(path.join(templateDir, templateName), 'utf8');

  for (const [key, value] of Object.entries(replacements)) {
    template = template.replaceAll(`{{${key}}}`, value);
  }

  return template;
}

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
    await cp(dbFile, path.join(backendDataDir, 'receipts.sqlite'));
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

async function deployRemote(config) {
  if (!config.host) {
    console.log('Remote deployment skipped because no host was provided.');
    return;
  }

  const frontendUrl = config.frontendUrl || `http://${config.host}`;
  const appFrontendUrl = config.appFrontendUrl || frontendUrl;
  const appFrontendOrigin = getOrigin(config.appFrontendOrigin || appFrontendUrl, frontendUrl);
  const appServerBaseUrl = getOrigin(config.appServerBaseUrl || appFrontendOrigin, appFrontendOrigin);
  const publicHost = getHostname(frontendUrl, '');
  const serverName = publicHost || config.serverName || config.host;
  const remoteDir = normalizeRemotePath(config.deployDir || '/var/www/qrscanner');
  const remoteBackendDir = `${remoteDir}/backend`;
  const remoteFrontendDir = `${remoteDir}/frontend`;
  const certDir = `/etc/letsencrypt/live/${serverName}`;
  const templateReplacements = {
    SERVER_NAME: serverName,
    REMOTE_FRONTEND_DIR: remoteFrontendDir,
    CERT_DIR: certDir,
  };
  const httpNginxConfig = renderTemplate('nginx-http.conf', templateReplacements);
  const httpsNginxConfig = renderTemplate('nginx-https.conf', templateReplacements);
  const isRootUser = config.user === 'root';
  const sudoPrefix = isRootUser ? '' : 'sudo -n ';
  const useSudo = !isRootUser;

  console.log(`Deploying to ${config.user}@${config.host}:${remoteDir}`);

  if (useSudo) {
    try {
      runCommand('ssh', buildSshArgs(config, 'sudo -n true'));
    } catch {
      throw new Error(
        `Remote user "${config.user}" requires passwordless sudo for CI deployments. ` +
        'Configure NOPASSWD in /etc/sudoers.d and re-run deployment.'
      );
    }
  }

  const remoteBootstrap = [
    `${sudoPrefix}mkdir -p ${remoteDir}`,
    `${sudoPrefix}chown -R ${config.user}:${config.user} ${remoteDir}`,
    `${sudoPrefix}apt-get update`,
    `${sudoPrefix}apt-get install -y nginx curl ca-certificates gnupg`,
    `curl -fsSL https://deb.nodesource.com/setup_20.x | ${sudoPrefix}bash -`,
    `${sudoPrefix}apt-get install -y nodejs`,
    `${sudoPrefix}npm install -g pm2`,
    `${sudoPrefix}rm -rf ${remoteBackendDir} ${remoteFrontendDir}`,
    `${sudoPrefix}chown -R ${config.user}:${config.user} ${remoteDir}`,
    `${sudoPrefix}chmod -R u+rwX ${remoteDir}`,
    `mkdir -p ${remoteBackendDir} ${remoteFrontendDir}`,
    `touch ${remoteBackendDir}/.write-test && rm -f ${remoteBackendDir}/.write-test`,
  ].join(' && ');

  runCommand('ssh', buildSshArgs(config, remoteBootstrap));

  runCommand('scp', [
    '-r',
    '-o', 'StrictHostKeyChecking=no',
    ...(config.sshKey ? ['-i', config.sshKey] : []),
    ...(config.port ? ['-P', String(config.port)] : []),
    path.join(projectRoot, 'deploy', 'backend'),
    `${config.user}@${config.host}:${remoteDir}/`,
  ]);

  runCommand('scp', [
    '-r',
    '-o', 'StrictHostKeyChecking=no',
    ...(config.sshKey ? ['-i', config.sshKey] : []),
    ...(config.port ? ['-P', String(config.port)] : []),
    path.join(projectRoot, 'deploy', 'frontend'),
    `${config.user}@${config.host}:${remoteDir}/`,
  ]);

  const remoteSetup = [
    `mkdir -p ${remoteBackendDir}/server/data/backups`,
    `if [ -f ${remoteBackendDir}/server/data/receipts.sqlite ]; then cp ${remoteBackendDir}/server/data/receipts.sqlite ${remoteBackendDir}/server/data/backups/receipts-$(date +%Y%m%d%H%M%S).sqlite; fi`,
    `cd ${remoteBackendDir}`,
    `npm install --omit=dev --no-audit`,
    `printf '%s\\n' ${shellSingleQuote(`PORT=${config.appPort}`)} ${shellSingleQuote(`NODE_ENV=${config.appNodeEnv}`)} ${shellSingleQuote(`FRONTEND_URL=${appFrontendUrl}`)} ${shellSingleQuote(`FRONTEND_ORIGIN=${appFrontendOrigin}`)} ${shellSingleQuote(`SERVER_BASE_URL=${appServerBaseUrl}`)} ${shellSingleQuote(`GOOGLE_CLIENT_ID=${config.appGoogleClientId}`)} ${shellSingleQuote(`GOOGLE_CLIENT_SECRET=${config.appGoogleClientSecret}`)} ${shellSingleQuote(`SESSION_SECRET=${config.appSessionSecret}`)} > .env`,
    `pm2 delete qrscanner >/dev/null 2>&1 || true`,
    `pm2 start server/server-express.js --name qrscanner --cwd ${remoteBackendDir}`,
    `pm2 save`,
    `if ${useSudo ? 'sudo ' : ''}test -f ${certDir}/fullchain.pem && ${useSudo ? 'sudo ' : ''}test -f ${certDir}/privkey.pem; then printf '%s' ${shellSingleQuote(httpsNginxConfig)} | ${useSudo ? 'sudo ' : ''}tee /etc/nginx/sites-available/qrscanner >/dev/null; else printf '%s' ${shellSingleQuote(httpNginxConfig)} | ${useSudo ? 'sudo ' : ''}tee /etc/nginx/sites-available/qrscanner >/dev/null; fi`,
    `${useSudo ? 'sudo ' : ''}ln -sf /etc/nginx/sites-available/qrscanner /etc/nginx/sites-enabled/qrscanner`,
    `if command -v systemctl >/dev/null 2>&1; then ${useSudo ? 'sudo ' : ''}systemctl reload nginx || ${useSudo ? 'sudo ' : ''}systemctl restart nginx; else ${useSudo ? 'sudo ' : ''}service nginx reload || ${useSudo ? 'sudo ' : ''}service nginx restart; fi`,
  ].join(' && ');

  runCommand('ssh', buildSshArgs(config, remoteSetup));

  console.log('Remote deployment complete.');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await createBackup();
  await buildFrontend();
  await prepareDeployment();

  if (args.remote || args.host) {
    await deployRemote(args);
  } else {
    console.log('Deployment package prepared locally. Re-run with --remote --host <ip> to deploy to a droplet.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
