/**
 * Website pages and blog posts: the list of pages (about, contact, FAQ and
 * the shop's own) and of blog posts, with their address and whether they
 * show on the website. Opening one goes to the editor.
 */

import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Eye, EyeOff, FileText, GraduationCap, Newspaper, PenLine, Plus } from 'lucide-react';
import { Badge, Card, EmptyState, PageShell, Segmented, Skeleton, heroIconButton, heroPrimaryButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { t } from '@core/i18n';
import { storesApi, type PageKind } from '../api/stores.api';
import { StoreGate, WebsiteHero, type StoreCtx } from '../components/StoreGate';
import { SK } from '../lib/hooks';
import { shortDate } from '../lib/format';

export default function PagesPage() {
  return (
    <PageShell>
      <StoreGate title={t('Pages aur blog')}>{(ctx) => <Pages ctx={ctx} />}</StoreGate>
    </PageShell>
  );
}

export const PAGE_KIND: Record<PageKind, string> = {
  ABOUT: t('Hamare baare me'),
  CONTACT: t('Rabta'),
  FAQ: t('Sawal jawab'),
  CUSTOM: t('Apna page'),
};

function Pages({ ctx }: { ctx: StoreCtx }) {
  const id = ctx.store.id;
  const guide = usePageGuide();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'blog' ? 'blog' : 'pages';
  const pages = useQuery({ queryKey: SK.pages(id), queryFn: () => storesApi.pages(id) });
  const posts = useQuery({ queryKey: SK.posts(id), queryFn: () => storesApi.posts(id) });
  const list = tab === 'pages' ? pages : posts;

  return (
    <>
      <WebsiteHero ctx={ctx} title={t('Pages aur blog')} loading={pages.isLoading}
        meta={t('About, contact, FAQ aur apne pages. Blog se Google par log aap tak pohanchte hain.')}
        actions={<>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <Link to={tab === 'pages' ? '/online-store/site/pages/new' : '/online-store/site/blog/new'} className={heroPrimaryButton}>
            <Plus className="h-4 w-4" />{tab === 'pages' ? t('Naya page') : t('Nayi post')}
          </Link>
        </>}
        stats={[
          { label: t('Pages'), value: String(pages.data?.length ?? 0) },
          { label: t('Website par'), value: String(pages.data?.filter((p) => p.isPublished).length ?? 0) },
          { label: t('Blog posts'), value: String(posts.data?.length ?? 0) },
          { label: t('Chhapi hui posts'), value: String(posts.data?.filter((p) => p.isPublished).length ?? 0) },
        ]} />

      <Segmented value={tab} onChange={(v) => setParams(v === 'blog' ? { tab: 'blog' } : {}, { replace: true })} label={t('Kya dekhein')}
        items={[{ value: 'pages', label: t('Pages'), count: pages.data?.length }, { value: 'blog', label: t('Blog'), count: posts.data?.length }]} />

      <Card flush>
        {list.isLoading ? <Skeleton className="m-4 h-48 rounded-xl" /> : tab === 'pages' ? (
          !pages.data?.length ? (
            <EmptyState icon={<FileText className="h-6 w-6" />} title={t('Abhi koi page nahi')} description={t('About ya contact page banayein')}
              action={<Link to="/online-store/site/pages/new" className="text-[0.875rem] font-semibold text-brand-700">{t('Naya page')}</Link>} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {pages.data.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => navigate(`/online-store/site/pages/${p.id}`)} className="flex w-full items-center gap-3 px-4 py-3 text-start hover:bg-slate-50">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><FileText className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.875rem] font-semibold text-slate-900">{p.title}</span>
                      <span className="block truncate text-[0.75rem] text-slate-500 dir-ltr">/pages/{p.handle}</span>
                    </span>
                    <Badge size="xs" className="hidden sm:inline-flex">{PAGE_KIND[p.kind] ?? p.kind}</Badge>
                    <Visible on={p.isPublished} />
                    <span className="hidden w-24 text-end text-[0.75rem] text-slate-400 md:block">{shortDate(p.updatedAt)}</span>
                    <ChevronRight className="h-4 w-4 text-slate-300 rtl-flip" />
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : !posts.data?.length ? (
          <EmptyState icon={<Newspaper className="h-6 w-6" />} title={t('Abhi koi post nahi')} description={t('Naye maal, sale ya tips par likhein. Google se log aate hain.')}
            action={<Link to="/online-store/site/blog/new" className="text-[0.875rem] font-semibold text-brand-700">{t('Nayi post')}</Link>} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {posts.data.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => navigate(`/online-store/site/blog/${p.id}`)} className="flex w-full items-center gap-3 px-4 py-3 text-start hover:bg-slate-50">
                  {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-9 w-12 shrink-0 rounded-lg object-cover" /> : <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Newspaper className="h-4 w-4" /></span>}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.875rem] font-semibold text-slate-900">{p.title}</span>
                    <span className="block truncate text-[0.75rem] text-slate-500">{p.tags.join(', ') || p.excerpt || ''}</span>
                  </span>
                  <Visible on={p.isPublished} />
                  <span className="hidden w-24 text-end text-[0.75rem] text-slate-400 md:block">{shortDate(p.publishedAt ?? p.updatedAt)}</span>
                  <ChevronRight className="h-4 w-4 text-slate-300 rtl-flip" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {guide.isOpen && (
        <PageGuide title={t('Pages aur blog — aasaan tareeqa')} onClose={guide.close}
          flow={[
            { label: t('Page likhein'), hint: t('Text aur tasveer'), icon: PenLine, color: '#7c3aed' },
            { label: t('Website par dikhayein'), hint: t('Chalu / band'), icon: Eye, color: '#2563eb' },
            { label: t('Menu me jorein'), hint: t('Menu page'), icon: FileText, color: '#16a34a' },
          ]}
          steps={[
            { icon: PenLine, color: '#7c3aed', title: t('Likhein'), text: t('Heading, list, link aur tasveer upar ke buttons se lagayein.') },
            { icon: Eye, color: '#2563eb', title: t('Dikhana'), text: t('"Website par dikhayein" band ho to page sirf aap ko nazar aata hai.') },
            { icon: Newspaper, color: '#0d9488', title: t('Blog'), text: t('Har post ka apna Google title aur tafseel likhein, taake log search se aayein.') },
          ]} />
      )}
    </>
  );
}

export function Visible({ on }: { on: boolean }) {
  return on
    ? <Badge variant="success" size="xs"><Eye className="me-1 h-3 w-3" />{t('Website par')}</Badge>
    : <Badge size="xs"><EyeOff className="me-1 h-3 w-3" />{t('Chhupa')}</Badge>;
}
