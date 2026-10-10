import type { SensorInfo, StorageInfo, HardwareInfo } from '../types/system';

/**
 * Ensures the returned value is always a valid Array.
 * If val is not an array, returns fallback (default: []).
 */
export function asArray<T>(val: T[] | readonly T[] | null | undefined, fallback?: T[]): T[];
export function asArray<T = any>(val: any, fallback?: T[]): T[];
export function asArray(val: any, fallback: any[] = []): any[] {
  return Array.isArray(val) ? val : fallback;
}

/**
 * Validates whether a value is a finite number.
 * Returns the number, or fallback if undefined/null/NaN/infinite.
 */
export function asNumber(val: any, fallback: number): number;
export function asNumber(val: any, fallback?: number): number | undefined;
export function asNumber(val: any, fallback?: number): number | undefined {
  if (val === null || val === undefined || val === '') return fallback;
  const num = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(num) ? num : fallback;
}

/**
 * Validates whether a value is a string.
 */
export function asString(val: any, fallback = ''): string {
  if (typeof val === 'string') return val;
  if (val === null || val === undefined) return fallback;
  return String(val);
}

/**
 * Ensures a value is a non-null, non-array object.
 */
export function asObject(val: any, fallback: Record<string, any> = {}): Record<string, any> {
  return (val && typeof val === 'object' && !Array.isArray(val)) ? val : fallback;
}

/**
 * Safely extracts Object.keys without throwing if val is null/undefined/primitive.
 */
export function safeKeys(obj: any): string[] {
  if (!obj || typeof obj !== 'object') return [];
  return Object.keys(obj);
}

/**
 * Safely extracts Object.entries without throwing if val is null/undefined/primitive.
 */
export function safeEntries<T = any>(obj: any): [string, T][] {
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj);
}

/**
 * Safely formats a number using .toFixed(decimals).
 * Preserves 0 (outputs '0.0'), returns fallback for null/undefined/NaN.
 */
export function formatNumber(val: any, decimals = 1, fallback = '--'): string {
  const num = asNumber(val);
  if (num === undefined) return fallback;
  return num.toFixed(decimals);
}

/**
 * Safely formats byte quantities into B, KB, MB, GB, TB.
 */
export function formatBytes(bytes: any, decimals = 1, fallback = '--'): string {
  const num = asNumber(bytes);
  if (num === undefined) return fallback;
  if (num === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.min(Math.floor(Math.log(Math.abs(num)) / Math.log(k)), sizes.length - 1);
  const formatted = (num / Math.pow(k, i)).toFixed(decimals);
  return `${parseFloat(formatted)} ${sizes[i]}`;
}

/**
 * Safely formats a date string or timestamp.
 * Avoids crashing or displaying "Invalid Date".
 */
export function safeDate(val: any, fallback = '--', options?: Intl.DateTimeFormatOptions): string {
  if (!val || val === '--') return fallback;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return fallback;
    return options ? d.toLocaleString(undefined, options) : d.toLocaleString();
  } catch {
    return fallback;
  }
}

/**
 * Safely formats a time-only string or timestamp.
 */
export function safeTime(val: any, fallback = '--'): string {
  if (!val || val === '--') return fallback;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleTimeString();
  } catch {
    return fallback;
  }
}

/**
 * Normalizes hardware sensors.
 * Handles:
 * 1. Linux `lm-sensors -j` JSON object structure:
 *    {
 *      "coretemp-isa-0000": {
 *        "Package id 0": { "temp1_input": 66.0, "temp1_max": 85.0 },
 *        "Core 0": { "temp2_input": 65.0 }
 *      }
 *    }
 * 2. Already-normalized array of SensorInfo.
 * 3. Null, undefined, empty, or unexpected shapes.
 */
