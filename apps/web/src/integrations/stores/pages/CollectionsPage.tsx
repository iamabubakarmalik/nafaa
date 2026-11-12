/**
 * Website collections: groups of products shown as their own page
 * (/collections/<name>) and in theme sections. Drag rows to set the order
 * the website shows them in. Manual collections hold chosen products;
 * automatic ones fill themselves from rules.
 */

import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronRight, GraduationCap, GripVertical, Hand, Plus, Tags, Wand2 } from 'lucide-react';
import { Badge, Card, EmptyState, PageShell, Skeleton, heroIconButton, heroPrimaryButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { t } from '@core/i18n';
import { apiErrorMessage } from '@integrations/online-orders/api/online-orders.api';
import { storesApi, type CollectionRow } from '../api/stores.api';
import { StoreGate, WebsiteHero, type StoreCtx } from '../components/StoreGate';
import { DragList } from '../components/DragList';
import { SK } from '../lib/hooks';
import { Visible } from './PagesPage';

export default function CollectionsPage() {
  return (
    <PageShell>
      <StoreGate title={t('Collections')}>{(ctx) => <Collections ctx={ctx} />}</StoreGate>
    </PageShell>
  );
}

function Collections({ ctx }: { ctx: StoreCtx }) {
  const id = ctx.store.id;
  const qc = useQueryClient();
  const guide = usePageGuide();
  const navigate = useNavigate();
  const q = useQuery({ queryKey: SK.collections(id), queryFn: () => storesApi.collections(id) });
  const reorder = useMutation({
    mutationFn: (rows: CollectionRow[]) => storesApi.reorderCollections(id, rows.map((r) => r.id)),
    onMutate: (rows) => { qc.setQueryData(SK.collections(id), rows); },
    onError: (e) => { toast.error(apiErrorMessage(e)); void qc.invalidateQueries({ queryKey: SK.collections(id) }); },
  });
  const rows = q.data ?? [];

  return (
    <>
      <WebsiteHero ctx={ctx} title={t('Collections')} loading={q.isLoading}
        meta={t('Products ke group: "Lawn", "Eid sale", "Naye". Har collection ka apna page aur Google address.')}
        actions={<>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <Link to="/online-store/site/collections/new" className={heroPrimaryButton}><Plus className="h-4 w-4" />{t('Nayi collection')}</Link>
        </>}
        stats={[
          { label: t('Collections'), value: String(rows.length) },
          { label: t('Khud bharne wali'), value: String(rows.filter((r) => r.kind === 'AUTOMATIC').length) },
          { label: t('Website par'), value: String(rows.filter((r) => r.isPublished).length) },
          { label: t('Kul products'), value: rows.reduce((n, r) => n + r.productCount, 0).toLocaleString() },
        ]} />

      <Card flush>
        {q.isLoading ? <Skeleton className="m-4 h-48 rounded-xl" /> : !rows.length ? (
          <EmptyState icon={<Tags className="h-6 w-6" />} title={t('Abhi koi collection nahi')} description={t('Pehli collection banayein, jaise "Naye products" ya "Sale".')}
            action={<Link to="/online-store/site/collections/new" className="text-[0.875rem] font-semibold text-brand-700">{t('Nayi collection')}</Link>} />
        ) : (
          <DragList items={rows} getKey={(r) => r.id} onReorder={(next) => reorder.mutate(next)} className="space-y-0 divide-y divide-slate-100"
            renderItem={(r) => (
              <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-300" aria-label={t('Khench kar jagah badlein')} />
                <button type="button" onClick={() => navigate(`/online-store/site/collections/${r.id}`)} className="flex min-w-0 flex-1 items-center gap-3 text-start">
                  {r.image ? <img src={r.image} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><Tags className="h-4 w-4" /></span>}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.875rem] font-semibold text-slate-900">{r.title}</span>
                    <span className="block truncate text-[0.75rem] text-slate-500">{t('{{n}} products', { n: r.productCount })} · <span className="dir-ltr">/collections/{r.handle}</span></span>
                  </span>
                  <Badge size="xs" className="hidden sm:inline-flex">{r.kind === 'AUTOMATIC' ? <><Wand2 className="me-1 h-3 w-3" />{t('Khud bharti hai')}</> : <><Hand className="me-1 h-3 w-3" />{t('Chune hue')}</>}</Badge>
                  <Visible on={r.isPublished} />
                  <ChevronRight className="h-4 w-4 text-slate-300 rtl-flip" />
                </button>
              </div>
            )} />
        )}
      </Card>

      {guide.isOpen && (
        <PageGuide title={t('Collections — aasaan tareeqa')} onClose={guide.close}
          flow={[
            { label: t('Collection banayein'), hint: t('Naam aur tasveer'), icon: Plus, color: '#2563eb' },
            { label: t('Products'), hint: t('Khud chunein ya rule'), icon: Wand2, color: '#7c3aed' },
            { label: t('Menu / home'), hint: t('Website par dikhayein'), icon: Tags, color: '#16a34a' },
          ]}
          steps={[
            { icon: Hand, color: '#2563eb', title: t('Chune hue'), text: t('Aap ek ek product chunte hain aur unki tarteeb khud rakhte hain.') },
            { icon: Wand2, color: '#7c3aed', title: t('Khud bharne wali'), text: t('Rule lagayein (category, brand, qeemat, stock). Naye products khud aa jate hain.') },
            { icon: GripVertical, color: '#0d9488', title: t('Tarteeb'), text: t('List me khench kar website par collections ki tarteeb badlein.') },
          ]} />
      )}
    </>
  );
}
