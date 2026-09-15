import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  HardHat, Plus, Search, X, RefreshCw, Filter, Users, Clock,
  AlertTriangle, CheckCircle2, Wallet, TrendingUp, Phone, MapPin,
  Loader2, ListChecks, Star, Pencil, MessageCircle, FileDown, Printer,
  CalendarDays, Package, Banknote, History, ChevronLeft, ChevronRight,
  Zap, UserCheck, Ban, Trash2, PlayCircle, Award, Home,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { installationsApi, type Installation } from '../api/installations.api';
import { techniciansApi } from '../api/technicians.api';
import { applianceSerialApi } from '../api/serial-tracking.api';
import {
  ApplianceHero, Kpi, Panel, Teacher, Empty, Sheet, Field, inputCls, ChipRow,
  StatusBadge, useShortcuts, printHtml, downloadCsv, a4Shell, escapeHtml,
  toDateInput, fmtDate, fmtDateTime, guideAction, printAction, Kbd,
} from '../components/shared';
import {
  instStatusMeta, svcTypeMeta, INSTALL_STATUS_ORDER, INSTALL_NEXT,
  SERVICE_TYPE_ORDER, TIME_SLOTS, TIME_SLOTS as SLOTS,
  type ApplianceInstallationStatus,
} from '../constants';

/* ═════════════════════════════════════════════════════════════
   INSTALLATIONS — "maal bik gaya, ab lagana hai"
   ─────────────────────────────────────────────────────────────
   AC lagana, geyser fit karna, TV mount karna — ye alag kaam hai
   aur alag paisa deta hai. Yahan har job ka schedule, banda,
   site ki tayyari, demo aur certificate sab rehta hai.
   ═════════════════════════════════════════════════════════════ */

type Tab = 'queue' | 'today' | 'all';

