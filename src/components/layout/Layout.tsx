import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import CommandPalette from '../ui/CommandPalette';
import { ErrorBoundary } from '../ErrorBoundary';

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0A0A0A] text-[#ECECEC]">
      {/* Global Command Palette */}
      <CommandPalette />

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden transition-opacity duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar with mobile drawer & desktop collapse */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <Sidebar 
          collapsed={isCollapsed} 
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          onMobileClose={() => setIsMobileMenuOpen(false)}
        />
      </div>
      
      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0A0A0A]">
        <Header onMenuClick={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden relative overscroll-y-contain">
          <div className="w-full max-w-[1400px] 2xl:max-w-[1680px] 3xl:max-w-[1920px] mx-auto px-3.5 sm:px-6 py-4 sm:py-6 lg:py-8 flex-1 min-w-0">
            <ErrorBoundary inline resetKey={location.pathname} fallbackTitle="View Rendering Error">
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
