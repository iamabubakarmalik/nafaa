/**
 * Media detail: alt (+ Urdu), caption, credit, source, focal point, tags,
 * usage, replace file (same id) and delete (the API blocks it while used).
 */
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ExternalLink, RefreshCw, Trash2 } from 'lucide-react';
import { CMS_MEDIA_KINDS, MEDIA_LIMITS, patchMediaBodySchema, type AdminMedia, type CmsMediaKind, type PatchMediaBody } from '../contract/cms-contract';
import { errorMessage, formatPkt, zodFieldErrors, type FieldErrors } from '../dashboard/shared/cms-http';
import { Drawer, Field, btn, formatBytes, inputCls, selectCls, thumbUrl } from '../dashboard/shared/ui';
import { mediaApi, parseTags } from './media.api';

interface Form {
  alt: string;
  altUr: string;
  caption: string;
  credit: string;
  sourceUrl: string;
  tags: string;
  kind: CmsMediaKind;
  focalX: number | null;
  focalY: number | null;
}

function toForm(m: AdminMedia): Form {
  return {
    alt: m.alt,
    altUr: m.altTranslations?.ur ?? '',
    caption: m.caption ?? '',
    credit: m.credit ?? '',
    sourceUrl: m.sourceUrl ?? '',
    tags: m.tags.join(', '),
    kind: m.kind,
    focalX: m.focalX ?? null,
    focalY: m.focalY ?? null,
  };
}

