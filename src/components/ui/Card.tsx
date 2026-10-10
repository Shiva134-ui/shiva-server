import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div 
      onClick={onClick}
      className={`bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 sm:p-6 transition-colors duration-150 ${className}`}
    >
      {children}
    </div>
  );
}
