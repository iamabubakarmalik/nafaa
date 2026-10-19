/**
 * Monthly milk bills: a statement of one month's deliveries with the khata
 * balance before and after. Deliveries are already on the khata, so a bill
 * books no money; payments taken here go on the khata and every bill's
 * "baqi" follows it. Print or send on WhatsApp.
 */

import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Download, FileText, GraduationCap, ListChecks, MessageCircle, Wallet } from 'lucide-react';
import {
  Button, FilterBar, FilterChip, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { monthlyBillsApi, type MonthlyBill } from '../api/monthly-bills.api';
import { Empty, ListCard, ListLoading, MoneyModal, Pill } from '../components/ui';
import { useDebounced, usePageKeys } from '../hooks/usePageKeys';
import { MONEY_KEYS, MONTHS, errorText, liters, monthLabel, qty, shortDate, slotLabel } from '../lib/meta';

type Tab = 'unpaid' | 'paid' | 'all';

function billDoc(b: MonthlyBill, money: (n: number) => string): PrintDoc {
  const days = (b.deliveries ?? []).map((d) => [shortDate(d.deliveryDate), slotLabel(d.slot), d.status === 'DELIVERED' ? qty(d.deliveredQty) : 'Naga', d.status === 'DELIVERED' ? money(d.totalAmount) : '']);
  return {
    title: `Doodh ka bill — ${monthLabel(b.month, b.year)}`, subtitle: `${b.customer?.name ?? ''} (${b.customer?.customerNumber ?? ''})`,
    meta: [['Bill', b.billNumber], ['Phone', b.customer?.phone ?? '—']],
    sections: [
      { kind: 'table', title: 'Delivery', columns: [{ label: 'Tareekh' }, { label: 'Waqt' }, { label: 'Liter' }, { label: 'Amount', align: 'right' }], rows: days,
        footer: ['Kul', '', qty(b.totalLiters), money(b.totalAmount)] },
      { kind: 'rows', rows: [
        { label: 'Pichla baqi', value: money(b.openingBalance) },
        { label: `Is mahine (${liters(b.totalLiters)})`, value: money(b.totalAmount) },
        { label: 'Is mahine jama / doosre hisaab', value: money(Math.round((b.openingBalance + b.totalAmount - b.closingBalance) * 100) / 100), sub: true },
        { label: 'Mahine ke aakhir tak kul', value: money(b.closingBalance), strong: true },
        { label: 'Is bill par abhi baqi', value: money(b.remainingAmount), strong: true },
      ] },
    ],
    footer: 'Shukriya — doodh ka hisaab',
  };
}

export default function MonthlyBillsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const { sales: money } = useMasked();
  const canKhata = usePermission(PERMISSIONS.KHATA_MANAGE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [params, setParams] = useSearchParams();
  const last = useMemo(() => { const d = new Date(); d.setDate(0); return { month: d.getMonth() + 1, year: d.getFullYear() }; }, []);
  const [period, setPeriod] = useState(last);
  const [tab, setTab] = useState<Tab>('unpaid');
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const openId = params.get('bill');

  const listQ = useQuery({ queryKey: ['dairy-bills', period, q], queryFn: () => monthlyBillsApi.all({ ...period, search: q || undefined }) });
  const all = useMemo(() => listQ.data ?? [], [listQ.data]);
  const rows = all.filter((b) => (tab === 'all' ? true : tab === 'paid' ? b.isPaid : !b.isPaid));
  const totals = useMemo(() => ({
    billed: all.reduce((s, b) => s + b.totalAmount, 0), due: all.reduce((s, b) => s + b.remainingAmount, 0),
    liters: all.reduce((s, b) => s + b.totalLiters, 0), paid: all.filter((b) => b.isPaid).length,
  }), [all]);
  usePageKeys(searchRef);

  const makeAll = useMutation({
    mutationFn: () => monthlyBillsApi.makeAll(period),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['dairy-bills'] }); toast.success(`${r.generated} naye bill bane${r.updated ? `, ${r.updated} purane bill naye hisaab se theek` : ''}`, { description: r.total - r.generated - r.updated ? `${r.total - r.generated - r.updated} customers ki is mahine koi delivery nahi` : undefined }); },
    onError: (e) => toast.error(errorText(e, 'Bill nahi bane')),
  });

  const years = [last.year - 1, last.year, new Date().getFullYear()].filter((v, i, a) => a.indexOf(v) === i);
  const exportCsv = () => {
    if (!rows.length) { toast.error('Is filter me koi bill nahi'); return; }
    downloadCsv(`doodh-bill-${period.year}-${period.month}.csv`, [
      ['Bill', 'Customer', 'Number', 'Phone', 'Liter', 'Delivery', 'Amount', 'Pichla baqi', 'Kul', 'Abhi baqi', 'Ada'],
      ...rows.map((b) => [b.billNumber, b.customer?.name, b.customer?.customerNumber, b.customer?.phone, b.totalLiters, b.totalDeliveries, b.totalAmount, b.openingBalance, b.closingBalance, b.remainingAmount, b.isPaid ? 'Haan' : 'Nahi']),
    ]);
  };
  const listDoc = (): PrintDoc => ({
    title: `Doodh ke bill — ${monthLabel(period.month, period.year)}`, subtitle: tab === 'unpaid' ? 'Baqi' : tab === 'paid' ? 'Ada' : 'Sab',
    meta: [['Bill', String(rows.length)], ['Baqi', money(rows.reduce((s, b) => s + b.remainingAmount, 0))]],
    sections: [{ kind: 'table', title: 'Bill', columns: [{ label: 'Customer' }, { label: 'Liter' }, { label: 'Amount', align: 'right' }, { label: 'Baqi', align: 'right' }],
      rows: rows.map((b) => [`${b.customer?.name ?? ''} (${b.billNumber})`, qty(b.totalLiters), money(b.totalAmount), money(b.remainingAmount)]) }],
  });

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Mahine ke bill — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: FileText, color: '#7c3aed', title: 'Bill banayein', text: 'Mahina chun kar "Sab ke bill banayein" — har customer ki poore mahine ki delivery ka statement banta hai. Dobara dabane se pehle bane bill naye hisaab se theek ho jate hain.' },
            { icon: MessageCircle, color: '#16a34a', title: 'Bhejein', text: 'Bill khol kar Print karein ya WhatsApp par bhejein.' },
            { icon: Wallet, color: '#d97706', title: 'Payment', text: 'Paise mile to bill par "Payment lein" — khate me jama hote hain. Khata page se li payment bhi yahan khud dikhti hai.' },
          ]}
          shortcuts={[['/', 'search'], ['G', 'guide']]} />
      )}

      <PageHero title="Mahine ke bill" chip={<>{monthLabel(period.month, period.year)}</>} busy={listQ.isFetching && !listQ.isLoading} loading={listQ.isLoading}
        meta="Ghar delivery ka mahina-war hisaab — print ya WhatsApp"
        actions={<>
          <button type="button" onClick={exportCsv} className={heroButton}><Download className="h-4 w-4" />CSV</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={listDoc} label="List print" /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canKhata && <button type="button" onClick={() => makeAll.mutate()} disabled={makeAll.isPending} className={heroPrimaryButton}><FileText className="h-4 w-4" />{makeAll.isPending ? 'Ban rahe…' : 'Sab ke bill banayein'}</button>}
        </>}
        stats={[
          { label: 'Kul bill', value: money(totals.billed) },
          { label: 'Abhi baqi', value: money(totals.due) },
          { label: 'Doodh', value: liters(totals.liters) },
        ]} />

      <KpiRow cols={3}>
        {listQ.isLoading ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Wallet} color="#e11d48" label="Baqi" value={all.length - totals.paid} hint={money(totals.due)} onClick={() => setTab('unpaid')} active={tab === 'unpaid'} />
            <KpiCard icon={CheckCircle2} color="#16a34a" label="Ada" value={totals.paid} onClick={() => setTab('paid')} active={tab === 'paid'} />
            <KpiCard icon={FileText} color="#7c3aed" label="Sab bill" value={all.length} onClick={() => setTab('all')} active={tab === 'all'} />
          </>
        )}
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Customer ka naam, number, phone ya bill number…" />}
        chips={search.trim() ? <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip> : undefined} onClear={() => setSearch('')}>
        <Select aria-label="Mahina" value={String(period.month)} onChange={(e) => setPeriod((p) => ({ ...p, month: Number(e.target.value) }))} options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))} />
        <Select aria-label="Saal" value={String(period.year)} onChange={(e) => setPeriod((p) => ({ ...p, year: Number(e.target.value) }))} options={years.map((y) => ({ value: String(y), label: String(y) }))} />
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab} hint="Bill par click kar ke kholein"
        tabs={[{ id: 'unpaid', label: 'Baqi', icon: Wallet, count: all.length - totals.paid }, { id: 'paid', label: 'Ada', icon: CheckCircle2, count: totals.paid }, { id: 'all', label: 'Sab', icon: ListChecks, count: all.length }]} />

      <ListCard>
        {listQ.isLoading ? <ListLoading /> : rows.length === 0 ? (
          <Empty icon={FileText} title={all.length ? 'Is tab me koi bill nahi' : `${monthLabel(period.month, period.year)} ke bill abhi nahi bane`}
            text="Mahina khatam hone par sab customers ke bill ek saath banayein."
            action={canKhata && !all.length ? <Button leftIcon={<FileText className="h-4 w-4" />} loading={makeAll.isPending} onClick={() => makeAll.mutate()}>Sab ke bill banayein</Button> : undefined} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((b) => (
              <li key={b.id}>
                <button type="button" onClick={() => setParams({ bill: b.id })} className="grid w-full gap-2 px-4 py-3 text-left hover:bg-slate-50 sm:px-5 lg:grid-cols-[minmax(0,1.5fr)_9rem_9rem_9rem_auto] lg:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{b.customer?.name ?? 'Customer'} <span className="font-mono text-[0.75rem] font-normal text-slate-400">{b.billNumber}</span></p>
                    <p className="truncate text-[0.75rem] text-slate-500">{[b.customer?.phone, b.customer?.route?.name].filter(Boolean).join(' · ') || '—'}</p>
                  </div>
                  <p className="text-[0.8125rem] text-slate-700">{liters(b.totalLiters)} · {b.totalDeliveries} delivery</p>
                  <p className="text-[0.875rem] font-semibold tabular-nums text-slate-900">{money(b.totalAmount)}</p>
                  <p className={cn('text-[0.875rem] font-semibold tabular-nums', b.remainingAmount > 0.009 ? 'text-rose-700' : 'text-success-700')}>{b.remainingAmount > 0.009 ? `${money(b.remainingAmount)} baqi` : 'Ada'}</p>
                  <div className="flex justify-end gap-1.5">{b.sentToCustomer && <Pill tone="bg-blue-50 text-blue-700 ring-blue-200">Bheja</Pill>}{b.isPrinted && <Pill tone="bg-slate-100 text-slate-600 ring-slate-200">Print</Pill>}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </ListCard>

      {openId && <BillModal id={openId} canKhata={canKhata} onClose={() => setParams({})} onChanged={() => MONEY_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))} />}
    </PageShell>
  );
}

