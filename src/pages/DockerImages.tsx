import { useState } from 'react';
import { ArrowDownToLine } from 'lucide-react';
import DockerInventoryPage from '../components/DockerInventoryPage';
import ContainerUpdateModal from '../components/docker/ContainerUpdateModal';

export default function DockerImages() {
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  return (
    <div className="space-y-6 pb-8">
      {/* Top Action Banner */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-[#0F0F0F] border border-[#2A2A2A] text-[#ECECEC]">
            <ArrowDownToLine className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-[#ECECEC]">Docker Hub Image Update Center</h3>
            <p className="text-xs text-[#8C8C8C] mt-0.5">Scan installed tags and pull latest builds for active containers.</p>
          </div>
        </div>

        <button
          onClick={() => setIsUpdateModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white text-[#0A0A0A] hover:bg-neutral-200 transition-colors shadow-sm shrink-0 active:scale-[0.98]"
        >
          <ArrowDownToLine className="w-3.5 h-3.5" />
          Check Image Updates
        </button>
      </div>

      {/* Main Images Inventory */}
      <DockerInventoryPage kind="images" />

      {/* Update Modal */}
      <ContainerUpdateModal 
        isOpen={isUpdateModalOpen} 
        onClose={() => setIsUpdateModalOpen(false)} 
      />
    </div>
  );
}