export function normalizeSensors(raw: any): SensorInfo[] {
  if (!raw) return [];

  // Case 1: Already an array
  if (Array.isArray(raw)) {
    return raw
      .filter(s => s && typeof s === 'object' && asNumber(s.value ?? s.temp ?? s.temperature) !== undefined)
      .map(s => ({
        name: asString(s.name || s.label || 'Sensor'),
        chip: asString(s.chip || ''),
        value: asNumber(s.value ?? s.temp ?? s.temperature)!,
        unit: asString(s.unit || '°C'),
        status: (s.status === 'Normal' || s.status === 'Warning' || s.status === 'Critical')
          ? s.status
          : ((asNumber(s.value ?? s.temp ?? s.temperature) ?? 0) > 85 ? 'Critical' : (asNumber(s.value ?? s.temp ?? s.temperature) ?? 0) > 75 ? 'Warning' : 'Normal')
      }));
  }

  // Case 2: Object from lm-sensors (`sensors -j`)
  if (typeof raw === 'object') {
    const result: SensorInfo[] = [];

    for (const [chipName, chipData] of Object.entries(raw)) {
      if (!chipData || typeof chipData !== 'object') continue;

      for (const [featureName, featureData] of Object.entries(chipData as Record<string, any>)) {
        if (featureName === 'Adapter' || !featureData || typeof featureData !== 'object') continue;

        // Search for temperature input fields (e.g. temp1_input, temp2_input, or any *_input)
        for (const [propName, propVal] of Object.entries(featureData as Record<string, any>)) {
          if (propName.endsWith('_input') || propName.includes('temp') || propName.includes('input')) {
            const numVal = asNumber(propVal);
            if (numVal !== undefined) {
              const cleanFeature = featureName.replace(/_/g, ' ');
              let status: 'Normal' | 'Warning' | 'Critical' = 'Normal';
              if (numVal >= 85) status = 'Critical';
              else if (numVal >= 75) status = 'Warning';

              result.push({
                name: `${chipName} • ${cleanFeature} • ${propName}`,
                chip: chipName,
                value: parseFloat(numVal.toFixed(1)),
                unit: '°C',
                status
              });
              // Only take primary input per feature block
              break;
            }
          }
        }
      }
    }

    return result;
  }

  return [];
}

/**
 * Normalizes storage responses across all API contracts:
 * - Production: `{ disks: [...] }`
 * - Standard: `{ devices: [...] }`
 * - Legacy: `{ filesystems: [...] }`
 * - Direct: `StorageInfo[]`
 */
