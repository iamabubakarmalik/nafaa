/**
 * Wedding and event decoration contracts. A contract starts as a quote,
 * becomes confirmed with an advance, and is billed when the work is done.
 * Every advance and payment goes on the family's khata the day it comes in
 * (cash to the drawer, other methods to their account); completing makes
 * the bill, which uses those payments up. Contracts are cancelled, never
 * deleted; a voided bill re-opens the contract.
 */

import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BarChart3, Banknote, CalendarHeart, CheckCircle2, Download, GraduationCap, Hammer, Heart, ListChecks, MapPin, Pencil, Phone, Plus, Receipt,
  Sparkles, Wallet, XCircle,
} from 'lucide-react';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton,
  Switch, Textarea, ViewTabs, heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { useBusinessDayStart } from '@core/lib/business-day';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { floristProductsApi } from '../api/products.api';
import { weddingContractsApi, type WeddingContract, type WeddingInput, type WeddingStatus } from '../api/wedding-contracts.api';
import { BarList, ConfirmModal, Empty, Info, ListCard, ListLoading, MoneyModal, Pager, Pill, actionBtn, primaryBtn } from '../components/ui';
import { useDebounced, usePageKeys, useSaveKey } from '../hooks/usePageKeys';
import { FLORIST_KEYS, MONEY_KEYS, PAY_METHODS, WEDDING_STATUS, dayKey, daysFromToday, errorText, longDate, numIn, phoneOk, shortDate } from '../lib/meta';
import { t as tr, Trans } from '@core/i18n';

type Tab = 'upcoming' | 'open' | 'all' | 'analytics';
const LIMIT = 25;
const NEXT: Partial<Record<WeddingStatus, { to: WeddingStatus; label: string }>> = {
  QUOTED: { to: 'CONFIRMED', label: tr('Pakka karein') },
  CONFIRMED: { to: 'IN_PROGRESS', label: tr('Kaam shuru') },
};
const STATUS_OPTIONS = [{ value: '', label: tr('Sab halat') }, ...Object.entries(WEDDING_STATUS).map(([value, s]) => ({ value, label: s.label }))];
const due = (c: WeddingContract) => Math.max(Number(c.quotedAmount) - Number(c.advanceAmount), 0);
const couple = (c: WeddingContract) => `${c.brideName} & ${c.groomName}`;

