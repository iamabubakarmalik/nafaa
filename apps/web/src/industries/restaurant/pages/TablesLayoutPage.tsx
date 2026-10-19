/**
 * The restaurant floor: every table by section with what is happening on
 * it — free, seated (timer, guests, waiter, running bill, kitchen state),
 * bill printed, needs cleaning, reserved or closed. Tapping a table gives
 * the next step: take an order, add dishes, print the bill, take payment,
 * move, mark clean or reserve. "Floor setup" adds and edits tables.
 *
 * Keys: N takeaway order · S floor setup · G guide.
 */

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Ban, CalendarClock, CheckCircle2, ChefHat, Clock, Crown, GraduationCap, Pencil, Plus, Printer, Receipt, Settings2, Sparkles, Trash2, Users, Utensils,
  Wallet, type LucideIcon,
} from 'lucide-react';
import {
  Button, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, Skeleton, ViewTabs, heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { cn } from '@core/lib/cn';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useAuthStore } from '@core/stores/auth.store';
import { tablesApi, type FloorTable, type TableStatus } from '../api/tables.api';
import { ordersApi } from '../api/orders.api';
import { useOrderPayment } from '../hooks/useOrderPayment';
import { ReserveModal, TableFormModal } from '../components/TableForms';
import { ORDER_KEYS, STATUS_META, TABLE_META, apiError, duration, minutesSince } from '../lib/orderMeta';
import { printPreBill } from '../lib/slips';

type Filter = 'all' | TableStatus | 'BILL';

