import type { ReactNode } from 'react';

export default function Badge({ 
  children, 
  variant = 'default', 
  className = '' 
}: { 
  children: ReactNode; 
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'; 
  className?: string; 
}) {
  const dotColors = {
    default: 'bg-[#8C8C8C]',
    success: 'bg-[#4ADE80]',
    warning: 'bg-[#FBBF24]',
    error: 'bg-[#F87171]',
    info: 'bg-[#60A5FA]',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-medium rounded-full bg-[#1A1A1A] border border-[#2A2A2A] text-[#8C8C8C] ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />
      <span>{children}</span>
    </span>
  );
}
