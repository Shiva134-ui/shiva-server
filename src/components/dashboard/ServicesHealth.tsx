import type { AppService } from '../../types/services';
import { useNavigate } from 'react-router-dom';
import { asArray } from '../../utils/safeFormat';

export default function ServicesHealth({ services }: { services: AppService[] }) {
  const navigate = useNavigate();
  const servicesArray = asArray<AppService>(services);

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-medium text-[#8C8C8C] uppercase tracking-[0.04em]">Core Services Status</h3>
        <button 
          onClick={() => navigate('/services-apps')} 
          className="text-xs text-[#ECECEC] hover:underline"
        >
          View All Services
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {servicesArray.map((svc: any, idx: number) => {
          const state = (svc?.state || svc?.status || '').toLowerCase();
          
          let statusText = 'Unknown';
          let dotColor = 'bg-[#8C8C8C]';

          if (['active', 'running', 'online'].includes(state)) {
            statusText = 'Running';
            dotColor = 'bg-[#4ADE80]';
          } else if (['inactive', 'dead', 'stopped', 'offline'].includes(state)) {
            statusText = 'Stopped';
            dotColor = 'bg-[#8C8C8C]';
          } else if (['failed', 'error'].includes(state)) {
            statusText = 'Failed';
            dotColor = 'bg-[#F87171]';
          } else if (['activating', 'starting'].includes(state)) {
            statusText = 'Starting';
            dotColor = 'bg-[#FBBF24]';
          } else if (['deactivating', 'stopping'].includes(state)) {
            statusText = 'Stopping';
            dotColor = 'bg-[#FBBF24]';
          }
          
          return (
            <div 
              key={svc?.id || svc?.name || idx} 
              className="p-3 bg-[#141414] border border-[#2A2A2A] rounded-xl flex items-center justify-between hover:border-[#383838] transition-colors"
            >
              <span className="text-xs font-medium text-[#ECECEC] truncate max-w-[140px]">{svc?.name || 'Service'}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
                <span className="text-[11px] text-[#8C8C8C]">{statusText}</span>
              </div>
            </div>
          );
        })}
        {servicesArray.length === 0 && (
          <div className="col-span-full py-6 text-center text-[#8C8C8C] text-xs">
            No monitored services detected
          </div>
        )}
      </div>
    </div>
  );
}