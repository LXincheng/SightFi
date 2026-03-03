import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

function loadRootEnv() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadRootEnv();

const apiPort = Number(process.env.API_PORT ?? process.env.PORT ?? 3000);
const webPort = Number(process.env.WEB_PORT ?? 5173);
const healthUrl = `http://localhost:${apiPort}/health`;
const pnpmBin = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const smokeMs = Number(process.env.DEV_SMOKE_MS ?? 0);

let webProc = null;
let apiProc = null;
let monitorTimer = null;
let isShuttingDown = false;

function log(scope, message) {
  const ts = new Date().toISOString();
  // Use console.* for better compatibility across terminals and CI log collectors.
  console.log(`[${ts}] [${scope}] ${message}`);
}

function pipeWithPrefix(child, scope) {
  const attach = (stream, writer) => {
    if (!stream) return;
    let buffer = '';
    stream.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.trim().length > 0) {
          writer(`[${scope}] ${line}`);
        }
      }
    });
  };

  attach(child.stdout, (line) => console.log(line));
  attach(child.stderr, (line) => console.error(line));
}

function spawnPnpm(args, scope, extraEnv = {}) {
  const env = { ...process.env, ...extraEnv };

  const child =
    process.platform === 'win32'
      ? spawn('cmd.exe', ['/d', '/s', '/c', pnpmBin, ...args], {
          stdio: ['ignore', 'pipe', 'pipe'],
          env,
          shell: false,
        })
      : spawn(pnpmBin, args, {
          stdio: ['ignore', 'pipe', 'pipe'],
          env,
          shell: false,
        });

  pipeWithPrefix(child, scope);
  return child;
}

async function waitForApiReady(timeoutMs = 90_000, intervalMs = 1200) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(healthUrl);
      if (res.ok) return true;
    } catch {
      // API not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return false;
}

function startMonitor() {
  monitorTimer = setInterval(async () => {
    try {
      const res = await fetch(healthUrl);
      if (!res.ok) {
        log('monitor', `health check failed with status ${res.status}`);
        return;
      }
      const payload = await res.json();
      const uptime = typeof payload.uptimeSec === 'number' ? payload.uptimeSec : 'n/a';
      log('monitor', `api=up uptime=${uptime}s web=http://localhost:${webPort}`);
    } catch {
      log('monitor', 'api=down (health check request failed)');
    }
  }, 30_000);
}

function stopMonitor() {
  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }
}

function shutdown(exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  stopMonitor();

  const killProc = (proc) => {
    if (!proc || proc.killed) return;
    try {
      proc.kill('SIGTERM');
    } catch {
      // ignore
    }
  };

  killProc(webProc);
  killProc(apiProc);

  setTimeout(() => {
    killProc(webProc);
    killProc(apiProc);
    process.exit(exitCode);
  }, 500);
}

async function run() {
  log('dev', 'starting API...');
  apiProc = spawnPnpm(['--filter', '@sightfi/api', 'dev'], 'api', {
    PORT: String(apiPort),
  });

  apiProc.on('exit', (code) => {
    if (!isShuttingDown) {
      log('dev', `api exited unexpectedly with code ${code ?? 1}`);
      shutdown(code ?? 1);
    }
  });

  const ready = await waitForApiReady();
  if (!ready) {
    log('dev', `api did not become ready in time (${healthUrl})`);
    shutdown(1);
    return;
  }

  log('dev', `api ready at ${healthUrl}`);
  log('dev', 'starting Web...');
  webProc = spawnPnpm(['--filter', '@sightfi/web', 'dev', '--', '--port', `${webPort}`], 'web');

  webProc.on('exit', (code) => {
    if (!isShuttingDown) {
      log('dev', `web exited unexpectedly with code ${code ?? 1}`);
      shutdown(code ?? 1);
    }
  });

  startMonitor();
  log('dev', `all services up: web=http://localhost:${webPort} api=http://localhost:${apiPort}`);

  if (smokeMs > 0) {
    log('dev', `smoke mode enabled, auto shutdown in ${smokeMs}ms`);
    setTimeout(() => shutdown(0), smokeMs);
  }
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

void run();
