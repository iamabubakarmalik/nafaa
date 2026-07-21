import { useState, useMemo, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Wallet, Plus, Trash2, TrendingDown, CalendarDays, Receipt, Tag,
  Search, X, Download, Edit3, Calendar, Save, CheckCircle2,
  Banknote, CreditCard, Smartphone, Zap, Building, Sparkles, FolderOpen,
  Palette, BarChart3, RefreshCw, Activity, ArrowDownRight, FileText,
  AlertTriangle, Crown, Filter, TrendingUp, ArrowUpRight,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { expensesApi, expenseCategoriesApi } from '@/api/expenses.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPKR, formatPKRFull } from '@/lib/format';
import type { PaymentMethod } from '@/api/sales.api';
import { toast } from 'sonner';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const formatDateShort = (value: string) =>
  new Intl.DateTimeFormat('en-PK', { month: 'short', day: 'numeric' }).format(new Date(value));

const formatRelative = (v: string) => {
  const d = new Date(v);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'Abhi';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-PK');
};

const COLOR_PRESETS = [
  '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4',
  '#84cc16', '#f97316', '#a855f7', '#14b8a6', '#6366f1',
  '#10b981', '#d946ef', '#eab308', '#0ea5e9', '#dc2626',
];

const SUGGESTED_CATEGORIES = [
  { name: 'Rent', color: '#ef4444', emoji: '🏠' },
  { name: 'Utilities (Electric/Gas/Water)', color: '#06b6d4', emoji: '💡' },
  { name: 'Staff Salary', color: '#8b5cf6', emoji: '👥' },
  { name: 'Transportation', color: '#f97316', emoji: '🚗' },
  { name: 'Internet & Phone', color: '#3b82f6', emoji: '📞' },
  { name: 'Marketing', color: '#ec4899', emoji: '📣' },
  { name: 'Maintenance', color: '#84cc16', emoji: '🔧' },
  { name: 'Tea & Refreshments', color: '#a855f7', emoji: '☕' },
];

const paymentIcons: any = {
  CASH: Banknote, CARD: CreditCard, JAZZCASH: Smartphone,
  EASYPAISA: Zap, BANK_TRANSFER: Building,
};

const paymentLabels: any = {
  CASH: 'Cash', CARD: 'Card', JAZZCASH: 'JazzCash',
  EASYPAISA: 'EasyPaisa', BANK_TRANSFER: 'Bank',
};

const paymentColors: any = {
  CASH: '#10b981', CARD: '#3b82f6', JAZZCASH: '#f97316',
  EASYPAISA: '#22c55e', BANK_TRANSFER: '#8b5cf6',
};

type DateFilter = 'all' | 'today' | 'week' | 'month';
type Tab = 'overview' | 'list' | 'categories';

export default function ExpensesPage() {
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>('overview');

  // Expense form
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [description, setDescription] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | 'all'>('all');

  // Category modal
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState(COLOR_PRESETS[0]);

  const { data: expenses = [], refetch, isRefetching } = useQuery({
    queryKey: ['expenses'],
    queryFn: expensesApi.list,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: expenseCategoriesApi.list,
  });

  const { data: summary } = useQuery({
    queryKey: ['expenses-summary'],
    queryFn: expensesApi.summary,
  });

  const createExpense = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      toast.success('Expense saved');
      setTitle(''); setAmount(''); setDescription(''); setCategoryId('');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Save failed'),
  });

  const deleteExpense = useMutation({
    mutationFn: expensesApi.remove,
    onSuccess: () => {
      toast.success('Expense deleted');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    },
  });

  const saveCategory = useMutation({
    mutationFn: () => expenseCategoriesApi.create({ name: catName.trim(), color: catColor }),
    onSuccess: () => {
      toast.success(editingCat ? 'Category updated' : 'Category added');
      closeCatModal();
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  });

  const deleteCategory = useMutation({
    mutationFn: expenseCategoriesApi.remove,
    onSuccess: () => {
      toast.success('Category deleted');
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Cannot delete'),
  });

  const filteredExpenses = useMemo(() => {
    let result = [...expenses];
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter((e: any) =>
        e.title.toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q) ||
        (e.expenseNumber || '').toLowerCase().includes(q)
      );
    }
    if (dateFilter !== 'all') {
      const now = new Date();
      let cutoff = new Date();
      if (dateFilter === 'today') cutoff.setHours(0, 0, 0, 0);
      else if (dateFilter === 'week') cutoff.setDate(now.getDate() - 7);
      else if (dateFilter === 'month') cutoff.setMonth(now.getMonth() - 1);
      result = result.filter((e: any) => new Date(e.expenseDate) >= cutoff);
    }
    if (categoryFilter !== 'all') {
      if (categoryFilter === 'none') {
        result = result.filter((e: any) => !e.category);
      } else {
        result = result.filter((e: any) => e.category?.id === categoryFilter);
      }
    }
    if (paymentFilter !== 'all') {
      result = result.filter((e: any) => e.paymentMethod === paymentFilter);
    }
    return result;
  }, [expenses, search, dateFilter, categoryFilter, paymentFilter]);

  const filteredTotal = useMemo(
    () => filteredExpenses.reduce((s: number, e: any) => s + (e.amount || 0), 0),
    [filteredExpenses]
  );

  const hasFilters = search || dateFilter !== 'all' || categoryFilter !== 'all' || paymentFilter !== 'all';

  // 7-day trend (local timezone safe)
  const trendData = useMemo(() => {
    const toLocalKey = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const buckets: Record<string, { date: string; label: string; total: number; count: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = toLocalKey(d);
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
      buckets[key] = { date: key, label: dayName, total: 0, count: 0 };
    }
    for (const e of expenses as any[]) {
      const expDate = new Date(e.expenseDate);
      const key = toLocalKey(expDate);
      if (buckets[key]) {
        buckets[key].total += e.amount || 0;
        buckets[key].count += 1;
      }
    }
    return Object.values(buckets);
  }, [expenses]);

  // Category breakdown for pie
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; color: string; total: number; count: number }>();
    for (const e of expenses as any[]) {
      const key = e.category?.id || 'uncategorized';
      const name = e.category?.name || 'Uncategorized';
      const color = e.category?.color || '#94a3b8';
      const existing = map.get(key) || { name, color, total: 0, count: 0 };
      existing.total += e.amount || 0;
      existing.count += 1;
      map.set(key, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [expenses]);

  // Top expenses
  const topExpenses = useMemo(() => {
    return [...expenses].sort((a: any, b: any) => b.amount - a.amount).slice(0, 5);
  }, [expenses]);

  // Payment method breakdown
  const paymentBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses as any[]) {
      map.set(e.paymentMethod, (map.get(e.paymentMethod) || 0) + (e.amount || 0));
    }
    return Array.from(map.entries()).map(([method, total]) => ({
      name: paymentLabels[method] || method,
      value: total,
      color: paymentColors[method] || '#64748b',
    }));
  }, [expenses]);

  const todayCount = (summary?.todayCount ?? 0);
  const avgPerDay = (summary?.monthExpenses ?? 0) / 30;
  const biggestExpense = topExpenses[0];

  const closeCatModal = () => {
    setShowCatModal(false);
    setEditingCat(null);
    setCatName('');
    setCatColor(COLOR_PRESETS[0]);
  };

  const openCatModal = (cat?: any) => {
    if (cat) {
      setEditingCat(cat);
      setCatName(cat.name);
      setCatColor(cat.color);
    } else {
      setEditingCat(null);
      setCatName('');
      setCatColor(COLOR_PRESETS[0]);
    }
    setShowCatModal(true);
  };

  const quickAddCategory = (preset: { name: string; color: string }) => {
    setEditingCat(null);
    setCatName(preset.name);
    setCatColor(preset.color);
    setShowCatModal(true);
  };

  const exportCSV = () => {
    if (filteredExpenses.length === 0) return toast.error('No data');
    const headers = ['Date', 'Expense #', 'Title', 'Category', 'Amount', 'Payment', 'Description'];
    const rows = filteredExpenses.map((e: any) => [
      new Date(e.expenseDate).toLocaleString('en-PK'),
      e.expenseNumber,
      e.title,
      e.category?.name || 'No category',
      e.amount.toFixed(2),
      e.paymentMethod,
      e.description || '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported');
  };

  const clearFilters = () => {
    setSearch('');
    setDateFilter('all');
    setCategoryFilter('all');
    setPaymentFilter('all');
  };

  const existingCatNames = new Set(categories.map((c: any) => c.name.toLowerCase()));
  const availableSuggestions = SUGGESTED_CATEGORIES.filter(
    (s) => !existingCatNames.has(s.name.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-rose-900 to-rose-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-rose-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-pink-400/15 blur-3xl" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-3 py-1 text-xs font-extrabold">
              <Wallet className="h-3.5 w-3.5 text-amber-300" />
              Money Out Tracking
            </div>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">Expenses</h2>
            <p className="mt-2 text-sm text-white/80">
              Rent, bills, salaries — har kharcha track karo aur asli profit dekho
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold transition disabled:opacity-50 backdrop-blur"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {filteredExpenses.length > 0 && (
              <button
                onClick={exportCSV}
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold transition backdrop-blur border border-white/20"
              >
                <Download className="h-4 w-4" /> Export
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ═══ TABS ═══ */}
      <section className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'overview' as Tab, label: 'Overview', icon: BarChart3 },
          { id: 'list' as Tab, label: 'All Expenses', icon: Receipt },
          { id: 'categories' as Tab, label: 'Categories', icon: FolderOpen },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-extrabold whitespace-nowrap transition border-2 ${
                active
                  ? 'bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-500/30'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-rose-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </section>

      {/* ═══ STATS GRID ═══ */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Aaj ke Expenses"
          value={formatPKR(summary?.todayExpenses ?? 0)}
          sub={`${todayCount} entries today`}
          icon={TrendingDown}
          color="rose"
          isText
          isAlert={(summary?.todayExpenses ?? 0) > 5000}
        />
        <StatCard
          label="Is Mahine"
          value={formatPKR(summary?.monthExpenses ?? 0)}
          sub={`Avg ${formatPKR(avgPerDay)}/day`}
          icon={CalendarDays}
          color="violet"
          isText
        />
        <StatCard
          label="Total Expenses"
          value={formatPKR(summary?.totalExpenses ?? 0)}
          sub={`${expenses.length} all time`}
          icon={Wallet}
          color="amber"
          isText
        />
        <StatCard
          label="Biggest Expense"
          value={biggestExpense ? formatPKR(biggestExpense.amount) : '—'}
          sub={biggestExpense?.title?.slice(0, 30) || 'No expenses yet'}
          icon={AlertTriangle}
          color="orange"
          isText
        />
      </section>

      {/* ═══ OVERVIEW TAB ═══ */}
      {tab === 'overview' && (
        <>
          {/* Charts row */}
          <section className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">7-Day Trend</h3>
                  <p className="text-xs text-slate-500">Daily expense pattern</p>
                </div>
                <BarChart3 className="h-5 w-5 text-rose-500" />
              </div>
              {trendData.some((d) => d.total > 0) ? (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value: any) => formatPKR(Number(value))}
                        contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }}
                      />
                      <Area type="monotone" dataKey="total" name="Expenses" fill="url(#expGrad)" stroke="#ef4444" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[280px] flex flex-col items-center justify-center text-center gap-2">
                  <div className="h-14 w-14 rounded-2xl bg-rose-100 flex items-center justify-center">
                    <TrendingDown className="h-7 w-7 text-rose-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">No expenses in last 7 days</p>
                  <p className="text-xs text-slate-500 font-semibold">Aaj ka pehla expense add karein</p>
                </div>
              )}
            </div>

            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">By Category</h3>
                  <p className="text-xs text-slate-500">Spending distribution</p>
                </div>
              </div>
              {categoryBreakdown.length > 0 ? (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        cx="50%" cy="45%" outerRadius={85} innerRadius={45}
                        dataKey="total"
                        label={(entry: any) => {
                          const total = categoryBreakdown.reduce((s, c) => s + c.total, 0);
                          const pct = total > 0 ? ((entry.total / total) * 100).toFixed(0) : '0';
                          return Number(pct) > 5 ? `${pct}%` : '';
                        }}
                        labelLine={false}
                      >
                        {categoryBreakdown.map((c, idx) => (
                          <Cell key={idx} fill={c.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatPKR(Number(value))} contentStyle={{ borderRadius: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 10, paddingTop: 12 }} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-sm text-slate-500">
                  No category data
                </div>
              )}
            </div>
          </section>

          {/* Top expenses + Payment methods */}
          <section className="grid lg:grid-cols-2 gap-6">
            <div className="rounded-3xl bg-white border-2 border-rose-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-gradient-to-r from-rose-50 to-pink-50 border-b-2 border-rose-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  <h3 className="font-extrabold text-rose-900">Top 5 Biggest Expenses</h3>
                </div>
                <span className="text-[10px] font-bold uppercase text-rose-700 bg-rose-100 px-2 py-1 rounded-full">All Time</span>
              </div>
              <div className="divide-y divide-slate-100">
                {topExpenses.length > 0 ? (
                  topExpenses.map((e: any, idx: number) => {
                    const rankColors = ['bg-amber-500', 'bg-slate-400', 'bg-orange-600', 'bg-rose-500', 'bg-violet-500'];
                    return (
                      <div key={e.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition">
                        <div className={`h-9 w-9 rounded-lg ${rankColors[idx]} text-white font-extrabold flex items-center justify-center text-sm shrink-0 shadow-md`}>
                          {idx < 3 ? <Crown className="h-4 w-4" /> : idx + 1}
                        </div>
                        <div className="h-11 w-11 rounded-xl flex items-center justify-center text-white shadow-md shrink-0" style={{ backgroundColor: e.category?.color || '#64748b' }}>
                          <Wallet className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 text-sm truncate">{e.title}</div>
                          <div className="text-[11px] text-slate-500 font-bold mt-0.5 flex items-center gap-2">
                            {e.category && (
                              <span className="inline-flex items-center gap-1">
                                <Tag className="h-2.5 w-2.5" />
                                {e.category.name}
                              </span>
                            )}
                            <span>•</span>
                            <span>{formatDateShort(e.expenseDate)}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-extrabold text-rose-700 text-lg tabular-nums">{formatPKR(e.amount)}</div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="px-5 py-12 text-center text-sm text-slate-500">No expenses yet</div>
                )}
              </div>
            </div>

            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Payment Methods</h3>
                  <p className="text-xs text-slate-500">How you pay</p>
                </div>
                <CreditCard className="h-5 w-5 text-blue-500" />
              </div>
              {paymentBreakdown.length > 0 ? (
                <div className="space-y-3">
                  {paymentBreakdown.map((p) => {
                    const total = paymentBreakdown.reduce((s, x) => s + x.value, 0);
                    const pct = total > 0 ? (p.value / total) * 100 : 0;
                    const PayIcon = paymentIcons[Object.keys(paymentLabels).find(k => paymentLabels[k] === p.name) || 'CASH'] || CreditCard;
                    return (
                      <div key={p.name}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${p.color}20` }}>
                              <PayIcon className="h-4 w-4" style={{ color: p.color }} />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                              <div className="text-[10px] text-slate-500 font-bold">{pct.toFixed(1)}%</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-extrabold text-rose-700 text-sm tabular-nums">{formatPKR(p.value)}</div>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: p.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-sm text-slate-500">No data</div>
              )}
            </div>
          </section>
        </>
      )}

      {/* ═══ LIST TAB ═══ */}
      {tab === 'list' && (
        <section className="grid xl:grid-cols-[420px_1fr] gap-6">
          {/* Sticky form */}
          <div className="rounded-3xl bg-white border-2 border-rose-200 shadow-sm p-6 h-fit sticky top-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">New Expense</h3>
                <p className="text-sm text-slate-500">Quick expense add</p>
              </div>
            </div>

            <div className="space-y-4">
              <Input
                label="Title *"
                placeholder="Shop rent for May"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Input
                label="Amount (PKR) *"
                type="number"
                step="0.01"
                placeholder="50000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition"
                >
                  <option value="">No category</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {categories.length === 0 && (
                  <button
                    onClick={() => setTab('categories')}
                    className="text-xs text-rose-700 font-bold hover:underline mt-1 inline-flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Create first category
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Payment Method</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(Object.keys(paymentLabels) as PaymentMethod[]).map((m) => {
                    const Icon = paymentIcons[m];
                    const active = paymentMethod === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMethod(m)}
                        className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 transition ${
                          active
                            ? 'border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-200'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                        title={paymentLabels[m]}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span className="text-[9px] font-extrabold">{paymentLabels[m]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Description</label>
                <textarea
                  rows={2}
                  className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-rose-500"
                  placeholder="Optional notes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <Button
                className="w-full bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 shadow-lg shadow-rose-500/30"
                size="lg"
                loading={createExpense.isPending}
                onClick={() => {
                  if (!title.trim()) return toast.error('Title likhein');
                  if (!Number(amount)) return toast.error('Amount likhein');
                  createExpense.mutate({
                    title: title.trim(),
                    amount: Number(amount),
                    description: description.trim() || undefined,
                    categoryId: categoryId || undefined,
                    paymentMethod,
                  });
                }}
              >
                <Plus className="h-4 w-4" />
                Save Expense
              </Button>
            </div>
          </div>

          {/* Expenses list */}
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">All Expenses</h3>
                  <p className="text-sm text-slate-500">
                    {filteredExpenses.length} of {expenses.length}
                    {hasFilters && <span className="ml-2 font-bold text-rose-700">• {formatPKR(filteredTotal)}</span>}
                  </p>
                </div>
              </div>

              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search title, description, expense #..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="h-4 w-4 text-slate-400" />
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex gap-1 flex-wrap items-center">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mr-1">Date:</span>
                  {[
                    { v: 'all' as DateFilter, l: 'All' },
                    { v: 'today' as DateFilter, l: 'Today' },
                    { v: 'week' as DateFilter, l: '7 Days' },
                    { v: 'month' as DateFilter, l: '30 Days' },
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      onClick={() => setDateFilter(opt.v)}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                        dateFilter === opt.v ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1 flex-wrap items-center">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mr-1">Pay:</span>
                  <button
                    onClick={() => setPaymentFilter('all')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                      paymentFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    All
                  </button>
                  {(Object.keys(paymentLabels) as PaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setPaymentFilter(m)}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                        paymentFilter === m ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {paymentLabels[m]}
                    </button>
                  ))}
                </div>
                {hasFilters && (
                  <button onClick={clearFilters} className="text-xs font-bold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1">
                    <X className="h-3 w-3" /> Clear filters
                  </button>
                )}
              </div>
            </div>

            {filteredExpenses.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-rose-100 to-pink-200 flex items-center justify-center">
                  <Wallet className="h-9 w-9 text-rose-600" />
                </div>
                <h4 className="mt-5 text-lg font-bold text-slate-900">
                  {hasFilters ? 'No matches' : 'Abhi koi expense nahi'}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  {hasFilters ? 'Try different filter' : 'Left side se pehla expense add karein'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[700px] overflow-y-auto">
                {filteredExpenses.map((e: any) => {
                  const PayIcon = paymentIcons[e.paymentMethod] || CreditCard;
                  return (
                    <div key={e.id} className="px-6 py-4 hover:bg-slate-50 transition group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div
                            className="h-11 w-11 rounded-xl flex items-center justify-center text-white shadow-md shrink-0"
                            style={{ backgroundColor: e.category?.color || '#64748b' }}
                          >
                            <Wallet className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900">{e.title}</span>
                              <span className="text-[10px] font-bold text-slate-400 font-mono">{e.expenseNumber}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs">
                              {e.category ? (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                                  style={{ backgroundColor: e.category.color }}
                                >
                                  <Tag className="h-2.5 w-2.5" />
                                  {e.category.name}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                                  Uncategorized
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                                <PayIcon className="h-2.5 w-2.5" />
                                {paymentLabels[e.paymentMethod] || e.paymentMethod}
                              </span>
                            </div>
                            {e.description && (
                              <div className="text-xs text-slate-600 mt-1 line-clamp-2">{e.description}</div>
                            )}
                            <div className="text-[10px] text-slate-400 mt-1 inline-flex items-center gap-1">
                              <Calendar className="h-2.5 w-2.5" />
                              {formatDate(e.expenseDate)} • {formatRelative(e.expenseDate)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <div className="font-extrabold text-rose-700 text-lg tabular-nums">{formatPKR(e.amount)}</div>
                          </div>
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${e.title}"?`)) deleteExpense.mutate(e.id);
                            }}
                            className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══ CATEGORIES TAB ═══ */}
      {tab === 'categories' && (
        <section className="space-y-4">
          {/* Quick suggestions */}
          {availableSuggestions.length > 0 && (
            <div className="rounded-3xl bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-violet-600" />
                <h3 className="font-extrabold text-violet-900">Quick Add Suggestions</h3>
                <span className="text-[10px] font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">
                  Popular categories
                </span>
              </div>
              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-2">
                {availableSuggestions.slice(0, 8).map((s) => (
                  <button
                    key={s.name}
                    onClick={() => quickAddCategory(s)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border-2 hover:shadow-md hover:scale-105 transition group"
                    style={{ borderColor: `${s.color}50` }}
                  >
                    <div
                      className="h-9 w-9 rounded-lg flex items-center justify-center text-white shadow-sm shrink-0 text-base"
                      style={{ backgroundColor: s.color }}
                    >
                      {s.emoji}
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <div className="text-xs font-extrabold text-slate-900 truncate">{s.name}</div>
                      <div className="text-[9px] text-slate-500 font-bold">+ Click to add</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 text-white flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <FolderOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">All Categories</h3>
                  <p className="text-sm text-slate-500">{categories.length} categories</p>
                </div>
              </div>
              <Button onClick={() => openCatModal()} className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg shadow-violet-500/30">
                <Plus className="h-4 w-4" /> New Category
              </Button>
            </div>

            {categories.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
                <Tag className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-700 text-sm">No categories yet</p>
                <p className="text-xs text-slate-500 mt-1">Suggestions upar se quick add karein ya manual create karein</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {categories.map((c: any) => (
                  <div
                    key={c.id}
                    className="group rounded-2xl border-2 border-slate-200 p-4 hover:border-violet-300 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className="h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
                          style={{ backgroundColor: c.color, boxShadow: `0 8px 20px ${c.color}40` }}
                        >
                          <Tag className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-900 truncate">{c.name}</div>
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            {c._count?.expenses ?? 0} expenses
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${c.name}"?`)) deleteCategory.mutate(c.id);
                        }}
                        className="h-7 w-7 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-3 text-[10px] font-mono text-slate-400 uppercase">{c.color}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══ CATEGORY MODAL ═══ */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-gradient-to-br from-violet-50 to-purple-50 border-b-2 border-violet-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-violet-500/30">
                  {editingCat ? <Edit3 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">
                    {editingCat ? 'Edit Category' : 'New Category'}
                  </h3>
                  <p className="text-xs text-slate-600 font-semibold">Expense group</p>
                </div>
              </div>
              <button onClick={closeCatModal} className="h-9 w-9 rounded-xl bg-white hover:bg-slate-100 flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <Input
                label="Category Name *"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Rent, Salary, Bills..."
                autoFocus
              />
              <div>
                <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5 text-slate-500" />
                  Color
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCatColor(c)}
                      className={`h-12 rounded-xl border-2 transition shadow-sm ${
                        catColor === c ? 'border-slate-900 scale-110 shadow-lg ring-2 ring-slate-300' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="color"
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                    className="h-10 w-16 rounded-xl border-2 border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                    className="h-10 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-violet-500"
                    placeholder="#8b5cf6"
                  />
                </div>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 p-4">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold mb-3 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Live Preview
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg"
                    style={{ backgroundColor: catColor, boxShadow: `0 10px 25px -5px ${catColor}40` }}
                  >
                    <Tag className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900">{catName || 'Category name'}</div>
                    <div className="text-xs text-slate-500 font-semibold">0 expenses</div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="secondary" onClick={closeCatModal} className="flex-1">Cancel</Button>
                <Button
                  onClick={() => {
                    if (!catName.trim()) return toast.error('Name required');
                    saveCategory.mutate();
                  }}
                  loading={saveCategory.isPending}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                >
                  <Save className="h-4 w-4" /> {editingCat ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color, isText, isAlert }: any) {
  const colors: any = {
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/30',
    violet: 'from-violet-500 to-purple-600 shadow-violet-500/30',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
    orange: 'from-orange-500 to-red-600 shadow-orange-500/30',
  };
  return (
    <div className={`rounded-2xl border-2 p-5 shadow-sm hover:shadow-md transition ${
      isAlert ? 'bg-gradient-to-br from-rose-50 to-pink-50 border-rose-300' : 'bg-white border-slate-200'
    }`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className={`mt-2 font-extrabold text-slate-900 tabular-nums truncate ${isText ? 'text-xl' : 'text-2xl'}`}>
            {value}
          </div>
          {sub && <div className="text-xs text-slate-600 font-semibold mt-1 truncate">{sub}</div>}
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg shrink-0 ml-2`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
