/**
 * Post editor (drawer): when, where, caption, hashtags, photos, product
 * links and status. Nafaa AI fills captions and hashtags from the chosen
 * products; the creative maker makes a branded image for the post.
 */

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Hash, ImagePlus, Link2, Plus, Send, Sparkles, Trash2, Upload, Wand2, X } from 'lucide-react';
import { Button, Drawer, Input, Modal, Segmented, Select, Textarea, confirmDialog } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import { apiErrorMessage } from '@integrations/online-orders/api/online-orders.api';
import {
  SOCIAL_PLATFORMS, socialApi, type PostInput, type PostKind, type PostLink, type PostMedia, type PostStatus, type SocialPlatform, type SocialPost, type SocialProduct,
} from './social.api';
import { KIND_LABEL, PLATFORM_META, PlatformMark, STATUS_META } from './platforms';
import { AutoPublishToggle, canAutoPost, useStudioMeta } from './MetaPublish';
import { ProductPicker } from './ProductPicker';
import { CreativeMaker } from './CreativeMaker';

const pad = (n: number) => String(n).padStart(2, '0');
const toLocalInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const REMIND = [0, 15, 30, 60, 120];

export interface EditorSeed { day?: string; caption?: string; hashtags?: string[]; productIds?: string[]; media?: PostMedia[]; title?: string; festivalKey?: string | null; aiMade?: boolean }

