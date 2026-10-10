import { useState, useEffect, useCallback } from 'react';
import { Users, RefreshCw, Search, Terminal, User, Shield, Radio, KeyRound, Check, X, UserPlus, PowerOff } from 'lucide-react';
import { adminService, type UsersResponse, type SystemUser } from '../services/admin';
import PageLoader from '../components/ui/PageLoader';
import ErrorState from '../components/ui/ErrorState';
import Badge from '../components/ui/Badge';
import { useToast } from '../components/ui/ToastContext';
import ConfirmDialog from '../components/ui/ConfirmDialog';

function DashboardUsersPanel({ onUpdate, refreshTrigger }: { onUpdate: () => void; refreshTrigger?: number }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [confirmRevokeEmail, setConfirmRevokeEmail] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const { addToast } = useToast();

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await adminService.getDashboardUsers();
      setData(res);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load dashboard users'));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);
  }, [loadData, refreshTrigger]);

  // Live auto-polling every 4 seconds to discover pending user signups in real-time
  useEffect(() => {
    const timer = setInterval(() => {
      loadData(false);
    }, 4000);
    return () => clearInterval(timer);
  }, [loadData]);

  const handleApprove = async (email: string) => {
    setActionInProgress(`approve-${email}`);
    try {
      await adminService.approveDashboardUser(email);
      await loadData(false);
      onUpdate();
      addToast({ title: 'Access Approved', message: `Approved member access for ${email}.`, type: 'success' });
    } catch (err: any) {
      addToast({ title: 'Approval Failed', message: err.message || 'Unknown error', type: 'error' });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleExecuteRevoke = async () => {
    if (!confirmRevokeEmail) return;
    const email = confirmRevokeEmail;
    setActionInProgress(`reject-${email}`);
    try {
      await adminService.rejectDashboardUser(email);
      await loadData(false);
      onUpdate();
      addToast({ title: 'Access Revoked', message: `Access revoked for ${email}.`, type: 'info' });
    } catch (err: any) {
      addToast({ title: 'Revocation Failed', message: err.message || 'Unknown error', type: 'error' });
    } finally {
      setActionInProgress(null);
      setConfirmRevokeEmail(null);
    }
  };

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newMemberEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      addToast({ title: 'Invalid Email', message: 'Please enter a valid email address.', type: 'error' });
      return;
    }
    setActionInProgress(`add-${email}`);
    try {
      await adminService.approveDashboardUser(email);
      await loadData(false);
      onUpdate();
      setNewMemberEmail('');
      setShowAddMember(false);
      addToast({ title: 'Member Added', message: `Granted dashboard access to ${email}.`, type: 'success' });
    } catch (err: any) {
      addToast({ title: 'Failed to Add Member', message: err.message || 'Unknown error', type: 'error' });
    } finally {
      setActionInProgress(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="text-xs text-[#8C8C8C] flex items-center gap-2 py-4 font-mono">
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#8C8C8C]" /> Loading dashboard access list...
      </div>
    );
  }
  if (error && !data) {
    return <div className="text-xs text-[#F87171] py-2 font-mono">Failed to load dashboard users: {error.message}</div>;
  }
  if (!data) return null;

  const pendingCount = data.pending?.length || 0;

  return (
    <div className="space-y-6">
      {pendingCount > 0 && (
        <div className="space-y-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[#FBBF24] flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FBBF24] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FBBF24]"></span>
              </span>
              Pending Access Approvals ({pendingCount})
            </h3>
            <span className="text-[11px] text-[#FBBF24]/80 font-mono">Requires Admin Approval</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {data.pending.map((u: any) => {
              const isApproving = actionInProgress === `approve-${u.email}`;
              const isRejecting = actionInProgress === `reject-${u.email}`;
              return (
                <div key={u.email} className="rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] p-3.5 shadow-sm space-y-2">
                  <div className="font-medium text-[#ECECEC] text-xs">{u.name || 'User'}</div>
                  <div className="text-[11px] text-[#8C8C8C] font-mono break-all">{u.email}</div>
                  {u.date && (
                    <div className="text-[10px] text-[#8C8C8C]/60 font-mono">
                      Requested: {new Date(u.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleApprove(u.email)}
                      disabled={!!actionInProgress}
                      className="flex-1 py-1.5 flex justify-center items-center gap-1.5 bg-white hover:bg-neutral-200 text-[#0A0A0A] font-semibold rounded-xl text-xs transition disabled:opacity-50 cursor-pointer shadow-sm active:scale-[0.98]"
                    >
                      {isApproving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>{isApproving ? 'Approving...' : 'Approve'}</span>
                    </button>
                    <button
                      onClick={() => setConfirmRevokeEmail(u.email)}
                      disabled={!!actionInProgress}
                      className="flex-1 py-1.5 flex justify-center items-center gap-1.5 bg-[#1A1A1A] hover:bg-rose-500/20 text-[#F87171] font-medium rounded-xl text-xs transition border border-rose-500/20 disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                    >
                      {isRejecting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                      <span>{isRejecting ? 'Rejecting...' : 'Reject'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-medium text-[#8C8C8C] uppercase tracking-wider flex items-center gap-2">
            Approved Members
            <span className="text-[11px] text-[#8C8C8C] font-mono">({(data.approved?.length || 0) + 1})</span>
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddMember(!showAddMember)}
              className="text-xs text-white hover:text-white/80 bg-[#1A1A1A] hover:bg-[#222222] border border-[#2A2A2A] px-2.5 py-1 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Member</span>
            </button>
            <button
              onClick={() => loadData(true)}
              className="text-xs text-[#8C8C8C] hover:text-[#ECECEC] flex items-center gap-1 transition cursor-pointer font-mono px-2 py-1"
              title="Refresh access list"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Inline Add Member Form */}
        {showAddMember && (
          <form onSubmit={handleAddMemberSubmit} className="mb-3 p-3 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl flex flex-col sm:flex-row items-center gap-2">
            <input
              type="email"
              placeholder="Enter Google account email (e.g. user@gmail.com)..."
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              className="w-full sm:flex-1 bg-[#141414] border border-[#333333] rounded-xl px-3 py-1.5 text-xs text-[#ECECEC] placeholder:text-[#8C8C8C] focus:outline-none focus:border-white/40 font-mono"
              autoFocus
            />
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="submit"
                disabled={!newMemberEmail || !!actionInProgress}
                className="px-3 py-1.5 rounded-xl bg-white text-[#0A0A0A] font-semibold text-xs transition hover:bg-neutral-200 disabled:opacity-50 cursor-pointer"
              >
                Grant Access
              </button>
              <button
                type="button"
                onClick={() => { setShowAddMember(false); setNewMemberEmail(''); }}
                className="px-3 py-1.5 rounded-xl bg-[#1A1A1A] text-[#8C8C8C] hover:text-white text-xs border border-[#2A2A2A]"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="flex flex-wrap gap-2 items-center">
          <Badge variant="default" className="border-[#2A2A2A] text-[#ECECEC] bg-[#0F0F0F] font-mono text-xs py-1 px-3 rounded-xl">
            {data.owner} (OWNER)
          </Badge>
          {data.approved?.map((email: string) => {
            const isRevoking = actionInProgress === `reject-${email}`;
            return (
              <Badge key={email} variant="default" className="flex items-center gap-2 font-mono text-xs py-1 px-3 bg-[#0F0F0F] border-[#2A2A2A] text-[#8C8C8C] rounded-xl">
                <span>{email}</span>
                <button
                  onClick={() => setConfirmRevokeEmail(email)}
                  disabled={isRevoking}
                  className="ml-1 text-[#8C8C8C] hover:text-[#F87171] transition cursor-pointer p-0.5 rounded"
                  title="Revoke access"
                >
                  {isRevoking ? <RefreshCw className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                </button>
              </Badge>
            );
          })}
          {(!data.approved || data.approved.length === 0) && (
            <span className="text-xs text-[#8C8C8C] font-mono">No additional members approved.</span>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!confirmRevokeEmail}
        onClose={() => setConfirmRevokeEmail(null)}
        onConfirm={handleExecuteRevoke}
        title="Revoke Dashboard Access"
        message={`Are you sure you want to revoke dashboard access for "${confirmRevokeEmail}"? They will no longer be able to log in.`}
        confirmText="Revoke Access"
        variant="danger"
      />
    </div>
  );
}

export default function AdminUsers() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [search, setSearch] = useState('');
  const [viewFilter, setViewFilter] = useState<'human' | 'all'>('human');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [confirmTerminate, setConfirmTerminate] = useState<{ line: string; user: string } | null>(null);
  const { addToast } = useToast();

  const handleExecuteTerminate = async () => {
    if (!confirmTerminate) return;
    const { line, user } = confirmTerminate;
    try {
      await adminService.terminateSession(line);
      // Optimistically update active sessions list
      setData(prev => prev ? {
        ...prev,
        activeSessions: prev.activeSessions.filter(s => s.line !== line)
      } : null);
      addToast({ title: 'Session Terminated', message: `Terminated active terminal session ${line} for ${user}.`, type: 'success' });
      setTimeout(() => {
        loadUsers();
      }, 600);
    } catch (err: any) {
      addToast({ title: 'Termination Failed', message: err.message || 'Unknown error', type: 'error' });
    } finally {
      setConfirmTerminate(null);
    }
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getUsers();
      setData(res);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load user accounts'));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefreshAll = () => {
    loadUsers();
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const rawList = viewFilter === 'human' ? (data?.humanUsers || []) : (data?.users || []);
  const filteredUsers = rawList.filter((u: SystemUser) =>
    !search ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.shell.toLowerCase().includes(search.toLowerCase()) ||
    u.home.toLowerCase().includes(search.toLowerCase()) ||
    String(u.uid).includes(search)
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-[#2A2A2A] pb-5">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#8C8C8C] mb-1 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#8C8C8C]" /> Administration
          </div>
          <h1 className="text-2xl font-normal font-serif text-[#ECECEC] tracking-tight">System Users & Sessions</h1>
          <p className="mt-1 text-xs text-[#8C8C8C] max-w-2xl">
            Manage dashboard access, system accounts, and active terminal sessions on the Ubuntu host.
          </p>
        </div>
        <button
          onClick={handleRefreshAll}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-3.5 py-2 text-xs text-[#ECECEC] transition hover:bg-[#222222] disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </header>

      {/* Dashboard Access Control Panel */}
      <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 sm:p-6 shadow-sm">
        <h2 className="text-sm font-medium text-[#ECECEC] mb-4 flex items-center gap-2 border-b border-[#2A2A2A] pb-3">
          <Shield className="h-4 w-4 text-[#8C8C8C]" /> Dashboard Access Control
        </h2>
        
        <DashboardUsersPanel onUpdate={loadUsers} refreshTrigger={refreshTrigger} />
      </div>

      {/* Metrics Row */}
      {data && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-[#8C8C8C]">
              <span>Active Sessions</span>
              <Radio className={`h-4 w-4 ${data.activeSessions.length > 0 ? 'text-[#4ADE80] animate-pulse' : 'text-[#8C8C8C]'}`} />
            </div>
            <div className="mt-2 text-2xl font-mono font-semibold text-[#ECECEC]">
              {data.activeSessions.length}
            </div>
            <p className="mt-1 text-[11px] text-[#8C8C8C]">Logged in right now</p>
          </div>

          <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-[#8C8C8C]">
              <span>Interactive Users</span>
              <User className="h-4 w-4 text-[#8C8C8C]" />
            </div>
            <div className="mt-2 text-2xl font-mono font-semibold text-[#ECECEC]">
              {data.humanUsers.length}
            </div>
            <p className="mt-1 text-[11px] text-[#8C8C8C]">Login accounts (bash/sh)</p>
          </div>

          <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-[#8C8C8C]">
              <span>System Daemons</span>
              <Shield className="h-4 w-4 text-[#8C8C8C]" />
            </div>
            <div className="mt-2 text-2xl font-mono font-semibold text-[#ECECEC]">
              {data.totalUsers - data.humanUsers.length}
            </div>
            <p className="mt-1 text-[11px] text-[#8C8C8C]">Daemons &amp; pseudo-users</p>
          </div>

          <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs text-[#8C8C8C]">
              <span>Total Passwd Records</span>
              <KeyRound className="h-4 w-4 text-[#8C8C8C]" />
            </div>
            <div className="mt-2 text-2xl font-mono font-semibold text-[#ECECEC]">
              {data.totalUsers}
            </div>
            <p className="mt-1 text-[11px] text-[#8C8C8C]">In /etc/passwd</p>
          </div>
        </div>
      )}

      {/* Active Sessions Panel */}
      {data && data.activeSessions.length > 0 && (
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[#4ADE80] text-xs font-semibold uppercase tracking-wider mb-3">
            <Terminal className="h-4 w-4 text-[#4ADE80]" />
            <span>Currently Active Login Sessions</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {data.activeSessions.map((s, idx) => (
              <div key={idx} className="rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] p-3.5 text-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between font-mono font-medium text-[#ECECEC]">
                    <span className="text-sm font-semibold">{s.user}</span>
                    <Badge variant="success">{s.line}</Badge>
                  </div>
                  <div className="mt-1.5 text-[#8C8C8C] text-[11px]">Login: <span className="text-[#ECECEC]">{s.loginTime}</span></div>
                  {s.comment && <div className="mt-0.5 text-sky-400 font-mono text-[11px]">{s.comment}</div>}
                </div>
                <div className="mt-3 pt-2 border-t border-[#2A2A2A] flex justify-end">
                  <button
                    onClick={() => setConfirmTerminate({ line: s.line, user: s.user })}
                    className="flex items-center gap-1.5 text-[11px] text-[#F87171] hover:text-white font-medium px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition cursor-pointer active:scale-[0.98]"
                  >
                    <PowerOff className="w-3 h-3" />
                    <span>Terminate Session</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Tab Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0 max-w-full">
          <button
            onClick={() => setViewFilter('human')}
            className={`px-3 py-1.5 rounded-xl text-xs transition cursor-pointer shrink-0 whitespace-nowrap ${
              viewFilter === 'human'
                ? 'bg-white text-[#0A0A0A] font-semibold shadow-sm'
                : 'bg-[#1A1A1A] border border-[#2A2A2A] text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222]'
            }`}
          >
            Interactive Users ({data?.humanUsers.length ?? 0})
          </button>
          <button
            onClick={() => setViewFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs transition cursor-pointer shrink-0 whitespace-nowrap ${
              viewFilter === 'all'
                ? 'bg-white text-[#0A0A0A] font-semibold shadow-sm'
                : 'bg-[#1A1A1A] border border-[#2A2A2A] text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222]'
            }`}
          >
            All Accounts ({data?.totalUsers ?? 0})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8C8C8C]" />
          <input
            type="text"
            placeholder="Search username, shell, home..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl text-xs text-[#ECECEC] placeholder:text-[#8C8C8C] focus:outline-none focus:border-white/30 font-mono"
          />
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && !data && <PageLoader />}
      {error && !loading && <ErrorState title="Failed to load users" message={error.message} onRetry={loadUsers} />}

      {/* Users Table */}
      {data && (
        <div className="overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#2A2A2A] bg-[#0F0F0F] text-[#8C8C8C] uppercase tracking-wider text-[10px] font-semibold">
                <tr>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">UID / GID</th>
                  <th className="px-4 py-3">Role / Type</th>
                  <th className="px-4 py-3">Home Directory</th>
                  <th className="px-4 py-3">Shell</th>
                  <th className="px-4 py-3">Comment / Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2A]/60">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[#8C8C8C]">
                      No accounts matched your search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isRoot = u.uid === 0 || u.username === 'root';
                    const isBash = u.shell.includes('bash') || u.shell.includes('zsh');
                    const isNoLogin = u.shell.includes('nologin') || u.shell.includes('false');

                    return (
                      <tr key={u.username} className="hover:bg-[#222222]/40 transition">
                        <td className="px-4 py-3 font-medium text-[#ECECEC] flex items-center gap-2">
                          <div className={`h-6 w-6 rounded-full border flex items-center justify-center font-bold text-[10px] ${
                            isRoot
                              ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                              : 'bg-[#0F0F0F] border-[#2A2A2A] text-[#ECECEC]'
                          }`}>
                            {u.username.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-mono font-semibold">{u.username}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[#8C8C8C]">
                          {u.uid} : {u.gid}
                        </td>
                        <td className="px-4 py-3">
                          {isRoot ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                              ADMINISTRATOR
                            </span>
                          ) : !u.isSystem ? (
                            <Badge variant="success">Interactive</Badge>
                          ) : (
                            <Badge variant="default">System</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-[#8C8C8C] truncate max-w-[200px]" title={u.home}>
                          {u.home}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`font-mono px-2 py-0.5 rounded-lg text-[11px] border ${
                              isBash
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-[#4ADE80]'
                                : isNoLogin
                                ? 'bg-[#0F0F0F] border-[#2A2A2A] text-[#8C8C8C]'
                                : 'bg-[#0F0F0F] border-[#2A2A2A] text-[#ECECEC]'
                            }`}
                          >
                            {u.shell}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#8C8C8C] truncate max-w-[200px]" title={u.comment}>
                          {u.comment || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {data.timestamp && (
            <div className="px-4 py-2.5 border-t border-[#2A2A2A] bg-[#0F0F0F] text-[11px] text-[#8C8C8C] flex justify-between">
              <span>Showing {filteredUsers.length} of {rawList.length} accounts</span>
              <span>Updated: {new Date(data.timestamp).toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Terminate Session Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!confirmTerminate}
        onClose={() => setConfirmTerminate(null)}
        onConfirm={handleExecuteTerminate}
        title="Terminate Terminal Session"
        message={`Are you sure you want to forcibly terminate active terminal session "${confirmTerminate?.line}" for user "${confirmTerminate?.user}"?`}
        confirmText="Terminate Session"
        variant="danger"
      />
    </div>
  );
}
