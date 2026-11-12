/**
 * Editor for one website page or blog post: title, rich text with images,
 * address, Google fields, and whether it shows on the website. Posts also
 * have a cover image, a short summary, tags and an author. "new" in the URL
 * creates one. Delete only hides it (the API archives, nothing is lost).
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ExternalLink, Eye, FileText, GraduationCap, Newspaper, Save, Search, Trash2 } from 'lucide-react';
import { Button, Card, Input, PageShell, Select, Skeleton, Switch, Textarea, confirmDialog, heroButton, heroIconButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { t } from '@core/i18n';
import { apiErrorMessage } from '@integrations/online-orders/api/online-orders.api';
import { storesApi, type BlogPost, type PageKind, type StorePage } from '../api/stores.api';
import { StoreGate, WebsiteHero, type StoreCtx } from '../components/StoreGate';
import { RichTextEditor } from '../components/RichTextEditor';
import { ImageField } from '../components/ImageField';
import { SeoFields, textOf } from '../components/SeoFields';
import { SK, storeLink } from '../lib/hooks';
import { shortDate, toHandle } from '../lib/format';
import { PAGE_KIND } from './PagesPage';

type Kind = 'page' | 'post';

export default function ContentEditPage({ kind }: { kind: Kind }) {
  return (
    <PageShell>
      <StoreGate title={kind === 'page' ? t('Page') : t('Blog post')}>{(ctx) => <Editor ctx={ctx} kind={kind} />}</StoreGate>
    </PageShell>
  );
}

interface Draft {
  title: string; handle: string; bodyHtml: string; seoTitle: string; seoDescription: string; isPublished: boolean;
  pageKind: PageKind; excerpt: string; imageUrl: string | null; tags: string; author: string;
}
const EMPTY: Draft = { title: '', handle: '', bodyHtml: '', seoTitle: '', seoDescription: '', isPublished: true, pageKind: 'CUSTOM', excerpt: '', imageUrl: null, tags: '', author: '' };

function fromPage(p: StorePage): Draft {
  return { ...EMPTY, title: p.title, handle: p.handle, bodyHtml: p.bodyHtml, seoTitle: p.seoTitle ?? '', seoDescription: p.seoDescription ?? '', isPublished: p.isPublished, pageKind: p.kind };
}
function fromPost(p: BlogPost): Draft {
  return { ...EMPTY, title: p.title, handle: p.handle, bodyHtml: p.bodyHtml, seoTitle: p.seoTitle ?? '', seoDescription: p.seoDescription ?? '', isPublished: p.isPublished, excerpt: p.excerpt ?? '', imageUrl: p.imageUrl, tags: p.tags.join(', '), author: p.author ?? '' };
}

function Editor({ ctx, kind }: { ctx: StoreCtx; kind: Kind }) {
  const id = ctx.store.id;
  const { itemId = 'new' } = useParams();
  const isNew = itemId === 'new';
  const qc = useQueryClient();
  const navigate = useNavigate();
  const guide = usePageGuide();
  const back = kind === 'page' ? '/online-store/site/pages' : '/online-store/site/pages?tab=blog';
  const q = useQuery({
    queryKey: ['stores', id, kind, itemId],
    queryFn: () => (kind === 'page' ? storesApi.page(id, itemId).then(fromPage) : storesApi.post(id, itemId).then(fromPost)),
    enabled: !isNew,
  });
  const [d, setD] = useState<Draft>(EMPTY);
  const [handleTouched, setHandleTouched] = useState(!isNew);
  useEffect(() => { if (q.data) setD(q.data); }, [q.data]);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const dirty = isNew ? !!d.title.trim() : !!q.data && JSON.stringify(d) !== JSON.stringify(q.data);

  const save = useMutation({
    mutationFn: async () => {
      const common = { title: d.title.trim(), handle: d.handle || toHandle(d.title), bodyHtml: d.bodyHtml, seoTitle: d.seoTitle || null, seoDescription: d.seoDescription || null, isPublished: d.isPublished };
      if (kind === 'page') {
        const body = { ...common, kind: d.pageKind };
        return isNew ? storesApi.createPage(id, body) : storesApi.updatePage(id, itemId, body);
      }
      const body = { ...common, excerpt: d.excerpt || null, imageUrl: d.imageUrl, author: d.author || null, tags: d.tags.split(',').map((x) => x.trim()).filter(Boolean) };
      return isNew ? storesApi.createPost(id, body) : storesApi.updatePost(id, itemId, body);
    },
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: kind === 'page' ? SK.pages(id) : SK.posts(id) });
      const next = kind === 'page' ? fromPage(r as StorePage) : fromPost(r as BlogPost);
      qc.setQueryData(['stores', id, kind, r.id], next);
      setD(next);
      toast.success(t('Save ho gaya'));
      if (isNew) navigate(kind === 'page' ? `/online-store/site/pages/${r.id}` : `/online-store/site/blog/${r.id}`, { replace: true });
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => (kind === 'page' ? storesApi.deletePage(id, itemId) : storesApi.deletePost(id, itemId)),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: kind === 'page' ? SK.pages(id) : SK.posts(id) }); toast.success(t('Hata diya')); navigate(back); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const prefix = kind === 'page' ? '/pages/' : '/blogs/news/';
  const handle = d.handle || toHandle(d.title);
  const words = textOf(d.bodyHtml, 100000).split(' ').filter(Boolean).length;

  return (
    <>
      <WebsiteHero ctx={ctx} back={back} backLabel={kind === 'page' ? t('Pages') : t('Blog')}
        title={isNew ? (kind === 'page' ? t('Naya page') : t('Nayi post')) : d.title || '…'}
        loading={q.isLoading}
        meta={<span className="dir-ltr">{prefix}{handle}</span>}
        actions={<>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {!isNew && <a href={storeLink(ctx.store, ctx.list.storefrontUrl, `${prefix}${handle}`)} target="_blank" rel="noreferrer" className={heroButton}><ExternalLink className="h-4 w-4" />{t('Website par dekhein')}</a>}
        </>}
        stats={[
          { label: t('Alfaz'), value: String(words) },
          { label: t('Halat'), value: d.isPublished ? t('Website par') : t('Chhupa') },
          { label: t('Google title'), value: d.seoTitle ? t('Likha hai') : t('Khud banega') },
          { label: t('Aakhri tabdeeli'), value: isNew ? '—' : shortDate((q.data && (q.data as unknown as { updatedAt?: string }).updatedAt) || null) },
        ]} />

      {q.isLoading ? <Skeleton className="h-96 rounded-2xl" /> : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-4">
            <Card>
              <div className="space-y-4">
                <Input label={t('Heading')} value={d.title} maxLength={150}
                  onChange={(e) => { set('title', e.target.value); if (!handleTouched) set('handle', toHandle(e.target.value)); }} />
                <div>
                  <p className="mb-1 text-[0.8125rem] font-medium text-slate-700">{t('Text')}</p>
                  <RichTextEditor value={d.bodyHtml} onChange={(v) => set('bodyHtml', v)} minHeight={320} />
                </div>
                {kind === 'post' && (
                  <label className="block">
                    <span className="mb-1 block text-[0.8125rem] font-medium text-slate-700">{t('Chhota khulasa')}</span>
                    <Textarea rows={2} value={d.excerpt} maxLength={300} onChange={(e) => set('excerpt', e.target.value)} placeholder={t('Blog list me post ke neeche dikhta hai')} />
                  </label>
                )}
              </div>
            </Card>
            <Card title={t('Google aur address')}>
              <SeoFields base={ctx.store.url} prefix={prefix} handle={handle}
                onHandle={(v) => { setHandleTouched(true); set('handle', v); }}
                title={d.seoTitle} onTitle={(v) => set('seoTitle', v)} description={d.seoDescription} onDescription={(v) => set('seoDescription', v)}
                fallbackTitle={`${d.title} – ${ctx.store.name}`} fallbackDescription={d.excerpt || textOf(d.bodyHtml)} />
            </Card>
          </div>
          <div className="space-y-4">
            <Card>
              <div className="space-y-4">
                <Switch label={t('Website par dikhayein')} description={t('Band ho to sirf aap ko nazar aata hai')} checked={d.isPublished} onChange={(e) => set('isPublished', e.target.checked)} />
                {kind === 'page' && (
                  <Select label={t('Page ki qisam')} value={d.pageKind} onChange={(e) => set('pageKind', e.target.value as PageKind)}
                    options={(Object.keys(PAGE_KIND) as PageKind[]).map((k) => ({ value: k, label: PAGE_KIND[k] }))}
                    hint={d.pageKind === 'CONTACT' ? t('Rabta page par form aur WhatsApp button khud lagte hain') : d.pageKind === 'FAQ' ? t('Heading wale sawal khulne band hone wale bante hain') : undefined} />
                )}
                {kind === 'post' && (
                  <>
                    <ImageField label={t('Cover tasveer')} value={d.imageUrl} onChange={(v) => set('imageUrl', v)} />
                    <Input label={t('Tags')} value={d.tags} onChange={(e) => set('tags', e.target.value)} hint={t('Comma se alag: eid, lawn, sale')} />
                    <Input label={t('Likhne wala')} value={d.author} onChange={(e) => set('author', e.target.value)} />
                  </>
                )}
                <Button className="w-full" disabled={!d.title.trim() || !dirty} loading={save.isPending} onClick={() => save.mutate()} leftIcon={<Save className="h-4 w-4" />}>{t('Save')}</Button>
              </div>
            </Card>
            {!isNew && (
              <Button variant="ghost" className="w-full text-rose-600" loading={remove.isPending} leftIcon={<Trash2 className="h-4 w-4" />}
                onClick={async () => { if (await confirmDialog({ title: t('Ise hatayein?'), text: t('Website se hat jayega. Purane address par 404 ki jagah home page khulega.'), yes: t('Hatayein'), danger: true })) remove.mutate(); }}>
                {kind === 'page' ? t('Page hatayein') : t('Post hatayein')}
              </Button>
            )}
          </div>
        </div>
      )}

      {guide.isOpen && (
        <PageGuide title={kind === 'page' ? t('Page likhna') : t('Blog post likhna')} onClose={guide.close}
          flow={[
            { label: t('Likhein'), hint: t('Heading, text, tasveer'), icon: kind === 'page' ? FileText : Newspaper, color: '#7c3aed' },
            { label: t('Google'), hint: t('Title aur tafseel'), icon: Search, color: '#2563eb' },
            { label: t('Save'), hint: t('Website par foran'), icon: Eye, color: '#16a34a' },
          ]}
          steps={[
            { icon: FileText, color: '#7c3aed', title: t('Text ke buttons'), text: t('Bari heading, mota, list, link aur tasveer upar ki patti se. HTML button se seedha code bhi likh sakte hain.') },
            { icon: Search, color: '#2563eb', title: t('Google'), text: t('Khali chhorein to heading aur pehli lines khud use hoti hain. 60 harf ka title aur 150 harf ki tafseel behtar hai.') },
          ]} />
      )}
    </>
  );
}
