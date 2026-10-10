import { useState, useEffect, useCallback } from 'react';
import { 
  Network, 
  Smartphone, 
  Laptop, 
  Server, 
  RefreshCw, 
  ShieldCheck
} from 'lucide-react';
import { tailscaleMeshService, type TailscaleMeshResponse } from '../services/tailscaleMesh';
import { useToast } from '../components/ui/ToastContext';
import Badge from '../components/ui/Badge';

export default function NetworkTailscaleMesh() {
  const [data, setData] = useState<TailscaleMeshResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const loadMesh = useCallback(async () => {
    try {
      const res = await tailscaleMeshService.getMeshStatus();
      setData(res);
    } catch (err: any) {
      addToast({ title: 'Tailscale Error', message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadMesh();
    const interval = setInterval(loadMesh, 20000);
    return () => clearInterval(interval);
  }, [loadMesh]);

  const getNodeIcon = (os: string) => {
    switch (os.toLowerCase()) {
      case 'android':
      case 'ios':
        return <Smartphone className="w-5 h-5 text-neutral-300" />;
      case 'windows':
      case 'macos':
        return <Laptop className="w-5 h-5 text-neutral-300" />;
      default:
        return <Server className="w-5 h-5 text-neutral-300" />;
    }
  };

  const allNodes = data ? [data.self, ...data.peers] : [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#8C8C8C] mb-1 flex items-center gap-1.5">
            <Network className="w-3.5 h-3.5" /> Mesh Network
          </div>
          <h1 className="text-2xl font-normal font-serif text-[#ECECEC] tracking-tight">Tailscale Mesh Topology</h1>
          <p className="text-xs text-[#8C8C8C] mt-1">
            Real-time peer reachability, direct WireGuard links, and device health across your Tailnet.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadMesh}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-xl bg-[#1A1A1A] hover:bg-[#222222] text-[#ECECEC] border border-[#2A2A2A] transition-colors active:scale-[0.98]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Mesh
          </button>
        </div>
      </div>

      {/* Network Summary Bar */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 2xl:gap-6">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 sm:p-5 shadow-sm">
            <span className="text-[11px] uppercase tracking-wider font-medium text-[#8C8C8C]">Tailnet Domain</span>
            <div className="text-base font-medium text-[#ECECEC] font-mono mt-1 truncate">{data.tailnetName}</div>
            <div className="text-xs text-[#8C8C8C] mt-1">MagicDNS: Enabled</div>
          </div>
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 sm:p-5 shadow-sm">
            <span className="text-[11px] uppercase tracking-wider font-medium text-[#8C8C8C]">Active Mesh Nodes</span>
            <div className="text-2xl font-normal font-serif text-[#ECECEC] mt-1">
              {data.onlineCount} <span className="text-xs text-[#8C8C8C] font-normal">/ {data.totalNodes} Online</span>
            </div>
          </div>
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 sm:p-5 shadow-sm">
            <span className="text-[11px] uppercase tracking-wider font-medium text-[#8C8C8C]">Host Node IP</span>
            <div className="text-base font-normal font-mono text-[#4ADE80] mt-1">{data.self.ip}</div>
            <div className="text-xs text-[#8C8C8C] mt-1">WireGuard Direct Interface</div>
          </div>
        </div>
      )}

      {/* Nodes Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 2xl:gap-6">
        {allNodes.map(node => (
          <div 
            key={node.id || node.ip} 
            className={`bg-[#1A1A1A] border ${node.isSelf ? 'border-white/30' : 'border-[#2A2A2A]'} rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-sm relative overflow-hidden`}
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#0F0F0F] border border-[#2A2A2A] text-[#ECECEC]">
                    {getNodeIcon(node.os)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#ECECEC]">{node.hostname}</span>
                      {node.isSelf && <span className="text-[9px] uppercase font-semibold bg-white text-[#0A0A0A] px-1.5 py-0.5 rounded shadow-sm">This Server</span>}
                    </div>
                    <span className="text-xs font-mono text-[#8C8C8C]">{node.os.toUpperCase()}</span>
                  </div>
                </div>

                <Badge variant={node.online ? 'success' : 'default'} className="text-[10px] py-0">
                  {node.online ? 'Online' : 'Offline'}
                </Badge>
              </div>

              <div className="mt-4 pt-3 border-t border-[#2A2A2A] space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-[#8C8C8C]">
                  <span>Tailscale IP:</span>
                  <span className="text-[#ECECEC] font-medium">{node.ip}</span>
                </div>
                {node.dnsName && (
                  <div className="flex justify-between text-[#8C8C8C] text-[11px]">
                    <span>MagicDNS:</span>
                    <span className="truncate max-w-[170px]" title={node.dnsName}>{node.dnsName}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-[#2A2A2A] flex items-center justify-between text-[11px] text-[#8C8C8C]">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#8C8C8C]" />
                {node.relay || 'Direct Peer'}
              </span>
              {node.lastSeen && (
                <span>Last seen: {new Date(node.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
