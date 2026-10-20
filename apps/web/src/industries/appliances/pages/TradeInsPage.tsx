/**
 * Old appliances taken in trade (purana saman): the customer hands in an old
 * AC, fridge or washing machine and its agreed value comes off the new bill.
 * The unit stays in the shop until it is sold on, scrapped or given back.
 *
 * Keys: N new · / search · 1-5 views · A analytics · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Archive, BarChart3, BadgeDollarSign, Download, GraduationCap, ListChecks, Pencil, Plus, Recycle, Trash2, Undo2,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import {
  Button, FilterBar, FilterChip, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { downloadCsv } from '@core/lib/csv';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { PaymentMethodPicker } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { tradeInsApi, type ApplianceTradeIn, type TradeInCondition, type TradeInStatus, type TradeInView } from '../api/trade-ins.api';
import { TradeInModal } from '../pos/TradeInTake';
import { Bars, Box, Chips, ListState, Pager, Panel, Pill, Strip } from '../components/ui';
import { MONEY_KEYS, TRADE_IN_CONDITIONS, TRADE_IN_KEY, apiError, conditionLabel, dayOnly, money, tradeInStatusOf } from '../components/meta';

type Tab = 'list' | 'analytics';
const VIEWS: Array<{ id: TradeInView; label: string; icon: typeof Archive }> = [
  { id: 'HELD', label: 'Dukaan me', icon: Archive },
  { id: 'SOLD', label: 'Bech diya', icon: BadgeDollarSign },
  { id: 'SCRAPPED', label: 'Kabar', icon: Trash2 },
  { id: 'RETURNED', label: 'Customer ko wapas', icon: Undo2 },
  { id: 'all', label: 'Sab', icon: ListChecks },
];
const viewLabel = (v: TradeInView) => VIEWS.find((x) => x.id === v)?.label ?? v;
const STATUSES: TradeInStatus[] = ['HELD', 'SOLD', 'SCRAPPED', 'RETURNED'];

export default function TradeInsPage() {
  const qc = useQueryClient();
  const canAdd = usePermission(PERMISSIONS.POS_USE);
  const canMove = usePermission(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE);
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('list');
  const [params] = useSearchParams();
  // A link from a bill (?q=ATI-…) opens every status, searched by code.
  const [view, setView] = useState<TradeInView>(params.get('q') ? 'all' : 'HELD');
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [query, setQuery] = useState(search.trim());
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ApplianceTradeIn | null>(null);
  const [selling, setSelling] = useState<ApplianceTradeIn | null>(null);
  const [moving, setMoving] = useState<{ t: ApplianceTradeIn; status: Exclude<TradeInStatus, 'SOLD'> } | null>(null);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [view, query]);
  const q = { view, search: query || undefined, page, limit: 40 };
  const listQ = useQuery({ queryKey: [TRADE_IN_KEY, 'page', q], queryFn: () => tradeInsApi.page(q), placeholderData: (p) => p });
  const data = listQ.data;
  const c = data?.counts;
  const rows = data?.items ?? [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canAdd) { e.preventDefault(); setAdding(true); }
      if (e.key === '/') { e.preventDefault(); setTab('list'); window.setTimeout(() => searchRef.current?.focus(), 0); }
      if (e.key === 'a' || e.key === 'A') setTab((t) => (t === 'analytics' ? 'list' : 'analytics'));
      const i = Number(e.key) - 1;
      if (i >= 0 && i < VIEWS.length) { setTab('list'); setView(VIEWS[i].id); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canAdd]);

  const fetchAll = () => tradeInsApi.page({ ...q, page: 1, limit: 200 });
  const printDoc = async (): Promise<PrintDoc> => {
    const all = await fetchAll();
    return {
      title: `Purana saman — ${viewLabel(view)}`,
      meta: [['Units', String(all.total)], ['Qeemat', formatPKR(all.counts[view].value)]],
      sections: [{ kind: 'table', columns: [{ label: 'Code' }, { label: 'Saman' }, { label: 'Halat' }, { label: 'Customer', wideOnly: true }, { label: 'Bill', wideOnly: true }, { label: 'Qeemat', align: 'right' }],
        rows: all.items.map((t) => [t.code, itemName(t), tradeInStatusOf(t.status).label, t.customer?.name ?? '—', t.sale?.saleNumber ?? '—', formatPKR(t.value)]) }],
    };
  };
  const exportCsv = async () => {
    const all = await fetchAll();
    downloadCsv('purana-saman.csv', [
      ['Code', 'Saman', 'Brand', 'Model', 'Halat', 'Kaisa hai', 'Qeemat', 'Customer', 'Phone', 'Bill', 'Aaya', 'Bika bill', 'Bika qeemat'],
      ...all.items.map((t) => [t.code, t.description, t.brand ?? '', t.model ?? '', tradeInStatusOf(t.status).label, conditionLabel(t.condition), t.value,
        t.customer?.name ?? '', t.customer?.phone ?? '', t.sale?.saleNumber ?? '', dayOnly(t.createdAt), t.resale?.saleNumber ?? '', t.resale?.total ?? '']),
    ]);
  };

  return (
    <PageShell>
      <PageHero
        title="Purana saman"
        chip={<><Recycle /> Trade-in</>}
        meta="Customer ka purana AC, fridge ya machine — naye bill se qeemat kati, ab bechein, kabar karein ya wapas dein"
        busy={listQ.isFetching && !listQ.isLoading}
        loading={listQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!rows.length} /></span>
          <button type="button" onClick={() => void exportCsv()} disabled={!rows.length} className={heroButton}><Download className="h-4 w-4" /><span className="hidden sm:inline">CSV</span></button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canAdd && <button type="button" onClick={() => setAdding(true)} title="Naya (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Purana saman liya</button>}
        </>}
        stats={c ? [
          { label: 'Dukaan me', value: c.HELD.count, hint: formatPKR(c.HELD.value) },
          { label: 'Bech diya', value: c.SOLD.count },
          { label: 'Kabar', value: c.SCRAPPED.count },
        ] : [{ label: 'Dukaan me', value: '—' }]}
      />

      <KpiRow cols={4}>
        {!c ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : STATUSES.map((st) => {
          const m = tradeInStatusOf(st);
          const v = VIEWS.find((x) => x.id === st)!;
          return <KpiCard key={st} icon={v.icon} color={m.color} label={m.label} value={c[st].count} hint={formatPKR(c[st].value)}
            onClick={() => { setTab('list'); setView(st); }} active={tab === 'list' && view === st} />;
        })}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Code, saman, brand, model…" label="Search" />}
        chips={query ? <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip> : undefined}
        onClear={() => setSearch('')}>
        <div className="flex flex-wrap gap-1.5">
          {VIEWS.map((v) => (
            <Button key={v.id} size="sm" variant={view === v.id ? 'primary' : 'secondary'} leftIcon={<v.icon className="h-4 w-4" />} onClick={() => { setTab('list'); setView(v.id); }}>
              {v.label}{c ? ` · ${c[v.id].count}` : ''}
            </Button>
          ))}
        </div>
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab}
        hint={<>{canAdd && <><Kbd>N</Kbd> naya · </>}<Kbd>1</Kbd>–<Kbd>5</Kbd> halat · <Kbd>/</Kbd> search</>}
        tabs={[{ id: 'list', label: 'Saman', icon: ListChecks, count: data?.total ?? null }, { id: 'analytics', label: 'Analytics', icon: BarChart3 }]} />

      {tab === 'analytics' ? <Analytics c={c} /> : (<>
        {data && data.total > 0 && <Strip><span className="text-slate-500">{viewLabel(view)}</span><span className="font-semibold text-slate-900">{data.total} · {formatPKR(c?.[view].value ?? 0)}</span></Strip>}
        <ListState loading={listQ.isLoading} error={listQ.isError && !data} empty={!rows.length} onRetry={() => listQ.refetch()} icon={Recycle}
          title={query ? 'Kuch nahi mila' : view === 'HELD' ? 'Dukaan me koi purana saman nahi' : 'Kuch nahi'}
          hint="Customer purana saman de to POS par cart ke neeche 'Purana saman liya' dabayein, phir checkout par Trade-in chunein."
          actions={canAdd ? <Button onClick={() => setAdding(true)} leftIcon={<Plus className="h-4 w-4" />}>Purana saman liya</Button> : undefined}>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {rows.map((t) => (
              <TradeInRow key={t.id} t={t} canAdd={canAdd} canMove={canMove}
                onEdit={() => setEditing(t)} onSell={() => setSelling(t)} onMove={(status) => setMoving({ t, status })} />
            ))}
          </ul>
        </ListState>
        {data && <Pager page={page} pages={data.totalPages} onPage={setPage} />}
      </>)}

      {adding && <TradeInModal onClose={() => setAdding(false)} />}
      {editing && <EditModal t={editing} onClose={() => setEditing(null)} />}
      {selling && <SellModal t={selling} onClose={() => setSelling(null)} />}
      {moving && <MoveModal t={moving.t} status={moving.status} onClose={() => setMoving(null)} onDone={() => qc.invalidateQueries({ queryKey: [TRADE_IN_KEY] })} />}
      {guide.isOpen && (
        <PageGuide title="Purana saman — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Recycle, color: '#d97706', title: 'Counter par', text: 'Customer purana AC ya fridge de: POS par "Purana saman liya" — kya liya aur kitne ka. Phir checkout par Trade-in me wohi code chunein; qeemat bill se kat jati hai.' },
            { icon: BadgeDollarSign, color: '#16a34a', title: 'Aage bechna', text: 'Kabari ya kisi aur ko bechein to "Bechein" — iska alag bill banta hai. Trade-in qeemat us ki Cost hai, is liye Profit report me Profit ya nuqsan dikhta hai.' },
            { icon: Trash2, color: '#64748b', title: 'Kabar / wapas', text: 'Jo bik na sake use Kabar karein. Bill na bana ho to customer ko wapas bhi de sakte hain.' },
            { icon: Undo2, color: '#0284c7', title: 'Void', text: 'Naya bill void ho to trade-in phir se free ho jata hai. Bechne wala bill void ho to saman wapas "Dukaan me" aa jata hai.' },
          ]}
          tips={['Bechne ke liye saman kisi bill me Trade-in laga hona chahiye.', 'Kabar ya wapas ke liye "Stock adjust" permission chahiye.']}
          shortcuts={[['N', 'naya'], ['1–5', 'halat'], ['A', 'analytics'], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

const itemName = (t: ApplianceTradeIn) => [t.description, t.brand, t.model].filter(Boolean).join(' · ');

function TradeInRow({ t, canAdd, canMove, onEdit, onSell, onMove }: {
  t: ApplianceTradeIn; canAdd: boolean; canMove: boolean;
  onEdit: () => void; onSell: () => void; onMove: (s: Exclude<TradeInStatus, 'SOLD'>) => void;
}) {
  const held = t.status === 'HELD';
  return (
    <li className="flex flex-wrap items-start gap-3 px-3 py-3 sm:px-4">
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Recycle className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[0.8125rem] font-semibold text-slate-900">{t.code}</span>
          <Pill meta={tradeInStatusOf(t.status)} />
          {t.condition && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] text-slate-600">{conditionLabel(t.condition)}</span>}
        </span>
        <span className="mt-0.5 block truncate text-[0.875rem] text-slate-800">{itemName(t)}</span>
        <span className="mt-0.5 block truncate text-[0.75rem] text-slate-500">
          {dayOnly(t.createdAt)}
          {t.customer ? ` · ${t.customer.name}${t.customer.phone ? ` (${t.customer.phone})` : ''}` : ''}
          {t.sale ? <> · bill <Link to={`/sales/${t.sale.id}`} className="text-brand-700 hover:underline">{t.sale.saleNumber}</Link></> : held ? ' · abhi kisi bill par nahi' : ''}
          {t.resale ? <> · bika <Link to={`/sales/${t.resale.id}`} className="text-brand-700 hover:underline">{t.resale.saleNumber}</Link> {formatPKR(t.resale.total)}</> : ''}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="font-semibold tabular-nums text-slate-900">{formatPKR(t.value)}</span>
        <span className="flex flex-wrap justify-end gap-1">
          {held && canAdd && !t.saleId && <Button size="sm" variant="ghost" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={onEdit}>Badlein</Button>}
          {held && canAdd && t.saleId && <Button size="sm" variant="secondary" leftIcon={<BadgeDollarSign className="h-3.5 w-3.5" />} onClick={onSell}>Bechein</Button>}
          {held && canMove && <Button size="sm" variant="ghost" leftIcon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => onMove('SCRAPPED')}>Kabar</Button>}
          {held && canMove && !t.saleId && <Button size="sm" variant="ghost" leftIcon={<Undo2 className="h-3.5 w-3.5" />} onClick={() => onMove('RETURNED')}>Wapas diya</Button>}
          {(t.status === 'SCRAPPED' || t.status === 'RETURNED') && canMove && <Button size="sm" variant="ghost" leftIcon={<Archive className="h-3.5 w-3.5" />} onClick={() => onMove('HELD')}>Dukaan me wapas</Button>}
        </span>
      </span>
    </li>
  );
}

const MOVE_TEXT: Record<Exclude<TradeInStatus, 'SOLD'>, { title: string; text: string; ok: string }> = {
  SCRAPPED: { title: 'Kabar karein', text: 'Ye saman kisi kaam ka nahi — kabar me likh dein. Paisa kahin nahi hilta.', ok: 'Kabar karein' },
  RETURNED: { title: 'Customer ko wapas', text: 'Customer ne saman wapas le liya aur ye kisi bill par nahi laga.', ok: 'Wapas likhein' },
  HELD: { title: 'Dukaan me wapas', text: 'Saman phir se dukaan me hai — bechne ya bill me lagane ke liye.', ok: 'Dukaan me likhein' },
};

function MoveModal({ t, status, onClose, onDone }: { t: ApplianceTradeIn; status: Exclude<TradeInStatus, 'SOLD'>; onClose: () => void; onDone: () => void }) {
  const m = MOVE_TEXT[status];
  const save = useMutation({
    mutationFn: () => tradeInsApi.setStatus(t.id, status),
    onSuccess: () => { toast.success(`${t.code} — ${tradeInStatusOf(status).label}`); onDone(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={`${m.title} — ${t.code}`} description={itemName(t)}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} onClick={() => save.mutate()}>{m.ok}</Button></>}>
      <p className="text-[0.875rem] text-slate-700">{m.text}</p>
    </Modal>
  );
}

function EditModal({ t, onClose }: { t: ApplianceTradeIn; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ description: t.description, brand: t.brand ?? '', model: t.model ?? '', condition: (t.condition ?? '') as TradeInCondition | '', value: String(t.value) });
  const [tried, setTried] = useState(false);
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));
  const value = Number(f.value) || 0;
  const errors = {
    description: f.description.trim().length < 2 ? 'Kya liya — maslan: purana AC 1.5 ton' : undefined,
    value: !(value > 0) ? 'Qeemat likhein' : undefined,
  };
  const save = useMutation({
    mutationFn: () => tradeInsApi.update(t.id, { description: f.description.trim(), brand: f.brand.trim(), model: f.model.trim(), condition: f.condition || undefined, value }),
    onSuccess: () => { toast.success(`${t.code} badal gaya`); qc.invalidateQueries({ queryKey: [TRADE_IN_KEY] }); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Nahi badla')),
  });
  const submit = () => { setTried(true); if (!errors.description && !errors.value) save.mutate(); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  return (
    <Modal open onClose={onClose} size="md" title={`Badlein — ${t.code}`} description="Sirf jab tak ye kisi bill par na laga ho"
      footer={<>
        <span className="mr-auto hidden text-[0.75rem] text-slate-500 sm:inline"><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> save</span>
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} onClick={submit}>Save</Button>
      </>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Input label="Kya liya" required value={f.description} onChange={(e) => set({ description: e.target.value })} error={tried ? errors.description : undefined} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Brand" value={f.brand} onChange={(e) => set({ brand: e.target.value })} />
          <Input label="Model" value={f.model} onChange={(e) => set({ model: e.target.value })} />
        </div>
        <div>
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Halat</span>
          <Chips options={TRADE_IN_CONDITIONS} value={f.condition} onChange={(condition) => set({ condition })} />
        </div>
        <Input label="Qeemat" required inputMode="decimal" value={f.value} onChange={(e) => set({ value: money(e.target.value) })} hint="Jitna naye bill se katega" error={tried ? errors.value : undefined} />
      </form>
    </Modal>
  );
}

/** Sells the old unit on (scrap dealer or another buyer), paid in full; posts its own bill. */
function SellModal({ t, onClose }: { t: ApplianceTradeIn; onClose: () => void }) {
  const qc = useQueryClient();
  const [price, setPrice] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [buyer, setBuyer] = useState('');
  const [tried, setTried] = useState(false);
  const n = Number(price) || 0;
  const gain = n - t.value;
  const error = !(n > 0) ? 'Kitne ka becha' : undefined;
  const save = useMutation({
    mutationFn: () => tradeInsApi.sell(t.id, { price: n, paymentMethod: method, buyer: buyer.trim() || undefined }),
    onSuccess: (r) => {
      toast.success(`${t.code} bik gaya${r.saleNumber ? ` — bill ${r.saleNumber}` : ''}`);
      [TRADE_IN_KEY, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      onClose();
    },
    onError: (e) => toast.error(apiError(e, 'Nahi bika')),
  });
  const submit = () => { setTried(true); if (!error) save.mutate(); };
  return (
    <Modal open onClose={onClose} size="sm" title={`Bechein — ${t.code}`} description={itemName(t)}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button>
        <Button loading={save.isPending} onClick={submit} leftIcon={<BadgeDollarSign className="h-4 w-4" />}>{n > 0 ? `${formatPKR(n)} me bechein` : 'Bechein'}</Button></>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <dl className="grid grid-cols-2 gap-2">
          <Box label="Trade-in qeemat (Cost)" value={formatPKR(t.value)} />
          <Box label={gain >= 0 ? 'Profit' : 'Nuqsan'} value={n > 0 ? formatPKR(Math.abs(gain)) : '—'} tone={n > 0 ? (gain >= 0 ? 'text-emerald-700' : 'text-rose-700') : 'text-slate-500'} />
        </dl>
        <Input label="Kitne ka becha" required inputMode="decimal" autoFocus value={price} onChange={(e) => setPrice(money(e.target.value))} error={tried ? error : undefined} hint="Poora paisa abhi — iska bill banega" />
        <PaymentMethodPicker value={method} onChange={setMethod} />
        <Input label="Kisko becha" value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder="Kabari ya customer ka naam" hint="Bill par chhapta hai" />
      </form>
    </Modal>
  );
}

function Analytics({ c }: { c?: Record<TradeInView, { count: number; value: number }> }) {
  if (!c) return <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-60 rounded-3xl" /><Skeleton className="h-60 rounded-3xl" /></div>;
  const rows = STATUSES.map((st) => ({ key: st, label: tradeInStatusOf(st).label, color: tradeInStatusOf(st).color }));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Kitne units" hint="Halat ke hisaab se">
        <Bars rows={rows.map((r) => ({ ...r, value: c[r.key].count })).filter((r) => r.value > 0)} />
      </Panel>
      <Panel title="Trade-in qeemat" hint="Jo naye bills se kati">
        <dl className="grid grid-cols-2 gap-3">
          <Box label="Kul" value={formatPKR(c.all.value)} />
          <Box label="Dukaan me para" value={formatPKR(c.HELD.value)} tone="text-amber-700" />
          <Box label="Bech diya" value={formatPKR(c.SOLD.value)} tone="text-emerald-700" />
          <Box label="Kabar" value={formatPKR(c.SCRAPPED.value)} tone="text-slate-600" />
        </dl>
        <p className="mt-3 text-[0.75rem] text-slate-500">Bechne ka Profit ya nuqsan Profit report me aata hai (bill ka code ATI-…).</p>
      </Panel>
    </div>
  );
}