export default function FloristWeddingsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const startHour = useBusinessDayStart();
  const { sales: money } = useMasked();
  const canWork = usePermission(PERMISSIONS.POS_USE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('upcoming');
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const [status, setStatus] = useState('');
  const [period, setPeriod] = useState<DateRangeValue>({ preset: 'all', custom: { from: '', to: '' } });
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<WeddingContract | 'new' | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const range = resolveRange(period, startHour);

  const params = {
    search: q || undefined, from: range?.from, to: range?.to, page, limit: LIMIT,
    status: status || (tab === 'open' || tab === 'upcoming' ? 'OPEN' : undefined),
    upcoming: tab === 'upcoming' && !range ? true : undefined,
  };
  const listQ = useQuery({ queryKey: [FLORIST_KEYS.weddings, 'paged', params], queryFn: () => weddingContractsApi.paged(params), enabled: tab !== 'analytics', placeholderData: (p) => p });
  const headQ = useQuery({ queryKey: [FLORIST_KEYS.weddings, 'head'], queryFn: () => weddingContractsApi.paged({ status: 'OPEN', limit: 1 }) });
  const soonQ = useQuery({ queryKey: [FLORIST_KEYS.weddings, 'soon'], queryFn: () => weddingContractsApi.paged({ status: 'OPEN', from: dayKey(), to: dayKey(new Date(Date.now() + 7 * 86_400_000)), limit: 1 }) });
  const anaQ = useQuery({
    queryKey: [FLORIST_KEYS.weddings, 'analytics', range],
    queryFn: () => weddingContractsApi.paged({ from: range?.from, to: range?.to, limit: 100 }),
    enabled: tab === 'analytics',
  });
  const rows = listQ.data?.items ?? [];
  const counts = headQ.data?.counts ?? {};
  const openC = rows.find((c) => c.id === openId) ?? null;
  usePageKeys(searchRef, { n: () => canWork && setForm('new'), a: () => setTab('analytics') });

  const refresh = () => [FLORIST_KEYS.weddings, 'florist-dashboard-overview', ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const exportCsv = () => {
    if (!rows.length) { toast.error(tr('Is filter me koi contract nahi')); return; }
    downloadCsv('florist-weddings.csv', [
      [tr('Contract'), tr('Dulhan'), tr('Dulha'), tr('Rabta'), tr('Phone'), tr('Shaadi'), tr('Jagah'), tr('Halat'), tr('Quote'), tr('Mila'), tr('Baqi')],
      ...rows.map((c) => [c.contractNumber, c.brideName, c.groomName, c.contactPerson, c.contactPhone, c.weddingDate.slice(0, 10), c.ceremonyVenue ?? '',
        WEDDING_STATUS[c.status]?.label ?? c.status, c.quotedAmount, c.advanceAmount, due(c)]),
    ]);
  };
  const printList = (): PrintDoc => ({
    title: 'Shaadi contracts', meta: [['Contracts', String(rows.length)], ['Baqi', money(listQ.data?.totals.due ?? 0)]],
    sections: [{
      kind: 'table', title: 'Contracts',
      columns: [{ label: 'Contract' }, { label: 'Jora' }, { label: 'Shaadi' }, { label: 'Jagah', wideOnly: true }, { label: 'Quote', align: 'right' }, { label: 'Baqi', align: 'right' }],
      rows: rows.map((c) => [c.contractNumber, couple(c), shortDate(c.weddingDate), c.ceremonyVenue ?? '', money(c.quotedAmount), money(due(c))]),
    }],
  });

  const analytics = useMemo(() => {
    const items = (anaQ.data?.items ?? []).filter((c) => c.status !== 'CANCELLED');
    const byMonth = new Map<string, { count: number; value: number }>();
    const byStatus = new Map<string, { count: number; value: number }>();
    const byThing = new Map<string, { count: number; value: number }>();
    const bump = (m: Map<string, { count: number; value: number }>, k: string, v: number) => { const x = m.get(k) ?? { count: 0, value: 0 }; x.count += 1; x.value += v; m.set(k, x); };
    for (const c of items) {
      bump(byMonth, c.weddingDate.slice(0, 7), c.quotedAmount);
      bump(byStatus, c.status, c.quotedAmount);
      if (c.includesStageDecoration) bump(byThing, tr('Stage'), c.quotedAmount);
      if (c.includesCarDecoration) bump(byThing, tr('Gaari'), c.quotedAmount);
      if (c.includesMehndiSetup) bump(byThing, tr('Mehndi'), c.quotedAmount);
      if (c.includesGarlands) bump(byThing, tr('Haar'), c.quotedAmount);
      if (c.includesBridalBouquet) bump(byThing, tr('Dulhan bouquet'), c.quotedAmount);
    }
    const list = (m: Map<string, { count: number; value: number }>) => [...m.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.value - a.value);
    return { items, byMonth: list(byMonth).sort((a, b) => a.key.localeCompare(b.key)), byStatus: list(byStatus), byThing: list(byThing) };
  }, [anaQ.data]);

  const clear = () => { setSearch(''); setStatus(''); setPeriod({ preset: 'all', custom: { from: '', to: '' } }); setPage(1); };
  const filtered = !!(search.trim() || status || range);

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title={tr('Shaadi aur event contracts')} onClose={guide.close}
          steps={[
            { icon: Heart, color: '#db2777', title: tr('Quote'), text: tr('"Naya contract" me jora, din, jagah aur kya kya sajana hai likhein. Quote ki amount bhi.') },
            { icon: Banknote, color: '#16a34a', title: tr('Advance'), text: tr('Advance aur baad ki payment family ke khate me jama hoti hai — cash drawer me, JazzCash / bank us account me.') },
            { icon: Hammer, color: '#d97706', title: tr('Kaam'), text: tr('"Pakka karein" → "Kaam shuru". Setup ke din list print kar ke team ko dein.') },
            { icon: Receipt, color: '#0284c7', title: tr('Mukammal = bill'), text: tr('"Mukammal" dabane par bill banta hai. Jo advance mila tha wo bill me se kat jata hai; baqi khate me rehta hai.') },
          ]}
          shortcuts={[['N', tr('naya contract')], ['/', 'search'], ['A', 'analytics'], ['G', 'guide']]} />
      )}

      <PageHero title={tr('Shaadi / event contracts')} busy={listQ.isFetching && !listQ.isLoading} loading={headQ.isLoading}
        meta={tr('Quote se bill tak — advance khate me')}
        actions={<>
          <button type="button" onClick={exportCsv} className={heroButton}><Download className="h-4 w-4" />{tr('CSV')}</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printList} label={tr('Print')} /></span>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canWork && <button type="button" onClick={() => setForm('new')} className={heroPrimaryButton}><Plus className="h-4 w-4" />{tr('Naya contract')}</button>}
        </>}
        stats={[
          { label: tr('Is hafte shaadiyan'), value: String(soonQ.data?.total ?? 0) },
          { label: tr('Chalu contracts'), value: String(headQ.data?.total ?? 0) },
          { label: tr('Chalu ka baqi'), value: money(headQ.data?.totals.due ?? 0) },
        ]} />

      <KpiRow cols={5}>
        {headQ.isLoading ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (<>
          {(['QUOTED', 'CONFIRMED', 'IN_PROGRESS'] as WeddingStatus[]).map((s, i) => (
            <KpiCard key={s} icon={[ListChecks, CalendarHeart, Hammer][i]} color={['#64748b', '#0284c7', '#d97706'][i]} label={WEDDING_STATUS[s].label}
              value={counts[s] ?? 0} active={status === s} onClick={() => { setStatus(status === s ? '' : s); setTab('all'); setPage(1); }} />
          ))}
          <KpiCard icon={Wallet} color="#16a34a" label={tr('Advance mila (chalu)')} value={money(headQ.data?.totals.received ?? 0)} hint={tr('Family ke khate me jama')} />
          <KpiCard icon={Banknote} color="#e11d48" label={tr('Baqi (chalu)')} value={money(headQ.data?.totals.due ?? 0)} hint={tr('Quote − advance')} />
        </>)}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={tr('Naam, contract, phone ya jagah…')} />}
        chips={filtered ? <>
          {search.trim() && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
          {status && <FilterChip onRemove={() => setStatus('')}>{WEDDING_STATUS[status]?.label}</FilterChip>}
          {range && <FilterChip onRemove={() => setPeriod({ preset: 'all', custom: { from: '', to: '' } })}>{range.from} → {range.to}</FilterChip>}
        </> : undefined}
        onClear={clear}>
        <FilterMenu icon={ListChecks} label={status ? WEDDING_STATUS[status]?.label : tr('Halat')} value={status} active={!!status} options={STATUS_OPTIONS} onChange={(v) => { setStatus(v); setPage(1); }} />
        <DateRangeMenu value={period} onChange={(v) => { setPeriod(v); setPage(1); }} startHour={startHour} label={tr('Shaadi ki date')} />
      </FilterBar>

      <ViewTabs value={tab} onChange={(t) => { setTab(t); setPage(1); }} hint={tr('Contract par click kar ke payment, bill aur print')}
        tabs={[
          { id: 'upcoming', label: tr('Aane wali'), icon: CalendarHeart },
          { id: 'open', label: tr('Chalu'), icon: Hammer, count: headQ.data?.total ?? null },
          { id: 'all', label: tr('Sab'), icon: ListChecks },
          { id: 'analytics', label: tr('Analytics'), icon: BarChart3 },
        ]} />

      {tab === 'analytics' ? (
        anaQ.isLoading ? <ListLoading /> : (
          <div className="space-y-4">
            <KpiRow cols={4}>
              <KpiCard icon={Heart} color="#db2777" label={tr('Contracts')} value={analytics.items.length} />
              <KpiCard icon={Receipt} color="#0284c7" label={tr('Quote')} value={money(analytics.items.reduce((t, c) => t + c.quotedAmount, 0))} />
              <KpiCard icon={Wallet} color="#16a34a" label={tr('Mila')} value={money(analytics.items.reduce((t, c) => t + c.advanceAmount, 0))} />
              <KpiCard icon={Banknote} color="#e11d48" label={tr('Baqi')} value={money(analytics.items.reduce((t, c) => t + due(c), 0))} />
            </KpiRow>
            <div className="grid gap-4 lg:grid-cols-2">
              <BarList title={tr('Mahina (shaadi ki date)')} money={money} rows={analytics.byMonth} />
              <BarList title={tr('Halat')} money={money} rows={analytics.byStatus.map((r) => ({ ...r, label: WEDDING_STATUS[r.key]?.label ?? r.key }))} />
              <BarList title={tr('Kya sajaya')} money={money} rows={analytics.byThing} />
            </div>
            {(anaQ.data?.total ?? 0) > 100 && <p className="text-[0.75rem] text-slate-500">{tr('Pehle 100 contracts ka hisaab — choti date range chunein.')}</p>}
          </div>
        )
      ) : (
        <ListCard footer={listQ.data && <Pager page={page} total={listQ.data.total} limit={LIMIT} onPage={setPage} />}>
          {listQ.isLoading ? <ListLoading /> : rows.length === 0 ? (
            <Empty icon={Heart} title={filtered ? tr('Is filter me koi contract nahi') : tr('Abhi koi contract nahi')}
              text={tr('Shaadi, mehndi ya event ki sajawat ka quote yahan banayein — advance family ke khate me jama hoga.')}
              action={canWork ? <button type="button" onClick={() => setForm('new')} className={primaryBtn}><Plus className="h-4 w-4" />{tr('Naya contract')}</button> : undefined} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((c) => {
                const left = daysFromToday(c.weddingDate);
                const owed = due(c);
                return (
                  <li key={c.id} className="grid gap-2 px-4 py-3 sm:px-5 lg:grid-cols-[minmax(0,1.6fr)_10rem_10rem_auto] lg:items-center">
                    <button type="button" onClick={() => setOpenId(c.id)} className="min-w-0 text-start">
                      <p className="truncate font-semibold text-slate-900 hover:underline">{couple(c)} <span className="font-mono text-[0.75rem] font-normal text-slate-400">{c.contractNumber}</span></p>
                      <p className="truncate text-[0.75rem] text-slate-500">{[c.contactPerson, c.contactPhone, c.ceremonyVenue].filter(Boolean).join(' · ')}</p>
                    </button>
                    <p className="text-[0.8125rem] text-slate-700">{shortDate(c.weddingDate)}
                      <span className={cn('block text-[0.75rem]', left !== null && left >= 0 && left <= 3 && c.status !== 'COMPLETED' ? 'font-semibold text-rose-700' : 'text-slate-500')}>
                        {left === null ? '' : left < 0 ? tr('{{value}} din pehle', { value: -left }) : left === 0 ? tr('Aaj') : tr('{{left}} din baad', { left })}
                      </span></p>
                    <p className="text-[0.875rem] font-semibold tabular-nums text-slate-900">{money(c.quotedAmount)}
                      <span className={cn('block text-[0.75rem] font-medium', owed > 0.009 ? 'text-rose-700' : 'text-emerald-700')}>{owed > 0.009 ? tr('{{owed}} baqi', { owed: money(owed) }) : tr('Poora mila')}</span></p>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <Pill tone={WEDDING_STATUS[c.status]?.tone ?? ''}>{WEDDING_STATUS[c.status]?.label ?? c.status}</Pill>
                      <button type="button" onClick={() => setOpenId(c.id)} className={actionBtn}>{tr('Kholein')}</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ListCard>
      )}

      {form && <ContractForm contract={form === 'new' ? null : form} onClose={() => setForm(null)} onSaved={(c) => { refresh(); setForm(null); setOpenId(c.id); }} />}
      {openC && <ContractModal c={openC} money={money} canWork={canWork} onEdit={() => { setForm(openC); setOpenId(null); }} onChanged={refresh} onClose={() => setOpenId(null)} />}
    </PageShell>
  );
}

function ContractModal({ c, money, canWork, onEdit, onChanged, onClose }: {
  c: WeddingContract; money: (n: number) => string; canWork: boolean; onEdit: () => void; onChanged: () => void; onClose: () => void;
}) {
  const [paying, setPaying] = useState(false);
  const [ask, setAsk] = useState<'complete' | 'cancel' | null>(null);
  const owed = due(c);
  const closed = c.status === 'COMPLETED' || c.status === 'CANCELLED';
  const next = NEXT[c.status];

  const pay = useMutation({
    mutationFn: (v: { amount: number; paymentMethod: string; notes?: string }) => weddingContractsApi.recordPayment(c.id, v),
    onSuccess: (_, v) => { onChanged(); setPaying(false); toast.success(tr('{{amount}} family ke khate me jama', { amount: money(v.amount) })); },
    onError: (e) => toast.error(errorText(e, tr('Payment save nahi hui'))),
  });
  const step = useMutation({
    mutationFn: ({ to, materials }: { to: WeddingStatus; materials?: Array<{ productId: string; quantity: number }> }) => weddingContractsApi.updateStatus(c.id, { status: to, materials }),
    onSuccess: (r) => {
      onChanged(); setAsk(null);
      toast.success(r.sale ? tr('Bill {{saleNumber}} ban gaya', { saleNumber: r.sale.saleNumber }) : `${c.contractNumber}: ${WEDDING_STATUS[r.status]?.label}`);
    },
    onError: (e) => toast.error(errorText(e, tr('Halat nahi badli'))),
  });
  const cancel = useMutation({
    mutationFn: () => weddingContractsApi.cancel(c.id),
    onSuccess: () => { onChanged(); setAsk(null); toast.success(tr('Contract cancel — advance family ke khate me jama hai')); },
    onError: (e) => toast.error(errorText(e, tr('Cancel nahi hua'))),
  });

  const things = [
    c.includesBridalBouquet && tr('Dulhan bouquet'), c.includesBridesmaidBouquets && tr('Saheli bouquet × {{bridesmaidCount}}', { bridesmaidCount: c.bridesmaidCount }),
    c.includesBoutonnieres && tr('Boutonniere × {{boutonniereCount}}', { boutonniereCount: c.boutonniereCount }), c.includesGarlands && tr('Haar × {{garlandCount}}', { garlandCount: c.garlandCount }),
    c.includesCarDecoration && tr('Gaari sajawat'), c.includesStageDecoration && tr('Stage sajawat'), c.includesMehndiSetup && tr('Mehndi setup'),
    c.includesTableCentrepieces && tr('Table centrepiece × {{centrepieceCount}}', { centrepieceCount: c.centrepieceCount }),
  ].filter(Boolean) as string[];

  const slip = (): PrintDoc => ({
    title: `Contract ${c.contractNumber}`, subtitle: `${couple(c)} · ${longDate(c.weddingDate)}`,
    meta: [['Quote', money(c.quotedAmount)], ['Mila', money(c.advanceAmount)], ['Baqi', money(owed)]],
    sections: [
      { kind: 'rows', title: 'Rabta aur jagah', rows: [
        { label: 'Rabta', value: `${c.contactPerson} ${c.contactPhone}` }, { label: 'Nikah / barat', value: c.ceremonyVenue || '—' },
        { label: 'Walima / reception', value: c.receptionVenue || '—' }, { label: 'Setup', value: c.setupStartTime ? new Date(c.setupStartTime).toLocaleString('en-PK') : '—' },
      ] },
      { kind: 'table', title: 'Kaam', columns: [{ label: 'Cheez' }], rows: things.map((t) => [t]) },
      ...(c.colorTheme.length || c.primaryFlowers.length ? [{ kind: 'text' as const, title: 'Rang aur phool', text: [c.colorTheme.join(', '), c.primaryFlowers.join(', ')].filter(Boolean).join(' · ') }] : []),
      ...(c.notes ? [{ kind: 'text' as const, title: 'Note', text: c.notes }] : []),
    ],
  });

  return (
    <>
      <Modal open onClose={onClose} size="lg" title={`${couple(c)} · ${WEDDING_STATUS[c.status]?.label}`} description={`${c.contractNumber} · ${longDate(c.weddingDate)}`}
        footer={<div className="flex w-full flex-wrap items-center gap-2">
          <PrintButton doc={slip} label={tr('Contract print')} size="sm" />
          {canWork && !closed && <Button variant="secondary" size="sm" onClick={onEdit}><Pencil className="h-4 w-4" />{tr('Badlein')}</Button>}
          {canWork && !closed && <Button variant="secondary" size="sm" onClick={() => setAsk('cancel')}><XCircle className="h-4 w-4" />{tr('Cancel')}</Button>}
          <span className="flex-1" />
          {canWork && !closed && owed > 0.009 && <Button variant="secondary" onClick={() => setPaying(true)}><Wallet className="h-4 w-4" />{tr('Payment lein')}</Button>}
          {canWork && next && <Button variant="secondary" loading={step.isPending} onClick={() => step.mutate({ to: next.to })}>{next.label}</Button>}
          {canWork && !closed && <Button onClick={() => setAsk('complete')}><CheckCircle2 className="h-4 w-4" />{tr('Mukammal (bill)')}</Button>}
        </div>}>
        <div className="space-y-4 text-[0.875rem]">
          <div className="grid gap-3 sm:grid-cols-2">
            <Info icon={Phone} title={tr('Rabta')}>
              <p className="font-semibold text-slate-900">{c.contactPerson}</p>
              <a href={`tel:${c.contactPhone}`} className="text-brand-700 hover:underline">{c.contactPhone}</a>
              {c.contactEmail && <p className="text-slate-600">{c.contactEmail}</p>}
            </Info>
            <Info icon={MapPin} title={tr('Kahan')}>
              <p className="text-slate-800">{c.ceremonyVenue || '—'}</p>
              {c.receptionVenue && <p className="text-slate-600">{tr('Reception: {{receptionVenue}}', { receptionVenue: c.receptionVenue })}</p>}
              {c.city && <p className="text-slate-500">{c.city}</p>}
            </Info>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[[tr('Quote'), c.quotedAmount, 'text-slate-900'], [tr('Mila'), c.advanceAmount, 'text-emerald-700'], [tr('Baqi'), owed, owed > 0.009 ? 'text-rose-700' : 'text-emerald-700']].map(([l, v, t]) => (
              <div key={l as string} className="rounded-2xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200/70">
                <p className="text-[0.75rem] text-slate-500">{l}</p><p className={cn('text-lg font-bold tabular-nums', t as string)}>{money(v as number)}</p>
              </div>
            ))}
          </div>
          {things.length > 0 && <div className="flex flex-wrap gap-1.5">{things.map((t) => <span key={t} className="rounded-lg bg-pink-50 px-2 py-1 text-[0.75rem] font-medium text-pink-800 ring-1 ring-pink-200">{t}</span>)}</div>}
          {(c.colorTheme.length > 0 || c.primaryFlowers.length > 0) && <p className="text-slate-600"><Sparkles className="me-1 inline h-4 w-4 text-pink-600" />{[c.colorTheme.join(', '), c.primaryFlowers.join(', ')].filter(Boolean).join(' · ')}</p>}
          {c.notes && <p className="whitespace-pre-line text-slate-600">{c.notes}</p>}
          {c.status === 'COMPLETED' && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-[0.8125rem] text-emerald-900 ring-1 ring-emerald-200"><Trans text="Bill ban chuka hai. Baqi paisa family ke khate me — {{link}} se wasool karein. Tabdeeli ke liye bill par Return karein." values={{ link: <Link to="/customers" className="font-semibold underline">{tr('Khata')}</Link> }} /></p>}
          {c.internalNotes && <p className="whitespace-pre-line text-[0.75rem] text-slate-500">{c.internalNotes}</p>}
        </div>
      </Modal>

      {paying && <MoneyModal title={tr('Payment lein')} description={tr('{{couple}} — baqi {{owed}}', { couple: couple(c), owed: money(owed) })} due={owed} max={owed} busy={pay.isPending}
        hint={tr('Family ke khate me jama hota hai; bill bante waqt kat jata hai')} onSubmit={(v) => pay.mutate(v)} onClose={() => setPaying(false)} />}
      {ask === 'complete' && <CompleteModal c={c} money={money} busy={step.isPending} onConfirm={(materials) => step.mutate({ to: 'COMPLETED', materials })} onClose={() => setAsk(null)} />}
      {ask === 'cancel' && <ConfirmModal title={tr('Contract cancel?')} cta={tr('Haan, cancel')} danger busy={cancel.isPending} onConfirm={() => cancel.mutate()} onClose={() => setAsk(null)}
        text={c.advanceAmount > 0 ? tr('{{advanceAmount}} advance family ke khate me jama rahega. Wapas dena ho to Khata se dein.', { advanceAmount: money(c.advanceAmount) }) : tr('Contract record me rahega, sirf cancel hoga.')} />}
    </>
  );
}

/** Completing makes the bill; flowers used can be taken off stock so their cost counts. */
function CompleteModal({ c, money, busy, onConfirm, onClose }: {
  c: WeddingContract; money: (n: number) => string; busy: boolean; onConfirm: (materials: Array<{ productId: string; quantity: number }>) => void; onClose: () => void;
}) {
  const { cost: costMoney } = useMasked();
  const profilesQ = useQuery({ queryKey: [FLORIST_KEYS.profiles], queryFn: () => floristProductsApi.list(), staleTime: 60_000 });
  const options = (profilesQ.data ?? []).filter((p) => p.product).map((p) => ({ value: p.productId, label: tr('{{name}} (stock {{value}})', { name: p.product.name, value: p.product.stock ?? 0 }), cost: Number(p.product.costPrice) || 0 }));
  const [rows, setRows] = useState<Array<{ productId: string; qty: string }>>([]);
  const owed = due(c);
  const lines = rows.map((r) => ({ productId: r.productId, quantity: numIn(r.qty) ?? 0 })).filter((r) => r.productId && r.quantity > 0);
  const cost = lines.reduce((t, l) => t + l.quantity * (options.find((o) => o.value === l.productId)?.cost ?? 0), 0);
  return (
    <Modal open onClose={onClose} size="md" title={tr('Shaadi mukammal?')} description={tr('{{couple}} — {{quotedAmount}} ka bill banega', { couple: couple(c), quotedAmount: money(c.quotedAmount) })}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Wapas')}</Button><Button loading={busy} onClick={() => onConfirm(lines)}>{tr('Haan, bill banayein')}</Button></>}>
      <div className="space-y-3 text-[0.875rem] text-slate-700">
        <p>{tr('{{advanceAmount}} jo pehle mila wo bill me se kat jayega{{value}}.', { advanceAmount: money(c.advanceAmount), value: owed > 0.009 ? tr('; baqi {{owed}} family ke khate me udhaar rahega', { owed: money(owed) }) : '' })}</p>
        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
          <p className="mb-2 text-[0.8125rem] font-semibold text-slate-800">{tr('Kaun se phool lage (marzi)')}</p>
          <p className="mb-2 text-[0.75rem] text-slate-500">{tr('Stock se nikal jayenge aur unki cost profit me ginti hogi. Bill void ho to wapas shelf par.')}</p>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="flex items-end gap-2">
                <Select className="flex-1" aria-label={tr('Cheez')} value={r.productId} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, productId: e.target.value } : x)))}
                  options={[{ value: '', label: tr('Cheez chunein') }, ...options]} />
                <Input className="w-24" aria-label={tr('Kitne')} inputMode="decimal" value={r.qty} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} placeholder={tr('Kitne')} />
                <Button variant="secondary" size="sm" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label={tr('Hatayein')}><XCircle className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={() => setRows([...rows, { productId: '', qty: '' }])}><Plus className="h-4 w-4" />{tr('Phool jorein')}</Button>
          </div>
          {lines.length > 0 && <p className="mt-2 text-[0.8125rem] font-semibold">{tr('Phoolon ki cost: {{cost}}', { cost: costMoney(cost) })}</p>}
        </div>
      </div>
    </Modal>
  );
}

