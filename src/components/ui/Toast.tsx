import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import type { ToastMessage } from './ToastContext';

export function Toast({ toast, onClose }: { toast: ToastMessage; onClose: () => void }) {
  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-[#4ADE80]" />,
    error: <AlertCircle className="w-4 h-4 text-[#F87171]" />,
    warning: <AlertTriangle className="w-4 h-4 text-[#FBBF24]" />,
    info: <Info className="w-4 h-4 text-[#60A5FA]" />
  };
  const type = toast.type || 'info';

  return (
    <div className="w-84 bg-[#1A1A1A] border border-[#2A2A2A] shadow-2xl rounded-2xl p-4 flex items-start gap-3 pointer-events-auto transform transition-all animate-fade-in">
      <div className="shrink-0 mt-0.5">{icons[type]}</div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-[#ECECEC]">{toast.title}</h4>
        {toast.message && <p className="text-xs text-[#8C8C8C] mt-0.5 leading-relaxed">{toast.message}</p>}
      </div>
      <button 
        onClick={onClose} 
        className="shrink-0 p-1 hover:bg-[#222222] rounded-lg text-[#8C8C8C] hover:text-white transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
