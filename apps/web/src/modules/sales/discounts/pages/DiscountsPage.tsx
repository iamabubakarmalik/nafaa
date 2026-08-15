import { useState, useMemo, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Tag, Plus, Trash2, ToggleLeft, ToggleRight, Percent, DollarSign,
  Calendar, Copy, CheckCircle2, AlertTriangle, Sparkles, TrendingUp,
  Clock, Search, X, Gift, GraduationCap, Printer, Download,
  RefreshCw, Zap,
} from 'lucide-react';
import { discountsApi, type DiscountType } from '@modules/sales/discounts/api/discounts.api';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';

/* ═════════════════════════════════════════════════════════════
   NAFAA DISCOUNTS — GLOBAL FULL BEST v3
   ─────────────────────────────────────────────────────────────
   🌍 GLOBAL — har industry ka discount system same
   🌙 Dark mode complete
   🎓 Teacher modal — Percentage vs Fixed, use cases
   ⌨️  / = search • N = code field focus • Esc = teacher band
   📋 Quick presets — Eid/Sale/First Order 1-click
   ⚠️ Smart delete — used code pe warning
   🖨️ Print + 📊 CSV • 👁️ Live preview
   ═════════════════════════════════════════════════════════════ */

type Filter = 'all' | 'active' | 'expired' | 'limit-reached';

const QUICK_PRESETS = [
  { code: 'EID2026', desc: 'Eid special', type: 'PERCENTAGE' as DiscountType, value: '20', minPurchase: '1000', emoji: '🌙' },
  { code: 'SALE10', desc: '10% off everything', type: 'PERCENTAGE' as DiscountType, value: '10', emoji: '🏷️' },
  { code: 'NEW500', desc: 'First order Rs 500 off', type: 'FIXED_AMOUNT' as DiscountType, value: '500', minPurchase: '2000', usageLimit: '1', emoji: '🎉' },
  { code: 'BULK15', desc: 'Bulk buy 15% off', type: 'PERCENTAGE' as DiscountType, value: '15', minPurchase: '5000', emoji: '📦' },
  { code: 'FLASH50', desc: 'Flash sale 50% off', type: 'PERCENTAGE' as DiscountType, value: '50', maxDiscount: '2000', emoji: '⚡' },
  { code: 'FREESHIP', desc: 'Free delivery Rs 200 off', type: 'FIXED_AMOUNT' as DiscountType, value: '200', emoji: '🚚' },
];

const emptyForm = {
  code: '',
  description: '',
  type: 'PERCENTAGE' as DiscountType,
  value: '',
  minPurchase: '',
  maxDiscount: '',
  usageLimit: '',
  validUntil: '',
};

