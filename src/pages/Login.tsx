import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Terminal, AlertCircle, Loader2 } from 'lucide-react';

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginDev, error } = useAuth();
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await login();
      navigate('/dashboard');
    } catch {
      // Error handled by context
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] mb-5 shadow-sm">
            <Terminal className="w-6 h-6 text-[#ECECEC]" strokeWidth={1.75} />
          </div>
          <h1 className="text-3xl font-normal font-serif text-[#ECECEC] tracking-tight mb-1.5">MΛDESH Server</h1>
          <p className="text-[11px] text-[#8C8C8C] tracking-widest font-mono uppercase">Control & Infrastructure Node</p>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-7 sm:p-8 shadow-xl">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-[#F87171] shrink-0 mt-0.5" />
              <p className="text-xs text-[#F87171] leading-relaxed">{error.message}</p>
            </div>
          )}

          <div className="space-y-5 flex flex-col items-center">
            <p className="text-xs text-[#8C8C8C] text-center mb-2 leading-relaxed">
              Authenticate via Google Workspace to access telemetry, containers, and server infrastructure.
            </p>

            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full bg-white hover:bg-neutral-200 text-[#0A0A0A] font-semibold rounded-xl py-3 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-xs tracking-wider uppercase active:scale-[0.98] cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#0A0A0A]" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {import.meta.env.DEV && loginDev && (
              <button
                type="button"
                onClick={() => {
                  loginDev();
                  navigate('/dashboard');
                }}
                className="w-full bg-[#0F0F0F] hover:bg-[#222222] border border-[#2A2A2A] text-[#8C8C8C] hover:text-[#ECECEC] font-mono rounded-xl py-2.5 transition text-xs tracking-wider uppercase cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <span>⚡ Dev Direct Access</span>
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-[11px] text-[#8C8C8C]/40 mt-8 tracking-wider uppercase font-mono">
          Private Infrastructure Node • Ubuntu 24.04 LTS
        </p>
      </div>
    </div>
  );
}
