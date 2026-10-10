import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Terminal, 
  Trash2, 
  Gauge, 
  Boxes, 
  FolderSync, 
  Lock, 
  Network, 
  PieChart, 
  CalendarClock, 
  Server, 
  Power,
  X,
  FileText,
  Container,
  ShieldCheck,
  HardDrive,
  Cpu,
  Thermometer,
  Bell,
  Settings,
  Users,
  Package,
  Layers,
  Activity,
  Zap
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: any;
  path?: string;
  action?: () => void;
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    { id: 'dashboard', title: 'Dashboard', description: 'Server metrics overview & live electricity', category: 'Navigation', icon: Server, path: '/dashboard' },
    { id: 'app-portal', title: 'App Portal & Launcher', description: 'Immich, Nextcloud, Portainer, Grafana launchpad', category: 'Homelab', icon: Boxes, path: '/services-portal' },
    { id: 'services-apps', title: 'Other Applications', description: 'Portainer, Home Assistant, Pi-hole, Uptime Kuma', category: 'Homelab', icon: Layers, path: '/services-apps' },
    { id: 'terminal', title: 'System Terminal', description: 'Run bash commands & inspect host diagnostics', category: 'System', icon: Terminal, path: '/system-terminal' },
    { id: 'maintenance', title: 'Safe Cleanup Wizard', description: 'Prune orphaned Docker layers & journals', category: 'System', icon: Trash2, path: '/system-maintenance' },
    { id: 'system-overview', title: 'System Overview', description: 'CPU load, RAM pressure, and system uptime', category: 'System', icon: Activity, path: '/system-overview' },
    { id: 'system-hardware', title: 'Hardware Diagnostics', description: 'Ryzen CPU, Kingston NVMe, WD Blue HDD sensors', category: 'System', icon: Cpu, path: '/system-hardware' },
    { id: 'system-temperatures', title: 'Thermal Guard', description: 'Host CPU core temperatures & fan controls', category: 'System', icon: Thermometer, path: '/system-temperatures' },
    { id: 'docker-containers', title: 'Docker Containers', description: 'Container runtimes, logs, stats, and compose', category: 'Docker', icon: Container, path: '/docker-containers' },
    { id: 'docker-compose', title: 'Docker Compose YAML Editor', description: 'Edit /opt/madesh-server compose stacks', category: 'Docker', icon: Boxes, path: '/docker-compose' },
    { id: 'heatmap', title: 'Storage Space Heatmap', description: 'Visual breakdown of SSD and 1TB WD Blue HDD', category: 'Storage', icon: PieChart, path: '/storage-heatmap' },
    { id: 'storage-files', title: 'File Explorer', description: 'Browse and inspect server directories', category: 'Storage', icon: HardDrive, path: '/storage-files' },
    { id: 'storage-disks', title: 'Disks & SMART Health', description: 'NVMe & SATA drive health diagnostics', category: 'Storage', icon: HardDrive, path: '/storage-disks' },
    { id: 'sync', title: 'Storage Cloud Replication', description: 'Automated rsync backup sync manager', category: 'Storage', icon: FolderSync, path: '/storage-sync' },
    { id: 'speedtest', title: 'Network Diagnostics', description: 'Speedtest benchmark, ping, and DNS probes', category: 'Network', icon: Gauge, path: '/network-diagnostics' },
    { id: 'mesh', title: 'Tailscale Mesh Topology', description: 'Inspect devices on private Tailnet mesh', category: 'Network', icon: Network, path: '/network-tailscale' },
    { id: 'security', title: 'Security & SSH Watchdog', description: 'Active terminal logins & auth journals', category: 'Security', icon: Lock, path: '/security-watchdog' },
    { id: 'cron', title: 'Scheduled Tasks & Cron', description: 'Manage recurring cron jobs & systemd timers', category: 'Administration', icon: CalendarClock, path: '/admin-cron' },
    { id: 'admin-users', title: 'System Users & Sessions', description: 'Dashboard member access & Linux user accounts', category: 'Administration', icon: Users, path: '/admin-users' },
    { id: 'admin-updates', title: 'System Updates & Packages', description: 'APT package lists & unattended upgrades', category: 'Administration', icon: Package, path: '/admin-updates' },
    { id: 'admin-settings', title: 'Settings & Preferences', description: 'Alert thresholds, electricity tariffs, and WOL', category: 'Administration', icon: Settings, path: '/admin-settings' },
    { id: 'logs-system', title: 'System Journal Logs', description: 'journalctl streams from systemd services', category: 'Logs', icon: FileText, path: '/logs-system' },
    { id: 'logs-docker', title: 'Docker Container Logs', description: 'stdout/stderr streams from active containers', category: 'Logs', icon: Container, path: '/logs-docker' },
    { id: 'logs-audit', title: 'Security Audit Trail', description: 'SSH logins, sudo commands, and auth events', category: 'Logs', icon: ShieldCheck, path: '/logs-audit' },
    { id: 'power', title: 'Power & Sleep Management', description: 'Reboot, shutdown, and electricity tracker', category: 'Power', icon: Power, path: '/power-management' },
    { id: 'power-esp32', title: 'ESP32 Wake Logs', description: 'Remote wake relay telemetry & health state', category: 'Power', icon: Zap, path: '/power-esp32' },
    { id: 'notifications', title: 'Push Notifications', description: 'FCM push alert channels & trigger rules', category: 'Alerts', icon: Bell, path: '/notifications' }
  ];

  const filtered = commands.filter(c => 
    c.title.toLowerCase().includes(query.toLowerCase()) || 
    c.description.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      } else if (isOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % (filtered.length || 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (filtered[selectedIndex]) {
            handleSelect(filtered[selectedIndex]);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSelect = (item: CommandItem) => {
    setIsOpen(false);
    setQuery('');
    if (item.path) navigate(item.path);
    else if (item.action) item.action();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
    >
      <div className="bg-[#111111] border border-[#2A2A2A] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col animate-slide-up">
        {/* Search Input Bar */}
        <div className="p-3.5 sm:p-4 border-b border-[#2A2A2A] flex items-center gap-3 bg-[#141414]">
          <Search className="w-4 h-4 text-[#8C8C8C] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="Type a command or jump to page (e.g. terminal, storage, speedtest)..."
            className="w-full bg-transparent text-xs sm:text-sm text-[#ECECEC] focus:outline-none placeholder-[#8C8C8C] font-sans"
            autoFocus
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setSelectedIndex(0); }}
              className="p-1 rounded-lg text-[#8C8C8C] hover:text-[#ECECEC] transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-lg text-[#8C8C8C] hover:text-white transition"
          >
            <kbd className="text-[10px] bg-[#222222] border border-[#333333] px-1.5 py-0.5 rounded text-[#8C8C8C] font-mono">ESC</kbd>
          </button>
        </div>

        {/* Results List */}
        <div ref={listRef} className="max-h-88 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#8C8C8C] space-y-1">
              <Search className="w-6 h-6 mx-auto text-[#444444]" />
              <p>No matching pages or commands found for &ldquo;{query}&rdquo;.</p>
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-2.5 sm:p-3 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#222222] border border-[#383838] shadow-sm'
                      : 'bg-transparent border border-transparent hover:bg-[#1A1A1A]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-xl shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-white text-[#0A0A0A]'
                        : 'bg-[#1A1A1A] text-[#8C8C8C] border border-[#2A2A2A]'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className={`text-xs font-semibold tracking-tight transition-colors ${
                        isSelected ? 'text-white' : 'text-[#ECECEC]'
                      }`}>
                        {item.title}
                      </div>
                      <div className={`text-[11px] truncate leading-relaxed ${
                        isSelected ? 'text-[#B0B0B0]' : 'text-[#737373]'
                      }`}>
                        {item.description}
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-lg shrink-0 ml-2 border ${
                    isSelected
                      ? 'bg-[#2C2C2C] text-[#ECECEC] border-[#404040]'
                      : 'text-[#8C8C8C] bg-[#161616] border-[#262626]'
                  }`}>
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-2.5 sm:p-3 border-t border-[#242424] bg-[#0E0E0E] flex items-center justify-between text-[11px] text-[#8C8C8C]">
          <div className="flex items-center gap-2">
            <span>Navigate with</span>
            <kbd className="px-1.5 py-0.5 bg-[#1E1E1E] border border-[#2E2E2E] rounded text-[#ECECEC] font-mono">↑</kbd>
            <kbd className="px-1.5 py-0.5 bg-[#1E1E1E] border border-[#2E2E2E] rounded text-[#ECECEC] font-mono">↓</kbd>
            <span className="ml-1">Select with</span>
            <kbd className="px-1.5 py-0.5 bg-[#1E1E1E] border border-[#2E2E2E] rounded text-[#ECECEC] font-mono">↵</kbd>
          </div>
          <span>Open with <kbd className="px-1.5 py-0.5 bg-[#1E1E1E] border border-[#2E2E2E] rounded text-[#ECECEC] font-mono">Ctrl + K</kbd></span>
        </div>
      </div>
    </div>
  );
}
