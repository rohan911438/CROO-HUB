// Ensures a MongoDB instance is reachable before the app starts.
// Local dev has no standalone mongod, so this brings up the docker-compose
// "mongo" service on demand instead of letting the app crash with
// ECONNREFUSED on 127.0.0.1:27017.
const { execSync } = require('child_process');
const net = require('net');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/croo_hub';
const COMPOSE_FILE = path.join(__dirname, '..', '..', 'docker-compose.yml');

function parseHostPort(uri) {
  try {
    const withoutScheme = uri.replace(/^mongodb(\+srv)?:\/\//, '');
    const hostPart = withoutScheme.split('@').pop().split('/')[0];
    const [host, port] = hostPart.split(',')[0].split(':');
    return { host: host || '127.0.0.1', port: Number(port) || 27017 };
  } catch {
    return { host: '127.0.0.1', port: 27017 };
  }
}

function isPortOpen(host, port, timeoutMs = 1000) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const onFail = () => {
      socket.destroy();
      resolve(false);
    };
    socket.setTimeout(timeoutMs, onFail);
    socket.once('error', onFail);
    socket.once('connect', () => {
      socket.end();
      resolve(true);
    });
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasDocker() {
  try {
    execSync('docker version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const { host, port } = parseHostPort(MONGODB_URI);

  // Remote/Atlas URI or non-default host: nothing local for us to manage.
  if (host !== '127.0.0.1' && host !== 'localhost') {
    return;
  }

  if (await isPortOpen(host, port)) {
    console.log(`[ensure-mongo] MongoDB already reachable at ${host}:${port}`);
    return;
  }

  if (!hasDocker()) {
    console.error(
      `\n[ensure-mongo] MongoDB is not reachable at ${host}:${port} and Docker is not available.\n` +
        '  Start MongoDB yourself, then re-run this command. Options:\n' +
        '    - Install Docker Desktop and re-run (this script will auto-start the "mongo" container)\n' +
        '    - Install MongoDB locally and run `mongod`\n' +
        '    - Point MONGODB_URI in backend/.env at a remote MongoDB (e.g. Atlas)\n',
    );
    process.exit(1);
  }

  console.log(`[ensure-mongo] MongoDB not reachable at ${host}:${port}. Starting docker "mongo" service...`);
  try {
    execSync(`docker compose -f "${COMPOSE_FILE}" up -d mongo`, { stdio: 'pipe' });
  } catch (error) {
    // A container named "croo-hub-mongo" may already exist outside of this
    // compose project (e.g. started manually). Reuse it instead of failing.
    const stderr = error.stderr ? error.stderr.toString() : error.message;
    const isNameConflict = /already in use by container/i.test(stderr);
    if (!isNameConflict) {
      console.error('[ensure-mongo] Failed to start the mongo container via docker compose.', stderr);
      process.exit(1);
    }

    console.log('[ensure-mongo] Found an existing "croo-hub-mongo" container not managed by compose. Starting it...');
    try {
      execSync('docker start croo-hub-mongo', { stdio: 'inherit' });
    } catch (startError) {
      console.error('[ensure-mongo] Failed to start existing croo-hub-mongo container.', startError.message);
      process.exit(1);
    }
  }

  const timeoutMs = 30000;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isPortOpen(host, port)) {
      console.log(`[ensure-mongo] MongoDB is up at ${host}:${port}`);
      return;
    }
    await wait(500);
  }

  console.error(
    `[ensure-mongo] Timed out waiting for MongoDB at ${host}:${port}. Check "docker logs croo-hub-mongo".`,
  );
  process.exit(1);
}

main();