interface Draft {
  brideName: string; groomName: string; contactPerson: string; contactPhone: string; contactEmail: string;
  weddingDate: string; ceremonyVenue: string; receptionVenue: string; city: string; siteVisitDate: string;
  includesBridalBouquet: boolean; includesBridesmaidBouquets: boolean; bridesmaidCount: string; includesBoutonnieres: boolean; boutonniereCount: string;
  includesGarlands: boolean; garlandCount: string; includesCarDecoration: boolean; includesStageDecoration: boolean; includesMehndiSetup: boolean;
  includesTableCentrepieces: boolean; centrepieceCount: string; colorTheme: string; primaryFlowers: string; quotedAmount: string;
  advanceAmount: string; advancePaymentMethod: string; notes: string;
}

const toDraft = (c: WeddingContract | null): Draft => ({
  brideName: c?.brideName ?? '', groomName: c?.groomName ?? '', contactPerson: c?.contactPerson ?? '', contactPhone: c?.contactPhone ?? '', contactEmail: c?.contactEmail ?? '',
  weddingDate: c?.weddingDate ? dayKey(new Date(c.weddingDate)) : '', ceremonyVenue: c?.ceremonyVenue ?? '', receptionVenue: c?.receptionVenue ?? '', city: c?.city ?? '',
  siteVisitDate: c?.siteVisitDate ? dayKey(new Date(c.siteVisitDate)) : '',
  includesBridalBouquet: c?.includesBridalBouquet ?? false, includesBridesmaidBouquets: c?.includesBridesmaidBouquets ?? false, bridesmaidCount: String(c?.bridesmaidCount || ''),
  includesBoutonnieres: c?.includesBoutonnieres ?? false, boutonniereCount: String(c?.boutonniereCount || ''), includesGarlands: c?.includesGarlands ?? false, garlandCount: String(c?.garlandCount || ''),
  includesCarDecoration: c?.includesCarDecoration ?? false, includesStageDecoration: c?.includesStageDecoration ?? false, includesMehndiSetup: c?.includesMehndiSetup ?? false,
  includesTableCentrepieces: c?.includesTableCentrepieces ?? false, centrepieceCount: String(c?.centrepieceCount || ''),
  colorTheme: (c?.colorTheme ?? []).join(', '), primaryFlowers: (c?.primaryFlowers ?? []).join(', '), quotedAmount: c ? String(c.quotedAmount) : '',
  advanceAmount: '', advancePaymentMethod: 'CASH', notes: c?.notes ?? '',
});

