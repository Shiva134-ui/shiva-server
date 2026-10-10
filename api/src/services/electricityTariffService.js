const Store = require('../utils/store');

const DEFAULT_TARIFF = {
  ratePerKWh: 6.5,
  currencySymbol: '₹',
  region: 'Tamil Nadu (TNEB Slabs)',
  dailyUsageKWhEstimated: 1.15,
  monthlyFreeUnits: 0
};

class ElectricityTariffService {
  constructor() {
    this.store = new Store('electricityTariffConfig.json', DEFAULT_TARIFF);
  }

  async getTariff() {
    const config = await this.store.read();
    const rate = config.ratePerKWh || 6.5;
    
    // Projections for i3-3220 idle ~45W - 55W (approx 1.2 kWh / 24h)
    const dailyKWh = config.dailyUsageKWhEstimated || 1.2;
    const monthlyKWh = dailyKWh * 30;
    const yearlyKWh = dailyKWh * 365;

    const dailyCost = dailyKWh * rate;
    const monthlyCost = monthlyKWh * rate;
    const yearlyCost = yearlyKWh * rate;

    return {
      ratePerKWh: rate,
      currencySymbol: config.currencySymbol || '₹',
      region: config.region,
      dailyKWh: parseFloat(dailyKWh.toFixed(2)),
      monthlyKWh: parseFloat(monthlyKWh.toFixed(1)),
      yearlyKWh: parseFloat(yearlyKWh.toFixed(1)),
      dailyCost: parseFloat(dailyCost.toFixed(2)),
      monthlyCost: parseFloat(monthlyCost.toFixed(2)),
      yearlyCost: parseFloat(yearlyCost.toFixed(2)),
      updatedAt: config.updatedAt || new Date().toISOString()
    };
  }

  async updateTariff(updates) {
    const config = await this.store.read();
    const newConfig = {
      ...config,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await this.store.write(newConfig);
    return this.getTariff();
  }
}

module.exports = new ElectricityTariffService();