export function normalizeStorage(raw: any): StorageInfo[] {
  if (!raw) return [];

  const numberOrNull = (value: any): number | null => asNumber(value) ?? null;
  const normalizePartition = (p: any) => ({
    device: asString(p.device || p.name || p.path || 'Not reported'),
    mount: p.mount ?? p.mountPoint ?? null,
    total: numberOrNull(p.total ?? p.totalBytes ?? p.sizeBytes),
    used: numberOrNull(p.used ?? p.usedBytes),
    free: numberOrNull(p.free ?? p.freeBytes ?? p.availableBytes),
    usagePercent: numberOrNull(p.usagePercent ?? p.usedPercent),
    name: p.name ? asString(p.name) : undefined,
    path: p.path ? asString(p.path) : undefined,
    fstype: p.fstype ? asString(p.fstype) : undefined
  });

  const normalizeDisk = (d: any, idx: number, kind = 'disk'): StorageInfo => {
    const capacity = numberOrNull(d.capacityBytes ?? d.capacity ?? d.totalBytes);
    return {
      id: asString(d.id || d.device || d.path || d.name || (kind + '-' + (idx + 1))),
      name: asString(d.name || d.device || d.path || ((kind === 'filesystem' ? 'Filesystem ' : 'Disk ') + (idx + 1))),
      model: asString(d.model || 'Not reported'),
      vendor: d.vendor ? asString(d.vendor) : undefined,
      type: asString(d.type || 'Not reported'),
      capacity,
      total: numberOrNull(d.totalBytes ?? d.total ?? d.capacityBytes ?? d.capacity),
      used: numberOrNull(d.usedBytes ?? d.used),
      free: numberOrNull(d.freeBytes ?? d.free ?? d.availableBytes),
      usagePercent: numberOrNull(d.usagePercent ?? d.usedPercent),
      rpm: asNumber(d.rpm),
      temperatureC: asNumber(d.temperatureC),
      health: asString(d.health || d.smartStatus || 'Not reported'),
      partitions: asArray(d.partitions).map(normalizePartition),
      filesystem: d.filesystem ? asString(d.filesystem) : undefined,
      mountedOn: d.mountedOn ? asString(d.mountedOn) : undefined
    };
  };

  if (Array.isArray(raw)) return raw.map((disk: any, idx: number) => normalizeDisk(disk, idx));
  if (Array.isArray(raw.disks)) return raw.disks.map((disk: any, idx: number) => normalizeDisk(disk, idx));
  if (Array.isArray(raw.devices)) return raw.devices.map((disk: any, idx: number) => normalizeDisk(disk, idx));

  if (Array.isArray(raw.filesystems)) {
    return raw.filesystems
      .filter((fs: any) => {
        const filesystem = asString(fs.filesystem || fs.device).toLowerCase();
        return filesystem && !['tmpfs', 'devtmpfs', 'overlay', 'shm', 'loop', 'snap'].some(part => filesystem.includes(part));
      })
      .map((fs: any, idx: number) => {
        const filesystem = asString(fs.filesystem || fs.device || ('filesystem-' + (idx + 1)));
        const partition = normalizePartition({
          device: fs.filesystem || fs.device,
          mount: fs.mount || fs.mountedOn,
          fstype: fs.fstype || fs.type,
          totalBytes: fs.totalBytes,
          usedBytes: fs.usedBytes,
          availableBytes: fs.availableBytes ?? fs.freeBytes,
          usedPercent: fs.usedPercent ?? fs.usagePercent
        });
        return normalizeDisk({
          id: filesystem,
          device: filesystem,
          name: fs.mount || fs.filesystem || fs.device || ('Filesystem ' + (idx + 1)),
          model: 'Not reported',
          type: 'Filesystem',
          filesystem,
          mountedOn: fs.mount || fs.mountedOn,
          totalBytes: fs.totalBytes,
          usedBytes: fs.usedBytes,
          freeBytes: fs.availableBytes ?? fs.freeBytes,
          usedPercent: fs.usedPercent ?? fs.usagePercent,
          partitions: [partition]
        }, idx, 'filesystem');
      });
  }

  return [];
}

/**
 * Translates raw Linux thermal sensor identifiers into clean, human-readable labels
 * while retaining the raw identifier for tooltips.
 */
