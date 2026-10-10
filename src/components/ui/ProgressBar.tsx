interface ProgressBarProps {
  value: number;
  color?: string;
  className?: string;
}

export default function ProgressBar({ value, color = '#FFFFFF', className = '' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={`h-1.5 w-full bg-[#2A2A2A] rounded-full overflow-hidden ${className}`}>
      <div 
        className="h-full rounded-full transition-all duration-300 ease-out" 
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </div>
  );
}
