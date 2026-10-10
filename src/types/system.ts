
export interface SystemInfo {
  hostname: string;
  platform: string;
  architecture: string;
  kernel: string;
  uptime: number;
  uptimeFormatted: string;
  cpuCount: number;
  cpuModel: string;
  cpuUsage: number;
  totalMemory: number;
  freeMemory: number;
  usedMemory: number;
  memoryUsagePercent: number;
  nodeVersion: string;
  timestamp: string;
  
  // IP and system identity fields
  lanIp?: string;
  tailscaleIp?: string;
  publicIp?: string;
  distro?: string;
  bootTime?: string;
  timezone?: string;
}

export interface CpuDetailInfo {
  vendor?: string;
  model: string;
  architecture?: string;
  family?: string | number | null;
  modelNumber?: string | number | null;
  stepping?: string | number | null;
  cores?: number;
  threads?: number;
  physicalCores?: number;
  logicalCores?: number;
  coresPerSocket?: number;
  sockets?: number;
  threadsPerCore?: number;
  onlineCpus?: string;
  offlineCpus?: string | null;
  baseClock?: string;
  currentClock?: string;
  minClock?: string | null;
  maxClock?: string | null;
  governor?: string | null;
  virtualization?: string | null;
  l1Cache?: string;
  l1dCache?: string | null;
  l1iCache?: string | null;
  l2Cache?: string;
  l3Cache?: string;
  numaNodes?: string | null;
  bogoMips?: string | null;
  flags?: string[];
  vulnerabilities?: { name: string; status: string }[];
}

export interface MemoryDetailInfo {
  installedBytes?: number | null;
  installedFormatted?: string;
  osVisibleBytes?: number;
  osVisibleFormatted?: string;
  total?: string;
  totalBytes?: number;
  availableBytes?: number;
  freeBytes?: number;
  usedBytes?: number;
  buffersBytes?: number;
  cachedBytes?: number;
  type?: string;
  speed?: string;
  slots?: number;
  ecc?: string | null;
  modulesAvailable?: boolean;
  modulesReason?: string;
  swap?: {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    devices?: { path: string; type: string; sizeBytes: number; usedBytes: number }[];
  };
  modules?: {
    slot: string;
    size: string;
    sizeBytes?: number;
    type: string;
    speed: string;
    configuredSpeed?: string | null;
    manufacturer: string;
    partNumber?: string | null;
    serialNumber?: string | null;
    formFactor?: string;
    rank?: string;
  }[];
}

export interface SubsystemStatus<T> {
  available: boolean;
  reason?: string;
  devices: T[];
}

export interface MotherboardInfo {
  manufacturer?: string;
  model?: string;
  version?: string;
  serialNumber?: string;
  assetTag?: string;
  biosVendor?: string;
  biosVersion?: string;
  biosDate?: string;
  firmwareMode?: 'UEFI' | 'Legacy BIOS' | 'Unknown';
  secureBoot?: string;
}

export interface GpuInfo {
  pciAddress: string;
  model: string;
  vendor: string;
  driver?: string;
  kernelModules?: string;
  vram?: string;
}

export interface PciDeviceInfo {
  address: string;
  class: string;
  description: string;
  driver?: string;
  kernelModules?: string;
}

export interface UsbDeviceInfo {
  bus: string;
  device: string;
  id: string;
  description: string;
}

export interface AudioDeviceInfo {
  index: string;
  id: string;
  name: string;
  details?: string;
}

export interface StorageDiskDetail {
  device: string;
  name: string;
  model: string;
  vendor: string;
  type: string;
  rotational?: boolean | null;
  capacity: string;
  capacityBytes?: number | null;
  serial?: string | null;
  wwn?: string | null;
  firmware?: string | null;
  transport?: string | null;
  health: string;
  temperatureC?: number | null;
  powerOnHours?: number | null;
  partitions: {
    name: string;
    path: string;
    mount: string | null;
    fstype: string | null;
    totalBytes: number | null;
    usedBytes: number | null;
    freeBytes: number | null;
    usagePercent: number | null;
    uuid?: string | null;
    label?: string | null;
  }[];
}

export interface NetworkAdapterDetail {
  interface: string;
  type: 'Physical Ethernet' | 'Wireless' | 'Tailscale' | 'Docker Bridge' | 'Virtual' | 'Loopback' | 'Not reported';
  mac: string;
  speed: string;
  state: string;
  duplex?: string;
  mtu?: number;
  driver?: string;
  pciSlot?: string | null;
  ipv4?: string[];
  ipv6?: string[];
}