type BoolKey = { [K in keyof Draft]: Draft[K] extends boolean ? K : never }[keyof Draft];
type CountKey = 'garlandCount' | 'bridesmaidCount' | 'boutonniereCount' | 'centrepieceCount';
const THINGS: Array<[BoolKey, string, CountKey?]> = [
  ['includesStageDecoration', tr('Stage sajawat')], ['includesMehndiSetup', tr('Mehndi setup')], ['includesCarDecoration', tr('Gaari sajawat')],
  ['includesBridalBouquet', tr('Dulhan bouquet')], ['includesGarlands', tr('Haar / sehra'), 'garlandCount'], ['includesBridesmaidBouquets', tr('Saheli bouquet'), 'bridesmaidCount'],
  ['includesBoutonnieres', tr('Boutonniere'), 'boutonniereCount'], ['includesTableCentrepieces', tr('Table centrepiece'), 'centrepieceCount'],
];

function ThingToggle({ label, checked, onToggle, count, onCount }: { label: string; checked: boolean; onToggle: (v: boolean) => void; count?: string; onCount?: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2 ring-1 ring-slate-200">
      <Switch label={label} checked={checked} onChange={(e) => onToggle(e.target.checked)} />
      {onCount && checked && <Input className="ms-auto w-20" inputMode="numeric" aria-label={tr('{{label}} kitne', { label })} value={count ?? ''} onChange={(e) => onCount(e.target.value)} placeholder={tr('Kitne')} />}
    </div>
  );
}

