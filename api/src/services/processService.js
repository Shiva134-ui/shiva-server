const os = require('os');
const { runCommand } = require('../utils/command');

async function getProcesses(limit = 50) {
  if (os.platform() !== 'linux') {
    const err = new Error('Process inventory requires the Ubuntu/Linux server runtime');
    err.status = 501;
    throw err;
  }

  try {
    const stdout = await runCommand('ps', ['-eo', 'pid,user,%cpu,%mem,rss,stat,comm', '--sort=-%cpu']);
    const lines = stdout.trim().split('\n').slice(1);
    const processes = [];

    for (let i = 0; i < Math.min(lines.length, limit); i++) {
      const parts = lines[i].trim().split(/\s+/);
      if (parts.length >= 7) {
        processes.push({
          pid: parseInt(parts[0], 10),
          user: parts[1],
          cpuPercent: parseFloat(parts[2]),
          memoryPercent: parseFloat(parts[3]),
          memUsage: parseInt(parts[4], 10) * 1024, // rss is in KB, convert to bytes
          state: parts[5],
          command: parts.slice(6).join(' ')
        });
      }
    }

    return processes;
  } catch (err) {
    console.error('[PROCESSES] Error:', err.message);
    err.status = err.status || 503;
    throw err;
  }
}

async function killProcess(pid, signal = 'SIGTERM') {
  if (typeof pid !== 'number' || !Number.isFinite(pid) || !Number.isInteger(pid)) {
    throw new Error('Invalid PID: must be a finite integer');
  }
  
  if (pid <= 1) {
    throw new Error('Invalid PID: cannot kill PID <= 1');
  }

  if (pid === process.pid) {
    throw new Error('Invalid PID: cannot kill the API process');
  }

  if (pid === process.ppid) {
    throw new Error('Invalid PID: cannot kill the parent process');
  }

  const allowedSignals = ['SIGTERM', 'SIGKILL', 'SIGINT'];
  if (!allowedSignals.includes(signal)) {
    throw new Error('Invalid signal');
  }

  if (os.platform() !== 'linux') {
    throw new Error('Process management is only supported on Linux');
  }

  await runCommand('kill', [`-${signal}`, pid.toString()]);
  return true;
}

module.exports = { getProcesses, killProcess };
