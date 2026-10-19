/**
 * Hotel reports. Night audit: before the day is closed, who should have
 * arrived or left, who is in with how much to pay, the night's occupancy
 * and ADR, and the day's hotel money (bills, advances, refunds by method) —
 * the same entries the day book and cash register show. Occupancy: ADR and
 * RevPAR over a range, by room type.
 *
 * Keys: 1 night audit · 2 occupancy · G guide.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, BarChart3, BedDouble, BookOpen, CalendarCheck, ClipboardCheck, GraduationCap, LogIn, LogOut, Moon, Receipt, Sparkles, Wallet } from 'lucide-react';
import {
  Button, Card, FilterBar, KpiCard, KpiRow, PageHero, PageShell, Skeleton, Table, TBody, Td, Th, THead, Tr, ViewTabs, heroButton, heroIconButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import { cn } from '@core/lib/cn';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { hotelDashboardApi, type AuditStay } from '../api/dashboard.api';
import { OccupancyPanel } from '../components/OccupancyPanel';
import { HOTEL_KEYS, addDaysKey, apiError, methodLabel, stayDay, todayKey } from '../components/meta';

type Tab = 'audit' | 'occupancy';

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '1') setTab('audit');
      if (e.key === '2') setTab('occupancy');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const openItems = a ? a.arrivalsPending.length + a.inHouse.filter((b) => b.overdue || b.leavingToday).length : 0;
  const printDoc = (): PrintDoc => ({
    title: 'Night audit',
    subtitle: stayDay(a!.date, { day: true, year: true }),
    meta: [['Occupancy', `${a!.night.occupancyPct.toFixed(0)}% (${a!.night.sold}/${a!.rooms})`], ['ADR', sales(a!.night.adr)], ['RevPAR', sales(a!.night.revpar)]],
    sections: [
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

      <FilterBar search={<p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">{tab === 'audit' ? 'Din band karne se pehle: koi aamad, rawangi ya late guest baqi na rahe.' : 'Raatein jab guest thehre, tay hue rate par.'}</p>}>
        {tab === 'audit' ? (
          <input type="date" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value || todayKey())} className="h-10 rounded-xl border border-slate-200 px-3 text-[0.8125rem]" aria-label="Din" />
        ) : (<>
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-[0.8125rem]" aria-label="Kab se" />
          <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-xl border border-slate-200 px-3 text-[0.8125rem]" aria-label="Kab tak" />
        </>)}
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab} tabs={[{ id: 'audit', label: 'Night audit', icon: ClipboardCheck, count: a ? openItems : null }, { id: 'occupancy', label: 'Occupancy', icon: BarChart3 }]} />

      {tab === 'occupancy' ? <OccupancyPanel from={from} to={to} /> : q.isLoading ? <Skeleton className="h-80 rounded-3xl" /> : !a ? (
        <div className="rounded-3xl bg-white px-6 py-10 text-center ring-1 ring-slate-200/80">
          <p className="font-semibold text-slate-900">Report load nahi hua</p>
          <p className="mt-1 text-sm text-slate-500">{apiError(q.error, 'Reports dekhne ki permission chahiye')}</p>
          <Button className="mt-3" variant="secondary" onClick={() => q.refetch()}>Dobara koshish</Button>
        </div>
      ) : (<>
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
            { icon: BarChart3, color: '#4f46e5', title: 'Occupancy', text: 'ADR = room ki kamai ÷ biki raatein. RevPAR = room ki kamai ÷ kul room-raatein.' },
          ]}
          tips={['Report dekhne ke liye "Reports dekhna" ki permission chahiye.']}
          shortcuts={[['1', 'night audit'], ['2', 'occupancy'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
