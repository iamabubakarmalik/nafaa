import { useMemo, useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Award, Star, TrendingUp, Gift, Crown, Sparkles, Trophy,
  Medal, Target, Users, Zap, BookOpen, GraduationCap, X,
  Search, Printer, Download, RefreshCw, CheckCircle2, Flame,
  Activity, Percent,
} from 'lucide-react';
import { loyaltyApi } from '@modules/customers/loyalty/api/loyalty.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';

/* ═════════════════════════════════════════════════════════════
   NAFAA LOYALTY — GLOBAL FULL BEST v3
   ─────────────────────────────────────────────────────────────
   🌍 GLOBAL — Retail/Restaurant/Salon/Pharmacy sab me kaam
   🌙 Dark mode complete
   🎓 Teacher modal — Loyalty concept + tier system + earn/burn
   ⌨️  / = search • T = teacher • Esc = close
   🏆 Top 3 celebration — animated crown/medals
   📊 Tier filter — quick drill-down
   🖨️ Print + 📊 CSV export
   💡 Engagement rate + redemption ratio metrics
   ═════════════════════════════════════════════════════════════ */

const TIERS = [
  { name: 'Diamond',  min: 5000, color: 'from-cyan-400 to-blue-600',     icon: '💎', darkGlow: 'shadow-cyan-500/40' },
  { name: 'Platinum', min: 2000, color: 'from-slate-400 to-slate-700',    icon: '🏆', darkGlow: 'shadow-slate-500/40' },
  { name: 'Gold',     min: 1000, color: 'from-amber-400 to-orange-600',   icon: '🥇', darkGlow: 'shadow-amber-500/40' },
  { name: 'Silver',   min: 500,  color: 'from-slate-300 to-slate-500',    icon: '🥈', darkGlow: 'shadow-slate-400/40' },
  { name: 'Bronze',   min: 100,  color: 'from-orange-400 to-red-600',     icon: '🥉', darkGlow: 'shadow-orange-500/40' },
  { name: 'Starter',  min: 0,    color: 'from-emerald-400 to-emerald-600',icon: '⭐', darkGlow: 'shadow-emerald-500/40' },
];

const getTier = (points: number) => TIERS.find((t) => points >= t.min) || TIERS[TIERS.length - 1];

type TierFilter = 'all' | string;

