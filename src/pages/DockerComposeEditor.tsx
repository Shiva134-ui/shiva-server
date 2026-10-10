import { useState, useEffect, useCallback } from 'react';
import { 
  FileCode, 
  Save, 
  RefreshCw, 
  FileText 
} from 'lucide-react';
import { composeEditorService, type ComposeFileItem } from '../services/composeEditor';
import { useToast } from '../components/ui/ToastContext';

export default function DockerComposeEditor() {
  const [files, setFiles] = useState<ComposeFileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  const loadFiles = useCallback(async () => {
    try {
      const res = await composeEditorService.listFiles();
      setFiles(res.files || []);
      if (res.files && res.files.length > 0 && !selectedFile) {
        setSelectedFile(res.files[0].relPath);
      }
    } catch (_) {}
    finally {
      setLoading(false);
    }
  }, [selectedFile]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    if (selectedFile) {
      setLoading(true);
      composeEditorService.readFile(selectedFile).then(res => {
        setContent(res.content);
      }).catch(err => {
        addToast({ title: 'Read Error', message: err.message, type: 'error' });
      }).finally(() => setLoading(false));
    }
  }, [selectedFile, addToast]);

  const handleSave = async () => {
    if (!selectedFile) return;
    setSaving(true);
    try {
      const res = await composeEditorService.saveFile(selectedFile, content);
      addToast({ 
        title: 'Compose Saved', 
        message: `Saved with automatic backup. (${res.validation})`, 
        type: 'success' 
      });
    } catch (err: any) {
      addToast({ title: 'Save Failed', message: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#8C8C8C] mb-1 flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5" /> Docker Management
          </div>
          <h1 className="text-2xl font-normal font-serif text-[#ECECEC] tracking-tight">Compose Stack Editor</h1>
          <p className="text-xs text-[#8C8C8C] mt-1">
            Safely edit, review, and validate compose stacks in <code className="text-[#ECECEC] bg-[#0A0A0A] px-1.5 py-0.5 rounded border border-[#2A2A2A] font-mono text-[11px]">/opt/madesh-server/compose</code> with auto-backups.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || loading || !selectedFile}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white text-[#0A0A0A] hover:bg-neutral-200 transition-colors shadow-sm disabled:opacity-50 active:scale-[0.98]"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save & Validate
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* File Navigator Sidebar */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 space-y-2">
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#8C8C8C] mb-2 px-1">
            Discovered Stacks
          </div>
          {files.map(f => (
            <button
              key={f.relPath}
              onClick={() => setSelectedFile(f.relPath)}
              className={`w-full text-left p-2.5 rounded-xl text-xs font-mono transition-colors flex items-center gap-2.5 ${
                selectedFile === f.relPath
                  ? 'bg-white text-[#0A0A0A] font-semibold shadow-sm'
                  : 'text-[#8C8C8C] hover:text-[#ECECEC] hover:bg-[#222222]/50'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{f.relPath}</span>
            </button>
          ))}
        </div>

        {/* Editor Box */}
        <div className="md:col-span-3 bg-[#0F0F0F] border border-[#2A2A2A] rounded-2xl p-4 sm:p-5 flex flex-col min-h-[380px] sm:min-h-[550px] shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#2A2A2A] mb-3 text-xs font-mono text-[#8C8C8C]">
            <span>Editing: <strong className="text-[#ECECEC] font-normal">{selectedFile || 'Select a file'}</strong></span>
            <span>UTF-8 • YAML</span>
          </div>

          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            disabled={loading}
            className="flex-1 w-full bg-transparent text-[#ECECEC] font-mono text-xs leading-relaxed focus:outline-none resize-none placeholder-[#8C8C8C]/50"
            placeholder="Compose file content will appear here..."
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
