import { useState, useEffect } from 'react';
import { 
  ArrowDownToLine, 
  RefreshCw, 
  X
} from 'lucide-react';
import { containerUpdateService, type DockerImageItem } from '../../services/containerUpdates';
import { useToast } from '../ui/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContainerUpdateModal({ isOpen, onClose }: Props) {
  const [images, setImages] = useState<DockerImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pullingRepo, setPullingRepo] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      containerUpdateService.getImages().then(res => {
        setImages(res.images || []);
      }).catch(err => {
        addToast({ title: 'Error', message: err.message, type: 'error' });
      }).finally(() => setLoading(false));
    }
  }, [isOpen, addToast]);

  if (!isOpen) return null;

  const handlePull = async (img: DockerImageItem) => {
    const fullTarget = `${img.repository}:${img.tag}`;
    setPullingRepo(fullTarget);
    addToast({ title: 'Pulling Image', message: `Pulling ${fullTarget} from registry...`, type: 'info' });
    try {
      await containerUpdateService.pullImage(fullTarget);
      addToast({ title: 'Pull Successful', message: `Pulled updated layer for ${img.repository}`, type: 'success' });
    } catch (err: any) {
      addToast({ title: 'Pull Failed', message: err.message, type: 'error' });
    } finally {
      setPullingRepo(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 max-w-2xl w-full shadow-2xl relative space-y-4">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-[#8C8C8C] hover:text-[#ECECEC] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#0F0F0F] border border-[#2A2A2A] text-[#ECECEC]">
            <ArrowDownToLine className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-lg font-serif font-normal text-[#ECECEC] tracking-tight">Docker Image Update Center</h3>
            <p className="text-xs text-[#8C8C8C] mt-0.5">One-click pull latest image tags for your homelab stack.</p>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto space-y-2 pt-2">
          {loading ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map(n => <div key={n} className="h-14 bg-white/[0.03] rounded-xl" />)}
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-8 text-[#8C8C8C] text-xs">No active container images found.</div>
          ) : (
            images.map(img => {
              const fullTarget = `${img.repository}:${img.tag}`;
              const isPulling = pullingRepo === fullTarget;

              return (
                <div key={img.id} className="p-3.5 bg-[#0F0F0F] border border-[#2A2A2A] rounded-xl flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-[#ECECEC] truncate font-mono">{img.repository}</div>
                    <div className="text-[11px] font-mono text-[#8C8C8C] flex items-center gap-3 mt-1">
                      <span>Tag: <strong className="text-[#ECECEC] font-normal">{img.tag}</strong></span>
                      <span>Size: {img.size}</span>
                      <span>Created: {img.createdSince}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handlePull(img)}
                    disabled={isPulling}
                    className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-white text-[#0A0A0A] hover:bg-neutral-200 transition-colors shrink-0 disabled:opacity-50 active:scale-[0.98] shadow-sm"
                  >
                    {isPulling ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Pulling...
                      </>
                    ) : (
                      <>
                        <ArrowDownToLine className="w-3.5 h-3.5" />
                        Pull Update
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
