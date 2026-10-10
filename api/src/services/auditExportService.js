const os = require('os');
const { runCommand } = require('../utils/command');
const Store = require('../utils/store');

class AuditExportService {
  async generateAudit() {
    const timestamp = new Date().toISOString();
    const dateFormatted = timestamp.replace(/[:.]/g, '-');

    // 1. Host Info
    const host = {
      hostname: os.hostname(),
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      uptimeSeconds: os.uptime(),
      cpus: os.cpus().map(c => ({ model: c.model, speed: c.speed })),
      totalMemoryBytes: os.totalmem(),
      freeMemoryBytes: os.freemem()
    };

    // 2. Storage Disks & UUIDs
    let blockDevices = [];
    try {
      const lsblkOut = await runCommand('lsblk', ['-J', '-f', '-o', 'NAME,SIZE,FSTYPE,LABEL,UUID,MOUNTPOINTS']);
      blockDevices = JSON.parse(lsblkOut).blockdevices || [];
    } catch (_) {}

    let dfReport = '';
    try {
      dfReport = await runCommand('df', ['-h']).catch(() => '');
    } catch (_) {}

    // 3. Network Interfaces & UFW
    let ipAddresses = '';
    try {
      ipAddresses = await runCommand('ip', ['-brief', 'address']).catch(() => '');
    } catch (_) {}

    let ufwStatus = '';
    try {
      ufwStatus = await runCommand('sudo', ['ufw', 'status', 'verbose']).catch(() => '');
    } catch (_) {}

    // 4. Docker Containers
    let containers = [];
    try {
      const dockerOut = await runCommand('docker', ['ps', '-a', '--format', '{{json .}}']);
      containers = dockerOut.trim().split('\n').filter(Boolean).map(line => {
        try { return JSON.parse(line); } catch (_) { return null; }
      }).filter(Boolean);
    } catch (_) {}

    // 5. Power & Electricity Policies
    let powerConfig = {};
    try {
      const pStore = new Store('powerConfig.json');
      powerConfig = await pStore.read();
    } catch (_) {}

    let electricityConfig = {};
    try {
      const eStore = new Store('electricityConfig.json');
      electricityConfig = await eStore.read();
    } catch (_) {}

    return {
      version: '2.0.0',
      exportedAt: timestamp,
      snapshotId: `DR-SNAPSHOT-${dateFormatted}`,
      host,
      storage: {
        blockDevices,
        dfReport: dfReport.trim()
      },
      network: {
        ipAddresses: ipAddresses.trim(),
        ufwStatus: ufwStatus.trim()
      },
      docker: {
        totalContainers: containers.length,
        containers
      },
      power: {
        powerConfig,
        electricityConfig
      }
    };
  }

  generateMarkdown(audit) {
    return `# MΛDESH Server Infrastructure — Disaster Recovery & Audit Snapshot

**Snapshot ID:** \`${audit.snapshotId}\`  
**Generated At:** \`${audit.exportedAt}\`  
**Host:** \`${audit.host.hostname}\` (\`${audit.host.arch}\` / Kernel \`${audit.host.release}\`)  

---

## 1. Host Hardware Specification
- **CPU:** ${audit.host.cpus[0]?.model || 'Intel Core i3-3220'} (${audit.host.cpus.length} Cores)
- **RAM Total:** ${(audit.host.totalMemoryBytes / (1024**3)).toFixed(2)} GB
- **Uptime:** ${(audit.host.uptimeSeconds / 3600).toFixed(1)} hours

---

## 2. Storage Partition UUIDs & Mounts
\`\`\`text
${audit.storage.dfReport}
\`\`\`

### Block Device Layout & UUIDs:
${(audit.storage.blockDevices || []).map(d => `- **${d.name}** (${d.size}): FSTYPE: \`${d.fstype || 'N/A'}\`, UUID: \`${d.uuid || 'N/A'}\`, Mount: \`${(d.mountpoints || []).join(', ') || 'N/A'}\``).join('\n')}

---

## 3. Network Configuration & Firewall (UFW)
\`\`\`text
${audit.network.ipAddresses}
\`\`\`

### Active Firewall Rules:
\`\`\`text
${audit.network.ufwStatus}
\`\`\`

---

## 4. Docker Containers Inventory (${audit.docker.totalContainers} Total)
| Container Name | Image | Status | Ports |
| :--- | :--- | :--- | :--- |
${audit.docker.containers.map(c => `| **${c.Names}** | \`${c.Image}\` | ${c.Status} | ${c.Ports || 'Internal'} |`).join('\n')}

---

## 5. Power Management & Tariff Policy
- **Morning Wake Schedule:** \`${audit.power.powerConfig.startTime || '08:00'}\` IST
- **Nightly Shutdown:** \`${audit.power.powerConfig.shutdownTime || '00:00'}\` IST
- **Auto-Resume On Outage:** \`${audit.power.powerConfig.autoResumeOnOutage ? 'ENABLED' : 'DISABLED'}\`
- **Electricity Tariff:** \`₹${audit.power.electricityConfig.tariffPerKwh || '8.00'}/kWh\`
`;
  }
}

module.exports = new AuditExportService();
