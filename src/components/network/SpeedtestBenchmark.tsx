import { useState, useEffect, useCallback } from 'react';
import { 
  Gauge, 
  ArrowDown, 
  ArrowUp, 
  Activity, 
  Play, 
  RefreshCw, 
  Globe, 
  Clock, 
  CheckCircle2 
} from 'lucide-react';
import { speedtestService, type SpeedtestStatus } from '../../services/speedtest';
import { useToast } from '../ui/ToastContext';
import Badge from '../ui/Badge';

export default function SpeedtestBenchmark() {
  const [status, setStatus] = useState<SpeedtestStatus | null>(null);
  const [running, setRunning] = useState(false);
  const { addToast } = useToast();

  const loadStatus = useCallback(async () => {
    try {
      const data = await speedtestService.getStatus();
      setStatus(data);
      if (data.running) setRunning(true);
    } catch (_) {
      // background load
    }
  }, []);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 10000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  const handleRun = async () => {
    setRunning(true);
    addToast({ title: 'Benchmark Started', message: 'Testing host WAN latency and bandwidth...', type: 'info' });
    try {
      const result = await speedtestService.runTest();
      addToast({ 
        title: 'Benchmark Complete', 
        message: `Download: ${result.downloadMbps} Mbps | Upload: ${result.uploadMbps} Mbps | Ping: ${result.pingMs}ms`, 
        type: 'success' 
      });
      await loadStatus();
    } catch (err: any) {
      addToast({ title: 'Speedtest Failed', message: err.message, type: 'error' });
    } finally {
      setRunning(false);
    }
  };

  const last = status?.lastTest;

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#0F0F0F] border border-[#2A2A2A] text-[#ECECEC]">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-serif font-normal text-[#ECECEC] flex items-center gap-2">
              Server Bandwidth & ISP Health Benchmark
              {running && <Badge variant="warning" className="text-[10px] animate-pulse">Running Test</Badge>}
            </h2>
            <p className="text-xs text-[#8C8C8C] mt-0.5">
              Measure host WAN download, upload, and latency directly from the Ubuntu server.
            </p>
          </div>
        </div>

        <button
          onClick={handleRun}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-white text-[#0A0A0A] hover:bg-neutral-200 transition-colors disabled:opacity-50 shadow-sm shrink-0 active:scale-[0.98]"
        >
          {running ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Testing Network (15s)...
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              Run Speedtest Now
            </>
          )}
        </button>
      </div>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Download */}
        <div className="p-5 rounded-xl border border-[#2A2A2A] bg-[#0F0F0F]">
          <div className="flex items-center justify-between text-xs text-[#8C8C8C] mb-2">
            <span className="flex items-center gap-1.5 uppercase font-medium tracking-wider text-[10px]">
              <ArrowDown className="w-3.5 h-3.5 text-[#ECECEC]" />
              Download Speed
            </span>
            <span className="text-[10px] text-[#8C8C8C]">WAN Inbound</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-normal font-serif tabular-nums text-[#ECECEC]">
              {running ? '--' : (last?.downloadMbps != null ? last.downloadMbps : '0.00')}
            </span>
            <span className="text-xs font-medium text-[#8C8C8C]">Mbps</span>
          </div>
        </div>

        {/* Upload */}
        <div className="p-5 rounded-xl border border-[#2A2A2A] bg-[#0F0F0F]">
          <div className="flex items-center justify-between text-xs text-[#8C8C8C] mb-2">
            <span className="flex items-center gap-1.5 uppercase font-medium tracking-wider text-[10px]">
              <ArrowUp className="w-3.5 h-3.5 text-[#ECECEC]" />
              Upload Speed
            </span>
            <span className="text-[10px] text-[#8C8C8C]">WAN Outbound</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-normal font-serif tabular-nums text-[#ECECEC]">
              {running ? '--' : (last?.uploadMbps != null ? last.uploadMbps : '0.00')}
            </span>
            <span className="text-xs font-medium text-[#8C8C8C]">Mbps</span>
          </div>
        </div>

        {/* Latency */}
        <div className="p-5 rounded-xl border border-[#2A2A2A] bg-[#0F0F0F]">
          <div className="flex items-center justify-between text-xs text-[#8C8C8C] mb-2">
            <span className="flex items-center gap-1.5 uppercase font-medium tracking-wider text-[10px]">
              <Activity className="w-3.5 h-3.5 text-[#ECECEC]" />
              Roundtrip Ping
            </span>
            <span className="text-[10px] text-[#8C8C8C]">CDN Latency</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-normal font-serif tabular-nums text-[#ECECEC]">
              {running ? '--' : (last?.pingMs != null ? last.pingMs : '--')}
            </span>
            <span className="text-xs font-medium text-[#8C8C8C]">ms</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-[#8C8C8C] border-t border-[#2A2A2A] pt-2">
            <span>Jitter: <strong className="text-[#ECECEC] font-normal font-mono">{last?.jitterMs ?? 0} ms</strong></span>
            <span>Gateway: <strong className="text-[#ECECEC] font-normal font-mono">{last?.gatewayPingMs ?? 0} ms</strong></span>
          </div>
        </div>
      </div>

      {/* Target Edge Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-[#0F0F0F] border border-[#2A2A2A] text-xs text-[#8C8C8C] gap-2 mb-6">
        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-[#8C8C8C]" />
          <span>Endpoint: <strong className="text-[#ECECEC] font-medium">{last?.server || 'Cloudflare Anycast CDN (India Edge)'}</strong></span>
        </div>
        {last?.timestamp && (
          <div className="flex items-center gap-1.5 text-[#8C8C8C] text-[11px] font-mono">
            <Clock className="w-3.5 h-3.5" />
            <span>Last Tested: {new Date(last.timestamp).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Past Benchmark History */}
      {status?.history && status.history.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-[#8C8C8C]">
            Recent Benchmark History
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] text-[#8C8C8C] uppercase border-b border-[#2A2A2A]">
                <tr>
                  <th className="pb-2 font-medium">Timestamp</th>
                  <th className="pb-2 font-medium">Download</th>
                  <th className="pb-2 font-medium">Upload</th>
                  <th className="pb-2 font-medium">Ping</th>
                  <th className="pb-2 font-medium">Jitter</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2A] font-mono text-[11px]">
                {status.history.slice(-5).reverse().map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-[#222222]/40 transition-colors">
                    <td className="py-2.5 text-[#8C8C8C]">{new Date(item.timestamp).toLocaleTimeString()}</td>
                    <td className="py-2.5 font-medium text-[#ECECEC]">{item.downloadMbps} Mbps</td>
                    <td className="py-2.5 font-medium text-[#ECECEC]">{item.uploadMbps} Mbps</td>
                    <td className="py-2.5 text-[#ECECEC]">{item.pingMs} ms</td>
                    <td className="py-2.5 text-[#8C8C8C]">{item.jitterMs} ms</td>
                    <td className="py-2.5">
                      <span className="inline-flex items-center gap-1 text-[#4ADE80]">
                        <CheckCircle2 className="w-3 h-3" /> OK
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
