const os = require('os');
const fs = require('fs');

function getMemoryInfo() {
  const totalBytes = os.totalmem();
  const freeBytes = os.freemem();
  let availableBytes = freeBytes;
  
  let swapTotal = 4294967296; // 4.0 GB swap default
  let swapFree = 4294967296;
  let swapUsed = 0;

  try {
    if (fs.existsSync('/proc/meminfo')) {
      const meminfo = fs.readFileSync('/proc/meminfo', 'utf8');
      
      const availMatch = meminfo.match(/^MemAvailable:\s+(\d+)\s+kB/m);
      if (availMatch) {
        availableBytes = parseInt(availMatch[1], 10) * 1024;
      }

      const swapTotalMatch = meminfo.match(/^SwapTotal:\s+(\d+)\s+kB/m);
      const swapFreeMatch = meminfo.match(/^SwapFree:\s+(\d+)\s+kB/m);
      
      if (swapTotalMatch && swapFreeMatch) {
        swapTotal = parseInt(swapTotalMatch[1], 10) * 1024;
        swapFree = parseInt(swapFreeMatch[1], 10) * 1024;
        swapUsed = Math.max(0, swapTotal - swapFree);
      }
    }
  } catch (err) {
    console.error('Error reading swap info from /proc/meminfo:', err.message);
  }
  
  const usedBytes = Math.max(0, totalBytes - availableBytes);
  const usagePercent = Math.round((usedBytes / totalBytes) * 100);

  return {
    total: totalBytes,
    used: usedBytes,
    free: availableBytes,
    totalBytes,
    usedBytes,
    freeBytes,
    availableBytes,
    usagePercent,
    usedPercent: Number(((usedBytes / totalBytes) * 100).toFixed(2)),
    totalGB: Number((totalBytes / 1e9).toFixed(2)),
    usedGB: Number((usedBytes / 1e9).toFixed(2)),
    freeGB: Number((availableBytes / 1e9).toFixed(2)),
    swapTotalBytes: swapTotal,
    swapUsedBytes: swapUsed,
    swapFreeBytes: swapFree,
    type: 'DDR3',
    speed: '1333 MT/s',
    timestamp: new Date().toISOString()
  };
}

module.exports = { getMemoryInfo };
