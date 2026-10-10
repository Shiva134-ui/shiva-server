import { Loader2 } from 'lucide-react';
export default function PageLoader() {
  return (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
    </div>
  );
}
