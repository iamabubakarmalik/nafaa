/**
 * Filterable media grid/list used by the library page and by MediaPicker.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Film, Grid3x3, Image as ImageIcon, Layers, List } from 'lucide-react';
import { FilterMenu, SearchField } from '@/design-system/components';
import { Pagination } from '@/ui';
import { CMS_MEDIA_KINDS, type AdminMedia, type CmsMediaKind } from '../contract/cms-contract';
import { formatPkt } from '../dashboard/shared/cms-http';
import { Chip, Spinner, Toggle, btn, formatBytes, inputCls, thumbUrl, useDebounced } from '../dashboard/shared/ui';
import { cn } from '../../../../lib/cn';
import { mediaApi } from './media.api';

export function MediaThumb({ media, className }: { media: Pick<AdminMedia, 'url' | 'alt' | 'mimeType' | 'kind'>; className?: string }) {
  if (media.mimeType.startsWith('image/')) {
    return <img src={thumbUrl(media.url)} alt={media.alt} loading="lazy" className={cn('h-full w-full object-cover', className)} />;
  }
  const Icon = media.kind === 'VIDEO' ? Film : media.kind === 'DOCUMENT' ? FileText : ImageIcon;
  return (
    <div className={cn('grid h-full w-full place-items-center bg-slate-100 text-slate-400', className)}>
      <Icon className="h-8 w-8" />
    </div>
  );
}

export function MediaBrowser({ onSelect, selectedId, fixedKinds, pageSize = 24, refreshKey }: {
  onSelect: (m: AdminMedia) => void;
  selectedId?: string | null;
  /** Limits the kind filter (e.g. only LOGO for customer logos). */
  fixedKinds?: readonly CmsMediaKind[];
  pageSize?: number;
  refreshKey?: number;
}) {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<CmsMediaKind | ''>(fixedKinds?.length === 1 ? fixedKinds[0]! : '');
  const [tag, setTag] = useState('');
  const [unused, setUnused] = useState(false);
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const dtag = useDebounced(tag);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cms-media', { dq, kind, dtag, unused, page, pageSize, refreshKey }],
    queryFn: () => mediaApi.list({ q: dq, kind, tag: dtag, unused, page, limit: pageSize }),
  });
  const kinds = fixedKinds ?? CMS_MEDIA_KINDS;
  // With several allowed kinds and no kind filter, hide the other kinds client-side.
  const items = (data?.items ?? []).filter((m) => !fixedKinds || fixedKinds.includes(m.kind));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[14rem] flex-1"><SearchField value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search alt text or file name" /></div>
        <FilterMenu icon={Layers} label="Kind" value={kind} active={kind !== ''} onChange={(v) => { setKind(v as CmsMediaKind | ''); setPage(1); }}
          options={[...(kinds.length > 1 ? [{ value: '', label: 'All kinds' }] : []), ...kinds.map((k) => ({ value: k as string, label: k }))]} />
        <input className={cn(inputCls, 'w-44')} value={tag} placeholder="Tag (industry:…)" aria-label="Tag" onChange={(e) => { setTag(e.target.value); setPage(1); }} />
        <Toggle checked={unused} onChange={(v) => { setUnused(v); setPage(1); }} label="Unused only" />
        <div className="ml-auto flex gap-1">
          <button className={cn(btn.icon, view === 'grid' && 'bg-slate-100 text-slate-900')} onClick={() => setView('grid')} aria-label="Grid">
            <Grid3x3 className="h-4 w-4" />
          </button>
          <button className={cn(btn.icon, view === 'list' && 'bg-slate-100 text-slate-900')} onClick={() => setView('list')} aria-label="List">
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">Media did not load. Try again in a moment.</p>
      ) : !items.length ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No media found.</p>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {items.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect(m)}
              className={cn(
                'group overflow-hidden rounded-xl border bg-white text-left shadow-sm transition hover:border-brand-400',
                selectedId === m.id ? 'border-brand-500 ring-2 ring-brand-500/30' : 'border-slate-200',
              )}
            >
              <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                <MediaThumb media={m} />
              </div>
              <div className="space-y-1 p-2">
                <p className="line-clamp-2 text-xs text-slate-700">{m.alt}</p>
                <div className="flex flex-wrap gap-1">
                  <Chip>{m.kind}</Chip>
                  {m.tags.slice(0, 2).map((t) => <Chip key={t} tone="blue">{t}</Chip>)}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {items.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect(m)}
              className={cn('flex w-full items-center gap-3 p-2 text-left hover:bg-slate-50', selectedId === m.id && 'bg-brand-50')}
            >
              <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md bg-slate-100">
                <MediaThumb media={m} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{m.alt}</p>
                <p className="truncate text-xs text-slate-500">{m.fileName}</p>
              </div>
              <span className="hidden text-xs text-slate-500 sm:block">{m.width && m.height ? `${m.width}×${m.height}` : ''}</span>
              <span className="hidden text-xs text-slate-500 sm:block">{formatBytes(m.bytes)}</span>
              <Chip>{m.kind}</Chip>
              <span className="hidden text-xs text-slate-500 md:block">{formatPkt(m.createdAt, false)}</span>
            </button>
          ))}
        </div>
      )}
      {data?.meta && data.meta.total > 0 && <Pagination page={page} limit={pageSize} total={data.meta.total} onPage={setPage} />}
    </div>
  );
}
