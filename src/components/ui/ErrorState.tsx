import { AlertTriangle, RefreshCw } from 'lucide-react';
export default function ErrorState({ title = "System Fault", message, onRetry }: { title?: string, message: string, onRetry?: () => void }) {
  // If the message is 501, it's not a real fault, just an unimplemented endpoint.
  const isNotImplemented = message.includes('501') || message.includes('Not Implemented');

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center gap-4 bg-[#0a0a0a] border border-white/5 rounded-xl animate-fade-in relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
      
      <div className={`w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-2 transition-colors ${isNotImplemented ? '' : 'border-red-500/20 bg-red-500/5'}`}>
        <AlertTriangle className={`w-8 h-8 ${isNotImplemented ? 'text-white/40' : 'text-red-500/80'}`} strokeWidth={1.5} />
      </div>
      
      <div>
        <h2 className="text-sm font-medium tracking-widest text-white uppercase mb-2">{isNotImplemented ? 'AWAITING API' : title}</h2>
        <p className="text-xs text-white/40 max-w-[320px] leading-relaxed font-mono">
          {message}
        </p>
      </div>

      {onRetry && !isNotImplemented && (
        <button onClick={onRetry} className="mt-4 flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/70 text-xs font-mono tracking-widest uppercase transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Connection
        </button>
      )}
    </div>
  );
}
