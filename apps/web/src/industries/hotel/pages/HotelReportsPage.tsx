/**
 * Hotel reports. Night audit: before the day is closed, who should have
 * arrived or left, who is in with how much to pay, the night's occupancy
 * and ADR, and the day's hotel money (bills, advances, refunds by method) —
 * the same entries the day book and cash register show. "Din band karein"
 * saves the day's numbers for the branch (one close per day). Occupancy:
 * ADR and RevPAR over a range, by room type. Band din: the closed days.
 *
 * Keys: 1 night audit · 2 occupancy · 3 band din · G guide.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, BarChart3, BedDouble, BookOpen, CalendarCheck, ClipboardCheck, GraduationCap, Lock, LogIn, LogOut, Moon, Receipt, Sparkles, Wallet } from 'lucide-react';
import {
  Badge, Button, Card, FilterBar, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, Skeleton, Table, TBody, Td, Textarea, Th, THead, Tr, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import { cn } from '@core/lib/cn';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { hotelDashboardApi, type AuditStay, type ClosedDay, type NightAudit } from '../api/dashboard.api';
import { OccupancyPanel } from '../components/OccupancyPanel';
import { HOTEL_KEYS, addDaysKey, apiError, methodLabel, stayDay, todayKey } from '../components/meta';

type Tab = 'audit' | 'occupancy' | 'closed';

const closedRows = (c: ClosedDay, money: (n: number) => string) => [
  { label: 'Biki raatein (rooms)', value: String(c.occupiedRooms) },
  { label: 'Occupancy', value: `${c.occupancyPct.toFixed(0)}%` },
  { label: 'ADR', value: money(c.adr) },
  { label: 'Room ki kamai', value: money(c.roomRevenue) },
  { label: 'Hotel bills', value: money(c.revenue), strong: true },
];

function StayList({ title, icon: Icon, rows, empty, note, money }: { title: string; icon: typeof LogIn; rows: Array<AuditStay & { flag?: string }>; empty: string; note?: string; money: (n: number) => string }) {
  return (
    <Card className="p-0">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-slate-900"><Icon className="h-4 w-4 text-slate-400" />{title} <span className="text-slate-400">{rows.length}</span></h3>
        {note && <span className="text-[0.75rem] text-slate-500">{note}</span>}
      </div>
      {!rows.length ? <p className="px-4 py-5 text-center text-[0.8125rem] text-success-700">{empty}</p> : (
        <ul className="divide-y divide-slate-100">
          {rows.map((b) => (
            <li key={b.id}>
              <Link to={`/hotel/bookings/${b.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                <span className="w-12 shrink-0 text-[0.875rem] font-bold text-slate-900">{b.rooms || '—'}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.8125rem] font-medium text-slate-900">{b.guestName}{b.flag && <span className="ml-2 rounded bg-rose-100 px-1.5 text-[0.6875rem] font-semibold text-rose-700">{b.flag}</span>}</span>
                  <span className="block truncate text-[0.6875rem] text-slate-500">{stayDay(b.checkInDate)} → {stayDay(b.checkOutDate)} · {b.bookingNumber}{b.bookedBy ? ` · ${b.bookedBy}` : ''}</span>
                </span>
                <span className={cn('text-right text-[0.8125rem] tabular-nums', b.due > 0 ? 'font-semibold text-amber-700' : 'text-slate-500')}>{b.due > 0 ? `${money(b.due)} baqi` : 'Paid'}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function HotelReportsPage() {
  const guide = usePageGuide();
  const { sales } = useMasked();
  const [tab, setTab] = useState<Tab>('audit');
  const [date, setDate] = useState(todayKey());
  const [from, setFrom] = useState(addDaysKey(todayKey(), -29));
  const [to, setTo] = useState(todayKey());
  const q = useQuery({ queryKey: [HOTEL_KEYS.reports, 'audit', date], queryFn: () => hotelDashboardApi.nightAudit(date), enabled: tab === 'audit', refetchInterval: 60_000 });
  const a = q.data;
  const closedQ = useQuery({ queryKey: [HOTEL_KEYS.reports, 'closed'], queryFn: () => hotelDashboardApi.closedDays(), enabled: tab === 'closed' });
  const canClose = usePermission(PERMISSIONS.CASH_REGISTER_CLOSE);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '1') setTab('audit');
      if (e.key === '2') setTab('occupancy');
      if (e.key === '3') setTab('closed');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const openItems = a ? a.arrivalsPending.length + a.inHouse.filter((b) => b.overdue || b.leavingToday).length : 0;
  const printDoc = (): PrintDoc => ({
    title: 'Night audit',
    subtitle: stayDay(a!.date, { day: true, year: true }),
    meta: [['Occupancy', `${a!.night.occupancyPct.toFixed(0)}% (${a!.night.sold}/${a!.rooms})`], ['ADR', sales(a!.night.adr)], ['RevPAR', sales(a!.night.revpar)],
      ...(a!.closed ? [['Band kiya', `${a!.closed.closedByName ?? ''} · ${new Date(a!.closed.createdAt).toLocaleString('en-PK')}`] as [string, string]] : [])],
    sections: [
      ...(a!.closed ? [{ kind: 'rows' as const, title: 'Band karte waqt mehfooz', rows: closedRows(a!.closed, sales) }] : []),
      { kind: 'rows', title: 'Aaj ka paisa', rows: [
        { label: 'Hotel bills', value: `${a!.money.bills} · ${sales(a!.money.billed)}` },
        { label: 'Bill par wasool', value: sales(a!.money.takenAtBill) },
        { label: 'Advance mila', value: sales(a!.money.advances) },
        { label: 'Advance wapas', value: sales(a!.money.refunds) },
        { label: 'Khate me (udhaar / advance se)', value: sales(a!.money.onKhata) },
        ...Object.entries(a!.money.byMethod).map(([m, v]) => ({ label: methodLabel(m), value: sales(v), sub: true })),
      ] },
      { kind: 'table', title: 'Andar guests', columns: [{ label: 'Room' }, { label: 'Guest' }, { label: 'Rawangi' }, { label: 'Baqi', align: 'right' }], rows: a!.inHouse.map((b) => [b.rooms, b.guestName, stayDay(b.checkOutDate), sales(b.due)]) },
      ...(a!.arrivalsPending.length ? [{ kind: 'table' as const, title: 'Aamad baqi', columns: [{ label: 'Room' }, { label: 'Guest' }, { label: 'Aamad' }], rows: a!.arrivalsPending.map((b) => [b.rooms, b.guestName, stayDay(b.checkInDate)]) }] : []),
    ],
  });

  return (
    <PageShell>
      <PageHero
        title="Hotel reports"
        chip={<><Moon /> {tab === 'audit' ? stayDay(date, { day: true }) : `${stayDay(from)} – ${stayDay(to)}`}</>}
        meta="Night audit, occupancy, ADR aur RevPAR"
        busy={q.isFetching && !q.isLoading}
        loading={tab === 'audit' && q.isLoading}
        actions={<>
          {a && tab === 'audit' && <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} /></span>}
          {a && tab === 'audit' && !a.closed && canClose && <button type="button" onClick={() => setClosing(true)} className={heroPrimaryButton}><Lock className="h-4 w-4" /> Din band karein</button>}
          <Link to="/day-report" className={heroButton}><BookOpen className="h-4 w-4" /><span className="hidden sm:inline">Day book</span></Link>
          <Link to="/cash-register" className={heroButton}><Wallet className="h-4 w-4" /><span className="hidden sm:inline">Cash register</span></Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={a && tab === 'audit' ? [
          { label: 'Occupancy', value: `${a.night.occupancyPct.toFixed(0)}%`, hint: `${a.night.sold}/${a.rooms}` },
          { label: 'ADR', value: sales(a.night.adr) },
          { label: 'Aaj ke hotel bills', value: sales(a.money.billed) },
        ] : undefined}
      />

      <FilterBar search={<p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">{tab === 'audit' ? 'Din band karne se pehle: koi aamad, rawangi ya late guest baqi na rahe.' : tab === 'occupancy' ? 'Raatein jab guest thehre, tay hue rate par.' : 'Har band din ke mehfooz numbers — branch ke hisaab se.'}</p>}>
        {tab === 'audit' ? (
          <Input type="date" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value || todayKey())} aria-label="Din" />
        ) : tab === 'occupancy' ? (<>
          <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} aria-label="Kab se" />
          <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} aria-label="Kab tak" />
        </>) : null}
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab} tabs={[{ id: 'audit', label: 'Night audit', icon: ClipboardCheck, count: a ? openItems : null }, { id: 'occupancy', label: 'Occupancy', icon: BarChart3 }, { id: 'closed', label: 'Band din', icon: Lock }]} />

      {tab === 'occupancy' ? <OccupancyPanel from={from} to={to} /> : tab === 'closed' ? <ClosedDays rows={closedQ.data} loading={closedQ.isLoading} failed={closedQ.isError} retry={() => closedQ.refetch()} money={sales} onOpen={(d) => { setDate(d); setTab('audit'); }} /> : q.isLoading ? <Skeleton className="h-80 rounded-3xl" /> : !a ? (
        <div className="rounded-3xl bg-white px-6 py-10 text-center ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">Report load nahi hua</p>
          <p className="mt-1 text-sm text-slate-500">{apiError(q.error, 'Reports dekhne ki permission chahiye')}</p>
          <Button className="mt-3" variant="secondary" onClick={() => q.refetch()}>Dobara koshish</Button>
        </div>
      ) : (<>
        {a.closed && (
          <p className="flex flex-wrap items-center gap-2 rounded-2xl bg-success-50 px-4 py-3 text-[0.875rem] text-success-900 ring-1 ring-success-200">
            <Lock className="h-4 w-4 shrink-0" />Ye din band ho chuka{a.closed.closedByName ? ` — ${a.closed.closedByName}` : ''} · {new Date(a.closed.createdAt).toLocaleString('en-PK')}.
            Mehfooz: {a.closed.occupiedRooms} raatein · {a.closed.occupancyPct.toFixed(0)}% · bills {sales(a.closed.revenue)}{a.closed.notes ? ` · ${a.closed.notes}` : ''}
          </p>
        )}
        {openItems > 0 && a.isToday && (
          <p className="flex gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-[0.875rem] text-amber-900 ring-1 ring-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{openItems} kaam baqi: aamad (check-in ya no-show), aaj ki rawangi aur late guest (stay barhayein ya check-out).
          </p>
        )}
        <KpiRow cols={5}>
          <KpiCard icon={Receipt} color="#4f46e5" label="Hotel bills" value={sales(a.money.billed)} hint={`${a.money.bills} bill`} />
          <KpiCard icon={Wallet} color="#16a34a" label="Bill par wasool" value={sales(a.money.takenAtBill)} />
          <KpiCard icon={CalendarCheck} color="#0891b2" label="Advance mila" value={sales(a.money.advances)} hint={a.money.refunds ? `${sales(a.money.refunds)} wapas` : undefined} />
          <KpiCard icon={BookOpen} color="#ea580c" label="Khate me" value={sales(a.money.onKhata)} hint="Udhaar ya advance se adjust" />
          <KpiCard icon={BedDouble} color="#7c3aed" label="Andar guests par baqi" value={sales(a.inHouseDue)} hint={`${a.inHouse.length} stays`} />
        </KpiRow>

        <div className="grid gap-4 lg:grid-cols-2">
          <StayList title="Aamad baqi" icon={LogIn} money={sales} empty="Sab aa gaye" note="Check-in ya no-show"
            rows={a.arrivalsPending.map((b) => ({ ...b, flag: b.late ? 'Late' : undefined }))} />
          <StayList title="Andar guests" icon={BedDouble} money={sales} empty="Koi guest andar nahi"
            rows={a.inHouse.map((b) => ({ ...b, flag: b.overdue ? 'Rawangi guzar gayi' : b.leavingToday ? 'Aaj rawangi' : undefined }))} />
          <StayList title="Aaj check-out hue" icon={LogOut} money={sales} empty="Aaj koi check-out nahi" rows={a.checkedOut} />
          <Card className="space-y-2 p-4 text-[0.8125rem]">
            <h3 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-slate-900"><Wallet className="h-4 w-4 text-slate-400" />Paisa tareeqe se</h3>
            {Object.entries(a.money.byMethod).length ? Object.entries(a.money.byMethod).map(([m, v]) => (
              <div key={m} className="flex justify-between"><span className="text-slate-600">{methodLabel(m)}</span><span className="tabular-nums font-medium">{sales(v)}</span></div>
            )) : <p className="text-slate-500">Aaj hotel ka koi paisa nahi aaya</p>}
            {a.money.refunds > 0 && <div className="flex justify-between text-rose-700"><span>Advance wapas (cash)</span><span className="tabular-nums">−{sales(a.money.refunds)}</span></div>}
            <p className="pt-1 text-[0.75rem] text-slate-500">Ye wohi entries hain jo day book aur cash register me hain. Drawer gin kar Cash register se din band karein.</p>
            {a.board && <p className="flex items-center gap-1.5 pt-1 text-slate-600"><Sparkles className="h-4 w-4 text-sky-500" />{a.board.cleaning} room safai me · {a.openTasks} housekeeping kaam khule</p>}
          </Card>
        </div>

        {a.money.sales.length > 0 && (
          <Table minWidth="30rem">
            <THead><Tr><Th>Bill</Th><Th>Booking</Th><Th align="right">Kul</Th><Th align="right">Khate me</Th></Tr></THead>
            <TBody>
              {a.money.sales.map((s) => (
                <Tr key={s.id}>
                  <Td><Link to={`/sales/${s.id}/receipt`} className="font-medium text-brand-700 hover:underline">{s.saleNumber}</Link></Td>
                  <Td>{s.bookingNumber}</Td>
                  <Td align="right" className="tabular-nums">{sales(s.total)}</Td>
                  <Td align="right" className="tabular-nums">{sales(s.creditAmount)}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}
      </>)}

      {guide.isOpen && (
        <PageGuide title="Night audit — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: LogIn, color: '#d97706', title: 'Aamad baqi', text: 'Jo aaj aane the aur nahi aaye: check-in karein ya no-show lagayein (charge advance se).' },
            { icon: LogOut, color: '#e11d48', title: 'Rawangi', text: 'Jin ki rawangi aaj ya guzar gayi: check-out karein, ya ruk rahe hain to stay barhayein.' },
            { icon: Wallet, color: '#16a34a', title: 'Paisa', text: 'Bill, advance aur wapsi tareeqe ke hisaab se — cash register ke cash se milayein, phir din band karein.' },
            { icon: Lock, color: '#0f766e', title: 'Din band', text: '"Din band karein" us din ke occupancy, ADR aur bills branch ke liye mehfooz kar deta hai. Ek din ek hi dafa band hota hai; "Band din" me purane din aur print.' },
            { icon: BarChart3, color: '#4f46e5', title: 'Occupancy', text: 'ADR = room ki kamai ÷ biki raatein. RevPAR = room ki kamai ÷ kul room-raatein.' },
          ]}
          tips={['Report dekhne ke liye "Reports dekhna" ki permission chahiye.']}
          shortcuts={[['1', 'night audit'], ['2', 'occupancy'], ['3', 'band din'], ['G', 'guide']]}
        />
      )}
      {closing && a && <CloseDayModal audit={a} openItems={openItems} money={sales} onClose={() => setClosing(false)} />}
    </PageShell>
  );
}

function CloseDayModal({ audit: a, openItems, money, onClose }: { audit: NightAudit; openItems: number; money: (n: number) => string; onClose: () => void }) {
  const qc = useQueryClient();
  const [notes, setNotes] = useState('');
  const go = useMutation({
    mutationFn: () => hotelDashboardApi.closeDay({ date: a.date, notes: notes.trim() || undefined }),
    onSuccess: () => { toast.success(`${stayDay(a.date, { day: true })} band ho gaya`); qc.invalidateQueries({ queryKey: [HOTEL_KEYS.reports] }); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Din band nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={`Din band karein · ${stayDay(a.date, { day: true })}`} description="Ye numbers is branch ke liye mehfooz ho jayenge. Ek din ek hi dafa band hota hai."
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={go.isPending} onClick={() => go.mutate()} leftIcon={<Lock className="h-4 w-4" />}>Band karein</Button></>}>
      <div className="space-y-3 text-[0.875rem]">
        {openItems > 0 && <p className="flex gap-2 rounded-xl bg-amber-50 px-3 py-2 text-amber-900 ring-1 ring-amber-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{openItems} kaam abhi baqi hain (aamad / rawangi). Pehle unhein nipta lein to behtar.</p>}
        <div className="space-y-1 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="flex justify-between"><span className="text-slate-600">Biki raatein</span><span className="tabular-nums">{a.night.sold} / {a.rooms}</span></div>
          <div className="flex justify-between"><span className="text-slate-600">Occupancy</span><span className="tabular-nums">{a.night.occupancyPct.toFixed(0)}%</span></div>
          <div className="flex justify-between"><span className="text-slate-600">ADR</span><span className="tabular-nums">{money(a.night.adr)}</span></div>
          <div className="flex justify-between"><span className="text-slate-600">Room ki kamai</span><span className="tabular-nums">{money(a.night.revenue)}</span></div>
          <div className="flex justify-between font-semibold"><span>Hotel bills</span><span className="tabular-nums">{money(a.money.billed)}</span></div>
        </div>
        <Textarea label="Note" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} hint="Marzi hai — jaise 'Room 104 ka AC kharab'" />
      </div>
    </Modal>
  );
}

function ClosedDays({ rows, loading, failed, retry, money, onOpen }: {
  rows?: ClosedDay[]; loading: boolean; failed: boolean; retry: () => void; money: (n: number) => string; onOpen: (date: string) => void;
}) {
  if (loading) return <Skeleton className="h-60 rounded-3xl" />;
  if (failed) return <div className="rounded-3xl bg-white px-6 py-10 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">Band din load nahi hue</p><Button className="mt-3" variant="secondary" onClick={retry}>Dobara koshish</Button></div>;
  if (!rows?.length) return <div className="rounded-3xl bg-white px-6 py-12 text-center ring-1 ring-slate-200/80"><Lock className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-2 font-semibold text-slate-900">Abhi koi din band nahi hua</p><p className="mt-1 text-sm text-slate-500">Night audit par "Din band karein" dabayein.</p></div>;
  const doc = (): PrintDoc => ({
    title: 'Band din (night audit)',
    sections: [{ kind: 'table', columns: [{ label: 'Din' }, { label: 'Branch', wideOnly: true }, { label: 'Raatein', align: 'right' }, { label: 'Occ.', align: 'right' }, { label: 'ADR', align: 'right' }, { label: 'Bills', align: 'right' }],
      rows: rows.map((r) => [stayDay(r.date ?? r.businessDate), r.shopName ?? '', String(r.occupiedRooms), `${r.occupancyPct.toFixed(0)}%`, money(r.adr), money(r.revenue)]) }],
  });
  return (
    <Card className="p-0">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-[0.9375rem] font-semibold text-slate-900">{rows.length} band din</h3>
        <PrintButton doc={doc} />
      </div>
      <Table minWidth="40rem">
        <THead><Tr><Th>Din</Th><Th>Branch</Th><Th align="right">Raatein</Th><Th align="right">Occupancy</Th><Th align="right">ADR</Th><Th align="right">Hotel bills</Th><Th>Kis ne</Th></Tr></THead>
        <TBody>{rows.map((r) => (
          <Tr key={r.id} interactive onClick={() => onOpen((r.date ?? r.businessDate).slice(0, 10))}>
            <Td className="font-medium">{stayDay(r.date ?? r.businessDate, { day: true })}{r.notes && <p className="max-w-[14rem] truncate text-[0.6875rem] text-slate-500">{r.notes}</p>}</Td>
            <Td>{r.shopName ?? <Badge size="xs">—</Badge>}</Td>
            <Td align="right" className="tabular-nums">{r.occupiedRooms}</Td>
            <Td align="right" className="tabular-nums">{r.occupancyPct.toFixed(0)}%</Td>
            <Td align="right" className="tabular-nums">{money(r.adr)}</Td>
            <Td align="right" className="tabular-nums">{money(r.revenue)}</Td>
            <Td>{r.closedByName ?? '—'}</Td>
          </Tr>
        ))}</TBody>
      </Table>
    </Card>
  );
}
