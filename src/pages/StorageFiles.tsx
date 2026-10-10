import { useState, useEffect, useCallback } from 'react';
import { 
  Folder, HardDrive, RefreshCw, ChevronRight, ArrowUp, Search, 
  FileCode, FileArchive, FileImage, FileText, FolderPlus, Trash2, Download
} from 'lucide-react';
import { storageService, type FileListingResponse, type FileEntry } from '../services/storage';
import { useAuth } from '../contexts/AuthContext';
import { formatBytes } from '../utils/safeFormat';
import PageLoader from '../components/ui/PageLoader';
import ErrorState from '../components/ui/ErrorState';

function getFileIcon(entry: FileEntry) {
  if (entry.isDirectory) return <Folder className="w-5 h-5 text-amber-400" />;
  const ext = entry.name.split('.').pop()?.toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext || '')) {
    return <FileImage className="w-5 h-5 text-emerald-400" />;
  }
  if (['zip', 'tar', 'gz', 'bz2', 'xz', '7z'].includes(ext || '')) {
    return <FileArchive className="w-5 h-5 text-purple-400" />;
  }
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'json', 'yaml', 'yml', 'sh', 'html', 'css'].includes(ext || '')) {
    return <FileCode className="w-5 h-5 text-sky-400" />;
  }
  return <FileText className="w-5 h-5 text-text-muted" />;
}

