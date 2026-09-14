import { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, X, RefreshCw, Star, Phone, MapPin, Wallet,
  Loader2, CheckCircle2, Trash2, Pencil, MessageCircle, FileDown, Printer,
  ChevronRight, Zap, Award, Briefcase, Clock, TrendingUp, AlertTriangle,
  UserCheck, LayoutGrid, List as ListIcon, BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
} from 'recharts';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { techniciansApi, type Technician, type TechnicianRow } from '../api/technicians.api';
import {
  ApplianceHero, Kpi, Panel, Teacher, Empty, Sheet, Field, inputCls, ChipRow,
  useShortcuts, printHtml, downloadCsv, a4Shell, escapeHtml, toDateInput,
  guideAction, printAction, Kbd,
} from '../components/shared';
import { CATEGORY_ORDER, catLabel, catEmoji, TIME_SLOTS } from '../constants';

/* ═════════════════════════════════════════════════════════════
   TECHNICIANS — appliance dukaan ki asal team
   ─────────────────────────────────────────────────────────────
   Kaam dene se pehle sirf ek sawal hota hai: "kis ke paas
   waqt hai?" Is liye har card par sab se numaya cheez uska
   KHULA KAAM hai, naam ya code nahi.
   ═════════════════════════════════════════════════════════════ */

const DAYS = ['Itwar', 'Peer', 'Mangal', 'Budh', 'Jumeraat', 'Juma', 'Hafta'];
const TOOLTIP: React.CSSProperties = {
  borderRadius: 12, border: '2px solid #334155', background: '#0f172a',
  color: '#fff', fontSize: 12, fontWeight: 700,
};

const COMMON_SKILLS = [
  'AC Installation', 'AC Gas Refill', 'Fridge Repair', 'Washing Machine',
  'Geyser', 'Microwave', 'LED/TV Mounting', 'Electrician', 'Plumber',
  'Solar / UPS', 'Generator', 'Deep Cleaning',
];

