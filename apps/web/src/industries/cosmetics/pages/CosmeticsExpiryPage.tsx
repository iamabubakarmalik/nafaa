/**
 * Cosmetics expiry desk on the shared product batches: what has expired and
 * what expires in 30 or 90 days, with the stock and its cost. Expired stock
 * is written off through the shared damage record (needs approval like any
 * write-off), so the loss shows in the reports; near-expiry stock gets a
 * discount at the counter. Printable list and CSV.
 */

import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarClock, CalendarX, Download, GraduationCap, PackageX, Percent, Trash2 } from 'lucide-react';
import {
  Button, EmptyState, FilterBar, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, Table, TBody, THead, Td, Th, Tr, ViewTabs,
  heroButton, heroIconButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { downloadCsv } from '@core/lib/csv';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { PrintButton, type PrintDoc } from '@core/print';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { productBatchesApi, type ProductBatch } from '@modules/inventory/products/api/product-batches.api';
import { damageApi } from '@modules/inventory/damage/api/damage.api';
import { COSMETICS_KEYS, apiError, dayOnly, daysFrom } from '../lib/meta';
import { t } from '@core/i18n';

type Tab = 'expired' | '30' | '90';

export default function CosmeticsExpiryPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const { cost: money } = useMasked();
  const canReport = usePermission(PERMISSIONS.PRODUCTS_VIEW);
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('30');
  const [search, setSearch] = useState('');
  const [writeOff, setWriteOff] = useState<ProductBatch | null>(null);

  const expired = useQuery({ queryKey: [COSMETICS_KEYS.expiry, 'expired'], queryFn: productBatchesApi.expired });
  const soon = useQuery({ queryKey: [COSMETICS_KEYS.expiry, 'soon', 90], queryFn: () => productBatchesApi.expiringSoon(90) });
  const live = (b: ProductBatch) => b.isActive && b.quantity > 0;
  const lists = useMemo(() => {
    const ex = (expired.data ?? []).filter(live);
    const s = (soon.data ?? []).filter(live);
    return { expired: ex, '30': s.filter((b) => (daysFrom(b.expiryDate) ?? 999) <= 30), '90': s };
  }, [expired.data, soon.data]);
  const value = (rows: ProductBatch[]) => rows.reduce((a, b) => a + b.quantity * b.costPrice, 0);
  const term = search.trim().toLowerCase();
  const rows = lists[tab].filter((b) => !term || [b.product?.name, b.variant?.name, b.batchNumber].some((v) => v?.toLowerCase().includes(term)))
    .sort((a, b) => (a.expiryDate ?? '').localeCompare(b.expiryDate ?? ''));
  const loading = expired.isLoading || soon.isLoading;

  const report = useMutation({
    mutationFn: (b: ProductBatch) => damageApi.create({
      productId: b.productId, variantId: b.variantId ?? undefined, batchId: b.id, quantity: b.quantity,
      reason: t('Expire ho gaya ({{expiryDate}})', { expiryDate: dayOnly(b.expiryDate) }), reasonCode: 'EXPIRY', notes: t('Batch {{batchNumber}}', { batchNumber: b.batchNumber }),
    }),
    onSuccess: (d) => { toast.success(t('{{damageNumber}} — manzoori ke baad stock se nikal jayega', { damageNumber: d.damageNumber })); setWriteOff(null); qc.invalidateQueries({ queryKey: [COSMETICS_KEYS.expiry] }); qc.invalidateQueries({ queryKey: ['damage'] }); },
    onError: (e) => toast.error(apiError(e, t('Report nahi bani'))),
  });

  const doc = (): PrintDoc => ({
    title: tab === 'expired' ? t('Expire maal') : t('{{tab}} din me expire', { tab }),
    meta: [[t('Date'), dayOnly(new Date().toISOString())]],
    sections: [{
      kind: 'table',
      columns: [{ label: t('Product') }, { label: t('Batch') }, { label: t('Expiry') }, { label: t('Qty'), align: 'right' }, { label: t('Cost'), align: 'right', wideOnly: true }],
      rows: rows.map((b) => [[b.product?.name, b.variant?.name].filter(Boolean).join(' · '), b.batchNumber, dayOnly(b.expiryDate), String(b.quantity), String(Math.round(b.quantity * b.costPrice))]),
    }],
  });

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title={t('Expiry — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: CalendarClock, color: '#d97706', title: t('30 din'), text: t('Jo 30 din me expire hoga use counter par discount laga kar pehle bechein — counter waise bhi purani expiry pehle uthata hai.') },
            { icon: CalendarX, color: '#e11d48', title: t('Expire ho gaya'), text: t('Expire maal shelf se hatayein aur "Nikaal dein" — damage record banta hai, manzoori ke baad stock se nikalta hai.') },
            { icon: Percent, color: '#16a34a', title: t('Deal'), text: t('Qareeb expiry ka maal deal (combo) me daal dein — Deals page se.') },
          ]}
          shortcuts={[['/', 'search'], ['G', 'guide']]} />
      )}
      {writeOff && (
        <Modal open onClose={() => setWriteOff(null)} size="sm" title={t('Expire maal nikaalein?')} description={t('Damage record banega; manzoori ke baad stock se nikalta hai aur nuksan report me aata hai.')}
          footer={<><Button variant="secondary" onClick={() => setWriteOff(null)}>{t('Rehne dein')}</Button><Button variant="danger" loading={report.isPending} onClick={() => report.mutate(writeOff)}>{t('Nikaal dein')}</Button></>}>
          <p className="text-[0.875rem] text-slate-700">{t('{{name}}{{value}} — batch {{batchNumber}}, {{quantity}} {{unit}}, cost {{value2}}', { name: writeOff.product?.name, value: writeOff.variant ? ` · ${writeOff.variant.name}` : '', batchNumber: writeOff.batchNumber, quantity: writeOff.quantity, unit: writeOff.product?.unit, value2: money(writeOff.quantity * writeOff.costPrice) })}</p>
        </Modal>
      )}

      <PageHero title={t('Expiry')} chip={<><CalendarClock />{rows.length}</>} loading={loading} meta={t('Batch aur expiry — pehle purana bechein')}
        actions={<>
          <PrintButton doc={doc} disabled={!rows.length} size="sm" />
          <button type="button" className={heroButton} onClick={() => rows.length ? downloadCsv('expiry.csv', [[t('Product'), t('Shade'), t('Batch'), t('Expiry'), t('Din'), t('Qty'), t('Cost')], ...rows.map((b) => [b.product?.name, b.variant?.name, b.batchNumber, b.expiryDate?.slice(0, 10), daysFrom(b.expiryDate), b.quantity, b.quantity * b.costPrice])]) : toast.error(t('List khali hai'))}><Download className="h-4 w-4" /><span className="hidden sm:inline">{t('CSV')}</span></button>
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: t('Expire maal (cost)'), value: money(value(lists.expired)) },
          { label: t('30 din me (cost)'), value: money(value(lists['30'])) },
          { label: t('90 din me (cost)'), value: money(value(lists['90'])) },
        ]} />

      <KpiRow cols={3}>
        {loading ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={CalendarX} color="#e11d48" label={t('Expire ho gaye')} value={lists.expired.length} hint={t('Shelf se hatayein')} onClick={() => setTab('expired')} active={tab === 'expired'} />
            <KpiCard icon={CalendarClock} color="#d97706" label={t('30 din me')} value={lists['30'].length} hint={t('Discount laga kar bechein')} onClick={() => setTab('30')} active={tab === '30'} />
            <KpiCard icon={CalendarClock} color="#0891b2" label={t('90 din me')} value={lists['90'].length} onClick={() => setTab('90')} active={tab === '90'} />
          </>
        )}
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={t('Product, shade ya batch…')} />} />
      <ViewTabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'expired', label: t('Expire ho gaye'), icon: CalendarX, count: lists.expired.length }, { id: '30', label: t('30 din'), count: lists['30'].length }, { id: '90', label: t('90 din'), count: lists['90'].length }]} />

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {loading ? <div className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          : expired.isError || soon.isError ? <EmptyState title={t('List nahi khuli')} description={t('Dobara koshish karein')} action={<Button variant="secondary" onClick={() => { void expired.refetch(); void soon.refetch(); }}>{t('Dobara')}</Button>} />
          : !rows.length ? <EmptyState icon={<PackageX className="h-7 w-7" />} title={tab === 'expired' ? t('Koi expire maal nahi') : t('Is muddat me kuch expire nahi ho raha')} description={t('Purchase par batch aur expiry likhein to yahan dikhta hai.')} />
          : (
            <Table minWidth="48rem">
              <THead><Tr><Th>{t('Product')}</Th><Th>{t('Batch')}</Th><Th>{t('Expiry')}</Th><Th align="right">{t('Stock')}</Th><Th align="right">{t('Cost')}</Th><Th align="right" /></Tr></THead>
              <TBody>
                {rows.map((b) => {
                  const d = daysFrom(b.expiryDate);
                  return (
                    <Tr key={b.id}>
                      <Td><Link to={`/cosmetics-products/${b.productId}`} className="font-semibold text-slate-900 hover:text-brand-700">{b.product?.name}</Link>{b.variant && <p className="text-[0.75rem] text-slate-500">{b.variant.name}</p>}</Td>
                      <Td className="font-mono text-[0.8125rem]">{b.batchNumber}</Td>
                      <Td className="whitespace-nowrap"><p>{dayOnly(b.expiryDate)}</p><p className={d != null && d < 0 ? 'text-[0.75rem] font-semibold text-rose-600' : 'text-[0.75rem] text-amber-700'}>{d == null ? '' : d < 0 ? t('{{value}} din pehle', { value: -d }) : d === 0 ? t('Aaj') : t('{{d}} din baqi', { d })}</p></Td>
                      <Td align="right">{b.quantity} {b.product?.unit}</Td>
                      <Td align="right">{money(b.quantity * b.costPrice)}</Td>
                      <Td align="right">{canReport && d != null && d < 0 && <Button size="xs" variant="ghost" className="text-rose-700" leftIcon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setWriteOff(b)}>{t('Nikaal dein')}</Button>}</Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          )}
      </section>
    </PageShell>
  );
}
