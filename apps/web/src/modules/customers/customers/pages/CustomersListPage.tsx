import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, Star, Phone, MapPin, TrendingUp, Wallet,
  Crown, SlidersHorizontal, Trash2, Edit3, X, Eye, Sparkles,
  MessageCircle, Mail, Download, GraduationCap, CheckCircle2,
  AlertTriangle, RefreshCw, Printer, ChevronLeft, ChevronRight,
  CreditCard, CalendarDays,
} from 'lucide-react';
import { customersApi, type CustomersListParams } from '@modules/customers/customers/api/customers.api';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   NAFAA CUSTOMERS LIST — FULL BEST v4
   ─────────────────────────────────────────────────────────────
   👑 VIP / loyalty / CNIC / avatar / city-area (existing API)
   🎓 Teacher modal • 🌙 Dark mode complete
   💬 Smart WhatsApp (udhaar reminder vs thank-you)
   🗑️  Delete confirm modal • 📥 CSV + 🖨️ Print
   ⌨️  / = search, Esc = band • 💀 Loading skeletons
   ═════════════════════════════════════════════════════════════ */

export default function CustomersListPage() {
  const queryClient = useQueryClient();
  const tenantName = useAuthStore((s) => s.tenant?.name) || 'Meri Dukaan';
  const searchRef = useRef<HTMLInputElement>(null);

  const [params, setParams] = useState<CustomersListParams>({
    search: '',
    page: 1,
    limit: 24,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [searchInput, setSearchInput] = useState('');

  /* Debounced search → params */
  useEffect(() => {
    const t = setTimeout(() => {
      setParams((p) => ({ ...p, search: searchInput.trim(), page: 1 }));
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => customersApi.list(params),
  });

  const { data: stats } = useQuery({
    queryKey: ['customers-stats'],
    queryFn: customersApi.stats,
  });

  const removeMutation = useMutation({
    mutationFn: customersApi.remove,
    onSuccess: () => {
      toast.success('Customer delete ho gaya');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete fail — sales history ho sakti hai'),
  });

  const items: any[] = data?.items ?? [];
  const hasFilters = !!(params.search || params.isVip !== undefined || params.hasCredit !== undefined || params.city);

  /* ─── Smart WhatsApp ─── */
  const whatsappCustomer = (c: any, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!c.phone) return toast.error('Phone number nahi hai');
    const digits = String(c.phone).replace(/[^0-9]/g, '');
    const phone = digits.startsWith('92') ? digits : digits.startsWith('0') ? '92' + digits.slice(1) : '92' + digits;
    const msg = c.balance > 0
      ? `Assalam-o-Alaikum ${c.name} bhai! 🙏\n\n${tenantName} ki taraf se — aap ka *Rs ${Number(c.balance).toLocaleString('en-PK')}* udhaar baqi hai. Jab moqa mile ada kar dein. Shukriya! 😊`
      : `Assalam-o-Alaikum ${c.name} bhai! 🙏\n\n${tenantName} ki taraf se shukriya aap ki shopping ka. Phir tashreef layein! 😊`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  /* ─── CSV Export ─── */
  const exportCSV = () => {
    if (items.length === 0) return toast.error('Koi data nahi');
    const summary = [
      [`Customers Report — ${tenantName}`],
      [`Generated: ${new Date().toLocaleString('en-PK')}`],
      stats
        ? [`Total: ${stats.total}  •  VIP: ${stats.vip}  •  Khata walay: ${stats.withCredit}  •  Total khata: ${Number(stats.totalDebt).toFixed(2)}`]
        : [],
      [''],
    ].filter((r) => r.length > 0);
    const headers = ['Name', 'Phone', 'Email', 'City', 'Area', 'CNIC', 'VIP', 'Total Spent', 'Balance', 'Loyalty Points', 'Created'];
    const rows = items.map((c) => [
      c.name, c.phone || '', c.email || '', c.city || '', c.area || '', c.cnic || '',
      c.isVip ? 'Yes' : 'No', Number(c.totalSpent).toFixed(2), Number(c.balance).toFixed(2),
      c.loyaltyPoints, new Date(c.createdAt).toLocaleDateString('en-PK'),
    ]);
    const csv = [...summary, headers, ...rows]
      .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${items.length} customers export ho gaye`);
  };

  /* ─── Keyboard shortcuts ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (showTeacher) setShowTeacher(false);
        else if (deleteTarget) setDeleteTarget(null);
        else if (showFilters) setShowFilters(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher, deleteTarget, showFilters]);

  const clearFilters = () => {
    setSearchInput('');
    setParams({ search: '', page: 1, limit: 24, sortBy: 'createdAt', sortOrder: 'desc' });
  };

  const printDate = new Date().toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' });

  return (
    <div className="space-y-4 sm:space-y-5 pb-10 print:space-y-3">
      {/* ═══ MODALS ═══ */}
      {showTeacher && <CustomersTeacher onClose={() => setShowTeacher(false)} />}
      {deleteTarget && (
        <DeleteConfirmModal
          customer={deleteTarget}
          loading={removeMutation.isPending}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => removeMutation.mutate(deleteTarget.id)}
        />
      )}

      {/* ═══ PRINT-ONLY HEADER ═══ */}
      <div className="hidden print:block">
        <div className="flex items-center justify-between border-b-4 border-blue-600 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 leading-tight">👥 {tenantName} — Customers</h1>
            <p className="text-xs text-slate-600 font-semibold mt-1">
              {items.length} customers (page {data?.meta?.page ?? 1})
              {stats ? ` • Total ${stats.total} • VIP ${stats.vip} • Khata ${formatPKR(stats.totalDebt)}` : ''}
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-500">Generated</div>
            <div className="text-xs font-bold text-slate-900">{printDate}</div>
          </div>
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 dark:from-slate-950 dark:via-blue-950 dark:to-cyan-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <Users className="h-3.5 w-3.5 text-amber-300" /> Customer Management
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">👥 Customers</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              {stats && (
                <>
                  <strong className="text-cyan-200">{stats.total}</strong> total
                  <span className="opacity-50 mx-1.5">•</span>
                  <strong className="text-amber-300">👑 {stats.vip}</strong> VIP
                  <span className="opacity-50 mx-1.5">•</span>
                  <strong className="text-rose-300">{stats.withCredit}</strong> khata walay
                  {stats.newThisMonth > 0 && (
                    <>
                      <span className="opacity-50 mx-1.5">•</span>
                      <strong className="text-emerald-300">+{stats.newThisMonth}</strong> is mahine
                    </>
                  )}
                </>
              )}
              {!stats && 'VIP, regular, khata wale — sab gahak ek hi jagah'}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button
              onClick={() => setShowTeacher(true)}
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition"
              title="Guide"
            >
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
            </button>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button onClick={() => window.print()} className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition">
              <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={exportCSV}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition"
            >
              <Download className="h-4 w-4" /> <span className="hidden sm:inline">CSV</span>
            </button>
            <Link to="/customers/new">
              <button className="h-11 px-4 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-2xl transition">
                <Plus className="h-4 w-4" /> Naya Customer
              </button>
            </Link>
          </div>
        </div>

        {/* Keyboard hints */}
        <div className="relative mt-3 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center">
          <Kbd>/</Kbd><span className="text-white/60">Search</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>Esc</Kbd><span className="text-white/60">Band</span>
        </div>
      </section>

      {/* ═══ KPIs ═══ */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3 print:hidden">
        <Kpi icon={Users} label="Total Customers" value={stats?.total ?? 0} sub={stats && stats.newThisMonth > 0 ? `+${stats.newThisMonth} is mahine` : undefined} tone="blue" />
        <Kpi icon={Crown} label="VIP Members" value={stats?.vip ?? 0} sub="Premium tier" tone="amber" />
        <Kpi
          icon={Wallet} label="Total Khata" value={formatPKR(stats?.totalDebt ?? 0)}
          sub={`${stats?.withCredit ?? 0} customers`} tone="rose"
          active={params.hasCredit === true}
          onClick={() => setParams({ ...params, hasCredit: params.hasCredit ? undefined : true, isVip: undefined, page: 1 })}
        />
        <Kpi
          icon={TrendingUp} label="Growth"
          value={`${stats && stats.growthPct >= 0 ? '+' : ''}${stats?.growthPct?.toFixed(1) ?? 0}%`}
          sub="vs last month" tone="emerald"
        />
      </section>

      {/* ═══ TOP SPENDERS ═══ */}
      {stats && stats.topSpenders.length > 0 && (
        <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 p-4 sm:p-5 print:hidden">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h3 className="font-extrabold text-slate-900 dark:text-white">Top Spenders</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            {stats.topSpenders.map((s: any, idx: number) => (
              <Link
                key={s.id}
                to={`/customers/${s.id}`}
                className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3 hover:shadow-md hover:-translate-y-0.5 transition group"
              >
                <div className="flex items-start gap-2.5">
                  <div className="relative shrink-0">
                    {s.avatarUrl ? (
                      <img src={s.avatarUrl} className="h-11 w-11 rounded-full object-cover shadow" alt={s.name} />
                    ) : (
                      <div className="h-11 w-11 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center font-extrabold shadow">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className={`absolute -top-1 -right-1 h-5 w-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow ${
                      idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-orange-500' : 'bg-slate-600'
                    }`}>
                      #{idx + 1}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white text-sm truncate group-hover:text-amber-700 dark:group-hover:text-amber-400 transition">{s.name}</div>
                    <div className="text-xs text-amber-700 dark:text-amber-400 font-extrabold mt-0.5 tabular-nums">{formatPKR(s.totalSpent)}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══ TOOLBAR ═══ */}
      <div className="flex gap-2 flex-wrap print:hidden">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchRef}
            className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/30 transition"
            placeholder="Naam, phone, CNIC, email... (/ shortcut)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button onClick={() => setSearchInput('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition">
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={[
            'h-12 px-4 rounded-2xl border-2 text-xs font-extrabold inline-flex items-center gap-1.5 transition',
            showFilters || hasFilters
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-blue-300',
          ].join(' ')}
        >
          <SlidersHorizontal className="h-4 w-4" /> Filters
          {hasFilters && <span className="h-5 w-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">!</span>}
        </button>
        <div className="hidden sm:flex items-center text-xs font-extrabold text-slate-500 dark:text-slate-400 tabular-nums px-1">
          {data?.meta?.total ?? items.length} customers
        </div>
      </div>

      {/* ═══ FILTERS PANEL ═══ */}
      {showFilters && (
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-3 print:hidden">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Type</label>
              <select
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-extrabold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
                value={params.isVip === true ? 'vip' : params.hasCredit === true ? 'credit' : 'all'}
                onChange={(e) => {
                  const v = e.target.value;
                  setParams({ ...params, isVip: v === 'vip' ? true : undefined, hasCredit: v === 'credit' ? true : undefined, page: 1 });
                }}
              >
                <option value="all">👥 Sab customers</option>
                <option value="vip">👑 Sirf VIP</option>
                <option value="credit">💳 Khata walay (udhaar)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Sort</label>
              <select
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-extrabold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
                value={params.sortBy ?? 'createdAt'}
                onChange={(e) => setParams({ ...params, sortBy: e.target.value as any, page: 1 })}
              >
                <option value="createdAt">🆕 Naye pehle</option>
                <option value="name">🔤 Naam (A-Z)</option>
                <option value="totalSpent">💰 Top spenders</option>
                <option value="balance">⚠️ Sab se zyada udhaar</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">City</label>
              <input
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-extrabold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition"
                placeholder="Lahore, Karachi..."
                value={params.city ?? ''}
                onChange={(e) => setParams({ ...params, city: e.target.value || undefined, page: 1 })}
              />
            </div>
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:text-rose-700 inline-flex items-center gap-1 transition">
              <X className="h-3 w-3" /> Sab filters clear karo
            </button>
          )}
        </div>
      )}

      {/* ═══ LIST ═══ */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-dashed border-slate-300 dark:border-slate-700 p-12 sm:p-16 text-center">
          <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/40">
            <Users className="h-9 w-9 text-white" />
          </div>
          <h3 className="mt-5 text-xl font-extrabold text-slate-900 dark:text-white">
            {hasFilters ? 'Koi customer nahi mila' : 'Abhi koi customer nahi'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mt-2 max-w-md mx-auto">
            {hasFilters
              ? 'Filter change kar ke dekho ya clear karo'
              : 'Apna pehla customer add karo — phir sales, khata, loyalty sab yahan track hogi'}
          </p>
          <div className="mt-5 flex gap-2 justify-center flex-wrap">
            {hasFilters ? (
              <Button variant="secondary" className="font-extrabold" onClick={clearFilters}>
                <X className="h-4 w-4" /> Filters Clear Karo
              </Button>
            ) : (
              <>
                <Button variant="secondary" className="font-extrabold" onClick={() => setShowTeacher(true)}>
                  <GraduationCap className="h-4 w-4" /> Pehle Seekh Lo
                </Button>
                <Link to="/customers/new">
                  <Button className="bg-gradient-to-r from-blue-600 to-cyan-700 font-extrabold shadow-lg shadow-blue-500/40">
                    <Plus className="h-4 w-4" /> Pehla Customer
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {items.map((c) => (
            <div
              key={c.id}
              className={[
                'group rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 shadow-sm dark:shadow-black/20 hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden',
                c.isVip
                  ? 'border-amber-300 dark:border-amber-500/40 hover:border-amber-400 dark:hover:border-amber-400/60'
                  : c.balance > 0
                  ? 'border-rose-200 dark:border-rose-500/30 hover:border-rose-300 dark:hover:border-rose-500/50'
                  : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-500/50',
              ].join(' ')}
            >
              <Link to={`/customers/${c.id}`} className="block p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="relative shrink-0">
                    {c.avatarUrl ? (
                      <img src={c.avatarUrl} className="h-14 w-14 rounded-2xl object-cover shadow" alt={c.name} />
                    ) : (
                      <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-lg font-extrabold shadow ${
                        c.isVip
                          ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                          : c.balance > 0
                          ? 'bg-gradient-to-br from-rose-500 to-red-700 text-white'
                          : 'bg-gradient-to-br from-blue-500 to-cyan-600 text-white'
                      }`}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {c.isVip && (
                      <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center shadow ring-2 ring-white dark:ring-slate-900">
                        <Crown className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-extrabold text-slate-900 dark:text-white truncate group-hover:text-blue-700 dark:group-hover:text-blue-300 transition">
                      {c.name}
                    </h3>
                    {c.phone && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-bold">
                        <Phone className="h-3 w-3" /> {c.phone}
                      </div>
                    )}
                    {c.city && (
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-bold">
                        <MapPin className="h-3 w-3" /> {c.city}{c.area && `, ${c.area}`}
                      </div>
                    )}
                    {c.cnic && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 font-bold font-mono mt-0.5">
                        <CreditCard className="h-2.5 w-2.5" /> {c.cnic}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-2.5 py-2">
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-extrabold uppercase tracking-wider">Spent</div>
                    <div className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 truncate tabular-nums">{formatPKR(c.totalSpent)}</div>
                  </div>
                  <div className={`rounded-xl px-2.5 py-2 border ${
                    c.balance > 0
                      ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                  }`}>
                    <div className={`text-[10px] font-extrabold uppercase tracking-wider ${
                      c.balance > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'
                    }`}>Khata</div>
                    <div className={`text-sm font-extrabold truncate tabular-nums ${
                      c.balance > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {c.balance > 0 ? formatPKR(c.balance) : 'Clear ✓'}
                    </div>
                  </div>
                </div>

                {(c.loyaltyPoints > 0 || c.createdAt) && (
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    {c.loyaltyPoints > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-extrabold">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                        {Number(c.loyaltyPoints).toLocaleString()} pts
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                      <CalendarDays className="h-2.5 w-2.5" />
                      {new Date(c.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </span>
                  </div>
                )}
              </Link>

              {/* Quick actions */}
              <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between sm:opacity-0 sm:group-hover:opacity-100 transition">
                <div className="flex items-center gap-1">
                  {c.phone && (
                    <button
                      onClick={(e) => whatsappCustomer(c, e)}
                      className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-500/15 hover:bg-green-200 dark:hover:bg-green-500/25 text-green-700 dark:text-green-300 flex items-center justify-center transition"
                      title={c.balance > 0 ? 'WhatsApp: Udhaar reminder' : 'WhatsApp: Thank you'}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {c.phone && (
                    <a
                      href={`tel:${c.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-500/15 hover:bg-blue-200 dark:hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 flex items-center justify-center transition"
                      title="Call"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {c.email && (
                    <a
                      href={`mailto:${c.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-500/15 hover:bg-violet-200 dark:hover:bg-violet-500/25 text-violet-700 dark:text-violet-300 flex items-center justify-center transition"
                      title="Email"
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Link
                    to={`/customers/${c.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="h-8 w-8 rounded-lg bg-slate-200/70 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center transition"
                    title="View"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    to={`/customers/${c.id}/edit`}
                    onClick={(e) => e.stopPropagation()}
                    className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-500/15 hover:bg-blue-200 dark:hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 flex items-center justify-center transition"
                    title="Edit"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); setDeleteTarget(c); }}
                    className="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-500/15 hover:bg-rose-200 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-400 flex items-center justify-center transition"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ PAGINATION ═══ */}
      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between flex-wrap gap-2 bg-white dark:bg-slate-900/80 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-3 sm:p-4 print:hidden">
          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-bold">
            Page <strong className="text-slate-900 dark:text-white">{data.meta.page}</strong> of <strong className="text-slate-900 dark:text-white">{data.meta.totalPages}</strong>
            <span className="opacity-50 mx-1">•</span>
            <strong className="text-slate-900 dark:text-white tabular-nums">{data.meta.total}</strong> total
          </div>
          <div className="flex gap-2">
            <button
              disabled={params.page === 1}
              onClick={() => setParams({ ...params, page: (params.page ?? 1) - 1 })}
              className="h-10 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1 transition"
            >
              <ChevronLeft className="h-4 w-4" /> Pehle
            </button>
            <button
              disabled={(params.page ?? 1) >= data.meta.totalPages}
              onClick={() => setParams({ ...params, page: (params.page ?? 1) + 1 })}
              className="h-10 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1 transition"
            >
              Agla <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ═══ PRINT CSS ═══ */}
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm 10mm; }
          html, body { background: white !important; color: #0f172a !important; print-color-adjust: exact !important; -webkit-print-color-adjust: exact !important; }
          .dark body, .dark { background: white !important; color: #0f172a !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          section, div { box-shadow: none !important; }
          [class*="fixed"] { display: none !important; }
          html, body, #root, #__next { height: auto !important; min-height: 0 !important; overflow: visible !important; }
          [class*="sidebar"], [class*="topbar"], nav[class*="fixed"] { display: none !important; }
          [data-sonner-toaster], [data-sonner-toast], [class*="Toaster"] { display: none !important; visibility: hidden !important; }
          .group { page-break-inside: avoid !important; break-inside: avoid !important; border: 1px solid #e2e8f0 !important; border-radius: 10px !important; }
          .group [class*="opacity-0"] { opacity: 1 !important; }
        }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   DELETE CONFIRM MODAL
   ═════════════════════════════════════════════════════════════ */
function DeleteConfirmModal({ customer, loading, onClose, onConfirm }: any) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-500/40 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 text-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-rose-500 to-red-700 text-white mx-auto flex items-center justify-center shadow-lg shadow-rose-500/40">
            <Trash2 className="h-7 w-7" />
          </div>
          <h3 className="mt-3 text-lg font-extrabold text-slate-900 dark:text-white">
            "{customer.name}" delete karein?
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-semibold">
            {customer.balance > 0
              ? `⚠️ Is ka ${formatPKR(customer.balance)} udhaar baqi hai! Pehle wusooli karo.`
              : 'Ye action undo nahi ho sakta. Sales history mehfooz rahegi.'}
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1 bg-gradient-to-r from-rose-600 to-red-700 font-extrabold shadow-lg shadow-rose-500/40"
              onClick={onConfirm}
              loading={loading}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   🎓 CUSTOMERS TEACHER
   ═════════════════════════════════════════════════════════════ */
function CustomersTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-300 dark:border-blue-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-blue-200 dark:border-blue-500/30 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-500/15 dark:to-cyan-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-blue-900 dark:text-blue-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Customers Kaise Manage Karein?
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            Ye aapki <strong>poori gahak list</strong> hai — VIP 👑, khata wale 💳, top spenders 🏆. Sab ek jagah, ek click mein.
          </p>

          <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/5 p-4 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>👑 VIP card</strong> — amber border wala customer tumhara premium hai, khaas khayal rakho</TipRow>
            <TipRow><strong>💳 "Total Khata" card pe click</strong> — sirf udhaar wale customers filter ho jayenge</TipRow>
            <TipRow><strong>💬 WhatsApp button</strong> — udhaar wale ko reminder, clear wale ko thank-you message khud ban jata hai</TipRow>
            <TipRow><strong>⭐ Loyalty points</strong> — repeat buyers ko inaam do, wo wapas ayenge</TipRow>
            <TipRow><strong>🗑️ Delete se pehle</strong> — agar udhaar baqi hai to warning milegi (pehle wusooli!)</TipRow>
            <TipRow><strong>⌨️ / dabao</strong> — search pe jump &nbsp;•&nbsp; <strong>Esc</strong> — sab band</TipRow>
          </div>

          <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3 text-xs font-semibold text-amber-900 dark:text-amber-200 flex gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <span><strong>Sunahri usool:</strong> Jo customer 30 din se nahi aya, usay WhatsApp pe "miss you" message bhejo — 3 mein se 1 wapas aata hai! 😊</span>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-700 hover:from-blue-700 hover:to-cyan-800 font-extrabold shadow-lg shadow-blue-500/40 h-12"
            onClick={onClose}
          >
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya!
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════ */
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
    blue:   'from-blue-500 to-indigo-700 shadow-blue-500/40',
    amber:  'from-amber-500 to-orange-600 shadow-amber-500/40',
    rose:   'from-rose-500 to-red-600 shadow-rose-500/40',
    emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/40',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={[
        'rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 p-3 sm:p-4 shadow-sm dark:shadow-black/20 text-left w-full transition-all',
        onClick ? 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer' : '',
        active
          ? 'border-rose-500 dark:border-rose-500/60 ring-2 ring-rose-200 dark:ring-rose-500/20'
          : 'border-slate-200 dark:border-slate-800',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-extrabold">{label}</div>
          <div className="mt-1.5 text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 truncate">{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Comp>
  );
}
