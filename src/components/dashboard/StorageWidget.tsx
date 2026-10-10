import type { StorageInfo } from '../../types/system';
import { useNavigate } from 'react-router-dom';
import { formatBytes, asArray, asNumber } from '../../utils/safeFormat';

function getFriendlyDiskName(disk: StorageInfo, index: number): string {
  return disk.model && disk.model !== 'Not reported' ? disk.model : (disk.name || ('Disk ' + (index + 1)));
}

export default function StorageWidget({ storage }: { storage: StorageInfo[] }) {
  const navigate = useNavigate();
  const storageArray = asArray<StorageInfo>(storage);

  const disks = [...storageArray].sort((a, b) => {
    if (a.type === 'SSD' && b.type !== 'SSD') return -1;
    if (b.type === 'SSD' && a.type !== 'SSD') return 1;
    return (a.name || '').localeCompare(b.name || '');
  });

  return (
    <div 
      className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 cursor-pointer hover:bg-[#222222] hover:border-[#383838] transition-all duration-150" 
      onClick={() => navigate('/storage-disks')}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-medium text-[#8C8C8C] uppercase tracking-[0.04em]">Storage Volumes</h3>
        <span className="text-xs text-[#ECECEC] hover:underline">Details</span>
      </div>
      <div className="space-y-4">
        {disks.map((disk, i) => {
          const rootPartition = asArray(disk.partitions).find(p => p.mount === '/');
          const total = asNumber(disk.capacity ?? disk.total) ?? asNumber(rootPartition?.total);
          const used = asNumber(disk.used) ?? asNumber(rootPartition?.used);
          const usagePercent = asNumber(disk.usagePercent) ?? asNumber(rootPartition?.usagePercent);

          const rawModel = disk.model || disk.name || ('Disk ' + (i + 1));
          const displayName = getFriendlyDiskName(disk, i);

          return (
            <div key={disk.id || i} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#ECECEC] truncate max-w-[180px]" title={rawModel}>
                  {displayName}
                </span>
                <span className="text-[#8C8C8C] font-mono text-[11px]">
                  {used == null ? '--' : formatBytes(used)} / {total == null ? '--' : formatBytes(total)}
                </span>
              </div>
              <div className="h-1.5 w-full bg-[#2A2A2A] rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-300 ease-out bg-white" 
                  style={{ width: `${usagePercent == null ? 0 : Math.min(100, Math.max(0, usagePercent))}%` }}
                />
              </div>
            </div>
          );
        })}
        {disks.length === 0 && (
          <div className="text-xs text-[#8C8C8C] py-2">No storage volumes detected</div>
        )}
      </div>
    </div>
  );
}