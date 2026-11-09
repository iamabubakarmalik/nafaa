/**
 * Edit order page (/online-orders/:id/edit): the full edit form for one
 * order, the channel sync result after saving, and a guide.
 */

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, GraduationCap, ListChecks, Pencil, RefreshCw, Save, Store } from 'lucide-react';
import { Alert, Button, PageHero, PageShell, Skeleton, heroIconButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { BrandLogo } from '@/assets/brands/BrandLogo';
import { onlineOrdersApi } from '../api/online-orders.api';
import type { SyncResult } from '../api/order-board.api';
import { EditOrderForm } from '../components/orders/EditOrderForm';
import { canEdit } from '../components/orders/RowActions';
import { STATUS_LABEL, sourceOf } from '../lib/labels';
import { orderNo } from '../lib/orders';
import { t } from '@core/i18n';

export default function EditOrderPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const guide = usePageGuide();
  const { sales: money } = useMasked();
  const [saved, setSaved] = useState<{ sync: SyncResult | null; n: number } | null>(null);
  const q = useQuery({ queryKey: ['online-order-edit', id], queryFn: () => onlineOrdersApi.detail(id), enabled: !!id });
  const o = q.data;
  const back = `/online-orders?order=${id}`;

  return (
    <PageShell>
      <PageHero
        back={back}
        title={o ? <span className="inline-flex min-w-0 items-center gap-2.5"><BrandLogo name={sourceOf(o).brand} size={28} /><span className="truncate">{t('Order #{{no}} edit', { no: orderNo(o) })}</span></span> : t('Order edit')}
        chip={<><Pencil />{o ? o.customerName : t('Load ho raha hai…')}</>}
        meta={t('Cheezein, price, charges aur address badlein — bill aur stock khud theek ho jate hain')}
        loading={q.isLoading}
        actions={<button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>}
        stats={o ? [
          { label: t('Amount'), value: money(Number(o.total)) },
          { label: t('Cheezein'), value: String((o.items ?? []).reduce((n, it) => n + (Number(it.quantity) || 0), 0)), hint: t('{{count}} lines', { count: (o.items ?? []).length }) },
          { label: t('Payment'), value: o.isCod ? 'COD' : t('Advance / paid') },
          { label: t('Status'), value: STATUS_LABEL[o.orderStatus]?.label ?? o.orderStatus },
        ] : undefined}
      />

      {q.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]"><Skeleton className="h-96 rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /></div>
      ) : q.isError || !o ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">{t('Order nahi mila')}</p>
          <Link to="/online-orders"><Button className="mt-3" variant="secondary">{t('Orders par wapas')}</Button></Link>
        </div>
      ) : !canEdit(o) ? (
        <Alert tone="warning" title={t('Ye order ab badla nahi ja sakta')}>
          {t('Cancel, return ya delete hue order, aur jis ka COD courier se mil chuka ho, badle nahi jate.')}
          <div className="mt-3"><Link to={back}><Button size="sm" variant="secondary">{t('Order dekhein')}</Button></Link></div>
        </Alert>
      ) : (
        <>
          {saved && (
            <Alert tone={saved.sync && !saved.sync.ok ? 'warning' : 'success'} title={t('Order save ho gaya')}
              action={<Button size="sm" variant="secondary" onClick={() => navigate(back)}>{t('Orders par wapas')}</Button>}>
              {saved.sync ? (saved.sync.ok
                ? t('{{channel}} par bhi badal gaya.', { channel: saved.sync.channel })
                : t('{{channel}} par nahi badla: {{message}}. Wahan khud badal dein.', { channel: saved.sync.channel, message: saved.sync.message }))
                : t('Nafaa me badal gaya.')}
            </Alert>
          )}
          <EditOrderForm key={saved?.n ?? 0} order={o} money={money} onSaved={(sync) => { setSaved({ sync, n: (saved?.n ?? 0) + 1 }); void q.refetch(); }} />
        </>
      )}

      {guide.isOpen && (
        <PageGuide title={t('Order edit — aasaan tareeqa')} onClose={guide.close}
          flowTitle={t('Save dabane par kya hota hai')}
          flow={[
            { label: t('Badlein'), hint: t('Cheezein, price, address'), icon: Pencil, color: '#7c3aed' },
            { label: t('Save'), hint: t('Naya total'), icon: Save, color: '#0284c7' },
            { label: t('Bill dobara'), hint: t('Stock aur khata theek'), icon: RefreshCw, color: '#16a34a' },
            { label: t('Channel'), hint: t('Shopify / WooCommerce'), icon: Store, color: '#ea580c' },
          ]}
          steps={[
            { icon: ListChecks, color: '#7c3aed', title: t('Cheezein'), text: t('Qty aur price badlein, cheez hatayein ya "Cheez jorein" se nayi daalein. Total saath saath badalta hai.') },
            { icon: RefreshCw, color: '#16a34a', title: t('Bill khud theek'), text: t('Bill bana ho to purana void ho kar naya banta hai — stock, cost, Profit aur khata sahi rehte hain.') },
            { icon: Store, color: '#ea580c', title: t('Channel par bhi'), text: t('Shopify aur WooCommerce par order bhi badal sakta hai. Daraz par nahi hota — wahan khud badlein.') },
            { icon: CheckCircle2, color: '#0284c7', title: t('Natija'), text: t('Save ke baad upar likha aata hai ke channel par badla ya nahi, aur kyun.') },
          ]}
          tips={[t('Courier book ho to address ya COD badalne se pehle booking cancel karein.'), t('Har badlao order ki history me likha jata hai.')]}
          shortcuts={[['G', t('guide')]]}
        />
      )}
    </PageShell>
  );
}
