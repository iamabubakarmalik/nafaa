/** Drop area for images and videos, with a progress row per file. */

import { useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, Film, UploadCloud, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ACCEPT, type UploadItem } from '../lib/useAssetUpload';

export function UploadDropzone({ onFiles, busy, compact, children }: { onFiles: (files: File[]) => void; busy?: boolean; compact?: boolean; children?: ReactNode }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.current?.click(); } }}
      onDragEnter={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); depth.current += 1; setOver(true); } }}
      onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } }}
      onDragLeave={() => { depth.current = Math.max(0, depth.current - 1); if (!depth.current) setOver(false); }}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        depth.current = 0;
        setOver(false);
        onFiles(Array.from(e.dataTransfer.files));
      }}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        compact ? 'px-3 py-4' : 'px-6 py-8',
        over ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-slate-50/60 hover:border-brand-400 hover:bg-brand-50/40',
      )}
    >
      <UploadCloud className={cn('text-brand-600', compact ? 'h-5 w-5' : 'h-7 w-7', busy && 'animate-pulse')} />
      <p className="text-[0.8125rem] font-semibold text-slate-800">{over ? 'Drop to upload' : 'Drag files here or click to choose'}</p>
      {!compact && <p className="text-[0.75rem] text-slate-500">Images up to 15 MB (JPG, PNG, WebP, GIF). Videos up to 200 MB (MP4, MOV, WebM). Several at once is fine.</p>}
      {children}
      <input ref={input} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => { if (e.target.files?.length) onFiles(Array.from(e.target.files)); e.target.value = ''; }} />
    </div>
  );
}

export function UploadList({ items, onDismiss }: { items: UploadItem[]; onDismiss: (id: string) => void }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-1.5">
      {items.map((it) => (
        <li key={it.id} className="flex items-center gap-2.5 rounded-xl bg-white p-1.5 pe-2 ring-1 ring-slate-200">
          <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-slate-100">
            {it.kind === 'video' ? <Film className="m-auto mt-2.5 h-4 w-4 text-slate-500" /> : <img src={it.preview} alt="" className="h-full w-full object-cover" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.8125rem] font-medium text-slate-800">{it.name}</p>
            {it.status === 'error' ? <p className="truncate text-[0.75rem] text-rose-600">{it.error}</p> : (
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className={cn('h-full rounded-full transition-all', it.status === 'done' ? 'bg-success-500' : 'bg-brand-500')} style={{ width: `${Math.max(4, it.progress)}%` }} />
              </div>
            )}
          </div>
          {it.status === 'done' && <CheckCircle2 className="h-4 w-4 text-success-600" />}
          {it.status === 'error' && <XCircle className="h-4 w-4 text-rose-500" />}
          {it.status !== 'uploading' && (
            <button type="button" onClick={() => onDismiss(it.id)} className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Dismiss"><X className="h-3.5 w-3.5" /></button>
          )}
        </li>
      ))}
    </ul>
  );
}