export default function TablesLayoutPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Restaurant';
  const canManage = usePermission(PERMISSIONS.RESTAURANT_ORDERS_MANAGE);
  const canPay = usePermission(PERMISSIONS.POS_USE);
  const [section, setSection] = useState('all');
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<FloorTable | null>(null);
  const [edit, setEdit] = useState<FloorTable | 'new' | null>(null);
  const [reserve, setReserve] = useState<FloorTable | null>(null);
  const [setup, setSetup] = useState(false);
  const [guide, setGuide] = useState(false);
  const [, tick] = useState(0);

  const q = useQuery({ queryKey: ['restaurant-floor'], queryFn: () => tablesApi.floor(), refetchInterval: 15_000 });
  const floor = q.data;
  const st = floor?.stats;
  const refresh = () => ORDER_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const payment = useOrderPayment(() => { refresh(); setOpen(null); });

  // Timers on the cards move every half minute without a refetch.
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 30_000); return () => clearInterval(t); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      const k = e.key.toLowerCase();
      if (k === 'n') navigate('/restaurant/orders/new?mode=TAKEAWAY');
      if (k === 's' && canManage) setSetup((v) => !v);
      if (k === 'g') setGuide(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, canManage]);

  const act = useMutation({
    mutationFn: (run: () => Promise<unknown>) => run(),
    onSuccess: () => { refresh(); setOpen(null); setEdit(null); setReserve(null); },
    onError: (e) => toast.error(apiError(e)),
  });
  const run = (fn: () => Promise<unknown>, ok: string) => act.mutate(async () => { await fn(); toast.success(ok); });

  const tables = useMemo(() => (floor?.tables ?? []).filter((t) => {
    if (section !== 'all' && (t.section || 'Main') !== section) return false;
    if (filter === 'BILL') return t.billPrinted;
    return filter === 'all' || t.liveStatus === filter;
  }), [floor, section, filter]);
  const bySection = useMemo(() => {
    const m = new Map<string, FloorTable[]>();
    for (const t of tables) m.set(t.section || 'Main', [...(m.get(t.section || 'Main') ?? []), t]);
    return [...m.entries()];
  }, [tables]);

  const pick = (f: Filter) => setFilter((x) => (x === f ? 'all' : f));
  const payTable = async (t: FloorTable) => {
    if (!t.currentOrder) return;
    try { payment.open(await ordersApi.getOne(t.currentOrder.id)); } catch (e) { toast.error(apiError(e)); }
  };
  const billTable = (t: FloorTable) => t.currentOrder && run(async () => { const o = await ordersApi.printBill(t.currentOrder!.id); printPreBill(o, shopName); }, `Table ${t.tableNumber} ka bill print`);

  return (
    <PageShell>
      {payment.modal}
      {guide && <FloorGuide onClose={() => setGuide(false)} />}
      {edit && (
        <TableFormModal table={edit === 'new' ? null : edit} sections={floor?.sections ?? []} saving={act.isPending} onClose={() => setEdit(null)}
          onSave={(d) => run(() => (edit === 'new' ? tablesApi.create(d) : tablesApi.update(edit.id, d)), edit === 'new' ? `Table ${d.tableNumber} ban gayi` : 'Table save ho gayi')} />
      )}
      {reserve && (
        <ReserveModal table={reserve} saving={act.isPending} onClose={() => setReserve(null)}
          onSave={(d) => run(() => tablesApi.reserve(reserve.id, d), `Table ${reserve.tableNumber} reserve ho gayi`)} />
      )}
      {open && (
        <TableSheet t={open} canManage={canManage} canPay={canPay} busy={act.isPending} onClose={() => setOpen(null)}
          onOrder={() => navigate(`/restaurant/orders/new?tableId=${open.id}`)}
          onAdd={() => open.currentOrder && navigate(`/restaurant/orders/new?orderId=${open.currentOrder.id}`)}
          onOpenOrder={(id) => navigate(`/restaurant/orders/${id}`)}
          onBill={() => billTable(open)}
          onPay={() => void payTable(open)}
          onStatus={(s, ok) => run(() => tablesApi.changeStatus(open.id, s), ok)}
          onReserve={() => { setReserve(open); setOpen(null); }}
          onCancelReserve={() => run(() => tablesApi.cancelReservation(open.id), 'Reservation khatam')}
          onEdit={() => { setEdit(open); setOpen(null); }}
          onRemove={() => { if (window.confirm(`Table ${open.tableNumber} hata dein? Purane orders record me rahenge.`)) run(() => tablesApi.remove(open.id), 'Table hata di'); }} />
      )}

      <PageHero
        title="Tables"
        chip={<><Utensils />{st ? `${st.total} table` : '…'}</>}
        busy={q.isFetching && !q.isLoading}
        meta="Har 15 second taaza"
        loading={q.isLoading}
        actions={<>
          <Link to="/restaurant/orders/new?mode=TAKEAWAY" className={heroButton}><Plus className="h-4 w-4" />Takeaway <Kbd className="hidden bg-white/20 text-white md:inline-flex">N</Kbd></Link>
          <Link to="/restaurant/kot" className={heroButton}><ChefHat className="h-4 w-4" />Kitchen</Link>
          {canManage && <button type="button" onClick={() => setSetup((v) => !v)} className={setup ? heroPrimaryButton : heroButton}><Settings2 className="h-4 w-4" />Floor setup</button>}
          <button type="button" onClick={() => setGuide(true)} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={st ? [
          { label: 'Chalta bill', value: formatPKR(st.runningBill), hint: `${st.occupied} table` },
          { label: 'Bhari tables', value: `${st.occupied} / ${st.total}` },
          { label: 'Mehman', value: String(st.guests) },
          { label: 'Dishes tayyar', value: String(st.ready), hint: st.ready ? 'serve karein' : undefined },
        ] : [{ label: 'Chalta bill', value: '' }, { label: 'Bhari tables', value: '' }, { label: 'Mehman', value: '' }, { label: 'Dishes tayyar', value: '' }]}
      />

      <KpiRow>
        {!st ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={CheckCircle2} color={TABLE_META.AVAILABLE.color} label="Khaali" value={String(st.available)} hint="Mehman bitha sakte hain" onClick={() => pick('AVAILABLE')} active={filter === 'AVAILABLE'} />
            <KpiCard icon={Users} color={TABLE_META.OCCUPIED.color} label="Bhari" value={String(st.occupied)} hint={formatPKR(st.runningBill)} onClick={() => pick('OCCUPIED')} active={filter === 'OCCUPIED'} />
            <KpiCard icon={Receipt} color="#9333ea" label="Bill print" value={String(st.billPrinted)} hint="Payment ka intezar" onClick={() => pick('BILL')} active={filter === 'BILL'} />
            <KpiCard icon={Sparkles} color={TABLE_META.CLEANING.color} label="Safai" value={String(st.cleaning)} hint="Saaf karke khaali karein" onClick={() => pick('CLEANING')} active={filter === 'CLEANING'} />
            <KpiCard icon={CalendarClock} color={TABLE_META.RESERVED.color} label="Reserved" value={String(st.reserved)} onClick={() => pick('RESERVED')} active={filter === 'RESERVED'} />
          </>
        )}
      </KpiRow>

      {(floor?.sections.length ?? 0) > 1 && (
        <ViewTabs value={section} onChange={setSection} hint={filter !== 'all' ? <button type="button" onClick={() => setFilter('all')} className="font-semibold text-brand-700">Filter hatayein</button> : undefined}
          tabs={[{ id: 'all', label: 'Sab', count: floor?.tables.length ?? 0 }, ...(floor?.sections ?? []).map((s) => ({ id: s, label: s, count: floor?.tables.filter((t) => (t.section || 'Main') === s).length ?? 0 }))]} />
      )}

      {q.isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-36 rounded-3xl" />)}</div>
      ) : !floor?.tables.length ? (
        <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/80">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg"><Utensils className="h-7 w-7" /></span>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">Abhi koi table nahi</h3>
          <p className="mt-1 text-[0.875rem] text-slate-500">Hall, Family, Rooftop — jitni tables hain bana lein. Bina table ke takeaway aur counter order chalte rehte hain.</p>
          {canManage && <Button className="mt-4" onClick={() => setEdit('new')}><Plus className="h-4 w-4" />Pehli table banayein</Button>}
        </div>
      ) : (
        <div className="space-y-5">
          {setup && canManage && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-brand-50 px-4 py-3 ring-1 ring-brand-100">
              <p className="text-[0.8125rem] text-brand-900">Floor setup: table par click karke badlein ya hatayein.</p>
              <Button size="sm" onClick={() => setEdit('new')}><Plus className="h-4 w-4" />Nayi table</Button>
            </div>
          )}
          {!tables.length && <p className="rounded-2xl bg-white px-4 py-10 text-center text-[0.875rem] text-slate-500 ring-1 ring-slate-200/80">Is filter me koi table nahi</p>}
          {bySection.map(([name, list]) => (
            <section key={name}>
              <h2 className="mb-2 flex items-center gap-2 text-[0.875rem] font-semibold text-slate-900">{name}<span className="text-[0.75rem] font-normal text-slate-500">{list.filter((t) => t.liveStatus === 'OCCUPIED').length} / {list.length} bhari</span></h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {list.map((t) => <TableCard key={t.id} t={t} setup={setup && canManage} onClick={() => (setup && canManage ? setEdit(t) : setOpen(t))} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}

function TableCard({ t, setup, onClick }: { t: FloorTable; setup: boolean; onClick: () => void }) {
  const meta = TABLE_META[t.liveStatus];
  const busy = t.liveStatus === 'OCCUPIED';
  const min = minutesSince(t.occupiedAt ?? t.currentOrder?.createdAt);
  const reservedAt = t.reservedFor ? new Date(t.reservedFor) : null;
  return (
    <button type="button" onClick={onClick}
      className={cn('relative flex min-h-[8.5rem] flex-col rounded-3xl p-3 text-left shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-md', meta.bg, meta.ring, t.billPrinted && 'ring-2 ring-purple-400')}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[1.5rem] font-bold leading-none tabular-nums text-slate-900">{t.tableNumber}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[0.6875rem] font-semibold" style={{ color: meta.color }}>
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />{t.billPrinted ? 'Bill print' : meta.label}
        </span>
      </div>
      <span className="mt-1 flex items-center gap-1.5 text-[0.75rem] text-slate-600">
        <Users className="h-3.5 w-3.5" />{busy && t.guests ? `${t.guests} / ${t.capacity}` : t.capacity}
        {t.isVip && <Crown className="h-3.5 w-3.5 text-amber-500" />}
        {t.tableName && <span className="truncate">· {t.tableName}</span>}
      </span>
      {busy ? (
        <div className="mt-auto space-y-1 pt-2">
          <p className="text-[1.0625rem] font-bold tabular-nums text-slate-900">{formatPKR(t.runningBill)}</p>
          <p className="flex items-center gap-1 text-[0.75rem] text-slate-600"><Clock className="h-3.5 w-3.5" />{duration(min)}{t.waiterName ? ` · ${t.waiterName}` : ''}</p>
          <div className="flex flex-wrap gap-1">
            {t.unsent > 0 && <span className="rounded-md bg-slate-900 px-1.5 py-0.5 text-[0.625rem] font-semibold text-white">{t.unsent} kitchen nahi gaye</span>}
            {t.cooking > 0 && <span className="rounded-md bg-orange-100 px-1.5 py-0.5 text-[0.625rem] font-semibold text-orange-800">{t.cooking} ban rahe</span>}
            {t.ready > 0 && <span className="animate-pulse rounded-md bg-emerald-600 px-1.5 py-0.5 text-[0.625rem] font-semibold text-white">{t.ready} tayyar</span>}
            {t.orders.length > 1 && <span className="rounded-md bg-white px-1.5 py-0.5 text-[0.625rem] font-semibold text-slate-700">{t.orders.length} bill</span>}
          </div>
        </div>
      ) : t.liveStatus === 'RESERVED' ? (
        <p className="mt-auto pt-2 text-[0.75rem] font-medium text-amber-900">{t.reservedByName}{reservedAt ? ` · ${new Intl.DateTimeFormat('en-PK', { hour: 'numeric', minute: '2-digit' }).format(reservedAt)}` : ''}</p>
      ) : (
        <p className="mt-auto pt-2 text-[0.75rem] text-slate-500">{setup ? 'Badlein' : t.liveStatus === 'CLEANING' ? 'Saaf karke khaali karein' : t.liveStatus === 'AVAILABLE' ? 'Order lein' : ''}</p>
      )}
      {setup && <Pencil className="absolute bottom-3 right-3 h-4 w-4 text-slate-400" />}
    </button>
  );
}

function TableSheet({ t, canManage, canPay, busy, onClose, onOrder, onAdd, onOpenOrder, onBill, onPay, onStatus, onReserve, onCancelReserve, onEdit, onRemove }: {
  t: FloorTable; canManage: boolean; canPay: boolean; busy: boolean; onClose: () => void;
  onOrder: () => void; onAdd: () => void; onOpenOrder: (id: string) => void; onBill: () => void; onPay: () => void;
  onStatus: (s: TableStatus, ok: string) => void; onReserve: () => void; onCancelReserve: () => void; onEdit: () => void; onRemove: () => void;
}) {
  const meta = TABLE_META[t.liveStatus];
  const occupied = t.liveStatus === 'OCCUPIED';
  const cur = t.orders.find((o) => o.id === t.currentOrder?.id);
  const due = cur ? cur.total - cur.paidAmount : t.runningBill;
  const big = (icon: LucideIcon, label: string, onClick: () => void, primary = false) => {
    const Icon = icon;
    return (
      <button type="button" disabled={busy} onClick={onClick}
        className={cn('flex items-center gap-2 rounded-2xl px-4 py-3 text-left text-[0.875rem] font-semibold transition disabled:opacity-50',
          primary ? 'bg-brand-600 text-white shadow-sm hover:bg-brand-700' : 'bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-50')}>
        <Icon className="h-5 w-5" />{label}
      </button>
    );
  };
  return (
    <Modal open onClose={onClose} size="md"
      title={<span className="flex items-center gap-2">Table {t.tableNumber}<span className="rounded-full px-2 py-0.5 text-[0.75rem] font-semibold" style={{ backgroundColor: `${meta.color}17`, color: meta.color }}>{t.billPrinted ? 'Bill print' : meta.label}</span></span>}
      description={`${t.section || 'Main'} · ${t.capacity} kursiyan${occupied ? ` · ${duration(minutesSince(t.occupiedAt ?? t.currentOrder?.createdAt))} se` : ''}`}>
      <div className="space-y-4">
        {occupied && (
          <ul className="space-y-1.5">
            {t.orders.map((o) => (
              <li key={o.id}>
                <button type="button" onClick={() => onOpenOrder(o.id)} className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-left ring-1 ring-slate-200 hover:bg-slate-100">
                  <span><span className="block text-[0.875rem] font-semibold text-slate-900">{o.orderNumber}{o.parentOrderId ? ' · alag bill' : ''}</span>
                    <span className="text-[0.75rem] text-slate-500">{STATUS_META[o.status as keyof typeof STATUS_META]?.label ?? o.status}</span></span>
                  <span className="text-[0.9375rem] font-bold tabular-nums">{formatPKR(o.total - o.paidAmount)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {t.liveStatus === 'RESERVED' && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900">
            {t.reservedByName}{t.reservedByPhone ? ` · ${t.reservedByPhone}` : ''}{t.reservedFor ? ` · ${new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(t.reservedFor))}` : ''}
            {t.reservationNote ? <><br />{t.reservationNote}</> : null}
          </p>
        )}
        {canManage && (
          <div className="grid gap-2 sm:grid-cols-2">
            {occupied && <>
              {big(Plus, 'Aur item', onAdd, true)}
              {big(Printer, 'Bill print', onBill)}
              {canPay && big(Wallet, `Payment · ${formatPKR(due)}${t.orders.length > 1 ? ' (pehla bill)' : ''}`, onPay)}
              {t.currentOrder && big(Receipt, 'Order kholein', () => onOpenOrder(t.currentOrder!.id))}
            </>}
            {t.liveStatus === 'AVAILABLE' && <>
              {big(Plus, 'Order lein', onOrder, true)}
              {t.isReservable && big(CalendarClock, 'Reserve karein', onReserve)}
              {big(Ban, 'Band karein', () => onStatus('OUT_OF_SERVICE', `Table ${t.tableNumber} band`))}
            </>}
            {t.liveStatus === 'CLEANING' && <>
              {big(CheckCircle2, 'Saaf ho gayi — khaali', () => onStatus('AVAILABLE', `Table ${t.tableNumber} khaali`), true)}
              {big(Plus, 'Seedha order lein', onOrder)}
            </>}
            {t.liveStatus === 'RESERVED' && <>
              {big(Plus, 'Mehman aa gaye — order', onOrder, true)}
              {big(Ban, 'Reservation khatam', onCancelReserve)}
            </>}
            {t.liveStatus === 'OUT_OF_SERVICE' && big(CheckCircle2, 'Table chalu karein', () => onStatus('AVAILABLE', `Table ${t.tableNumber} chalu`), true)}
          </div>
        )}
        {canManage && !occupied && (
          <div className="flex justify-between border-t border-slate-100 pt-3">
            <Button size="sm" variant="ghost" onClick={onEdit}><Pencil className="h-4 w-4" />Table badlein</Button>
            <Button size="sm" variant="ghost" className="text-rose-600" onClick={onRemove}><Trash2 className="h-4 w-4" />Hatayein</Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function FloorGuide({ onClose }: { onClose: () => void }) {
  const rows: Array<[string, string, string]> = [
    [TABLE_META.AVAILABLE.color, 'Hari — khaali', 'Click → "Order lein". Table aur mehman khud lag jate hain.'],
    [TABLE_META.OCCUPIED.color, 'Laal — bhari', 'Chalta bill, waqt aur waiter. "Aur item" se naya KOT sirf naye item ka.'],
    ['#9333ea', 'Jamni kinara — bill print', 'Bill de diya, payment ka intezar. Payment se bill banta hai aur table safai me jati hai.'],
    [TABLE_META.CLEANING.color, 'Neeli — safai', 'Saaf karke "khaali" dabayein.'],
    [TABLE_META.RESERVED.color, 'Peeli — reserved', 'Mehman ka naam aur waqt. Aane par seedha order.'],
  ];
  return (
    <Modal open onClose={onClose} size="lg" title="Tables — aasaan tareeqa" description="Rang dekh kar pata chalta hai kis table par kya karna hai">
      <ul className="space-y-2">
        {rows.map(([c, t, d]) => (
          <li key={t} className="flex gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: c }} />
            <div><p className="text-[0.875rem] font-semibold text-slate-900">{t}</p><p className="text-[0.8125rem] text-slate-600">{d}</p></div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[0.75rem] text-slate-500"><Kbd>N</Kbd> takeaway · <Kbd>S</Kbd> floor setup · <Kbd>G</Kbd> guide</p>
    </Modal>
  );
}
