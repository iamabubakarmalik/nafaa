import { useCallback, useRef, useState } from 'react';
import {
  UploadCloud, X, CheckCircle2, AlertCircle, Image as ImageIcon, Loader2,
} from 'lucide-react';
import { useImageUpload, type UploadingItem } from '@/hooks/useImageUpload';
import type { UploadPurpose, UploadRecord } from '@/api/uploads.api';
import { cn } from '@/lib/cn';

interface Props {
  purpose?: UploadPurpose;
  maxSizeMB?: number;
  maxFiles?: number;
  multiple?: boolean;
  onUploaded?: (records: UploadRecord[]) => void;
  className?: string;
  hint?: string;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

export function UploadDropzone({
  purpose = 'product-image',
  maxSizeMB = 10,
  maxFiles = 10,
  multiple = true,
  onUploaded,
  className,
  hint,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const { items, uploading, upload, remove } = useImageUpload({
    purpose,
    maxSizeMB,
    maxFiles,
    onUploaded,
  });

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || !files.length) return;
      upload(Array.from(files));
    },
    [upload],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  return (
    <div className={cn('space-y-3', className)}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'relative cursor-pointer rounded-2xl border-2 border-dashed p-8 transition-all',
          'flex flex-col items-center justify-center text-center gap-2',
          dragActive
            ? 'border-brand-500 bg-brand-50'
            : 'border-slate-200 hover:border-brand-400 bg-slate-50/50 hover:bg-brand-50/30',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple={multiple}
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            if (inputRef.current) inputRef.current.value = '';
          }}
        />

        <div
          className={cn(
            'h-14 w-14 rounded-2xl flex items-center justify-center transition-colors',
            dragActive ? 'bg-brand-600 text-white' : 'bg-brand-100 text-brand-700',
          )}
        >
          <UploadCloud className="h-7 w-7" />
        </div>

        <div className="mt-2">
          <div className="text-base font-bold text-slate-900">
            {dragActive ? 'Drop your images here' : 'Click to upload or drag-drop'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {hint || `JPG, PNG, WebP, GIF — max ${maxSizeMB} MB each${multiple ? ` • up to ${maxFiles} files` : ''}`}
          </div>
        </div>
      </div>

      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {items.map((item) => (
            <UploadCard key={item.id} item={item} onRemove={() => remove(item.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function UploadCard({ item, onRemove }: { item: UploadingItem; onRemove: () => void }) {
  return (
    <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white">
      <div className="aspect-square bg-slate-100 overflow-hidden">
        <img
          src={item.preview}
          alt={item.name}
          className="w-full h-full object-cover"
        />
      </div>

      {item.status === 'uploading' && (
        <div className="absolute inset-0 bg-slate-900/40 flex flex-col items-center justify-center">
          <Loader2 className="h-7 w-7 text-white animate-spin" />
          <div className="mt-2 text-white text-xs font-bold">{item.progress}%</div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30">
            <div
              className="h-full bg-brand-500 transition-all"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        </div>
      )}

      {item.status === 'done' && (
        <div className="absolute top-2 right-2 h-7 w-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
          <CheckCircle2 className="h-4 w-4 text-white" />
        </div>
      )}

      {item.status === 'error' && (
        <div className="absolute inset-0 bg-rose-500/90 flex flex-col items-center justify-center p-3 text-center">
          <AlertCircle className="h-6 w-6 text-white" />
          <div className="mt-1 text-white text-[10px] font-bold leading-tight">
            {item.error}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-2 left-2 h-7 w-7 rounded-full bg-slate-900/70 hover:bg-slate-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-3.5 w-3.5 text-white" />
      </button>

      <div className="px-2.5 py-2 bg-white">
        <div className="text-[11px] font-semibold text-slate-700 truncate">
          {item.name}
        </div>
        <div className="text-[10px] text-slate-500">{formatSize(item.size)}</div>
      </div>
    </div>
  );
}
