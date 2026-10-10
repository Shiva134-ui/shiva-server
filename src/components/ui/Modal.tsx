import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children,
  maxWidth = 'max-w-lg'
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  children: ReactNode;
  maxWidth?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Dark blurred backdrop */}
      <div 
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity duration-200" 
        onClick={onClose} 
      />
      
      {/* 20px radius modal card */}
      <div className={`relative bg-[#1A1A1A] border border-[#2A2A2A] rounded-[20px] w-full ${maxWidth} max-h-[90dvh] overflow-hidden shadow-2xl flex flex-col z-10 animate-fade-in`}>
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-[#2A2A2A] bg-[#141414]/50 shrink-0">
          <h2 className="text-base sm:text-lg font-normal font-serif text-[#ECECEC] tracking-tight">{title}</h2>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-[#222222] rounded-xl text-[#8C8C8C] hover:text-white transition-colors duration-150 active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
