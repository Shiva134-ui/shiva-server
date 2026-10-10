import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/ToastContext';
import { ServerProvider } from './contexts/ServerContext';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Login from './pages/Login';
import { setupForegroundMessaging } from './services/fcm';

// Pages
import Dashboard from './pages/Dashboard';
import SystemOverview from './pages/SystemOverview';
import SystemProcesses from './pages/SystemProcesses';
import SystemTemperatures from './pages/SystemTemperatures';
import SystemServices from './pages/SystemServices';
import SystemHardware from './pages/SystemHardware';
import SystemMaintenance from './pages/SystemMaintenance';
import SystemTerminal from './pages/SystemTerminal';
import AppPortal from './pages/AppPortal';
import AdminCron from './pages/AdminCron';
import DockerContainers from './pages/DockerContainers';
import DockerComposeEditor from './pages/DockerComposeEditor';
import StorageHeatmap from './pages/StorageHeatmap';
import StorageSync from './pages/StorageSync';
import NetworkTailscaleMesh from './pages/NetworkTailscaleMesh';
import SecurityWatchdog from './pages/SecurityWatchdog';
import DockerImages from './pages/DockerImages';
import DockerVolumes from './pages/DockerVolumes';
import DockerNetworks from './pages/DockerNetworks';
import MonitoringMetrics from './pages/MonitoringMetrics';
import MonitoringGrafana from './pages/MonitoringGrafana';
import MonitoringPrometheus from './pages/MonitoringPrometheus';
import MonitoringAlerts from './pages/MonitoringAlerts';
import StorageFiles from './pages/StorageFiles';
import StorageDisks from './pages/StorageDisks';
import StorageBackups from './pages/StorageBackups';
import NetworkInterfaces from './pages/NetworkInterfaces';
import NetworkWan from './pages/NetworkWan';
import NetworkFirewall from './pages/NetworkFirewall';
import NetworkDiagnostics from './pages/NetworkDiagnostics';
import PowerManagement from './pages/PowerManagement';
import PowerEsp32 from './pages/PowerEsp32';
import Notifications from './pages/Notifications';
import ServicesApps from './pages/ServicesApps';
import LogsSystem from './pages/LogsSystem';
import LogsDocker from './pages/LogsDocker';
import LogsAudit from './pages/LogsAudit';
import AdminUsers from './pages/AdminUsers';
import AdminUpdates from './pages/AdminUpdates';
import AdminSettings from './pages/AdminSettings';

export default function App() {
  useEffect(() => {
    setupForegroundMessaging();
  }, []);

  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route element={<ProtectedRoute />}>
              <Route element={<ServerProvider><Layout /></ServerProvider>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/system-overview" element={<SystemOverview />} />
                <Route path="/system-processes" element={<SystemProcesses />} />
                <Route path="/system-temperatures" element={<SystemTemperatures />} />
                <Route path="/system-services" element={<SystemServices />} />
                <Route path="/system-hardware" element={<SystemHardware />} />
                <Route path="/system-maintenance" element={<SystemMaintenance />} />
                <Route path="/system-terminal" element={<SystemTerminal />} />
                <Route path="/docker-containers" element={<DockerContainers />} />
                <Route path="/docker-compose" element={<DockerComposeEditor />} />
                <Route path="/docker-images" element={<DockerImages />} />
                <Route path="/docker-volumes" element={<DockerVolumes />} />
                <Route path="/docker-networks" element={<DockerNetworks />} />
                <Route path="/monitoring-metrics" element={<MonitoringMetrics />} />
                <Route path="/monitoring-grafana" element={<MonitoringGrafana />} />
                <Route path="/monitoring-prometheus" element={<MonitoringPrometheus />} />
                <Route path="/monitoring-alerts" element={<MonitoringAlerts />} />
                <Route path="/storage-files" element={<StorageFiles />} />
                <Route path="/storage-disks" element={<StorageDisks />} />
                <Route path="/storage-backups" element={<StorageBackups />} />
                <Route path="/storage-heatmap" element={<StorageHeatmap />} />
                <Route path="/storage-sync" element={<StorageSync />} />
                <Route path="/network-interfaces" element={<NetworkInterfaces />} />
                <Route path="/network-wan" element={<NetworkWan />} />
                <Route path="/network-firewall" element={<NetworkFirewall />} />
                <Route path="/network-diagnostics" element={<NetworkDiagnostics />} />
                <Route path="/network-tailscale" element={<NetworkTailscaleMesh />} />
                <Route path="/power-management" element={<PowerManagement />} />
                <Route path="/power-server" element={<Navigate to="/power-management" replace />} />
                <Route path="/power-esp32" element={<PowerEsp32 />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/services-portal" element={<AppPortal />} />
                <Route path="/app-portal" element={<Navigate to="/services-portal" replace />} />
                <Route path="/services-nextcloud" element={<Navigate to="/services-apps" replace />} />
                <Route path="/services-nginx" element={<Navigate to="/services-apps" replace />} />
                <Route path="/services-apps" element={<ServicesApps />} />
                <Route path="/logs" element={<Navigate to="/logs-system" replace />} />
                <Route path="/logs-system" element={<LogsSystem />} />
                <Route path="/logs-docker" element={<LogsDocker />} />
                <Route path="/logs-audit" element={<LogsAudit />} />
                <Route path="/admin-users" element={<AdminUsers />} />
                <Route path="/security-watchdog" element={<SecurityWatchdog />} />
                <Route path="/admin-cron" element={<AdminCron />} />
                <Route path="/admin-updates" element={<AdminUpdates />} />
                <Route path="/admin-settings" element={<AdminSettings />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