export default function TechniciansPage() {
  const qc = useQueryClient();
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Meri Dukaan';
  const shopPhone = useAuthStore((s: any) => s.tenant?.phone || '');
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<'team' | 'performance'>('team');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showTeacher, setShowTeacher] = useState(false);
  const [editing, setEditing] = useState<Technician | 'new' | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | null>('active');
  const [zone, setZone] = useState<string | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['appliance-technicians'] });
    qc.invalidateQueries({ queryKey: ['appliance-tech-summary'] });
  };

  const { data: rows = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['appliance-technicians', 'all'],
    queryFn: () => techniciansApi.list({}),
  });

  const { data: summary } = useQuery({
    queryKey: ['appliance-tech-summary'],
    queryFn: techniciansApi.summary,
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => techniciansApi.remove(id),
    onSuccess: (r: any) => { toast.success(r?.message || 'Band kar diya'); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi ho saka'),
  });

  const zones = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of rows) if (t.currentZone?.trim()) m.set(t.currentZone.trim(), (m.get(t.currentZone.trim()) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((t) => {
      if (status === 'active' && !t.isActive) return false;
      if (status === 'inactive' && t.isActive) return false;
      if (zone && t.currentZone !== zone) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.phone.includes(q) ||
        t.employeeCode.toLowerCase().includes(q) ||
        (t.cnic ?? '').includes(q) ||
        (t.specializations ?? []).some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [rows, search, status, zone]);

  const exportCsv = () => {
    if (!filtered.length) return toast.error('Koi technician nahi');
    downloadCsv(`technicians-${toDateInput(new Date())}.csv`, [
      [`Technicians — ${shopName}`],
      [`Nikala gaya: ${new Date().toLocaleString('en-PK')}`],
      [],
      ['Code', 'Naam', 'Phone', 'CNIC', 'Ilaqa', 'Tajurba (saal)', 'Maharat',
       'Kaam ke din', 'Waqt', 'Visit rate', 'Ghanta rate', 'Commission %',
       'Khula kaam', 'Kul kaam', 'Mukammal', 'Completion %', 'Kul kamai', 'Kul commission', 'Rating', 'Active'],
      ...filtered.map((t) => [
        t.employeeCode, t.name, t.phone, t.cnic ?? '', t.currentZone ?? '',
        t.experienceYears ?? '', (t.specializations ?? []).join(' | '),
        (t.workingDays ?? []).map((d) => DAYS[d] ?? d).join(' '),
        `${t.workStartTime}-${t.workEndTime}`,
        t.visitChargeRate, t.hourlyRate, t.commissionPct,
        t.openJobs ?? 0, t.totalJobs, t.completedJobs, (t.completionRate ?? 0).toFixed(1),
        t.totalRevenue, t.totalCommission, t.avgRating?.toFixed(1) ?? '', t.isActive ? 'Haan' : 'Nahi',
      ]),
    ]);
    toast.success(`${filtered.length} technicians export ho gaye`);
  };

  const printA4 = () => {
    if (!filtered.length) return toast.error('Koi technician nahi');
    const body = `
      <h2 class="sec">👷 Team</h2>
      <table>
        <thead><tr>
          <th>#</th><th>Naam / Code</th><th>Rabta</th><th>Maharat</th>
          <th class="c">Khula</th><th class="c">Mukammal</th><th class="c">Rating</th>
          <th class="r">Kamai</th><th class="r">Commission</th>
        </tr></thead>
        <tbody>
          ${filtered.map((t, i) => `
            <tr>
              <td class="num">${i + 1}</td>
              <td><div class="main">${escapeHtml(t.name)}${t.isActive ? '' : ' (band)'}</div><div class="sub">${escapeHtml(t.employeeCode)}${t.currentZone ? ` • ${escapeHtml(t.currentZone)}` : ''}</div></td>
              <td>${escapeHtml(t.phone)}${t.cnic ? `<div class="sub">${escapeHtml(t.cnic)}</div>` : ''}</td>
              <td style="font-size:8.5px;">${escapeHtml((t.specializations ?? []).slice(0, 3).join(', ') || '—')}</td>
              <td class="c" style="font-weight:800;">${t.openJobs ?? 0}</td>
              <td class="c">${t.completedJobs}</td>
              <td class="c">${t.avgRating ? `${t.avgRating.toFixed(1)}★` : '—'}</td>
              <td class="r">${formatPKR(t.totalRevenue)}</td>
              <td class="r">${formatPKR(t.totalCommission)}</td>
            </tr>`).join('')}
          <tr class="grand">
            <td colspan="7" style="text-align:right;padding-right:12px;">KUL</td>
            <td class="r" style="color:#a5f3fc !important;">${formatPKR(filtered.reduce((s, t) => s + t.totalRevenue, 0))}</td>
            <td class="r" style="color:#c4b5fd !important;">${formatPKR(filtered.reduce((s, t) => s + t.totalCommission, 0))}</td>
          </tr>
        </tbody>
      </table>`;

    const ok = printHtml(a4Shell({
      title: `Technicians — ${shopName}`,
      heading: '👷 Technician Team',
      shopName, shopPhone, badge: 'Team Report',
      kpis: [
        { label: '👥 Kul Team', value: String(summary?.total ?? filtered.length), sub: `${summary?.active ?? 0} active`, tone: 'blue' },
        { label: '🟢 Khali', value: String(summary?.free ?? 0), sub: 'inhe kaam do', tone: 'green' },
        { label: '📋 Khula Kaam', value: String(summary?.openJobs ?? 0), tone: 'amber' },
        { label: '💰 Is Mahine Commission', value: formatPKR(summary?.month.commission ?? 0), tone: 'rose' },
      ],
      body,
    }));
    if (!ok) toast.error('Popup block hai — allow karein');
  };

  useShortcuts({
    '/': () => searchRef.current?.focus(),
    n: () => setEditing('new'),
    t: () => setShowTeacher(true),
    p: () => printA4(),
    g: () => setView((v) => (v === 'grid' ? 'list' : 'grid')),
    a: () => setTab((v) => (v === 'performance' ? 'team' : 'performance')),
    Escape: () => {
      if (editing) setEditing(null);
      else if (showTeacher) setShowTeacher(false);
    },
  }, [editing, showTeacher, filtered]);

  const leaderChart = useMemo(
    () => (summary?.leaderboard ?? []).filter((l) => l.monthRevenue > 0).slice(0, 10).map((l) => ({
      name: l.name.length > 14 ? `${l.name.slice(0, 13)}…` : l.name,
      kamai: l.monthRevenue,
      commission: l.monthCommission,
    })),
    [summary],
  );

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <TechTeacher onClose={() => setShowTeacher(false)} />}
      {editing && (
        <TechForm
          tech={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); invalidate(); }}
        />
      )}

      <ApplianceHero
        badge="Team"
        badgeIcon={<Users className="h-3.5 w-3.5 text-amber-300" />}
        title="👷 Technicians"
        subtitle={
          summary ? (
            <>
              <strong className="text-cyan-200">{summary.active}</strong> active
              <span className="opacity-50 mx-1.5">•</span>
              <strong className="text-emerald-300">{summary.free}</strong> khali
              {summary.overloaded > 0 && (
                <><span className="opacity-50 mx-1.5">•</span><strong className="text-rose-300">{summary.overloaded}</strong> par bojh ziyada</>
              )}
              <span className="opacity-50 mx-1.5">•</span>
              <strong className="text-amber-300">{summary.openJobs}</strong> kaam khula
            </>
          ) : 'Aap ki team — bojh, kamai aur rating'
        }
        actions={[
          guideAction(() => setShowTeacher(true)),
          { key: 'refresh', label: 'Refresh', icon: <RefreshCw className="h-4 w-4" />, onClick: () => refetch(), spinning: isFetching, hideLabelOnMobile: true },
          { key: 'csv', label: 'CSV', icon: <FileDown className="h-4 w-4" />, onClick: exportCsv, disabled: !filtered.length, hideLabelOnMobile: true },
          printAction(printA4, !filtered.length),
          { key: 'new', label: 'Naya Technician', icon: <Plus className="h-4 w-4" />, shortcut: 'N', onClick: () => setEditing('new'), variant: 'solid' },
        ]}
        shortcuts={[
          { keys: '/', label: 'Search' }, { keys: 'N', label: 'Naya' },
          { keys: 'G', label: 'Grid/List' }, { keys: 'A', label: 'Performance' },
          { keys: 'P', label: 'Print' }, { keys: 'T', label: 'Guide' },
        ]}
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Kpi icon={Users} tone="cyan" label="Kul Team" value={summary?.total ?? 0} sub={`${summary?.active ?? 0} active • ${summary?.inactive ?? 0} band`} />
        <Kpi icon={UserCheck} tone="emerald" label="Khali Bande" value={summary?.free ?? 0} sub="inhe naya kaam dein" />
        <Kpi icon={AlertTriangle} tone="rose" label="Bojh Ziyada" value={summary?.overloaded ?? 0} sub="5 se ziyada khula kaam"
          alert={(summary?.overloaded ?? 0) > 0} />
        <Kpi icon={Wallet} tone="violet" label="Is Mahine Commission" value={formatPKR(summary?.month.commission ?? 0)}
          sub={`${summary?.month.jobs ?? 0} kaam • kamai ${formatPKR(summary?.month.revenue ?? 0)}`} />
      </section>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 shadow-sm">
          <TabBtn active={tab === 'team'} onClick={() => setTab('team')} icon={Users} label="Team" />
          <TabBtn active={tab === 'performance'} onClick={() => setTab('performance')} icon={BarChart3} label="Performance" />
        </div>
        {tab === 'team' && (
          <div className="inline-flex rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1">
            <button onClick={() => setView('grid')}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
                view === 'grid' ? 'bg-cyan-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}><LayoutGrid className="h-4 w-4" /></button>
            <button onClick={() => setView('list')}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
                view === 'list' ? 'bg-cyan-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}><ListIcon className="h-4 w-4" /></button>
          </div>
        )}
        <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400 tabular-nums px-1">{filtered.length} technicians</div>
      </div>

      {tab === 'performance' ? (
        <TechPerformance summary={summary} leaderChart={leaderChart} />
      ) : (
        <>
          <div className="flex gap-2 flex-wrap items-center">
            <div className="flex-1 min-w-[220px] relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input ref={searchRef} className={inputCls('h-12 pl-10 pr-10 text-sm font-semibold')}
                placeholder="Naam, phone, code, maharat... (/)" value={search} onChange={(e) => setSearch(e.target.value)} />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>
            <div className="inline-flex rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 h-12">
              {([['active', 'Active'], ['inactive', 'Band'], [null, 'Sab']] as const).map(([v, label]) => (
                <button key={String(v)} onClick={() => setStatus(v as any)}
                  className={`px-3 rounded-xl text-xs font-extrabold transition ${
                    status === v ? 'bg-cyan-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}>{label}</button>
              ))}
            </div>
          </div>

          {zones.length > 1 && (
            <ChipRow options={zones.map(([z, c]) => ({ value: z, label: z, count: c }))} value={zone} onChange={setZone} allLabel="Sab ilaqe" />
          )}

          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-52 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <Empty
              icon={Users}
              title={rows.length === 0 ? 'Abhi koi technician nahi' : 'Koi technician nahi mila'}
              hint={
                rows.length === 0
                  ? 'Technician add karein — phir har repair aur installation par banda laga sakenge, aur unki kamai/commission khud gini jayegi'
                  : 'Search ya filter badal kar dekhein'
              }
              action={
                rows.length === 0
                  ? <Button className="bg-gradient-to-r from-cyan-600 to-teal-700 font-extrabold shadow-lg shadow-cyan-500/40" onClick={() => setEditing('new')}>
                      <Plus className="h-4 w-4" /> Pehla Technician
                    </Button>
                  : <Button variant="secondary" onClick={() => { setSearch(''); setStatus(null); setZone(null); }}>
                      <X className="h-4 w-4" /> Filter Clear
                    </Button>
              }
            />
          ) : view === 'grid' ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((t) => (
                <TechCard key={t.id} t={t} onEdit={() => setEditing(t)}
                  onRemove={() => { if (confirm(`${t.name} ko band karein? Purana record mehfooz rahega.`)) removeMut.mutate(t.id); }} />
              ))}
            </div>
          ) : (
            <TechTable rows={filtered} onEdit={setEditing}
              onRemove={(t) => { if (confirm(`${t.name} ko band karein?`)) removeMut.mutate(t.id); }} />
          )}
        </>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label }: any) {
  return (
    <button onClick={onClick}
      className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
        active ? 'bg-slate-900 dark:bg-cyan-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}>
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

/* ═════════════ CARD ═════════════ */
function TechCard({ t, onEdit, onRemove }: { t: TechnicianRow; onEdit: () => void; onRemove: () => void }) {
  const open = t.openJobs ?? 0;
  const load = open === 0 ? 'free' : open > 5 ? 'heavy' : 'busy';
  const wa = () => {
    const digits = String(t.phone).replace(/[^0-9]/g, '');
    const phone = digits.startsWith('92') ? digits : digits.startsWith('0') ? '92' + digits.slice(1) : '92' + digits;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Assalam-o-Alaikum ${t.name}! 🙏\n\nAaj ka kaam dekh lein.`)}`, '_blank');
  };

  return (
    <div className={`group rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all overflow-hidden ${
      !t.isActive ? 'opacity-70 border-slate-200 dark:border-slate-800'
        : load === 'heavy' ? 'border-rose-300 dark:border-rose-500/40'
        : load === 'free' ? 'border-emerald-300 dark:border-emerald-500/40'
        : 'border-slate-200 dark:border-slate-800 hover:border-cyan-300 dark:hover:border-cyan-500/50'
    }`}>
      <Link to={`/appliances/technicians/${t.id}`} className="block p-4">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            {t.photoUrl ? (
              <img src={t.photoUrl} className="h-14 w-14 rounded-2xl object-cover shadow" alt={t.name} />
            ) : (
              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-lg font-extrabold text-white shadow ${
                t.isActive ? 'bg-gradient-to-br from-cyan-500 to-teal-600' : 'bg-gradient-to-br from-slate-400 to-slate-600'
              }`}>
                {t.name.charAt(0).toUpperCase()}
              </div>
            )}
            {!t.isActive && (
              <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-slate-600 text-white text-[8px] font-black shadow">BAND</div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-extrabold text-slate-900 dark:text-white truncate group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition">{t.name}</h3>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">
              {t.employeeCode}{t.experienceYears ? ` • ${t.experienceYears} saal tajurba` : ''}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">
              <Phone className="h-3 w-3" /> {t.phone}
            </div>
            {t.currentZone && (
              <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                <MapPin className="h-3 w-3" /> {t.currentZone}
              </div>
            )}
          </div>
          {t.avgRating ? (
            <div className="shrink-0 text-right">
              <div className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-extrabold">
                <Star className="h-3 w-3 fill-current" /> {t.avgRating.toFixed(1)}
              </div>
              <div className="text-[9px] font-bold text-slate-400 mt-0.5">{t.totalReviews} raye</div>
            </div>
          ) : null}
        </div>

        {/* Bojh — sab se numaya cheez */}
        <div className={`mt-3 rounded-xl border-2 px-3 py-2.5 ${
          load === 'free' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30'
            : load === 'heavy' ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30'
            : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-extrabold ${
              load === 'free' ? 'text-emerald-700 dark:text-emerald-300'
                : load === 'heavy' ? 'text-rose-700 dark:text-rose-300'
                : 'text-amber-700 dark:text-amber-300'
            }`}>
              {load === 'free' ? '🟢 Khali — kaam de sakte hain' : load === 'heavy' ? '🔴 Bojh ziyada hai' : '🟡 Kaam chal raha hai'}
            </span>
            <span className="text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">{open}</span>
          </div>
          {open > 0 && (
            <div className="mt-1 text-[10px] font-bold text-slate-500 dark:text-slate-400">
              {t.openServices ?? 0} repair • {t.openInstallations ?? 0} installation
            </div>
          )}
        </div>

        {(t.specializations ?? []).length > 0 && (
          <div className="mt-2 flex gap-1 flex-wrap">
            {t.specializations.slice(0, 4).map((s) => (
              <span key={s} className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-extrabold">{s}</span>
            ))}
            {t.specializations.length > 4 && (
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] font-extrabold">+{t.specializations.length - 4}</span>
            )}
          </div>
        )}

        <div className="mt-3 grid grid-cols-3 gap-2">
          <MiniStat label="Kaam" value={String(t.totalJobs)} sub={`${(t.completionRate ?? 0).toFixed(0)}% mukammal`} />
          <MiniStat label="Kamai" value={formatPKR(t.totalRevenue)} />
          <MiniStat label="Commission" value={formatPKR(t.totalCommission)} sub={`${t.commissionPct}%`} />
        </div>
      </Link>

      <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.preventDefault(); wa(); }}
            className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-500/15 hover:bg-green-200 dark:hover:bg-green-500/25 text-green-700 dark:text-green-300 flex items-center justify-center transition" title="WhatsApp">
            <MessageCircle className="h-3.5 w-3.5" />
          </button>
          <a href={`tel:${t.phone}`} onClick={(e) => e.stopPropagation()}
            className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-500/15 hover:bg-blue-200 dark:hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 flex items-center justify-center transition" title="Call">
            <Phone className="h-3.5 w-3.5" />
          </a>
        </div>
        <div className="flex items-center gap-1">
          <Link to={`/appliances/technicians/${t.id}`}
            className="h-8 px-2.5 rounded-lg bg-slate-200/70 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-[10px] font-extrabold inline-flex items-center gap-1 transition">
            Detail <ChevronRight className="h-3 w-3" />
          </Link>
          <button onClick={(e) => { e.preventDefault(); onEdit(); }}
            className="h-8 w-8 rounded-lg bg-cyan-100 dark:bg-cyan-500/15 hover:bg-cyan-200 dark:hover:bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 flex items-center justify-center transition" title="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {t.isActive && (
            <button onClick={(e) => { e.preventDefault(); onRemove(); }}
              className="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-500/15 hover:bg-rose-200 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-400 flex items-center justify-center transition" title="Band karein">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-2 py-1.5">
      <div className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-[11px] font-extrabold tabular-nums text-slate-800 dark:text-slate-100 truncate">{value}</div>
      {sub && <div className="text-[9px] font-bold text-slate-400 truncate">{sub}</div>}
    </div>
  );
}

