/**
 * Filterable media grid/list used by the library page and by MediaPicker.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Film, Grid3x3, Image as ImageIcon, List } from 'lucide-react';
import { CMS_MEDIA_KINDS, type AdminMedia, type CmsMediaKind } from '../contract/cms-contract';
import { formatPkt } from '../dashboard/shared/cms-http';
import { Chip, Pager, SearchInput, Spinner, Toggle, btn, formatBytes, inputCls, selectCls, thumbUrl, useDebounced } from '../dashboard/shared/ui';
import { cn } from '../../../../lib/cn';
import { mediaApi } from './media.api';

export function MediaThumb({ media, className }: { media: Pick<AdminMedia, 'url' | 'alt' | 'mimeType' | 'kind'>; className?: string }) {
  if (media.mimeType.startsWith('image/')) {
    return <img src={thumbUrl(media.url)} alt={media.alt} loading="lazy" className={cn('h-full w-full object-cover', className)} />;
  }
  const Icon = media.kind === 'VIDEO' ? Film : media.kind === 'DOCUMENT' ? FileText : ImageIcon;
  return (
    <div className={cn('grid h-full w-full place-items-center bg-neutral-100 text-neutral-400', className)}>
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
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Alt text ya file ka naam…" />
        <select className={selectCls} value={kind} onChange={(e) => { setKind(e.target.value as CmsMediaKind | ''); setPage(1); }}>
          {kinds.length > 1 && <option value="">Sab kism</option>}
          {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <input className={cn(inputCls, 'w-44')} value={tag} placeholder="Tag (industry:…)" onChange={(e) => { setTag(e.target.value); setPage(1); }} />
        <Toggle checked={unused} onChange={(v) => { setUnused(v); setPage(1); }} label="Sirf ghair-istemal" />
        <div className="ml-auto flex gap-1">
          <button className={cn(btn.icon, view === 'grid' && 'bg-neutral-100 text-neutral-900')} onClick={() => setView('grid')} aria-label="Grid">
            <Grid3x3 className="h-4 w-4" />
          </button>
          <button className={cn(btn.icon, view === 'list' && 'bg-neutral-100 text-neutral-900')} onClick={() => setView('list')} aria-label="List">
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">Media load nahi hua. API chal rahi hai?</p>
      ) : !items.length ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">Koi media nahi mila.</p>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {items.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect(m)}
              className={cn(
                'group overflow-hidden rounded-xl border bg-white text-left shadow-sm transition hover:border-emerald-400',
                selectedId === m.id ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-neutral-200',
              )}
            >
              <div className="aspect-[4/3] overflow-hidden bg-neutral-100">
                <MediaThumb media={m} />
              </div>
              <div className="space-y-1 p-2">
                <p className="line-clamp-2 text-xs text-neutral-700">{m.alt}</p>
                <div className="flex flex-wrap gap-1">
                  <Chip>{m.kind}</Chip>
                  {m.tags.slice(0, 2).map((t) => <Chip key={t} tone="blue">{t}</Chip>)}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {items.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect(m)}
              className={cn('flex w-full items-center gap-3 p-2 text-left hover:bg-neutral-50', selectedId === m.id && 'bg-emerald-50')}
            >
              <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                <MediaThumb media={m} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-900">{m.alt}</p>
                <p className="truncate text-xs text-neutral-500">{m.fileName}</p>
              </div>
              <span className="hidden text-xs text-neutral-500 sm:block">{m.width && m.height ? `${m.width}×${m.height}` : ''}</span>
              <span className="hidden text-xs text-neutral-500 sm:block">{formatBytes(m.bytes)}</span>
              <Chip>{m.kind}</Chip>
              <span className="hidden text-xs text-neutral-500 md:block">{formatPkt(m.createdAt, false)}</span>
            </button>
          ))}
        </div>
      )}
      <Pager meta={data?.meta} onPage={setPage} />
    </div>
  );
}
