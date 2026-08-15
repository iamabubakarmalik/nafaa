import { useRef, useState, useCallback } from 'react';
import { Upload, X, Loader2, ImageIcon, Camera, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@core/api/client';

interface LogoUploaderProps {
  value?: string | null;
  onChange: (url: string) => void;
  purpose?: string;
  size?: number;
  label?: string;
  shape?: 'square' | 'circle' | 'wide';
  hint?: string;
}

export default function LogoUploader({
  value, onChange, purpose = 'logo', size = 112, label = 'Logo', shape = 'square', hint,
}: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Sirf image files allowed hain'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image 5MB se kam honi chahiye'); return; }

    setUploading(true);
    setProgress(0);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', purpose);
      const res = await apiClient.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100));
        },
      });
      const url = res.data?.data?.url || res.data?.url;
      if (!url) throw new Error('No URL');
      onChange(url);
      toast.success('Logo upload ho gaya ✅');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Upload fail');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [purpose, onChange]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const shapeCls =
    shape === 'circle' ? 'rounded-full' :
    shape === 'wide' ? 'rounded-2xl' :
    'rounded-2xl';

  const boxStyle = shape === 'wide'
    ? { width: size * 1.8, height: size }
    : { width: size, height: size };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
      {/* Preview */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={boxStyle}
        className={[
          'relative overflow-hidden flex items-center justify-center transition-all shrink-0 group',
          shapeCls,
          value
            ? 'border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-md'
            : 'border-2 border-dashed cursor-pointer',
          dragOver
            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 scale-105'
            : value ? '' : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/60 hover:border-emerald-400 dark:hover:border-emerald-500/60',
        ].join(' ')}
        onClick={() => !value && !uploading && inputRef.current?.click()}
      >
        {value ? (
          <>
            <img src={value} alt={label} className="h-full w-full object-cover" />
            {/* Hover overlay */}
            {!uploading && (
              <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/70 flex items-center justify-center gap-1.5 transition-all opacity-0 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                  className="h-9 w-9 rounded-xl bg-white text-slate-900 hover:bg-emerald-500 hover:text-white flex items-center justify-center shadow-lg transition"
                  title="Change"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onChange(''); }}
                  className="h-9 w-9 rounded-xl bg-white text-rose-600 hover:bg-rose-500 hover:text-white flex items-center justify-center shadow-lg transition"
                  title="Remove"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-slate-400 dark:text-slate-500 pointer-events-none">
            <ImageIcon className="h-7 w-7" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider">
              {dragOver ? 'Drop!' : 'Upload'}
            </span>
          </div>
        )}

        {/* Uploading overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
            <Loader2 className="h-7 w-7 text-emerald-400 animate-spin" />
            {progress > 0 && (
              <>
                <div className="w-16 h-1 rounded-full bg-white/20 overflow-hidden">
                  <div className="h-full bg-emerald-400 transition-all" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-[10px] font-extrabold text-emerald-300 tabular-nums">{progress}%</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex-1 min-w-0 space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ''; }}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-sm font-extrabold shadow-md shadow-emerald-500/30 disabled:opacity-50 transition active:scale-95"
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading...' : value ? 'Change' : 'Upload'}
          </button>

          {value && !uploading && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="inline-flex items-center gap-1.5 px-3 h-11 rounded-xl border-2 border-rose-200 dark:border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-sm font-extrabold transition active:scale-95"
            >
              <X className="h-3.5 w-3.5" /> Remove
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold space-y-0.5">
          <p className="flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-500" />
            {hint || 'PNG, JPG, WebP • Max 5MB • Drag & drop supported'}
          </p>
          <p className="text-slate-400 dark:text-slate-500">Best size: 512×512 px, transparent background</p>
        </div>
      </div>
    </div>
  );
}