function BillModal({ id, canKhata, onClose, onChanged }: { id: string; canKhata: boolean; onClose: () => void; onChanged: () => void }) {
  const { sales: money } = useMasked();
  const [paying, setPaying] = useState(false);
  const q = useQuery({ queryKey: ['dairy-bills', 'one', id], queryFn: () => monthlyBillsApi.getOne(id) });
  const b = q.data;
  const pay = useMutation({
    mutationFn: (v: { amount: number; paymentMethod: string; reference?: string }) => monthlyBillsApi.payment(id, v),
    onSuccess: () => { onChanged(); setPaying(false); void q.refetch(); toast.success('Payment khate me jama'); },
    onError: (e) => toast.error(errorText(e, 'Payment save nahi hui')),
  });
  const sent = useMutation({ mutationFn: () => monthlyBillsApi.markSent(id), onSuccess: () => { onChanged(); void q.refetch(); } });
  const printed = useMutation({ mutationFn: () => monthlyBillsApi.markPrinted(id), onSuccess: () => onChanged() });

  const whatsapp = () => {
    if (!b) return;
    const phone = (b.customer?.phone ?? '').replace(/\D/g, '').replace(/^0/, '92');
    const text = `${b.customer?.name ?? ''} sahib, ${monthLabel(b.month, b.year)} ka doodh: ${liters(b.totalLiters)} — ${money(b.totalAmount)}.\nPichla baqi ${money(b.openingBalance)}, kul ${money(b.closingBalance)}.\nAbhi baqi: ${money(b.remainingAmount)}. Bill ${b.billNumber}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    sent.mutate();
  };

  return (
    <Modal open onClose={onClose} size="lg" title={b ? `${b.customer?.name ?? ''} — ${monthLabel(b.month, b.year)}` : 'Bill'} description={b ? `${b.billNumber} · ${liters(b.totalLiters)} · ${b.totalDeliveries} delivery` : undefined}
      footer={b && <>
        <Button variant="secondary" onClick={onClose}>Band</Button>
        {b.customer?.phone && <Button variant="secondary" leftIcon={<MessageCircle className="h-4 w-4" />} onClick={whatsapp}>WhatsApp</Button>}
        <span onClickCapture={() => printed.mutate()}><PrintButton doc={() => billDoc(b, money)} label="Print" /></span>
        {canKhata && b.remainingAmount > 0.009 && <Button leftIcon={<Wallet className="h-4 w-4" />} onClick={() => setPaying(true)}>Payment lein</Button>}
      </>}>
      {!b ? <Skeleton className="h-64 rounded-xl" /> : (
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {([['Pichla baqi', b.openingBalance], ['Is mahine', b.totalAmount], ['Jama hua', b.openingBalance + b.totalAmount - b.closingBalance], ['Mahine ke aakhir', b.closingBalance], ['Is bill par baqi', b.remainingAmount]] as Array<[string, number]>).map(([k, v]) => (
              <div key={k} className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200"><dt className="text-[0.75rem] text-slate-500">{k}</dt><dd className="font-semibold tabular-nums text-slate-900">{money(v)}</dd></div>
            ))}
          </dl>
          <ul className="max-h-80 divide-y divide-slate-100 overflow-auto rounded-xl ring-1 ring-slate-200">
            {(b.deliveries ?? []).map((d) => (
              <li key={d.id} className="grid grid-cols-[6rem_5rem_1fr_auto] gap-2 px-3 py-2 text-[0.8125rem]">
                <span className="text-slate-700">{shortDate(d.deliveryDate)}</span>
                <span className="text-slate-500">{slotLabel(d.slot)}</span>
                <span className="tabular-nums text-slate-800">{d.status === 'DELIVERED' ? liters(d.deliveredQty) : 'Naga'}</span>
                <span className="text-right font-semibold tabular-nums">{d.status === 'DELIVERED' ? money(d.totalAmount) : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {paying && b && <MoneyModal title="Bill ki payment" description={`Is bill par ${money(b.remainingAmount)} baqi`} due={b.remainingAmount} max={b.remainingAmount} busy={pay.isPending} cta="Jama karein"
        hint="Zyada paise customer ke page par Payment se lein" onSubmit={(v) => pay.mutate(v)} onClose={() => setPaying(false)} />}
    </Modal>
  );
}
