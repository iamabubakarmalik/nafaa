import { useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Phone, MapPin, Star, Wallet, Briefcase, Clock, Award,
  RefreshCw, MessageCircle, FileDown, TrendingUp, Wrench, HardHat,
  CheckCircle2, AlertTriangle, CalendarDays, Zap, BarChart3, Percent,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { techniciansApi } from '../api/technicians.api';
import {
  ApplianceHero, Kpi, Panel, Teacher, Empty, StatusBadge, useShortcuts,
  printHtml, downloadCsv, a4Shell, escapeHtml, toDateInput, fmtDate, fmtDuration,
  guideAction, printAction, Kbd,
} from '../components/shared';
import { svcStatusMeta, instStatusMeta, svcTypeMeta, catLabel } from '../constants';

/* ═════════════════════════════════════════════════════════════
   TECHNICIAN DETAIL — ek banday ka poora record
   ─────────────────────────────────────────────────────────────
   Commission dete waqt, ya ye faisla karte waqt ke "ye banda
   chal raha hai ya nahi", yahi safha kaam aata hai.
   ═════════════════════════════════════════════════════════════ */

const DAYS = ['Itwar', 'Peer', 'Mangal', 'Budh', 'Jumeraat', 'Juma', 'Hafta'];
const TOOLTIP: React.CSSProperties = {
  borderRadius: 12, border: '2px solid #334155', background: '#0f172a',
  color: '#fff', fontSize: 12, fontWeight: 700,
};

export default function TechnicianDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Meri Dukaan';
  const shopPhone = useAuthStore((s: any) => s.tenant?.phone || '');

  const [showTeacher, setShowTeacher] = useState(false);
  const [days, setDays] = useState(30);

  const range = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    return { from: toDateInput(from), to: toDateInput(to) };
  }, [days]);

  const { data: t, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['appliance-technician', id],
    queryFn: () => techniciansApi.getOne(id!),
    enabled: !!id,
  });

  const { data: work } = useQuery({
    queryKey: ['appliance-technician-workload', id, range],
    queryFn: () => techniciansApi.workload(id!, range.from, range.to),
    enabled: !!id,
  });

  useShortcuts({
    t: () => setShowTeacher(true),
    p: () => printA4(),
    Escape: () => { if (showTeacher) setShowTeacher(false); else navigate('/appliances/technicians'); },
  }, [showTeacher, t, work]);

  const wa = () => {
    if (!t) return;
    const digits = String(t.phone).replace(/[^0-9]/g, '');
    const phone = digits.startsWith('92') ? digits : digits.startsWith('0') ? '92' + digits.slice(1) : '92' + digits;
    const open = t.activeServiceRequests?.length ?? 0;
    const msg = open > 0
      ? `Assalam-o-Alaikum ${t.name}! 🙏\n\nAap ke paas abhi *${open}* kaam khula hai. Zara dekh lein.\n\n${shopName}`
      : `Assalam-o-Alaikum ${t.name}! 🙏\n\n${shopName}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const exportCsv = () => {
    if (!t) return;
    const jobs = [
      ...(work?.installations ?? []).map((i: any) => ({
        kind: 'Installation', num: i.installationNumber, customer: i.customerName, product: i.productName,
        status: instStatusMeta(i.status).label, date: i.scheduledDate, total: i.totalCharge, paid: i.paidByCustomer,
      })),
      ...(work?.serviceRequests ?? []).map((s: any) => ({
        kind: 'Repair', num: s.requestNumber, customer: s.customerName, product: s.productName,
        status: svcStatusMeta(s.status).label, date: s.scheduledDate, total: s.totalCharge, paid: s.paidAmount,
      })),
    ].sort((a, b) => new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime());

    downloadCsv(`technician-${t.employeeCode}-${range.from}-to-${range.to}.csv`, [
      [`${t.name} (${t.employeeCode}) — ${shopName}`],
      [`${fmtDate(range.from)} se ${fmtDate(range.to)} tak`],
      [`Rating: ${t.avgRating?.toFixed(1) ?? '—'} • Commission: ${t.commissionPct}%`],
      [],
      ['Qism', 'Number', 'Customer', 'Cheez', 'Halat', 'Tareekh', 'Kul bill', 'Wusool'],
      ...jobs.map((j) => [j.kind, j.num, j.customer, j.product, j.status, j.date ? fmtDate(j.date) : '', j.total, j.paid]),
      [],
      ['Kul kaam', jobs.length],
      ['Kul kamai', work?.totals.revenue ?? 0],
      ['Commission', work?.totals.commission ?? 0],
    ]);
    toast.success('Record export ho gaya');
  };

  const printA4 = () => {
    if (!t) return;
    const jobs = [
      ...(work?.installations ?? []).map((i: any) => ({
        kind: '🔧 Installation', num: i.installationNumber, customer: i.customerName, product: i.productName,
        status: instStatusMeta(i.status).label, date: i.scheduledDate, total: i.totalCharge,
      })),
      ...(work?.serviceRequests ?? []).map((s: any) => ({
        kind: '🛠️ Repair', num: s.requestNumber, customer: s.customerName, product: s.productName,
        status: svcStatusMeta(s.status).label, date: s.scheduledDate, total: s.totalCharge,
      })),
    ].sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());

    const body = `
      <h2 class="sec">👷 Technician</h2>
      <table>
        <tbody>
          <tr><td class="main" style="width:30%">Naam</td><td>${escapeHtml(t.name)} (${escapeHtml(t.employeeCode)})</td></tr>
          <tr><td class="main">Phone</td><td>${escapeHtml(t.phone)}${t.cnic ? ` • CNIC ${escapeHtml(t.cnic)}` : ''}</td></tr>
          <tr><td class="main">Ilaqa</td><td>${escapeHtml(t.currentZone ?? '—')}</td></tr>
          <tr><td class="main">Maharat</td><td>${escapeHtml((t.specializations ?? []).join(', ') || '—')}</td></tr>
          <tr><td class="main">Commission</td><td>${t.commissionPct}% • Visit rate ${formatPKR(t.visitChargeRate)} • Ghanta ${formatPKR(t.hourlyRate)}</td></tr>
          <tr><td class="main">Rating</td><td>${t.avgRating ? `${t.avgRating.toFixed(1)} ★ (${t.totalReviews} raye)` : '—'}</td></tr>
        </tbody>
      </table>

      <h2 class="sec">📋 Is Arse Ka Kaam (${fmtDate(range.from)} — ${fmtDate(range.to)})</h2>
      <table>
        <thead><tr><th>#</th><th>Qism / Number</th><th>Customer</th><th>Cheez</th><th class="c">Halat</th><th>Tareekh</th><th class="r">Bill</th></tr></thead>
        <tbody>
          ${jobs.map((j, i) => `
            <tr>
              <td class="num">${i + 1}</td>
              <td><div class="main">${j.kind}</div><div class="sub">${escapeHtml(j.num)}</div></td>
              <td>${escapeHtml(j.customer)}</td>
              <td>${escapeHtml(j.product)}</td>
              <td class="c"><span class="pill">${escapeHtml(j.status)}</span></td>
              <td>${j.date ? fmtDate(j.date) : '—'}</td>
              <td class="r">${formatPKR(j.total)}</td>
            </tr>`).join('') || '<tr><td colspan="7" style="text-align:center;padding:14px;color:#94a3b8;">Is arse me koi kaam nahi</td></tr>'}
          <tr class="grand">
            <td colspan="6" style="text-align:right;padding-right:12px;">KUL KAMAI</td>
            <td class="r" style="color:#a5f3fc !important;">${formatPKR(work?.totals.revenue ?? 0)}</td>
          </tr>
          <tr class="grand">
            <td colspan="6" style="text-align:right;padding-right:12px;">COMMISSION (${t.commissionPct}%)</td>
            <td class="r" style="color:#c4b5fd !important;">${formatPKR(work?.totals.commission ?? 0)}</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top:26px;display:flex;justify-content:space-between;gap:40px;">
        <div style="flex:1;border-top:1.5px solid #0f172a;padding-top:5px;text-align:center;font-size:10px;font-weight:700;">Technician ke dastakhat</div>
        <div style="flex:1;border-top:1.5px solid #0f172a;padding-top:5px;text-align:center;font-size:10px;font-weight:700;">Malik ke dastakhat</div>
      </div>`;

    const ok = printHtml(a4Shell({
      title: `${t.name} — ${shopName}`,
      heading: `👷 ${escapeHtml(t.name)}`,
      shopName, shopPhone, badge: 'Commission Statement',
      kpis: [
        { label: '📋 Kaam', value: String(work?.totals.totalJobs ?? 0), sub: `${work?.totals.completed ?? 0} mukammal`, tone: 'blue' },
        { label: '💰 Kamai', value: formatPKR(work?.totals.revenue ?? 0), tone: 'green' },
        { label: '🎯 Commission', value: formatPKR(work?.totals.commission ?? 0), sub: `${t.commissionPct}%`, tone: 'amber' },
        { label: '⭐ Rating', value: t.avgRating ? t.avgRating.toFixed(1) : '—', sub: `${t.totalReviews} raye`, tone: 'rose' },
      ],
      body,
    }));
    if (!ok) toast.error('Popup block hai — allow karein');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-40 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!t) {
    return (
      <Empty icon={AlertTriangle} title="Technician nahi mila"
        hint="Shayad delete ho chuka hai ya link ghalat hai"
        action={<Link to="/appliances/technicians"><Button variant="secondary"><ArrowLeft className="h-4 w-4" /> Wapas</Button></Link>} />
    );
  }

  const openJobs = (t.activeServiceRequests?.length ?? 0);
  const m = t.month;
  const dayChart = (work?.byDay ?? []).map((d: any) => ({
    date: new Date(d.date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }),
    Repair: d.services,
    Installation: d.installations,
  }));

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <DetailTeacher onClose={() => setShowTeacher(false)} />}

      <Link to="/appliances/technicians"
        className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 font-extrabold transition">
        <ArrowLeft className="h-4 w-4" /> Saare technicians
      </Link>

      <ApplianceHero
        badge={t.isActive ? 'Active Technician' : 'Band Technician'}
        badgeIcon={<Briefcase className="h-3.5 w-3.5 text-amber-300" />}
        title={`👷 ${t.name}`}
        subtitle={
          <>
            <span className="font-mono">{t.employeeCode}</span>
            <span className="opacity-50 mx-1.5">•</span>
            <span className="font-mono">{t.phone}</span>
            {t.currentZone && <><span className="opacity-50 mx-1.5">•</span>📍 {t.currentZone}</>}
            {t.avgRating ? <><span className="opacity-50 mx-1.5">•</span><strong className="text-amber-300">⭐ {t.avgRating.toFixed(1)}</strong></> : null}
          </>
        }
        actions={[
          guideAction(() => setShowTeacher(true)),
          { key: 'refresh', label: 'Refresh', icon: <RefreshCw className="h-4 w-4" />, onClick: () => refetch(), spinning: isFetching, hideLabelOnMobile: true },
          { key: 'wa', label: 'WhatsApp', icon: <MessageCircle className="h-4 w-4" />, onClick: wa, variant: 'accent', hideLabelOnMobile: true },
          { key: 'csv', label: 'CSV', icon: <FileDown className="h-4 w-4" />, onClick: exportCsv, hideLabelOnMobile: true },
          printAction(printA4),
        ]}
        shortcuts={[{ keys: 'P', label: 'Commission statement' }, { keys: 'T', label: 'Guide' }, { keys: 'Esc', label: 'Wapas' }]}
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Kpi icon={Briefcase} tone={openJobs === 0 ? 'emerald' : openJobs > 5 ? 'rose' : 'amber'}
          label="Abhi Khula Kaam" value={openJobs}
          sub={openJobs === 0 ? '🟢 khali hai — kaam dein' : openJobs > 5 ? '🔴 bojh ziyada' : '🟡 kaam chal raha'}
          alert={openJobs > 5} />
        <Kpi icon={TrendingUp} tone="cyan" label="Is Mahine Kamai" value={formatPKR(m?.revenue ?? 0)} sub={`${m?.jobs ?? 0} kaam mukammal`} />
        <Kpi icon={Wallet} tone="violet" label="Is Mahine Commission" value={formatPKR(m?.commission ?? 0)} sub={`${t.commissionPct}% rate`} />
        <Kpi icon={Clock} tone="blue" label="Ausat Waqt" value={fmtDuration(m?.avgResolutionHours ?? 0)} sub="request se mukammal tak" />
      </section>

      {/* Lifetime */}
      <Panel icon={Award} title="Ab Tak Ka Record" hint="Jab se ye team me hai" tone="violet">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Box label="Kul Kaam" value={String(t.totalJobs)} />
          <Box label="Mukammal" value={String(t.completedJobs)} sub={`${(t.completionRate ?? 0).toFixed(0)}%`} tone="emerald" />
          <Box label="Kul Kamai" value={formatPKR(t.totalRevenue)} tone="cyan" />
          <Box label="Kul Commission" value={formatPKR(t.totalCommission)} tone="violet" />
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] font-extrabold mb-1">
            <span className="text-slate-600 dark:text-slate-300">Mukammal karne ki shirah</span>
            <span className={(t.completionRate ?? 0) >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
              {(t.completionRate ?? 0).toFixed(0)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${
              (t.completionRate ?? 0) >= 80 ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'
            }`} style={{ width: `${Math.min(t.completionRate ?? 0, 100)}%` }} />
          </div>
        </div>
      </Panel>

      {/* Profile */}
      <div className="grid lg:grid-cols-2 gap-3 sm:gap-4">
        <Panel icon={Zap} title="Maharat" hint="Kaam dete waqt system isi ko dekhta hai" tone="amber">
          {(t.specializations ?? []).length === 0 && (t.categoriesExpertise ?? []).length === 0 ? (
            <p className="text-xs font-bold text-slate-400 py-4 text-center">Koi maharat darj nahi — edit kar ke bharein</p>
          ) : (
            <>
              {(t.specializations ?? []).length > 0 && (
                <div className="flex gap-1.5 flex-wrap mb-3">
                  {t.specializations.map((s) => (
                    <span key={s} className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] font-extrabold">{s}</span>
                  ))}
                </div>
              )}
              {(t.categoriesExpertise ?? []).length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {t.categoriesExpertise.map((c: any) => (
                    <span key={c} className="px-2.5 py-1 rounded-lg bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 text-[11px] font-extrabold">
                      {catLabel(c)}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
          {(t.certifications ?? []).length > 0 && (
            <div className="mt-3">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Certificates</div>
              <div className="flex gap-1.5 flex-wrap">
                {t.certifications.map((c) => (
                  <span key={c} className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold">🏅 {c}</span>
                ))}
              </div>
            </div>
          )}
        </Panel>

        <Panel icon={CalendarDays} title="Kaam Ka Waqt" tone="blue">
          <div className="flex gap-1.5 flex-wrap mb-3">
            {DAYS.map((d, i) => (
              <span key={d} className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold ${
                (t.workingDays ?? []).includes(i)
                  ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 line-through'
              }`}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Box label="Waqt" value={`${t.workStartTime} – ${t.workEndTime}`} />
            <Box label="Tajurba" value={t.experienceYears ? `${t.experienceYears} saal` : '—'} />
            <Box label="Visit Rate" value={formatPKR(t.visitChargeRate)} />
            <Box label="Ghanta Rate" value={formatPKR(t.hourlyRate)} />
          </div>
          {t.address && (
            <div className="mt-3 flex items-start gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" /> {t.address}
            </div>
          )}
          {t.notes && (
            <div className="mt-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-2.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              {t.notes}
            </div>
          )}
        </Panel>
      </div>

      {/* Range */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Kaam ka arsa</span>
        {[7, 30, 90].map((d) => (
          <button key={d} onClick={() => setDays(d)}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold border-2 transition ${
              days === d ? 'bg-cyan-600 border-cyan-600 text-white shadow'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-cyan-400'
            }`}>{d === 7 ? '7 din' : d === 30 ? '1 mahina' : '3 mahine'}</button>
        ))}
      </div>

      {work && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <Kpi icon={Briefcase} tone="cyan" label="Kul Kaam" value={work.totals.totalJobs} sub={`${work.totals.completed} mukammal`} />
          <Kpi icon={HardHat} tone="blue" label="Installations" value={work.totals.installations} />
          <Kpi icon={Wrench} tone="amber" label="Repairs" value={work.totals.serviceRequests} />
          <Kpi icon={Percent} tone="violet" label="Is Arse Ki Commission" value={formatPKR(work.totals.commission)} sub={`kamai ${formatPKR(work.totals.revenue)}`} />
        </section>
      )}

      {dayChart.length > 0 && (
        <Panel icon={BarChart3} title="Din Ke Hisab Se Bojh" hint="Kaunse din ziyada kaam para" tone="cyan">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dayChart} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fontWeight: 700 }} stroke="#94a3b8" />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fontWeight: 700 }} stroke="#94a3b8" />
              <Tooltip contentStyle={TOOLTIP} />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
              <Bar dataKey="Repair" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Installation" stackId="a" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      )}

      {/* Active jobs */}
      <Panel icon={AlertTriangle} title={`Abhi Khula Kaam (${openJobs})`} hint="Ye kaam abhi is banday ke sar par hai"
        tone={openJobs > 5 ? 'rose' : 'amber'}>
        {openJobs === 0 ? (
          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 py-6 text-center">
            🟢 Koi kaam baqi nahi — isay naya kaam de sakte hain
          </p>
        ) : (
          <div className="space-y-1.5">
            {t.activeServiceRequests.map((s: any) => (
              <Link key={s.id} to="/appliances/service-requests"
                className="flex items-center gap-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-2 transition">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-extrabold text-slate-900 dark:text-white truncate">{s.customerName} — {s.productName}</div>
                  <div className="text-[10px] font-bold text-slate-400 truncate">
                    {s.requestNumber} • {s.reportedIssue}
                    {s.scheduledDate ? ` • ${fmtDate(s.scheduledDate)}` : ''}
                  </div>
                </div>
                <StatusBadge meta={svcStatusMeta(s.status)} size="xs" />
              </Link>
            ))}
          </div>
        )}
      </Panel>

      {/* Recent work */}
      <div className="grid lg:grid-cols-2 gap-3 sm:gap-4">
        <Panel icon={Wrench} title={`Haal ke Repairs (${t.recentServices?.length ?? 0})`} tone="amber">
          {(t.recentServices ?? []).length === 0 ? (
            <p className="text-xs font-bold text-slate-400 py-6 text-center">Abhi koi repair nahi kiya</p>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {t.recentServices.map((s: any) => (
                <div key={s.id} className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 px-2.5 py-2">
                  <span className="text-base shrink-0">{svcTypeMeta(s.serviceType).emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-extrabold text-slate-900 dark:text-white truncate">{s.customerName}</div>
                    <div className="text-[10px] font-bold text-slate-400 truncate">{s.productName} • {fmtDate(s.requestedAt)}</div>
                  </div>
                  <StatusBadge meta={svcStatusMeta(s.status)} size="xs" />
                  <div className="text-[11px] font-extrabold tabular-nums text-slate-700 dark:text-slate-200 shrink-0 w-16 text-right">
                    {formatPKR(s.totalCharge)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel icon={HardHat} title={`Haal ki Installations (${t.recentJobs?.length ?? 0})`} tone="blue">
          {(t.recentJobs ?? []).length === 0 ? (
            <p className="text-xs font-bold text-slate-400 py-6 text-center">Abhi koi installation nahi ki</p>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {t.recentJobs.map((j: any) => (
                <div key={j.id} className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 px-2.5 py-2">
                  <span className="text-base shrink-0">{svcTypeMeta(j.serviceType).emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-extrabold text-slate-900 dark:text-white truncate">{j.customerName}</div>
                    <div className="text-[10px] font-bold text-slate-400 truncate">
                      {j.productName} • {fmtDate(j.scheduledDate || j.createdAt)}
                      {j.demoGiven ? ' • demo ✓' : ''}
                    </div>
                  </div>
                  <StatusBadge meta={instStatusMeta(j.status)} size="xs" />
                  <div className="text-[11px] font-extrabold tabular-nums text-slate-700 dark:text-slate-200 shrink-0 w-16 text-right">
                    {formatPKR(j.totalCharge)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Box({ label, value, sub, tone = 'slate' }: { label: string; value: string; sub?: string; tone?: 'slate' | 'cyan' | 'emerald' | 'violet' }) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200',
    cyan: 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-300',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
    violet: 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/30 text-violet-700 dark:text-violet-300',
  };
  return (
    <div className={`rounded-xl border px-2.5 py-2 ${tones[tone]}`}>
      <div className="text-[9px] font-extrabold uppercase tracking-wider opacity-75">{label}</div>
      <div className="text-sm font-extrabold tabular-nums truncate">{value}</div>
      {sub && <div className="text-[9px] font-bold opacity-70">{sub}</div>}
    </div>
  );
}

function DetailTeacher({ onClose }: { onClose: () => void }) {
  return (
    <Teacher
      title="Technician Ka Record Kaise Parhein?"
      intro={<>Ye safha ek banday ka <strong>poora hisab</strong> hai — kaam, kamai, commission aur rating.</>}
      blocks={[
        {
          title: '💰 Commission dena',
          tone: 'violet',
          tips: [
            <>Upar <strong>"Kaam ka arsa"</strong> chunein (7 din / 1 mahina / 3 mahine)</>,
            <><Kbd dark>P</Kbd> dabayein — <strong>commission statement</strong> A4 par nikal aayega, har kaam ki tafseel aur dono dastakhaton ki jagah ke sath</>,
            <>Commission <strong>kul bill ka %</strong> hoti hai — parts/material ka kharcha bhi shamil hota hai</>,
          ],
        },
        {
          title: '📊 Kaarkardagi parakhna',
          tone: 'cyan',
          tips: [
            <><strong>Mukammal karne ki shirah</strong> 80% se upar honi chahiye. Kam ho to dekhein kaam ghalat qism ka to nahi mil raha</>,
            <><strong>Ausat waqt</strong> — ye banda request milne se mukammal karne tak kitna waqt leta hai</>,
            <><strong>Din ke hisab se bojh</strong> — agar sirf 2 din par saara kaam hai to baqi din zaya ho rahe hain</>,
            <><strong>Rating</strong> khud banti hai jab kaam mukammal karte waqt customer ki rating daalte hain</>,
          ],
        },
      ]}
      shortcuts={[
        { keys: 'P', label: 'Commission statement' },
        { keys: 'T', label: 'Ye guide' },
        { keys: 'Esc', label: 'Wapas' },
      ]}
      golden={<><strong>Sunahri usool:</strong> Commission <strong>waqt par</strong> dein. Technician sab se ziyada isi cheez par dukaan badalte hain.</>}
      onClose={onClose}
    />
  );
}
