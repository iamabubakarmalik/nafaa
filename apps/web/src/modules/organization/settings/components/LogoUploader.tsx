import { useRef, useState, useCallback } from 'react';
import { Upload, X, Loader2, ImageIcon, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@core/api/client';
import { Button } from '@/design-system/components';

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
      toast.success(`${label} upload ho gaya`);
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
            ? 'border border-slate-200 bg-white shadow-sm'
            : 'border-2 border-dashed cursor-pointer',
          dragOver
            ? 'border-brand-500 bg-brand-50 scale-105'
            : value ? '' : 'border-slate-300 bg-slate-50 hover:border-brand-400',
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
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-900 shadow-lg transition hover:bg-brand-600 hover:text-brand-fg"
                  title="Badlein" aria-label="Logo badlein"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onChange(''); }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-rose-600 shadow-lg transition hover:bg-rose-600 hover:text-white"
                  title="Hatayein" aria-label="Logo hatayein"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="pointer-events-none flex flex-col items-center gap-1.5 text-slate-400">
            <ImageIcon className="h-7 w-7" />
            <span className="text-[0.6875rem] font-semibold uppercase tracking-wider">
              {dragOver ? 'Drop!' : 'Upload'}
            </span>
          </div>
        )}

        {/* Uploading overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
            <Loader2 className="h-7 w-7 animate-spin text-brand-300" />
            {progress > 0 && (
              <>
                <div className="w-16 h-1 rounded-full bg-white/20 overflow-hidden">
                  <div className="h-full bg-brand-400 transition-all" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-[0.6875rem] font-semibold tabular-nums text-brand-200">{progress}%</span>
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
          <Button onClick={() => inputRef.current?.click()} disabled={uploading} leftIcon={<Upload className="h-4 w-4" />}>
            {uploading ? 'Upload ho raha hai…' : value ? 'Badlein' : 'Upload karein'}
          </Button>

          {value && !uploading && (
            <Button variant="critical" onClick={() => onChange('')} leftIcon={<X className="h-3.5 w-3.5" />}>Hatayein</Button>
          )}
        </div>

        <div className="space-y-0.5 text-xs text-slate-500">
          <p>PNG, JPG ya WebP · 5MB tak · file yahan kheench kar bhi daal sakte hain</p>
          {hint && <p className="text-slate-400">{hint}</p>}
        </div>
      </div>
    </div>
  );
}
