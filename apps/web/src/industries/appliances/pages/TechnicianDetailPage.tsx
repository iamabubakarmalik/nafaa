/**
 * One technician: contact, skills, the month's work, money and rating, what
 * is open on him now, recent fittings and repairs, and a day-by-day
 * workload for any period.
 *
 * Keys: E edit · Esc back · G guide.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CalendarRange, GraduationCap, HardHat, Pencil, Phone, Star, Wallet, Wrench } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { Button, DateRangeMenu, KpiCard, KpiRow, PageHero, PageShell, Skeleton, heroButton, heroIconButton, resolveRange, type DateRangeValue } from '@/design-system/components';
import { useBusinessDayStart } from '@core/lib/business-day';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { techniciansApi } from '../api/technicians.api';
import { TechnicianForm } from '../components/TechnicianForm';
import { Bars, Box, Panel, Pill } from '../components/ui';
import { CATEGORY_META, TECH_KEY, dayOnly, installStatusOf, serviceStatusOf, todayKey, addDays } from '../components/meta';

const DAYS = ['Itwar', 'Peer', 'Mangal', 'Budh', 'Jumeraat', 'Jumma', 'Hafta'];

export default function TechnicianDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const canManage = usePermission(PERMISSIONS.STAFF_MANAGE);
  const startHour = useBusinessDayStart();
  const { sales } = useMasked();
  const guide = usePageGuide();
  const [editing, setEditing] = useState(false);
  const [range, setRange] = useState<DateRangeValue>({ preset: 'custom', custom: { from: addDays(todayKey(), -29), to: todayKey() } });
  const period = resolveRange(range, startHour);
  const from = period && period.from !== 'all' ? period.from : addDays(todayKey(), -29);
  const to = period && period.from !== 'all' ? period.to : todayKey();

  const q = useQuery({ queryKey: [TECH_KEY, 'one', id], queryFn: () => techniciansApi.getOne(id) });
  const load = useQuery({ queryKey: [TECH_KEY, 'workload', id, from, to], queryFn: () => techniciansApi.workload(id, from, to), placeholderData: (p) => p });
  const t = q.data;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'e' || e.key === 'E') && canManage) { e.preventDefault(); setEditing(true); }
      if (e.key === 'Escape') navigate('/appliances/technicians');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canManage, navigate]);

  if (q.isLoading) return <PageShell><Skeleton className="h-36 rounded-3xl" /><Skeleton className="h-80 rounded-3xl" /></PageShell>;
  if (!t) return <PageShell><div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">Technician nahi mila</p><Button className="mt-3" variant="secondary" onClick={() => navigate('/appliances/technicians')}>Wapas</Button></div></PageShell>;
  const m = t.month;
  const w = load.data;

  return (
    <PageShell>
      <PageHero
        title={t.name}
        chip={<><HardHat /> {t.employeeCode}{t.isActive ? '' : ' · band'}</>}
        meta={[t.phone, t.currentZone, `${t.workStartTime}–${t.workEndTime}`, (t.workingDays ?? []).map((d) => DAYS[d]?.slice(0, 3)).join(' ')].filter(Boolean).join(' · ')}
        actions={<>
          <Link to="/appliances/technicians" className={heroButton}><ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline">Sab technicians</span></Link>
          <a href={`tel:${t.phone}`} className={heroButton}><Phone className="h-4 w-4" /><span className="hidden sm:inline">Call</span></a>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setEditing(true)} title="Badlein (E)" className={heroButton}><Pencil className="h-4 w-4" /> Badlein</button>}
        </>}
        stats={[
          { label: 'Khule kaam', value: t.openJobs },
          { label: 'Mukammal (kul)', value: t.completedJobs, hint: `${t.completionRate}%` },
          { label: 'Rating', value: t.avgRating ? Number(t.avgRating).toFixed(1) : '—', hint: `${t.totalReviews} reviews` },
        ]}
      />

      <KpiRow cols={4}>
        <KpiCard icon={Wrench} color="#2563eb" label="Is mahine kaam" value={m.jobs} hint={`${Math.round(m.avgResolutionHours)} ghante ausat`} />
        <KpiCard icon={Wallet} color="#16a34a" label="Is mahine kamai" value={sales(m.revenue)} hint={`Profit ${sales(m.profit)}`} />
        <KpiCard icon={Wallet} color="#7c3aed" label="Commission banta" value={sales(m.commission)} hint={`${Number(t.commissionPct) || 0}% par`} />
        <KpiCard icon={Star} color="#d97706" label="Mahine ki rating" value={m.avgRating ? m.avgRating.toFixed(1) : '—'} />
      </KpiRow>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Kya kaam karta hai" className="lg:col-span-1">
          <div className="flex flex-wrap gap-1.5">
            {t.categoriesExpertise.length ? t.categoriesExpertise.map((c) => <span key={c} className="rounded-md bg-slate-100 px-2 py-0.5 text-[0.75rem] text-slate-700">{CATEGORY_META[c]?.label ?? c}</span>) : <span className="text-[0.8125rem] text-slate-500">Likha nahi</span>}
          </div>
          {t.brandsExpertise.length > 0 && <p className="mt-2 text-[0.8125rem] text-slate-600">Brands: {t.brandsExpertise.join(', ')}</p>}
          <dl className="mt-3 grid grid-cols-2 gap-2">
            <Box label="Visit rate" value={sales(Number(t.visitChargeRate) || 0)} />
            <Box label="Kul kamai" value={sales(Number(t.totalRevenue) || 0)} />
            <Box label="Kul commission" value={sales(Number(t.totalCommission) || 0)} />
            <Box label="Tajurba" value={t.experienceYears ? `${t.experienceYears} saal` : '—'} />
          </dl>
          {t.notes && <p className="mt-3 text-[0.8125rem] text-slate-600">{t.notes}</p>}
        </Panel>

        <Panel title="Abhi khula kaam" className="lg:col-span-2" hint="Repair jo is ke paas hain">
          {t.activeServiceRequests.length === 0 ? <p className="text-[0.8125rem] text-slate-500">Koi khula repair nahi</p> : (
            <ul className="divide-y divide-slate-100 text-[0.8125rem]">
              {t.activeServiceRequests.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                  <Link to={`/appliances/service-requests?id=${r.id}`} className="min-w-0 truncate hover:underline"><span className="font-medium text-slate-900">{r.requestNumber}</span> · {r.productName} · {r.customerName}</Link>
                  <span className="flex shrink-0 items-center gap-2"><Pill meta={serviceStatusOf(r.status)} /><span className="text-slate-500">{dayOnly(r.scheduledDate)}</span></span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Kaam din ba din" hint="Fitting aur repair jo is muddat me is ke naam lage"
        actions={<DateRangeMenu value={range} onChange={setRange} startHour={startHour} label="Muddat" />}>
        {!w ? <Skeleton className="h-40 rounded-2xl" /> : (<>
          <dl className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Box label="Fitting" value={w.totals.installations} /><Box label="Repair" value={w.totals.serviceRequests} />
            <Box label="Mukammal" value={w.totals.completed} /><Box label="Kamai" value={sales(w.totals.revenue)} /><Box label="Commission" value={sales(w.totals.commission)} />
          </dl>
          <Bars rows={w.byDay.filter((d) => d.installations + d.services > 0).map((d) => ({ key: d.date, label: dayOnly(d.date), value: d.installations + d.services, color: '#2563eb', hint: `${d.installations} fitting · ${d.services} repair · ${sales(d.revenue)}` }))} empty="Is muddat me koi kaam nahi" />
        </>)}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Pichli installations">
          <ul className="divide-y divide-slate-100 text-[0.8125rem]">
            {t.recentJobs.length === 0 && <li className="py-2 text-slate-500">Abhi koi nahi</li>}
            {t.recentJobs.map((j) => (
              <li key={j.id} className="flex items-center justify-between gap-2 py-2">
                <Link to={`/appliances/installations?id=${j.id}`} className="min-w-0 truncate hover:underline">{j.installationNumber} · {j.productName}</Link>
                <span className="flex shrink-0 items-center gap-2"><Pill meta={installStatusOf(j.status)} /><span className="tabular-nums text-slate-600">{sales(Number(j.totalCharge) || 0)}</span></span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Pichle repair">
          <ul className="divide-y divide-slate-100 text-[0.8125rem]">
            {t.recentServices.length === 0 && <li className="py-2 text-slate-500">Abhi koi nahi</li>}
            {t.recentServices.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                <Link to={`/appliances/service-requests?id=${r.id}`} className="min-w-0 truncate hover:underline">{r.requestNumber} · {r.productName}</Link>
                <span className="flex shrink-0 items-center gap-2"><Pill meta={serviceStatusOf(r.status)} /><span className="tabular-nums text-slate-600">{sales(Number(r.totalCharge) || 0)}</span></span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {editing && <TechnicianForm tech={t} onClose={() => setEditing(false)} />}
      {guide.isOpen && (
        <PageGuide title="Technician ka hisaab" onClose={guide.close}
          steps={[
            { icon: Wrench, color: '#2563eb', title: 'Khula kaam', text: 'Jo repair abhi is ke paas hain — click kar ke kholein aur halat badlein.' },
            { icon: CalendarRange, color: '#7c3aed', title: 'Din ba din', text: 'Muddat chunein — kitne kaam, kitni kamai aur commission banta hai. Tankhwah ke din isi se hisaab karein.' },
            { icon: Wallet, color: '#16a34a', title: 'Commission dena', text: 'Commission diya ho to Expenses me likhein — galla aur Profit sahi rehte hain.' },
          ]}
          shortcuts={[['E', 'badlein'], ['Esc', 'wapas'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
