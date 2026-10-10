export interface MetricDataPoint {
  timestamp: string;
  value: number;
}

export interface MetricSeries {
  current: number;
  data: MetricDataPoint[];
}

export type TimeRange = '1H' | '6H' | '24H' | '7D' | '30D';

export interface ChartData {
  cpu: MetricDataPoint[];
  ram: MetricDataPoint[];
  networkTx: MetricDataPoint[];
  networkRx: MetricDataPoint[];
  storageRead: MetricDataPoint[];
  storageWrite: MetricDataPoint[];
}