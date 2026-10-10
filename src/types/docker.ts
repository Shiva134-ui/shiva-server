export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  state: 'running' | 'stopped' | 'restarting' | 'error';
  status: string;
  ports: string[];
}

export interface DockerStats {
  total: number;
  running: number;
  stopped: number;
  healthy: number;
  unhealthy: number;
  restarting: number;
}