export interface SystemIdentityInfo {
  hostname: string;
  os: string;
  distro?: string;
  distroVersion?: string;
  kernel: string;
  architecture: string;
  bootTime?: string;
  uptimeSeconds?: number;
  timezone?: string;
  initSystem?: string;
}

export interface PowerInfo {
  type: 'AC Mains' | 'Battery' | 'Not reported';
  description: string;
  hasBattery?: boolean;
}

export interface HardwareInfo {
  cpu: CpuDetailInfo;
  memory: MemoryDetailInfo;
  storage?: StorageDiskDetail[];
  partitions?: {
    name: string;
    path: string;
    mount: string | null;
    fstype: string | null;
    totalBytes: number | null;
    usedBytes: number | null;
    freeBytes: number | null;
    usagePercent: number | null;
    uuid?: string | null;
    label?: string | null;
  }[];
  network?: NetworkAdapterDetail[];
  motherboard?: MotherboardInfo;
  bios?: {
    vendor?: string | null;
    version?: string | null;
    releaseDate?: string | null;
    firmwareMode?: 'UEFI' | 'Legacy BIOS' | 'Unknown';
    secureBoot?: string;
  };
  system?: { manufacturer: string | null; product: string | null; serial: string | null; chassisType?: string | null };
  systemIdentity?: SystemIdentityInfo;
  gpus?: GpuInfo[];
  pci?: SubsystemStatus<PciDeviceInfo>;
  pciDevices?: PciDeviceInfo[];
  usb?: SubsystemStatus<UsbDeviceInfo>;
  usbDevices?: UsbDeviceInfo[];
  audio?: AudioDeviceInfo[];
  sensors?: SensorInfo[] | Record<string, any> | null;
  fans?: { name: string; rpm: number; status: 'Normal' | 'Warning' | 'Critical' }[];
  power?: PowerInfo;
  gpu?: string | null;
  architecture?: string;
  kernel?: string;
  timestamp?: string;
}

export interface SystemStatus {
  info: SystemInfo;
  cpu: CpuInfo;
  ram: RamInfo;
  storage: StorageInfo[];
  status: 'Healthy' | 'Warning' | 'Critical' | 'Offline';
}

export interface SensorInfo {
  name: string;
  chip?: string;
  value: number;
  unit: string;
  status: 'Normal' | 'Warning' | 'Critical';
}

export interface CpuInfo {
  model: string;
  cores: number;
  logicalCores?: number;
  threads?: number;
  frequency?: number;
  usagePercent?: number;
  speed?: string;
  temp?: number;
  temperature?: number;
  loadAvg?: number[];
  loadAverage?: { 1: number; 5: number; 15: number };
}

export interface RamInfo {
  total: number;
  free: number;
  used: number;
  usagePercent: number;
  availableBytes?: number;
  freeBytes?: number;
  swapTotalBytes?: number;
  swapUsedBytes?: number;
  swap?: {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
  };
}

export interface StorageInfo {
  id: string;
  name: string;
  model: string;
  vendor?: string;
  type?: string;
  capacity?: number | null;
  total: number | null;
  used: number | null;
  free: number | null;
  usagePercent: number | null;
  rpm?: number;
  temperatureC?: number;
  temperature?: number;
  health?: string;
  smartStatus?: string;
  partitions: {
    device?: string;
    mount: string | null;
    total: number | null;
    used: number | null;
    free: number | null;
    usagePercent: number | null;
    name?: string;
    path?: string;
    fstype?: string;
  }[];
  filesystem?: string;
  size?: string;
  available?: string;
  mountedOn?: string;
  totalBytes?: number | null;
  usedBytes?: number | null;
  freeBytes?: number | null;
}

export interface SystemProcess {
  pid: number;
  name: string;
  command: string;
  user: string;
  cpuPercent: number;
  memoryPercent: number;
  memUsage: number;
  state: string;
  vsz?: number;
  rss?: number;
  tty?: string;
  stat?: string;
  start?: string;
  time?: string;
}

export interface ElectricityStats {
  liveWatts?: number;
  isEstimated?: boolean;
  today?: {
    kWh?: number;
    cost?: number;
    minutes?: number;
    avgWatts?: number;
  };
  thisMonth?: {
    kWh?: number;
    cost?: number;
    fixedApplied?: boolean;
  };
  lifetime?: {
    kWh?: number;
    cost?: number;
  };
  tariff?: number;
}


