import { useState, useEffect, useCallback } from 'react';
import { 
  ExternalLink, 
  Plus, 
  Edit2, 
  Trash2, 
  RefreshCw, 
  RotateCcw,
  LayoutDashboard, 
  Cloud, 
  Image as ImageIcon, 
  Boxes, 
  BarChart2, 
  Gamepad2, 
  Globe, 
  Server, 
  Search, 
  Activity,
  HardDrive,
  Shield,
  Zap,
  X 
} from 'lucide-react';
import { 
  appPortalService, 
  CANONICAL_DEFAULT_APPS, 
  normalizeAppUrl, 
  type AppPortalItem 
} from '../services/appPortal';
import { useToast } from '../components/ui/ToastContext';
import ConfirmDialog from '../components/ui/ConfirmDialog';

export default function AppPortal() {
  const [apps, setApps] = useState<AppPortalItem[]>(() => {
    try {
      const cached = localStorage.getItem('madesh_app_portal_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length >= CANONICAL_DEFAULT_APPS.length) {
          return parsed;
        }
      }
    } catch (_) {}
    return CANONICAL_DEFAULT_APPS;
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Partial<AppPortalItem> | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const { addToast } = useToast();

  const loadApps = useCallback(async () => {
    try {
      const data = await appPortalService.getApps();
      if (data.apps && data.apps.length > 0) {
        setApps(data.apps);
      } else {
        setApps(CANONICAL_DEFAULT_APPS);
      }
    } catch (err: any) {
      addToast({ title: 'Portal Notice', message: err.message || 'Loaded local canonical apps', type: 'info' });
      setApps(CANONICAL_DEFAULT_APPS);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadApps();
    const interval = setInterval(loadApps, 30000);
    return () => clearInterval(interval);
  }, [loadApps]);

  const categories = ['All', ...Array.from(new Set(apps.map(a => a.category).filter(Boolean)))];

  const filteredApps = apps.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.description.toLowerCase().includes(search.toLowerCase()) ||
      app.primaryUrl.toLowerCase().includes(search.toLowerCase()) ||
      (app.category && app.category.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || app.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenAdd = () => {
    setEditingApp({
      name: '',
      category: 'Management',
      description: '',
      icon: 'Globe',
      primaryUrl: 'https://app.madesh.in',
      directUrl: 'https://app.madesh.in',
      port: 80,
      color: 'blue'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (app: AppPortalItem) => {
    setEditingApp({ ...app });
    setIsModalOpen(true);
  };

  const executeDelete = async () => {
    if (!deleteConfirm) return;
    const { id, name } = deleteConfirm;
    try {
      const res = await appPortalService.deleteApp(id);
      setApps(res.apps && res.apps.length > 0 ? res.apps : CANONICAL_DEFAULT_APPS);
      addToast({ title: 'App Removed', message: `Removed "${name}" from portal.`, type: 'success' });
    } catch (err: any) {
      addToast({ title: 'Delete Failed', message: err.message, type: 'error' });
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleResetDefaults = async () => {
    try {
      const res = await appPortalService.resetDefaults();
      setApps(res.apps && res.apps.length > 0 ? res.apps : CANONICAL_DEFAULT_APPS);
      addToast({ title: 'Subdomains Restored', message: 'All canonical *.madesh.in services restored.', type: 'success' });
    } catch (err: any) {
      addToast({ title: 'Reset Notice', message: err.message, type: 'error' });
      setApps(CANONICAL_DEFAULT_APPS);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApp?.name || !editingApp?.primaryUrl) {
      addToast({ title: 'Validation', message: 'Application Name and URL are required', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const sanitizedApp = {
        ...editingApp,
        primaryUrl: normalizeAppUrl(editingApp.primaryUrl, editingApp.port, editingApp.id),
        directUrl: normalizeAppUrl(editingApp.directUrl || editingApp.primaryUrl, editingApp.port, editingApp.id)
      };

      const res = await appPortalService.saveApp(sanitizedApp);
      setApps(res.apps && res.apps.length > 0 ? res.apps : CANONICAL_DEFAULT_APPS);
      setIsModalOpen(false);
      setEditingApp(null);
      addToast({ title: 'App Saved', message: `"${sanitizedApp.name}" updated successfully.`, type: 'success' });
    } catch (err: any) {
      addToast({ title: 'Save Failed', message: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const renderIcon = (iconName: string, color: string) => {
    const iconProps = { className: 'w-5 h-5' };
    let IconComp = Globe;

    switch (iconName?.toLowerCase()) {
      case 'layoutdashboard':
        IconComp = LayoutDashboard;
        break;
      case 'cloud':
        IconComp = Cloud;
        break;
      case 'image':
      case 'imageicon':
        IconComp = ImageIcon;
        break;
      case 'boxes':
        IconComp = Boxes;
        break;
      case 'barchart2':
        IconComp = BarChart2;
        break;
      case 'gamepad2':
        IconComp = Gamepad2;
        break;
      case 'server':
        IconComp = Server;
        break;
      case 'activity':
        IconComp = Activity;
        break;
      case 'harddrive':
        IconComp = HardDrive;
        break;
      case 'shield':
        IconComp = Shield;
        break;
      case 'zap':
        IconComp = Zap;
        break;
      default:
        IconComp = Globe;
    }

    const colorClasses: Record<string, string> = {
      blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      sky: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
      emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    };

    const chosen = colorClasses[color] || colorClasses.blue;

    return (
      <div className={`p-2.5 rounded-xl border ${chosen} shrink-0`}>
        <IconComp {...iconProps} />
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-normal font-serif text-[#ECECEC] flex items-center gap-3">
            <Boxes className="w-6 h-6 text-[#ECECEC]" />
            Homelab App Launcher & Web Portal
          </h1>
          <p className="text-xs text-[#8C8C8C] mt-1">
            One-click launchpad for all services, containers, and web interfaces across custom *.madesh.in subdomains.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setResetConfirmOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl bg-[#1A1A1A] hover:bg-[#222222] text-[#8C8C8C] hover:text-[#ECECEC] border border-[#2A2A2A] transition-colors"
            title="Reset to all default *.madesh.in services"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
          <button
            onClick={loadApps}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl bg-[#1A1A1A] hover:bg-[#222222] text-[#ECECEC] border border-[#2A2A2A] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Status
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-white hover:bg-neutral-200 text-[#0A0A0A] transition-all shadow-sm active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Application
          </button>
        </div>
      </div>

      {/* Search & Categories Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#1A1A1A] border border-[#2A2A2A] p-2.5 rounded-2xl">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#8C8C8C] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search applications, subdomains, or categories..."
            className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl pl-9 pr-3 py-2 text-xs text-[#ECECEC] placeholder-[#8C8C8C] focus:outline-none focus:border-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 ${
                selectedCategory === cat
                  ? 'bg-white text-[#0A0A0A] font-semibold shadow-sm'
                  : 'text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Applications */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
        {filteredApps.map(app => {
          const cleanDisplayUrl = app.primaryUrl.replace(/^https?:\/\//, '');

          return (
            <div
              key={app.id}
              className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#383838] hover:bg-[#222222]/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-150 group relative overflow-hidden"
            >
              <div>
                {/* Top row */}
                <div className="flex items-start justify-between gap-3 mb-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    {renderIcon(app.icon, app.color)}
                    <div className="min-w-0">
                      <h2 className="text-sm font-semibold text-[#ECECEC] group-hover:text-white transition-colors truncate">
                        {app.name}
                      </h2>
                      <span className="text-[11px] text-[#8C8C8C] block truncate">{app.category}</span>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {app.online ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#4ADE80] bg-[#141414] px-2.5 py-0.5 rounded-full border border-[#2A2A2A]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
                        Online
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#8C8C8C] bg-[#141414] px-2.5 py-0.5 rounded-full border border-[#2A2A2A]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8C8C8C]" />
                        {app.port ? `Port ${app.port} Down` : 'Offline'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-[#8C8C8C] line-clamp-2 mb-4 leading-relaxed">
                  {app.description}
                </p>
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 border-t border-[#2A2A2A] space-y-3">
                <div className="flex items-center justify-between text-[11px] font-mono text-[#8C8C8C]">
                  <span className="truncate max-w-[220px] text-[#ECECEC]/90 hover:text-white transition-colors" title={app.primaryUrl}>
                    {cleanDisplayUrl}
                  </span>
                  {app.port && <span className="text-[10px] bg-[#141414] px-2 py-0.5 rounded-md border border-[#2A2A2A]">:{app.port}</span>}
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={app.primaryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-white hover:bg-neutral-200 text-[#0A0A0A] shadow-sm transition-all text-center active:scale-[0.98]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Launch App
                  </a>

                  <button
                    onClick={() => handleOpenEdit(app)}
                    title="Edit App Details"
                    className="p-2 rounded-xl bg-[#141414] hover:bg-[#222222] text-[#8C8C8C] hover:text-[#ECECEC] border border-[#2A2A2A] transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setDeleteConfirm({ id: app.id, name: app.name })}
                    title="Remove from Portal"
                    className="p-2 rounded-xl bg-[#141414] hover:bg-[#F87171]/15 text-[#8C8C8C] hover:text-[#F87171] border border-[#2A2A2A] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredApps.length === 0 && !loading && (
        <div className="text-center py-16 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl">
          <Boxes className="w-10 h-10 text-[#8C8C8C]/40 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-[#ECECEC]">No applications match your criteria</h3>
          <p className="text-xs text-[#8C8C8C] mt-1">Try adjusting the search query or category filter.</p>
        </div>
      )}

      {/* Add / Edit App Modal */}
      {isModalOpen && editingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[20px] p-4 sm:p-6 max-w-lg w-full max-h-[90dvh] overflow-y-auto overscroll-contain shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 sm:right-5 top-4 sm:top-5 text-[#8C8C8C] hover:text-white transition-colors active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-normal font-serif text-[#ECECEC] mb-4">
              {editingApp.id ? 'Edit Application' : 'Add New Application'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#8C8C8C] mb-1">Application Name *</label>
                <input
                  type="text"
                  required
                  value={editingApp.name || ''}
                  onChange={e => setEditingApp({ ...editingApp, name: e.target.value })}
                  placeholder="e.g. Immich Photos"
                  className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl p-2.5 text-[#ECECEC] focus:outline-none focus:border-white transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8C8C8C] mb-1">Category</label>
                  <select
                    value={editingApp.category || 'Management'}
                    onChange={e => setEditingApp({ ...editingApp, category: e.target.value })}
                    className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl p-2.5 text-[#ECECEC] focus:outline-none focus:border-white transition-colors"
                  >
                    <option value="Management">Management</option>
                    <option value="Cloud Storage">Cloud Storage</option>
                    <option value="Media & Photos">Media & Photos</option>
                    <option value="Container Management">Container Management</option>
                    <option value="Monitoring">Monitoring</option>
                    <option value="Gaming Server">Gaming Server</option>
                    <option value="Networking">Networking</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#8C8C8C] mb-1">Internal Port (Check)</label>
                  <input
                    type="number"
                    value={editingApp.port || ''}
                    onChange={e => setEditingApp({ ...editingApp, port: parseInt(e.target.value) || undefined })}
                    placeholder="e.g. 2283"
                    className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl p-2.5 text-[#ECECEC] focus:outline-none focus:border-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#8C8C8C] mb-1">Public Subdomain URL *</label>
                <input
                  type="url"
                  required
                  value={editingApp.primaryUrl || ''}
                  onChange={e => setEditingApp({ ...editingApp, primaryUrl: e.target.value, directUrl: e.target.value })}
                  placeholder="https://example.madesh.in"
                  className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl p-2.5 text-[#ECECEC] focus:outline-none focus:border-white transition-colors font-mono"
                />
                <p className="text-[11px] text-[#8C8C8C] mt-1">
                  Use standard homelab subdomain: <span className="font-mono text-white/70">https://*.madesh.in</span>
                </p>
              </div>

              <div>
                <label className="block text-[#8C8C8C] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingApp.description || ''}
                  onChange={e => setEditingApp({ ...editingApp, description: e.target.value })}
                  placeholder="Short description of service or role..."
                  className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl p-2.5 text-[#ECECEC] focus:outline-none focus:border-white transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#8C8C8C] mb-1">Icon</label>
                  <select
                    value={editingApp.icon || 'Globe'}
                    onChange={e => setEditingApp({ ...editingApp, icon: e.target.value })}
                    className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl p-2.5 text-[#ECECEC] focus:outline-none focus:border-white transition-colors"
                  >
                    <option value="Globe">Globe</option>
                    <option value="LayoutDashboard">Dashboard</option>
                    <option value="Cloud">Cloud</option>
                    <option value="Image">Photos</option>
                    <option value="Boxes">Containers</option>
                    <option value="BarChart2">Metrics</option>
                    <option value="Gamepad2">Gaming</option>
                    <option value="Server">Server</option>
                    <option value="Shield">Security</option>
                    <option value="Zap">Power</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#8C8C8C] mb-1">Accent Color</label>
                  <select
                    value={editingApp.color || 'blue'}
                    onChange={e => setEditingApp({ ...editingApp, color: e.target.value })}
                    className="w-full bg-[#141414] border border-[#2A2A2A] rounded-xl p-2.5 text-[#ECECEC] focus:outline-none focus:border-white transition-colors"
                  >
                    <option value="blue">Blue</option>
                    <option value="sky">Sky</option>
                    <option value="emerald">Emerald</option>
                    <option value="cyan">Cyan</option>
                    <option value="amber">Amber</option>
                    <option value="purple">Purple</option>
                    <option value="rose">Rose</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#2A2A2A]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#141414] hover:bg-[#222222] text-[#8C8C8C] hover:text-[#ECECEC] border border-[#2A2A2A] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-[#0A0A0A] font-semibold transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingApp.id ? 'Save Changes' : 'Add App'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={executeDelete}
        title="Remove Application"
        message={`Are you sure you want to remove "${deleteConfirm?.name}" from your App Portal? You can restore it anytime with Reset Defaults.`}
        confirmText="Remove"
        variant="danger"
      />

      {/* Reset Defaults Confirmation Dialog */}
      <ConfirmDialog
        isOpen={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={handleResetDefaults}
        title="Restore Canonical Subdomains"
        message="This will restore all 12 homelab apps and services to their canonical https://*.madesh.in subdomains. Any custom edits will be reset."
        confirmText="Restore All"
        variant="primary"
      />
    </div>
  );
}
