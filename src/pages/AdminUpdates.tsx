import { useState, useEffect, useCallback } from 'react';
import { Package, RefreshCw, Search, AlertTriangle, CheckCircle, RotateCw, Cpu, Layers, Download, Power } from 'lucide-react';
import { adminService, type UpdatesResponse, type UpgradablePackage } from '../services/admin';
import { powerService } from '../services/powerService';
import PageLoader from '../components/ui/PageLoader';
import ErrorState from '../components/ui/ErrorState';
import Badge from '../components/ui/Badge';
import { useToast } from '../components/ui/ToastContext';
import ConfirmDialog from '../components/ui/ConfirmDialog';

export default function AdminUpdates() {
  const [data, setData] = useState<UpdatesResponse | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'kernel' | 'runtime' | 'network'>('all');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [upgradeLog, setUpgradeLog] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const [confirmUpgradeAll, setConfirmUpgradeAll] = useState(false);
  const [confirmUpgradeSingle, setConfirmUpgradeSingle] = useState<string | null>(null);
  const [confirmReboot, setConfirmReboot] = useState(false);
  const { addToast } = useToast();

  const loadUpdates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getUpdates();
      setData(res);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to check for updates'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUpdates();
  }, [loadUpdates]);

  const handleRefreshCache = async () => {
    setActionLoading(true);
    addToast({ title: 'Refreshing Repositories', message: 'Fetching latest package manifests via apt-get update...', type: 'info' });
    try {
      const res = await adminService.refreshUpdates();
      setData(res);
      addToast({ title: 'Cache Refreshed', message: 'APT package lists updated successfully.', type: 'success' });
    } catch (err: any) {
      addToast({ title: 'Cache Refresh Failed', message: err.message || 'Unknown error', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const executeUpgradeAll = async () => {
    setActionLoading(true);
    addToast({ title: 'Upgrading System', message: 'Starting unattended upgrade for all packages...', type: 'info' });
    try {
      const res = await adminService.upgradePackages();
      setUpgradeLog(res.output);
      addToast({ title: 'Upgrade Completed', message: 'All pending packages upgraded successfully.', type: 'success' });
      await loadUpdates();
    } catch (err: any) {
      addToast({ title: 'Upgrade Failed', message: err.message || 'Unknown error', type: 'error' });
    } finally {
      setActionLoading(false);
      setConfirmUpgradeAll(false);
    }
  };

  const executeUpgradeSingle = async () => {
    if (!confirmUpgradeSingle) return;
    const pkgName = confirmUpgradeSingle;
    setActionLoading(true);
    addToast({ title: 'Upgrading Package', message: `Installing update for ${pkgName}...`, type: 'info' });
    try {
      const res = await adminService.upgradePackages(pkgName);
      setUpgradeLog(res.output);
      addToast({ title: 'Package Upgraded', message: `Successfully updated ${pkgName}.`, type: 'success' });
      await loadUpdates();
    } catch (err: any) {
      addToast({ title: 'Upgrade Failed', message: err.message || 'Unknown error', type: 'error' });
    } finally {
      setActionLoading(false);
      setConfirmUpgradeSingle(null);
    }
  };

  const executeReboot = async () => {
    setActionLoading(true);
    addToast({ title: 'Restarting Server', message: 'Reboot signal dispatched to Ubuntu host...', type: 'warning' });
    try {
      await powerService.restartServer();
      addToast({ title: 'Reboot Transmitted', message: 'Host is rebooting now.', type: 'success' });
    } catch (err: any) {
      addToast({ title: 'Reboot Failed', message: err.message || 'Unknown error', type: 'error' });
    } finally {
      setActionLoading(false);
      setConfirmReboot(false);
    }
  };

  const packages = data?.packages || [];
  const filteredPackages = packages.filter((pkg: UpgradablePackage) => {
    const matchesSearch = !search ||
      pkg.package.toLowerCase().includes(search.toLowerCase()) ||
      (pkg.currentVersion && pkg.currentVersion.toLowerCase().includes(search.toLowerCase())) ||
      (pkg.newVersion && pkg.newVersion.toLowerCase().includes(search.toLowerCase())) ||
      (pkg.repository && pkg.repository.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (categoryFilter === 'kernel') {
      return pkg.package.startsWith('linux-') || pkg.package.includes('kernel');
    }
    if (categoryFilter === 'runtime') {
      return pkg.package.includes('docker') || pkg.package.includes('containerd') || pkg.package.includes('node') || pkg.package.includes('python');
    }
    if (categoryFilter === 'network') {
      return pkg.package.includes('tailscale') || pkg.package.includes('cloudflared') || pkg.package.includes('netplan') || pkg.package.includes('snapd');
    }
    return true;
  });

  const kernelPkgs = packages.filter(p => p.package.startsWith('linux-') || p.package.includes('kernel')).length;
  const runtimePkgs = packages.filter(p => p.package.includes('docker') || p.package.includes('node') || p.package.includes('containerd')).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-[#2A2A2A] pb-5">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#8C8C8C] mb-1 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-[#8C8C8C]" /> Administration
          </div>
          <h1 className="text-2xl font-normal font-serif text-[#ECECEC] tracking-tight">System Updates & Packages</h1>
          <p className="mt-1 text-xs text-[#8C8C8C] max-w-2xl">
            APT repository cache status, pending package upgrades, security patches, and reboot requirements.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleRefreshCache}
            disabled={actionLoading || loading}
            className="inline-flex items-center gap-2 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-3.5 py-2 text-xs text-[#ECECEC] transition hover:bg-[#222222] disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
            <span>Update APT Cache</span>
          </button>
          <button
            onClick={() => setConfirmUpgradeAll(true)}
            disabled={actionLoading || loading || packages.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-[#0A0A0A] hover:bg-neutral-200 transition disabled:opacity-50 shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Upgrade All ({packages.length})</span>
          </button>
          {data?.rebootRequired && (
            <button
              onClick={() => setConfirmReboot(true)}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-[#1A1A1A] hover:bg-amber-500/10 px-3.5 py-2 text-xs font-medium text-[#FBBF24] transition disabled:opacity-50 cursor-pointer"
            >
              <Power className="h-3.5 w-3.5" />
              <span>Reboot Server</span>
            </button>
          )}
        </div>
      </header>

      {/* Upgrade output log panel */}
      {upgradeLog && (
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#0A0A0A] p-4 text-xs font-mono max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between text-[#8C8C8C] mb-2">
            <span>Last Upgrade Log Output</span>
            <button onClick={() => setUpgradeLog(null)} className="text-[#8C8C8C] hover:text-[#ECECEC] cursor-pointer">Clear</button>
          </div>
          <pre className="text-[#4ADE80] whitespace-pre-wrap">{upgradeLog}</pre>
        </div>
      )}

      {/* Reboot Notice */}
      {data && data.rebootRequired && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-[#FBBF24] mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-[#FBBF24]">System Reboot Required</h3>
            <p className="text-xs text-[#FBBF24]/80 leading-relaxed">
              One or more core packages (e.g. Linux kernel or glibc) have been updated and require a host reboot to take full effect.
            </p>
            {data.rebootPackages && data.rebootPackages.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {data.rebootPackages.map((pkg, idx) => (
                  <span key={idx} className="rounded-lg bg-[#0F0F0F] border border-[#2A2A2A] px-2 py-0.5 font-mono text-[11px] text-[#ECECEC]">
                    {pkg}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stat Cards */}
      {data && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 2xl:gap-6">
          <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-3.5 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-[#8C8C8C]">
              <span>Upgradable</span>
              <Package className="h-4 w-4 text-[#8C8C8C]" />
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-mono font-semibold text-[#ECECEC]">
              {data.totalUpgradable}
            </div>
            <p className="mt-1 text-[11px] text-[#8C8C8C] truncate">Pending apt upgrades</p>
          </div>

          <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-3.5 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-[#8C8C8C]">
              <span>Reboot Required</span>
              <RotateCw className={`h-4 w-4 ${data.rebootRequired ? 'text-[#FBBF24]' : 'text-[#4ADE80]'}`} />
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-mono font-semibold text-[#ECECEC]">
              {data.rebootRequired ? 'Yes' : 'No'}
            </div>
            <p className="mt-1 text-[11px] text-[#8C8C8C] truncate">
              {data.rebootRequired ? 'Kernel restart pending' : 'System running clean'}
            </p>
          </div>

          <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-3.5 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-[#8C8C8C]">
              <span>Kernel & Modules</span>
              <Cpu className="h-4 w-4 text-[#8C8C8C]" />
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-mono font-semibold text-[#ECECEC]">
              {kernelPkgs}
            </div>
            <p className="mt-1 text-[11px] text-[#8C8C8C] truncate">Core OS packages</p>
          </div>

          <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-3.5 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-[#8C8C8C]">
              <span>Runtimes</span>
              <Layers className="h-4 w-4 text-[#8C8C8C]" />
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-mono font-semibold text-[#ECECEC]">
              {runtimePkgs}
            </div>
            <p className="mt-1 text-[11px] text-[#8C8C8C] truncate">Docker, Node, Python</p>
          </div>
        </div>
      )}

      {/* Filter and Category Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0 max-w-full">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs transition cursor-pointer shrink-0 whitespace-nowrap ${
              categoryFilter === 'all'
                ? 'bg-white text-[#0A0A0A] font-semibold shadow-sm'
                : 'bg-[#1A1A1A] border border-[#2A2A2A] text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222]'
            }`}
          >
            All Packages ({packages.length})
          </button>
          <button
            onClick={() => setCategoryFilter('kernel')}
            className={`px-3 py-1.5 rounded-xl text-xs transition cursor-pointer shrink-0 whitespace-nowrap ${
              categoryFilter === 'kernel'
                ? 'bg-white text-[#0A0A0A] font-semibold shadow-sm'
                : 'bg-[#1A1A1A] border border-[#2A2A2A] text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222]'
            }`}
          >
            Kernel ({kernelPkgs})
          </button>
          <button
            onClick={() => setCategoryFilter('runtime')}
            className={`px-3 py-1.5 rounded-xl text-xs transition cursor-pointer shrink-0 whitespace-nowrap ${
              categoryFilter === 'runtime'
                ? 'bg-white text-[#0A0A0A] font-semibold shadow-sm'
                : 'bg-[#1A1A1A] border border-[#2A2A2A] text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222]'
            }`}
          >
            Runtimes ({runtimePkgs})
          </button>
          <button
            onClick={() => setCategoryFilter('network')}
            className={`px-3 py-1.5 rounded-xl text-xs transition cursor-pointer shrink-0 whitespace-nowrap ${
              categoryFilter === 'network'
                ? 'bg-white text-[#0A0A0A] font-semibold shadow-sm'
                : 'bg-[#1A1A1A] border border-[#2A2A2A] text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222]'
            }`}
          >
            Networking
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8C8C8C]" />
          <input
            type="text"
            placeholder="Search package or version..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl text-xs text-[#ECECEC] placeholder:text-[#8C8C8C] focus:outline-none focus:border-white/30"
          />
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && !data && <PageLoader />}
      {error && !loading && <ErrorState title="Failed to check updates" message={error.message} onRetry={loadUpdates} />}

      {/* Packages Table */}
      {data && (
        <div className="overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-sm">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#2A2A2A] bg-[#0F0F0F] text-[#8C8C8C] uppercase tracking-wider text-[10px] font-semibold">
                <tr>
                  <th className="px-4 py-3">Package Name</th>
                  <th className="px-4 py-3">Current Version</th>
                  <th className="px-4 py-3">Available Upgrade</th>
                  <th className="px-4 py-3">Repository</th>
                  <th className="px-4 py-3">Architecture</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2A]/60">
                {filteredPackages.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[#8C8C8C]">
                      {packages.length === 0 ? (
                        <div className="flex flex-col items-center gap-2">
                          <CheckCircle className="h-6 w-6 text-[#4ADE80]" />
                          <span>All packages are up to date! No updates pending.</span>
                        </div>
                      ) : (
                        'No packages matched your search or category filter.'
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredPackages.map((pkg) => (
                    <tr key={pkg.package} className="hover:bg-[#222222]/40 transition">
                      <td className="px-4 py-3 font-mono font-medium text-[#ECECEC] flex items-center gap-2">
                        <Package className="h-3.5 w-3.5 text-[#8C8C8C] shrink-0" />
                        <span>{pkg.package}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[#8C8C8C]">
                        {pkg.currentVersion || '—'}
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-[#4ADE80]">
                        {pkg.newVersion || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="default" className="bg-[#0F0F0F] border border-[#2A2A2A] text-[#8C8C8C]">
                          {pkg.repository || 'apt'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-[#8C8C8C]">
                        {pkg.architecture || 'all'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setConfirmUpgradeSingle(pkg.package)}
                          disabled={actionLoading || loading}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] hover:bg-[#222222] px-3 py-1.5 text-[11px] font-medium text-[#ECECEC] transition disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                        >
                          <Download className="h-3 w-3" />
                          <span>Update</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {data.lastChecked && (
            <div className="px-4 py-2.5 border-t border-[#2A2A2A] bg-[#0F0F0F] text-[11px] text-[#8C8C8C] flex justify-between">
              <span>Showing {filteredPackages.length} of {packages.length} packages</span>
              <span>Last checked: {new Date(data.lastChecked).toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Upgrade All Dialog */}
      <ConfirmDialog
        isOpen={confirmUpgradeAll}
        onClose={() => setConfirmUpgradeAll(false)}
        onConfirm={executeUpgradeAll}
        title="Upgrade All Packages"
        message={`Are you sure you want to upgrade all ${packages.length} pending APT packages? This runs unattended in the background.`}
        confirmText="Upgrade All"
        variant="primary"
      />

      {/* Upgrade Single Package Dialog */}
      <ConfirmDialog
        isOpen={!!confirmUpgradeSingle}
        onClose={() => setConfirmUpgradeSingle(null)}
        onConfirm={executeUpgradeSingle}
        title="Upgrade Package"
        message={`Are you sure you want to install available updates for "${confirmUpgradeSingle}"?`}
        confirmText="Update Package"
        variant="primary"
      />

      {/* Reboot Server Dialog */}
      <ConfirmDialog
        isOpen={confirmReboot}
        onClose={() => setConfirmReboot(false)}
        onConfirm={executeReboot}
        title="Reboot Ubuntu Server"
        message="Are you sure you want to restart the host server now? All active network sessions and containers will be restarted."
        confirmText="Reboot Now"
        variant="danger"
      />
    </div>
  );
}
