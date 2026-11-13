/**
 * Media library picker for the composer: search, filter by kind, pick
 * several files in order, or upload new ones straight into the library.
 */

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Film, ImageIcon, Search } from 'lucide-react';
import { Button, EmptyState, Modal, Segmented, Skeleton } from '@/design-system/components';
import { brandSocialApi, type PostMedia, type SocialAsset } from '@/api/admin-brand-social.api';
import { cn } from '@/lib/cn';
import { KEYS, useInvalidate } from '../lib/queries';
import { useAssetUpload } from '../lib/useAssetUpload';
import { fmtDuration } from '../lib/post';
import { UploadDropzone, UploadList } from './UploadDropzone';
import { LoadError } from './SocialUi';

export const assetToMedia = (a: SocialAsset): PostMedia => ({
  assetId: a.id, url: a.url, thumbUrl: a.thumbUrl, kind: a.kind, width: a.width, height: a.height, durationSec: a.durationSec, alt: a.title || null,
});

export function MediaPicker({ open, onClose, onPick, max = 10 }: { open: boolean; onClose: () => void; onPick: (media: PostMedia[]) => void; max?: number }) {
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<'all' | 'image' | 'video'>('all');
  const [picked, setPicked] = useState<SocialAsset[]>([]);
  const invalidate = useInvalidate();
  const filters = { search: search.trim() || undefined, kind: kind === 'all' ? undefined : kind };
  const q = useQuery({ queryKey: KEYS.assets(filters), queryFn: () => brandSocialApi.assets(filters), enabled: open, placeholderData: (p) => p });
  const list = q.data?.assets ?? [];
  const up = useAssetUpload({ onUploaded: (assets) => { invalidate(); setPicked((prev) => [...prev, ...assets].slice(0, max)); } });

  useEffect(() => { if (open) { setPicked([]); setSearch(''); } }, [open]);

  const toggle = (a: SocialAsset) => setPicked((prev) => (prev.some((x) => x.id === a.id) ? prev.filter((x) => x.id !== a.id) : prev.length >= max ? prev : [...prev, a]));

  return (
    <Modal open={open} onClose={onClose} size="xl" title="Media library" description="Pick in the order they should appear. Uploads land in the library too."
      footer={<>
        <span className="me-auto text-[0.8125rem] text-slate-500">{picked.length ? `${picked.length} selected` : `Pick up to ${max}`}</span>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button disabled={!picked.length} onClick={() => { onPick(picked.map(assetToMedia)); onClose(); }}>Add {picked.length || ''}</Button>
      </>}>
      <div className="space-y-3">
        <UploadDropzone compact busy={up.busy} onFiles={up.upload} />
        <UploadList items={up.items} onDismiss={up.dismiss} />
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by title or tag" className="h-9 w-full rounded-lg border border-slate-300 bg-white ps-9 pe-3 text-[0.8125rem] text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
          </div>
          <Segmented value={kind} onChange={setKind} items={[{ value: 'all', label: 'All' }, { value: 'image', label: 'Images' }, { value: 'video', label: 'Videos' }]} label="Kind" />
        </div>
        {q.error ? <LoadError error={q.error} onRetry={() => q.refetch()} what="the library" />
          : q.isLoading ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}</div>
          ) : !list.length ? (
            <EmptyState icon={<ImageIcon className="h-6 w-6" />} title={search ? 'Nothing matches' : 'The library is empty'} description={search ? 'Try another word.' : 'Upload images or videos above. They stay in the library for every post.'} />
          ) : (
            <div className="grid max-h-[46vh] grid-cols-3 gap-2 overflow-y-auto p-0.5 sm:grid-cols-5">
              {list.map((a) => {
                const idx = picked.findIndex((x) => x.id === a.id);
                return (
                  <button key={a.id} type="button" onClick={() => toggle(a)} title={a.title ?? undefined}
                    className={cn('group relative aspect-square overflow-hidden rounded-xl bg-slate-100 ring-2 transition', idx >= 0 ? 'ring-brand-500' : 'ring-transparent hover:ring-slate-300')}>
                    {a.kind === 'video' && !a.thumbUrl
                      ? <video src={a.url} muted preload="metadata" className="h-full w-full object-cover" />
                      : <img src={a.kind === 'video' ? a.thumbUrl! : a.url} alt={a.title ?? ''} loading="lazy" className="h-full w-full object-cover" />}
                    {a.kind === 'video' && (
                      <span className="absolute bottom-1 start-1 inline-flex items-center gap-1 rounded bg-black/65 px-1.5 py-0.5 text-[0.625rem] font-semibold text-white"><Film className="h-3 w-3" />{fmtDuration(a.durationSec)}</span>
                    )}
                    {a.width && a.height && <span className="absolute bottom-1 end-1 rounded bg-black/55 px-1 text-[0.5625rem] font-medium text-white opacity-0 group-hover:opacity-100">{a.width}×{a.height}</span>}
                    <span className={cn('absolute end-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-[0.6875rem] font-bold ring-2 ring-white', idx >= 0 ? 'bg-brand-600 text-white' : 'bg-black/25 text-transparent group-hover:bg-black/40')}>
                      {idx >= 0 ? idx + 1 : <Check className="h-3.5 w-3.5 text-white/80" />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
      </div>
    </Modal>
  );
}
