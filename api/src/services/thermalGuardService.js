const fs = require('fs');
const path = require('path');
const Store = require('../utils/store');
const { runCommand } = require('../utils/command');
const cpuService = require('./cpuService');
const notificationEngine = require('./notificationEngine');

class ThermalGuardService {
  constructor() {
    this.store = new Store('thermalConfig.json', {
      enabled: true,
      warningThreshold: 82,
      criticalThreshold: 88,
      autoThrottleEnabled: true,
      throttleTargets: ['immich_machine_learning', 'madesh-cadvisor'],
      pausedContainers: [],
      lastThrottleTimestamp: null,
      history: []
    });

    this.checkInterval = null;
  }

  async init() {
    if (this.checkInterval) clearInterval(this.checkInterval);
    // Background check every 30 seconds
    this.checkInterval = setInterval(() => this.tick(), 30000);
  }

  async getStatus() {
    const config = await this.store.read();
    let currentTemp = null;
    let maxTemp = null;
    let coreTemps = [];

    try {
      const cpuData = await cpuService.getCpuTemperature();
      if (cpuData) {
        maxTemp = cpuData.max ?? cpuData.package;
        currentTemp = cpuData.package ?? maxTemp;
        coreTemps = cpuData.cores || [];
      }
    } catch (_) {}

    let state = 'normal';
    if (maxTemp && maxTemp >= config.criticalThreshold) state = 'critical';
    else if (maxTemp && maxTemp >= config.warningThreshold) state = 'warning';

    // Keep up to 60 history points
    const history = config.history || [];

    return {
      enabled: config.enabled,
      currentTemp: currentTemp !== null ? Math.round(currentTemp) : null,
      maxTemp: maxTemp !== null ? Math.round(maxTemp) : null,
      coreTemps,
      warningThreshold: config.warningThreshold,
      criticalThreshold: config.criticalThreshold,
      autoThrottleEnabled: config.autoThrottleEnabled,
      throttleTargets: config.throttleTargets,
      pausedContainers: config.pausedContainers || [],
      lastThrottleTimestamp: config.lastThrottleTimestamp,
      state,
      history: history.slice(-60)
    };
  }

  async updateConfig(updates) {
    const config = await this.store.read();
    if (typeof updates.enabled === 'boolean') config.enabled = updates.enabled;
    if (typeof updates.warningThreshold === 'number') config.warningThreshold = updates.warningThreshold;
    if (typeof updates.criticalThreshold === 'number') config.criticalThreshold = updates.criticalThreshold;
    if (typeof updates.autoThrottleEnabled === 'boolean') config.autoThrottleEnabled = updates.autoThrottleEnabled;
    if (Array.isArray(updates.throttleTargets)) config.throttleTargets = updates.throttleTargets;

    await this.store.write(config);
    return await this.getStatus();
  }

  async tick() {
    try {
      const config = await this.store.read();
      if (!config.enabled) return;

      const cpuData = await cpuService.getCpuTemperature().catch(() => null);
      if (!cpuData) return;

      const maxTemp = cpuData.max || cpuData.package || 0;
      if (!maxTemp) return;

      // Append to history
      const now = new Date();
      config.history = config.history || [];
      config.history.push({
        time: now.toLocaleTimeString('en-US', { hour12: false }),
        temp: Math.round(maxTemp)
      });
      if (config.history.length > 60) config.history.shift();

      // Check critical threshold
      if (maxTemp >= config.criticalThreshold && config.autoThrottleEnabled) {
        // Find running throttle targets
        const runningTargets = [];
        for (const name of (config.throttleTargets || [])) {
          try {
            const inspect = await runCommand('docker', ['inspect', '--format', '{{.State.Running}}', name]).catch(() => 'false');
            if (inspect.trim() === 'true') {
              runningTargets.push(name);
            }
          } catch (_) {}
        }

        if (runningTargets.length > 0) {
          console.warn(`[ThermalGuard] CRITICAL: CPU at ${maxTemp}°C (Threshold ${config.criticalThreshold}°C). Pausing: ${runningTargets.join(', ')}`);
          for (const name of runningTargets) {
            await runCommand('docker', ['stop', name]).catch(() => {});
          }

          config.pausedContainers = Array.from(new Set([...(config.pausedContainers || []), ...runningTargets]));
          config.lastThrottleTimestamp = now.toISOString();

          await notificationEngine.sendNotification({
            title: `Thermal Guard Activated (${Math.round(maxTemp)}°C)`,
            body: `High CPU temp detected. Auto-stopped ${runningTargets.join(', ')} to protect hardware from thermal cutoff.`,
            severity: 'critical',
            category: 'hardware',
            event: 'thermal_throttle'
          }).catch(() => {});
        }
      }

      await this.store.write(config);
    } catch (err) {
      console.warn('[ThermalGuard] tick error:', err.message);
    }
  }

  async resumeContainers() {
    const config = await this.store.read();
    const paused = config.pausedContainers || [];
    const resumed = [];

    for (const name of paused) {
      try {
        await runCommand('docker', ['start', name]);
        resumed.push(name);
      } catch (_) {}
    }

    config.pausedContainers = [];
    await this.store.write(config);

    return { success: true, resumed };
  }
}

module.exports = new ThermalGuardService();
