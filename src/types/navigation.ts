import {
  LayoutDashboard,
  Monitor,
  Container,
  Activity,
  HardDrive,
  Globe,
  Zap,
  Cloud,
  FileText,
  Settings,
  Bell,
  type LucideIcon
} from 'lucide-react';

export interface NavSubItem {
  id: string;
  label: string;
  icon?: LucideIcon;
}

export interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  children: NavSubItem[];
}

export interface NavStandalone {
  id: string;
  label: string;
  icon: LucideIcon;
}

export type NavEntry = NavStandalone | NavGroup;

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return 'children' in entry;
}

export const navigation: NavEntry[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    id: 'system',
    label: 'System',
    icon: Monitor,
    children: [
      { id: 'system-overview', label: 'Overview' },
      { id: 'system-processes', label: 'Processes' },
      { id: 'system-temperatures', label: 'Temperatures' },
      { id: 'system-services', label: 'Auto-Start Manager' },
      { id: 'system-hardware', label: 'Hardware' },
      { id: 'system-maintenance', label: 'Maintenance' },
      { id: 'system-terminal', label: 'Terminal' },
    ],
  },
  {
    id: 'docker',
    label: 'Docker',
    icon: Container,
    children: [
      { id: 'docker-containers', label: 'Containers' },
      { id: 'docker-images', label: 'Images' },
      { id: 'docker-volumes', label: 'Volumes' },
      { id: 'docker-networks', label: 'Networks' },
      { id: 'docker-compose', label: 'Compose Stacks' },
    ],
  },
  {
    id: 'monitoring',
    label: 'Monitoring',
    icon: Activity,
    children: [
      { id: 'monitoring-metrics', label: 'Metrics' },
      { id: 'monitoring-grafana', label: 'Grafana' },
      { id: 'monitoring-prometheus', label: 'Prometheus' },
      { id: 'monitoring-alerts', label: 'Alerts' },
    ],
  },
  {
    id: 'storage',
    label: 'Storage',
    icon: HardDrive,
    children: [
      { id: 'storage-files', label: 'Files' },
      { id: 'storage-disks', label: 'Disks' },
      { id: 'storage-backups', label: 'Backups' },
      { id: 'storage-heatmap', label: 'Space Heatmap' },
      { id: 'storage-sync', label: 'Replication Sync' },
    ],
  },
  {
    id: 'network',
    label: 'Network',
    icon: Globe,
    children: [
      { id: 'network-interfaces', label: 'Interfaces' },
      { id: 'network-wan', label: 'WAN' },
      { id: 'network-firewall', label: 'Firewall' },
      { id: 'network-diagnostics', label: 'Diagnostics' },
      { id: 'network-tailscale', label: 'Tailscale Mesh' },
    ],
  },
  {
    id: 'power',
    label: 'Power',
    icon: Zap,
    children: [
      { id: 'power-management', label: 'Power Management' },
      { id: 'power-esp32', label: 'ESP32 Logs' },
    ],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
  },
  {
    id: 'services',
    label: 'Services',
    icon: Cloud,
    children: [
      { id: 'services-portal', label: 'App Portal' },
      { id: 'services-apps', label: 'Other Apps' },
    ],
  },
  {
    id: 'logs',
    label: 'Logs',
    icon: FileText,
    children: [
      { id: 'logs-system', label: 'System' },
      { id: 'logs-docker', label: 'Docker' },
      { id: 'logs-audit', label: 'Audit' },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    icon: Settings,
    children: [
      { id: 'admin-users', label: 'Users' },
      { id: 'security-watchdog', label: 'Security & SSH' },
      { id: 'admin-cron', label: 'Scheduled Tasks' },
      { id: 'admin-updates', label: 'Updates' },
      { id: 'admin-settings', label: 'Settings' },
    ],
  },
];

// Breadcrumb map
export const breadcrumbs: Record<string, string> = {
  dashboard: 'Dashboard',
  'system-overview': 'System → Overview',
  'system-processes': 'System → Processes',
  'system-temperatures': 'System → Temperatures',
  'system-services': 'System → Auto-Start Manager',
  'system-hardware': 'System → Hardware',
  'system-maintenance': 'System → Maintenance',
  'system-terminal': 'System → Terminal',

  'docker-containers': 'Docker → Containers',
  'docker-images': 'Docker → Images',
  'docker-volumes': 'Docker → Volumes',
  'docker-networks': 'Docker → Networks',
  'docker-compose': 'Docker → Compose Stacks',
  'monitoring-metrics': 'Monitoring → Metrics',
  'monitoring-grafana': 'Monitoring → Grafana',
  'monitoring-prometheus': 'Monitoring → Prometheus',
  'monitoring-alerts': 'Monitoring → Alerts',
  'storage-files': 'Storage → Files',
  'storage-disks': 'Storage → Disks',
  'storage-backups': 'Storage → Backups',
  'storage-heatmap': 'Storage → Space Heatmap',
  'storage-sync': 'Storage → Replication Sync',
  'network-interfaces': 'Network → Interfaces',
  'network-wan': 'Network → WAN',
  'network-firewall': 'Network → Firewall',
  'network-diagnostics': 'Network → Diagnostics',
  'network-tailscale': 'Network → Tailscale Mesh',
  'power-management': 'Power → Power Management',
  'power-esp32': 'Power → ESP32 Logs',
  'notifications': 'Notifications',
  'services-portal': 'Services → App Portal',
  'services-nextcloud': 'Services → Nextcloud',
  'services-nginx': 'Services → Nginx',
  'services-apps': 'Services → Other Apps',
  'logs-system': 'Logs → System',
  'logs-docker': 'Logs → Docker',
  'logs-audit': 'Logs → Audit',
  'admin-users': 'Administration → Users',
  'security-watchdog': 'Administration → Security & SSH',
  'admin-cron': 'Administration → Scheduled Tasks',
  'admin-updates': 'Administration → Updates',
  'admin-settings': 'Administration → Settings',
};
