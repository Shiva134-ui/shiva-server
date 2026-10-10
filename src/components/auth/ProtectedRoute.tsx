import { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingScreen from '../ui/LoadingScreen';
import { Clock, RefreshCw } from 'lucide-react';

export default function ProtectedRoute() {
  const { user, loading, logout, refreshRole } = useAuth();
  const [checking, setChecking] = useState(false);

  // Auto-poll approval status every 3.5 seconds if waiting for approval
  useEffect(() => {
    if (!user || user.role === 'admin') return;

    const interval = setInterval(async () => {
      try {
        await refreshRole();
      } catch (_) {}
    }, 3500);

    return () => clearInterval(interval);
  }, [user, refreshRole]);

  const handleManualCheck = async () => {
    setChecking(true);
    try {
      await refreshRole();
    } finally {
      setTimeout(() => setChecking(false), 500);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-7 sm:p-8 text-center shadow-xl">
          <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 text-[#FBBF24] rounded-2xl flex items-center justify-center mx-auto mb-5 relative">
            <Clock className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FBBF24] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FBBF24]"></span>
            </span>
          </div>
          <h2 className="text-2xl font-normal font-serif text-[#ECECEC] tracking-tight mb-2">Pending Access Approval</h2>
          <p className="text-[#8C8C8C] mb-6 leading-relaxed text-xs">
            Your Google account (<span className="text-[#ECECEC] font-mono font-medium">{user.email}</span>) is awaiting administrator authorization. Once approved, the dashboard will load automatically.
          </p>

          <div className="space-y-3">
            <button
              onClick={handleManualCheck}
              disabled={checking}
              className="w-full py-2.5 bg-white hover:bg-neutral-200 text-[#0A0A0A] rounded-xl font-semibold text-xs tracking-wider uppercase transition flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] cursor-pointer shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Checking Status...' : 'Check Approval Status'}</span>
            </button>

            <button
              onClick={logout}
              className="w-full py-2.5 bg-[#0F0F0F] hover:bg-[#222222] border border-[#2A2A2A] rounded-xl text-[#8C8C8C] hover:text-[#ECECEC] font-medium transition text-xs active:scale-[0.98] cursor-pointer"
            >
              Sign out
            </button>
          </div>

          <p className="mt-6 text-[11px] text-[#8C8C8C]/50 flex items-center justify-center gap-1.5 font-mono">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#FBBF24] animate-pulse"></span>
            Listening for approval signal...
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
