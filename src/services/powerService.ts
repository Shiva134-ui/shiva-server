import { apiClient } from './api';
import { auth } from '../contexts/AuthContext';
import type { ElectricityStats } from '../types/system';

export interface Esp32RelayConfig {
  targetHost: string;
  macAddress: string;
  status: string;
  lastShutdownReason: string;
  powerLossDetection: boolean;
  restorePowerAction: string;
  wolRetryCount: number;
  wolRetryInterval: number;
}

export interface PowerEventItem {
  id?: string;
  timestamp: string;
  type: string;
  status?: string;
  message?: string;
  source?: string;
}

export interface Esp32EventsResponse {
  esp32Relay: Esp32RelayConfig;
  events: PowerEventItem[];
  timestamp: string;
}

export interface PowerScheduleConfig {
  masterEnabled: boolean;
  dailyStartEnabled: boolean;
  dailyShutdownEnabled: boolean;
  startTime: string;
  shutdownTime: string;
  daysOfWeek: number[];
  powerLossDetection: boolean;
  restorePowerAction: string;
  restorationDelay: number;
  wolRetryCount: number;
  wolRetryInterval: number;
  allowedWakeWindowStart: string;
  allowedWakeWindowEnd: string;
  lastShutdownReason: string;
  currentState: string;
}

const WAKE_GATEWAY_DEV = '/wake-gateway/wake';
const WAKE_RELAY_PROD = import.meta.env.VITE_WAKE_RELAY_URL || 'https://wake-relay.madesh.in/wake';
const WAKE_TOKEN = import.meta.env.VITE_WAKE_TOKEN || '80e0140eb46046db8bd0e216bf7c938d3d6ef0a0896947158acc95c5a28f39c4';

import { terminalService } from './terminal';

export const powerService = {
  getElectricityStats: () => apiClient.get<ElectricityStats>('/power/electricity'),
  getEsp32Events: () => apiClient.get<Esp32EventsResponse>('/power/esp32/events'),
  getPowerConfig: () => apiClient.get<PowerScheduleConfig>('/power/config'),
  updatePowerConfig: (config: Partial<PowerScheduleConfig>): Promise<PowerScheduleConfig> =>
    apiClient.post('/power/config', config),
  wakeServer: async (customToken?: string | null): Promise<{ success: boolean; message: string }> => {
    // 1. In Vite development mode, dispatch via the local dev proxy directly to ESP32 gateway
    if (import.meta.env.DEV) {
      try {
        const devRes = await fetch(WAKE_GATEWAY_DEV, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${WAKE_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        if (devRes.ok) {
          return { success: true, message: 'Wake request dispatched to ESP32 gateway! WOL packet is broadcasting.' };
        }
      } catch (devErr) {
        console.warn('[PowerService] Dev proxy attempt failed, falling back to relay:', devErr);
      }
    }

    // 2. Resolve token for Cloudflare Wake Relay
    let token = customToken;
    if (!token && auth?.currentUser) {
      try {
        token = await auth.currentUser.getIdToken();
      } catch (_) {}
    }

    // 3. In production with Firebase JWT, dispatch via Cloudflare Wake Relay
    if (token && !token.startsWith('dev-admin')) {
      try {
        const relayRes = await fetch(WAKE_RELAY_PROD, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (relayRes.ok) {
          return { success: true, message: 'Wake request relayed to ESP32! Server will be online shortly.' };
        }
        const errData = await relayRes.json().catch(() => null);
        if (errData?.error) {
          throw new Error(errData.error);
        }
      } catch (relayErr: any) {
        console.warn('[PowerService] Wake relay fetch failed, attempting direct gateway:', relayErr.message);
      }
    }

    // 4. Try direct ESP32 Cloudflare Gateway call
    try {
      const directRes = await fetch('https://wake.madesh.in/wake', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WAKE_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      if (directRes.ok) {
        return { success: true, message: 'Wake request dispatched to ESP32 gateway.' };
      }
    } catch (_) {}

    // 5. Fallback: try host API if reachable
    try {
      return await apiClient.post('/power/wake', {});
    } catch (e: any) {
      throw new Error(e?.message || 'Failed to dispatch wake packet to ESP32 gateway.');
    }
  },
  restartServer: async (): Promise<{ success: boolean; action: string }> => {
    try {
      return await apiClient.post('/power/restart', {});
    } catch (err: any) {
      console.warn('[PowerService] /power/restart error, trying terminal fallback:', err.message);
      const termRes = await terminalService.execute('sudo /usr/local/sbin/madesh-server-restart || sudo reboot').catch(() => null);
      if (termRes && (termRes.exitCode === 0 || termRes.exitCode === null)) {
        return { success: true, action: 'restart' };
      }
      throw err;
    }
  },
  shutdownServer: async (): Promise<{ success: boolean; action: string }> => {
    try {
      return await apiClient.post('/power/shutdown', {});
    } catch (err: any) {
      console.warn('[PowerService] /power/shutdown error, trying terminal fallback:', err.message);
      const termRes = await terminalService.execute('sudo /usr/local/sbin/madesh-server-shutdown || sudo poweroff').catch(() => null);
      if (termRes && (termRes.exitCode === 0 || termRes.exitCode === null)) {
        return { success: true, action: 'shutdown' };
      }
      throw err;
    }
  },
  getElectricityConfig: () => apiClient.get<any>('/power/electricity/config'),
  updateElectricityConfig: (config: any) => apiClient.post<any>('/power/electricity/config', config),
};

