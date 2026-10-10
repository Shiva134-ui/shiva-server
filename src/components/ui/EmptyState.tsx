import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[320px] text-center p-8 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl animate-fade-in">
      <div className="w-12 h-12 rounded-2xl bg-[#222222] border border-[#2A2A2A] flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-[#8C8C8C]" strokeWidth={1.75} />
      </div>
      
      <h3 className="text-sm font-medium text-[#ECECEC] mb-1.5">{title}</h3>
      {description && (
        <p className="text-xs text-[#8C8C8C] max-w-[340px] leading-relaxed mb-4">
          {description}
        </p>
      )}

      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
}
