import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Gift, Users, TrendingUp, Wallet, Copy, Check, Share2,
  MessageCircle, Mail, Award, Sparkles, Crown, Star,
  ArrowUpRight, ArrowDownRight, Target, Calendar, BarChart3,
  Activity, Zap, RefreshCw, Download, Search, X, Filter,
  Clock, CheckCircle2, AlertCircle, XCircle, Trophy,
  ChevronRight, ExternalLink, Banknote, GraduationCap,
  Printer, Flame, Rocket, Heart,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { referralsApi } from '@modules/customers/referrals/api/referrals.api';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';

/* ═════════════════════════════════════════════════════════════
   NAFAA REFERRALS — GLOBAL FULL BEST v3
   ─────────────────────────────────────────────────────────────
   🌍 GLOBAL — SaaS/Service/Product referral system
   🌙 Dark mode complete
   🎓 Teacher modal — Referral marketing concepts + tips
   ⌨️  / = search • S = share • T = teacher • C = copy code • Esc
   🏆 6-tier achievement (Beginner → Diamond)
   📊 Interactive status filter chips
   🖨️ Print + 📊 CSV export
   💡 30-day trend + status breakdown + recent activity
   ═════════════════════════════════════════════════════════════ */

const formatDate = (v: string) => new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v));
const formatDateTime = (v: string) => new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));
const formatRelative = (v: string) => {
  const d = new Date(v);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-PK');
};

const statusConfig: Record<string, { label: string; bg: string; text: string; icon: any; color: string; darkBg: string; darkText: string }> = {
  PENDING:   { label: 'Pending',    bg: 'bg-amber-100',   text: 'text-amber-700',   darkBg: 'dark:bg-amber-500/20',   darkText: 'dark:text-amber-300',   icon: Clock,        color: '#f59e0b' },
  SIGNED_UP: { label: 'Signed Up',  bg: 'bg-blue-100',    text: 'text-blue-700',    darkBg: 'dark:bg-blue-500/20',    darkText: 'dark:text-blue-300',    icon: Users,        color: '#3b82f6' },
  CONVERTED: { label: 'Converted',  bg: 'bg-emerald-100', text: 'text-emerald-700', darkBg: 'dark:bg-emerald-500/20', darkText: 'dark:text-emerald-300', icon: CheckCircle2, color: '#10b981' },
  PAID:      { label: 'Paid',       bg: 'bg-violet-100',  text: 'text-violet-700',  darkBg: 'dark:bg-violet-500/20',  darkText: 'dark:text-violet-300',  icon: Award,        color: '#8b5cf6' },
  EXPIRED:   { label: 'Expired',    bg: 'bg-rose-100',    text: 'text-rose-700',    darkBg: 'dark:bg-rose-500/20',    darkText: 'dark:text-rose-300',    icon: XCircle,      color: '#ef4444' },
};

type StatusFilter = 'all' | 'PENDING' | 'SIGNED_UP' | 'CONVERTED' | 'PAID' | 'EXPIRED';
type Tab = 'overview' | 'referrals' | 'credits';

