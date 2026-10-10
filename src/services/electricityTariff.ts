import { apiClient } from './api';

export interface ElectricityTariff {
  ratePerKWh: number;
  currencySymbol: string;
  region: string;
  dailyKWh: number;
  monthlyKWh: number;
  yearlyKWh: number;
  dailyCost: number;
  monthlyCost: number;
  yearlyCost: number;
  updatedAt: string;
}

export const electricityTariffService = {
  getTariff: (): Promise<ElectricityTariff> =>
    apiClient.get('/power/tariff'),

  updateTariff: (updates: Partial<ElectricityTariff>): Promise<ElectricityTariff> =>
    apiClient.post('/power/tariff', updates)
};
