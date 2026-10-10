const { runCommand } = require('../utils/command');
const Store = require('../utils/store');

const DEFAULT_ECO = {
  enabled: false,
  quietHoursStart: '23:00',
  quietHoursEnd: '07:00',
  spindownHdd: true,
  pauseHeavyContainers: true,
  isCurrentlyEco: false,
  lastTriggered: null
};

class EcoModeService {
  constructor() {
    this.store = new Store('ecoModeConfig.json', DEFAULT_ECO);
  }

  async getStatus() {
    const config = await this.store.read();
    let hddState = 'active/idle';
    try {
      const hdOut = await runCommand('sudo', ['hdparm', '-C', '/dev/sdb']).catch(() => '');
      if (hdOut.includes('standby')) hddState = 'standby (spun down)';
      else if (hdOut.includes('sleeping')) hddState = 'sleeping';
    } catch (_) {}

    return {
      ...config,
      hddState,
      targetHdd: '/dev/sdb (WD Blue 1TB)'
    };
  }

  async toggleEco(manualState) {
    const config = await this.store.read();
    const shouldEnable = typeof manualState === 'boolean' ? manualState : !config.isCurrentlyEco;

    config.isCurrentlyEco = shouldEnable;
    config.lastTriggered = new Date().toISOString();

    if (shouldEnable) {
      if (config.spindownHdd) {
        // Spin down secondary HDD safely
        await runCommand('sudo', ['hdparm', '-y', '/dev/sdb']).catch(() => {});
      }
    }

    await this.store.write(config);
    return this.getStatus();
  }

  async updateConfig(updates) {
    const config = await this.store.read();
    const newConfig = { ...config, ...updates };
    await this.store.write(newConfig);
    return this.getStatus();
  }
}

module.exports = new EcoModeService();
