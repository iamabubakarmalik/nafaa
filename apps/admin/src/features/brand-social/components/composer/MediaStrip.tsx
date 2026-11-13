/**
 * The post's media in order. Drag a tile to reorder the carousel (native
 * HTML5 drag and drop), or use the arrow keys on a focused tile. Files
 * dropped from the computer upload into the library and join the post.
 */

import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Film, FolderOpen, GripVertical, Plus, Trash2, UploadCloud } from 'lucide-react';
import { Button } from '@/design-system/components';
import type { PostMedia } from '@/api/admin-brand-social.api';
import { cn } from '@/lib/cn';
import { fmtDuration } from '../../lib/post';
import { ACCEPT, useAssetUpload } from '../../lib/useAssetUpload';
import { assetToMedia, MediaPicker } from '../MediaPicker';
import { UploadList } from '../UploadDropzone';

const aspectLabel = (m: PostMedia) => {
  if (!m.width || !m.height) return null;
  const r = m.width / m.height;
  const known: Array<[number, string]> = [[1, '1:1'], [0.8, '4:5'], [9 / 16, '9:16'], [16 / 9, '16:9'], [1.91, '1.91:1'], [2 / 3, '2:3']];
  const hit = known.find(([k]) => Math.abs(k - r) < 0.02);
  return hit ? hit[1] : r.toFixed(2);
};

export function MediaStrip({ media, onChange, max = 10, disabled }: { media: PostMedia[]; onChange: (m: PostMedia[]) => void; max?: number; disabled?: boolean }) {
  const [picker, setPicker] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [fileOver, setFileOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const latest = useRef(media);
  latest.current = media;
  const up = useAssetUpload({ onUploaded: (assets) => onChange([...latest.current, ...assets.map(assetToMedia)].slice(0, max)) });

  const move = (from: number, to: number) => {
    if (from === to || to < 0 || to >= media.length) return;
    const next = [...media];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    onChange(next);
  };

  return (
    <div
      className={cn('space-y-3 rounded-xl transition', fileOver && 'bg-brand-50 ring-2 ring-dashed ring-brand-400')}
      onDragOver={(e) => { if (!disabled && e.dataTransfer.types.includes('Files')) { e.preventDefault(); setFileOver(true); } }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setFileOver(false); }}
      onDrop={(e) => { if (e.dataTransfer.files.length) { e.preventDefault(); setFileOver(false); up.upload(Array.from(e.dataTransfer.files)); } }}
    >
      {media.length > 0 ? (
        <ol className="flex flex-wrap gap-2.5" aria-label="Media order">
          {media.map((m, i) => (
            <li
              key={`${m.assetId ?? m.url}-${i}`}
              draggable={!disabled}
              tabIndex={0}
              onDragStart={(e) => { setDrag(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); }}
              onDragEnd={() => { setDrag(null); setOver(null); }}
              onDragOver={(e) => { if (drag !== null) { e.preventDefault(); e.stopPropagation(); setOver(i); } }}
              onDrop={(e) => { if (drag !== null) { e.preventDefault(); e.stopPropagation(); move(drag, i); setDrag(null); setOver(null); } }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') { e.preventDefault(); move(i, i - 1); }
                if (e.key === 'ArrowRight') { e.preventDefault(); move(i, i + 1); }
                if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); onChange(media.filter((_, k) => k !== i)); }
              }}
              className={cn(
                'group relative h-28 w-28 cursor-grab overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 active:cursor-grabbing',
                drag === i && 'opacity-40',
                over === i && drag !== null && drag !== i && 'ring-2 ring-brand-500 scale-[1.03]',
              )}
            >
              {m.kind === 'video'
                ? (m.thumbUrl ? <img src={m.thumbUrl} alt="" className="h-full w-full object-cover" draggable={false} /> : <video src={m.url} muted preload="metadata" className="h-full w-full object-cover" />)
                : <img src={m.url} alt={m.alt ?? ''} className="h-full w-full object-cover" draggable={false} />}
              <span className="absolute start-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-black/70 px-1 text-[0.625rem] font-bold text-white">{i + 1}</span>
              <span className="absolute bottom-1.5 start-1.5 flex items-center gap-1">
                {m.kind === 'video' && <span className="inline-flex items-center gap-0.5 rounded bg-black/70 px-1 text-[0.5625rem] font-semibold text-white"><Film className="h-2.5 w-2.5" />{fmtDuration(m.durationSec)}</span>}
                {aspectLabel(m) && <span className="rounded bg-black/55 px-1 text-[0.5625rem] font-semibold text-white">{aspectLabel(m)}</span>}
              </span>
              {!disabled && (
                <span className="absolute inset-x-0 top-0 flex justify-end gap-0.5 p-1 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                  <GripVertical className="me-auto ms-6 mt-0.5 h-4 w-4 text-white drop-shadow" />
                  {i > 0 && <button type="button" onClick={() => move(i, i - 1)} className="rounded bg-black/60 p-0.5 text-white hover:bg-black/80" aria-label="Move left"><ArrowLeft className="h-3 w-3" /></button>}
                  {i < media.length - 1 && <button type="button" onClick={() => move(i, i + 1)} className="rounded bg-black/60 p-0.5 text-white hover:bg-black/80" aria-label="Move right"><ArrowRight className="h-3 w-3" /></button>}
                  <button type="button" onClick={() => onChange(media.filter((_, k) => k !== i))} className="rounded bg-rose-600/90 p-0.5 text-white hover:bg-rose-700" aria-label="Remove"><Trash2 className="h-3 w-3" /></button>
                </span>
              )}
            </li>
          ))}
          {!disabled && media.length < max && (
            <li>
              <button type="button" onClick={() => setPicker(true)} className="flex h-28 w-28 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 text-[0.75rem] font-semibold text-slate-500 hover:border-brand-400 hover:text-brand-700">
                <Plus className="h-5 w-5" />Add
              </button>
            </li>
          )}
        </ol>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-7 text-center">
          <UploadCloud className="h-7 w-7 text-brand-600" />
          <p className="text-[0.8125rem] font-semibold text-slate-800">Drop images or videos here</p>
          <p className="text-[0.75rem] text-slate-500">Or pick from the library. Up to {max} for a carousel.</p>
        </div>
      )}

      {!disabled && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="secondary" leftIcon={<FolderOpen className="h-4 w-4" />} onClick={() => setPicker(true)}>From library</Button>
          <Button type="button" size="sm" variant="secondary" leftIcon={<UploadCloud className="h-4 w-4" />} loading={up.busy} onClick={() => fileInput.current?.click()}>Upload</Button>
          {media.length > 1 && <span className="text-[0.75rem] text-slate-500">Drag to reorder, or focus a tile and use ← →</span>}
          <input ref={fileInput} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => { if (e.target.files?.length) up.upload(Array.from(e.target.files)); e.target.value = ''; }} />
        </div>
      )}
      <UploadList items={up.items} onDismiss={up.dismiss} />
      <MediaPicker open={picker} onClose={() => setPicker(false)} max={Math.max(1, max - media.length)} onPick={(m) => onChange([...media, ...m].slice(0, max))} />
    </div>
  );
}
