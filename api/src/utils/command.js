const { spawn } = require('child_process');

function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const defaultPath = process.platform === 'win32'
      ? process.env.PATH
      : `/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin${process.env.PATH ? `:${process.env.PATH}` : ''}`;

    const opts = {
      ...options,
      env: {
        ...process.env,
        PATH: defaultPath,
        ...(options.env || {})
      }
    };

    const proc = spawn(command, args, opts);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0 && !opts.ignoreExitCode) {
        const err = new Error(`Command failed with code ${code}`);
        err.code = code;
        err.stderr = stderr.trim();
        err.stdout = stdout.trim();
        return reject(err);
      }
      resolve(stdout.trim());
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

module.exports = { runCommand };
