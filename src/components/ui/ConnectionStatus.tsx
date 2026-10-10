export default function ConnectionStatus({ status }: { status: 'connected' | 'disconnected' | 'connecting' }) {
  const colors = {
    connected: 'bg-green-500',
    disconnected: 'bg-red-500',
    connecting: 'bg-yellow-500 animate-pulse'
  };
  const labels = { connected: 'Connected', disconnected: 'Disconnected', connecting: 'Connecting...' };
  
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
      <div className={"w-2 h-2 rounded-full " + colors[status]}></div>
      <span className="text-xs font-medium text-white/70 uppercase tracking-wider">{labels[status]}</span>
    </div>
  );
}