export function PostEditor({ post, seed, onClose, onPostNow }: {
  post: SocialPost | null;
  seed?: EditorSeed;
  onClose: () => void;
  onPostNow?: (p: SocialPost) => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(post?.title ?? seed?.title ?? '');
  const [kind, setKind] = useState<PostKind>(post?.kind ?? 'POST');
  const [when, setWhen] = useState(post ? toLocalInput(post.scheduledAt) : seed?.day ? `${seed.day}T20:00` : '');
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(post?.platforms ?? ['FACEBOOK', 'INSTAGRAM']);
  const [caption, setCaption] = useState(post?.caption ?? seed?.caption ?? '');
  const [tags, setTags] = useState((post?.hashtags ?? seed?.hashtags ?? []).join(' '));
  const [media, setMedia] = useState<PostMedia[]>(post?.media ?? seed?.media ?? []);
  const [links, setLinks] = useState<PostLink[]>(post?.links ?? []);
  const [status, setStatus] = useState<PostStatus>(post?.status ?? (seed?.day ? 'READY' : 'DRAFT'));
  const [remind, setRemind] = useState(post?.remindMinutes ?? 0);
  const studioMeta = useStudioMeta().data;
  const [autoPublish, setAutoPublish] = useState<boolean | null>(post ? !!post.autoPublish : null);
  // New posts: on by default once Facebook / Instagram is connected.
  const auto = autoPublish ?? canAutoPost(studioMeta, platforms);
  const [notes, setNotes] = useState(post?.notes ?? '');
  const [products, setProducts] = useState<SocialProduct[]>([]);
  const [captionIdeas, setCaptionIdeas] = useState<string[]>([]);
  const [creative, setCreative] = useState(false);

  const productIds = post?.productIds ?? seed?.productIds ?? [];
  const initial = useQuery({ queryKey: ['social', 'products', 'ids', productIds.join(',')], queryFn: () => socialApi.products({ ids: productIds }), enabled: productIds.length > 0 });
  useEffect(() => { if (initial.data) setProducts(initial.data); }, [initial.data]);

  /** Picking a product adds its shop link and first photo once. */
  const pickProducts = (next: SocialProduct[]) => {
    const added = next.filter((p) => !products.some((x) => x.id === p.id));
    setProducts(next);
    if (!added.length) return;
    setLinks((ls) => [...ls, ...added.filter((p) => p.link && !ls.some((l) => l.productId === p.id)).map((p) => ({ productId: p.id, label: p.name, url: p.link! }))]);
    setMedia((ms) => [...ms, ...added.filter((p) => p.images[0] && !ms.some((m) => m.url === p.images[0])).map((p) => ({ url: p.images[0], kind: 'image' as const, source: 'product' as const, productId: p.id }))].slice(0, 10));
    if (!title) setTitle(added[0].name);
  };

  const body = (): PostInput => ({
    title: title.trim() || null, kind, scheduledAt: when ? new Date(when).toISOString() : null, platforms, caption,
    hashtags: tags.split(/[\s,]+/).filter(Boolean), media, productIds: products.map((p) => p.id), links, status, remindMinutes: remind, notes: notes.trim() || null, autoPublish: auto && canAutoPost(studioMeta, platforms),
    ...(!post && seed?.festivalKey && { festivalKey: seed.festivalKey }), ...(!post && seed?.aiMade && { aiMade: true }),
  });

  const save = useMutation({
    mutationFn: () => (post ? socialApi.update(post.id, body()) : socialApi.create(body())),
    onSuccess: (p, _v) => { qc.invalidateQueries({ queryKey: ['social'] }); toast.success(t('Post save ho gayi')); onClose(); return p; },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const saveAndPost = useMutation({
    mutationFn: () => (post ? socialApi.update(post.id, body()) : socialApi.create(body())),
    onSuccess: (p) => { qc.invalidateQueries({ queryKey: ['social'] }); onPostNow?.(p); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => socialApi.remove(post!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['social'] }); toast.success(t('Post mita di')); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const ai = useMutation({
    mutationFn: (kind: 'caption' | 'hashtags') => socialApi.ai({ kind, productIds: products.map((p) => p.id), platform: platforms[0], note: title || undefined, festivalKey: seed?.festivalKey ?? post?.festivalKey ?? undefined }),
    onSuccess: (r) => {
      if (r.captions?.length) setCaptionIdeas(r.captions);
      if (r.hashtags?.length && (r.kind === 'hashtags' || !tags.trim())) setTags(r.hashtags.join(' '));
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const upload = useMutation({
    mutationFn: (f: File) => socialApi.uploadImage(f, f.name),
    onSuccess: (url) => setMedia((ms) => [...ms, { url, kind: 'image' as const, source: 'upload' as const }].slice(0, 10)),
    onError: () => toast.error(t('Photo upload nahi hui')),
  });

  const togglePlatform = (p: SocialPlatform) => setPlatforms((ps) => (ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p]));
  const busy = save.isPending || saveAndPost.isPending;

  return (
    <Drawer open onClose={onClose} size="xl" title={post ? t('Post badlein') : t('Nayi post')} description={post ? `${STATUS_META[post.status].label}${post.aiMade ? ` · ${t('Nafaa AI ne banayi')}` : ''}` : t('Calendar me post rakhein — waqt par yaad dilayenge')}
      footer={<div className="flex w-full flex-wrap items-center gap-2">
        {post && <Button variant="ghost" onClick={async () => { if (await confirmDialog({ title: t('Post mitayein?'), text: t('Ye post calendar se hat jayegi.'), yes: t('Mitayein'), danger: true })) remove.mutate(); }} leftIcon={<Trash2 className="h-4 w-4" />}>{t('Mitayein')}</Button>}
        <span className="flex-1" />
        {onPostNow && <Button variant="secondary" loading={saveAndPost.isPending} disabled={busy || !platforms.length} onClick={() => saveAndPost.mutate()} leftIcon={<Send className="h-4 w-4" />}>{t('Save + Post karein')}</Button>}
        <Button loading={save.isPending} disabled={busy} onClick={() => save.mutate()}>{t('Save')}</Button>
      </div>}>
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input wrapperClassName="sm:col-span-2" label={t('Naam (sirf aap ke liye)')} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder={t('Misaal: Eid collection reel')} />
          <Input type="datetime-local" label={t('Kab post karni hai')} value={when} onChange={(e) => setWhen(e.target.value)} hint={t('Khali chhorein to Idea ban jayegi')} />
          <Select label={t('Yaad dilayein')} value={String(remind)} onChange={(e) => setRemind(Number(e.target.value))}
            options={REMIND.map((m) => ({ value: String(m), label: m === 0 ? t('Usi waqt') : m < 60 ? t('{{count}} minute pehle', { count: m }) : t('{{count}} ghanta pehle', { count: m / 60 }) }))} />
          <div className="space-y-1.5">
            <p className="text-[0.8125rem] font-medium text-slate-700">{t('Qisam')}</p>
            <Segmented value={kind} onChange={setKind} items={(['POST', 'REEL', 'STORY', 'STATUS'] as PostKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }))} label={t('Qisam')} />
          </div>
          <Select label={t('Status')} value={status} onChange={(e) => setStatus(e.target.value as PostStatus)}
            options={(['IDEA', 'DRAFT', 'READY', 'POSTED'] as PostStatus[]).map((s) => ({ value: s, label: STATUS_META[s].label }))} />
          <div className="sm:col-span-2"><AutoPublishToggle value={auto} onChange={setAutoPublish} platforms={platforms} /></div>
        </div>

        <section className="space-y-1.5">
          <p className="text-[0.8125rem] font-medium text-slate-700">{t('Kahan')}</p>
          <div className="flex flex-wrap gap-1.5">
            {SOCIAL_PLATFORMS.map((p) => (
              <button key={p} type="button" onClick={() => togglePlatform(p)} aria-pressed={platforms.includes(p)}
                className={cn('inline-flex items-center gap-1.5 rounded-full py-1 pe-3 ps-1 text-[0.75rem] font-semibold ring-1 transition', platforms.includes(p) ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                <PlatformMark p={p} size={20} />{PLATFORM_META[p].label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-1.5">
          <p className="text-[0.8125rem] font-medium text-slate-700">{t('Products')}</p>
          <ProductPicker value={products} onChange={pickProducts} />
        </section>

        <section className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[0.8125rem] font-medium text-slate-700">{t('Caption')}</p>
            <Button size="xs" variant="secondary" loading={ai.isPending && ai.variables === 'caption'} onClick={() => ai.mutate('caption')} leftIcon={<Sparkles className="h-3.5 w-3.5" />}>{t('Nafaa AI se likhwayein')}</Button>
          </div>
          {captionIdeas.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-3">
              {captionIdeas.map((c, i) => (
                <button key={i} type="button" onClick={() => { setCaption(c); setCaptionIdeas([]); }}
                  className="rounded-xl bg-violet-50/70 p-2.5 text-start text-[0.75rem] leading-relaxed text-slate-700 ring-1 ring-violet-200 hover:bg-violet-50">
                  <span className="line-clamp-6 whitespace-pre-wrap">{c}</span>
                  <span className="mt-1 block font-semibold text-violet-700">{t('Ye lein')}</span>
                </button>
              ))}
            </div>
          )}
          <Textarea rows={6} value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={5000} aria-label={t('Caption')} placeholder={t('Post ka text…')} />
          <div className="flex items-end gap-2">
            <Input wrapperClassName="flex-1" leftIcon={<Hash className="h-4 w-4" />} label={t('Hashtags')} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="#EidSale #Lahore" />
            <Button variant="secondary" loading={ai.isPending && ai.variables === 'hashtags'} onClick={() => ai.mutate('hashtags')} leftIcon={<Wand2 className="h-4 w-4" />}>{t('Hashtags')}</Button>
          </div>
        </section>

        <section className="space-y-1.5">
          <p className="text-[0.8125rem] font-medium text-slate-700">{t('Photos')}</p>
          <div className="flex flex-wrap gap-2">
            {media.map((m) => (
              <div key={m.url} className="group relative h-20 w-20 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
                <img src={m.url} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setMedia((ms) => ms.filter((x) => x.url !== m.url))} aria-label={t('Hataein')}
                  className="absolute end-1 top-1 rounded-full bg-white/90 p-0.5 text-slate-700 shadow"><X className="h-3.5 w-3.5" /></button>
                {m.source === 'creative' && <span className="absolute bottom-1 start-1 rounded bg-violet-600 px-1 text-[0.5625rem] font-semibold text-white">{t('Design')}</span>}
              </div>
            ))}
            <label className={cn('flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 text-[0.6875rem] text-slate-500 hover:bg-slate-50', upload.isPending && 'opacity-50')}>
              <Upload className="h-4 w-4" />{t('Upload')}
              <input type="file" accept="image/*" className="sr-only" disabled={upload.isPending} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ''; }} />
            </label>
            <button type="button" onClick={() => setCreative(true)} className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-violet-300 text-[0.6875rem] font-medium text-violet-700 hover:bg-violet-50">
              <ImagePlus className="h-4 w-4" />{t('Design banayein')}
            </button>
          </div>
        </section>

        <section className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[0.8125rem] font-medium text-slate-700">{t('Product links')}</p>
            <Button size="xs" variant="ghost" onClick={() => setLinks((ls) => [...ls, { label: '', url: '' }])} leftIcon={<Plus className="h-3.5 w-3.5" />}>{t('Link')}</Button>
          </div>
          {links.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
              <Input wrapperClassName="w-36 shrink-0" size="sm" value={l.label} onChange={(e) => setLinks((ls) => ls.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder={t('Naam')} aria-label={t('Link ka naam')} />
              <Input wrapperClassName="flex-1" size="sm" value={l.url} onChange={(e) => setLinks((ls) => ls.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} placeholder="https://" aria-label={t('Link')} />
              <button type="button" onClick={() => setLinks((ls) => ls.filter((_, j) => j !== i))} aria-label={t('Hataein')} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
          ))}
          <p className="text-[0.6875rem] text-slate-500">{t('Har platform ke liye link me nishan lag jata hai, taake pata chale kis post se order aaya.')}</p>
        </section>

        <Textarea rows={2} label={t('Note')} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
      </div>

      {creative && (
        <Modal open onClose={() => setCreative(false)} size="full" title={t('Design banayein')}>
          <CreativeMaker initialProduct={products[0] ?? null} onUse={(url, p) => { setMedia((ms) => [{ url, kind: 'image' as const, source: 'creative' as const, productId: p?.id ?? null }, ...ms].slice(0, 10)); setCreative(false); }} />
        </Modal>
      )}
    </Drawer>
  );
}
