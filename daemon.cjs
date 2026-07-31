const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG = path.join('/home/z/my-project', 'daemon-out.log');
const PIDFILE = path.join('/home/z/my-project', 'daemon.pid');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(LOG, line);
}

function startServer() {
  log('Starting Next.js dev server...');
  
  // Kill any existing process on port 3000
  try { execSync('fuser -k 3000/tcp 2>/dev/null'); } catch {}
  try { execSync('lsof -ti:3000 | xargs kill -9 2>/dev/null'); } catch {}
  
  const proc = spawn('bun', ['run', 'dev'], {
    cwd: '/home/z/my-project',
    env: { ...process.env, DATABASE_URL: 'file:/home/z/my-project/db/custom.db' },
    detached: true,
    stdio: ['ignore', fs.openSync(LOG, 'a'), fs.openSync(LOG, 'a')],
  });

  proc.unref();
  proc.pid && fs.writeFileSync(PIDFILE, String(proc.pid));
  log(`Server PID: ${proc.pid}`);

  proc.on('exit', (code) => {
    log(`Server exited (code=${code}). Restarting in 3s...`);
    setTimeout(startServer, 3000);
  });

  proc.on('error', (err) => {
    log(`Server error: ${err.message}. Restarting in 3s...`);
    setTimeout(startServer, 3000);
  });
}

log('=== DAEMON START ===');
startServer();
log('Daemon forked. Server running in background.');

// Exit parent immediately, let child run independently
process.exit(0);
