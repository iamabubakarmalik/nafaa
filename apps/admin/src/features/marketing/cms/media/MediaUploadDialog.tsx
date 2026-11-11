/**
 * Multi-file upload. Every file needs alt text (5-250 chars) before anything
 * is sent; screenshots also ask for industry and feature tags. Files upload
 * one by one so a duplicate or a bad file does not stop the rest.
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { UploadCloud, Trash2 } from 'lucide-react';
import { CMS_MEDIA_KINDS, MEDIA_LIMITS, altTextSchema, mediaTagSchema, type AdminMedia, type CmsMediaKind } from '../contract/cms-contract';
import { errorDuplicateOf, errorMessage, errorStatus } from '../dashboard/shared/cms-http';
import { Field, Modal, btn, formatBytes, inputCls, selectCls } from '../dashboard/shared/ui';
import { mediaApi, parseTags } from './media.api';

interface Draft {
  key: string;
  file: File;
  preview: string | null;
  alt: string;
  kind: CmsMediaKind;
  caption: string;
  credit: string;
  tags: string;
  industryTag: string;
  featureTag: string;
  state: 'idle' | 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
}

const ACCEPT = 'image/*,video/mp4,video/webm,application/pdf';

function guessKind(file: File): CmsMediaKind {
  if (file.type.startsWith('video/')) return 'VIDEO';
  if (file.type === 'application/pdf') return 'DOCUMENT';
  if (/logo/i.test(file.name)) return 'LOGO';
  if (/screen|shot/i.test(file.name)) return 'SCREENSHOT';
  return 'IMAGE';
}

function sizeError(file: File, kind: CmsMediaKind): string | null {
  const max = kind === 'DOCUMENT' || kind === 'VIDEO' ? MEDIA_LIMITS.documentMaxBytes : MEDIA_LIMITS.imageMaxBytes;
  return file.size > max ? `File is too large (limit ${formatBytes(max)})` : null;
}

function draftTags(d: Draft): string[] {
  const tags = parseTags(d.tags);
  if (d.industryTag.trim()) tags.push(`industry:${d.industryTag.trim().toLowerCase()}`);
  if (d.featureTag.trim()) tags.push(`feature:${d.featureTag.trim().toLowerCase()}`);
  return Array.from(new Set(tags));
}

function draftError(d: Draft): string | null {
  if (!altTextSchema.safeParse(d.alt).success) return `Alt text is required (${MEDIA_LIMITS.altMin}-${MEDIA_LIMITS.altMax} characters)`;
  const bad = draftTags(d).find((t) => !mediaTagSchema.safeParse(t).success);
  if (bad) return `Tag "${bad}" is not valid (use a-z, 0-9, : _ -)`;
  return sizeError(d.file, d.kind);
}

export function MediaUploadDialog({ open, onClose, onUploaded, defaultKind }: {
  open: boolean;
  onClose: () => void;
  onUploaded?: (media: AdminMedia) => void;
  defaultKind?: CmsMediaKind;
}) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  const addFiles = (files: FileList | File[]) => {
    const next = Array.from(files).map<Draft>((file, i) => ({
      key: `${Date.now()}-${i}-${file.name}`,
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      alt: '',
      kind: defaultKind ?? guessKind(file),
      caption: '',
      credit: '',
      tags: '',
      industryTag: '',
      featureTag: '',
      state: 'idle',
      progress: 0,
    }));
    setDrafts((d) => [...d, ...next]);
  };

  const patch = (key: string, p: Partial<Draft>) => setDrafts((list) => list.map((d) => (d.key === key ? { ...d, ...p } : d)));

  const close = () => {
    if (busy) return;
    drafts.forEach((d) => d.preview && URL.revokeObjectURL(d.preview));
    setDrafts([]);
    onClose();
  };

  const pending = drafts.filter((d) => d.state !== 'done');
  const blocking = pending.map(draftError).filter(Boolean);

  const uploadAll = async () => {
    if (blocking.length) {
      toast.error('Every file needs alt text and valid tags');
      return;
    }
    setBusy(true);
    let ok = 0;
    for (const d of pending) {
      patch(d.key, { state: 'uploading', progress: 0, error: undefined });
      try {
        const media = await mediaApi.upload(
          { file: d.file, alt: d.alt, kind: d.kind, caption: d.caption, credit: d.credit, tags: draftTags(d) },
          (pct) => patch(d.key, { progress: pct }),
        );
        patch(d.key, { state: 'done', progress: 100 });
        onUploaded?.(media);
        ok++;
      } catch (e) {
        const dup = errorDuplicateOf<AdminMedia>(e);
        const msg = errorStatus(e) === 409 ? (dup ? `This file is already in the library: "${dup.alt}"` : errorMessage(e, 'This file is already in the library')) : errorMessage(e);
        patch(d.key, { state: 'error', error: msg });
      }
    }
    setBusy(false);
    if (ok) toast.success(`${ok} file(s) uploaded`);
  };

  return (
    <Modal
      open={open}
      onClose={close}
      wide
      title="Media upload"
      footer={
        <>
          <button className={btn.ghost} onClick={close} disabled={busy}>
            Close
          </button>
          <button className={btn.primary} onClick={uploadAll} disabled={busy || !pending.length}>
            <UploadCloud className="h-4 w-4" /> {busy ? 'Uploading…' : `Upload (${pending.length})`}
          </button>
        </>
      }
    >
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center text-sm ${dragging ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-slate-50'}`}
      >
        <UploadCloud className="h-6 w-6 text-slate-400" />
        <p className="text-slate-600">Drop files here or</p>
        <label className={btn.secondary}>
          choose files
          <input type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => e.target.files && addFiles(e.target.files)} />
        </label>
        <p className="text-xs text-slate-500">Images {formatBytes(MEDIA_LIMITS.imageMaxBytes)} tak, PDF/video {formatBytes(MEDIA_LIMITS.documentMaxBytes)} tak</p>
      </div>

      {drafts.map((d) => {
        const err = d.state === 'error' ? d.error : d.alt || d.state !== 'idle' ? draftError(d) : null;
        return (
          <div key={d.key} className="flex gap-4 rounded-xl border border-slate-200 p-3">
            <div className="h-24 w-32 shrink-0 overflow-hidden rounded-lg bg-slate-100">
              {d.preview ? <img src={d.preview} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-xs text-slate-500">{d.kind}</div>}
            </div>
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <Field label="Alt text" required className="sm:col-span-2" hint="Describe what the picture shows in plain words (for screen readers and Google)">
                <input className={inputCls} value={d.alt} maxLength={MEDIA_LIMITS.altMax} disabled={d.state === 'done'} onChange={(e) => patch(d.key, { alt: e.target.value })} />
              </Field>
              <Field label="Kism">
                <select className={selectCls + ' w-full'} value={d.kind} disabled={d.state === 'done'} onChange={(e) => patch(d.key, { kind: e.target.value as CmsMediaKind })}>
                  {CMS_MEDIA_KINDS.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </Field>
              <Field label="Tags" hint="Separate with commas, for example: hero, pos">
                <input className={inputCls} value={d.tags} disabled={d.state === 'done'} onChange={(e) => patch(d.key, { tags: e.target.value })} />
              </Field>
              {d.kind === 'SCREENSHOT' && (
                <>
                  <Field label="Industry" hint="For example: kiryana, pharmacy">
                    <input className={inputCls} value={d.industryTag} disabled={d.state === 'done'} onChange={(e) => patch(d.key, { industryTag: e.target.value })} />
                  </Field>
                  <Field label="Feature" hint="For example: khata, pos, fbr">
                    <input className={inputCls} value={d.featureTag} disabled={d.state === 'done'} onChange={(e) => patch(d.key, { featureTag: e.target.value })} />
                  </Field>
                </>
              )}
              <Field label="Caption">
                <input className={inputCls} value={d.caption} disabled={d.state === 'done'} onChange={(e) => patch(d.key, { caption: e.target.value })} />
              </Field>
              <Field label="Credit">
                <input className={inputCls} value={d.credit} disabled={d.state === 'done'} onChange={(e) => patch(d.key, { credit: e.target.value })} />
              </Field>
              <div className="flex items-center justify-between text-xs sm:col-span-2">
                <span className="truncate text-slate-500">
                  {d.file.name} · {formatBytes(d.file.size)}
                  {d.state === 'uploading' && ` · ${d.progress}%`}
                  {d.state === 'done' && <span className="ml-1 font-medium text-brand-700">· Uploaded</span>}
                </span>
                {err && <span className="text-rose-600">{err}</span>}
                {d.state === 'idle' || d.state === 'error' ? (
                  <button className={btn.icon} onClick={() => setDrafts((l) => l.filter((x) => x.key !== d.key))} aria-label="Remove">
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </Modal>
  );
}
