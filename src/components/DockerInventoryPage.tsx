import { useCallback, useEffect, useMemo, useState } from 'react';
import { Database, Layers, Network, RefreshCw, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { dockerService, type DockerImage, type DockerNetwork, type DockerVolume } from '../services/docker';
import ErrorState from './ui/ErrorState';

type Kind = 'images' | 'volumes' | 'networks';
type Row = DockerImage | DockerVolume | DockerNetwork;

const definitions: Record<Kind, {
  title: string;
  description: string;
  icon: LucideIcon;
  load: () => Promise<Row[]>;
  columns: Array<{ key: string; label: string }>;
  empty: string;
}> = {
  images: {
    title: 'Docker Images',
    description: 'Images stored on the Ubuntu server Docker engine.',
    icon: Layers,
    load: () => dockerService.getImages(),
    columns: [
      { key: 'repository', label: 'Repository' },
      { key: 'tag', label: 'Tag' },
      { key: 'id', label: 'Image ID' },
      { key: 'created', label: 'Created' },
      { key: 'size', label: 'Size' }
    ],
    empty: 'The server reports no Docker images.'
  },
  volumes: {
    title: 'Docker Volumes',
    description: 'Persistent volumes registered with the server Docker engine.',
    icon: Database,
    load: () => dockerService.getVolumes(),
    columns: [
      { key: 'name', label: 'Volume' },
      { key: 'driver', label: 'Driver' },
      { key: 'mountpoint', label: 'Mount point' },
      { key: 'scope', label: 'Scope' },
      { key: 'labels', label: 'Labels' }
    ],
    empty: 'The server reports no Docker volumes.'
  },
  networks: {
    title: 'Docker Networks',
    description: 'Networks configured on the server Docker engine.',
    icon: Network,
    load: () => dockerService.getNetworks(),
    columns: [
      { key: 'name', label: 'Network' },
      { key: 'id', label: 'Network ID' },
      { key: 'driver', label: 'Driver' },
      { key: 'scope', label: 'Scope' }
    ],
    empty: 'The server reports no Docker networks.'
  }
};

export default function DockerInventoryPage({ kind }: { kind: Kind }) {
  const definition = definitions[kind];
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const Icon = definition.icon;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await definition.load();
      setRows(Array.isArray(result) ? result : []);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error('Could not load Docker inventory from the server.'));
    } finally {
      setLoading(false);
    }
  }, [definition]);

  useEffect(() => { void refresh(); }, [refresh]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return rows;
    return rows.filter(row => Object.values(row).some(value => String(value ?? '').toLowerCase().includes(normalizedQuery)));
  }, [rows, query]);

  if (error && rows.length === 0) return <ErrorState title={`${definition.title} unavailable`} message={error.message} onRetry={() => void refresh()} />;

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#8C8C8C] mb-1 flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5" /> Docker Management
          </div>
          <h1 className="text-2xl font-normal font-serif text-[#ECECEC] tracking-tight">{definition.title}</h1>
          <p className="mt-1 text-xs text-[#8C8C8C]">{definition.description}</p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-3.5 py-2 text-xs font-medium text-[#ECECEC] transition hover:bg-[#222222] active:scale-[0.98] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>

      <section className="overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#2A2A2A] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#8C8C8C]">{loading ? 'Refreshing server inventory…' : `${filteredRows.length} of ${rows.length} entries`}</p>
          <label className="flex items-center gap-2 rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] px-3 py-1.5 sm:w-72">
            <Search className="h-3.5 w-3.5 shrink-0 text-[#8C8C8C]" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={`Search ${kind}…`}
              className="min-w-0 flex-1 bg-transparent text-xs text-[#ECECEC] outline-none placeholder:text-[#8C8C8C]"
            />
          </label>
        </div>
        {error && <div className="border-b border-[#2A2A2A] bg-red-950/20 px-4 py-3 text-xs text-red-300">Refresh failed: {error.message}</div>}
        {filteredRows.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <Icon className="mx-auto mb-3 h-6 w-6 text-[#8C8C8C]" />
            <p className="text-xs text-[#8C8C8C]">{query ? 'No entries match this search.' : loading ? 'Loading server inventory…' : definition.empty}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-xs">
              <thead className="bg-[#0F0F0F]/60 text-[11px] uppercase tracking-wider text-[#8C8C8C] border-b border-[#2A2A2A]">
                <tr>{definition.columns.map(column => <th key={String(column.key)} className="px-5 py-3 font-medium">{column.label}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2A]">
                {filteredRows.map((row, index) => (
                  <tr key={`${kind}-${index}`} className="transition hover:bg-[#222222]/40">
                    {definition.columns.map(column => {
                      const val = (row as unknown as Record<string, unknown>)[column.key];
                      const isCode = column.key === 'id' || column.key === 'tag' || column.key === 'size' || column.key === 'mountpoint';
                      return (
                        <td key={column.key} className={`max-w-[360px] truncate px-5 py-3.5 text-[#ECECEC] ${isCode ? 'font-mono text-[11px] text-[#ECECEC]/90' : ''}`} title={String(val ?? 'Not reported')}>
                          {val == null || val === '' ? <span className="text-[#8C8C8C]">Not reported</span> : String(val)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
