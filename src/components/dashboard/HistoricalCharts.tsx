import { useServerState } from '../../contexts/ServerContext';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { asArray, formatNumber, safeTime } from '../../utils/safeFormat';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#141414] border border-[#2A2A2A] p-3 rounded-xl shadow-2xl min-w-[130px]">
        <p className="text-[#8C8C8C] text-[11px] mb-2 font-mono tracking-wide">{label}</p>
        {asArray(payload).map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between text-xs mb-1 last:mb-0">
            <span className="font-medium text-[#8C8C8C]">
              {entry.name === 'cpu' ? 'CPU' : 'RAM'}
            </span>
            <span className="text-[#ECECEC] font-mono font-medium ml-4">
              {formatNumber(entry.value, 1)}%
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function HistoricalCharts() {
  const { telemetryHistory } = useServerState();

  const history = asArray(telemetryHistory);
  const hasData = history.length > 0;
  
  const chartData = history.map((point: any) => {
    return {
      time: safeTime(point?.timestamp),
      cpu: typeof point?.cpuUsage === 'number' ? point.cpuUsage : 0,
      memory: typeof point?.memoryUsage === 'number' ? point.memoryUsage : 0
    };
  });

  const yAxisMax = (dataMax: number) => Math.min(100, Math.max(20, Math.ceil(((dataMax || 0) * 1.2) / 10) * 10));

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-xs font-medium text-[#8C8C8C] uppercase tracking-[0.04em]">Telemetry Timeline</h3>
        <span className="text-[11px] font-mono text-[#8C8C8C]">Real-time History</span>
      </div>

      <div className="h-[210px] w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8C8C8C" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#8C8C8C" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
              <XAxis 
                dataKey="time" 
                stroke="#444" 
                tick={{fill: '#8C8C8C', fontSize: 10}} 
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <YAxis 
                stroke="#444" 
                tick={{fill: '#8C8C8C', fontSize: 10}} 
                tickLine={false}
                axisLine={false}
                domain={[0, yAxisMax]}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }} />
              <Area type="monotone" dataKey="cpu" name="cpu" stroke="#FFFFFF" strokeWidth={1.5} fillOpacity={1} fill="url(#colorCpu)" isAnimationActive={false} />
              <Area type="monotone" dataKey="memory" name="memory" stroke="#8C8C8C" strokeWidth={1.5} fillOpacity={1} fill="url(#colorMem)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-[#8C8C8C] text-xs">Gathering Telemetry...</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t border-[#2A2A2A]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white"></div>
          <span className="text-xs text-[#8C8C8C]">CPU Load</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#8C8C8C]"></div>
          <span className="text-xs text-[#8C8C8C]">RAM Draw</span>
        </div>
      </div>
    </div>
  );
}