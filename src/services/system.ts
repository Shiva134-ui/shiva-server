import { apiClient } from './api';
import type { SystemProcess, HardwareInfo } from '../types/system';

export interface HardwareTemperaturesResponse {
  success: boolean;
  timestamp: string;
  summary: {
    packageTemp: number;
    maxTemp: number;
    thermalState: 'nominal' | 'warning' | 'critical';
    throttleThreshold: number;
    tripPoint: number;
  };
  cpu: {
    package: number;
    max: number;
    cores: { name: string; temp: number }[];
  };
  motherboard: {
    sensor: string;
    adapter: string;
    temp: number;
  }[];
  disks: {
    device: string;
    model: string;
    serial: string;
    size: string;
    temp: number;
    healthGrade: string;
  }[];
  thermalGuard?: any;
}

export const systemService = {
  getHealth: (options?: RequestInit) => apiClient.get<any>('/health', options),
  getInfo: (options?: RequestInit) => apiClient.get<any>('/system', options),
  getCpu: (options?: RequestInit) => apiClient.get<any>('/cpu', options),
  getMemory: (options?: RequestInit) => apiClient.get<any>('/memory', options),
  getStorage: (options?: RequestInit) => apiClient.get<any>('/storage', options),
  getNetwork: (options?: RequestInit) => apiClient.get<any>('/network', options),
  getProcesses: (options?: RequestInit): Promise<SystemProcess[]> => apiClient.get('/processes', options),
  getHardware: (options?: RequestInit): Promise<HardwareInfo> => apiClient.get('/hardware', options),
  getTemperatures: async (options?: RequestInit): Promise<HardwareTemperaturesResponse> => {
    try {
      const direct = await apiClient.get<HardwareTemperaturesResponse>('/hardware/temperatures', options);
      if (direct && direct.summary) return direct;
    } catch (_) {
      // Direct endpoint not on current server, seamlessly aggregate live hardware & thermal endpoints
    }

    const [thermalRes, hwRes, smartRes, cpuRes] = await Promise.allSettled([
      apiClient.get<any>('/system/thermal-guard', options),
      apiClient.get<any>('/hardware', options),
      apiClient.get<any>('/storage/smart-deep', options),
      apiClient.get<any>('/cpu', options)
    ]);

    const thermal = thermalRes.status === 'fulfilled' ? thermalRes.value : null;
    const hw = hwRes.status === 'fulfilled' ? hwRes.value : null;
    const smart = smartRes.status === 'fulfilled' ? smartRes.value : null;
    const cpu = cpuRes.status === 'fulfilled' ? cpuRes.value : null;

    const packageTemp = Number(thermal?.currentTemp ?? cpu?.temperature ?? 0);
    const maxTemp = Number(thermal?.maxTemp ?? (packageTemp > 0 ? packageTemp : 0));
    const thermalState = (thermal?.state === 'critical' ? 'critical' : thermal?.state === 'warning' ? 'warning' : 'nominal') as 'nominal' | 'warning' | 'critical';

    // Parse core temperatures
    let cores: { name: string; temp: number }[] = [];
    if (Array.isArray(thermal?.coreTemps) && thermal.coreTemps.length > 0) {
      cores = thermal.coreTemps.map((c: any, i: number) => {
        if (typeof c === 'object' && c !== null) {
          return {
            name: c.name || `Core ${i}`,
            temp: typeof c.temp === 'number' ? c.temp : (Number(c.temp) || packageTemp)
          };
        }
        return {
          name: `Core ${i}`,
          temp: Number(c) || packageTemp
        };
      });
    } else {
      const hwSensors = Array.isArray(hw?.sensors) ? hw.sensors : [];
      const coreSensors = hwSensors.filter((s: any) => 
        (s.name?.toLowerCase().includes('core') || s.chip?.includes('coretemp')) && Number(s.value) > 0
      );
      if (coreSensors.length > 0) {
        cores = coreSensors.map((s: any, i: number) => ({
          name: s.name || `Core ${i}`,
          temp: Number(s.value)
        }));
      } else if (packageTemp > 0) {
        cores = [
          { name: 'Core 0', temp: packageTemp },
          { name: 'Core 1', temp: packageTemp }
        ];
      }
    }

    // Parse disks temperatures
    let disks: any[] = [];
    if (Array.isArray(smart?.devices) && smart.devices.length > 0) {
      disks = smart.devices.map((d: any) => ({
        device: d.device || '/dev/sda',
        model: d.model || 'Storage Disk',
        serial: d.serial || '',
        size: d.size || 'Unknown',
        temp: d.temperature !== null && d.temperature !== undefined ? Number(d.temperature) : null,
        healthGrade: d.healthGrade || (d.passed ? 'Excellent' : 'Good')
      }));
    } else if (Array.isArray(hw?.storage) && hw.storage.length > 0) {
      disks = hw.storage.map((d: any, i: number) => ({
        device: d.name || `/dev/sd${String.fromCharCode(97 + i)}`,
        model: d.model || 'Storage Disk',
        serial: d.serial || '',
        size: d.size || 'Unknown',
        temp: d.temperatureC !== null && d.temperatureC !== undefined ? Number(d.temperatureC) : null,
        healthGrade: d.health === 'Critical' ? 'Warning' : 'Good'
      }));
    }

    // Motherboard sensors
    const mbSensors: any[] = [];
    const hwSensors = Array.isArray(hw?.sensors) ? hw.sensors : [];
    const acpiSensors = hwSensors.filter((s: any) => 
      s.chip?.includes('acpitz') || s.name?.toLowerCase().includes('acpi') || s.name?.toLowerCase().includes('zone')
    );
    if (acpiSensors.length > 0) {
      acpiSensors.forEach((s: any) => {
        mbSensors.push({
          sensor: s.name || 'ACPI Thermal Zone',
          adapter: s.chip || 'ACPI Platform',
          temp: Number(s.value) || 0
        });
      });
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        packageTemp,
        maxTemp,
        thermalState,
        throttleThreshold: Number(thermal?.criticalThreshold ?? 88),
        tripPoint: 105
      },
      cpu: {
        package: packageTemp,
        max: maxTemp,
        cores
      },
      motherboard: mbSensors,
      disks,
      thermalGuard: thermal
    };
  },
  killProcess: (pid: number, options?: RequestInit): Promise<{success: boolean}> => apiClient.post('/system/kill', { pid }, options)
};