export default function ReferralsPage() {
  const searchRef = useRef<HTMLInputElement>(null);

  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showTeacher, setShowTeacher] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['referrals-me'],
    queryFn: referralsApi.myDashboard,
  });

  const safeData = data || {
    tenant: { referralCode: '' },
    stats: { totalReferrals: 0, convertedCount: 0, totalEarned: 0, currentCredit: 0, rewardAmount: 0, rewardPercentage: 0 },
    referrals: [],
    credits: [],
  };

  const code = safeData.tenant.referralCode || '';
  const shareUrl = `${window.location.origin}/register?ref=${code}`;

  const copyCode = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Code copy ho gaya!');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copy ho gaya!');
  };

  const shareWhatsapp = () => {
    const lines = [
      `🎉 *Nafaa POS — Pakistan ka Best Shop Management System*`,
      '',
      `Assalam-o-Alaikum! Mein Nafaa POS use kar raha hoon — apne shop ke liye sab se aasaan POS system.`,
      '',
      `✅ POS, Inventory, Sales Reports`,
      `✅ Customer Khata Management`,
      `✅ Daily Reports & Analytics`,
      `✅ Multi-shop Support`,
      `✅ Free Trial Available`,
      '',
      `📲 Sign up karein mere referral code se aur special bonus pao:`,
      '',
      `🎁 *Code:* \`${code}\``,
      `🔗 ${shareUrl}`,
      '',
      `_Apna business smart banao!_ 🚀`,
    ];
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  };

  const shareEmail = () => {
    const subject = '🎉 Try Nafaa POS — Pakistan ka Best Shop Management System';
    const lines = [
      'Assalam-o-Alaikum!',
      '',
      'Mein Nafaa POS use kar raha hoon aur ye bohot zabardast hai — POS, inventory, sales reports, sab kuch ek hi platform pe.',
      '',
      'Features:',
      '  ✓ Complete POS with barcode',
      '  ✓ Inventory & Stock Management',
      '  ✓ Customer Khata (Udhaar tracking)',
      '  ✓ Daily Sales & Profit Reports',
      '  ✓ Multi-shop Support',
      '  ✓ Free Trial Available',
      '',
      `Mera referral code use karein: ${code}`,
      '',
      `Signup link: ${shareUrl}`,
      '',
      'Shukriya!',
    ];
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`);
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Try Nafaa POS',
          text: `Mein Nafaa POS use kar raha hoon. Mere code "${code}" se signup karo!`,
          url: shareUrl,
        });
      } catch {}
    } else {
      copyLink();
    }
  };

  const filteredReferrals = useMemo(() => {
    let result = [...safeData.referrals];
    const q = search.toLowerCase().trim();
    if (q) result = result.filter((r: any) => r.referee?.name?.toLowerCase().includes(q));
    if (statusFilter !== 'all') result = result.filter((r: any) => r.status === statusFilter);
    return result;
  }, [safeData.referrals, search, statusFilter]);

  const trendData = useMemo(() => {
    const buckets: Record<string, { date: string; label: string; count: number; earned: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;
      buckets[key] = { date: key, label: `${d.getDate()}/${d.getMonth() + 1}`, count: 0, earned: 0 };
    }
    for (const r of safeData.referrals as any[]) {
      const d = new Date(r.createdAt);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;
      if (buckets[key]) {
        buckets[key].count += 1;
        buckets[key].earned += r.rewardAmount || 0;
      }
    }
    return Object.values(buckets);
  }, [safeData.referrals]);

  const statusBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of safeData.referrals as any[]) map.set(r.status, (map.get(r.status) || 0) + 1);
    return Array.from(map.entries()).map(([status, count]) => ({
      name: statusConfig[status]?.label || status,
      value: count,
      color: statusConfig[status]?.color || '#64748b',
    }));
  }, [safeData.referrals]);

  const conversionRate = useMemo(() => {
    if (safeData.stats.totalReferrals === 0) return 0;
    return (safeData.stats.convertedCount / safeData.stats.totalReferrals) * 100;
  }, [safeData.stats]);

  const recentActivity = useMemo(() => {
    const allItems = [
      ...safeData.referrals.map((r: any) => ({
        type: 'referral' as const,
        date: r.createdAt,
        title: `${r.referee?.name} joined`,
        status: r.status,
        amount: r.rewardAmount,
      })),
      ...safeData.credits.map((c: any) => ({
        type: 'credit' as const,
        date: c.createdAt,
        title: c.note || c.type,
        amount: c.amount,
        balance: c.balanceAfter,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return allItems.slice(0, 8);
  }, [safeData]);

  const hasFilters = !!search || statusFilter !== 'all';

  const exportReferrals = () => {
    if (filteredReferrals.length === 0) return toast.error('Koi data nahi');
    const summary = [
      ['Referrals Report'],
      [`Generated: ${new Date().toLocaleString('en-PK')}  •  Total: ${safeData.stats.totalReferrals}  •  Converted: ${safeData.stats.convertedCount}  •  Earned: ${safeData.stats.totalEarned}`],
      [''],
    ];
    const headers = ['Date', 'Referee Name', 'Status', 'Reward Amount'];
    const rows = filteredReferrals.map((r: any) => [
      formatDateTime(r.createdAt),
      r.referee?.name || 'Unknown',
      r.status,
      r.rewardAmount?.toFixed(2) || '0',
    ]);
    const csv = [...summary, headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `referrals-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filteredReferrals.length} referrals export ho gaye`);
  };

  const getAchievementLevel = (count: number) => {
    if (count >= 50) return { label: 'Diamond',  emoji: '💎', color: 'from-cyan-400 to-blue-600',       glow: 'shadow-cyan-500/40' };
    if (count >= 25) return { label: 'Platinum', emoji: '🏆', color: 'from-slate-400 to-slate-600',     glow: 'shadow-slate-500/40' };
    if (count >= 10) return { label: 'Gold',     emoji: '🥇', color: 'from-amber-400 to-amber-600',     glow: 'shadow-amber-500/40' };
    if (count >= 5)  return { label: 'Silver',   emoji: '🥈', color: 'from-slate-300 to-slate-500',     glow: 'shadow-slate-400/40' };
    if (count >= 1)  return { label: 'Bronze',   emoji: '🥉', color: 'from-orange-400 to-orange-600',   glow: 'shadow-orange-500/40' };
    return              { label: 'Beginner', emoji: '🌱', color: 'from-emerald-400 to-emerald-600', glow: 'shadow-emerald-500/40' };
  };
  const achievement = getAchievementLevel(safeData.stats.convertedCount);
  const nextMilestone =
    safeData.stats.convertedCount >= 50 ? null :
    safeData.stats.convertedCount >= 25 ? { target: 50, label: 'Diamond' } :
    safeData.stats.convertedCount >= 10 ? { target: 25, label: 'Platinum' } :
    safeData.stats.convertedCount >= 5  ? { target: 10, label: 'Gold' } :
    safeData.stats.convertedCount >= 1  ? { target: 5,  label: 'Silver' } :
    { target: 1, label: 'Bronze' };

  /* Keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTeacher) return setShowTeacher(false);
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); setTab('referrals'); }
      if (e.key.toLowerCase() === 't') { e.preventDefault(); setShowTeacher(true); }
      if (e.key.toLowerCase() === 's') { e.preventDefault(); shareWhatsapp(); }
      if (e.key.toLowerCase() === 'c') { e.preventDefault(); copyCode(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTeacher, code]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = showTeacher ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [showTeacher]);

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-44 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <ReferralsTeacher onClose={() => setShowTeacher(false)} rewardAmount={safeData.stats.rewardAmount} rewardPercentage={safeData.stats.rewardPercentage} />}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-pink-700 dark:from-slate-950 dark:via-pink-950 dark:to-rose-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-pink-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <Gift className="h-3.5 w-3.5 text-amber-300" /> Referral Program
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">🎁 Earn While You Share!</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold max-w-xl">
              Dosto ko refer karo — har successful signup pe <strong className="text-amber-300">Rs {safeData.stats.rewardAmount}+</strong> kamao
            </p>

            {/* Achievement badge */}
            <div className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white/15 backdrop-blur-md px-3 py-2 border border-white/25 shadow-lg">
              <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${achievement.color} flex items-center justify-center shadow-lg ${achievement.glow} text-base`}>
                {achievement.emoji}
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-widest font-extrabold opacity-80">Current Rank</div>
                <div className="font-extrabold leading-none text-sm">{achievement.label}</div>
              </div>
              {nextMilestone && (
                <>
                  <ChevronRight className="h-4 w-4 text-white/40 mx-1" />
                  <div className="text-xs">
                    <div className="text-white/70 font-semibold">→ <strong>{nextMilestone.label}</strong></div>
                    <div className="font-extrabold text-amber-300 tabular-nums">
                      {nextMilestone.target - safeData.stats.convertedCount} to go
                    </div>
                  </div>
                </>
              )}
            </div>
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
              onClick={() => window.print()}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
            >
              <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={shareWhatsapp}
              disabled={!code}
              className="h-11 px-3 rounded-xl bg-white text-pink-700 hover:bg-pink-50 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg disabled:opacity-50 transition"
            >
              <MessageCircle className="h-4 w-4" /> <span className="hidden sm:inline">Share Now</span>
            </button>
          </div>
        </div>

        <div className="relative mt-3 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center">
          <Kbd>/</Kbd><span className="text-white/60">Search</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>C</Kbd><span className="text-white/60">Copy code</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>S</Kbd><span className="text-white/60">Share WA</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>T</Kbd><span className="text-white/60">Guide</span>
        </div>
      </section>

      {/* ═══ TABS ═══ */}
      <section className="flex gap-2 overflow-x-auto pb-1 print:hidden">
        {[
          { id: 'overview' as Tab, label: 'Overview', icon: BarChart3 },
          { id: 'referrals' as Tab, label: 'My Referrals', icon: Users, badge: safeData.referrals.length },
          { id: 'credits' as Tab, label: 'Credits', icon: Wallet, badge: safeData.credits.length },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-extrabold whitespace-nowrap transition border-2 ${
                active
                  ? 'bg-pink-600 text-white border-pink-600 shadow-lg shadow-pink-500/30'
                  : 'bg-white dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-pink-300 dark:hover:border-pink-500/50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span className={`px-1.5 rounded-full text-[10px] font-extrabold ${
                  active ? 'bg-white/20' : 'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300'
                }`}>
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </section>

      {/* ═══ STATS GRID ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <StatCard
          label="Total Referrals"
          value={safeData.stats.totalReferrals}
          sub={`${safeData.stats.convertedCount} successful`}
          icon={Users}
          color="blue"
        />
        <StatCard
          label="Conversion Rate"
          value={`${conversionRate.toFixed(1)}%`}
          sub={conversionRate >= 50 ? '🔥 Excellent!' : conversionRate >= 25 ? 'Good progress' : 'Keep sharing'}
          icon={Target}
          color="violet"
          isHighlight={conversionRate >= 50}
        />
        <StatCard
          label="Total Earned"
          value={formatPKR(safeData.stats.totalEarned)}
          sub="Lifetime rewards"
          icon={TrendingUp}
          color="amber"
          isText
        />
        <StatCard
          label="Available Credit"
          value={formatPKR(safeData.stats.currentCredit)}
          sub={safeData.stats.currentCredit > 0 ? '💰 Ready to use' : 'Refer to earn'}
          icon={Wallet}
          color="emerald"
          isText
          isHighlight={safeData.stats.currentCredit > 0}
        />
      </section>

      {/* ═══ OVERVIEW TAB ═══ */}
      {tab === 'overview' && (
        <>
          <section className="grid lg:grid-cols-[1.2fr_1fr] gap-4 sm:gap-5">
            {/* SHARE CARD */}
            <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-pink-500 via-pink-600 to-rose-700 text-white p-5 sm:p-6 shadow-2xl shadow-pink-500/30 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-amber-400/30 blur-2xl pointer-events-none animate-pulse" />
              <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-white/20 blur-2xl pointer-events-none" />

              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border border-white/30 mb-2">
                      <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                      Your Referral Code
                    </div>
                    <h3 className="text-xl font-extrabold">Share & Earn</h3>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg">
                    <Gift className="h-6 w-6" />
                  </div>
                </div>

                {/* Code display */}
                <div className="rounded-2xl bg-white/15 backdrop-blur-md border border-white/30 p-5 mb-3 shadow-lg">
                  <div className="text-[10px] uppercase tracking-widest font-extrabold opacity-80 mb-2">Your Code</div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="font-mono text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-widest break-all">
                      {code || '—'}
                    </div>
                    <button
                      onClick={copyCode}
                      className="inline-flex items-center gap-2 rounded-xl bg-white text-pink-700 px-4 py-2 text-sm font-extrabold hover:bg-pink-50 transition shadow-lg"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Share link */}
                <div className="rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-3 mb-4">
                  <div className="text-[10px] uppercase tracking-widest font-extrabold opacity-80 mb-1.5">Share Link</div>
                  <div className="flex items-center gap-2">
                    <div className="font-mono text-[11px] truncate flex-1 bg-white/10 rounded-lg px-2 py-1.5 border border-white/20">
                      {shareUrl}
                    </div>
                    <button
                      onClick={copyLink}
                      className="h-8 w-8 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center transition border border-white/30 shrink-0"
                      title="Copy link"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Share buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={shareWhatsapp}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] hover:bg-[#1ea34f] text-white px-3 py-2.5 text-sm font-extrabold transition shadow-lg"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </button>
                  <button
                    onClick={shareEmail}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3 py-2.5 text-sm font-extrabold transition shadow-lg"
                  >
                    <Mail className="h-4 w-4" />
                    <span className="hidden sm:inline">Email</span>
                  </button>
                  <button
                    onClick={nativeShare}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-3 py-2.5 text-sm font-extrabold transition shadow-lg"
                  >
                    <Share2 className="h-4 w-4" />
                    <span className="hidden sm:inline">More</span>
                  </button>
                </div>

                {/* Reward info */}
                <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[9px] uppercase tracking-wider font-extrabold opacity-80">Reward</div>
                    <div className="text-base sm:text-lg font-extrabold mt-0.5 tabular-nums">
                      Rs {safeData.stats.rewardAmount}
                    </div>
                    <div className="text-[9px] font-bold opacity-80">minimum</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider font-extrabold opacity-80">Bonus</div>
                    <div className="text-base sm:text-lg font-extrabold mt-0.5 tabular-nums">
                      {safeData.stats.rewardPercentage}%
                    </div>
                    <div className="text-[9px] font-bold opacity-80">of sale</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-wider font-extrabold opacity-80">Earned</div>
                    <div className="text-base sm:text-lg font-extrabold mt-0.5 tabular-nums text-amber-300">
                      {formatPKR(safeData.stats.totalEarned)}
                    </div>
                    <div className="text-[9px] font-bold opacity-80">lifetime</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Status pie chart */}
            <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Status Breakdown</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Referral lifecycle stages</p>
                </div>
                <Filter className="h-5 w-5 text-pink-500 dark:text-pink-400" />
              </div>
              {statusBreakdown.length > 0 ? (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusBreakdown}
                        cx="50%" cy="45%" outerRadius={90} innerRadius={50}
                        dataKey="value"
                        label={(entry: any) => `${entry.value}`}
                        labelLine={false}
                      >
                        {statusBreakdown.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                      <Legend wrapperStyle={{ fontSize: 10, paddingTop: 12 }} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[260px] flex flex-col items-center justify-center text-center gap-2">
                  <div className="h-14 w-14 rounded-2xl bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center">
                    <Users className="h-7 w-7 text-pink-400 dark:text-pink-300" />
                  </div>
                  <p className="text-sm font-extrabold text-slate-700 dark:text-slate-200">Abhi koi referral nahi</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Code share karo — earning start karo!</p>
                </div>
              )}
            </div>
          </section>

          {/* 30-day trend */}
          <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">30-Day Trend</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Daily signups & earnings pattern</p>
              </div>
              <BarChart3 className="h-5 w-5 text-pink-500 dark:text-pink-400" />
            </div>
            {trendData.some((d) => d.count > 0) ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="refGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ec4899" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#ec4899" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={10} interval={3} />
                    <YAxis yAxisId="left" stroke="#64748b" fontSize={11} />
                    <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }}
                      formatter={(value: any, name: any) => name === 'Earned' ? formatPKR(Number(value)) : value}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area yAxisId="left" type="monotone" dataKey="count" name="Referrals" fill="url(#refGrad)" stroke="#ec4899" strokeWidth={2.5} />
                    <Area yAxisId="right" type="monotone" dataKey="earned" name="Earned" fill="url(#earnGrad)" stroke="#f59e0b" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[280px] flex flex-col items-center justify-center text-center gap-2">
                <div className="h-14 w-14 rounded-2xl bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center">
                  <TrendingUp className="h-7 w-7 text-pink-400 dark:text-pink-300" />
                </div>
                <p className="text-sm font-extrabold text-slate-700 dark:text-slate-200">Last 30 days me koi referral nahi</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Code share karo — activity track hogi</p>
              </div>
            )}
          </section>

          {/* How it works + Recent activity */}
          <section className="grid lg:grid-cols-2 gap-4 sm:gap-5">
            {/* How it works */}
            <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-violet-50 via-pink-50 to-amber-50 dark:from-violet-500/10 dark:via-pink-500/10 dark:to-amber-500/10 border-2 border-pink-200 dark:border-pink-500/30 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  <h3 className="font-extrabold text-pink-900 dark:text-pink-200 text-lg">How It Works</h3>
                </div>
                <button
                  onClick={() => setShowTeacher(true)}
                  className="text-xs font-extrabold text-pink-700 dark:text-pink-400 hover:underline inline-flex items-center gap-1"
                >
                  <GraduationCap className="h-3.5 w-3.5" /> Full guide
                </button>
              </div>

              <div className="space-y-3">
                {[
                  { num: '1', title: 'Share Your Code', desc: 'Dosto, family, business owners ko WhatsApp/email pe bhejein', color: 'from-pink-500 to-rose-600', icon: Share2 },
                  { num: '2', title: 'They Sign Up',    desc: 'Woh aap ke code se signup karke trial start karein',       color: 'from-violet-500 to-purple-600', icon: Users },
                  { num: '3', title: 'They Subscribe',  desc: 'Trial khatam hone par jab paid plan choose karein',       color: 'from-blue-500 to-indigo-600', icon: Banknote },
                  { num: '4', title: 'You Earn!',       desc: `Rs ${safeData.stats.rewardAmount}+ ya ${safeData.stats.rewardPercentage}% — jo zyada — aap ke account me add`, color: 'from-emerald-500 to-green-600', icon: Award },
                ].map((step) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.num} className="rounded-2xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-md border-2 border-white dark:border-slate-700 shadow-sm p-3 flex items-start gap-3">
                      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${step.color} text-white flex items-center justify-center font-extrabold text-base shadow-md shrink-0`}>
                        {step.num}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-slate-900 dark:text-white inline-flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5" />
                          {step.title}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-semibold leading-snug">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent activity */}
            <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800 bg-gradient-to-br from-slate-50/80 to-white dark:from-slate-800/40 dark:to-slate-900/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white">Recent Activity</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Latest events</p>
                  </div>
                </div>
              </div>

              {recentActivity.length === 0 ? (
                <div className="p-8 text-center">
                  <Activity className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-extrabold text-slate-700 dark:text-slate-200">Abhi koi activity nahi</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">Code share karna shuru karo!</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[400px] overflow-y-auto">
                  {recentActivity.map((item: any, idx) => {
                    const isReferral = item.type === 'referral';
                    const statusCfg = isReferral ? statusConfig[item.status] : null;
                    const Icon = isReferral ? (statusCfg?.icon || Users) : Wallet;
                    const isPositive = !isReferral && item.amount > 0;
                    return (
                      <div key={idx} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isReferral
                            ? `${statusCfg?.bg} ${statusCfg?.text} ${statusCfg?.darkBg} ${statusCfg?.darkText}`
                            : isPositive
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-extrabold text-slate-900 dark:text-white text-sm truncate">{item.title}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">{formatRelative(item.date)}</div>
                        </div>
                        <div className="text-right shrink-0">
                          {isReferral ? (
                            <>
                              {statusCfg && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold ${statusCfg.bg} ${statusCfg.text} ${statusCfg.darkBg} ${statusCfg.darkText}`}>
                                  {statusCfg.label}
                                </span>
                              )}
                              {item.amount > 0 && (
                                <div className="text-xs text-emerald-700 dark:text-emerald-400 font-extrabold mt-0.5 tabular-nums">
                                  +{formatPKR(item.amount)}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className={`font-extrabold text-sm tabular-nums ${isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                              {isPositive ? '+' : ''}{formatPKR(item.amount)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* ═══ REFERRALS TAB ═══ */}
      {tab === 'referrals' && (
        <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-5 border-b-2 border-slate-100 dark:border-slate-800 space-y-3 bg-gradient-to-br from-slate-50/50 to-white dark:from-slate-800/40 dark:to-slate-900/60">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">All Referrals</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  {filteredReferrals.length} of {safeData.referrals.length}
                  {hasFilters && <span className="ml-1 font-extrabold text-pink-700 dark:text-pink-400">• filtered</span>}
                </p>
              </div>
              {filteredReferrals.length > 0 && (
                <button
                  onClick={exportReferrals}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-pink-300 dark:hover:border-pink-500/50 px-3 py-2 text-xs font-extrabold text-slate-700 dark:text-slate-300 transition"
                >
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </button>
              )}
            </div>

            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchRef}
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition shadow-sm"
                placeholder="Referee name dhundo... (/)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>

            <div className="flex gap-1 flex-wrap items-center">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-extrabold mr-1">Status:</span>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition ${
                  statusFilter === 'all' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                All
              </button>
              {(Object.entries(statusConfig)).map(([key, cfg]) => {
                const count = safeData.referrals.filter((r: any) => r.status === key).length;
                if (count === 0) return null;
                return (
                  <button
                    key={key}
                    onClick={() => setStatusFilter(key as StatusFilter)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition inline-flex items-center gap-1 ${
                      statusFilter === key
                        ? `${cfg.bg} ${cfg.text} ${cfg.darkBg} ${cfg.darkText} ring-2 ring-pink-200 dark:ring-pink-500/40`
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    <cfg.icon className="h-2.5 w-2.5" />
                    {cfg.label}
                    <span className="px-1 rounded-full text-[9px] bg-white/30 dark:bg-black/20">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {filteredReferrals.length === 0 ? (
            <div className="p-12 sm:p-16 text-center">
              <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-pink-100 to-rose-200 dark:from-pink-500/20 dark:to-rose-500/20 flex items-center justify-center shadow-inner">
                <Users className="h-9 w-9 text-pink-600 dark:text-pink-400" />
              </div>
              <h4 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
                {hasFilters ? 'Kuch nahi mila' : 'Abhi koi referral nahi'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-semibold">
                {hasFilters ? 'Filter change karo' : 'Code share karo — earning start karo!'}
              </p>
              {!hasFilters && (
                <button
                  onClick={shareWhatsapp}
                  className="mt-4 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white text-sm font-extrabold transition shadow-lg shadow-pink-500/30 inline-flex items-center gap-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  Share via WhatsApp
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
              {filteredReferrals.map((r: any) => {
                const statusCfg = statusConfig[r.status];
                const StatusIcon = statusCfg?.icon || Clock;
                return (
                  <div key={r.id} className="px-5 sm:px-6 py-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center font-extrabold shadow-lg ring-2 ring-white dark:ring-slate-900 text-base shrink-0">
                        {r.referee?.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-slate-900 dark:text-white truncate">{r.referee?.name || 'Unknown'}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-2 flex-wrap mt-0.5">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(r.createdAt)}
                          </span>
                          <span className="opacity-50">•</span>
                          <span className="text-slate-400 dark:text-slate-500">{formatRelative(r.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${statusCfg?.bg} ${statusCfg?.text} ${statusCfg?.darkBg} ${statusCfg?.darkText}`}>
                        <StatusIcon className="h-2.5 w-2.5" />
                        {statusCfg?.label}
                      </span>
                      {r.rewardAmount > 0 && (
                        <div className="text-sm text-emerald-700 dark:text-emerald-400 font-extrabold mt-1 tabular-nums inline-flex items-center gap-0.5">
                          <ArrowUpRight className="h-3 w-3" />
                          {formatPKR(r.rewardAmount)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ═══ CREDITS TAB ═══ */}
      {tab === 'credits' && (
        <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-5 border-b-2 border-slate-100 dark:border-slate-800 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-500/10 dark:to-slate-900/60 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Credit History
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                Current balance: <strong className="text-emerald-700 dark:text-emerald-400">{formatPKR(safeData.stats.currentCredit)}</strong>
              </p>
            </div>
          </div>

          {safeData.credits.length === 0 ? (
            <div className="p-12 sm:p-16 text-center">
              <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-green-200 dark:from-emerald-500/20 dark:to-green-500/20 flex items-center justify-center shadow-inner">
                <Wallet className="h-9 w-9 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h4 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">Abhi koi credit nahi</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-semibold">
                Refer karo aur credits earn karo!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
              {safeData.credits.map((c: any) => {
                const isPositive = c.amount > 0;
                return (
                  <div key={c.id} className="px-5 sm:px-6 py-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isPositive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                      }`}>
                        {isPositive ? <ArrowDownRight className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-slate-900 dark:text-white text-sm truncate">{c.note || c.type}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">{formatDateTime(c.createdAt)}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-extrabold text-base tabular-nums ${isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                        {isPositive ? '+' : ''}{formatPKR(c.amount)}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                        Balance: <span className="font-extrabold">{formatPKR(c.balanceAfter)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

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
   REFERRALS TEACHER — Universal referral marketing guide
   ═════════════════════════════════════════════════════════════ */
function ReferralsTeacher({ onClose, rewardAmount, rewardPercentage }: { onClose: () => void; rewardAmount: number; rewardPercentage: number }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-pink-300 dark:border-pink-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-pink-200 dark:border-pink-500/30 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-500/15 dark:to-rose-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-pink-900 dark:text-pink-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Referral Program — Guide
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            <strong>Referral marketing = free advertising jo aap ko paise deta hai.</strong> Word-of-mouth se aya customer 4× zyada loyal hota hai, aur 25% zyada spend karta hai (BCG study).
          </p>

          {/* Achievement System */}
          <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/5 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-700 dark:text-amber-300 flex items-center gap-1">
              <Trophy className="h-3 w-3" /> Achievement System
            </div>
            <div className="space-y-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
              {[
                { emoji: '🌱', label: 'Beginner', min: 0 },
                { emoji: '🥉', label: 'Bronze', min: 1 },
                { emoji: '🥈', label: 'Silver', min: 5 },
                { emoji: '🥇', label: 'Gold', min: 10 },
                { emoji: '🏆', label: 'Platinum', min: 25 },
                { emoji: '💎', label: 'Diamond', min: 50 },
              ].map((t) => (
                <div key={t.label} className="flex items-center justify-between rounded-lg bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-500/30 px-2.5 py-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="text-lg">{t.emoji}</span>
                    <strong>{t.label}</strong>
                  </span>
                  <span className="font-mono text-[11px] text-amber-700 dark:text-amber-400 font-extrabold">
                    {t.min}+ conversions
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Reward Structure */}
          <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/5 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
              <Banknote className="h-3 w-3" /> Reward — Kaise Milta Hai
            </div>
            <div className="rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-500/30 p-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
              💰 Per conversion: <strong>Rs {rewardAmount}</strong> minimum <em>ya</em> <strong>{rewardPercentage}%</strong> of unke first sale — <strong>jo bhi zyada ho</strong>.
            </div>
            <div className="rounded-lg bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 p-2 text-xs font-extrabold text-emerald-800 dark:text-emerald-200">
              Example: Friend Rs 5000 ka plan liya → Aap ko max(Rs {rewardAmount}, Rs {Math.round(5000 * rewardPercentage / 100)}) milega!
            </div>
          </div>

          {/* Best Practices */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>🎯 Target audience</strong> — Shop owners, chhote businesses, freelancers. Random logon ko mat bhejo — waste hai.</TipRow>
            <TipRow><strong>💬 WhatsApp groups</strong> — Business groups, trader associations, market unions me share karo. Ek group = 50+ potential leads.</TipRow>
            <TipRow><strong>📱 Personal touch</strong> — "Try karo" ki jagah "Mein use karta hoon, meri sales badh gayi" — proof do.</TipRow>
            <TipRow><strong>🔥 Pending → Signed Up → Converted → Paid</strong> — funnel samjho. Har stage pe follow-up karo.</TipRow>
            <TipRow><strong>⏰ 7-day follow-up</strong> — Trial signup ke 5-7 din baad message: "Kaisa laga? Koi help chahiye?"</TipRow>
            <TipRow><strong>📊 Conversion rate</strong> — 20%+ good, 40%+ excellent. Kam ho to messaging improve karo.</TipRow>
            <TipRow><strong>💎 Diamond target</strong> — 50 conversions/year = passive income stream ban jata hai.</TipRow>
          </div>

          <div className="rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30 p-3 text-xs font-semibold text-violet-800 dark:text-violet-200">
            💡 <strong>Pro tip:</strong> WhatsApp status pe daily 1 screenshot daalo — "Aaj Rs {rewardAmount} kamaya Nafaa referrals se!" Log khud puchenge kaise. Yehi hai social proof ka power. 🚀
          </div>

          <Button
            className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 font-extrabold shadow-lg shadow-pink-500/40 h-12"
            onClick={onClose}
          >
            <Rocket className="h-4 w-4" /> Samajh Gaya — Share Karo!
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

function StatCard({ label, value, sub, icon: Icon, color, isText, isHighlight }: any) {
  const colors: any = {
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/30',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
    emerald: 'from-emerald-500 to-green-600 shadow-emerald-500/30',
  };
  return (
    <div className={`rounded-2xl border-2 p-3 sm:p-4 shadow-sm hover:shadow-md transition ${
      isHighlight
        ? 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10 border-emerald-300 dark:border-emerald-500/40'
        : 'bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-slate-200 dark:border-slate-800'
    }`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-extrabold">{label}</div>
          <div className={`mt-1.5 font-extrabold text-slate-900 dark:text-white tabular-nums truncate ${isText ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'}`}>
            {value}
          </div>
          {sub && <div className="text-[10px] text-slate-600 dark:text-slate-400 font-bold mt-0.5 truncate">{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