export default function InstallationsPage() {
  const qc = useQueryClient();
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Meri Dukaan';
  const shopPhone = useAuthStore((s: any) => s.tenant?.phone || '');
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('queue');
  const [showTeacher, setShowTeacher] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ApplianceInstallationStatus | null>(null);
  const [serviceType, setServiceType] = useState<string | null>(null);
  const [techId, setTechId] = useState('');
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['appliance-installs'] });
    qc.invalidateQueries({ queryKey: ['appliance-install-queue'] });
    qc.invalidateQueries({ queryKey: ['appliance-install-today'] });
    qc.invalidateQueries({ queryKey: ['appliance-install-summary'] });
    qc.invalidateQueries({ queryKey: ['appliance-technicians'] });
  };

  const { data: summary } = useQuery({
    queryKey: ['appliance-install-summary'],
    queryFn: installationsApi.summary,
  });

  const { data: queue = [], isLoading: qLoading, refetch: rQ, isFetching: fQ } = useQuery({
    queryKey: ['appliance-install-queue'],
    queryFn: installationsApi.queue,
    enabled: tab === 'queue',
  });

  const { data: today = [], isLoading: tLoading, refetch: rT, isFetching: fT } = useQuery({
    queryKey: ['appliance-install-today'],
    queryFn: installationsApi.today,
    enabled: tab === 'today',
  });

  const listParams = {
    search: search.trim() || undefined,
    status: status ?? undefined,
    serviceType: serviceType ?? undefined,
    technicianId: techId || undefined,
    unpaidOnly: unpaidOnly || undefined,
    from: from || undefined,
    to: to || undefined,
    page, limit: 50,
  };
  const { data: listData, isLoading: lLoading, refetch: rL, isFetching: fL } = useQuery({
    queryKey: ['appliance-installs', listParams],
    queryFn: () => installationsApi.list(listParams),
    enabled: tab === 'all',
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['appliance-technicians', 'active'],
    queryFn: () => techniciansApi.list({ active: true }),
  });

  const rows: Installation[] = tab === 'queue' ? queue : tab === 'today' ? today : (listData?.items ?? []);
  const loading = tab === 'queue' ? qLoading : tab === 'today' ? tLoading : lLoading;
  const fetching = tab === 'queue' ? fQ : tab === 'today' ? fT : fL;
  const refetch = tab === 'queue' ? rQ : tab === 'today' ? rT : rL;

  const hasFilters = !!(search || status || serviceType || techId || unpaidOnly || from || to);
  const clearFilters = () => {
    setSearch(''); setStatus(null); setServiceType(null); setTechId('');
    setUnpaidOnly(false); setFrom(''); setTo(''); setPage(1);
  };

  const exportCsv = () => {
    if (!rows.length) return toast.error('Koi record nahi');
    downloadCsv(`installations-${toDateInput(new Date())}.csv`, [
      [`Installations — ${shopName}`],
      [`Nikala gaya: ${new Date().toLocaleString('en-PK')}`],
      [],
      ['Installation #', 'Banaya', 'Customer', 'Phone', 'Pata', 'Sheher', 'Cheez', 'Serial',
       'Qism', 'Halat', 'Tareekh', 'Waqt', 'Technician', 'Labor', 'Material', 'Visit',
       'Kul', 'Wusool', 'Baqi', 'Warranty me', 'Demo diya', 'Mukammal', 'Rating', 'Certificate'],
      ...rows.map((r) => [
        r.installationNumber, fmtDate(r.createdAt), r.customerName, r.customerPhone,
        r.customerAddress, [r.city, r.area].filter(Boolean).join(', '),
        r.productName, r.serialNumber || '',
        svcTypeMeta(r.serviceType).label, instStatusMeta(r.status).label,
        r.scheduledDate ? fmtDate(r.scheduledDate) : '', r.scheduledTimeSlot || '',
        r.technicianName || '',
        r.laborCharge, r.materialsCharge, r.visitCharge, r.totalCharge, r.paidByCustomer,
        Math.max(r.totalCharge - r.paidByCustomer, 0),
        r.covered_underWarranty ? 'Haan' : 'Nahi',
        r.demoGiven ? 'Haan' : 'Nahi',
        r.completedAt ? fmtDate(r.completedAt) : '',
        r.customerRating ?? '', r.installationCertificateNumber || '',
      ]),
    ]);
    toast.success(`${rows.length} record export ho gaye`);
  };

  const printA4 = () => {
    if (!rows.length) return toast.error('Koi record nahi');
    const total = rows.reduce((s, r) => s + r.totalCharge, 0);
    const due = rows.reduce((s, r) => s + Math.max(r.totalCharge - r.paidByCustomer, 0), 0);
    const body = `
      <h2 class="sec">${tab === 'today' ? '📅 Aaj Ka Schedule' : tab === 'queue' ? '🔧 Baqi Installations' : '📋 Installation Record'}</h2>
      <table>
        <thead><tr>
          <th>#</th><th>Installation / Tareekh</th><th>Customer / Pata</th><th>Cheez</th>
          <th>Technician</th><th class="c">Halat</th><th class="r">Kul</th><th class="r">Baqi</th>
        </tr></thead>
        <tbody>
          ${rows.map((r, i) => `
            <tr>
              <td class="num">${i + 1}</td>
              <td><div class="main">${escapeHtml(r.installationNumber)}</div><div class="sub">${r.scheduledDate ? fmtDate(r.scheduledDate) : fmtDate(r.createdAt)}${r.scheduledTimeSlot ? ` • ${escapeHtml(r.scheduledTimeSlot)}` : ''}</div></td>
              <td><div class="main">${escapeHtml(r.customerName)}</div><div class="sub">📞 ${escapeHtml(r.customerPhone)} • ${escapeHtml(String(r.customerAddress).slice(0, 45))}</div></td>
              <td><div class="main">${escapeHtml(r.productName)}</div>${r.serialNumber ? `<div class="sub">SN: ${escapeHtml(r.serialNumber)}</div>` : ''}</td>
              <td>${escapeHtml(r.technicianName || '—')}</td>
              <td class="c"><span class="pill">${instStatusMeta(r.status).label}</span></td>
              <td class="r">${formatPKR(r.totalCharge)}</td>
              <td class="r" style="color:${r.totalCharge - r.paidByCustomer > 0 ? '#b91c1c' : '#059669'}">
                ${r.totalCharge - r.paidByCustomer > 0 ? formatPKR(r.totalCharge - r.paidByCustomer) : 'Clear ✓'}
              </td>
            </tr>`).join('')}
          <tr class="grand">
            <td colspan="6" style="text-align:right;padding-right:12px;">KUL</td>
            <td class="r" style="color:#a5f3fc !important;">${formatPKR(total)}</td>
            <td class="r" style="color:#fca5a5 !important;">${formatPKR(due)}</td>
          </tr>
        </tbody>
      </table>`;

    const ok = printHtml(a4Shell({
      title: `Installations — ${shopName}`,
      heading: '🔧 Installation Register',
      shopName, shopPhone, badge: 'Installation Report',
      kpis: [
        { label: '📋 Records', value: String(rows.length), tone: 'blue' },
        { label: '✅ Lag Gaye', value: String(rows.filter((r) => r.status === 'COMPLETED').length), tone: 'green' },
        { label: '💰 Kul Bill', value: formatPKR(total), tone: 'amber' },
        { label: '⏳ Baqi', value: formatPKR(due), tone: 'rose' },
      ],
      body,
    }));
    if (!ok) toast.error('Popup block hai — allow karein');
  };

  useShortcuts({
    '/': () => { setTab('all'); setTimeout(() => searchRef.current?.focus(), 0); },
    n: () => setShowNew(true),
    t: () => setShowTeacher(true),
    p: () => printA4(),
    f: () => setShowFilters((v) => !v),
    q: () => setTab('queue'),
    d: () => setTab('today'),
    Escape: () => {
      if (showNew) setShowNew(false);
      else if (detailId) setDetailId(null);
      else if (showTeacher) setShowTeacher(false);
      else if (showFilters) setShowFilters(false);
    },
  }, [showNew, detailId, showTeacher, showFilters, rows]);

  const m = summary?.month;

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <InstallTeacher onClose={() => setShowTeacher(false)} />}
      {showNew && (
        <NewInstallModal technicians={technicians} onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); invalidate(); }} />
      )}
      {detailId && (
        <InstallDetailSheet id={detailId} technicians={technicians} shopName={shopName} shopPhone={shopPhone}
          onClose={() => setDetailId(null)} onChanged={invalidate} />
      )}

      <ApplianceHero
        badge="Installation Service"
        badgeIcon={<HardHat className="h-3.5 w-3.5 text-amber-300" />}
        title="🔧 Installations"
        subtitle={
          summary ? (
            <>
              <strong className="text-cyan-200">{summary.open}</strong> lagana baqi
              <span className="opacity-50 mx-1.5">•</span>
              <strong className="text-amber-300">{summary.todayJobs}</strong> aaj
              {summary.overdue > 0 && (
                <><span className="opacity-50 mx-1.5">•</span><strong className="text-rose-300">{summary.overdue}</strong> late</>
              )}
              <span className="opacity-50 mx-1.5">•</span>
              <strong className="text-emerald-300">{summary.completed}</strong> ho chuke
            </>
          ) : 'AC lagana, geyser fit karna — har job ka record'
        }
        actions={[
          guideAction(() => setShowTeacher(true)),
          { key: 'refresh', label: 'Refresh', icon: <RefreshCw className="h-4 w-4" />, onClick: () => refetch(), spinning: fetching, hideLabelOnMobile: true },
          { key: 'csv', label: 'CSV', icon: <FileDown className="h-4 w-4" />, onClick: exportCsv, disabled: !rows.length, hideLabelOnMobile: true },
          printAction(printA4, !rows.length),
          { key: 'new', label: 'Nayi Installation', icon: <Plus className="h-4 w-4" />, shortcut: 'N', onClick: () => setShowNew(true), variant: 'solid' },
        ]}
        shortcuts={[
          { keys: 'Q', label: 'Baqi' }, { keys: 'D', label: 'Aaj' },
          { keys: '/', label: 'Search' }, { keys: 'N', label: 'Nayi' },
          { keys: 'F', label: 'Filters' }, { keys: 'P', label: 'Print' },
          { keys: 'T', label: 'Guide' }, { keys: 'Esc', label: 'Band' },
        ]}
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Kpi icon={ListChecks} tone="cyan" label="Lagana Baqi" value={summary?.open ?? 0}
          sub={`${summary?.unassigned ?? 0} bina banday ke`} onClick={() => setTab('queue')} active={tab === 'queue'} />
        <Kpi icon={CalendarDays} tone="violet" label="Aaj Ka Kaam" value={summary?.todayJobs ?? 0}
          sub="aaj ki tareekh par" onClick={() => setTab('today')} active={tab === 'today'} />
        <Kpi icon={AlertTriangle} tone="rose" label="Late" value={summary?.overdue ?? 0}
          sub="tareekh guzar gayi" alert={(summary?.overdue ?? 0) > 0} />
        <Kpi icon={TrendingUp} tone="emerald" label="Is Mahine Kamai" value={formatPKR(m?.revenue ?? 0)}
          sub={`${m?.jobs ?? 0} kaam • munafa ${formatPKR(m?.profit ?? 0)}`} />
      </section>

      {m && (m.outstanding > 0 || m.demosGiven > 0 || m.avgRating) && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <Kpi icon={Banknote} tone="amber" label="Baqi Paisa" value={formatPKR(m.outstanding)}
            sub="lag gaya, paisa nahi mila" alert={m.outstanding > 0}
            onClick={() => { setTab('all'); setUnpaidOnly(true); setPage(1); }} />
          <Kpi icon={Package} tone="orange" label="Material ka Kharcha" value={formatPKR(m.materialCost)} sub="pipe, wire, bracket" />
          <Kpi icon={PlayCircle} tone="blue" label="Demo Diye" value={m.demosGiven} sub="customer ko chalana sikhaya" />
          <Kpi icon={Star} tone="teal" label="Rating" value={m.avgRating ? m.avgRating.toFixed(1) : '—'} sub="customer ki raye" />
        </section>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 shadow-sm">
          <TabBtn active={tab === 'queue'} onClick={() => setTab('queue')} icon={ListChecks} label="Baqi" badge={summary?.open} />
          <TabBtn active={tab === 'today'} onClick={() => setTab('today')} icon={CalendarDays} label="Aaj" badge={summary?.todayJobs} />
          <TabBtn active={tab === 'all'} onClick={() => setTab('all')} icon={History} label="Poora Record" />
        </div>
        <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400 tabular-nums px-1">
          {tab === 'all' ? `${listData?.meta?.total ?? 0} records` : `${rows.length} kaam`}
        </div>
      </div>

      {tab === 'all' && (
        <>
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input ref={searchRef} className={inputCls('h-12 pl-10 pr-10 text-sm font-semibold')}
                placeholder="Installation #, customer, phone, pata, serial... (/)"
                value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`h-12 px-4 rounded-2xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
                showFilters || hasFilters
                  ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-cyan-300'
              }`}>
              <Filter className="h-4 w-4" /> <span className="hidden sm:inline">Filters</span>
              {hasFilters && <span className="h-5 w-5 rounded-full bg-cyan-600 text-white text-[10px] font-bold flex items-center justify-center">!</span>}
            </button>
            <button onClick={() => { setUnpaidOnly(!unpaidOnly); setPage(1); }}
              className={`h-12 px-4 rounded-2xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
                unpaidOnly ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-rose-300'
              }`} title="Sirf wo jin ka paisa baqi hai">
              <Banknote className="h-4 w-4" /> <span className="hidden sm:inline">Baqi paisa</span>
            </button>
          </div>

          {showFilters && (
            <Panel className="space-y-3">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Halat</div>
                <ChipRow
                  options={INSTALL_STATUS_ORDER.map((s) => ({ value: s, label: instStatusMeta(s).label, emoji: instStatusMeta(s).emoji }))}
                  value={status} onChange={(v) => { setStatus(v); setPage(1); }} />
              </div>
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Kaam ki qism</div>
                <ChipRow
                  options={SERVICE_TYPE_ORDER.map((s) => ({ value: s, label: svcTypeMeta(s).label, emoji: svcTypeMeta(s).emoji }))}
                  value={serviceType as any} onChange={(v) => { setServiceType(v); setPage(1); }} />
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="Technician">
                  <select className={inputCls('h-11 text-xs font-extrabold')} value={techId} onChange={(e) => { setTechId(e.target.value); setPage(1); }}>
                    <option value="">Sab</option>
                    {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </Field>
                <Field label="Se">
                  <input type="date" className={inputCls('h-11 text-xs font-bold [color-scheme:light] dark:[color-scheme:dark]')} value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
                </Field>
                <Field label="Tak">
                  <input type="date" className={inputCls('h-11 text-xs font-bold [color-scheme:light] dark:[color-scheme:dark]')} value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
                </Field>
              </div>
              {hasFilters && (
                <button onClick={clearFilters} className="text-xs font-extrabold text-rose-600 dark:text-rose-400 inline-flex items-center gap-1">
                  <X className="h-3 w-3" /> Sab filters clear karo
                </button>
              )}
            </Panel>
          )}
        </>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-56 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
        </div>
      ) : rows.length === 0 ? (
        <Empty
          icon={HardHat}
          title={
            tab === 'today' ? 'Aaj koi installation nahi 🎉'
              : tab === 'queue' ? 'Sab kuch lag chuka hai 🎉'
              : hasFilters ? 'Koi record nahi mila' : 'Abhi koi installation nahi'
          }
          hint={
            tab === 'today' ? 'Aaj ki tareekh par koi kaam schedule nahi hai.'
              : tab === 'queue' ? 'Koi installation baqi nahi. Naya maal bikte hi yahan aa jayega.'
              : hasFilters ? 'Filter badal kar dekhein ya clear karein'
              : 'AC, geyser ya washing machine bech kar "Nayi Installation" banayein — phir technician lagayein'
          }
          action={
            hasFilters ? <Button variant="secondary" onClick={clearFilters}><X className="h-4 w-4" /> Filters Clear</Button>
              : <Button className="bg-gradient-to-r from-cyan-600 to-teal-700 font-extrabold shadow-lg shadow-cyan-500/40" onClick={() => setShowNew(true)}>
                  <Plus className="h-4 w-4" /> Nayi Installation
                </Button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {rows.map((r) => <InstallCard key={r.id} r={r} onOpen={() => setDetailId(r.id)} />)}
        </div>
      )}

      {tab === 'all' && listData && listData.meta.totalPages > 1 && (
        <div className="flex items-center justify-between flex-wrap gap-2 bg-white dark:bg-slate-900/80 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-bold">
            Page <strong className="text-slate-900 dark:text-white">{listData.meta.page}</strong> / <strong className="text-slate-900 dark:text-white">{listData.meta.totalPages}</strong>
            <span className="opacity-50 mx-1">•</span>
            <strong className="text-slate-900 dark:text-white tabular-nums">{listData.meta.total}</strong> records
          </div>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
              className="h-10 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1">
              <ChevronLeft className="h-4 w-4" /> Pehle
            </button>
            <button disabled={page >= listData.meta.totalPages} onClick={() => setPage((p) => p + 1)}
              className="h-10 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1">
              Agla <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label, badge }: any) {
  return (
    <button onClick={onClick}
      className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
        active ? 'bg-slate-900 dark:bg-cyan-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}>
      <Icon className="h-4 w-4" /> {label}
      {badge ? <span className={`px-1.5 rounded-full text-[9px] tabular-nums ${active ? 'bg-white/25' : 'bg-slate-200 dark:bg-slate-700'}`}>{badge}</span> : null}
    </button>
  );
}

/* ═════════════════════════════════════════════════════════════
   CARD
   ═════════════════════════════════════════════════════════════ */
function InstallCard({ r, onOpen }: { r: Installation; onOpen: () => void }) {
  const st = instStatusMeta(r.status);
  const ty = svcTypeMeta(r.serviceType);
  const due = Math.max(r.totalCharge - r.paidByCustomer, 0);
  const overdue = r.isOverdue ?? (st.isOpen && !!r.scheduledDate && new Date(r.scheduledDate) < new Date());

  const wa = () => {
    const digits = String(r.customerPhone).replace(/[^0-9]/g, '');
    const phone = digits.startsWith('92') ? digits : digits.startsWith('0') ? '92' + digits.slice(1) : '92' + digits;
    const msg = r.status === 'COMPLETED'
      ? `Assalam-o-Alaikum ${r.customerName}! 🙏\n\nAap ka *${r.productName}* lag chuka hai (${r.installationNumber}).${r.installationCertificateNumber ? `\nCertificate: ${r.installationCertificateNumber}` : ''}${due > 0 ? `\n\nBaqi raqam: *Rs ${due.toLocaleString('en-PK')}*` : ''}\n\nShukriya!`
      : `Assalam-o-Alaikum ${r.customerName}! 🙏\n\nAap ke *${r.productName}* ki installation${r.scheduledDate ? ` *${fmtDate(r.scheduledDate)}*${r.scheduledTimeSlot ? ` (${r.scheduledTimeSlot})` : ''} ko` : ''} hogi.${r.technicianName ? `\n\nTechnician: ${r.technicianName}${r.technicianPhone ? ` — ${r.technicianPhone}` : ''}` : ''}\n\nShukriya!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className={`group rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all overflow-hidden ${
      overdue ? 'border-rose-300 dark:border-rose-500/40'
        : 'border-slate-200 dark:border-slate-800 hover:border-cyan-300 dark:hover:border-cyan-500/50'
    }`}>
      <button onClick={onOpen} className="block w-full text-left p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-[11px] font-extrabold text-cyan-700 dark:text-cyan-400">{r.installationNumber}</span>
              {overdue && <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-rose-600 text-white">LATE</span>}
              {r.demoGiven && <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300">DEMO ✓</span>}
            </div>
            <h3 className="mt-1 font-extrabold text-slate-900 dark:text-white truncate group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition">
              {r.customerName}
            </h3>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-bold">
              <Phone className="h-3 w-3" /> {r.customerPhone}
            </div>
          </div>
          <StatusBadge meta={st} />
        </div>

        <div className="mt-2 flex items-start gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
          <span className="line-clamp-2">{r.customerAddress}{r.landmark ? ` (${r.landmark})` : ''}</span>
        </div>

        <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-slate-700 dark:text-slate-200">
            <Package className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <span className="truncate">{r.productName}</span>
            <span className="ml-auto shrink-0 text-[10px] text-slate-500 dark:text-slate-400">{ty.emoji} {ty.label}</span>
          </div>
          {r.serialNumber && (
            <div className="mt-1 font-mono text-[10px] font-bold text-slate-400 dark:text-slate-500">SN: {r.serialNumber}</div>
          )}
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 px-2.5 py-1.5">
            <div className="text-[9px] text-blue-700 dark:text-blue-400 font-extrabold uppercase tracking-wider">Technician</div>
            <div className="text-[11px] font-extrabold text-blue-700 dark:text-blue-300 truncate">{r.technicianName || 'Abhi nahi laga'}</div>
          </div>
          <div className={`rounded-xl px-2.5 py-1.5 border ${
            due > 0 ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30'
              : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30'
          }`}>
            <div className={`text-[9px] font-extrabold uppercase tracking-wider ${due > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
              {r.status === 'COMPLETED' ? (due > 0 ? 'Baqi' : 'Wusool') : 'Bill'}
            </div>
            <div className={`text-[11px] font-extrabold tabular-nums ${due > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
              {due > 0 ? formatPKR(due) : r.totalCharge > 0 ? formatPKR(r.totalCharge) : '—'}
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2 flex-wrap text-[10px] font-bold text-slate-400 dark:text-slate-500">
          {r.scheduledDate && (
            <span className={`inline-flex items-center gap-1 ${overdue ? 'text-rose-600 dark:text-rose-400' : ''}`}>
              <CalendarDays className="h-3 w-3" />{fmtDate(r.scheduledDate)}{r.scheduledTimeSlot ? ` ${r.scheduledTimeSlot}` : ''}
            </span>
          )}
          {r.covered_underWarranty && <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">🛡️ Free</span>}
          {r.customerRating ? (
            <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
              <Star className="h-3 w-3 fill-current" />{r.customerRating}
            </span>
          ) : null}
          {r.installationCertificateNumber && (
            <span className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400"><Award className="h-3 w-3" />Certificate</span>
          )}
        </div>
      </button>

      <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-2">
        <button onClick={(e) => { e.stopPropagation(); wa(); }}
          className="h-8 px-2.5 rounded-lg bg-green-100 dark:bg-green-500/15 hover:bg-green-200 dark:hover:bg-green-500/25 text-green-700 dark:text-green-300 text-[10px] font-extrabold inline-flex items-center gap-1 transition">
          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
        </button>
        <button onClick={onOpen}
          className="h-8 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-extrabold inline-flex items-center gap-1 transition">
          Kholein <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   NAYI INSTALLATION
   ═════════════════════════════════════════════════════════════ */
function NewInstallModal({ technicians, onClose, onCreated }: any) {
  const [f, setF] = useState({
    serialNumber: '', serialTrackingId: '', productId: '', productName: '',
    customerName: '', customerPhone: '', customerAddress: '', city: '', area: '', landmark: '',
    serviceType: 'INSTALLATION',
    scheduledDate: '', scheduledTimeSlot: '', technicianId: '', internalNotes: '',
  });
  const [looking, setLooking] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  const lookup = async () => {
    const code = f.serialNumber.trim();
    if (!code) return;
    setLooking(true); setNote(null);
    try {
      const s = await applianceSerialApi.lookup(code);
      if (!s) { setNote('❌ Serial register me nahi mila — tafseel haath se bharein'); return; }
      setF((p) => ({
        ...p,
        serialTrackingId: s.id,
        productId: s.productId,
        productName: s.product?.name ?? p.productName,
        customerName: s.customerName || p.customerName,
        customerPhone: s.customerPhone || p.customerPhone,
        customerAddress: s.deliveryAddress || p.customerAddress,
      }));
      const bits = [`✅ ${s.product?.name ?? 'Product'} mil gaya`];
      if (s.product?.installationCharge) bits.push(`Installation charge: ${formatPKR(s.product.installationCharge)}`);
      if (s.installationStatus && s.installationStatus !== 'PENDING') {
        bits.push(`⚠️ Is unit ki installation pehle se "${instStatusMeta(s.installationStatus).label}" hai`);
      }
      setNote(bits.join('\n'));
    } catch {
      setNote('Serial check nahi ho saka');
    } finally { setLooking(false); }
  };

  const mut = useMutation({
    mutationFn: () => {
      const payload: any = {
        productName: f.productName.trim(),
        customerName: f.customerName.trim(),
        customerPhone: f.customerPhone.trim(),
        customerAddress: f.customerAddress.trim(),
        serviceType: f.serviceType,
      };
      const opt: [string, string][] = [
        ['serialNumber', f.serialNumber], ['serialTrackingId', f.serialTrackingId],
        ['productId', f.productId], ['city', f.city], ['area', f.area], ['landmark', f.landmark],
        ['scheduledDate', f.scheduledDate], ['scheduledTimeSlot', f.scheduledTimeSlot],
        ['technicianId', f.technicianId], ['internalNotes', f.internalNotes],
      ];
      for (const [k, v] of opt) if (v && v.trim()) payload[k] = v.trim();
      return installationsApi.create(payload);
    },
    onSuccess: (r) => { toast.success(`${r.installationNumber} ban gayi ✓`); onCreated(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi bani'),
  });

  const errors: Record<string, string> = {};
  if (!f.productName.trim()) errors.productName = 'Cheez ka naam likhein';
  if (!f.customerName.trim()) errors.customerName = 'Customer ka naam likhein';
  if (!f.customerPhone.trim()) errors.customerPhone = 'Phone likhein';
  if (!f.customerAddress.trim()) errors.customerAddress = 'Pata likhein — technician ne wahin jana hai';
  const ok = Object.keys(errors).length === 0;

  return (
    <Sheet wide badge="Nayi Installation" icon={<HardHat className="h-3 w-3" />}
      title="🔧 Lagane Ka Kaam Darj Karein"
      subtitle="Serial number daalein to cheez aur customer khud bhar jate hain"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1 h-12" onClick={onClose}><X className="h-4 w-4" /> Cancel</Button>
          <button onClick={() => mut.mutate()} disabled={!ok || mut.isPending}
            className="flex-[2] h-12 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-700 hover:from-cyan-500 hover:to-teal-600 disabled:opacity-50 text-white text-sm font-black inline-flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/40 transition active:scale-[0.98]">
            {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Installation Banao
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <Panel icon={Package} title="Cheez" hint="Serial ho to lookup karein" tone="blue">
          <div className="flex gap-2">
            <input className={inputCls('h-11 font-mono font-bold text-sm')} placeholder="Serial number (agar hai)"
              value={f.serialNumber} onChange={(e) => set('serialNumber', e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); lookup(); } }} />
            <button onClick={lookup} disabled={!f.serialNumber.trim() || looking}
              className="h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shrink-0 transition">
              {looking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Check
            </button>
          </div>
          {note && (
            <div className="mt-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-2.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 whitespace-pre-line">
              {note}
            </div>
          )}
          <div className="mt-3">
            <Field label="Cheez ka naam" required error={errors.productName}>
              <input className={inputCls('h-11 font-bold', !!errors.productName)} placeholder="Haier 1.5 Ton Inverter AC"
                value={f.productName} onChange={(e) => set('productName', e.target.value)} />
            </Field>
          </div>
        </Panel>

        <Panel icon={Home} title="Kahan Lagana Hai" hint="Pata jitna saaf hoga, utna kam phone aayega" tone="cyan">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Customer ka naam" required error={errors.customerName}>
              <input className={inputCls('h-11 font-bold', !!errors.customerName)} placeholder="Ali Raza"
                value={f.customerName} onChange={(e) => set('customerName', e.target.value)} />
            </Field>
            <Field label="Phone" required error={errors.customerPhone}>
              <input className={inputCls('h-11 font-bold font-mono', !!errors.customerPhone)} placeholder="0300-1234567" inputMode="tel"
                value={f.customerPhone} onChange={(e) => set('customerPhone', e.target.value)} />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Poora Pata" required error={errors.customerAddress}>
              <textarea rows={2} className={inputCls('py-2 font-semibold resize-none', !!errors.customerAddress)}
                placeholder="Ghar #, gali, ilaqa"
                value={f.customerAddress} onChange={(e) => set('customerAddress', e.target.value)} />
            </Field>
          </div>
          <div className="mt-3 grid sm:grid-cols-3 gap-3">
            <Field label="Sheher"><input className={inputCls('h-11 font-bold')} placeholder="Lahore" value={f.city} onChange={(e) => set('city', e.target.value)} /></Field>
            <Field label="Ilaqa"><input className={inputCls('h-11 font-bold')} placeholder="Gulberg" value={f.area} onChange={(e) => set('area', e.target.value)} /></Field>
            <Field label="Landmark" hint="asaan nishani"><input className={inputCls('h-11 font-bold')} placeholder="Masjid ke saamne" value={f.landmark} onChange={(e) => set('landmark', e.target.value)} /></Field>
          </div>
        </Panel>

        <Panel icon={CalendarDays} title="Kaam aur Tareekh" tone="violet">
          <Field label="Kaam ki qism">
            <ChipRow
              options={(['INSTALLATION', 'DEMO', 'RELOCATION', 'UNINSTALLATION', 'INSPECTION'] as const).map((s) => ({
                value: s, label: svcTypeMeta(s).label, emoji: svcTypeMeta(s).emoji,
              }))}
              value={f.serviceType as any} onChange={(v) => set('serviceType', v ?? 'INSTALLATION')} allLabel="—" />
          </Field>
          <div className="mt-3 grid sm:grid-cols-2 gap-3">
            <Field label="Tareekh">
              <input type="date" className={inputCls('h-11 font-bold [color-scheme:light] dark:[color-scheme:dark]')}
                value={f.scheduledDate} onChange={(e) => set('scheduledDate', e.target.value)} />
            </Field>
            <Field label="Waqt">
              <select className={inputCls('h-11 text-xs font-extrabold')} value={f.scheduledTimeSlot} onChange={(e) => set('scheduledTimeSlot', e.target.value)}>
                <option value="">Koi bhi</option>
                {SLOTS.map((s) => <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>)}
              </select>
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Technician" hint="baad me bhi laga sakte hain">
              <select className={inputCls('h-11 text-xs font-extrabold')} value={f.technicianId} onChange={(e) => set('technicianId', e.target.value)}>
                <option value="">Abhi nahi</option>
                {technicians.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name} — {t.openJobs ?? 0} kaam khula{t.currentZone ? ` • ${t.currentZone}` : ''}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Andaruni note" hint="customer ko nahi dikhta">
              <input className={inputCls('h-11 font-semibold')} placeholder="3rd floor, lift nahi hai"
                value={f.internalNotes} onChange={(e) => set('internalNotes', e.target.value)} />
            </Field>
          </div>
        </Panel>
      </div>
    </Sheet>
  );
}

/* ═════════════════════════════════════════════════════════════
   DETAIL SHEET
   ═════════════════════════════════════════════════════════════ */
function InstallDetailSheet({ id, technicians, shopName, shopPhone, onClose, onChanged }: any) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<'view' | 'assign' | 'complete' | 'payment' | 'reschedule'>('view');

  const { data: r, isLoading } = useQuery({
    queryKey: ['appliance-install', id],
    queryFn: () => installationsApi.getOne(id),
  });

  const after = (msg: string) => {
    toast.success(msg);
    qc.invalidateQueries({ queryKey: ['appliance-install', id] });
    onChanged();
    setMode('view');
  };
  const fail = (e: any) => toast.error(e?.response?.data?.message || 'Kaam nahi hua');

  const statusMut = useMutation({
    mutationFn: (status: ApplianceInstallationStatus) => installationsApi.updateStatus(id, { status }),
    onSuccess: () => after('Halat badal gayi ✓'), onError: fail,
  });
  const assignMut = useMutation({
    mutationFn: (v: any) => installationsApi.assignTechnician(id, v),
    onSuccess: () => after('Technician lag gaya ✓'), onError: fail,
  });
  const completeMut = useMutation({
    mutationFn: (v: any) => installationsApi.complete(id, v),
    onSuccess: () => after('Installation mukammal ✓'), onError: fail,
  });
  const payMut = useMutation({
    mutationFn: (v: any) => installationsApi.addPayment(id, v),
    onSuccess: () => after('Wusooli darj ✓'), onError: fail,
  });
  const reschedMut = useMutation({
    mutationFn: (v: any) => installationsApi.reschedule(id, v),
    onSuccess: () => after('Nayi tareekh lag gayi ✓'), onError: fail,
  });
  const delMut = useMutation({
    mutationFn: () => installationsApi.remove(id),
    onSuccess: () => { toast.success('Delete ho gayi'); onChanged(); onClose(); }, onError: fail,
  });

  if (isLoading || !r) {
    return (
      <Sheet wide badge="Installation" title="Khul raha hai…" onClose={onClose}>
        <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-cyan-500" /></div>
      </Sheet>
    );
  }

  const st = instStatusMeta(r.status);
  const ty = svcTypeMeta(r.serviceType);
  const due = Math.max(r.totalCharge - r.paidByCustomer, 0);
  const nexts = INSTALL_NEXT[r.status as ApplianceInstallationStatus] ?? [];
  const isOpen = st.isOpen;

  const checks = [
    { k: 'hasProperElectricConnection', label: 'Bijli ka connection theek' , v: r.hasProperElectricConnection },
    { k: 'hasProperPlumbing', label: 'Plumbing theek', v: r.hasProperPlumbing },
    { k: 'hasProperGasConnection', label: 'Gas connection theek', v: r.hasProperGasConnection },
    { k: 'wallSpaceAvailable', label: 'Deewar par jagah', v: r.wallSpaceAvailable },
    { k: 'drainageAvailable', label: 'Paani nikasi', v: r.drainageAvailable },
  ].filter((c) => c.v !== null && c.v !== undefined);

  /* Installation certificate — customer ko dene wala kaghaz */
  const printCertificate = () => {
    const w = r.serial;
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(r.installationNumber)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; font-size: 12px; line-height: 1.6;
    -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .frame { border: 3px double #0f766e; border-radius: 12px; padding: 24px; }
  .head { text-align: center; border-bottom: 2px solid #0f766e; padding-bottom: 14px; margin-bottom: 18px; }
  .head .shop { font-size: 22px; font-weight: 800; color: #0f766e; }
  .head .ph { font-size: 11px; color: #64748b; }
  .head h1 { font-size: 17px; font-weight: 800; letter-spacing: 3px; margin-top: 10px; text-transform: uppercase; }
  .cert-no { display:inline-block; margin-top:6px; padding:4px 14px; border:2px solid #0f766e; border-radius:20px;
    font-size:12px; font-weight:800; color:#0f766e; }
  table.kv { width: 100%; border-collapse: collapse; margin: 6px 0 14px; }
  table.kv td { padding: 6px 4px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  table.kv td.k { width: 34%; font-weight: 700; color: #475569; font-size: 11px; }
  table.kv td.v { font-weight: 700; }
  h2 { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;
    color: #0f766e; margin: 16px 0 4px; }
  .checks { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; margin: 6px 0 14px; font-size: 11px; font-weight: 600; }
  .warn { background: #fffbeb; border: 1.5px solid #fcd34d; border-radius: 8px; padding: 10px 12px; font-size: 10.5px; margin-top: 12px; }
  .signs { display: flex; justify-content: space-between; margin-top: 46px; gap: 40px; }
  .sign { flex: 1; border-top: 1.5px solid #0f172a; padding-top: 5px; text-align: center; font-size: 10px; font-weight: 700; }
  .foot { margin-top: 18px; text-align: center; font-size: 9.5px; color: #64748b; }
</style></head><body>
  <div class="frame">
    <div class="head">
      <div class="shop">${escapeHtml(shopName)}</div>
      ${shopPhone ? `<div class="ph">📞 ${escapeHtml(shopPhone)}</div>` : ''}
      <h1>Installation Certificate</h1>
      <div class="cert-no">${escapeHtml(r.installationCertificateNumber || r.installationNumber)}</div>
    </div>

    <h2>Customer</h2>
    <table class="kv">
      <tr><td class="k">Naam</td><td class="v">${escapeHtml(r.customerName)}</td></tr>
      <tr><td class="k">Phone</td><td class="v">${escapeHtml(r.customerPhone)}</td></tr>
      <tr><td class="k">Pata</td><td class="v">${escapeHtml(r.customerAddress)}${r.landmark ? ` (${escapeHtml(r.landmark)})` : ''}</td></tr>
    </table>

    <h2>Cheez</h2>
    <table class="kv">
      <tr><td class="k">Product</td><td class="v">${escapeHtml(r.productName)}</td></tr>
      ${r.serialNumber ? `<tr><td class="k">Serial Number</td><td class="v">${escapeHtml(r.serialNumber)}</td></tr>` : ''}
      ${w?.warrantyEndDate ? `<tr><td class="k">Warranty tak</td><td class="v">${fmtDate(w.warrantyEndDate)}</td></tr>` : ''}
      ${w?.compressorWarrantyEndDate ? `<tr><td class="k">Compressor warranty</td><td class="v">${fmtDate(w.compressorWarrantyEndDate)}</td></tr>` : ''}
      ${w?.motorWarrantyEndDate ? `<tr><td class="k">Motor warranty</td><td class="v">${fmtDate(w.motorWarrantyEndDate)}</td></tr>` : ''}
    </table>

    <h2>Kaam</h2>
    <table class="kv">
      <tr><td class="k">Qism</td><td class="v">${escapeHtml(ty.label)}</td></tr>
      <tr><td class="k">Tareekh</td><td class="v">${fmtDateTime(r.completedAt || r.scheduledDate)}</td></tr>
      <tr><td class="k">Technician</td><td class="v">${escapeHtml(r.technicianName || '—')}${r.technicianPhone ? ` (${escapeHtml(r.technicianPhone)})` : ''}</td></tr>
      <tr><td class="k">Demo diya</td><td class="v">${r.demoGiven ? 'Haan ✓' : 'Nahi'}</td></tr>
    </table>

    ${checks.length ? `<h2>Site ki Tayyari</h2><div class="checks">
      ${checks.map((c) => `<div>${c.v ? '✅' : '❌'} ${escapeHtml(c.label)}</div>`).join('')}
    </div>` : ''}

    ${r.totalCharge > 0 ? `<h2>Hisab</h2><table class="kv">
      ${r.laborCharge > 0 ? `<tr><td class="k">Labor</td><td class="v">${formatPKR(r.laborCharge)}</td></tr>` : ''}
      ${r.materialsCharge > 0 ? `<tr><td class="k">Material</td><td class="v">${formatPKR(r.materialsCharge)}</td></tr>` : ''}
      ${r.visitCharge > 0 ? `<tr><td class="k">Visit</td><td class="v">${formatPKR(r.visitCharge)}</td></tr>` : ''}
      <tr><td class="k">Kul</td><td class="v" style="font-size:14px;color:#0f766e;">${formatPKR(r.totalCharge)}</td></tr>
      <tr><td class="k">Wusool</td><td class="v">${formatPKR(r.paidByCustomer)}</td></tr>
      ${due > 0 ? `<tr><td class="k">Baqi</td><td class="v" style="color:#b91c1c;">${formatPKR(due)}</td></tr>` : ''}
    </table>` : ''}

    <div class="warn">
      <strong>Zaroori baat:</strong> Warranty sirf us surat me chalegi jab cheez ko theek tarah istemal kiya jaye.
      Khud khol kar theek karne ki koshish, bijli ka utaar charhao, ya kisi ghair mustanad banday se kaam
      karwane par warranty khatam ho jati hai. Koi masla ho to pehle hamein phone karein.
    </div>

    <div class="signs">
      <div class="sign">Technician ke dastakhat</div>
      <div class="sign">Customer ke dastakhat</div>
    </div>

    <div class="foot">
      Ye certificate ${escapeHtml(shopName)} ne jari kiya — ${new Date().toLocaleDateString('en-PK', { dateStyle: 'long' })}<br/>
      Powered by <strong>Nafaa POS</strong>
    </div>
  </div>
  <script>window.onload=function(){setTimeout(function(){window.print();},400);};</script>
</body></html>`;
    if (!printHtml(html)) toast.error('Popup block hai — allow karein');
  };

  const timeline = [
    { at: r.createdAt, label: 'Kaam darj hua', emoji: '📥' },
    { at: r.scheduledDate, label: `Tareekh lagi${r.scheduledTimeSlot ? ` (${r.scheduledTimeSlot})` : ''}`, emoji: '📅' },
    { at: r.arrivedAt, label: 'Technician pohancha', emoji: '🏠' },
    { at: r.startedAt, label: 'Kaam shuru', emoji: '🛠️' },
    { at: r.completedAt, label: 'Lag gaya', emoji: '✅' },
    { at: r.cancelledAt, label: `Band hua${r.cancellationReason ? ` — ${r.cancellationReason}` : ''}`, emoji: '🚫' },
  ].filter((t) => t.at);

  return (
    <Sheet wide badge={ty.label} icon={<span>{ty.emoji}</span>}
      title={r.installationNumber}
      subtitle={<span>{r.customerName} • {r.productName}</span>}
      onClose={onClose}
      footer={
        <div className="flex gap-2 flex-wrap">
          <button onClick={printCertificate}
            className="h-11 px-4 rounded-xl border-2 border-violet-200 dark:border-violet-500/40 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 text-xs font-extrabold inline-flex items-center gap-1.5 transition">
            <Award className="h-4 w-4" /> Certificate
          </button>
          {due > 0 && (
            <button onClick={() => setMode('payment')}
              className="h-11 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-extrabold inline-flex items-center gap-1.5 transition">
              <Banknote className="h-4 w-4" /> Wusool ({formatPKR(due)})
            </button>
          )}
          {isOpen && (
            <>
              <button onClick={() => setMode('reschedule')}
                className="h-11 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-extrabold inline-flex items-center gap-1.5 transition">
                <CalendarDays className="h-4 w-4" /> Tareekh Badlein
              </button>
              <button onClick={() => setMode('assign')}
                className="h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold inline-flex items-center gap-1.5 transition">
                <UserCheck className="h-4 w-4" /> {r.technicianName ? 'Badlein' : 'Banda Lagayein'}
              </button>
              <button onClick={() => setMode('complete')}
                className="flex-1 min-w-[140px] h-11 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/30 transition">
                <CheckCircle2 className="h-4 w-4" /> Mukammal
              </button>
            </>
          )}
        </div>
      }
    >
      {mode === 'assign' && (
        <AssignPanel technicians={technicians} current={r.technicianId}
          defaultDate={r.scheduledDate?.slice(0, 10) ?? ''} defaultSlot={r.scheduledTimeSlot ?? ''}
          pending={assignMut.isPending} onCancel={() => setMode('view')} onSubmit={(v: any) => assignMut.mutate(v)} />
      )}
      {mode === 'complete' && (
        <CompletePanel install={r} pending={completeMut.isPending}
          onCancel={() => setMode('view')} onSubmit={(v: any) => completeMut.mutate(v)} />
      )}
      {mode === 'payment' && (
        <PayPanel due={due} pending={payMut.isPending}
          onCancel={() => setMode('view')} onSubmit={(v: any) => payMut.mutate(v)} />
      )}
      {mode === 'reschedule' && (
        <ReschedPanel pending={reschedMut.isPending}
          onCancel={() => setMode('view')} onSubmit={(v: any) => reschedMut.mutate(v)} />
      )}

      {mode === 'view' && (
        <div className="space-y-4">
          <Panel icon={Zap} title="Halat" hint="Agla qadam ek click par" tone="cyan" right={<StatusBadge meta={st} size="md" />}>
            {nexts.length > 0 ? (
              <div className="flex gap-2 flex-wrap">
                {nexts.map((n) => {
                  const nm = instStatusMeta(n);
                  return (
                    <button key={n} onClick={() => statusMut.mutate(n)} disabled={statusMut.isPending}
                      className={`h-10 px-3 rounded-xl border-2 text-[11px] font-extrabold inline-flex items-center gap-1.5 transition disabled:opacity-50 ${nm.cls} hover:brightness-95`}>
                      {statusMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span>{nm.emoji}</span>}
                      {nm.label}
                    </button>
                  );
                })}
                {isOpen && (
                  <button onClick={() => { if (confirm('Ye installation delete karein? Record poora mit jayega.')) delMut.mutate(); }}
                    disabled={delMut.isPending}
                    className="h-10 px-3 rounded-xl border-2 border-rose-200 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 text-[11px] font-extrabold inline-flex items-center gap-1.5 transition">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {r.status === 'COMPLETED' ? '✅ Ye kaam mukammal ho chuka hai.' : 'Yahan se aage koi qadam nahi.'}
              </p>
            )}
          </Panel>

          <Panel icon={Home} title="Kahan Lagana Hai" tone="cyan">
            <div className="space-y-2 text-xs">
              <Row label="Customer" value={`${r.customerName} — ${r.customerPhone}`} />
              <Row label="Pata" value={`${r.customerAddress}${r.landmark ? ` (${r.landmark})` : ''}`} />
              {(r.city || r.area) && <Row label="Ilaqa" value={[r.city, r.area].filter(Boolean).join(', ')} />}
              {r.technicianName && <Row label="Technician" value={`${r.technicianName}${r.technicianPhone ? ` — ${r.technicianPhone}` : ''}`} />}
            </div>
          </Panel>

          {(r.totalCharge > 0 || r.status === 'COMPLETED') && (
            <Panel icon={Wallet} title="Hisab" tone={due > 0 ? 'rose' : 'emerald'}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <MiniBox label="Labor" value={formatPKR(r.laborCharge)} />
                <MiniBox label="Material" value={formatPKR(r.materialsCharge)} />
                <MiniBox label="Visit" value={formatPKR(r.visitCharge)} />
                <MiniBox label="Kul" value={formatPKR(r.totalCharge)} tone="cyan" />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <MiniBox label="Wusool" value={formatPKR(r.paidByCustomer)} tone="emerald" />
                <MiniBox label="Baqi" value={due > 0 ? formatPKR(due) : 'Clear ✓'} tone={due > 0 ? 'rose' : 'emerald'} />
              </div>
              {r.covered_underWarranty && (
                <div className="mt-2 px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold inline-block">
                  🛡️ Warranty me — paisa dukaan ne bharaa
                </div>
              )}
            </Panel>
          )}

          {checks.length > 0 && (
            <Panel icon={ListChecks} title="Site ki Tayyari" hint="Technician ne kya dekha" tone="amber">
              <div className="grid sm:grid-cols-2 gap-1.5">
                {checks.map((c) => (
                  <div key={c.k} className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-[11px] font-extrabold ${
                    c.v ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300'
                  }`}>
                    {c.v ? <CheckCircle2 className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                    {c.label}
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {(r.demoGiven || r.demoNotes || r.customerRating) && (
            <Panel icon={PlayCircle} title="Demo aur Raye" tone="blue">
              <div className="space-y-2 text-xs">
                <Row label="Demo diya" value={r.demoGiven ? 'Haan — customer ko chalana sikhaya ✓' : 'Nahi'} />
                {r.demoNotes && <Row label="Demo ke notes" value={r.demoNotes} />}
                {r.customerRating ? (
                  <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-600 dark:text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i < r.customerRating! ? 'fill-current' : 'opacity-25'}`} />
                    ))}
                    {r.customerFeedback && <span className="text-slate-600 dark:text-slate-300 font-semibold ml-1">"{r.customerFeedback}"</span>}
                  </div>
                ) : null}
              </div>
            </Panel>
          )}

          <Panel icon={Clock} title="Safar" tone="blue">
            <div className="space-y-2">
              {timeline.map((t, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm shrink-0">{t.emoji}</div>
                  <div className="flex-1 min-w-0 text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">{t.label}</div>
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 shrink-0">{fmtDateTime(t.at)}</div>
                </div>
              ))}
            </div>
          </Panel>

          {r.history.length > 0 && (
            <Panel icon={History} title={`Isi customer ka purana kaam (${r.history.length})`} tone="slate">
              <div className="space-y-1.5">
                {r.history.slice(0, 8).map((h) => (
                  <div key={h.id} className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 px-2.5 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-extrabold text-slate-800 dark:text-slate-100 truncate">{h.productName}</div>
                      <div className="text-[10px] font-bold text-slate-400">{h.installationNumber} • {fmtDate(h.completedAt || h.scheduledDate)}</div>
                    </div>
                    <StatusBadge meta={instStatusMeta(h.status)} size="xs" />
                    <div className="text-[11px] font-extrabold tabular-nums text-slate-700 dark:text-slate-200 shrink-0">{formatPKR(h.totalCharge)}</div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {r.internalNotes && (
            <Panel icon={Pencil} title="Andaruni notes" tone="slate">
              <pre className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 whitespace-pre-wrap font-sans">{r.internalNotes}</pre>
            </Panel>
          )}
        </div>
      )}
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</div>
      <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 whitespace-pre-wrap">{value}</div>
    </div>
  );
}

function MiniBox({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'slate' | 'cyan' | 'emerald' | 'rose' }) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200',
    cyan: 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-300',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
    rose: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300',
  };
  return (
    <div className={`rounded-xl border px-2.5 py-2 ${tones[tone]}`}>
      <div className="text-[9px] font-extrabold uppercase tracking-wider opacity-75">{label}</div>
      <div className="text-sm font-extrabold tabular-nums truncate">{value}</div>
    </div>
  );
}

/* ═════════════ PANELS ═════════════ */
function AssignPanel({ technicians, current, defaultDate, defaultSlot, pending, onCancel, onSubmit }: any) {
  const [technicianId, setTechnicianId] = useState(current ?? '');
  const [scheduledDate, setScheduledDate] = useState(defaultDate);
  const [scheduledTimeSlot, setScheduledTimeSlot] = useState(defaultSlot);

  return (
    <Panel icon={UserCheck} title="Technician Lagayein" hint="Jis ke paas kaam kam ho usay dein" tone="blue">
      <div className="space-y-3">
        <div className="space-y-1.5 max-h-56 overflow-y-auto">
          {technicians.map((t: any) => (
            <button key={t.id} type="button" onClick={() => setTechnicianId(t.id)}
              className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border-2 transition text-left ${
                technicianId === t.id
                  ? 'bg-blue-50 dark:bg-blue-500/15 border-blue-400 dark:border-blue-500/50'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300'
              }`}>
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-extrabold text-sm shrink-0">
                {t.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{t.name}</div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
                  {t.employeeCode}{t.currentZone ? ` • ${t.currentZone}` : ''}{t.avgRating ? ` • ⭐ ${Number(t.avgRating).toFixed(1)}` : ''}
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                (t.openJobs ?? 0) === 0 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  : (t.openJobs ?? 0) > 5 ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {(t.openJobs ?? 0) === 0 ? 'Khali' : `${t.openJobs} kaam`}
              </span>
            </button>
          ))}
          {technicians.length === 0 && (
            <p className="text-xs font-bold text-slate-400 py-4 text-center">Koi active technician nahi — pehle Technicians page se add karein</p>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Tareekh">
            <input type="date" className={inputCls('h-11 font-bold [color-scheme:light] dark:[color-scheme:dark]')}
              value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
          </Field>
          <Field label="Waqt">
            <select className={inputCls('h-11 text-xs font-extrabold')} value={scheduledTimeSlot} onChange={(e) => setScheduledTimeSlot(e.target.value)}>
              <option value="">Koi bhi</option>
              {TIME_SLOTS.map((s) => <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Wapas</Button>
          <Button className="flex-[2] bg-gradient-to-r from-blue-600 to-indigo-700 font-extrabold" loading={pending} disabled={!technicianId}
            onClick={() => onSubmit({
              technicianId,
              ...(scheduledDate ? { scheduledDate } : {}),
              ...(scheduledTimeSlot ? { scheduledTimeSlot } : {}),
            })}>
            <UserCheck className="h-4 w-4" /> Laga Dein
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function CompletePanel({ install, pending, onCancel, onSubmit }: any) {
  const covered = install.covered_underWarranty;
  const [f, setF] = useState({
    laborCharge: String(install.laborCharge || 0),
    materialsCharge: String(install.materialsCharge || 0),
    visitCharge: String(install.visitCharge || 0),
    materialText: '',
    paidByCustomer: '',
    covered_underWarranty: covered,
    hasProperElectricConnection: null as boolean | null,
    hasProperPlumbing: null as boolean | null,
    hasProperGasConnection: null as boolean | null,
    wallSpaceAvailable: null as boolean | null,
    drainageAvailable: null as boolean | null,
    demoGiven: false,
    demoNotes: '',
    customerRating: 0,
    customerFeedback: '',
  });
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  const total = (Number(f.laborCharge) || 0) + (Number(f.materialsCharge) || 0) + (Number(f.visitCharge) || 0);
  const paid = f.paidByCustomer === '' ? (f.covered_underWarranty ? 0 : total) : Number(f.paidByCustomer) || 0;
  const due = Math.max(total - paid, 0);
  const tooMuch = paid > total;

  const CHECKS: { k: keyof typeof f; label: string }[] = [
    { k: 'hasProperElectricConnection', label: '⚡ Bijli ka connection theek' },
    { k: 'hasProperPlumbing', label: '🚰 Plumbing theek' },
    { k: 'hasProperGasConnection', label: '🔥 Gas connection theek' },
    { k: 'wallSpaceAvailable', label: '🧱 Deewar par jagah' },
    { k: 'drainageAvailable', label: '💧 Paani nikasi' },
  ];

  return (
    <Panel icon={CheckCircle2} title="Installation Mukammal" hint="Bill, site ki tayyari aur demo" tone="emerald">
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <Field label="Labor"><input type="number" min={0} className={inputCls('h-11 font-extrabold tabular-nums')} value={f.laborCharge} onChange={(e) => set('laborCharge', e.target.value)} /></Field>
          <Field label="Material"><input type="number" min={0} className={inputCls('h-11 font-extrabold tabular-nums')} value={f.materialsCharge} onChange={(e) => set('materialsCharge', e.target.value)} /></Field>
          <Field label="Visit"><input type="number" min={0} className={inputCls('h-11 font-extrabold tabular-nums')} value={f.visitCharge} onChange={(e) => set('visitCharge', e.target.value)} /></Field>
        </div>

        <Field label="Material kya laga" hint="pipe, wire, bracket — comma se alag">
          <input className={inputCls('h-11 font-semibold')} placeholder="Copper pipe 10ft, Stand, Wire 5m"
            value={f.materialText} onChange={(e) => set('materialText', e.target.value)} />
        </Field>

        <div className="rounded-xl bg-slate-900 dark:bg-slate-950 text-white p-3">
          <div className="flex items-center justify-between text-sm font-extrabold">
            <span>Kul Bill</span>
            <span className="tabular-nums text-cyan-300">{formatPKR(total)}</span>
          </div>
        </div>

        <ToggleRow on={f.covered_underWarranty} onChange={(v: boolean) => set('covered_underWarranty', v)}
          icon={<span className="text-base leading-none">🛡️</span>}
          title="Warranty/free installation" sub="Customer se paisa nahi lena" />

        <Field label="Abhi kitna wusool hua?" hint={f.covered_underWarranty ? 'free me 0 rehta hai' : `khali chhorein to poora ${formatPKR(total)}`}
          error={tooMuch ? 'Bill se ziyada nahi ho sakta' : undefined}>
          <input type="number" min={0} className={inputCls('h-12 text-base font-extrabold tabular-nums', tooMuch)}
            placeholder={String(f.covered_underWarranty ? 0 : total)}
            value={f.paidByCustomer} onChange={(e) => set('paidByCustomer', e.target.value)} />
          {due > 0 && !tooMuch && (
            <div className="mt-1 text-[11px] font-extrabold text-rose-600 dark:text-rose-400">
              ⏳ {formatPKR(due)} udhaar reh jayega
            </div>
          )}
        </Field>

        <Field label="Site ki tayyari" hint="jo dekha wahi lagayein">
          <div className="space-y-1.5">
            {CHECKS.map((c) => {
              const v = f[c.k] as boolean | null;
              return (
                <div key={String(c.k)} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 px-3 py-2">
                  <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200">{c.label}</span>
                  <div className="flex gap-1 shrink-0">
                    <button type="button" onClick={() => set(c.k as string, v === true ? null : true)}
                      className={`h-7 px-2.5 rounded-lg text-[10px] font-extrabold transition ${
                        v === true ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                      }`}>Theek</button>
                    <button type="button" onClick={() => set(c.k as string, v === false ? null : false)}
                      className={`h-7 px-2.5 rounded-lg text-[10px] font-extrabold transition ${
                        v === false ? 'bg-rose-500 text-white' : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                      }`}>Masla</button>
                  </div>
                </div>
              );
            })}
          </div>
        </Field>

        <ToggleRow on={f.demoGiven} onChange={(v: boolean) => set('demoGiven', v)}
          icon={<PlayCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
          title="Demo diya" sub="Customer ko chalana sikhaya — shikayat kam aati hai" />
        {f.demoGiven && (
          <Field label="Demo ke notes">
            <input className={inputCls('h-11 font-semibold')} placeholder="Remote, timer aur filter cleaning samjhaya"
              value={f.demoNotes} onChange={(e) => set('demoNotes', e.target.value)} />
          </Field>
        )}

        <Field label="Customer ki rating">
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => set('customerRating', f.customerRating === n ? 0 : n)} className="p-1 transition hover:scale-110">
                <Star className={`h-7 w-7 ${n <= f.customerRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
              </button>
            ))}
          </div>
        </Field>
        {f.customerRating > 0 && (
          <Field label="Customer ne kya kaha">
            <input className={inputCls('h-11 font-semibold')} value={f.customerFeedback} onChange={(e) => set('customerFeedback', e.target.value)} />
          </Field>
        )}

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Wapas</Button>
          <Button className="flex-[2] bg-gradient-to-r from-emerald-600 to-teal-700 font-extrabold shadow-lg shadow-emerald-500/30"
            loading={pending} disabled={tooMuch}
            onClick={() => {
              const payload: any = {
                laborCharge: Number(f.laborCharge) || 0,
                materialsCharge: Number(f.materialsCharge) || 0,
                visitCharge: Number(f.visitCharge) || 0,
                paidByCustomer: paid,
                covered_underWarranty: f.covered_underWarranty,
                demoGiven: f.demoGiven,
              };
              for (const c of CHECKS) {
                const v = f[c.k] as boolean | null;
                if (v !== null) payload[c.k as string] = v;
              }
              if (f.materialText.trim()) {
                payload.additionalMaterialUsed = f.materialText.split(',').map((s) => ({ name: s.trim() })).filter((x) => x.name);
              }
              if (f.demoNotes.trim()) payload.demoNotes = f.demoNotes.trim();
              if (f.customerRating > 0) payload.customerRating = f.customerRating;
              if (f.customerFeedback.trim()) payload.customerFeedback = f.customerFeedback.trim();
              onSubmit(payload);
            }}>
            <CheckCircle2 className="h-4 w-4" /> Mukammal Karein
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function PayPanel({ due, pending, onCancel, onSubmit }: any) {
  const [amount, setAmount] = useState(String(due));
  const [note, setNote] = useState('');
  const n = Number(amount) || 0;
  const bad = n <= 0 || n > due;
  return (
    <Panel icon={Banknote} title="Paisa Wusool" hint={`Baqi: ${formatPKR(due)}`} tone="amber">
      <div className="space-y-3">
        <Field label="Kitna mila" required error={bad ? `1 se ${due} ke darmiyan` : undefined}>
          <input type="number" min={1} max={due} className={inputCls('h-12 text-base font-extrabold tabular-nums', bad)}
            value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </Field>
        <Field label="Note" hint="optional">
          <input className={inputCls('h-11 font-semibold')} placeholder="Cash" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Wapas</Button>
          <Button className="flex-[2] bg-gradient-to-r from-amber-500 to-orange-600 font-extrabold" loading={pending} disabled={bad}
            onClick={() => onSubmit({ amount: n, ...(note.trim() ? { note: note.trim() } : {}) })}>
            <Banknote className="h-4 w-4" /> Darj Karein
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function ReschedPanel({ pending, onCancel, onSubmit }: any) {
  const [newDate, setNewDate] = useState('');
  const [reason, setReason] = useState('');
  const presets = ['Customer ne kaha', 'Technician busy tha', 'Site tayyar nahi thi', 'Mausam kharab', 'Material nahi aaya'];
  return (
    <Panel icon={CalendarDays} title="Nayi Tareekh" hint="Wajah bhi likhein — record me reh jati hai" tone="violet">
      <div className="space-y-3">
        <Field label="Nayi tareekh" required>
          <input type="date" className={inputCls('h-12 font-bold [color-scheme:light] dark:[color-scheme:dark]')}
            value={newDate} onChange={(e) => setNewDate(e.target.value)} autoFocus />
        </Field>
        <Field label="Kyun aage barhi">
          <input className={inputCls('h-11 font-semibold')} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <div className="flex gap-1.5 flex-wrap">
          {presets.map((p) => (
            <button key={p} type="button" onClick={() => setReason(p)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-violet-400 transition">
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Wapas</Button>
          <Button className="flex-[2] bg-gradient-to-r from-violet-600 to-purple-700 font-extrabold" loading={pending} disabled={!newDate}
            onClick={() => onSubmit({ newDate, ...(reason.trim() ? { reason: reason.trim() } : {}) })}>
            <CalendarDays className="h-4 w-4" /> Tareekh Badlein
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function ToggleRow({ on, onChange, icon, title, sub }: any) {
  return (
    <button type="button" onClick={() => onChange(!on)}
      className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition text-left ${
        on ? 'bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-500/15 dark:to-teal-500/10 border-cyan-300 dark:border-cyan-500/40'
           : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
      }`}>
      <div className="flex items-center gap-2.5 min-w-0">
        {icon}
        <div className="min-w-0">
          <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{title}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold truncate">{sub}</div>
        </div>
      </div>
      <div className={`h-6 w-11 rounded-full transition-colors relative shrink-0 ${on ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </div>
    </button>
  );
}

/* ═════════════ TEACHER ═════════════ */
function InstallTeacher({ onClose }: { onClose: () => void }) {
  return (
    <Teacher
      title="Installations Kaise Chalayein?"
      intro={
        <>
          AC lagana, geyser fit karna, TV mount karna — ye <strong>alag kaam hai aur alag paisa deta hai</strong>.
          Yahan har job ka schedule, banda, site ki tayyari, demo aur certificate sab rehta hai.
        </>
      }
      blocks={[
        {
          title: '📋 Rozana ka tareeqa',
          tone: 'cyan',
          tips: [
            <>Maal bikte hi <strong>"Nayi Installation"</strong> (<Kbd dark>N</Kbd>) banayein — <strong>serial number daal kar "Check"</strong> dabayein to cheez aur customer khud bhar jate hain</>,
            <><strong>"Aaj" tab</strong> (<Kbd dark>D</Kbd>) — subah yahi kholein. Aaj ki saari installations waqt ke hisab se lagi hoti hain</>,
            <><strong>"Baqi" tab</strong> (<Kbd dark>Q</Kbd>) — jo lagana reh gaya, <strong>late wale sab se upar</strong></>,
            <>Customer ko WhatsApp par <strong>technician ka naam aur number</strong> bhej dein — aadhe phone khud band ho jate hain</>,
          ],
        },
        {
          title: '🔧 Site par kya dekhein',
          tone: 'amber',
          tips: [
            <><strong>Mukammal karte waqt</strong> site ki tayyari darj karein — bijli, plumbing, gas, deewar ki jagah, paani nikasi</>,
            <>Agar kisi cheez me <strong>"Masla"</strong> laga hai to wo certificate par bhi chapega — baad me ilzam nahi aata</>,
            <><strong>Material alag likhein</strong> (pipe, wire, bracket) — ye aap ki lagat hai, munafa isi se nikalta hai</>,
            <><strong>Demo zaroor dein</strong> aur toggle on karein — jin gharon me demo diya jata hai wahan se shikayat bohat kam aati hai</>,
          ],
        },
        {
          title: '💰 Paisa aur certificate',
          tone: 'emerald',
          tips: [
            <>Labor, material aur visit <strong>alag alag</strong> likhein — pata chalta hai kis cheez se kitna mil raha hai</>,
            <>Customer aadha de to utna hi likhein — baqi <strong>udhaar</strong> me. Baad me <strong>"Wusool"</strong> se darj karein</>,
            <><strong>"Certificate"</strong> — A4 par poora installation certificate, warranty ki tareekhon aur dono dastakhaton ke sath. Customer ko dein</>,
            <>Free/warranty installation ka toggle on karein to bill 0 rahega lekin <strong>material ka kharcha</strong> phir bhi report me aayega</>,
          ],
        },
      ]}
      shortcuts={[
        { keys: 'Q', label: 'Baqi kaam' },
        { keys: 'D', label: 'Aaj ka kaam' },
        { keys: '/', label: 'Search' },
        { keys: 'N', label: 'Nayi installation' },
        { keys: 'F', label: 'Filters' },
        { keys: 'P', label: 'Print' },
        { keys: 'T', label: 'Ye guide' },
        { keys: 'Esc', label: 'Band' },
      ]}
      golden={
        <>
          <strong>Sunahri usool:</strong> Installation ka paisa <strong>mauqe par hi</strong> wusool karein. Technician
          wapas aa gaya to phir customer "baad me dekhte hain" kehta hai — aur wo paisa mahinon latak jata hai.
        </>
      }
      onClose={onClose}
    />
  );
}