export default function DiscountsPage() {
  const queryClient = useQueryClient();
  const codeInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [filter, setFilter] = useState<Filter>('active');
  const [search, setSearch] = useState('');
  const [showTeacher, setShowTeacher] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: codes = [], refetch, isRefetching, isLoading } = useQuery({
    queryKey: ['discounts'],
    queryFn: discountsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: discountsApi.create,
    onSuccess: () => {
      toast.success(`Code "${form.code}" ban gaya`);
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Create nahi hua'),
  });

  const toggleMutation = useMutation({
    mutationFn: discountsApi.toggle,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discounts'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: discountsApi.remove,
    onSuccess: () => {
      toast.success('Delete ho gaya');
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete nahi hua'),
  });

  const filteredCodes = useMemo(() => {
    let result = [...codes];
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter((c) => c.code.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q));
    }
    const now = new Date();
    if (filter === 'active') {
      result = result.filter((c) => {
        const expired = c.validUntil && new Date(c.validUntil) < now;
        const limitReached = c.usageLimit && c.usageCount >= c.usageLimit;
        return c.isActive && !expired && !limitReached;
      });
    } else if (filter === 'expired') {
      result = result.filter((c) => c.validUntil && new Date(c.validUntil) < now);
    } else if (filter === 'limit-reached') {
      result = result.filter((c) => c.usageLimit && c.usageCount >= c.usageLimit);
    }
    return result;
  }, [codes, search, filter]);

  const stats = useMemo(() => {
    const now = new Date();
    const active = codes.filter((c) => {
      const expired = c.validUntil && new Date(c.validUntil) < now;
      const limitReached = c.usageLimit && c.usageCount >= c.usageLimit;
      return c.isActive && !expired && !limitReached;
    });
    const expired = codes.filter((c) => c.validUntil && new Date(c.validUntil) < now);
    const limitReached = codes.filter((c) => c.usageLimit && c.usageCount >= c.usageLimit);
    const totalUsed = codes.reduce((s, c) => s + c.usageCount, 0);
    return { total: codes.length, active: active.length, expired: expired.length, limitReached: limitReached.length, totalUsed };
  }, [codes]);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`"${code}" copy ho gaya`);
  };

  const applyPreset = (p: typeof QUICK_PRESETS[number]) => {
    setForm({
      code: p.code,
      description: p.desc,
      type: p.type,
      value: p.value,
      minPurchase: p.minPurchase || '',
      maxDiscount: p.maxDiscount || '',
      usageLimit: p.usageLimit || '',
      validUntil: '',
    });
    codeInputRef.current?.focus();
    toast.success('Preset load ho gaya — edit karke save karo');
  };

  const submit = () => {
    if (!form.code.trim()) { toast.error('Code likhna zaroori hai'); codeInputRef.current?.focus(); return; }
    if (!Number(form.value)) return toast.error('Discount value likho');
    if (form.type === 'PERCENTAGE' && Number(form.value) > 100) return toast.error('Percentage 100 se zyada nahi ho sakta');
    createMutation.mutate({
      code: form.code.trim(),
      description: form.description.trim() || undefined,
      type: form.type,
      value: Number(form.value),
      minPurchase: Number(form.minPurchase || 0),
      maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
      validUntil: form.validUntil || undefined,
    });
  };

  const confirmDelete = (c: any) => {
    const msg = c.usageCount > 0
      ? `⚠️ "${c.code}" ${c.usageCount} baar use ho chuka hai!\n\nDelete karo to purchase records me discount ka reference reh jayega lekin code khud gum ho jayega.\n\nBehtar option: "Inactive" kar do — history bhi rahegi, naya use nahi hoga.\n\nPhir bhi delete karein?`
      : `Code "${c.code}" delete karein?`;
    if (confirm(msg)) deleteMutation.mutate(c.id);
  };

  const exportCSV = () => {
    if (filteredCodes.length === 0) return toast.error('Koi data nahi');
    const summary = [
      ['Discount Codes Report'],
      [`Generated: ${new Date().toLocaleString('en-PK')}  •  Total: ${stats.total}  •  Active: ${stats.active}  •  Used: ${stats.totalUsed}`],
      [''],
    ];
    const headers = ['Code', 'Description', 'Type', 'Value', 'Min Purchase', 'Max Discount', 'Usage', 'Limit', 'Valid Until', 'Active', 'Created'];
    const rows = filteredCodes.map((c) => [
      c.code, c.description || '', c.type,
      c.value, c.minPurchase || 0, c.maxDiscount || '',
      c.usageCount, c.usageLimit || 'Unlimited',
      c.validUntil ? new Date(c.validUntil).toLocaleDateString('en-PK') : 'Never',
      c.isActive ? 'Yes' : 'No',
      c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-PK') : '',
    ]);
    const csv = [...summary, headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `discounts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filteredCodes.length} codes export ho gaye`);
  };

  const getCodeStatus = (c: any) => {
    if (!c.isActive) return { label: 'INACTIVE', tone: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300', icon: ToggleLeft };
    const expired = c.validUntil && new Date(c.validUntil) < new Date();
    if (expired) return { label: 'EXPIRED', tone: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300', icon: Clock };
    if (c.usageLimit && c.usageCount >= c.usageLimit) return { label: 'LIMIT REACHED', tone: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300', icon: AlertTriangle };
    return { label: 'ACTIVE', tone: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300', icon: CheckCircle2 };
  };

  /* Live preview calc */
  const preview = useMemo(() => {
    const val = Number(form.value || 0);
    const min = Number(form.minPurchase || 0);
    const max = Number(form.maxDiscount || 0);
    if (!val) return null;
    const sampleBill = Math.max(min || 1000, 1000);
    let discount = form.type === 'PERCENTAGE' ? (sampleBill * val) / 100 : val;
    if (form.type === 'PERCENTAGE' && max > 0) discount = Math.min(discount, max);
    discount = Math.min(discount, sampleBill);
    return { sampleBill, discount, final: sampleBill - discount };
  }, [form.value, form.type, form.minPurchase, form.maxDiscount]);

  /* Keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTeacher) return setShowTeacher(false);
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === 'n') { e.preventDefault(); codeInputRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = showTeacher ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [showTeacher]);

  const hasFilters = !!search || filter !== 'active';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-4 border-pink-200 dark:border-pink-800 border-t-pink-600 dark:border-t-pink-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <DiscountsTeacher onClose={() => setShowTeacher(false)} />}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 dark:from-slate-950 dark:via-pink-950 dark:to-rose-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-pink-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-rose-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <Tag className="h-3.5 w-3.5 text-amber-300" /> Promo Codes
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">🎁 Discount Codes</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              <strong className="text-emerald-300">{stats.active}</strong> active
              <span className="opacity-50 mx-1.5">•</span>
              <strong className="text-violet-200">{stats.totalUsed}</strong> baar use huye
              {stats.expired > 0 && (<>
                <span className="opacity-50 mx-1.5">•</span>
                <strong className="text-rose-300">{stats.expired}</strong> expire
              </>)}
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
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
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
          <Kbd>/</Kbd><span className="text-white/60">Search</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>N</Kbd><span className="text-white/60">Naya code</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>Esc</Kbd><span className="text-white/60">Band</span>
        </div>
      </section>

      {/* ═══ KPIs ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 print:hidden">
        <Kpi icon={CheckCircle2} tone="emerald" label="Active Codes" value={stats.active} sub="Abhi use ho sakte" />
        <Kpi icon={Tag} tone="slate" label="Total Codes" value={stats.total} sub="Sab banaye huay" />
        <Kpi icon={TrendingUp} tone="violet" label="Times Used" value={stats.totalUsed} sub="Kul redemptions" />
        <Kpi
          icon={Clock} tone="rose" label="Expired" value={stats.expired}
          sub={stats.limitReached > 0 ? `+ ${stats.limitReached} limit-reached` : 'Ab valid nahi'}
          onClick={stats.expired > 0 ? () => setFilter('expired') : undefined}
          active={filter === 'expired'}
        />
      </section>

      {/* ═══ QUICK PRESETS ═══ */}
      <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-pink-50 via-rose-50 to-fuchsia-50 dark:from-pink-500/10 dark:via-rose-500/10 dark:to-fuchsia-500/10 border-2 border-pink-200 dark:border-pink-500/40 p-4 sm:p-5 shadow-sm print:hidden">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center shadow-md">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-pink-900 dark:text-pink-200 text-sm">⚡ Ready-Made Codes</h3>
            <p className="text-[11px] text-pink-700 dark:text-pink-300/80 font-bold">Click karo → form bhar jayega → edit karke save karo</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {QUICK_PRESETS.map((p) => (
            <button
              key={p.code}
              onClick={() => applyPreset(p)}
              className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border-2 border-pink-200 dark:border-pink-500/30 hover:border-pink-400 dark:hover:border-pink-500/60 hover:shadow-lg hover:-translate-y-0.5 transition-all text-left"
            >
              <div className="text-2xl mb-1">{p.emoji}</div>
              <div className="font-mono text-xs font-extrabold text-pink-900 dark:text-pink-200 truncate">{p.code}</div>
              <div className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold truncate">
                {p.type === 'PERCENTAGE' ? `${p.value}% off` : `Rs ${p.value} off`}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ═══ MAIN GRID ═══ */}
      <section className="grid xl:grid-cols-[420px_1fr] gap-4 sm:gap-5 items-start">
        {/* ═══ CREATE FORM ═══ */}
        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6 xl:sticky xl:top-4 print:hidden">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-700 text-white flex items-center justify-center shadow-lg shadow-pink-500/30 shrink-0">
              <Plus className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Naya Discount Code</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Customer ko promo do</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">Code *</label>
              <input
                ref={codeInputRef}
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-mono font-extrabold uppercase text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 transition"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s/g, '') })}
                placeholder="EID2026"
                maxLength={20}
              />
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                Customer POS pe type karega — chhota + yaad rakhne wala rakho
              </div>
            </div>

            <div>
              <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
              <input
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 transition"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Eid special discount"
              />
            </div>

            <div>
              <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">Discount Type *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: 'PERCENTAGE' })}
                  className={`p-3 rounded-xl border-2 transition flex items-center justify-center gap-2 ${
                    form.type === 'PERCENTAGE'
                      ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/15 text-pink-700 dark:text-pink-300 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-pink-300 dark:hover:border-pink-500/50'
                  }`}
                >
                  <Percent className="h-4 w-4" />
                  <span className="font-extrabold text-sm">%</span>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: 'FIXED_AMOUNT' })}
                  className={`p-3 rounded-xl border-2 transition flex items-center justify-center gap-2 ${
                    form.type === 'FIXED_AMOUNT'
                      ? 'border-pink-500 bg-pink-50 dark:bg-pink-500/15 text-pink-700 dark:text-pink-300 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-pink-300 dark:hover:border-pink-500/50'
                  }`}
                >
                  <DollarSign className="h-4 w-4" />
                  <span className="font-extrabold text-sm">Fixed Rs</span>
                </button>
              </div>
            </div>

            <Input
              label={form.type === 'PERCENTAGE' ? 'Percentage (0-100) *' : 'Amount (PKR) *'}
              type="number"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              placeholder={form.type === 'PERCENTAGE' ? '20' : '500'}
            />

            <Input
              label="Min Purchase (PKR)"
              type="number"
              value={form.minPurchase}
              onChange={(e) => setForm({ ...form, minPurchase: e.target.value })}
              placeholder="0"
              hint="0 = koi minimum nahi"
            />

            {form.type === 'PERCENTAGE' && (
              <Input
                label="Max Discount Cap"
                type="number"
                value={form.maxDiscount}
                onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                placeholder="1000"
                hint="Optional ceiling — bara bill par bhi ye se zyada discount nahi"
              />
            )}

            <Input
              label="Usage Limit"
              type="number"
              value={form.usageLimit}
              onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
              placeholder="100"
              hint="Khaali = unlimited"
            />

            <Input
              label="Valid Until"
              type="date"
              value={form.validUntil}
              onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
              hint="Khaali = kabhi expire nahi"
            />

            {/* Live Preview */}
            {preview && (
              <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-500/10 dark:to-slate-800/30 border-2 border-emerald-200 dark:border-emerald-500/40 p-3">
                <div className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-extrabold mb-2 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Live Preview
                </div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 space-y-1">
                  <div className="flex justify-between">
                    <span>Sample bill:</span>
                    <span className="font-extrabold tabular-nums">{formatPKR(preview.sampleBill)}</span>
                  </div>
                  <div className="flex justify-between text-pink-700 dark:text-pink-400">
                    <span>− Discount:</span>
                    <span className="font-extrabold tabular-nums">− {formatPKR(preview.discount)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400 pt-1 border-t border-emerald-200 dark:border-emerald-500/30">
                    <span className="font-extrabold">Customer paid:</span>
                    <span className="font-extrabold tabular-nums text-base">{formatPKR(preview.final)}</span>
                  </div>
                </div>
              </div>
            )}

            <Button
              className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 font-extrabold shadow-lg shadow-pink-500/30"
              size="lg"
              loading={createMutation.isPending}
              onClick={submit}
            >
              <Sparkles className="h-4 w-4" /> Create Discount Code
            </Button>
          </div>
        </div>

        {/* ═══ CODES LIST ═══ */}
        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Sab Codes ({filteredCodes.length})</h3>
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Code dhundo... (/)"
                  className="h-9 w-56 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-pink-500 transition"
                />
              </div>
            </div>
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 flex-wrap">
              {([
                { v: 'active' as Filter, l: '✓ Active', c: stats.active },
                { v: 'all' as Filter, l: 'Sab', c: stats.total },
                { v: 'expired' as Filter, l: '⏰ Expired', c: stats.expired },
                { v: 'limit-reached' as Filter, l: '⚠️ Limit', c: stats.limitReached },
              ]).map((o) => (
                <button
                  key={o.v}
                  onClick={() => setFilter(o.v)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-extrabold transition ${
                    filter === o.v ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {o.l} <span className={`ml-0.5 tabular-nums ${filter === o.v ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'}`}>{o.c}</span>
                </button>
              ))}
            </div>
          </div>

          {filteredCodes.length === 0 ? (
            <div className="p-12 sm:p-16 text-center">
              <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-pink-100 to-rose-200 dark:from-pink-500/20 dark:to-rose-500/20 flex items-center justify-center">
                <Gift className="h-9 w-9 text-pink-600 dark:text-pink-400" />
              </div>
              <h4 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
                {hasFilters ? 'Kuch nahi mila' : 'Abhi koi code nahi'}
              </h4>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 font-semibold max-w-md mx-auto">
                {hasFilters
                  ? 'Filter change kar ke dekho'
                  : 'Left side se naya code banao — ya upar wale ready-made presets me se koi choose karo (Eid, Sale, etc.)'}
              </p>
              {hasFilters && (
                <Button variant="secondary" className="mt-4" onClick={() => { setSearch(''); setFilter('active'); }}>
                  <X className="h-4 w-4" /> Filter hatao
                </Button>
              )}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 p-5 sm:p-6">
              {filteredCodes.map((c) => {
                const status = getCodeStatus(c);
                const StatusIcon = status.icon;
                const usagePct = c.usageLimit ? (c.usageCount / c.usageLimit) * 100 : 0;
                const expired = status.label === 'EXPIRED';
                const limitReached = status.label === 'LIMIT REACHED';
                return (
                  <div
                    key={c.id}
                    className={`rounded-2xl border-2 overflow-hidden transition ${
                      !c.isActive
                        ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 opacity-70'
                        : expired
                          ? 'border-rose-200 dark:border-rose-500/40 bg-rose-50/30 dark:bg-rose-500/5'
                          : limitReached
                            ? 'border-amber-200 dark:border-amber-500/40 bg-amber-50/30 dark:bg-amber-500/5'
                            : 'border-pink-200 dark:border-pink-500/40 bg-gradient-to-br from-pink-50 to-white dark:from-pink-500/10 dark:to-slate-900/60'
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0 flex-1">
                          <button
                            onClick={() => copyCode(c.code)}
                            className="font-mono text-lg font-extrabold text-slate-900 dark:text-white hover:text-pink-700 dark:hover:text-pink-400 transition inline-flex items-center gap-1.5 group"
                          >
                            {c.code}
                            <Copy className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition" />
                          </button>
                          {c.description && <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-0.5 line-clamp-2">{c.description}</div>}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold mt-2 ${status.tone}`}>
                            <StatusIcon className="h-2.5 w-2.5" />
                            {status.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => toggleMutation.mutate(c.id)}
                            className="text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-lg p-1.5 transition"
                            title={c.isActive ? 'Band karo' : 'Active karo'}
                          >
                            {c.isActive
                              ? <ToggleRight className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                              : <ToggleLeft className="h-5 w-5 text-slate-400 dark:text-slate-500" />}
                          </button>
                          <button
                            onClick={() => confirmDelete(c)}
                            className="text-rose-600 dark:text-rose-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg p-1.5 transition"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-extrabold">Discount</div>
                          <div className="font-extrabold text-pink-700 dark:text-pink-400 text-lg tabular-nums">
                            {c.type === 'PERCENTAGE' ? `${c.value}%` : formatPKR(c.value)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-extrabold">Min Order</div>
                          <div className="font-extrabold text-slate-700 dark:text-slate-300 tabular-nums">
                            {c.minPurchase > 0 ? formatPKR(c.minPurchase) : 'No min'}
                          </div>
                        </div>
                      </div>

                      {c.usageLimit ? (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                            <span className="font-extrabold">Usage: {c.usageCount} / {c.usageLimit}</span>
                            <span className="font-extrabold tabular-nums">{usagePct.toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                usagePct >= 100 ? 'bg-rose-500' : usagePct >= 80 ? 'bg-amber-500' : 'bg-pink-500'
                              }`}
                              style={{ width: `${Math.min(usagePct, 100)}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                          <span className="font-extrabold">Used: {c.usageCount}</span> • Unlimited
                        </div>
                      )}

                      {c.validUntil && (
                        <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                          <Calendar className="h-3 w-3" />
                          Expires: <span className="font-extrabold">{new Date(c.validUntil).toLocaleDateString('en-PK')}</span>
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
   DISCOUNTS TEACHER — Universal guide
   ═════════════════════════════════════════════════════════════ */
function DiscountsTeacher({ onClose }: { onClose: () => void }) {
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
            <GraduationCap className="h-5 w-5" /> Discount Codes — Guide
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            <strong>Discount code = promo password</strong> jo customer POS pe type kare aur usse bill kam ho jaye.
            Eid pe "EID2026", sale pe "SALE10" — ye tumhari marketing tool hai.
          </p>

          {/* Percentage vs Fixed */}
          <div className="rounded-2xl border-2 border-pink-200 dark:border-pink-500/30 bg-pink-50/60 dark:bg-pink-500/5 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-pink-700 dark:text-pink-300">
              🎯 Percentage vs Fixed — Kaunsa Behtar?
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-pink-200 dark:border-pink-500/30 p-2">
                📊 <strong>Percentage (%)</strong> — "10% off". Bara bill = bara discount. Bulk buyers ko attract karta hai. <strong>Max Cap</strong> lagao warna 50k ke bill pe bahut bara nuksan.
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-pink-200 dark:border-pink-500/30 p-2">
                💵 <strong>Fixed Rs</strong> — "Rs 500 off". Har bill pe same. Small purchases ke liye better. <strong>Min Purchase</strong> lagao warna Rs 100 ke bill pe bhi Rs 500 chala jayega!
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>⚡ Presets</strong> — Eid, Sale, First Order etc. click karo → form bhar jayega</TipRow>
            <TipRow><strong>Min Purchase</strong> — chhota bill me discount nahi lagega (Rs 1000+ pe hi)</TipRow>
            <TipRow><strong>Max Cap</strong> — percentage me zaroori (10% × 50k = Rs 5000 loss se bachao)</TipRow>
            <TipRow><strong>Usage Limit</strong> — "First 100 customers only" wala offer</TipRow>
            <TipRow><strong>Valid Until</strong> — expiry set karo, phir auto-band</TipRow>
            <TipRow><strong>👁️ Live Preview</strong> — sample bill pe kya banega, dikhata hai</TipRow>
            <TipRow><strong>Toggle vs Delete</strong> — used code delete mat karo, "OFF" kar do (history rahegi)</TipRow>
          </div>

          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-3 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
            💡 <strong>Pro tip:</strong> "EID2026" jaisa code social media pe post karo, WhatsApp status pe daalo — customer POS pe bataye ga, aur tumhari sales barh jayegi!
          </div>

          <Button
            className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 font-extrabold shadow-lg shadow-pink-500/40 h-12"
            onClick={onClose}
          >
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya — Code Banao!
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

function Kpi({ icon: Icon, label, value, sub, tone, onClick, active }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/40',
    slate: 'from-slate-700 to-slate-900 shadow-slate-500/40',
    violet: 'from-violet-500 to-purple-700 shadow-violet-500/40',
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/40',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={[
        'rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 p-3 sm:p-4 shadow-sm text-left w-full transition-all',
        onClick ? 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer' : '',
        active
          ? 'border-pink-500 dark:border-pink-500/60 ring-2 ring-pink-200 dark:ring-pink-500/20'
          : 'border-slate-200 dark:border-slate-800',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-extrabold">{label}</div>
          <div className="mt-1.5 text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 truncate">{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Comp>
  );
}
