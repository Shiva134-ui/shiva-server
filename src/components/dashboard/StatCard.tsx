import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface StatCardProps {
  title: string;
  icon?: ReactNode;
  value: string;
  subValue: ReactNode;
  percent: number;
  color?: string;
  linkTo: string;
  chartData?: any[];
  chartDataKey?: string;
}

export default function StatCard({ 
  title, 
  value, 
  subValue, 
  percent, 
  linkTo, 
  chartData, 
  chartDataKey 
}: StatCardProps) {
  const navigate = useNavigate();

  return (
    <div 
      onClick={() => navigate(linkTo)}
      className="group bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 relative overflow-hidden cursor-pointer hover:bg-[#222222] hover:border-[#383838] transition-all duration-300 flex flex-col justify-between hover:shadow-[0_0_15px_rgba(255,255,255,0.03)] hover:-translate-y-0.5"
    >
      <div>
        <h3 className="text-[#8C8C8C] text-[11px] font-medium uppercase tracking-[0.04em] mb-2">
          {title}
        </h3>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-semibold tracking-tight text-[#ECECEC] font-mono">
            {value}
          </span>
        </div>
        <div className="text-xs text-[#8C8C8C] leading-snug">
          {subValue}
        </div>
      </div>
      
      {chartData && chartDataKey ? (
        <div className="h-10 w-full mt-3 -mb-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <Area 
                type="monotone" 
                dataKey={chartDataKey} 
                stroke="#FFFFFF" 
                fillOpacity={0.1} 
                fill="#FFFFFF" 
                strokeWidth={1.5} 
                isAnimationActive={false} 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-4 h-1.5 w-full bg-[#2A2A2A] rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-300 ease-out bg-white" 
            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
          />
        </div>
      )}
    </div>
  );
}