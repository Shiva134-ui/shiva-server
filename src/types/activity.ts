export interface ActivityEvent {
  id: string;
  type: 'system' | 'auth' | 'docker' | 'storage' | 'network' | 'alert';
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'info';
}