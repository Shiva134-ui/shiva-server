import { useState, useEffect, useCallback } from 'react';
import { Activity, CheckCircle2, XCircle, RefreshCw, Globe, Server, ShieldCheck, Zap } from 'lucide-react';
import { networkService, type NetworkDiagnosticsResponse } from '../services/network';
import SpeedtestBenchmark from '../components/network/SpeedtestBenchmark';
import PageLoader from '../components/ui/PageLoader';
import ErrorState from '../components/ui/ErrorState';
import Badge from '../components/ui/Badge';

export default function NetworkDiagnostics() {
  const [data, setData] = useState<NetworkDiagnosticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const runDiagnostics = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await networkService.getDiagnostics();
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err instanceof Error ? err : new Error('Network diagnostics probe failed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    runDiagnostics();
  }, [runDiagnostics]);

  if (loading && !data) {
    return <PageLoader />;
  }

  if (error && !data) {
    return <ErrorState title="Diagnostics unavailable" message={error.message} onRetry={runDiagnostics} />;
  }

  const dnsEntries = Object.entries(data?.dns || {});
  const pingEntries = Object.entries(data?.ping || {});
  const gateway = data?.gateway;
  const tailscale = data?.tailscale;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#8C8C8C] mb-1 flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" /> Network Health
          </div>
          <h1 className="text-2xl font-normal font-serif text-[#ECECEC] tracking-tight">Network Diagnostics</h1>
          <p className="mt-1 text-xs text-[#8C8C8C]">
            Live WAN routing, gateway ping round-trip, DNS resolution, and Tailscale mesh telemetry.
          </p>
        </div>
        <button
          onClick={runDiagnostics}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-3.5 py-2 text-xs font-medium text-[#ECECEC] shadow-sm transition hover:bg-[#222222] active:scale-[0.98] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Run Ping Diagnostics
        </button>
      </header>

      {/* Speedtest & ISP Health Benchmark */}
      <SpeedtestBenchmark />

      {/* Overview Cards */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Gateway */}
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-medium text-[#8C8C8C]">
            <span>Local Gateway</span>
            <Server className="h-4 w-4 text-[#8C8C8C]" />
          </div>
          <div className="mt-3">
            <p className="text-xl font-mono font-medium text-[#ECECEC]">
              {gateway?.ip || '192.168.1.1'}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant={gateway?.reachable ? 'success' : 'error'}>
                {gateway?.reachable ? 'REACHABLE' : 'UNREACHABLE'}
              </Badge>
              {gateway?.avgLatencyMs != null && (
                <span className="font-mono text-xs text-[#8C8C8C]">
                  {gateway.avgLatencyMs.toFixed(2)} ms
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Cloudflare DNS Ping */}
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-medium text-[#8C8C8C]">
            <span>WAN ICMP Ping</span>
            <Zap className="h-4 w-4 text-[#FBBF24]" />
          </div>
          <div className="mt-3">
            <p className="text-xl font-mono font-medium text-[#ECECEC]">
              {data?.ping?.cloudflare_dns?.target || '1.1.1.1'}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant={data?.ping?.cloudflare_dns?.reachable ? 'success' : 'error'}>
                {data?.ping?.cloudflare_dns?.reachable ? 'ONLINE' : 'FAILED'}
              </Badge>
              {data?.ping?.cloudflare_dns?.avgLatencyMs != null && (
                <span className="font-mono text-xs text-[#8C8C8C]">
                  {data.ping.cloudflare_dns.avgLatencyMs.toFixed(1)} ms
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tailscale Mesh */}
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-medium text-[#8C8C8C]">
            <span>Tailscale Mesh</span>
            <ShieldCheck className="h-4 w-4 text-[#ECECEC]" />
          </div>
          <div className="mt-3">
            <p className="text-xl font-mono font-medium text-[#ECECEC]">
              {tailscale?.self?.tailscaleIps?.[0] || '100.79.42.30'}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant={tailscale?.online ? 'success' : 'error'}>
                {tailscale?.online ? 'CONNECTED' : 'OFFLINE'}
              </Badge>
              <span className="text-xs text-[#8C8C8C]">
                {tailscale?.peerCount ?? 0} active peers
              </span>
            </div>
          </div>
        </div>

        {/* DNS Health */}
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-medium text-[#8C8C8C]">
            <span>DNS Resolution</span>
            <Activity className="h-4 w-4 text-[#4ADE80]" />
          </div>
          <div className="mt-3">
            <p className="text-xl font-mono font-medium text-[#ECECEC]">
              {dnsEntries.filter(([, v]) => v.resolved).length} / {dnsEntries.length} OK
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant={dnsEntries.every(([, v]) => v.resolved) ? 'success' : 'warning'}>
                {dnsEntries.every(([, v]) => v.resolved) ? 'HEALTHY' : 'PARTIAL'}
              </Badge>
              <span className="text-xs text-[#8C8C8C]">
                Resolver active
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* DNS Probes Table */}
      <section className="overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-sm">
        <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-4">
          <span className="text-xs uppercase tracking-wider font-medium text-[#8C8C8C]">DNS Lookup Probes</span>
          <span className="font-mono text-xs text-[#8C8C8C]">{dnsEntries.length} tested</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#2A2A2A] bg-[#0F0F0F]/60 text-[11px] uppercase tracking-wider text-[#8C8C8C]">
              <tr>
                <th className="px-5 py-3 font-medium">Domain Target</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Resolved IP(s)</th>
                <th className="px-5 py-3 font-medium text-right">Lookup Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A2A] font-mono text-xs">
              {dnsEntries.map(([domain, info]) => (
                <tr key={domain} className="hover:bg-[#222222]/40 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-[#ECECEC] flex items-center gap-2">
                    {info.resolved ? (
                      <CheckCircle2 className="h-4 w-4 text-[#4ADE80]" />
                    ) : (
                      <XCircle className="h-4 w-4 text-[#F87171]" />
                    )}
                    <span>{domain}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-block rounded-lg px-2 py-0.5 text-[11px] font-medium border ${
                        info.resolved ? 'border-[#4ADE80]/20 bg-[#4ADE80]/10 text-[#4ADE80]' : 'border-[#F87171]/20 bg-[#F87171]/10 text-[#F87171]'
                      }`}
                    >
                      {info.resolved ? 'RESOLVED' : 'FAILED'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[#8C8C8C]">
                    {info.addresses?.join(', ') || info.error || 'None'}
                  </td>
                  <td className="px-5 py-3.5 text-right font-medium text-[#ECECEC]">
                    {info.latencyMs} ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Ping Latency Tests */}
      <section className="overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-sm">
        <div className="flex items-center justify-between border-b border-[#2A2A2A] px-5 py-4">
          <span className="text-xs uppercase tracking-wider font-medium text-[#8C8C8C]">ICMP Ping Endpoints</span>
          <span className="font-mono text-xs text-[#8C8C8C]">Round-trip latency</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#2A2A2A] bg-[#0F0F0F]/60 text-[11px] uppercase tracking-wider text-[#8C8C8C]">
              <tr>
                <th className="px-5 py-3 font-medium">Host / Provider</th>
                <th className="px-5 py-3 font-medium">Destination IP</th>
                <th className="px-5 py-3 font-medium">Packet Loss</th>
                <th className="px-5 py-3 font-medium text-right">Avg RTT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2A2A] font-mono text-xs">
              {pingEntries.map(([name, info]) => (
                <tr key={name} className="hover:bg-[#222222]/40 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-[#ECECEC]">
                    {name.replace(/_/g, ' ').toUpperCase()}
                  </td>
                  <td className="px-5 py-3.5 text-[#8C8C8C]">
                    {info.target}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-block rounded-lg px-2 py-0.5 text-[11px] font-medium border ${
                        (info.packetLossPercent ?? 0) === 0
                          ? 'border-[#4ADE80]/20 bg-[#4ADE80]/10 text-[#4ADE80]'
                          : 'border-[#F87171]/20 bg-[#F87171]/10 text-[#F87171]'
                      }`}
                    >
                      {info.packetLossPercent ?? 0}% loss
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-medium text-[#ECECEC]">
                    {info.avgLatencyMs != null ? `${info.avgLatencyMs.toFixed(2)} ms` : (info.error || 'Timed out')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer Timestamp */}
      <div className="flex items-center justify-between text-xs text-[#8C8C8C] pt-2 font-mono text-[11px]">
        <span>Host: 100.79.42.30 / 192.168.1.36</span>
        <span>Sampled: {data?.timestamp ? new Date(data.timestamp).toLocaleString() : 'Just now'}</span>
      </div>
    </div>
  );
}
