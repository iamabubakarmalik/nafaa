/**
 * One stitching order: the progress strip with the next step, garments and
 * their rates, the naap taken at booking, design and pictures, every
 * payment, and the bill once delivered. Slips, WhatsApp and edit are in the
 * header.
 *
 * Keys: E edit · P payment · G guide · Esc back.
 */

import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Ban, Check, GraduationCap, MessageCircle, Pause, Pencil, Phone, Printer, Receipt, Ruler, Scissors, Shirt, Undo2, UserRound, Wallet,
} from 'lucide-react';
import { Button, Card, Kbd, PageHero, PageShell, Skeleton, heroButton, heroIconButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { waLink } from '@core/lib/whatsapp/templates';
import { useAuthStore } from '@core/stores/auth.store';
import { useReceiptSetup } from '@core/receipt/setup';
import { tailoringApi } from '../api/tailoring.api';
import {
  TAILORING_FLOW, TAILORING_KEY, TAILORING_PREV, dayFull, dueOf, flowIndex, garmentLabel, isClosed, priorityOf, tailoringNext, tailoringStatus, whenText,
} from '../components/meta';
import { useGarmentsCan } from '../components/permissions';
import { measureLines, printTailoringSlip, tailoringMessage } from '../components/slips';
import { useTailoringActions } from '../components/tailoring/useTailoringActions';
import { Trans, t } from '@core/i18n';

const METHOD: Record<string, string> = { CASH: t('Cash'), CARD: t('Card'), BANK: t('Bank'), BANK_TRANSFER: t('Bank'), JAZZCASH: 'JazzCash', EASYPAISA: 'Easypaisa' };

export default function TailoringDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Dukaan';
  const { manage } = useGarmentsCan();
  const guide = usePageGuide();
  const act = useTailoringActions();
  useReceiptSetup();
  const q = useQuery({ queryKey: [TAILORING_KEY, 'one', id], queryFn: () => tailoringApi.getOne(id), enabled: !!id });
  const o = q.data;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen() || !o) return;
      const open = !isClosed(o.orderStatus);
      if ((e.key === 'e' || e.key === 'E') && manage && open) navigate(`/garments/tailoring/new?edit=${o.id}`);
      if ((e.key === 'p' || e.key === 'P') && manage && open && dueOf(o) > 0.5) act.pay(o);
      if (e.key === 'Escape') navigate('/garments/tailoring');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (q.isLoading) return <PageShell><Skeleton className="h-36 rounded-3xl" /><div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-96 rounded-2xl lg:col-span-2" /><Skeleton className="h-96 rounded-2xl" /></div></PageShell>;
  if (!o) {
    return <PageShell><div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">{t('Order nahi mila')}</p><Button className="mt-3" variant="secondary" onClick={() => navigate('/garments/tailoring')}>{t('Orders par wapas')}</Button></div></PageShell>;
  }

  const st = tailoringStatus(o.orderStatus);
  const closed = isClosed(o.orderStatus);
  const next = tailoringNext(o.orderStatus);
  const due = dueOf(o);
  const step = flowIndex(o.orderStatus);
  const wa = waLink(o.customerPhone, tailoringMessage(o, shopName));
  const naap = measureLines(o.measurementProfile ?? (o.items[0]?.measurementSnapshot as Record<string, unknown> | undefined));
  const busy = act.busyId === o.id;

  return (
    <PageShell>
      <PageHero
        back="/garments/tailoring"
        backLabel={t('Wapas (Esc)')}
        title={o.customerName || t('Customer')}
        chip={<>{st.label}{(o.priority === 'HIGH' || o.priority === 'URGENT') && !closed && <span className="ms-1 rounded-full bg-rose-500/90 px-2 text-white">{priorityOf(o.priority).label}</span>}</>}
        subtitle={<>{t('{{orderNumber}} · book {{orderDate}}{{value}}', { orderNumber: o.orderNumber, orderDate: dayFull(o.orderDate), value: o.tailorName ? t(' · karigar {{tailorName}}', { tailorName: o.tailorName }) : '' })}</>}
        actions={<>
          <button type="button" onClick={() => printTailoringSlip(o, shopName)} className={heroButton}><Printer className="h-4 w-4" />{t('Parchi')}</button>
          <button type="button" onClick={() => printTailoringSlip(o, shopName, true)} className={heroButton}><Scissors className="h-4 w-4" /><span className="hidden sm:inline">{t('Karigar parchi')}</span></button>
          {wa && <a href={wa} target="_blank" rel="noreferrer" className={heroButton}><MessageCircle className="h-4 w-4" /><span className="hidden sm:inline">{t('WhatsApp')}</span></a>}
          {manage && !closed && <Link to={`/garments/tailoring/new?edit=${o.id}`} title={t('Badlein (E)')} className={heroButton}><Pencil className="h-4 w-4" /><span className="hidden sm:inline">{t('Badlein')}</span></Link>}
          <button type="button" onClick={guide.open} title={t('Guide (G)')} aria-label={t('Guide')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: t('Kul'), value: formatPKR(o.total) },
          { label: t('Mila'), value: formatPKR(o.paidAmount) },
          { label: o.orderStatus === 'DELIVERED' ? t('Khate me') : t('Baqi'), value: formatPKR(due) },
          {
            label: closed ? (o.orderStatus === 'DELIVERED' ? t('Diya') : t('Cancel')) : t('Dena hai'),
            value: closed ? dayFull(o.deliveredAt ?? o.cancelledAt) : o.promisedDate ? `${whenText(o.promisedDate)} · ${dayFull(o.promisedDate)}` : '—',
          },
        ]}
      />

      {o.orderStatus !== 'CANCELLED' && (
        <Card className="rounded-2xl">
          <ol className="flex items-center gap-1 overflow-x-auto pb-1">
            {TAILORING_FLOW.map((f, i) => (
              <li key={f.label} className="flex min-w-[5.5rem] flex-1 items-center gap-1">
                <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.75rem] font-bold',
                  i < step || o.orderStatus === 'DELIVERED' ? 'bg-success-600 text-white' : i === step ? 'bg-brand-600 text-white ring-4 ring-brand-100' : 'bg-slate-100 text-slate-400')}>
                  {i < step || o.orderStatus === 'DELIVERED' ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span className={cn('truncate text-[0.75rem] font-semibold', i === step ? 'text-slate-900' : 'text-slate-500')}>{f.label}</span>
                {i < TAILORING_FLOW.length - 1 && <span className={cn('h-0.5 flex-1 rounded', i < step ? 'bg-success-500' : 'bg-slate-200')} />}
              </li>
            ))}
          </ol>
          {manage && !closed && (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              {next && <Button variant={next.to === 'DELIVER' ? 'success' : 'primary'} loading={busy} onClick={() => act.next(o)} leftIcon={next.to === 'DELIVER' ? <Receipt className="h-4 w-4" /> : <Scissors className="h-4 w-4" />}>{next.label}</Button>}
              {due > 0.5 && <Button variant="secondary" onClick={() => act.pay(o)} leftIcon={<Wallet className="h-4 w-4" />}>{t('Paisa mila')}{' '} <Kbd className="ms-1">P</Kbd></Button>}
              {['CONFIRMED', 'CUTTING'].includes(o.orderStatus) && <Button variant="ghost" disabled={busy} onClick={() => act.setStatus(o, 'FABRIC_PENDING')} leftIcon={<Pause className="h-4 w-4" />}>{t('Kapre ka intezar')}</Button>}
              {o.orderStatus === 'STITCHING' && <Button variant="ghost" disabled={busy} onClick={() => act.setStatus(o, 'EMBROIDERY')} leftIcon={<Shirt className="h-4 w-4" />}>{t('Kadhai par bheja')}</Button>}
              {TAILORING_PREV[o.orderStatus] && <Button variant="ghost" disabled={busy} onClick={() => act.back(o)} leftIcon={<Undo2 className="h-4 w-4" />}>{t('Ek qadam peeche')}</Button>}
              <Button variant="ghost" className="ms-auto text-rose-700" onClick={() => act.cancel(o)} leftIcon={<Ban className="h-4 w-4" />}>{t('Cancel')}</Button>
            </div>
          )}
          {o.orderStatus === 'DELIVERED' && o.bill && (
            <p className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-[0.875rem] text-slate-700">
              <Receipt className="h-4 w-4 text-success-600" /><Trans text="Bill {{bill}} bana — {{total}}" values={{ bill: <strong>{o.bill.saleNumber}</strong>, total: formatPKR(o.bill.total) }} />
              {o.bill.creditAmount > 0.5 && <span className="text-amber-700">{t('· {{creditAmount}} khate par', { creditAmount: formatPKR(o.bill.creditAmount) })}</span>}
              <Link to={`/sales/${o.bill.id}/receipt`} className="ms-auto font-semibold text-brand-700 hover:underline">{t('Bill dekhein →')}</Link>
            </p>
          )}
        </Card>
      )}
      {o.orderStatus === 'CANCELLED' && (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-[0.875rem] text-rose-900 ring-1 ring-rose-200">
          {t('Cancel {{cancelledAt}}{{value}}.{{value2}}', { cancelledAt: dayFull(o.cancelledAt), value: o.cancellationReason ? ` — ${o.cancellationReason}` : '', value2: o.paidAmount > 0 ? t(' {{paidAmount}} customer ke khate me advance ban kar jama hain.', { paidAmount: formatPKR(o.paidAmount) }) : '' })}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" flush title={<T icon={Shirt}>{t('Kapre')}</T>} description={t('{{value}} piece', { value: o.items.reduce((s, i) => s + i.quantity, 0) })}>
            <ul className="divide-y divide-slate-100">
              {o.items.map((i) => (
                <li key={i.id} className="flex gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{i.quantity > 1 ? t('{{quantity}}x ', { quantity: i.quantity }) : ''}{i.garmentName}<span className="ms-2 text-[0.75rem] font-normal text-slate-500">{garmentLabel(i.categoryType)}</span></p>
                    <p className="text-[0.8125rem] text-slate-600">
                      {i.fabricProductId ? t('Kapra dukaan ka: {{value}}{{value2}}', { value: i.fabricName ?? '—', value2: i.fabricMeters ? t(' ({{fabricMeters}} m)', { fabricMeters: i.fabricMeters }) : '' }) : i.fabricCost > 0 ? t('Kapra dukaan ka (bahar se)') : t('Kapra customer ka')}
                      {i.size ? t(' · Size {{size}}', { size: i.size }) : ''}{i.colorName ? ` · ${i.colorName}` : ''}
                    </p>
                    {i.designNotes && <p className="text-[0.8125rem] text-fuchsia-700">{i.designNotes}</p>}
                    <p className="mt-1 text-[0.75rem] text-slate-500">
                      {t('Silai {{stitchingCost}}{{value}}{{value2}}{{value3}}', { stitchingCost: formatPKR(i.stitchingCost), value: i.embroideryCost > 0 ? t(' · Kadhai {{embroideryCost}}', { embroideryCost: formatPKR(i.embroideryCost) }) : '', value2: i.accessoryCost > 0 ? t(' · Button/lace {{accessoryCost}}', { accessoryCost: formatPKR(i.accessoryCost) }) : '', value3: i.fabricCost > 0 ? t(' · Kapra {{fabricCost}}', { fabricCost: formatPKR(i.fabricCost) }) : '' })}
                    </p>
                  </div>
                  <p className="shrink-0 font-bold tabular-nums">{formatPKR(i.total)}</p>
                </li>
              ))}
            </ul>
            <dl className="space-y-1 border-t border-slate-100 px-4 py-3 text-[0.875rem] sm:px-5">
              <div className="flex justify-between"><dt className="text-slate-500">{t('Kul')}</dt><dd className="tabular-nums">{formatPKR(o.subtotal)}</dd></div>
              {o.discount > 0 && <div className="flex justify-between"><dt className="text-slate-500">{t('Discount')}</dt><dd className="tabular-nums text-rose-700">−{formatPKR(o.discount)}</dd></div>}
              {o.taxAmount > 0 && <div className="flex justify-between"><dt className="text-slate-500">{t('Tax')}</dt><dd className="tabular-nums">{formatPKR(o.taxAmount)}</dd></div>}
              <div className="flex justify-between text-base font-bold"><dt>{t('Customer dega')}</dt><dd className="tabular-nums">{formatPKR(o.total)}</dd></div>
            </dl>
          </Card>

          {(o.designInstructions || o.designReferenceUrls?.length > 0) && (
            <Card className="rounded-2xl" title={<T icon={Scissors}>{t('Design')}</T>}>
              {o.designInstructions && <p className="whitespace-pre-line text-[0.875rem] text-slate-700">{o.designInstructions}</p>}
              {o.designReferenceUrls?.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {o.designReferenceUrls.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200"><img src={u} alt="" className="h-full w-full object-cover" /></a>)}
                </div>
              )}
            </Card>
          )}
          {o.internalNotes && <Card className="rounded-2xl" title={t('Andar ka note')}><p className="whitespace-pre-line text-[0.875rem] text-slate-700">{o.internalNotes}</p></Card>}
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={UserRound}>{t('Customer')}</T>}>
            <p className="font-semibold text-slate-900">{o.customerName || '—'}</p>
            {o.customerPhone && <a href={`tel:${o.customerPhone}`} className="mt-1 inline-flex items-center gap-1.5 text-[0.875rem] text-brand-700 hover:underline"><Phone className="h-4 w-4" />{o.customerPhone}</a>}
            {o.customer && (
              <p className="mt-2 text-[0.8125rem] text-slate-600">
                {t('Khata:')}{' '} {o.customer.balance > 0.5 ? <span className="font-semibold text-rose-700">{t('{{balance}} udhaar', { balance: formatPKR(o.customer.balance) })}</span> : o.customer.balance < -0.5 ? <span className="font-semibold text-success-700">{t('{{formatPKR}} advance jama', { formatPKR: formatPKR(-o.customer.balance) })}</span> : 'saaf'}
                <Link to={`/customers/${o.customer.id}`} className="ms-2 font-semibold text-brand-700 hover:underline">{t('Khata →')}</Link>
              </p>
            )}
            {o.customerNotes && <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-700 ring-1 ring-slate-200">{o.customerNotes}</p>}
          </Card>

          <Card className="rounded-2xl" title={<T icon={Ruler}>{o.measurementProfile ? t('Naap — {{name}}', { name: t(o.measurementProfile.profileName) }) : t('Naap')}</T>}>
            {naap.length ? <div className="space-y-0.5 text-[0.8125rem] text-slate-700">{naap.map((l) => <p key={l}>{l}</p>)}</div>
              : <p className="text-[0.8125rem] text-slate-500">{t('Is order ke saath naap nahi liya gaya')}</p>}
          </Card>

          <Card className="rounded-2xl" flush title={<T icon={Wallet}>{t('Payments')}</T>} description={o.payments?.length ? t('{{count}} dafa', { count: o.payments.length }) : t('Abhi koi payment nahi')}>
            {!!o.payments?.length && (
              <ul className="divide-y divide-slate-100">
                {o.payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[0.8125rem] sm:px-5">
                    <span className="min-w-0"><span className="block font-medium text-slate-800">{dayFull(p.paidAt)} · {METHOD[p.paymentMethod] ?? p.paymentMethod}</span>
                      <span className="text-[0.75rem] text-slate-500">{[p.notes, p.receivedByName].filter(Boolean).join(' · ') || '—'}</span></span>
                    <span className="font-semibold tabular-nums text-success-700">{formatPKR(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className={cn('px-4 py-3 text-[0.75rem] text-slate-500 sm:px-5', o.payments?.length && 'border-t border-slate-100')}>
              {t('Suit dene se pehle ka paisa customer ke khate me advance ban kar jama hota hai; dene par bill banta hai aur advance us me kat jata hai.')}
            </p>
          </Card>
        </div>
      </div>

      {act.modals}

      {guide.isOpen && (
        <PageGuide title={t('Silai order')} onClose={guide.close}
          steps={[
            { icon: Scissors, color: '#7c3aed', title: t('Agla qadam'), text: t('Upar wala button order ko agle qadam par le jata hai. Kapra nahi aaya to "Kapre ka intezar", kadhai par bheja to "Kadhai par bheja".') },
            { icon: Wallet, color: '#0891b2', title: t('Paisa mila (P)'), text: t('Trial ya kisi bhi waqt jo paisa mile, yahan likhein — cash, card, bank ya JazzCash.') },
            { icon: Receipt, color: '#16a34a', title: t('De diya'), text: t('Suit dete hi bill banta hai. Jo baqi reh jaye woh customer ke khate me udhaar ban jata hai.') },
            { icon: Printer, color: '#ea580c', title: t('Parchi'), text: t('Customer parchi me paisa; karigar parchi me sirf naap aur design.') },
          ]}
          shortcuts={[['E', t('badlein')], ['P', t('paisa mila')], ['Esc', t('wapas')], ['G', t('guide')]]}
        />
      )}
    </PageShell>
  );
}

const T = ({ icon: Icon, children }: { icon: typeof UserRound; children: string }) => <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{children}</span>;
