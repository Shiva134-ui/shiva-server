import type { ActivityEvent } from '../../types/activity';
import { AlertTriangle, Info, ShieldAlert, Box, HardDrive, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  const navigate = useNavigate();

  const getIcon = (type: string, status: string) => {
    let color = 'text-white/50';
    if (status === 'success') color = 'text-green-400';
    if (status === 'warning') color = 'text-yellow-400';
    if (status === 'error') color = 'text-red-400';
    if (status === 'info') color = 'text-blue-400';

    switch (type) {
      case 'auth': return <Shield className={`w-3 h-3 ${color}`} />;
      case 'docker': return <Box className={`w-3 h-3 ${color}`} />;
      case 'storage': return <HardDrive className={`w-3 h-3 ${color}`} />;
      case 'alert': return <ShieldAlert className={`w-3 h-3 ${color}`} />;
      case 'warning': return <AlertTriangle className={`w-3 h-3 ${color}`} />;
      default: return <Info className={`w-3 h-3 ${color}`} />;
    }
  };

  const formatTime = (ts: string) => {
    const min = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
    if (min < 60) return `${min}m ago`;
    if (min < 1440) return `${Math.floor(min/60)}h ago`;
    return `${Math.floor(min/1440)}d ago`;
  };

  return (
    <div className="bg-[#111] border border-white/10 rounded-xl p-5 cursor-pointer hover:border-white/20 transition-all" onClick={() => navigate('/logs-system')}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Recent Activity</h3>
      </div>
      <div className="space-y-4 relative before:absolute before:inset-0 before:ml-3 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-white/20 before:via-white/10 before:to-transparent">
        {events.map((ev) => (
          <div key={ev.id} className="relative flex items-start gap-4">
            <div className="flex items-center justify-center w-6 h-6 rounded-full border border-white/20 bg-[#111] z-10 shrink-0">
               {getIcon(ev.type, ev.status)}
            </div>
            <div className="flex-1 min-w-0 bg-white/5 rounded-lg border border-white/5 p-2 mt-[-4px]">
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-semibold text-white text-xs truncate">{ev.title}</span>
                <span className="text-[10px] text-white/40 font-mono shrink-0 ml-2">{formatTime(ev.timestamp)}</span>
              </div>
              <p className="text-[11px] text-white/60 truncate">{ev.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}