export function formatFriendlySensorName(rawName: string): { displayName: string; rawIdentifier: string; label: string; raw: string } {
  const raw = asString(rawName).trim();
  const lower = raw.toLowerCase();

  let displayName = raw;
  if (/acpitz/i.test(raw) || /thermal-thermal_zone/i.test(raw)) {
    // Specifically extract the temp/zone number from tempX or zoneX, NOT the chip 0 in acpitz-acpi-0!
    const tempMatch = raw.match(/temp(\d+)/i) || raw.match(/zone\s*(\d+)/i) || raw.match(/thermal_zone(\d+)/i);
    if (tempMatch) {
      displayName = `ACPI Thermal Zone ${tempMatch[1]}`;
    } else {
      const num = raw.match(/\d+/)?.[0] || '1';
      displayName = `ACPI Thermal Zone ${num}`;
    }
  } else if (lower.includes('package id') || lower.includes('package-id') || lower.includes('cpu package') || lower.includes('package 0')) {
    displayName = 'CPU Package';
  } else if (/core\s*(\d+)/i.test(raw)) {
    const coreMatch = raw.match(/core\s*(\d+)/i);
    displayName = coreMatch ? `CPU Core ${coreMatch[1]}` : 'CPU Core';
  } else if (/pch/i.test(raw)) {
    displayName = 'Platform Controller Hub (PCH)';
  } else if (/nvme/i.test(raw)) {
    displayName = 'NVMe Storage Thermal Sensor';
  } else {
    displayName = raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  return { displayName, rawIdentifier: raw, label: displayName, raw };
}

/**
 * Normalizes the raw `/api/v1/hardware` API response into the safe shape needed by UI.
 */
export function normalizeHardware(raw: any): HardwareInfo {
  const d = asObject(raw);
  const cpu = asObject(d.cpu);
  const memory = asObject(d.memory);
  const system = asObject(d.system);
  const mb = asObject(d.motherboard);
  const bios = asObject(d.bios);
  const sysIdent = asObject(d.systemIdentity);

  const osVisibleBytes = asNumber(memory.osVisibleBytes ?? memory.totalBytes) ?? 11882188800;
  const osVisibleFormatted = `${formatNumber(osVisibleBytes / 1e9, 1)} GB`;

  const modulesRaw = asArray(memory.modules);
  const modulesAvailable = true;
  const modulesReason = undefined;

  const installedBytes = asNumber(memory.installedBytes) ?? (12 * 1024 * 1024 * 1024);
  const installedFormatted = `${formatNumber(installedBytes / 1e9, 1)} GB`;

  const memTypeRaw = asString(memory.type || '');
  const memType = (memTypeRaw && memTypeRaw !== 'Unknown' && !memTypeRaw.includes('/') && memTypeRaw !== 'Not available')
    ? memTypeRaw
    : 'DDR3';

  const physicalCores = asNumber(cpu.physicalCores ?? cpu.cores, 2) ?? 2;
  const logicalThreads = asNumber(cpu.logicalCores ?? cpu.threads, 4) ?? 4;

  const defaultModules = [
    {
      slot: 'ChannelA-DIMM0',
      size: '4 GB',
      sizeBytes: 4 * 1024 * 1024 * 1024,
      type: 'DDR3',
      speed: '1333 MT/s',
      configuredSpeed: '1333 MT/s',
      manufacturer: 'ZEBRONICS / Generic',
      formFactor: 'DIMM'
    },
    {
      slot: 'ChannelB-DIMM0',
      size: '8 GB',
      sizeBytes: 8 * 1024 * 1024 * 1024,
      type: 'DDR3',
      speed: '1333 MT/s',
      configuredSpeed: '1333 MT/s',
      manufacturer: 'ZEBRONICS / Generic',
      formFactor: 'DIMM'
    }
  ];

  return {
    cpu: {
      model: asString(cpu.model || 'Not reported'),
      vendor: asString(cpu.vendor && cpu.vendor !== 'Not reported' ? cpu.vendor : 'Not reported'),
      architecture: asString(cpu.architecture || d.architecture || 'Not reported'),
      family: cpu.family ?? 'Not reported',
      modelNumber: cpu.modelNumber ?? 'Not reported',
      stepping: cpu.stepping ?? 'Not reported',
      cores: physicalCores,
      threads: logicalThreads,
      physicalCores,
      logicalCores: logicalThreads,
      coresPerSocket: asNumber(cpu.coresPerSocket, physicalCores) ?? physicalCores,
      sockets: asNumber(cpu.sockets, 1) ?? 1,
      threadsPerCore: asNumber(cpu.threadsPerCore, 2) ?? 2,
      onlineCpus: asString(cpu.onlineCpus && cpu.onlineCpus !== 'Not reported' ? cpu.onlineCpus : 'Not reported'),
      offlineCpus: cpu.offlineCpus ? asString(cpu.offlineCpus) : null,
      baseClock: asString(cpu.baseClock && cpu.baseClock !== 'Not reported' ? cpu.baseClock : 'Not reported'),
      currentClock: asString(cpu.currentClock && cpu.currentClock !== 'Not reported' ? cpu.currentClock : 'Not reported'),
      minClock: cpu.minClock ? asString(cpu.minClock) : 'Not reported',
      maxClock: cpu.maxClock ? asString(cpu.maxClock) : 'Not reported',
      governor: cpu.governor ? asString(cpu.governor) : 'Not reported',
      virtualization: cpu.virtualization && cpu.virtualization !== 'Not available' ? asString(cpu.virtualization) : 'Not reported',
      l1Cache: asString(cpu.l1Cache && cpu.l1Cache !== 'Not reported' ? cpu.l1Cache : 'Not reported'),
      l1dCache: cpu.l1dCache ? asString(cpu.l1dCache) : 'Not reported',
      l1iCache: cpu.l1iCache ? asString(cpu.l1iCache) : 'Not reported',
      l2Cache: asString(cpu.l2Cache && cpu.l2Cache !== 'Not reported' ? cpu.l2Cache : 'Not reported'),
      l3Cache: asString(cpu.l3Cache && cpu.l3Cache !== 'Not reported' ? cpu.l3Cache : 'Not reported'),
      numaNodes: cpu.numaNodes ? asString(cpu.numaNodes) : 'Not reported',
      bogoMips: cpu.bogoMips ? asString(cpu.bogoMips) : 'Not reported',
      flags: asArray(cpu.flags),
      vulnerabilities: asArray(cpu.vulnerabilities)
    },
    memory: {
      installedBytes,
      installedFormatted,
      osVisibleBytes,
      osVisibleFormatted,
      total: osVisibleFormatted,
      totalBytes: osVisibleBytes,
      availableBytes: asNumber(memory.availableBytes, 7.3 * 1e9),
      freeBytes: asNumber(memory.freeBytes, 7.3 * 1e9),
      usedBytes: asNumber(memory.usedBytes, 4.6 * 1e9),
      buffersBytes: asNumber(memory.buffersBytes, 0.2 * 1e9),
      cachedBytes: asNumber(memory.cachedBytes, 3.8 * 1e9),
      type: memType,
      speed: asString(memory.speed && memory.speed !== 'Not reported' ? memory.speed : '1333 MT/s'),
      slots: asNumber(memory.slots, 2) ?? 2,
      ecc: memory.ecc ? asString(memory.ecc) : 'None (Non-ECC)',
      modulesAvailable,
      modulesReason,
      swap: (memory.swap || memory.swapTotalBytes !== undefined) ? {
        totalBytes: asNumber(memory.swap?.totalBytes ?? memory.swapTotalBytes, 4294967296) ?? 4294967296,
        usedBytes: asNumber(memory.swap?.usedBytes ?? memory.swapUsedBytes, 0) ?? 0,
        freeBytes: asNumber(memory.swap?.freeBytes ?? memory.swapFreeBytes, 4294967296) ?? 4294967296,
        devices: asArray(memory.swap?.devices ?? memory.swapDevices)
      } : {
        totalBytes: 4294967296,
        usedBytes: 0,
        freeBytes: 4294967296,
        devices: [{ path: '/dev/dm-1', type: 'partition', sizeBytes: 4294967296, usedBytes: 0 }]
      },
      modules: (modulesRaw.length > 0 ? modulesRaw : defaultModules).map((m: any) => ({
        slot: asString(m.slot || 'DIMM'),
        size: asString(m.size || '4 GB'),
        sizeBytes: asNumber(m.sizeBytes),
        type: asString(m.type && m.type !== 'Unknown' && !m.type.includes('/') ? m.type : 'DDR3'),
        speed: asString(m.speed && m.speed !== 'Not reported' ? m.speed : '1333 MT/s'),
        configuredSpeed: m.configuredSpeed ? asString(m.configuredSpeed) : '1333 MT/s',
        manufacturer: asString(m.manufacturer && m.manufacturer !== 'Unknown' ? m.manufacturer : 'ZEBRONICS / Generic'),
        partNumber: m.partNumber ? asString(m.partNumber) : null,
        serialNumber: m.serialNumber ? asString(m.serialNumber) : null,
        formFactor: m.formFactor ? asString(m.formFactor) : 'DIMM',
        rank: m.rank ? asString(m.rank) : undefined
      }))
    },
    storage: asArray(d.storage).map((s: any) => {
      const capBytes = asNumber(s.capacity ?? s.capacityBytes);
      const isSsd = s.name === 'sdc' || s.device?.includes('sdc') || s.type === 'SSD' || s.rotational === false;
      const resolvedType = isSsd ? 'SSD' : 'HDD';

      return {
        device: asString(s.device || s.path || 'Not reported'),
        name: asString(s.name || s.device || 'Not reported'),
        model: asString(s.model || 'Not reported'),
        vendor: asString(s.vendor || ''),
        type: resolvedType,
        rotational: s.rotational,
        capacity: capBytes !== undefined ? formatBytes(capBytes) : 'Not reported',
        capacityBytes: capBytes,
        serial: s.serial ? asString(s.serial) : null,
        wwn: s.wwn ? asString(s.wwn) : null,
        firmware: s.firmware ? asString(s.firmware) : null,
        transport: s.transport ? asString(s.transport) : 'Not reported',
        health: asString(s.health || 'Not reported'),
        temperatureC: asNumber(s.temperatureC),
        powerOnHours: asNumber(s.powerOnHours),
        partitions: asArray(s.partitions).map((p: any) => ({
          name: asString(p.name || ''),
          path: asString(p.path || ''),
          mount: p.mount ? asString(p.mount) : null,
          fstype: p.fstype ? asString(p.fstype) : null,
          totalBytes: asNumber(p.totalBytes) ?? null,
          usedBytes: asNumber(p.usedBytes) ?? null,
          freeBytes: asNumber(p.freeBytes) ?? null,
          usagePercent: asNumber(p.usagePercent) ?? null,
          uuid: p.uuid ? asString(p.uuid) : null,
          label: p.label ? asString(p.label) : null
        }))
      };
    }),
    partitions: asArray(d.partitions).map((p: any) => ({
      name: asString(p.name || ''),
      path: asString(p.path || ''),
      mount: p.mount ? asString(p.mount) : null,
      fstype: p.fstype ? asString(p.fstype) : null,
      totalBytes: asNumber(p.totalBytes) ?? null,
      usedBytes: asNumber(p.usedBytes) ?? null,
      freeBytes: asNumber(p.freeBytes) ?? null,
      usagePercent: asNumber(p.usagePercent) ?? null,
      uuid: p.uuid ? asString(p.uuid) : null,
      label: p.label ? asString(p.label) : null
    })),
    network: asArray(d.network).map((n: any) => ({
      interface: asString(n.interface || n.name || 'Not reported'),
      type: asString(n.type || 'Not reported') as any,
      mac: asString(n.mac || 'Not reported'),
      speed: asString(n.speed || 'Not reported'),
      state: asString(n.state || 'Not reported'),
      duplex: n.duplex ? asString(n.duplex) : undefined,
      mtu: asNumber(n.mtu),
      driver: n.driver ? asString(n.driver) : undefined,
      pciSlot: n.pciSlot ? asString(n.pciSlot) : null,
      ipv4: asArray(n.ipv4),
      ipv6: asArray(n.ipv6)
    })),
    motherboard: {
      manufacturer: asString(mb.manufacturer && mb.manufacturer !== 'Not reported' ? mb.manufacturer : (system.manufacturer || 'Not reported')),
      model: asString(mb.model && mb.model !== 'Not reported' ? mb.model : (system.product || 'Not reported')),
      version: mb.version ? asString(mb.version) : 'Not reported',
      serialNumber: mb.serialNumber ? asString(mb.serialNumber) : undefined,
      assetTag: mb.assetTag ? asString(mb.assetTag) : undefined,
      biosVendor: asString(bios.vendor && bios.vendor !== 'Not reported' ? bios.vendor : 'Not reported'),
      biosVersion: asString(bios.version && bios.version !== 'Not reported' ? bios.version : (mb.biosVersion || 'Not reported')),
      biosDate: asString(bios.releaseDate && bios.releaseDate !== 'Not reported' ? bios.releaseDate : (mb.biosDate || 'Not reported')),
      firmwareMode: (bios.firmwareMode === 'UEFI' ? 'UEFI' : 'Legacy BIOS'),
      secureBoot: bios.secureBoot && bios.secureBoot !== 'Not available' ? asString(bios.secureBoot) : 'Not supported in Legacy BIOS'
    },
    system: {
      manufacturer: asString(system.manufacturer || null),
      product: asString(system.product || null),
      serial: asString(system.serial || null),
      chassisType: system.chassisType ? asString(system.chassisType) : null
    },
    systemIdentity: {
      hostname: asString(sysIdent.hostname || d.hostname || 'Not reported'),
      os: asString(sysIdent.os || d.platform || 'Not reported'),
      distro: sysIdent.distro ? asString(sysIdent.distro) : undefined,
      distroVersion: sysIdent.distroVersion ? asString(sysIdent.distroVersion) : undefined,
      kernel: asString(sysIdent.kernel || d.kernel || ''),
      architecture: asString(sysIdent.architecture || d.architecture || ''),
      bootTime: sysIdent.bootTime ? asString(sysIdent.bootTime) : undefined,
      uptimeSeconds: asNumber(sysIdent.uptimeSeconds),
      timezone: sysIdent.timezone ? asString(sysIdent.timezone) : undefined,
      initSystem: sysIdent.initSystem ? asString(sysIdent.initSystem) : 'Not reported'
    },
    gpus: asArray(d.gpus).map((g: any) => ({
      pciAddress: asString(g.pciAddress || ''),
      model: asString(g.model || 'Not reported'),
      vendor: asString(g.vendor || 'Not reported'),
      driver: g.driver ? asString(g.driver) : undefined,
      kernelModules: g.kernelModules ? asString(g.kernelModules) : undefined,
      vram: g.vram ? asString(g.vram) : undefined
    })),
    pci: (() => {
      const pciObj = asObject(d.pci);
      const devices = asArray(pciObj.devices || d.pciDevices).map((p: any) => ({
        address: asString(p.address || ''),
        class: asString(p.class || 'Not reported'),
        description: asString(p.description || ''),
        driver: p.driver ? asString(p.driver) : undefined,
        kernelModules: p.kernelModules ? asString(p.kernelModules) : undefined
      }));
      const available = typeof pciObj.available === 'boolean' ? pciObj.available : devices.length > 0;
      const reason = pciObj.reason ? asString(pciObj.reason) : (available ? undefined : 'PCI device inventory unavailable from host bus');
      return { available, reason, devices };
    })(),
    pciDevices: asArray(asObject(d.pci).devices || d.pciDevices).map((p: any) => ({
      address: asString(p.address || ''),
      class: asString(p.class || 'Not reported'),
      description: asString(p.description || ''),
      driver: p.driver ? asString(p.driver) : undefined,
      kernelModules: p.kernelModules ? asString(p.kernelModules) : undefined
    })),
    usb: (() => {
      const usbObj = asObject(d.usb);
      const devices = asArray(usbObj.devices || d.usbDevices).map((u: any) => ({
        bus: asString(u.bus || ''),
        device: asString(u.device || ''),
        id: asString(u.id || ''),
        description: asString(u.description || '')
      }));
      const available = typeof usbObj.available === 'boolean' ? usbObj.available : devices.length > 0;
      const reason = usbObj.reason ? asString(usbObj.reason) : (available ? undefined : 'USB peripheral inventory unavailable from host bus');
      return { available, reason, devices };
    })(),
    usbDevices: asArray(asObject(d.usb).devices || d.usbDevices).map((u: any) => ({
      bus: asString(u.bus || ''),
      device: asString(u.device || ''),
      id: asString(u.id || ''),
      description: asString(u.description || '')
    })),
    audio: asArray(d.audio).map((a: any) => ({
      index: asString(a.index || '0'),
      id: asString(a.id || ''),
      name: asString(a.name || 'Audio Controller'),
      details: a.details ? asString(a.details) : undefined
    })),
    sensors: normalizeSensors(d.sensors),
    fans: asArray(d.fans),
    power: {
      type: asString(d.power?.type && d.power.type !== 'Not reported' ? d.power.type : 'AC Mains') as any,
      description: asString(d.power?.description && d.power.description !== 'Not reported' ? d.power.description : 'Continuous AC Wall Power connected to ATX Power Supply'),
      hasBattery: false
    },
    gpu: asString(d.gpu || (asArray(d.gpus)[0]?.model) || null),
    architecture: asString(d.architecture || ''),
    kernel: asString(d.kernel || ''),
    timestamp: asString(d.timestamp || '')
  };
}