/* ═════════════ TABLE ═════════════ */
function TechTable({ rows, onEdit, onRemove }: {
  rows: TechnicianRow[];
  onEdit: (t: Technician) => void;
  onRemove: (t: TechnicianRow) => void;
}) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b-2 border-slate-200 dark:border-slate-700">
              <Th className="text-left">Technician</Th>
              <Th className="text-left">Rabta</Th>
              <Th className="text-left">Maharat</Th>
              <Th className="text-center">Khula</Th>
              <Th className="text-center">Mukammal</Th>
              <Th className="text-center">Rating</Th>
              <Th className="text-right">Kamai</Th>
              <Th className="text-right">Commission</Th>
              <Th className="text-right pr-4">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const open = t.openJobs ?? 0;
              return (
                <tr key={t.id} className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${!t.isActive ? 'opacity-60' : ''}`}>
                  <td className="px-3 py-2.5">
                    <Link to={`/appliances/technicians/${t.id}`} className="flex items-center gap-2.5 group">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs font-extrabold text-white shrink-0 ${
                        t.isActive ? 'bg-gradient-to-br from-cyan-500 to-teal-600' : 'bg-slate-400'
                      }`}>{t.name.charAt(0).toUpperCase()}</div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-extrabold text-slate-900 dark:text-white truncate group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition">{t.name}</div>
                        <div className="text-[10px] font-bold text-slate-400">{t.employeeCode}{t.currentZone ? ` • ${t.currentZone}` : ''}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300">{t.phone}</td>
                  <td className="px-3 py-2.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 max-w-[180px] truncate">
                    {(t.specializations ?? []).slice(0, 3).join(', ') || '—'}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold tabular-nums ${
                      open === 0 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                        : open > 5 ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                        : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                    }`}>{open}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="text-xs font-extrabold tabular-nums text-slate-800 dark:text-slate-100">{t.completedJobs}</div>
                    <div className="text-[9px] font-bold text-slate-400">{(t.completionRate ?? 0).toFixed(0)}%</div>
                  </td>
                  <td className="px-3 py-2.5 text-center text-[11px] font-extrabold text-amber-600 dark:text-amber-400">
                    {t.avgRating ? `⭐ ${t.avgRating.toFixed(1)}` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs font-extrabold tabular-nums text-slate-800 dark:text-slate-100 whitespace-nowrap">{formatPKR(t.totalRevenue)}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-extrabold tabular-nums text-violet-700 dark:text-violet-400 whitespace-nowrap">{formatPKR(t.totalCommission)}</td>
                  <td className="px-3 py-2.5 pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <Link to={`/appliances/technicians/${t.id}`}
                        className="h-8 w-8 rounded-lg bg-slate-200/70 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center transition" title="Detail">
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                      <button onClick={() => onEdit(t)}
                        className="h-8 w-8 rounded-lg bg-cyan-100 dark:bg-cyan-500/15 hover:bg-cyan-200 dark:hover:bg-cyan-500/25 text-cyan-700 dark:text-cyan-300 flex items-center justify-center transition" title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {t.isActive && (
                        <button onClick={() => onRemove(t)}
                          className="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-500/15 hover:bg-rose-200 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-400 flex items-center justify-center transition" title="Band karein">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-3 py-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}

/* ═════════════ PERFORMANCE TAB ═════════════ */
function TechPerformance({ summary, leaderChart }: any) {
  if (!summary) {
    return <div className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />;
  }
  const rows = summary.leaderboard ?? [];

  return (
    <div className="space-y-3 sm:space-y-4">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Kpi icon={Briefcase} tone="cyan" label="Is Mahine Kaam" value={summary.month.jobs} sub="mukammal hue" />
        <Kpi icon={TrendingUp} tone="emerald" label="Is Mahine Kamai" value={formatPKR(summary.month.revenue)} />
        <Kpi icon={Wallet} tone="violet" label="Commission Banta Hai" value={formatPKR(summary.month.commission)} sub="team ko dena hai" />
        <Kpi icon={Star} tone="amber" label="Team Rating" value={summary.avgTeamRating ? summary.avgTeamRating.toFixed(1) : '—'} sub="ausat" />
      </section>

      {leaderChart.length > 0 && (
        <Panel icon={BarChart3} title="Is Mahine Kaun Kitna Laya" hint="Kamai aur commission saath saath" tone="cyan">
          <ResponsiveContainer width="100%" height={Math.max(240, leaderChart.length * 38)}>
            <BarChart data={leaderChart} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fontWeight: 700 }} stroke="#94a3b8"
                tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fontWeight: 700 }} stroke="#94a3b8" />
              <Tooltip contentStyle={TOOLTIP} formatter={(v: any) => formatPKR(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
              <Bar dataKey="kamai" name="Kamai" fill="#06b6d4" radius={[0, 5, 5, 0]} />
              <Bar dataKey="commission" name="Commission" fill="#a855f7" radius={[0, 5, 5, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      )}

      <Panel icon={Award} title="Poori Leaderboard" hint="Commission dete waqt yahi table dekh lein" tone="violet">
        {rows.length === 0 ? (
          <p className="text-xs font-bold text-slate-400 py-8 text-center">Abhi koi record nahi</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b-2 border-slate-200 dark:border-slate-700">
                  <Th className="text-left">#</Th>
                  <Th className="text-left">Technician</Th>
                  <Th className="text-center">Khula</Th>
                  <Th className="text-center">Is Mahine</Th>
                  <Th className="text-center">Mukammal %</Th>
                  <Th className="text-center">Rating</Th>
                  <Th className="text-right">Is Mahine Kamai</Th>
                  <Th className="text-right pr-4">Commission</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l: any, i: number) => (
                  <tr key={l.id} className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${!l.isActive ? 'opacity-60' : ''}`}>
                    <td className="px-3 py-2.5">
                      <span className={`h-6 w-6 rounded-lg text-[10px] font-extrabold flex items-center justify-center ${
                        i === 0 ? 'bg-amber-500 text-white' : i === 1 ? 'bg-slate-400 text-white' : i === 2 ? 'bg-orange-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>{i + 1}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Link to={`/appliances/technicians/${l.id}`} className="group">
                        <div className="text-[13px] font-extrabold text-slate-900 dark:text-white group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition">{l.name}</div>
                        {l.zone && <div className="text-[10px] font-bold text-slate-400">{l.zone}</div>}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold tabular-nums ${
                        l.openJobs === 0 ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                          : l.openJobs > 5 ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>{l.openJobs}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs font-extrabold tabular-nums text-slate-800 dark:text-slate-100">{l.monthJobs}</td>
                    <td className="px-3 py-2.5 text-center text-[11px] font-bold text-slate-500 dark:text-slate-400">{l.completionRate.toFixed(0)}%</td>
                    <td className="px-3 py-2.5 text-center text-[11px] font-extrabold text-amber-600 dark:text-amber-400">
                      {l.avgRating ? `⭐ ${l.avgRating.toFixed(1)}` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs font-extrabold tabular-nums text-slate-800 dark:text-slate-100 whitespace-nowrap">{formatPKR(l.monthRevenue)}</td>
                    <td className="px-3 py-2.5 pr-4 text-right text-xs font-extrabold tabular-nums text-violet-700 dark:text-violet-400 whitespace-nowrap">{formatPKR(l.monthCommission)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 dark:bg-slate-950 text-white">
                  <td colSpan={6} className="px-3 py-3 text-right text-[11px] font-extrabold uppercase tracking-widest">Kul</td>
                  <td className="px-3 py-3 text-right text-xs font-extrabold text-cyan-300 tabular-nums whitespace-nowrap">{formatPKR(summary.month.revenue)}</td>
                  <td className="px-3 py-3 pr-4 text-right text-xs font-extrabold text-violet-300 tabular-nums whitespace-nowrap">{formatPKR(summary.month.commission)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ═════════════ FORM ═════════════ */
function TechForm({ tech, onClose, onSaved }: { tech: Technician | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!tech;
  const [f, setF] = useState({
    employeeCode: tech?.employeeCode ?? '',
    name: tech?.name ?? '',
    phone: tech?.phone ?? '',
    cnic: tech?.cnic ?? '',
    address: tech?.address ?? '',
    specializations: tech?.specializations ?? [],
    brandsExpertise: tech?.brandsExpertise ?? [],
    categoriesExpertise: tech?.categoriesExpertise ?? [],
    experienceYears: tech?.experienceYears != null ? String(tech.experienceYears) : '',
    certifications: tech?.certifications ?? [],
    workingDays: tech?.workingDays ?? [1, 2, 3, 4, 5, 6],
    workStartTime: tech?.workStartTime ?? '09:00',
    workEndTime: tech?.workEndTime ?? '18:00',
    currentZone: tech?.currentZone ?? '',
    visitChargeRate: String(tech?.visitChargeRate ?? 0),
    hourlyRate: String(tech?.hourlyRate ?? 0),
    commissionPct: String(tech?.commissionPct ?? 0),
    isActive: tech?.isActive ?? true,
    photoUrl: tech?.photoUrl ?? '',
    notes: tech?.notes ?? '',
  });
  const [skillInput, setSkillInput] = useState('');
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  const mut = useMutation({
    mutationFn: () => {
      const payload: any = {
        employeeCode: f.employeeCode.trim(),
        name: f.name.trim(),
        phone: f.phone.trim(),
        specializations: f.specializations,
        brandsExpertise: f.brandsExpertise,
        categoriesExpertise: f.categoriesExpertise,
        certifications: f.certifications,
        workingDays: f.workingDays,
        workStartTime: f.workStartTime,
        workEndTime: f.workEndTime,
        visitChargeRate: Number(f.visitChargeRate) || 0,
        hourlyRate: Number(f.hourlyRate) || 0,
        commissionPct: Number(f.commissionPct) || 0,
        isActive: f.isActive,
      };
      // Khali strings mat bhejein — backend unhein reject kar deta hai
      for (const k of ['cnic', 'address', 'currentZone', 'photoUrl', 'notes'] as const) {
        if (f[k] && String(f[k]).trim()) payload[k] = String(f[k]).trim();
      }
      if (f.experienceYears.trim()) payload.experienceYears = Number(f.experienceYears) || 0;
      return isEdit ? techniciansApi.update(tech!.id, payload) : techniciansApi.create(payload);
    },
    onSuccess: () => { toast.success(isEdit ? 'Update ho gaya ✓' : 'Technician add ho gaya ✓'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save nahi hua'),
  });

  const errors: Record<string, string> = {};
  if (!f.employeeCode.trim()) errors.employeeCode = 'Code likhein (jaise TECH-01)';
  if (!f.name.trim()) errors.name = 'Naam likhein';
  if (!f.phone.trim()) errors.phone = 'Phone likhein';
  if (Number(f.commissionPct) < 0 || Number(f.commissionPct) > 100) errors.commissionPct = '0 se 100 ke darmiyan';
  const ok = Object.keys(errors).length === 0;

  const addSkill = (s: string) => {
    const v = s.trim();
    if (!v || f.specializations.includes(v)) return;
    set('specializations', [...f.specializations, v]);
    setSkillInput('');
  };

  const toggleDay = (d: number) =>
    set('workingDays', f.workingDays.includes(d) ? f.workingDays.filter((x) => x !== d) : [...f.workingDays, d].sort());

  const toggleCat = (c: any) =>
    set('categoriesExpertise', f.categoriesExpertise.includes(c)
      ? f.categoriesExpertise.filter((x) => x !== c)
      : [...f.categoriesExpertise, c]);

  return (
    <Sheet
      wide
      badge={isEdit ? 'Technician Edit' : 'Naya Technician'}
      icon={<Users className="h-3 w-3" />}
      title={isEdit ? f.name || 'Technician' : '👷 Naya Technician'}
      subtitle="Maharat aur commission theek se bharein — kaam dete waqt kaam aata hai"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1 h-12" onClick={onClose}><X className="h-4 w-4" /> Cancel</Button>
          <button onClick={() => mut.mutate()} disabled={!ok || mut.isPending}
            className="flex-[2] h-12 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-700 hover:from-cyan-500 hover:to-teal-600 disabled:opacity-50 text-white text-sm font-black inline-flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/40 transition active:scale-[0.98]">
            {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {isEdit ? 'Save Karein' : 'Add Karein'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <Panel icon={Users} title="Bunyadi Tafseel" tone="cyan">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Employee Code" required error={errors.employeeCode} hint="dukaan ka apna code">
              <input className={inputCls('h-11 font-extrabold font-mono', !!errors.employeeCode)} placeholder="TECH-01"
                value={f.employeeCode} onChange={(e) => set('employeeCode', e.target.value.toUpperCase())} />
            </Field>
            <Field label="Poora Naam" required error={errors.name}>
              <input className={inputCls('h-11 font-bold', !!errors.name)} placeholder="Muhammad Aslam"
                value={f.name} onChange={(e) => set('name', e.target.value)} />
            </Field>
          </div>
          <div className="mt-3 grid sm:grid-cols-2 gap-3">
            <Field label="Phone" required error={errors.phone}>
              <input className={inputCls('h-11 font-bold font-mono', !!errors.phone)} placeholder="0300-1234567" inputMode="tel"
                value={f.phone} onChange={(e) => set('phone', e.target.value)} />
            </Field>
            <Field label="CNIC" hint="optional">
              <input className={inputCls('h-11 font-bold font-mono')} placeholder="12345-6789012-3"
                value={f.cnic} onChange={(e) => set('cnic', e.target.value)} />
            </Field>
          </div>
          <div className="mt-3 grid sm:grid-cols-2 gap-3">
            <Field label="Ilaqa" hint="jahan ye ziyada kaam karta hai">
              <input className={inputCls('h-11 font-bold')} placeholder="Gulberg / Johar Town"
                value={f.currentZone} onChange={(e) => set('currentZone', e.target.value)} />
            </Field>
            <Field label="Tajurba (saal)">
              <input type="number" min={0} className={inputCls('h-11 font-bold tabular-nums')} placeholder="5"
                value={f.experienceYears} onChange={(e) => set('experienceYears', e.target.value)} />
            </Field>
          </div>
          <div className="mt-3">
            <Field label="Pata" hint="optional">
              <input className={inputCls('h-11 font-semibold')} value={f.address} onChange={(e) => set('address', e.target.value)} />
            </Field>
          </div>
        </Panel>

        <Panel icon={Zap} title="Maharat" hint="Kaam dete waqt system isi se sahi banda tajweez karta hai" tone="amber">
          <Field label="Kis kaam me mahir hai">
            <div className="flex gap-2">
              <input className={inputCls('h-11 font-semibold')} placeholder="Apni maharat likhein"
                value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput); } }} />
              <button type="button" onClick={() => addSkill(skillInput)} disabled={!skillInput.trim()}
                className="h-11 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white text-xs font-extrabold shrink-0 transition">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {f.specializations.length > 0 && (
              <div className="mt-2 flex gap-1.5 flex-wrap">
                {f.specializations.map((s) => (
                  <button key={s} type="button" onClick={() => set('specializations', f.specializations.filter((x) => x !== s))}
                    className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] font-extrabold inline-flex items-center gap-1 hover:bg-amber-200 transition">
                    {s} <X className="h-3 w-3" />
                  </button>
                ))}
              </div>
            )}
            <div className="mt-2 flex gap-1.5 flex-wrap">
              {COMMON_SKILLS.filter((s) => !f.specializations.includes(s)).map((s) => (
                <button key={s} type="button" onClick={() => addSkill(s)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-400 transition">
                  + {s}
                </button>
              ))}
            </div>
          </Field>

          <div className="mt-3">
            <Field label="Kaunsi cheezein theek kar sakta hai" hint="chunein — assign karte waqt kaam aata hai">
              <div className="flex gap-1.5 flex-wrap max-h-40 overflow-y-auto p-1">
                {CATEGORY_ORDER.map((c) => {
                  const on = f.categoriesExpertise.includes(c as any);
                  return (
                    <button key={c} type="button" onClick={() => toggleCat(c)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border-2 transition inline-flex items-center gap-1 ${
                        on ? 'bg-cyan-600 border-cyan-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-cyan-400'
                      }`}>
                      <span>{catEmoji(c)}</span> {catLabel(c)}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>
        </Panel>

        <Panel icon={Clock} title="Kaam Ka Waqt" tone="violet">
          <Field label="Kaam ke din">
            <div className="flex gap-1.5 flex-wrap">
              {DAYS.map((d, i) => (
                <button key={d} type="button" onClick={() => toggleDay(i)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold border-2 transition ${
                    f.workingDays.includes(i) ? 'bg-violet-600 border-violet-600 text-white shadow'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-violet-400'
                  }`}>{d}</button>
              ))}
            </div>
          </Field>
          <div className="mt-3 grid sm:grid-cols-2 gap-3">
            <Field label="Shuru">
              <input type="time" className={inputCls('h-11 font-bold [color-scheme:light] dark:[color-scheme:dark]')}
                value={f.workStartTime} onChange={(e) => set('workStartTime', e.target.value)} />
            </Field>
            <Field label="Khatam">
              <input type="time" className={inputCls('h-11 font-bold [color-scheme:light] dark:[color-scheme:dark]')}
                value={f.workEndTime} onChange={(e) => set('workEndTime', e.target.value)} />
            </Field>
          </div>
        </Panel>

        <Panel icon={Wallet} title="Rate aur Commission" hint="Commission har mukammal kaam par khud ginn jata hai" tone="emerald">
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Visit Rate" hint="ek chakkar ka">
              <input type="number" min={0} className={inputCls('h-11 font-extrabold tabular-nums')}
                value={f.visitChargeRate} onChange={(e) => set('visitChargeRate', e.target.value)} />
            </Field>
            <Field label="Ghanta Rate">
              <input type="number" min={0} className={inputCls('h-11 font-extrabold tabular-nums')}
                value={f.hourlyRate} onChange={(e) => set('hourlyRate', e.target.value)} />
            </Field>
            <Field label="Commission %" error={errors.commissionPct} hint="kul bill ka">
              <input type="number" min={0} max={100} className={inputCls('h-11 font-extrabold tabular-nums', !!errors.commissionPct)}
                value={f.commissionPct} onChange={(e) => set('commissionPct', e.target.value)} />
            </Field>
          </div>
          {Number(f.commissionPct) > 0 && (
            <div className="mt-2 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
              ✓ Agar ye 5,000 ka kaam kare to <strong>{formatPKR((5000 * Number(f.commissionPct)) / 100)}</strong> commission banegi
            </div>
          )}
          <div className="mt-3">
            <Field label="Notes" hint="andaruni">
              <textarea rows={2} className={inputCls('py-2 font-semibold resize-none')}
                placeholder="Sirf subah available • apni bike hai"
                value={f.notes} onChange={(e) => set('notes', e.target.value)} />
            </Field>
          </div>
          <button type="button" onClick={() => set('isActive', !f.isActive)}
            className={`mt-3 w-full flex items-center justify-between p-3 rounded-xl border-2 transition text-left ${
              f.isActive ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/15 dark:to-teal-500/10 border-emerald-300 dark:border-emerald-500/40'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
            }`}>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <div>
                <div className="text-sm font-extrabold text-slate-900 dark:text-white">Active</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Kaam dene ki list me nazar aayega</div>
              </div>
            </div>
            <div className={`h-6 w-11 rounded-full transition-colors relative shrink-0 ${f.isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
              <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${f.isActive ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
            </div>
          </button>
        </Panel>
      </div>
    </Sheet>
  );
}

/* ═════════════ TEACHER ═════════════ */
function TechTeacher({ onClose }: { onClose: () => void }) {
  return (
    <Teacher
      title="Technicians Kaise Manage Karein?"
      intro={
        <>
          Appliance ki dukaan me <strong>technician hi asal sarmaya</strong> hai. Maal to har koi bech leta hai,
          lekin acha kaam karne wala banda customer ko wapas laata hai.
        </>
      }
      blocks={[
        {
          title: '🟢 Bojh dekh kar kaam dein',
          tone: 'emerald',
          tips: [
            <>Har card par sab se bara number uska <strong>khula kaam</strong> hai — naam nahi</>,
            <><span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-black">🟢 Khali</span> — isay foran kaam dein</>,
            <><span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[10px] font-black">🔴 Bojh ziyada</span> — 5 se ziyada kaam khula hai, aur mat dein warna sab late honge</>,
            <>Yehi ginti Service Requests aur Installations me technician chunte waqt bhi nazar aati hai</>,
          ],
        },
        {
          title: '⚡ Maharat theek se bharein',
          tone: 'amber',
          tips: [
            <><strong>"Kaunsi cheezein theek kar sakta hai"</strong> — AC wala banda fridge par mat bhejein</>,
            <><strong>Ilaqa</strong> likhein — pass wale ilaqe ka kaam usi banday ko dein, safar ka waqt bachta hai</>,
            <><strong>Kaam ke din aur waqt</strong> — Juma ki chhutti hai to us din uska naam mat chunein</>,
          ],
        },
        {
          title: '💰 Commission khud ginti hai',
          tone: 'violet',
          tips: [
            <><strong>Commission %</strong> set karein — phir har mukammal kaam par uska hissa <strong>khud jama hota rehta hai</strong></>,
            <><strong>"Performance" tab</strong> (<Kbd dark>A</Kbd>) — mahine ke aakhir me yahi table kholein aur commission de dein</>,
            <><strong>Rating</strong> khud banti hai — jab kaam mukammal karte waqt customer ki rating daalte hain</>,
            <>Jis ka <strong>completion % kam</strong> ho uska kaam dekh lein — shayad usay ghalat qism ka kaam mil raha hai</>,
          ],
        },
        {
          title: '🚫 Band karna vs delete',
          tone: 'rose',
          tips: [
            <>Technician <strong>delete nahi hota</strong> — sirf "band" hota hai. Uska purana kaam, commission aur rating ka record mehfooz rehta hai</>,
            <>Agar uske paas <strong>khula kaam</strong> ho to system band nahi karega — pehle wo kaam kisi aur ko dein</>,
          ],
        },
      ]}
      shortcuts={[
        { keys: '/', label: 'Search' },
        { keys: 'N', label: 'Naya technician' },
        { keys: 'G', label: 'Grid / List' },
        { keys: 'A', label: 'Performance' },
        { keys: 'P', label: 'Print' },
        { keys: 'T', label: 'Ye guide' },
      ]}
      golden={
        <>
          <strong>Sunahri usool:</strong> Kaam <strong>barabar baantein</strong>. Ek achay banday par saara bojh
          daal dena sab se aam ghalti hai — wo thak jata hai, kaam late hote hain, aur baqi team seekhti hi nahi.
        </>
      }
      onClose={onClose}
    />
  );
}
