const Store = require('../utils/store');
const eventEngine = require('./eventEngine');
const notificationEngine = require('./notificationEngine');
const { runCommand } = require('../utils/command');

const INTERVAL_MS = 30000; // Check every 30 seconds

class PowerEngine {
  constructor() {
    this.interval = null;
    this.store = new Store('powerConfig.json', {
      masterEnabled: true,
      dailyStartEnabled: true,
      dailyShutdownEnabled: true,
      startTime: '08:00',
      shutdownTime: '00:00',
      daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
      autoResumeOnOutage: false,
      intentional_off: false,
      powerLossDetection: true,
      restorePowerAction: 'policy',
      restorationDelay: 5,
      wolRetryCount: 3,
      wolRetryInterval: 30,
      allowedWakeWindowStart: '08:00',
      allowedWakeWindowEnd: '23:59',
      lastShutdownReason: 'none',
      lastScheduledShutdownDate: null,
      currentState: 'online',
      esp32Status: 'unknown',
      esp32LastSeen: null
    });
  }

  async start() {
    if (this.interval) clearInterval(this.interval);
    
    // Evaluate boot immediately and dispatch server online notification
    await this.evaluateStartupPolicy();

    this.interval = setInterval(() => this.tick(), INTERVAL_MS);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }

  async tick() {
    try {
      const config = await this.store.read();
      if (!config.masterEnabled) return;

      // Evaluate scheduled shutdown at 12:00 AM (00:00) IST
      if (config.dailyShutdownEnabled) {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', hour12: false
        });
        
        const parts = formatter.formatToParts(now);
        const y = parts.find(p => p.type === 'year').value;
        const m = parts.find(p => p.type === 'month').value;
        const d = parts.find(p => p.type === 'day').value;
        const h = parts.find(p => p.type === 'hour').value;
        const min = parts.find(p => p.type === 'minute').value;
        
        const currentDateStr = `${y}-${m}-${d}`;
        const currentTimeStr = `${h}:${min}`;
        
        // Day of week in IST
        const istDateStr = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
        const istDate = new Date(istDateStr);
        const currentDayOfWeek = istDate.getDay();

        if (
          config.daysOfWeek.includes(currentDayOfWeek) &&
          currentTimeStr === config.shutdownTime &&
          config.lastScheduledShutdownDate !== currentDateStr
        ) {
          console.log('[PowerEngine] Executing scheduled nightly shutdown (12:00 AM IST)...');
          
          config.lastScheduledShutdownDate = currentDateStr;
          config.lastShutdownReason = 'scheduled_shutdown';
          config.intentional_off = true;
          config.currentState = 'scheduled_shutdown';
          await this.store.write(config);
          
          // Send instant notification
          await notificationEngine.sendNotification({
            title: 'Nightly Shutdown (12:00 AM IST)',
            body: 'Automated midnight power down executed according to schedule.',
            severity: 'info',
            category: 'power',
            event: 'scheduled_shutdown'
          });

          eventEngine.dispatchEvent('power', 'scheduled_shutdown');
          await runCommand('sudo', ['/usr/local/sbin/madesh-server-shutdown']);
        }
      }
    } catch (err) {
      console.error('[PowerEngine] Tick error:', err);
    }
  }

  async evaluateStartupPolicy() {
    try {
      const config = await this.store.read();
      
      const previousReason = config.lastShutdownReason;
      config.currentState = 'online';
      config.intentional_off = false;
      await this.store.write(config);

      // Send Server Online notification
      let reasonText = 'Server booted normally and all services are active.';
      if (previousReason === 'scheduled_shutdown') {
        reasonText = 'Morning wake complete (8:00 AM schedule). Server is online.';
      } else if (previousReason === 'outage') {
        reasonText = 'Server recovered and booted after grid power was restored in Father\'s house.';
      } else if (previousReason === 'manual_shutdown') {
        reasonText = 'Server powered on after manual shutdown.';
      }

      await notificationEngine.sendNotification({
        title: 'MΛDESH Server is Online',
        body: reasonText,
        severity: 'info',
        category: 'power',
        event: 'server_online'
      });

      console.log(`[PowerEngine] Server online notification sent. Previous reason: ${previousReason}`);
    } catch (err) {
      console.error('[PowerEngine] Startup policy evaluation error:', err);
    }
  }

  async handleEvent(event, details = {}) {
    try {
      const config = await this.store.read();
      
      // Dispatch standard event to Notification Engine & Rule Engine
      eventEngine.dispatchEvent('power', event, { details });
      
      if (event === 'esp32_boot') {
        config.esp32LastSeen = new Date().toISOString();
        config.esp32Status = 'online';
        await this.store.write(config);
        
        await notificationEngine.sendNotification({
          title: "Power Restored in Father's House",
          body: details.message || "ESP32 WOL controller has booted and reconnected to Wi-Fi.",
          severity: "info",
          category: "power",
          event: "power_restored"
        });
      } else if (event === 'wake_sent' || event === 'wake_packet_sent') {
        config.lastWakeTimestamp = new Date().toISOString();
        await this.store.write(config);
        
        await notificationEngine.sendNotification({
          title: "Wake-on-LAN Packet Sent",
          body: details.message || `ESP32 sent WOL magic packet to MΛDESH Server (${details.source || 'Scheduled 8:00 AM'}).`,
          severity: "info",
          category: "power",
          event: "wake_sent"
        });
      } else if (event === 'power_outage') {
        const offlineStates = ['shutdown', 'manual_shutdown', 'scheduled_shutdown', 'intentional_shutdown', 'outage', 'ac_recovery_shutdown', 'restart'];
        const wasOnline = !offlineStates.includes(config.currentState);
        
        config.currentState = 'outage';
        config.lastShutdownReason = 'outage';
        await this.store.write(config);
        
        await notificationEngine.sendNotification({
          title: "Power Outage Detected",
          body: "Power loss reported in Father's house. Server initiated graceful shutdown.",
          severity: "critical",
          category: "power",
          event: "power_outage"
        });

        if (wasOnline) {
          console.log('[PowerEngine] Power outage event while online. Executing emergency shutdown.');
          await runCommand('sudo', ['/usr/local/sbin/madesh-server-shutdown']);
        }
      } else {
        config.currentState = event;
        await this.store.write(config);
      }
    } catch (err) {
      console.error('[PowerEngine] handleEvent error:', err);
    }
  }
}

module.exports = new PowerEngine();
