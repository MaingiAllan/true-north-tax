import { spawn } from 'node:child_process';

const processes = [
  spawn('npm', ['run', 'dev:web'], { stdio: 'inherit' }),
  spawn(process.execPath, ['--env-file=.env.local', 'backend/server.mjs'], { stdio: 'inherit' }),
];

let stopping = false;

function stopAll(signal = 'SIGTERM') {
  if (stopping) return;
  stopping = true;
  for (const child of processes) {
    if (!child.killed) child.kill(signal);
  }
}

for (const child of processes) {
  child.on('error', (error) => {
    console.error(`Could not start a development process: ${error.message}`);
    stopAll();
  });
  child.on('exit', (code) => {
    if (!stopping && code !== 0) {
      console.error(`A development process exited with status ${code}.`);
      stopAll();
    }
  });
}

process.on('SIGINT', () => stopAll('SIGINT'));
process.on('SIGTERM', () => stopAll('SIGTERM'));
