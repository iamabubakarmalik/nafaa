/**
 * Media library (/social/media): every image and video Nafaa Social uses.
 * Upload by dropping files anywhere on the grid, filter by kind, folder and
 * tag, edit titles/tags/folders, see which posts use a file, and delete
 * files nothing uses.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, Download, Film, Folder, ImageIcon, Tag, Trash2, UploadCloud } from 'lucide-react';
import { Button, Card, Drawer, EmptyState, FilterBar, FilterMenu, Input, PageHero, PageShell, SearchField, Segmented, Skeleton, confirmDialog, heroPrimaryButton } from '@/design-system/components';
import { brandSocialApi, type SocialAsset } from '@/api/admin-brand-social.api';
import { useCan } from '@/lib/access';
import { cn } from '@/lib/cn';
import { apiError } from '@/lib/errors';
import { num } from '@/lib/format';
import { copyText, downloadUrl, fmtBytes, fmtDuration, parseTags } from '../lib/post';
import { KEYS, useInvalidate } from '../lib/queries';
import { fmtDateTime } from '../lib/time';
import { useAssetUpload } from '../lib/useAssetUpload';
import { UploadDropzone, UploadList } from '../components/UploadDropzone';
import { LoadError, PostStatusBadge } from '../components/SocialUi';

export default function MediaPage() {
  const can = useCan();
  const canEdit = can('social.edit');
  const invalidate = useInvalidate();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [kind, setKind] = useState<'all' | 'image' | 'video'>('all');
  const [folder, setFolder] = useState('ALL');
  const [tag, setTag] = useState('ALL');
  const [openId, setOpenId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 300); return () => clearTimeout(t); }, [search]);

  const filters = { search: debounced || undefined, kind: kind === 'all' ? undefined : kind, folder: folder === 'ALL' ? undefined : folder };
  const q = useQuery({ queryKey: KEYS.assets(filters), queryFn: () => brandSocialApi.assets(filters), placeholderData: (p) => p });
  const up = useAssetUpload({ folder: folder === 'ALL' ? null : folder, onUploaded: () => invalidate() });
  const assets = useMemo(() => (q.data?.assets ?? []).filter((a) => tag === 'ALL' || a.tags.includes(tag)), [q.data, tag]);
  const open = assets.find((a) => a.id === openId) ?? q.data?.assets.find((a) => a.id === openId) ?? null;
  const [fileOver, setFileOver] = useState(false);

  return (
    <PageShell>
      <PageHero
        title="Media library"
        busy={q.isFetching || up.busy}
        loading={q.isLoading}
        actions={canEdit && <button type="button" className={heroPrimaryButton} onClick={() => setShowUpload((v) => !v)}><UploadCloud className="h-4 w-4" />Upload</button>}
        stats={q.data ? [
          { label: 'Files', value: num(q.data.assets.length) },
          { label: 'Images', value: num(q.data.assets.filter((a) => a.kind === 'image').length) },
          { label: 'Videos', value: num(q.data.assets.filter((a) => a.kind === 'video').length) },
          { label: 'Not used yet', value: num(q.data.assets.filter((a) => !a.usedIn.length).length) },
        ] : undefined}
      />

      {canEdit && (showUpload || up.items.length > 0) && (
        <Card>
          <UploadDropzone onFiles={up.upload} busy={up.busy} />
          {up.items.length > 0 && <div className="mt-3"><UploadList items={up.items} onDismiss={up.dismiss} /></div>}
        </Card>
      )}

      <FilterBar search={<SearchField value={search} onChange={setSearch} placeholder="Search title or tag" />}>
        <Segmented value={kind} onChange={setKind} label="Kind" items={[{ value: 'all', label: 'All' }, { value: 'image', label: 'Images' }, { value: 'video', label: 'Videos' }]} />
        <FilterMenu icon={Folder} label="Folder" value={folder} active={folder !== 'ALL'} onChange={setFolder}
          options={[{ value: 'ALL', label: 'Every folder' }, ...(q.data?.folders ?? []).map((f) => ({ value: f, label: f }))]} />
        <FilterMenu icon={Tag} label="Tag" value={tag} active={tag !== 'ALL'} onChange={setTag} align="right"
          options={[{ value: 'ALL', label: 'Every tag' }, ...(q.data?.tags ?? []).map((t) => ({ value: t, label: t }))]} />
      </FilterBar>

      {q.error ? <LoadError error={q.error} onRetry={() => q.refetch()} what="the media library" /> : q.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="aspect-square rounded-2xl" />)}</div>
      ) : (
        <div
          onDragOver={(e) => { if (canEdit && e.dataTransfer.types.includes('Files')) { e.preventDefault(); setFileOver(true); } }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setFileOver(false); }}
          onDrop={(e) => { if (e.dataTransfer.files.length) { e.preventDefault(); setFileOver(false); up.upload(Array.from(e.dataTransfer.files)); } }}
          className={cn('rounded-2xl transition', fileOver && 'bg-brand-50 ring-2 ring-dashed ring-brand-400')}
        >
          {!assets.length ? (
            <Card><EmptyState icon={<ImageIcon className="h-6 w-6" />} title={debounced || folder !== 'ALL' || tag !== 'ALL' || kind !== 'all' ? 'Nothing matches' : 'No media yet'}
              description={canEdit ? 'Drop images and videos here, or use Upload. Content packs add their files here too.' : 'Files appear here when the team uploads them.'}
              action={canEdit && <Button size="sm" leftIcon={<UploadCloud className="h-4 w-4" />} onClick={() => setShowUpload(true)}>Upload</Button>} /></Card>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {assets.map((a) => (
                <button key={a.id} type="button" onClick={() => setOpenId(a.id)} className="group overflow-hidden rounded-2xl bg-white text-start ring-1 ring-slate-200 transition hover:ring-brand-400">
                  <div className="relative aspect-square bg-slate-100">
                    {a.kind === 'video' && !a.thumbUrl
                      ? <video src={a.url} muted preload="metadata" className="h-full w-full object-cover" />
                      : <img src={a.kind === 'video' ? a.thumbUrl! : a.url} alt={a.title} loading="lazy" className="h-full w-full object-cover" />}
                    {a.kind === 'video' && <span className="absolute bottom-1.5 start-1.5 inline-flex items-center gap-1 rounded bg-black/65 px-1.5 py-0.5 text-[0.625rem] font-semibold text-white"><Film className="h-3 w-3" />{fmtDuration(a.durationSec)}</span>}
                    <span className={cn('absolute end-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[0.625rem] font-semibold', a.usedIn.length ? 'bg-success-600 text-white' : 'bg-white/90 text-slate-600')}>
                      {a.usedIn.length ? `Used ${a.usedIn.length}×` : 'Unused'}
                    </span>
                  </div>
                  <div className="px-2.5 py-2">
                    <p className="truncate text-[0.75rem] font-semibold text-slate-800">{a.title || 'Untitled'}</p>
                    <p className="truncate text-[0.6875rem] text-slate-500">{a.width && a.height ? `${a.width}×${a.height}` : a.kind}{a.bytes ? ` · ${fmtBytes(a.bytes)}` : ''}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <AssetDrawer asset={open} onClose={() => setOpenId(null)} canEdit={canEdit} folders={q.data?.folders ?? []} />
    </PageShell>
  );
}

function AssetDrawer({ asset, onClose, canEdit, folders }: { asset: SocialAsset | null; onClose: () => void; canEdit: boolean; folders: string[] }) {
  const invalidate = useInvalidate();
  const [form, setForm] = useState({ title: '', folder: '', tags: '' });
  useEffect(() => { if (asset) setForm({ title: asset.title, folder: asset.folder ?? '', tags: asset.tags.join(', ') }); }, [asset?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = useMutation({
    mutationFn: () => brandSocialApi.updateAsset(asset!.id, { title: form.title.trim(), folder: form.folder.trim() || null, tags: parseTags(form.tags).map((t) => t.slice(1)) }),
    onSuccess: () => { toast.success('Saved'); invalidate(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const remove = useMutation({
    mutationFn: async () => {
      const ok = await confirmDialog({ title: 'Delete this file?', text: 'It is removed from the library for good.', yes: 'Delete', danger: true });
      return ok ? brandSocialApi.deleteAsset(asset!.id).then(() => true) : false;
    },
    onSuccess: (ok) => { if (ok) { toast.success('Deleted'); invalidate(); onClose(); } },
    onError: (e) => toast.error(apiError(e)),
  });
  const a = asset;
  return (
    <Drawer open={!!a} onClose={onClose} title={a?.title || 'File'} description={a ? `${a.kind === 'video' ? 'Video' : 'Image'} · added ${fmtDateTime(a.createdAt)}` : undefined} size="lg"
      footer={a && canEdit && (
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="text-rose-600" disabled={a.usedIn.length > 0} title={a.usedIn.length ? 'Used by posts; remove it from them first' : undefined} loading={remove.isPending} leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => remove.mutate()}>Delete</Button>
          <Button className="ms-auto" loading={save.isPending} onClick={() => save.mutate()}>Save</Button>
        </div>
      )}>
      {a && (
        <div className="space-y-4 p-4 sm:p-5">
          <div className="overflow-hidden rounded-2xl bg-black">
            {a.kind === 'video' ? <video src={a.url} poster={a.thumbUrl ?? undefined} controls className="max-h-[50vh] w-full" /> : <img src={a.url} alt={a.title} className="max-h-[50vh] w-full object-contain" />}
          </div>
          <dl className="grid grid-cols-3 gap-3 text-[0.8125rem]">
            <div><dt className="text-slate-500">Size</dt><dd className="font-medium text-slate-900">{a.width && a.height ? `${a.width}×${a.height}` : '—'}</dd></div>
            <div><dt className="text-slate-500">File</dt><dd className="font-medium text-slate-900">{fmtBytes(a.bytes)}</dd></div>
            <div><dt className="text-slate-500">{a.kind === 'video' ? 'Length' : 'Type'}</dt><dd className="font-medium text-slate-900">{a.kind === 'video' ? fmtDuration(a.durationSec) || '—' : a.mime?.split('/')[1]?.toUpperCase() ?? '—'}</dd></div>
          </dl>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" leftIcon={<Copy className="h-4 w-4" />} onClick={async () => { if (await copyText(a.url)) toast.success('Link copied'); }}>Copy link</Button>
            <Button size="sm" variant="secondary" leftIcon={<Download className="h-4 w-4" />} onClick={() => downloadUrl(a.url)}>Download</Button>
          </div>
          <div className="space-y-3">
            <Input label="Title" value={form.title} disabled={!canEdit} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input label="Folder" value={form.folder} disabled={!canEdit} list="bs-folders" placeholder="e.g. November reels" onChange={(e) => setForm({ ...form, folder: e.target.value })} />
            <datalist id="bs-folders">{folders.map((f) => <option key={f} value={f} />)}</datalist>
            <Input label="Tags" hint="Separate with commas or spaces" value={form.tags} disabled={!canEdit} placeholder="khata, grocery, reel" onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          </div>
          <div>
            <p className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Used in</p>
            {!a.usedIn.length ? <p className="text-[0.8125rem] text-slate-500">No post uses this file yet.</p> : (
              <ul className="space-y-1">
                {a.usedIn.map((p) => (
                  <li key={p.id}><Link to={`/social/posts/${p.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"><span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium text-slate-800">{p.title}</span><PostStatusBadge status={p.status} size="xs" /></Link></li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
