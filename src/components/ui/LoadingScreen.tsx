import { Loader2 } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 border-t-2 border-r-2 border-white/20 rounded-full animate-spin"></div>
          <div className="absolute inset-2 border-b-2 border-l-2 border-white/40 rounded-full animate-spin-slow"></div>
          <Loader2 className="absolute inset-4 w-8 h-8 text-white animate-pulse" />
        </div>
        <div className="flex flex-col items-center">
          <h1 className="text-xl font-bold tracking-widest text-white mb-1">MΛDESH</h1>
          <p className="text-xs text-white/50 tracking-wider">INITIALIZING SYSTEM</p>
        </div>
      </div>
    </div>
  );
}
