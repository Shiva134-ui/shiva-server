import { AlertCircle, LockKeyhole } from 'lucide-react';

export default function UnavailableCapabilityPage({ title, capability, apiRoute, safeguard }: {
  title: string;
  capability: string;
  apiRoute: string;
  safeguard: string;
}) {
  return (
    <div className="mx-auto flex min-h-[420px] max-w-2xl flex-col justify-center py-8">
      <div className="rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 sm:p-8 shadow-sm">
        <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] text-[#8C8C8C]">
          <AlertCircle className="h-5 w-5" />
        </div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-[#8C8C8C]">Server API capability</p>
        <h1 className="mt-1 text-2xl font-normal font-serif text-[#ECECEC] tracking-tight">{title}</h1>
        <p className="mt-3 text-xs leading-relaxed text-[#8C8C8C]">
          {capability} is not currently exposed by the Ubuntu host API, so this page cannot load live telemetry or perform this operation yet.
        </p>
        <div className="mt-6 rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#ECECEC]">
            <LockKeyhole className="h-4 w-4 text-[#8C8C8C]" /> Required API capability
          </div>
          <code className="break-all font-mono text-xs text-[#8C8C8C]">{apiRoute}</code>
          <p className="mt-2 text-xs leading-relaxed text-[#8C8C8C]/80">{safeguard}</p>
        </div>
      </div>
    </div>
  );
}
