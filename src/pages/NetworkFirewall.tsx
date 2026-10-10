import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Globe, Plus, Trash2, Power } from 'lucide-react';
import { networkService, type FirewallResponse, type FirewallRule } from '../services/network';
import PageLoader from '../components/ui/PageLoader';
import ErrorState from '../components/ui/ErrorState';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';

export default function NetworkFirewall() {
  const [data, setData] = useState<FirewallResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Add rule modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [rulePort, setRulePort] = useState('');
  const [ruleProto, setRuleProto] = useState('tcp');
  const [ruleAction, setRuleAction] = useState('allow');
  const [ruleFrom, setRuleFrom] = useState('');

  const loadFirewall = useCallback(async () => {
    setLoading(true);
    try {
      const res = await networkService.getFirewall();
      setData(res);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load firewall status'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFirewall();
  }, [loadFirewall]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = async () => {
    if (!data) return;
    const isCurrentlyActive = data.status?.toLowerCase() === 'active';
    const confirmMsg = isCurrentlyActive 
      ? 'Are you sure you want to disable the firewall? Unsolicited incoming connections may reach open ports.'
      : 'Enable the Uncomplicated Firewall (UFW)? Default inbound will be blocked.';
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    try {
      const res = await networkService.toggleFirewall(!isCurrentlyActive);
      setData(res);
    } catch (err: any) {
      alert(`Firewall toggle failed: ${err.message || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rulePort && !ruleFrom) {
      alert('Please specify either a port or a source IP/subnet');
      return;
    }
    setActionLoading(true);
    try {
      const res = await networkService.addFirewallRule({
        port: rulePort.trim() || undefined,
        proto: ruleProto,
        action: ruleAction,
        from: ruleFrom.trim() || undefined
      });
      setData(res);
      setShowAddModal(false);
      setRulePort('');
      setRuleFrom('');
    } catch (err: any) {
      alert(`Failed to add rule: ${err.message || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRule = async (rule: FirewallRule, index: number) => {
    if (!window.confirm(`Delete firewall rule for ${rule.to} (${rule.action})?`)) return;
    setActionLoading(true);
    try {
      // Pass the 1-based rule index or rule spec
      const res = await networkService.deleteFirewallRule(String(index + 1));
      setData(res);
    } catch (err: any) {
      alert(`Failed to delete rule: ${err.message || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (error && !data) {
    return <ErrorState title="Firewall unavailable" message={error.message} onRetry={loadFirewall} />;
  }

  if (loading && !data) {
    return <PageLoader />;
  }

  const rules = data?.rules || [];
  const isActive = data?.status?.toLowerCase() === 'active';

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#8C8C8C] mb-1 flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" /> Network Security
          </div>
          <h1 className="text-2xl font-normal font-serif text-[#ECECEC] tracking-tight">Firewall Management</h1>
          <p className="mt-1 text-xs text-[#8C8C8C]">
            Uncomplicated Firewall (UFW) policy enforcement, rule modification, and packet filtering.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleToggle}
            disabled={actionLoading}
            className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-medium transition active:scale-[0.98] ${
              isActive
                ? 'border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            <Power className="h-3.5 w-3.5" />
            <span>{isActive ? 'Disable UFW' : 'Enable UFW'}</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-[#0A0A0A] hover:bg-neutral-200 transition shadow-sm active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Rule</span>
          </button>
          <button
            onClick={loadFirewall}
            disabled={loading || actionLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-3.5 py-2 text-xs font-medium text-[#ECECEC] transition hover:bg-[#222222] active:scale-[0.98] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Status Cards */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider font-medium text-[#8C8C8C]">UFW Status</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={isActive ? 'success' : 'error'}>
              {isActive ? 'ACTIVE' : 'INACTIVE'}
            </Badge>
          </div>
        </div>
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider font-medium text-[#8C8C8C]">Default Incoming</p>
          <p className="mt-2 text-sm font-mono font-medium text-[#ECECEC]">
            {data?.defaults?.incoming || 'deny'}
          </p>
        </div>
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider font-medium text-[#8C8C8C]">Default Outgoing</p>
          <p className="mt-2 text-sm font-mono font-medium text-[#ECECEC]">
            {data?.defaults?.outgoing || 'allow'}
          </p>
        </div>
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider font-medium text-[#8C8C8C]">Logging Policy</p>
          <p className="mt-2 text-sm font-mono font-medium text-[#ECECEC]">
            {data?.logging || 'on'}
          </p>
        </div>
      </section>

      {/* Rules Table */}
      <section className="overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-sm">
        <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-4 text-sm">
          <span className="text-xs uppercase tracking-wider font-medium text-[#8C8C8C]">Active Rules</span>
          <span className="font-mono text-xs text-[#8C8C8C]">{rules.length} rules</span>
        </div>
        {rules.length === 0 ? (
          <div className="px-5 py-14 text-center text-xs text-[#8C8C8C]">
            No specific packet filtering rules active in UFW.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#2A2A2A] bg-[#0F0F0F]/60 text-[11px] uppercase tracking-wider text-[#8C8C8C]">
                <tr>
                  <th className="px-5 py-3 font-medium">#</th>
                  <th className="px-5 py-3 font-medium">To (Destination / Port)</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                  <th className="px-5 py-3 font-medium">From (Source)</th>
                  <th className="px-5 py-3 font-medium text-right">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2A] font-mono text-xs">
                {rules.map((rule, idx) => {
                  const isAllow = rule.action.toLowerCase().includes('allow');
                  return (
                    <tr key={rule.id || idx} className="hover:bg-[#222222]/40 transition-colors">
                      <td className="px-5 py-3.5 text-[#8C8C8C]">{idx + 1}</td>
                      <td className="px-5 py-3.5 text-[#ECECEC] font-medium">
                        {rule.to}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-block rounded-lg px-2 py-0.5 text-[11px] font-medium border ${
                            isAllow
                              ? 'border-[#4ADE80]/20 bg-[#4ADE80]/10 text-[#4ADE80]'
                              : 'border-[#F87171]/20 bg-[#F87171]/10 text-[#F87171]'
                          }`}
                        >
                          {rule.action}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[#8C8C8C]">
                        {rule.from}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => handleDeleteRule(rule, idx)}
                          disabled={actionLoading}
                          title="Delete Rule"
                          className="p-1.5 rounded-lg text-[#8C8C8C] hover:text-[#F87171] hover:bg-[#222222] transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add Rule Modal */}
      {showAddModal && (
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Add Firewall Rule"
        >
          <form onSubmit={handleAddRule} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Port or Service (e.g. 80, 443, 22)
              </label>
              <input
                type="text"
                placeholder="e.g. 8080"
                value={rulePort}
                onChange={(e) => setRulePort(e.target.value)}
                className="w-full px-3 py-2 bg-panel border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-stone-500 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Protocol</label>
                <select
                  value={ruleProto}
                  onChange={(e) => setRuleProto(e.target.value)}
                  className="w-full px-3 py-2 bg-panel border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-stone-500"
                >
                  <option value="tcp">TCP</option>
                  <option value="udp">UDP</option>
                  <option value="any">Any (TCP/UDP)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Action</label>
                <select
                  value={ruleAction}
                  onChange={(e) => setRuleAction(e.target.value)}
                  className="w-full px-3 py-2 bg-panel border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-stone-500"
                >
                  <option value="allow">Allow</option>
                  <option value="deny">Deny</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                From Source IP / Subnet (Optional)
              </label>
              <input
                type="text"
                placeholder="Leave blank for Anywhere, or e.g. 192.168.1.0/24"
                value={ruleFrom}
                onChange={(e) => setRuleFrom(e.target.value)}
                className="w-full px-3 py-2 bg-panel border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-stone-500 font-mono text-xs"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#2A2A2A]">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3.5 py-2 rounded-xl border border-[#2A2A2A] text-xs text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-white text-[#0A0A0A] text-xs font-semibold hover:bg-neutral-200 transition disabled:opacity-50 shadow-sm active:scale-[0.98] cursor-pointer"
              >
                {actionLoading ? 'Applying...' : 'Create Rule'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