export function MediaDetailDrawer({ media, onClose, onChanged }: { media: AdminMedia | null; onClose: () => void; onChanged?: (m: AdminMedia | null) => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    setForm(media ? toForm(media) : null);
    setErrors({});
  }, [media?.id, media?.publicId]);

  const usage = useQuery({ queryKey: ['cms-media-usage', media?.id], queryFn: () => mediaApi.usage(media!.id), enabled: !!media });

  const refresh = (m: AdminMedia | null) => {
    qc.invalidateQueries({ queryKey: ['cms-media'] });
    onChanged?.(m);
  };

  const save = useMutation({
    mutationFn: (body: PatchMediaBody) => mediaApi.update(media!.id, body),
    onSuccess: (m) => { toast.success('Media save ho gaya'); refresh(m); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const replace = useMutation({
    mutationFn: (file: File) => mediaApi.replace(media!.id, file),
    onSuccess: (m) => { toast.success('File badal di gayi'); refresh(m); },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => mediaApi.remove(media!.id),
    onSuccess: () => { toast.success('Media delete ho gaya'); refresh(null); onClose(); },
    onError: (e) => toast.error(errorMessage(e, 'Ye media kahin istemal ho raha hai, pehle wahan se hatayein')),
  });

  if (!media || !form) return null;
  const set = (p: Partial<Form>) => setForm({ ...form, ...p });

  const onSave = () => {
    const altTranslations = { ...(media.altTranslations ?? {}) };
    if (form.altUr.trim()) altTranslations.ur = form.altUr.trim();
    else delete altTranslations.ur;
    const body: PatchMediaBody = {
      alt: form.alt,
      altTranslations,
      caption: form.caption.trim() || null,
      credit: form.credit.trim() || null,
      sourceUrl: form.sourceUrl.trim() || null,
      tags: parseTags(form.tags),
      kind: form.kind,
      focalX: form.focalX,
      focalY: form.focalY,
    };
    const parsed = patchMediaBodySchema.safeParse(body);
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    save.mutate(parsed.data);
  };

  const isImage = media.mimeType.startsWith('image/');
  const used = usage.data ? usage.data.entries.length + usage.data.customers.length + usage.data.settings.length : 0;

  return (
    <Drawer
      open
      onClose={onClose}
      title={media.fileName}
      footer={
        <>
          <button className={btn.danger} disabled={remove.isPending || used > 0} title={used > 0 ? 'Istemal ho raha hai' : undefined} onClick={() => confirm('Ye media delete karein?') && remove.mutate()}>
            <Trash2 className="h-4 w-4" /> Delete
          </button>
          <label className={btn.secondary}>
            <RefreshCw className="h-4 w-4" /> {replace.isPending ? 'Badal rahe hain…' : 'File badlein'}
            <input type="file" className="hidden" accept={media.mimeType.split('/')[0] + '/*'} onChange={(e) => e.target.files?.[0] && replace.mutate(e.target.files[0])} />
          </label>
          <button className={btn.primary} onClick={onSave} disabled={save.isPending}>
            {save.isPending ? 'Save ho raha hai…' : 'Save'}
          </button>
        </>
      }
    >
      {isImage ? (
        <div>
          <div
            className="relative cursor-crosshair overflow-hidden rounded-xl bg-neutral-100"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              set({ focalX: +((e.clientX - r.left) / r.width).toFixed(3), focalY: +((e.clientY - r.top) / r.height).toFixed(3) });
            }}
          >
            <img src={thumbUrl(media.url, 900, 600).replace('c_fill,g_auto,', 'c_limit,')} alt={media.alt} className="block w-full" />
            {form.focalX != null && form.focalY != null && (
              <span className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-emerald-500/70 shadow" style={{ left: `${form.focalX * 100}%`, top: `${form.focalY * 100}%` }} />
            )}
          </div>
          <div className="mt-1 flex justify-between text-xs text-neutral-500">
            <span>Tasveer par click kar ke focal point chunein (crop me ye hissa nazar aaye ga)</span>
            {form.focalX != null && (
              <button className="text-emerald-700 hover:underline" onClick={() => set({ focalX: null, focalY: null })}>
                Hatayein
              </button>
            )}
          </div>
        </div>
      ) : (
        <a href={media.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-emerald-700 hover:underline">
          File kholein <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}

      <dl className="grid grid-cols-2 gap-2 rounded-xl bg-neutral-50 p-3 text-xs text-neutral-600">
        <dt>Size</dt>
        <dd>{media.width && media.height ? `${media.width}×${media.height} · ` : ''}{formatBytes(media.bytes)}</dd>
        <dt>Type</dt>
        <dd>{media.mimeType}</dd>
        <dt>Upload</dt>
        <dd>{formatPkt(media.createdAt)}</dd>
      </dl>

      <Field label="Alt text" required error={errors.alt} hint={`${form.alt.trim().length}/${MEDIA_LIMITS.altMax}`}>
        <input className={inputCls} value={form.alt} maxLength={MEDIA_LIMITS.altMax} onChange={(e) => set({ alt: e.target.value })} />
      </Field>
      <Field label="Alt text (Urdu)" hint="/ur pages ke liye, baad me" error={errors['altTranslations.ur']}>
        <input className={inputCls} dir="rtl" value={form.altUr} maxLength={MEDIA_LIMITS.altMax} onChange={(e) => set({ altUr: e.target.value })} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Kism">
          <select className={selectCls + ' w-full'} value={form.kind} onChange={(e) => set({ kind: e.target.value as CmsMediaKind })}>
            {CMS_MEDIA_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </Field>
        <Field label="Tags" error={errors['tags'] ?? Object.entries(errors).find(([k]) => k.startsWith('tags.'))?.[1]} hint="industry:pharmacy, feature:khata">
          <input className={inputCls} value={form.tags} onChange={(e) => set({ tags: e.target.value })} />
        </Field>
      </div>
      <Field label="Caption" error={errors.caption}>
        <input className={inputCls} value={form.caption} onChange={(e) => set({ caption: e.target.value })} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Credit" error={errors.credit}>
          <input className={inputCls} value={form.credit} onChange={(e) => set({ credit: e.target.value })} />
        </Field>
        <Field label="Source URL" error={errors.sourceUrl}>
          <input className={inputCls} value={form.sourceUrl} placeholder="https://…" onChange={(e) => set({ sourceUrl: e.target.value })} />
        </Field>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-neutral-900">Kahan istemal ho raha hai</h3>
        {usage.isLoading ? (
          <p className="text-sm text-neutral-500">Load ho raha hai…</p>
        ) : !used ? (
          <p className="text-sm text-neutral-500">Kahin istemal nahi ho raha.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {usage.data!.entries.map((u) => (
              <li key={`e-${u.id}-${u.where}`}>
                <span className="font-medium">{u.title}</span> <span className="text-neutral-500">{u.path} · {u.where}</span>
              </li>
            ))}
            {usage.data!.customers.map((u) => (
              <li key={`c-${u.id}-${u.where}`}>
                Customer: <span className="font-medium">{u.name}</span> <span className="text-neutral-500">· {u.where}</span>
              </li>
            ))}
            {usage.data!.settings.map((s) => <li key={`s-${s}`}>Settings: {s}</li>)}
          </ul>
        )}
      </div>
    </Drawer>
  );
}
