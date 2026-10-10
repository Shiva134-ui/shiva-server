export type AutoStartType = 'service' | 'container' | 'timer';

export interface AppService {
  id?: string;
  name: string;
  type?: AutoStartType;
  description?: string;
  category?: string;
  status?: 'running' | 'stopped' | 'error' | 'unknown';
  state?: string;
  active?: boolean;
  subState?: string;
  enabled?: boolean;
  enabledState?: string;
  image?: string;
  url?: string;
  version?: string;
}

