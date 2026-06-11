import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Wallet, Plus, Trash2, TrendingDown, CalendarDays, Receipt, Tag,
  Search, X, Filter, Download, Edit3, Calendar, Eye, Save,
  CheckCircle2, AlertCircle, Banknote, CreditCard, Smartphone, Zap, Building,
  Sparkles, FolderOpen, Palette,
} from 'lucide-react';
import {
  expensesApi, expenseCategoriesApi,
} from '@/api/expenses.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPKR } from '@/lib/format';
import type { PaymentMethod } from '@/api/sales.api';
import { toast } from 'sonner';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

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

const paymentIcons: any = {
  CASH: Banknote, CARD: CreditCard, JAZZCASH: Smartphone,
  EASYPAISA: Zap, BANK_TRANSFER: Building,
};

const paymentLabels: any = {
  CASH: 'Cash', CARD: 'Card', JAZZCASH: 'JazzCash',
  EASYPAISA: 'EasyPaisa', BANK_TRANSFER: 'Bank',
};

type DateFilter = 'all' | 'today' | 'week' | 'month';

export default function ExpensesPage() {
  const queryClient = useQueryClient();

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

  const { data: expenses = [] } = useQuery({
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
    mutationFn: () => {
      if (editingCat) {
        // No update API → delete + create as workaround
        return expenseCategoriesApi.create({ name: catName.trim(), color: catColor });
      }
      return expenseCategoriesApi.create({ name: catName.trim(), color: catColor });
    },
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
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success('Exported');
  };

  const clearFilters = () => {
    setSearch('');
    setDateFilter('all');
    setCategoryFilter('all');
    setPaymentFilter('all');
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-rose-900 to-rose-700 text-white p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Wallet className="h-3.5 w-3.5 text-amber-300" /> Money Out
            </div>
            <h2 className="mt-3 text-3xl font-extrabold">Expenses</h2>
            <p className="mt-2 text-sm text-white/80">
              Rent, bills, salaries — har kharcha track karo aur asli profit dekho.
            </p>
          </div>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Aaj ke Expenses" value={formatPKR(summary?.todayExpenses ?? 0)} icon={TrendingDown} color="rose" isText hint={`${summary?.todayCount ?? 0} entries`} />
        <StatCard label="Aaj Count" value={summary?.todayCount ?? 0} icon={Receipt} color="blue" hint="Total entries" />
        <StatCard label="Is Mahine" value={formatPKR(summary?.monthExpenses ?? 0)} icon={CalendarDays} color="violet" isText hint="Monthly total" />
        <StatCard label="Total Expenses" value={formatPKR(summary?.totalExpenses ?? 0)} icon={Wallet} color="amber" isText hint="All time" />
      </section>

      {/* Categories Section */}
      <section className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 text-white flex items-center justify-center shadow">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Expense Categories</h3>
              <p className="text-sm text-slate-500">{categories.length} categories • Click to filter</p>
            </div>
          </div>
          <Button onClick={() => openCatModal()} variant="secondary">
            <Plus className="h-4 w-4" /> New Category
          </Button>
        </div>

        {categories.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
            <Tag className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700 text-sm">No categories yet</p>
            <p className="text-xs text-slate-500 mt-1">Rent, Salary, Bills, Utilities — categorize karein</p>
            <Button onClick={() => openCatModal()} className="mt-4" size="sm">
              <Plus className="h-4 w-4" /> Add First Category
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {categories.map((c: any) => {
              const isActive = categoryFilter === c.id;
              return (
                <div
                  key={c.id}
                  className={`group rounded-2xl border-2 p-4 transition cursor-pointer ${
                    isActive ? 'border-violet-500 bg-violet-50 shadow-md' : 'border-slate-200 hover:border-violet-300 hover:shadow-sm'
                  }`}
                  onClick={() => setCategoryFilter(isActive ? 'all' : c.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0"
                        style={{ backgroundColor: c.color }}
                      >
                        <Tag className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{c.name}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                          {c._count?.expenses ?? 0} expenses
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete "${c.name}"? Expenses se category remove ho jayegi.`)) {
                            deleteCategory.mutate(c.id);
                          }
                        }}
                        className="h-6 w-6 rounded-md bg-rose-100 hover:bg-rose-200 text-rose-700 flex items-center justify-center"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  {isActive && (
                    <div className="mt-2 text-[10px] font-bold text-violet-700 inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Filter active
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid xl:grid-cols-[420px_1fr] gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 h-fit sticky top-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white flex items-center justify-center shadow">
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
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              >
                <option value="">No category</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {categories.length === 0 && (
                <button
                  onClick={() => openCatModal()}
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
                      className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg border-2 transition ${
                        active ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                      title={paymentLabels[m]}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-[9px] font-bold">{paymentLabels[m]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Description</label>
              <textarea
                rows={2}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Optional notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <Button
              className="w-full bg-rose-600 hover:bg-rose-700"
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

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Recent Expenses</h3>
                <p className="text-sm text-slate-500">
                  {filteredExpenses.length} of {expenses.length} expenses
                  {hasFilters && <span className="ml-2 font-bold text-rose-700">• Total: {formatPKR(filteredTotal)}</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {filteredExpenses.length > 0 && (
                  <button onClick={exportCSV} className="h-9 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold inline-flex items-center gap-1">
                    <Download className="h-3.5 w-3.5" /> CSV
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, description, or expense #..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm focus:outline-none focus:border-rose-500"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex gap-1 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold self-center mr-1">Date:</span>
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
                      dateFilter === opt.v ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold self-center mr-1">Pay:</span>
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
              <div className="mx-auto h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center">
                <Wallet className="h-7 w-7 text-slate-400" />
              </div>
              <h4 className="mt-4 text-lg font-bold text-slate-900">
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
                          <div className="font-extrabold text-rose-700 text-lg">{formatPKR(e.amount)}</div>
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

      {/* Category Modal */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-violet-600" />
                <h3 className="font-extrabold text-xl text-slate-900">
                  {editingCat ? 'Edit Category' : 'New Category'}
                </h3>
              </div>
              <button onClick={closeCatModal} className="rounded-lg p-2 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <Input
                label="Category Name *"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Rent, Salary, Bills..."
              />
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Color</label>
                <div className="grid grid-cols-5 gap-2">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCatColor(c)}
                      className={`h-12 rounded-xl border-2 transition shadow-sm ${
                        catColor === c ? 'border-slate-900 scale-110' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={catColor}
                  onChange={(e) => setCatColor(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 cursor-pointer mt-2"
                />
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2">Preview</div>
                <div className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-white font-bold shadow" style={{ backgroundColor: catColor }}>
                  <Tag className="h-4 w-4" />
                  {catName || 'Category name'}
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
                  className="flex-1"
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

function StatCard({ label, value, icon: Icon, color, hint, isText }: any) {
  const colors: any = {
    rose: 'from-rose-500 to-rose-700 shadow-rose-500/30',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/30',
    violet: 'from-violet-500 to-violet-700 shadow-violet-500/30',
    amber: 'from-amber-500 to-amber-700 shadow-amber-500/30',
  };
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-bold">{label}</div>
          <div className={`mt-2 font-extrabold text-slate-900 ${isText ? 'text-xl truncate' : 'text-2xl'}`}>{value}</div>
          {hint && <div className="text-xs text-slate-500 font-semibold mt-1">{hint}</div>}
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${colors[color]} text-white flex items-center justify-center shadow-lg shrink-0 ml-2`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