export default function LoyaltyPage() {
  const searchRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [showTeacher, setShowTeacher] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['loyalty-leaderboard'],
    queryFn: loyaltyApi.leaderboard,
  });

  const tierStats = useMemo(() => {
    if (!data?.topCustomers) return TIERS.map((t) => ({ ...t, count: 0 }));
    return TIERS.map((tier) => ({
      ...tier,
      count: data.topCustomers.filter((c) => getTier(c.loyaltyPoints).name === tier.name).length,
    }));
  }, [data]);

  const filteredCustomers = useMemo(() => {
    if (!data?.topCustomers) return [];
    let result = [...data.topCustomers];
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q)
      );
    }
    if (tierFilter !== 'all') {
      result = result.filter((c) => getTier(c.loyaltyPoints).name === tierFilter);
    }
    return result;
  }, [data, search, tierFilter]);

  const metrics = useMemo(() => {
    const earned = data?.totalEarned || 0;
    const redeemed = data?.totalRedeemed || 0;
    const outstanding = earned - redeemed;
    const redemptionRate = earned > 0 ? (redeemed / earned) * 100 : 0;
    const activeMembers = data?.topCustomers?.length || 0;
    const avgPoints = activeMembers > 0
      ? Math.round((data?.topCustomers || []).reduce((s, c) => s + c.loyaltyPoints, 0) / activeMembers)
      : 0;
    const topSpender = data?.topCustomers?.[0];
    return { earned, redeemed, outstanding, redemptionRate, activeMembers, avgPoints, topSpender };
  }, [data]);

  const exportCSV = () => {
    if (filteredCustomers.length === 0) return;
    const summary = [
      ['Loyalty Program Report'],
      [`Generated: ${new Date().toLocaleString('en-PK')}  •  Members: ${metrics.activeMembers}  •  Outstanding: ${metrics.outstanding.toLocaleString()} pts`],
      [''],
    ];
    const headers = ['Rank', 'Customer', 'Phone', 'Tier', 'Loyalty Points', 'Total Spent (PKR)'];
    const rows = filteredCustomers.map((c, i) => [
      i + 1,
      c.name,
      c.phone || '',
      getTier(c.loyaltyPoints).name,
      c.loyaltyPoints,
      c.totalSpent,
    ]);
    const csv = [...summary, headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loyalty-leaderboard-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* Keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTeacher) return setShowTeacher(false);
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === 't') { e.preventDefault(); setShowTeacher(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = showTeacher ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [showTeacher]);

  const hasFilters = !!search || tierFilter !== 'all';

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <LoyaltyTeacher onClose={() => setShowTeacher(false)} />}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-yellow-900 to-amber-700 dark:from-slate-950 dark:via-amber-950 dark:to-yellow-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-amber-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-yellow-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <Award className="h-3.5 w-3.5 text-amber-300" /> Rewards Program
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">🏆 Loyalty & Rewards</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              <strong className="text-emerald-300">{metrics.activeMembers}</strong> members
              <span className="opacity-50 mx-1.5">•</span>
              <strong className="text-amber-200">{metrics.outstanding.toLocaleString()}</strong> pts in circulation
              <span className="opacity-50 mx-1.5">•</span>
              <strong className="text-violet-200">{metrics.redemptionRate.toFixed(0)}%</strong> redemption rate
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button
              onClick={() => setShowTeacher(true)}
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
            >
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
            </button>
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={exportCSV}
              disabled={filteredCustomers.length === 0}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition"
            >
              <Download className="h-4 w-4" /> <span className="hidden sm:inline">CSV</span>
            </button>
            <button
              onClick={() => window.print()}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
            >
              <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Print</span>
            </button>
          </div>
        </div>

        <div className="relative mt-3 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center">
          <Kbd>/</Kbd><span className="text-white/60">Customer dhundo</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>T</Kbd><span className="text-white/60">Guide</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>Esc</Kbd><span className="text-white/60">Band</span>
        </div>
      </section>

      {/* ═══ KPIs — Enhanced with engagement metrics ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 print:hidden">
        <Kpi icon={TrendingUp} tone="emerald" label="Total Earned" value={metrics.earned.toLocaleString()} sub="Sab points diye" />
        <Kpi icon={Gift} tone="rose" label="Total Redeemed" value={metrics.redeemed.toLocaleString()} sub={`${metrics.redemptionRate.toFixed(0)}% burn rate`} />
        <Kpi icon={Sparkles} tone="amber" label="Outstanding" value={metrics.outstanding.toLocaleString()} sub="Circulation me" highlight />
        <Kpi icon={Activity} tone="violet" label="Avg per Member" value={metrics.avgPoints.toLocaleString()} sub={`${metrics.activeMembers} active`} />
      </section>

      {/* ═══ TIER DISTRIBUTION ═══ */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md">
              <Trophy className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Tier Distribution</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Click karo → us tier ke customers filter honge</p>
            </div>
          </div>
          {tierFilter !== 'all' && (
            <button
              onClick={() => setTierFilter('all')}
              className="text-xs font-extrabold text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Filter hatao
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {tierStats.map((tier) => {
            const active = tierFilter === tier.name;
            return (
              <button
                key={tier.name}
                onClick={() => setTierFilter(active ? 'all' : tier.name)}
                className={`rounded-2xl bg-gradient-to-br ${tier.color} text-white p-3 sm:p-4 shadow-lg ${tier.darkGlow} text-left transition-all hover:-translate-y-0.5 hover:shadow-xl ${
                  active ? 'ring-4 ring-white dark:ring-slate-100 scale-105' : ''
                }`}
              >
                <div className="text-2xl sm:text-3xl mb-1">{tier.icon}</div>
                <div className="text-[10px] uppercase tracking-widest font-extrabold opacity-90">{tier.name}</div>
                <div className="text-xl sm:text-2xl font-extrabold mt-1 tabular-nums">{tier.count}</div>
                <div className="text-[9px] opacity-75 mt-0.5 font-bold">≥ {tier.min.toLocaleString()} pts</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ═══ LEADERBOARD ═══ */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white truncate">
                Top Loyalty Customers ({filteredCustomers.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Points ke hisaab se sorted</p>
            </div>
          </div>
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Customer dhundo... (/)"
              className="h-9 w-56 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-5 sm:p-6 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-12 sm:p-16 text-center">
            <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-amber-100 to-yellow-200 dark:from-amber-500/20 dark:to-yellow-500/20 flex items-center justify-center">
              <Award className="h-9 w-9 text-amber-600 dark:text-amber-400" />
            </div>
            <h4 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
              {hasFilters ? 'Kuch nahi mila' : 'Abhi koi loyalty member nahi'}
            </h4>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 font-semibold max-w-md mx-auto">
              {hasFilters
                ? 'Filter change kar ke dekho'
                : 'Settings me loyalty enable karo — POS sales par customers ko automatically points milenge.'}
            </p>
            {hasFilters ? (
              <Button variant="secondary" className="mt-4" onClick={() => { setSearch(''); setTierFilter('all'); }}>
                <X className="h-4 w-4" /> Filter hatao
              </Button>
            ) : (
              <Link
                to="/settings"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-sm font-extrabold shadow-lg shadow-amber-500/30"
              >
                <Zap className="h-4 w-4" /> Loyalty Configure Karo
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y-2 divide-slate-100 dark:divide-slate-800">
            {filteredCustomers.map((customer, idx) => {
              const position = idx + 1;
              const tier = getTier(customer.loyaltyPoints);
              const nextTier = TIERS.filter((t) => t.min > customer.loyaltyPoints).pop();
              const progress = nextTier ? (customer.loyaltyPoints / nextTier.min) * 100 : 100;
              const isTop3 = position <= 3;
              return (
                <div
                  key={customer.id}
                  className={`px-5 sm:px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${
                    position === 1 ? 'bg-gradient-to-r from-amber-50/60 to-transparent dark:from-amber-500/10 dark:to-transparent' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-extrabold text-lg shrink-0 relative ${
                        position === 1 ? 'bg-gradient-to-br from-amber-400 to-yellow-600 text-white shadow-lg shadow-amber-500/40' :
                        position === 2 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow-lg' :
                        position === 3 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        {position === 1 ? <Crown className="h-6 w-6" /> : isTop3 ? <Medal className="h-6 w-6" /> : `#${position}`}
                        {position === 1 && (
                          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center">
                            <Flame className="h-2.5 w-2.5 text-white" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-extrabold text-slate-900 dark:text-white truncate">{customer.name}</div>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r ${tier.color} text-white text-[10px] font-extrabold shadow shrink-0`}>
                            <span>{tier.icon}</span>
                            {tier.name}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-semibold">
                          {customer.phone || 'No phone'} <span className="opacity-50 mx-1">•</span> Spent: <strong className="text-slate-700 dark:text-slate-300">{formatPKR(customer.totalSpent)}</strong>
                        </div>
                        {nextTier && (
                          <div className="mt-1.5 max-w-xs">
                            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">
                              <span className="font-bold">→ {nextTier.name}</span>
                              <span className="font-extrabold text-amber-700 dark:text-amber-400">{(nextTier.min - customer.loyaltyPoints).toLocaleString()} pts to go</span>
                            </div>
                            <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className={`h-full bg-gradient-to-r ${nextTier.color} transition-all`} style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1.5 justify-end">
                        <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                        <span className="text-2xl font-extrabold text-amber-700 dark:text-amber-400 tabular-nums">{customer.loyaltyPoints.toLocaleString()}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">loyalty points</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-50 via-white to-yellow-50 dark:from-amber-500/10 dark:via-slate-900/60 dark:to-yellow-500/10 border-2 border-amber-200 dark:border-amber-500/40 p-4 sm:p-6 print:hidden">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Loyalty Kaise Kaam Karta Hai</h3>
          </div>
          <button
            onClick={() => setShowTeacher(true)}
            className="text-xs font-extrabold text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
          >
            <GraduationCap className="h-3.5 w-3.5" /> Poori guide
          </button>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
          {[
            { num: 1, title: 'Customer Kharidta Hai', desc: 'Har sale par automatic points milte hain. Rate settings me (e.g. Rs 100 = 1 point).', icon: Target, tone: 'emerald' },
            { num: 2, title: 'Points Jama Hote Hain', desc: 'Customer ke account me lifetime accumulate — kabhi expire nahi. Tier upgrade automatic.', icon: TrendingUp, tone: 'violet' },
            { num: 3, title: 'Redeem Karke Discount', desc: 'Agli purchase par points use karo — POS pe auto-apply, cash discount ban jata hai.', icon: Gift, tone: 'amber' },
          ].map((step) => {
            const Icon = step.icon;
            const tones: Record<string, string> = {
              emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
              violet: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400',
              amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
            };
            return (
              <div key={step.num} className="rounded-2xl bg-white dark:bg-slate-900/70 border-2 border-amber-200 dark:border-amber-500/30 p-4 shadow-sm">
                <div className={`h-10 w-10 rounded-xl ${tones[step.tone]} flex items-center justify-center mb-3`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-widest">Step {step.num}</div>
                <div className="font-extrabold text-slate-900 dark:text-white mt-0.5">{step.title}</div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed font-semibold">{step.desc}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-between bg-white dark:bg-slate-900/70 rounded-xl border-2 border-amber-200 dark:border-amber-500/30 p-3 flex-wrap gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-sm text-slate-700 dark:text-slate-300 font-semibold truncate">
              Earn/burn rate aur program enable karo →
            </span>
          </div>
          <Link
            to="/settings"
            className="text-sm font-extrabold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 px-3 py-1.5 rounded-lg shadow-md shrink-0"
          >
            Settings →
          </Link>
        </div>
      </section>

      {/* Print CSS */}
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm 10mm; }
          html, body { background: white !important; color: #0f172a !important; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          [class*="fixed"] { display: none !important; }
          html, body, #root { height: auto !important; min-height: 0 !important; overflow: visible !important; }
          [class*="sidebar"], [class*="topbar"], nav[class*="fixed"] { display: none !important; }
          [data-sonner-toaster], [data-sonner-toast], [class*="Toaster"] { display: none !important; visibility: hidden !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   LOYALTY TEACHER — Universal loyalty concepts
   ═════════════════════════════════════════════════════════════ */
function LoyaltyTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-amber-200 dark:border-amber-500/30 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-500/15 dark:to-yellow-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Loyalty Program — Guide
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            <strong>Loyalty program = repeat customer machine.</strong> Naya customer lana 5× mehnga hai purane ko wapas laane se.
            Points → tier upgrades → customer wapas aata hai. Simple.
          </p>

          {/* Tier System */}
          <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/5 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-700 dark:text-amber-300">
              🏆 6-Tier System
            </div>
            <div className="space-y-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
              {TIERS.slice().reverse().map((t) => (
                <div key={t.name} className="flex items-center justify-between rounded-lg bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-500/30 px-2.5 py-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="text-lg">{t.icon}</span>
                    <strong>{t.name}</strong>
                  </span>
                  <span className="font-mono text-[11px] text-amber-700 dark:text-amber-400 font-extrabold">≥ {t.min.toLocaleString()} pts</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold pt-1">
              Customer jitna kharche, tier upar. Higher tier = zyada perks (VIP treatment, exclusive discounts).
            </p>
          </div>

          {/* Earn/Burn Ratio */}
          <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/5 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
              <Percent className="h-3 w-3" /> Earn / Burn Ratio — Kaise Set Karein
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-500/30 p-2">
                💰 <strong>Earn:</strong> Standard = <strong>Rs 100 = 1 point</strong>. Retail me safe. Restaurant me Rs 50 = 1 point bhi chalta hai.
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-500/30 p-2">
                🎁 <strong>Burn:</strong> Standard = <strong>100 points = Rs 100 discount</strong>. Yani 1% cashback. Zyada karo → margins gum.
              </div>
              <div className="rounded-lg bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 p-2 font-extrabold">
                ⚖️ <strong>Golden rule:</strong> Total redemption {'<'} 3% of revenue. Warna nafa kha jaega.
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>📊 Redemption rate</strong> — 30-60% healthy. {'<'}20% = customers ko yaad nahi. {'>'}80% = giveaway bahut hai.</TipRow>
            <TipRow><strong>👑 Top 3</strong> — inko VIP treatment do. Personal thank-you WhatsApp, birthday discount, priority service.</TipRow>
            <TipRow><strong>💎 Diamond members</strong> — total customer base ke 5-10% honge, but revenue ke 40-50% laate hain (Pareto rule).</TipRow>
            <TipRow><strong>🎯 Tier filter</strong> — Distribution card click karke us tier ke sab customers dekho, phir SMS campaign chalao.</TipRow>
            <TipRow><strong>🔄 Outstanding points</strong> — liability hai (customers redeem karenge). Zyada = future revenue impact.</TipRow>
            <TipRow><strong>⏰ Expiry</strong> — recommend nahi karta expiry lagana. Trust break hota hai. Points lifetime rakho.</TipRow>
          </div>

          <div className="rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30 p-3 text-xs font-semibold text-violet-800 dark:text-violet-200">
            💡 <strong>Pro tip:</strong> Har month top 10 customers ko WhatsApp karo: <em>"Aapke {'{'}<strong>X</strong>{'}'} points hain — {'{'}<strong>Y</strong>{'}'} aur pts pe {'{'}<strong>NextTier</strong>{'}'} member ban jayenge!"</em> Repeat visit guarantee.
          </div>

          <Button
            className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 font-extrabold shadow-lg shadow-amber-500/40 h-12"
            onClick={onClose}
          >
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya — Reward Karo!
          </Button>
        </div>
      </div>
    </div>
  );
}

function TipRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded bg-white/15 border border-white/25 text-white font-mono font-bold shadow-sm">
      {children}
    </kbd>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone, highlight }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/40',
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/40',
    amber: 'from-amber-500 to-yellow-600 shadow-amber-500/40',
    violet: 'from-violet-500 to-purple-700 shadow-violet-500/40',
  };
  return (
    <div
      className={`rounded-2xl border-2 p-3 sm:p-4 shadow-sm transition-all ${
        highlight
          ? `bg-gradient-to-br ${tones[tone]} text-white border-transparent shadow-lg`
          : 'bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className={`text-[10px] uppercase tracking-widest font-extrabold ${
            highlight ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'
          }`}>{label}</div>
          <div className={`mt-1.5 text-xl sm:text-2xl font-extrabold tabular-nums truncate ${
            highlight ? 'text-white' : 'text-slate-900 dark:text-white'
          }`}>{value}</div>
          {sub && <div className={`text-[10px] font-bold mt-0.5 truncate ${
            highlight ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'
          }`}>{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
          highlight
            ? 'bg-white/20 backdrop-blur text-white'
            : `bg-gradient-to-br ${tones[tone]} text-white shadow-lg`
        }`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
