const { runCommand } = require('../utils/command');

class MaintenanceService {
  async analyze() {
    let dockerDanglingSize = 'Unknown';
    let dockerBuilderSize = 'Unknown';
    let aptCacheSize = 'Unknown';
    let journalSize = 'Unknown';
    let rootFree = 'Unknown';
    let rootTotal = 'Unknown';
    let rootUsedPercent = '0%';

    try {
      const dfOut = await runCommand('df', ['-h', '/']);
      const lines = dfOut.trim().split('\n');
      if (lines.length > 1) {
        const parts = lines[1].trim().split(/\s+/);
        rootTotal = parts[1] || 'Unknown';
        rootFree = parts[3] || 'Unknown';
        rootUsedPercent = parts[4] || '0%';
      }
    } catch (_) {}

    try {
      const dfDocker = await runCommand('docker', ['system', 'df', '--format', '{{json .}}']);
      const items = dfDocker.trim().split('\n').map(l => {
        try { return JSON.parse(l); } catch (_) { return null; }
      }).filter(Boolean);

      const imgItem = items.find(i => i.Type === 'Images');
      if (imgItem) dockerDanglingSize = imgItem.Reclaimable || '0B';

      const buildItem = items.find(i => i.Type === 'Build Cache');
      if (buildItem) dockerBuilderSize = buildItem.Reclaimable || '0B';
    } catch (_) {}

    try {
      const aptOut = await runCommand('du', ['-sh', '/var/cache/apt/archives']).catch(() => '');
      if (aptOut) aptCacheSize = aptOut.trim().split(/\s+/)[0] || '0B';
    } catch (_) {}

    try {
      const jOut = await runCommand('journalctl', ['--disk-usage']).catch(() => '');
      if (jOut) {
        const match = jOut.match(/takes up ([0-9.]+[MGB]+)/i);
        if (match) journalSize = match[1];
      }
    } catch (_) {}

    return {
      rootTotal,
      rootFree,
      rootUsedPercent,
      targets: [
        {
          id: 'docker-dangling',
          name: 'Docker Dangling Images & Layers',
          description: 'Removes orphaned untagged image layers (<none>). Never removes running or named containers/images.',
          estimatedSpace: dockerDanglingSize,
          safe: true
        },
        {
          id: 'docker-builder',
          name: 'Docker Build Cache',
          description: 'Clears cached intermediate layers from previous docker builds.',
          estimatedSpace: dockerBuilderSize,
          safe: true
        },
        {
          id: 'apt-cache',
          name: 'APT Installer Package Archives',
          description: 'Cleans cached .deb installation files in /var/cache/apt/archives.',
          estimatedSpace: aptCacheSize,
          safe: true
        },
        {
          id: 'journal-vacuum',
          name: 'Systemd Journal Logs Vacuum',
          description: 'Caps archived systemd log files to 200 MB, freeing disk space while preserving recent logs.',
          estimatedSpace: journalSize,
          safe: true
        }
      ]
    };
  }

  async clean(selectedTargets = []) {
    const results = {};
    let beforeBytes = 0;
    let afterBytes = 0;

    try {
      const dfBefore = await runCommand('df', ['-B1', '/']);
      const l1 = dfBefore.trim().split('\n')[1].trim().split(/\s+/);
      beforeBytes = parseInt(l1[3], 10) || 0;
    } catch (_) {}

    for (const target of selectedTargets) {
      try {
        if (target === 'docker-dangling') {
          const out = await runCommand('docker', ['image', 'prune', '-f']);
          results['docker-dangling'] = { success: true, message: out.trim() };
        } else if (target === 'docker-builder') {
          const out = await runCommand('docker', ['builder', 'prune', '-f']);
          results['docker-builder'] = { success: true, message: out.trim() };
        } else if (target === 'apt-cache') {
          await runCommand('sudo', ['apt-get', 'clean']);
          await runCommand('sudo', ['apt-get', 'autoclean', '-y']);
          results['apt-cache'] = { success: true, message: 'Cleaned /var/cache/apt/archives' };
        } else if (target === 'journal-vacuum') {
          const out = await runCommand('sudo', ['journalctl', '--vacuum-size=200M']);
          results['journal-vacuum'] = { success: true, message: out.trim() };
        }
      } catch (err) {
        results[target] = { success: false, error: err.message };
      }
    }

    try {
      const dfAfter = await runCommand('df', ['-B1', '/']);
      const l2 = dfAfter.trim().split('\n')[1].trim().split(/\s+/);
      afterBytes = parseInt(l2[3], 10) || 0;
    } catch (_) {}

    const freedBytes = Math.max(0, afterBytes - beforeBytes);
    const freedMB = (freedBytes / (1024 * 1024)).toFixed(1);

    return {
      success: true,
      freedBytes,
      freedMB: `${freedMB} MB`,
      results
    };
  }
}

module.exports = new MaintenanceService();