const list = (v: string) => v.split(',').map((x) => x.trim()).filter(Boolean);
const count = (v: string) => Math.max(0, Math.floor(numIn(v) ?? 0));

function ContractForm({ contract, onClose, onSaved }: { contract: WeddingContract | null; onClose: () => void; onSaved: (c: WeddingContract) => void }) {
  const [d, setD] = useState<Draft>(() => toDraft(contract));
  const [touched, setTouched] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const quote = numIn(d.quotedAmount);
  const advance = numIn(d.advanceAmount) ?? 0;

  const errors: Partial<Record<keyof Draft, string>> = {};
  if (!d.brideName.trim()) errors.brideName = tr('Dulhan ka naam likhein');
  if (!d.groomName.trim()) errors.groomName = tr('Dulha ka naam likhein');
  if (!d.contactPerson.trim()) errors.contactPerson = tr('Rabta karne wale ka naam');
  if (!phoneOk(d.contactPhone)) errors.contactPhone = tr('Phone 10 se 15 hindse');
  if (d.contactEmail.trim() && !/^\S+@\S+\.\S+$/.test(d.contactEmail.trim())) errors.contactEmail = tr('Email sahi likhein');
  if (!d.weddingDate) errors.weddingDate = tr('Shaadi ki date chunein');
  if (quote === null || quote < 0) errors.quotedAmount = tr('Quote ki amount likhein');
  else if (contract && quote < contract.advanceAmount - 0.01) errors.quotedAmount = tr('Pehle {{advanceAmount}} mil chuke — is se kam nahi', { advanceAmount: contract.advanceAmount });
  if (!contract && advance < 0) errors.advanceAmount = tr('Advance sahi likhein');
  if (!contract && quote !== null && advance > quote + 0.01) errors.advanceAmount = tr('Advance quote se zyada nahi');
  const problems = Object.values(errors);

  const save = useMutation({
    mutationFn: () => {
      const body: WeddingInput = {
        brideName: d.brideName.trim(), groomName: d.groomName.trim(), contactPerson: d.contactPerson.trim(), contactPhone: d.contactPhone.trim(),
        contactEmail: d.contactEmail.trim(), weddingDate: d.weddingDate, ceremonyVenue: d.ceremonyVenue.trim() || undefined,
        receptionVenue: d.receptionVenue.trim() || undefined, city: d.city.trim() || undefined, siteVisitDate: d.siteVisitDate || null,
        includesBridalBouquet: d.includesBridalBouquet, includesBridesmaidBouquets: d.includesBridesmaidBouquets, bridesmaidCount: count(d.bridesmaidCount),
        includesBoutonnieres: d.includesBoutonnieres, boutonniereCount: count(d.boutonniereCount), includesGarlands: d.includesGarlands, garlandCount: count(d.garlandCount),
        includesCarDecoration: d.includesCarDecoration, includesStageDecoration: d.includesStageDecoration, includesMehndiSetup: d.includesMehndiSetup,
        includesTableCentrepieces: d.includesTableCentrepieces, centrepieceCount: count(d.centrepieceCount),
        colorTheme: list(d.colorTheme), primaryFlowers: list(d.primaryFlowers), quotedAmount: quote ?? 0, notes: d.notes.trim() || undefined,
      };
      if (contract) return weddingContractsApi.update(contract.id, body);
      return weddingContractsApi.create({ ...body, ...(advance > 0 && { advanceAmount: advance, advancePaymentMethod: d.advancePaymentMethod }) });
    },
    onSuccess: (c) => { toast.success(contract ? tr('Contract save ho gaya') : advance > 0 ? tr('Contract {{contractNumber}} bana — advance khate me jama', { contractNumber: c.contractNumber }) : tr('Contract {{contractNumber}} ban gaya', { contractNumber: c.contractNumber })); onSaved(c); },
    onError: (e) => toast.error(errorText(e, tr('Contract save nahi hua'))),
  });
  const submit = () => { setTouched(true); if (problems.length) { toast.error(problems[0]); return; } if (!save.isPending) save.mutate(); };
  useSaveKey(submit);
  const err = (k: keyof Draft) => (touched ? errors[k] : undefined);
  return (
    <Modal open onClose={onClose} size="xl" title={contract ? tr('{{contractNumber}} badlein', { contractNumber: contract.contractNumber }) : tr('Naya contract')} description={tr('Ctrl+S se save')}
      footer={<>
        {touched && problems.length > 0 && <p className="me-auto text-[0.8125rem] text-amber-800">{problems[0]}</p>}
        <Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button>
        <Button loading={save.isPending} onClick={submit}>{contract ? tr('Save karein') : tr('Contract banayein')}</Button>
      </>}>
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <section className="grid gap-3 sm:grid-cols-2">
          <Input label={tr('Dulhan')} required value={d.brideName} onChange={(e) => set('brideName', e.target.value)} error={err('brideName')} maxLength={120} />
          <Input label={tr('Dulha')} required value={d.groomName} onChange={(e) => set('groomName', e.target.value)} error={err('groomName')} maxLength={120} />
          <Input label={tr('Rabta (kis se baat hoti hai)')} required value={d.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} error={err('contactPerson')} hint={tr('Isi naam par khata khulta hai')} />
          <Input label={tr('Phone')} required inputMode="tel" value={d.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} error={err('contactPhone')} placeholder="0300 1234567" hint={tr('Is phone se purana khata mil jata hai')} />
          <Input label={tr('Email (marzi)')} type="email" value={d.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} error={err('contactEmail')} />
          <Input label={tr('Shehar (marzi)')} value={d.city} onChange={(e) => set('city', e.target.value)} placeholder={tr('Lahore')} />
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <Input label={tr('Shaadi ki date')} required type="date" value={d.weddingDate} onChange={(e) => set('weddingDate', e.target.value)} error={err('weddingDate')} hint={tr('Asal function ka din')} />
          <Input label={tr('Jagah dekhne ka din (marzi)')} type="date" value={d.siteVisitDate} onChange={(e) => set('siteVisitDate', e.target.value)} />
          <Input label={tr('Nikah / barat ki jagah')} value={d.ceremonyVenue} onChange={(e) => set('ceremonyVenue', e.target.value)} placeholder={tr('Marquee / hall ka naam')} />
          <Input label={tr('Walima / reception (marzi)')} value={d.receptionVenue} onChange={(e) => set('receptionVenue', e.target.value)} />
        </section>

        <section>
          <p className="mb-2 text-[0.8125rem] font-semibold text-slate-700">{tr('Kya kya sajana hai')}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {THINGS.map(([k, label, countKey]) => (
              <ThingToggle key={k} label={label} checked={d[k]} onToggle={(v) => set(k, v)}
                count={countKey ? d[countKey] : undefined} onCount={countKey ? (v) => set(countKey, v) : undefined} />
            ))}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Input label={tr('Rang (comma se)')} value={d.colorTheme} onChange={(e) => set('colorTheme', e.target.value)} placeholder={tr('Laal, safed, sunehri')} />
            <Input label={tr('Phool (comma se)')} value={d.primaryFlowers} onChange={(e) => set('primaryFlowers', e.target.value)} placeholder={tr('Gulab, motia, genda')} />
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <Input label={tr('Quote (Rs)')} required inputMode="decimal" value={d.quotedAmount} onChange={(e) => set('quotedAmount', e.target.value)} error={err('quotedAmount')} hint={tr('Poore kaam ki tay shuda amount')} />
          {!contract ? (<>
            <Input label={tr('Advance abhi (Rs)')} inputMode="decimal" value={d.advanceAmount} onChange={(e) => set('advanceAmount', e.target.value)} error={err('advanceAmount')} hint={tr('Family ke khate me jama hoga')} />
            <Select label={tr('Advance kaise mila')} value={d.advancePaymentMethod} onChange={(e) => set('advancePaymentMethod', e.target.value)} options={PAY_METHODS}
              hint={d.advancePaymentMethod === 'CASH' ? tr('Cash khule drawer me') : tr('Us account me jata hai')} />
          </>) : (
            <p className="self-end text-[0.8125rem] text-slate-500 sm:col-span-2">{tr('Mila: {{advanceAmount}}. Nayi payment contract khol kar "Payment lein" se.', { advanceAmount: contract.advanceAmount })}</p>
          )}
        </section>

        <Textarea label={tr('Note (marzi)')} rows={2} value={d.notes} onChange={(e) => set('notes', e.target.value)} placeholder={tr('Khaas farmaish, setup ka waqt…')} />
      </form>
    </Modal>
  );
}