export default function StorageFiles() {
  const [currentPath, setCurrentPath] = useState('/home/madesh');
  const [data, setData] = useState<FileListingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [search, setSearch] = useState('');
  const { token } = useAuth();

  const loadDirectory = useCallback(async (path: string) => {
    setLoading(true);
    try {
      const res = await storageService.getFiles(path);
      setData(res);
      setCurrentPath(res.currentPath);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load file directory'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDirectory(currentPath);
  }, [loadDirectory, currentPath]);

  const handleCreateFolder = async () => {
    const folderName = window.prompt('Enter new folder name:');
    if (!folderName || !folderName.trim()) return;

    const newPath = `${currentPath}/${folderName.trim()}`.replace(/\/+/g, '/');
    setActionLoading(true);
    try {
      await storageService.createDirectory(newPath);
      await loadDirectory(currentPath);
    } catch (err: any) {
      alert(`Failed to create directory: ${err.message || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteItem = async (e: React.MouseEvent, entry: FileEntry) => {
    e.stopPropagation();
    const typeStr = entry.isDirectory ? 'directory' : 'file';
    if (!window.confirm(`Are you sure you want to permanently delete this ${typeStr}?\n\n${entry.path}`)) {
      return;
    }

    setActionLoading(true);
    try {
      await storageService.deleteFile(entry.path);
      await loadDirectory(currentPath);
    } catch (err: any) {
      alert(`Failed to delete: ${err.message || 'Unknown error'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const pathSegments = currentPath.split('/').filter(Boolean);

  const filteredEntries = (data?.entries || []).filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDownload = (e: React.MouseEvent, entry: FileEntry) => {
    e.stopPropagation();
    if (!token) return;
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.madesh.in/api/v1';
    window.open(`${baseUrl}/storage/download?path=${encodeURIComponent(entry.path)}&token=${token}`, '_blank');
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs text-[#8C8C8C]">
            <HardDrive className="h-4 w-4" /> Storage
          </div>
          <h1 className="text-2xl font-normal font-serif tracking-tight text-[#ECECEC]">File Explorer</h1>
          <p className="mt-1 text-xs text-[#8C8C8C]">
            Browse, manage, and inspect files across authorized host directories.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCreateFolder}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-white hover:bg-neutral-200 px-3.5 py-2 text-xs font-semibold text-[#0A0A0A] transition shadow-sm active:scale-[0.98] disabled:opacity-50"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            <span>New Folder</span>
          </button>
          <button
            onClick={() => loadDirectory(currentPath)}
            disabled={loading || actionLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-3.5 py-2 text-xs text-[#ECECEC] transition hover:bg-[#222222] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* Breadcrumb Path Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A] p-3 text-xs font-mono">
        <button
          onClick={() => loadDirectory('/')}
          className="text-[#8C8C8C] hover:text-[#ECECEC] px-1 py-0.5 rounded transition shrink-0 cursor-pointer"
        >
          root
        </button>
        {pathSegments.map((segment, index) => {
          const pathToSegment = '/' + pathSegments.slice(0, index + 1).join('/');
          const isLast = index === pathSegments.length - 1;
          return (
            <div key={pathToSegment} className="flex items-center gap-1.5 shrink-0">
              <ChevronRight className="h-3.5 w-3.5 text-[#8C8C8C]" />
              <button
                onClick={() => loadDirectory(pathToSegment)}
                className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                  isLast
                    ? 'font-bold text-[#ECECEC] bg-white/10'
                    : 'text-[#8C8C8C] hover:text-[#ECECEC]'
                }`}
              >
                {segment}
              </button>
            </div>
          );
        })}
      </div>

      {/* Search & Navigation Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C8C8C]" />
          <input
            type="text"
            placeholder="Search this directory..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#141414] border border-[#2A2A2A] rounded-xl text-xs text-[#ECECEC] placeholder-[#8C8C8C] focus:outline-none focus:border-white transition-colors"
          />
        </div>
        {data?.parentPath && (
          <button
            onClick={() => loadDirectory(data.parentPath!)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-3.5 py-2 text-xs font-mono text-[#ECECEC] hover:bg-[#222222] cursor-pointer"
          >
            <ArrowUp className="h-3.5 w-3.5" /> Up One Level
          </button>
        )}
      </div>

      {error ? (
        <ErrorState message={error.message} onRetry={() => loadDirectory(currentPath)} />
      ) : loading && !data ? (
        <PageLoader />
      ) : (
        <section className="overflow-hidden rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A]">
          <div className="flex items-center justify-between border-b border-[#2A2A2A] px-4 sm:px-5 py-3 text-xs text-[#8C8C8C]">
            <span>Name</span>
            <div className="flex items-center gap-3 sm:gap-6 md:gap-8">
              <span className="w-14 sm:w-20 text-right">Size</span>
              <span className="hidden sm:inline w-28 md:w-36 text-right">Modified</span>
              <span className="w-14 sm:w-16 text-right">Actions</span>
            </div>
          </div>
          {filteredEntries.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-[#8C8C8C]">
              {search ? 'No files match the filter.' : 'This directory is empty.'}
            </div>
          ) : (
            <ul className="divide-y divide-[#2A2A2A]/50">
              {filteredEntries.map((entry) => (
                <li
                  key={entry.path}
                  onClick={() => entry.isDirectory && loadDirectory(entry.path)}
                  className={`flex items-center justify-between gap-3 sm:gap-4 px-3.5 sm:px-4 py-3 text-sm transition ${
                    entry.isDirectory
                      ? 'cursor-pointer hover:bg-[#222222]/40'
                      : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="shrink-0">
                      {getFileIcon(entry)}
                    </div>
                    <span className="truncate font-mono text-xs sm:text-sm text-[#ECECEC]">
                      {entry.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-6 md:gap-8 text-xs font-mono text-[#8C8C8C] shrink-0">
                    <span className="w-14 sm:w-20 text-right truncate">
                      {entry.isDirectory ? 'dir' : formatBytes(entry.size)}
                    </span>
                    <span className="hidden sm:inline w-28 md:w-36 text-right truncate">
                      {entry.mtime ? new Date(entry.mtime).toLocaleDateString() : '--'}
                    </span>
                    <div className="w-14 sm:w-16 text-right flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => handleDownload(e, entry)}
                        disabled={actionLoading}
                        title={`Download ${entry.name}`}
                        className="p-1.5 rounded-lg text-[#8C8C8C] hover:text-sky-400 hover:bg-sky-500/10 transition cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteItem(e, entry)}
                        disabled={actionLoading}
                        title={`Delete ${entry.name}`}
                        className="p-1.5 rounded-lg text-[#8C8C8C] hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
