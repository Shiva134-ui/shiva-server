import { useLocation } from 'react-router-dom';
import { breadcrumbs } from '../../types/navigation';
import { Menu, LogOut, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useServerState } from '../../contexts/ServerContext';

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const location = useLocation();
  const { logout, user } = useAuth();
  const { health, info } = useServerState();
  const currentPage = location.pathname.slice(1) || 'dashboard';
  const breadcrumb = breadcrumbs[currentPage] || 'Dashboard';

  const isOnline = health.status === 'ONLINE';

  const triggerSearch = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
  };

  return (
    <header className="h-[60px] bg-[#0A0A0A] border-b border-[#2A2A2A] sticky top-0 flex items-center px-4 sm:px-6 justify-between shrink-0 z-30 select-none">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {onMenuClick && (
          <button 
            onClick={onMenuClick}
            className="lg:hidden p-2 min-h-[40px] min-w-[40px] flex items-center justify-center hover:bg-[#222222] rounded-xl text-[#8C8C8C] hover:text-white transition-colors active:scale-95 shrink-0"
            title="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-sm font-medium text-[#ECECEC] tracking-tight truncate max-w-[150px] xs:max-w-[220px] sm:max-w-none">
            {breadcrumb}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Quick Command Search Button */}
        <button
          onClick={triggerSearch}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1A1A1A] hover:bg-[#222222] border border-[#2A2A2A] text-xs text-[#8C8C8C] hover:text-[#ECECEC] transition-colors cursor-pointer"
          title="Search dashboard (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="text-[10px] bg-[#2A2A2A] px-1.5 py-0.5 rounded text-[#ECECEC] font-mono">⌘K</kbd>
        </button>

        {/* Dynamic Live Health Indicator */}
        <div 
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] text-[11px] font-medium transition-colors"
          title={isOnline ? 'System Core Active • Host Online' : 'Server Unreachable • Host Offline'}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[#4ADE80] animate-pulse' : 'bg-[#F87171]'}`} />
          <span className={isOnline ? 'text-[#8C8C8C]' : 'text-[#F87171]'}>
            {isOnline ? (info.data?.platform || 'Ubuntu 24.04') : 'Server Offline'}
          </span>
        </div>

        {/* Logout */}
        <button 
          onClick={logout}
          className="p-1.5 hover:bg-[#222222] rounded-xl text-[#8C8C8C] hover:text-white transition-colors cursor-pointer"
          title={`Logout (${user?.name || 'Madesh'})`}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
