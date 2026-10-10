import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { navigation, isNavGroup, type NavGroup } from '../../types/navigation';
import { ChevronRight, PanelLeftClose, PanelLeftOpen, CircleUser, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useServerState } from '../../contexts/ServerContext';

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onMobileClose?: () => void;
}

export default function Sidebar({ collapsed = false, onToggleCollapse, onMobileClose }: SidebarProps) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { health } = useServerState();

  const isOnline = health.status === 'ONLINE';

  const currentPage = location.pathname.slice(1) || 'dashboard';

  const handleGroupClick = (group: NavGroup) => {
    if (collapsed && onToggleCollapse) {
      onToggleCollapse();
    }
    setOpenGroup(openGroup === group.id ? null : group.id);
  };

  const handleNavClick = (pageId: string) => {
    navigate(`/${pageId}`);
    setOpenGroup(null);
    if (onMobileClose) onMobileClose();
  };

  const handleSubClick = (pageId: string, groupId: string) => {
    navigate(`/${pageId}`);
    setOpenGroup(groupId);
    if (onMobileClose) onMobileClose();
  };

  const isSubActive = (groupId: string) => {
    return currentPage.startsWith(groupId + '-');
  };

  return (
    <aside 
      className={`h-screen bg-[#0F0F0F] border-r border-[#2A2A2A] flex flex-col transition-all duration-200 select-none ${
        collapsed ? 'w-[68px] min-w-[68px]' : 'w-[260px] min-w-[260px]'
      }`}
    >
      {/* Brand Header */}
      <div className="h-[60px] border-b border-[#2A2A2A] flex items-center justify-center shrink-0">
        {collapsed ? (
          onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="w-10 h-10 rounded-xl bg-[#1A1A1A] hover:bg-[#222222] border border-[#2A2A2A] hover:border-white/30 flex items-center justify-center text-[#ECECEC] transition-colors cursor-pointer group"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="w-4 h-4 text-[#8C8C8C] group-hover:text-white transition-colors" />
            </button>
          )
        ) : (
          <div className="flex items-center justify-between w-full px-4">
            <div 
              onClick={() => handleNavClick('dashboard')} 
              className="flex items-center gap-3 cursor-pointer group"
              title="MΛDESH Dashboard"
            >
              <div className="w-8 h-8 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] flex items-center justify-center text-white group-hover:border-white/40 transition-colors shadow-sm font-bold text-sm tracking-wider font-mono">
                M
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-semibold text-[#ECECEC] tracking-wide">
                  MΛDESH
                </span>
                <span className="text-[10px] text-[#8C8C8C] tracking-wider uppercase font-mono">
                  Server v3
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {onToggleCollapse && (
                <button
                  onClick={onToggleCollapse}
                  className="hidden lg:flex p-1.5 rounded-xl text-[#8C8C8C] hover:text-white hover:bg-[#222222] transition-colors cursor-pointer"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              )}
              {onMobileClose && (
                <button
                  onClick={onMobileClose}
                  className="lg:hidden p-1.5 rounded-xl text-[#8C8C8C] hover:text-white hover:bg-[#222222] transition-colors cursor-pointer"
                  title="Close sidebar"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className={`flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-1 ${
        collapsed ? 'px-2 flex flex-col items-center' : 'px-2.5'
      }`}>
        {navigation.map((entry) => {
          if (isNavGroup(entry)) {
            const isOpen = !collapsed && (openGroup === entry.id || isSubActive(entry.id));
            const isGroupActive = isSubActive(entry.id);

            if (collapsed) {
              return (
                <button
                  key={entry.id}
                  onClick={() => handleGroupClick(entry)}
                  title={entry.label}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 cursor-pointer ${
                    isGroupActive
                      ? 'bg-white text-[#0A0A0A] shadow-sm font-semibold'
                      : 'text-[#8C8C8C] hover:bg-[#222222] hover:text-[#ECECEC]'
                  }`}
                >
                  <entry.icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                </button>
              );
            }

            return (
              <div key={entry.id} className="space-y-0.5">
                {/* Group Header Button */}
                <button
                  onClick={() => handleGroupClick(entry)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                    isGroupActive
                      ? 'text-[#ECECEC] bg-[#1A1A1A]'
                      : 'text-[#8C8C8C] hover:bg-[#222222] hover:text-[#ECECEC]'
                  }`}
                >
                  <entry.icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                  <span className="flex-1 text-left truncate">{entry.label}</span>
                  <ChevronRight 
                    className={`w-3.5 h-3.5 text-[#8C8C8C] transition-transform duration-200 ${
                      isOpen ? 'rotate-90 text-white' : ''
                    }`} 
                  />
                </button>

                {/* Sub-item pills */}
                {isOpen && (
                  <div className="pl-7 pr-1 space-y-0.5 py-1">
                    {entry.children.map((child) => {
                      const isActive = currentPage === child.id;
                      return (
                        <button
                          key={child.id}
                          onClick={() => handleSubClick(child.id, entry.id)}
                          className={`w-full text-left px-3 py-1.5 rounded-xl text-[12.5px] font-medium transition-all duration-150 truncate cursor-pointer ${
                            isActive
                              ? 'bg-white text-[#0A0A0A] font-semibold shadow-sm'
                              : 'text-[#8C8C8C] hover:bg-[#222222] hover:text-[#ECECEC]'
                          }`}
                        >
                          {child.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Standalone top-level nav item
          const isActive = currentPage === entry.id;

          if (collapsed) {
            return (
              <button
                key={entry.id}
                onClick={() => handleNavClick(entry.id)}
                title={entry.label}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-white text-[#0A0A0A] shadow-sm font-semibold'
                    : 'text-[#8C8C8C] hover:bg-[#222222] hover:text-[#ECECEC]'
                }`}
              >
                <entry.icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
              </button>
            );
          }

          return (
            <button
              key={entry.id}
              onClick={() => handleNavClick(entry.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-white text-[#0A0A0A] font-semibold shadow-sm'
                  : 'text-[#8C8C8C] hover:bg-[#222222] hover:text-[#ECECEC]'
              }`}
            >
              <entry.icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
              <span className="truncate">{entry.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Pinned User Profile */}
      <div className="border-t border-[#2A2A2A] bg-[#0F0F0F] shrink-0 p-3">
        {collapsed ? (
          <div className="flex flex-col items-center justify-center">
            <div 
              className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] text-[#ECECEC] hover:border-white/30 transition-colors" 
              title={`${user?.name || 'Madesh'} (Administrator) • ${isOnline ? 'Online' : 'Offline'}`}
            >
              <CircleUser className="w-4 h-4 text-[#8C8C8C]" />
              <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#0F0F0F] ${
                isOnline ? 'bg-[#4ADE80] animate-pulse' : 'bg-[#F87171]'
              }`} />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-[#141414] border border-[#2A2A2A]">
            <div className="relative w-8 h-8 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center text-[#8C8C8C] shrink-0">
              <CircleUser className="w-4.5 h-4.5" />
              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#141414] ${
                isOnline ? 'bg-[#4ADE80] animate-pulse' : 'bg-[#F87171]'
              }`} />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[12.5px] font-medium text-[#ECECEC] truncate">
                {user?.name || 'Madesh'}
              </span>
              <span className="text-[10px] text-[#8C8C8C] truncate uppercase tracking-wider font-mono">
                Administrator
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
