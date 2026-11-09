/**
 * "Post karein" sheet: everything needed to post by hand in one place.
 * Copy the caption (with hashtags), download the images, copy the tagged
 * product link for each platform, open the platform, then mark the post
 * posted and paste its link. For a connected Facebook page / Instagram
 * account, Nafaa can post by itself (MetaPublish.tsx).
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Copy, Download, ExternalLink, Link2, Undo2 } from 'lucide-react';
import { Button, Input, Modal } from '@/design-system/components';
import { t } from '@core/i18n';
import { apiErrorMessage } from '@integrations/online-orders/api/online-orders.api';
import { socialApi, type SocialPlatform, type SocialPost } from './social.api';
import { PLATFORM_META, PlatformMark, fullCaption, openPlatform, whenLabel } from './platforms';
import { AutoPostNote, MetaPublishRow } from './MetaPublish';

async function copy(text: string, done: string) {
  try { await navigator.clipboard.writeText(text); toast.success(done); } catch { toast.error(t('Copy nahi hua — text khud select karein')); }
}

/** Downloads an image; opens it in a new tab when the browser blocks the download. */
async function download(url: string, name: string) {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  } catch {
    window.open(url, '_blank', 'noopener');
  }
}

export function PostNowSheet({ post, onClose, onEdit }: { post: SocialPost; onClose: () => void; onEdit?: () => void }) {
  const qc = useQueryClient();
  const [urls, setUrls] = useState<Partial<Record<SocialPlatform, string>>>(post.postUrls ?? {});
  const text = fullCaption(post.caption, post.hashtags);
  const done = post.status === 'POSTED';

  const mark = useMutation({
    mutationFn: (undo?: boolean) => socialApi.posted(post.id, undo ? { undo: true } : { urls }),
    onSuccess: (_r, undo) => {
      qc.invalidateQueries({ queryKey: ['social'] });
      toast.success(undo ? t('Wapas "Ready" kar di') : t('Post ho gayi — shabash!'));
      if (!undo) onClose();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <Modal open onClose={onClose} size="lg" title={t('Post karein')} description={`${post.title || t('Social post')} · ${whenLabel(post.scheduledAt)}`}
      footer={<div className="flex w-full flex-wrap items-center justify-between gap-2">
        {onEdit ? <Button variant="ghost" onClick={onEdit}>{t('Badlein')}</Button> : <span />}
        {done
          ? <Button variant="secondary" loading={mark.isPending} onClick={() => mark.mutate(true)} leftIcon={<Undo2 className="h-4 w-4" />}>{t('Posted hataein')}</Button>
          : <Button variant="success" loading={mark.isPending} onClick={() => mark.mutate(false)} leftIcon={<CheckCircle2 className="h-4 w-4" />}>{t('Post ho gayi')}</Button>}
      </div>}>
      <div className="space-y-4">
        <ol className="grid gap-1.5 text-[0.75rem] text-slate-500 sm:grid-cols-4">
          {[t('1. Caption copy'), t('2. Photo download'), t('3. App kholein, post karein'), t('4. "Post ho gayi" dabayein')].map((s) => (
            <li key={s} className="rounded-lg bg-slate-50 px-2 py-1.5 ring-1 ring-slate-200/70">{s}</li>
          ))}
        </ol>

        <section className="rounded-2xl bg-white p-3 ring-1 ring-slate-200">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[0.8125rem] font-semibold text-slate-900">{t('Caption')}</p>
            <Button size="xs" variant="secondary" disabled={!text} onClick={() => copy(text, t('Caption copy ho gaya'))} leftIcon={<Copy className="h-3.5 w-3.5" />}>{t('Copy')}</Button>
          </div>
          <p className="max-h-48 overflow-auto whitespace-pre-wrap text-[0.8125rem] leading-relaxed text-slate-700">{text || t('Caption abhi khali hai')}</p>
        </section>

        {post.media.length > 0 && (
          <section>
            <p className="mb-2 text-[0.8125rem] font-semibold text-slate-900">{t('Photos')}</p>
            <div className="flex flex-wrap gap-2">
              {post.media.map((m, i) => (
                <button key={m.url} type="button" onClick={() => download(m.url, `post-${post.code}-${i + 1}.png`)} title={t('Download')}
                  className="group relative h-24 w-24 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
                  <img src={m.url} alt="" className="h-full w-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-slate-900/0 text-white opacity-0 transition group-hover:bg-slate-900/40 group-hover:opacity-100"><Download className="h-5 w-5" /></span>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-2">
          <p className="text-[0.8125rem] font-semibold text-slate-900">{t('Platform')}</p>
          {post.platforms.map((p) => {
            const links = post.taggedLinks[p] ?? [];
            return (
              <div key={p} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
                <div className="flex flex-wrap items-center gap-2">
                  <PlatformMark p={p} size={22} />
                  <span className="flex-1 text-[0.875rem] font-semibold text-slate-900">{PLATFORM_META[p].label}</span>
                  {links.length > 0 && (
                    <Button size="xs" variant="ghost" onClick={() => copy(links.map((l) => `${l.label}: ${l.url}`).join('\n'), t('Link copy ho gaya'))} leftIcon={<Link2 className="h-3.5 w-3.5" />}>
                      {t('Link copy')}
                    </Button>
                  )}
                  <Button size="xs" variant="secondary" onClick={() => { void copy(text, t('Caption copy ho gaya')); openPlatform(p); }} leftIcon={<ExternalLink className="h-3.5 w-3.5" />}>
                    {t('{{name}} kholein', { name: PLATFORM_META[p].label })}
                  </Button>
                </div>
                <MetaPublishRow post={post} p={p} />
                <Input wrapperClassName="mt-2" size="sm" value={urls[p] ?? ''} onChange={(e) => setUrls((u) => ({ ...u, [p]: e.target.value }))}
                  placeholder={t('Post ka link (post karne ke baad, zaroori nahi)')} aria-label={t('{{name}} post ka link', { name: PLATFORM_META[p].label })} />
              </div>
            );
          })}
          {!post.platforms.length && <p className="text-[0.8125rem] text-slate-500">{t('Koi platform nahi chuna.')}</p>}
        </section>

        <AutoPostNote />
      </div>
    </Modal>
  );
}
