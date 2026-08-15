import { useState, useMemo, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Receipt, Plus, Trash2, Edit3, Search, Filter, TrendingDown,
  Calendar, User as UserIcon, Tag, DollarSign, X, RefreshCw,
  Download, Printer, GraduationCap, CheckCircle2, AlertTriangle,
  FileText, Wallet, Coffee, Zap, Truck, Home, Wrench, Package,
  ShoppingCart, HeartPulse, GraduationCap as EduIcon, Wifi,
  Fuel, MoreHorizontal, PieChart as PieIcon, Activity, Copy,
  Store, TrendingUp, BarChart3, ChevronDown, FileDown, Eye,
  ChevronRight, Clock,
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { expensesApi } from '@modules/finance/expenses/api/expenses.api';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   NAFAA EXPENSES — GLOBAL FULL BEST v4
   ─────────────────────────────────────────────────────────────
   🌍 GLOBAL — Retail/Restaurant/Salon/Pharmacy sab me kaam
   🌙 Dark mode complete
   🎓 Teacher modal
   ⌨️  / search • N naya • T guide • Esc
   🔍 DETAIL VIEW — Row click karo → full details modal
   🎨 CUSTOM CATEGORY — "Other" ke saath apna naam de sakte ho
   📅 CUSTOM DATE RANGE — From/To dates apni marzi ke
   🧾 THERMAL RECEIPT (80mm) + 📄 FULL PDF DOWNLOAD
   📊 Category pie + monthly bar charts
   ═════════════════════════════════════════════════════════════ */

const CATEGORIES = [
  { value: 'RENT',       label: 'Rent / Kiraya',      icon: Home,          color: 'from-blue-500 to-blue-700',       tone: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' },
  { value: 'UTILITIES',  label: 'Bijli / Gas / Pani', icon: Zap,           color: 'from-amber-500 to-orange-600',    tone: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' },
  { value: 'SALARY',     label: 'Salaries',           icon: UserIcon,      color: 'from-violet-500 to-purple-700',   tone: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300' },
  { value: 'INVENTORY',  label: 'Stock Purchase',     icon: Package,       color: 'from-emerald-500 to-emerald-700', tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' },
  { value: 'TRANSPORT',  label: 'Transport / Fuel',   icon: Fuel,          color: 'from-rose-500 to-rose-700',       tone: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300' },
  { value: 'MAINTENANCE',label: 'Marammat / Repair',  icon: Wrench,        color: 'from-slate-500 to-slate-700',     tone: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' },
  { value: 'MARKETING',  label: 'Advertising',        icon: TrendingUp,    color: 'from-pink-500 to-fuchsia-700',    tone: 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300' },
  { value: 'INTERNET',   label: 'Internet / Phone',   icon: Wifi,          color: 'from-cyan-500 to-blue-700',       tone: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300' },
  { value: 'FOOD',       label: 'Chai / Khana',       icon: Coffee,        color: 'from-orange-500 to-red-700',      tone: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300' },
  { value: 'MEDICAL',    label: 'Medical',            icon: HeartPulse,    color: 'from-red-500 to-rose-700',        tone: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300' },
  { value: 'EDUCATION',  label: 'Training',           icon: EduIcon,       color: 'from-indigo-500 to-blue-700',     tone: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' },
  { value: 'OTHER',      label: 'Other / Custom',     icon: MoreHorizontal,color: 'from-gray-500 to-gray-700',       tone: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
];

const PAYMENT_METHODS = [
  { value: 'CASH',      label: 'Cash' },
  { value: 'BANK',      label: 'Bank Transfer' },
  { value: 'CARD',      label: 'Debit/Credit Card' },
  { value: 'JAZZCASH',  label: 'JazzCash' },
  { value: 'EASYPAISA', label: 'EasyPaisa' },
  { value: 'CHEQUE',    label: 'Cheque' },
];

const getCategoryConfig = (value: string) => CATEGORIES.find(c => c.value === value) || CATEGORIES[CATEGORIES.length - 1];

const formatDate = (v: string) => new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v));
const formatDateTime = (v: string) => new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));
const formatRelative = (v: string) => {
  const d = new Date(v);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'Abhi';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(v).toLocaleDateString('en-PK');
};

type PeriodFilter = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';

const emptyForm = {
  category: 'OTHER',
  customCategory: '',
  amount: '',
  description: '',
  paymentMethod: 'CASH',
  vendor: '',
  reference: '',
  date: new Date().toISOString().slice(0, 10),
  notes: '',
};

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const currentShopId = useAuthStore((s) => s.currentShopId);
  const shopName = useAuthStore((s: any) => s.currentShop?.name || 'Nafaa POS');

  const searchRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [showTeacher, setShowTeacher] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [detailExpense, setDetailExpense] = useState<any>(null);

  const { data: expenses = [], isLoading, refetch, isRefetching } = useQuery<any[]>({
    queryKey: ['expenses', currentShopId],
    queryFn: () => (expensesApi as any).list(currentShopId || undefined),
    enabled: !!currentShopId,
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => (expensesApi as any).create(payload),
    onSuccess: () => {
      toast.success('Expense record ho gaya');
      setForm(emptyForm); setShowForm(false); setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save fail'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => (expensesApi as any).update(id, data),
    onSuccess: () => {
      toast.success('Expense update ho gaya');
      setForm(emptyForm); setShowForm(false); setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Update fail'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => (expensesApi as any).remove(id),
    onSuccess: () => {
      toast.success('Expense delete ho gaya');
      setDetailExpense(null);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete fail'),
  });

  // Period filter
  const filteredByPeriod = useMemo(() => {
    if (period === 'all') return expenses;
    if (period === 'custom') {
      if (!customFrom && !customTo) return expenses;
      const start = customFrom ? new Date(customFrom) : new Date('2000-01-01');
      const end = customTo ? new Date(customTo) : new Date();
      end.setHours(23, 59, 59, 999);
      return expenses.filter((e: any) => {
        const d = new Date(e.date || e.createdAt);
        return d >= start && d <= end;
      });
    }
    const now = new Date();
    const start = new Date();
    if (period === 'today') start.setHours(0, 0, 0, 0);
    else if (period === 'week') start.setDate(now.getDate() - 7);
    else if (period === 'month') start.setMonth(now.getMonth() - 1);
    else if (period === 'year') start.setFullYear(now.getFullYear() - 1);
    return expenses.filter((e: any) => new Date(e.date || e.createdAt) >= start);
  }, [expenses, period, customFrom, customTo]);

  const filteredExpenses = useMemo(() => {
    let result = [...filteredByPeriod];
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter((e: any) =>
        (e.description || '').toLowerCase().includes(q) ||
        (e.vendor || '').toLowerCase().includes(q) ||
        (e.reference || '').toLowerCase().includes(q) ||
        (e.customCategory || '').toLowerCase().includes(q),
      );
    }
    if (categoryFilter !== 'all') {
      result = result.filter((e: any) => e.category === categoryFilter);
    }
    return result.sort((a: any, b: any) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
  }, [filteredByPeriod, search, categoryFilter]);

  const stats = useMemo(() => {
    const total = filteredExpenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
    const avg = filteredExpenses.length > 0 ? total / filteredExpenses.length : 0;
    const highest = filteredExpenses.reduce((max: any, e: any) => (Number(e.amount) > Number(max?.amount || 0) ? e : max), null);
    const categoriesCount = new Set(filteredExpenses.map((e: any) => e.category)).size;
    return { total, avg, highest, count: filteredExpenses.length, categoriesCount };
  }, [filteredExpenses]);

  const displayCategoryName = (exp: any) => {
    if (exp.category === 'OTHER' && exp.customCategory) return exp.customCategory;
    return getCategoryConfig(exp.category).label;
  };

  const categoryBreakdown = useMemo(() => {
  const map = new Map<string, number>();
  for (const e of filteredExpenses as any[]) {
    // Always coerce to string, handle null/undefined/number/backend variants
    const rawCat = e?.category != null ? String(e.category) : 'OTHER';
    const customName = typeof e?.customCategory === 'string' ? e.customCategory.trim() : '';
    const key = rawCat === 'OTHER' && customName ? `OTHER:${customName}` : rawCat;
    const cur = map.get(key) || 0;
    map.set(key, cur + Number(e?.amount || 0));
  }
  const palette = ['#3b82f6','#f59e0b','#8b5cf6','#10b981','#ef4444','#64748b','#ec4899','#06b6d4','#f97316','#dc2626','#6366f1','#6b7280','#a855f7','#14b8a6','#eab308'];
  return Array.from(map.entries())
    .map(([rawKey, amt], idx) => {
      const key = String(rawKey ?? 'OTHER');                    // ✅ safe cast
      if (key.startsWith('OTHER:')) {
        return {
          name: key.slice(6) || 'Other',
          value: amt,
          category: 'OTHER',
          color: palette[idx % palette.length],
        };
      }
      const cfg = getCategoryConfig(key);
      const catIdx = CATEGORIES.findIndex((c) => c.value === key);
      return {
        name: cfg.label,
        value: amt,
        category: key,
        color: palette[(catIdx >= 0 ? catIdx : idx) % palette.length],
      };
    })
    .sort((a, b) => b.value - a.value);
}, [filteredExpenses]);


  const monthlyTrend = useMemo(() => {
    const buckets: Record<string, { label: string; total: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets[key] = { label: d.toLocaleDateString('en-PK', { month: 'short', year: '2-digit' }), total: 0 };
    }
    for (const e of expenses as any[]) {
      const d = new Date(e.date || e.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (buckets[key]) buckets[key].total += Number(e.amount || 0);
    }
    return Object.values(buckets);
  }, [expenses]);

  const openNewForm = () => {
    setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) });
    setEditingId(null);
    setShowForm(true);
    setTimeout(() => amountRef.current?.focus(), 100);
  };

  const openEditForm = (exp: any) => {
    setForm({
      category: exp.category || 'OTHER',
      customCategory: exp.customCategory || '',
      amount: String(exp.amount || ''),
      description: exp.description || '',
      paymentMethod: exp.paymentMethod || 'CASH',
      vendor: exp.vendor || '',
      reference: exp.reference || '',
      date: (exp.date || exp.createdAt || new Date().toISOString()).slice(0, 10),
      notes: exp.notes || '',
    });
    setEditingId(exp.id);
    setDetailExpense(null);
    setShowForm(true);
  };

  const submitForm = () => {
    if (!currentShopId) return toast.error('Top-bar se shop select karo');
    const amount = Number(form.amount);
    if (isNaN(amount) || amount <= 0) return toast.error('Valid amount likho');
    if (!form.description.trim()) return toast.error('Description likhna zaroori hai');
    if (form.category === 'OTHER' && !form.customCategory.trim()) {
      return toast.error('Custom category ka naam likhna zaroori hai');
    }
    const payload: any = {
      shopId: currentShopId,
      category: form.category,
      customCategory: form.category === 'OTHER' ? form.customCategory.trim() : undefined,
      amount,
      description: form.description.trim(),
      paymentMethod: form.paymentMethod,
      vendor: form.vendor.trim() || undefined,
      reference: form.reference.trim() || undefined,
      date: form.date,
      notes: form.notes.trim() || undefined,
    };
    if (editingId) updateMutation.mutate({ id: editingId, data: payload });
    else createMutation.mutate(payload);
  };

  const confirmDelete = (exp: any) => {
    if (confirm(`Expense "${exp.description}" (${formatPKR(exp.amount)}) delete karein?\n\nYe permanent hai — accounting record se hat jayega.`)) {
      deleteMutation.mutate(exp.id);
    }
  };

  const duplicateExpense = (exp: any) => {
    setForm({
      category: exp.category || 'OTHER',
      customCategory: exp.customCategory || '',
      amount: String(exp.amount || ''),
      description: exp.description || '',
      paymentMethod: exp.paymentMethod || 'CASH',
      vendor: exp.vendor || '',
      reference: '',
      date: new Date().toISOString().slice(0, 10),
      notes: '',
    });
    setEditingId(null);
    setDetailExpense(null);
    setShowForm(true);
    toast.success('Duplicate ho gaya — edit karke save karo');
    setTimeout(() => amountRef.current?.focus(), 100);
  };

  /* 🧾 THERMAL RECEIPT PRINT — 80mm */
  const printReceipt = (exp: any) => {
    const catName = displayCategoryName(exp);
    const html = `<!doctype html>
<html><head><meta charset="utf-8" /><title>Expense Receipt #${(exp.id || '').slice(-8).toUpperCase()}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; width: 80mm; padding: 4mm 3mm; margin: 0; color: #000; background: #fff; font-size: 11px; line-height: 1.3; }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .big { font-size: 14px; }
  .huge { font-size: 18px; font-weight: 800; }
  .divider { border-top: 1px dashed #000; margin: 6px 0; }
  .double-divider { border-top: 2px solid #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; gap: 6px; margin: 2px 0; }
  .row .value { text-align: right; font-weight: 700; word-break: break-word; }
  .badge { display: inline-block; border: 1.5px solid #000; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 700; letter-spacing: 1px; margin: 4px 0; }
  .footer { font-size: 9px; margin-top: 8px; }
  .amount-box { border: 2px solid #000; padding: 6px; margin: 6px 0; text-align: center; }
  @media print { body { padding: 3mm 2mm; } }
</style></head><body>
  <div class="center bold big">${shopName}</div>
  <div class="center" style="font-size: 9px;">Expense Payment Voucher</div>
  <div class="center" style="font-size: 9px;">Powered by Nafaa POS</div>
  <div class="divider"></div>
  <div class="center"><span class="badge">EXPENSE VOUCHER</span></div>
  <div class="row"><span>Voucher #:</span><span class="value">${(exp.id || '').slice(-8).toUpperCase()}</span></div>
  <div class="row"><span>Date:</span><span class="value">${formatDate(exp.date || exp.createdAt)}</span></div>
  <div class="row"><span>Time:</span><span class="value">${new Date(exp.createdAt || Date.now()).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</span></div>
  ${exp.createdBy?.fullName ? `<div class="row"><span>By:</span><span class="value">${exp.createdBy.fullName}</span></div>` : ''}
  <div class="divider"></div>
  <div class="row"><span>Category:</span><span class="value">${catName}</span></div>
  <div class="row"><span>Payment:</span><span class="value">${PAYMENT_METHODS.find(p => p.value === exp.paymentMethod)?.label || exp.paymentMethod || 'CASH'}</span></div>
  ${exp.vendor ? `<div class="row"><span>Vendor:</span><span class="value">${exp.vendor}</span></div>` : ''}
  ${exp.reference ? `<div class="row"><span>Ref:</span><span class="value">${exp.reference}</span></div>` : ''}
  <div class="divider"></div>
  <div class="bold">Description:</div>
  <div style="margin: 3px 0; word-break: break-word;">${exp.description || '—'}</div>
  ${exp.notes ? `<div class="divider"></div><div class="bold" style="font-size: 10px;">Notes:</div><div style="font-size: 10px; margin: 2px 0; word-break: break-word;">${exp.notes}</div>` : ''}
  <div class="amount-box">
    <div style="font-size: 10px;">TOTAL AMOUNT</div>
    <div class="huge">${formatPKR(exp.amount)}</div>
  </div>
  <div class="double-divider"></div>
  <div class="row" style="margin-top: 12px;"><span class="bold">Received By:</span><span style="border-bottom: 1px dotted #000; min-width: 30mm;">&nbsp;</span></div>
  <div class="row" style="margin-top: 12px;"><span class="bold">Signature:</span><span style="border-bottom: 1px dotted #000; min-width: 30mm;">&nbsp;</span></div>
  <div class="divider"></div>
  <div class="center footer">Ye ek official expense voucher hai.<br/>Isay safely rakhein — accounting record ke liye.</div>
  <div class="center footer bold" style="margin-top: 4px;">* * * SHUKRIYA * * *</div>
  <div class="center" style="font-size: 8px; margin-top: 6px;">Printed: ${new Date().toLocaleString('en-PK')}</div>
  <script>window.onload = function() { setTimeout(function() { window.print(); setTimeout(function() { window.close(); }, 500); }, 200); };</script>
</body></html>`;
    const w = window.open('', '_blank', 'width=380,height=700');
    if (!w) return toast.error('Popup blocked — allow popups');
    w.document.write(html);
    w.document.close();
  };

  /* 📄 FULL PDF DOWNLOAD */
  const downloadFullPDF = () => {
    if (filteredExpenses.length === 0) return toast.error('Koi expense nahi');
    const totalAmt = stats.total;
    const html = `<!doctype html>
<html><head><meta charset="utf-8" /><title>Expenses Report — ${shopName}</title>
<style>
  @page { size: A4; margin: 15mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; margin: 0; color: #0f172a; font-size: 11px; }
  .header { background: linear-gradient(135deg, #1e293b, #7c2d12); color: white; padding: 20px; border-radius: 10px; margin-bottom: 15px; }
  .header h1 { margin: 0; font-size: 22px; }
  .header .sub { font-size: 11px; opacity: 0.9; margin-top: 4px; }
  .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 15px; }
  .kpi { border: 2px solid #e2e8f0; border-radius: 8px; padding: 10px; background: #f8fafc; }
  .kpi .lbl { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
  .kpi .val { font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 3px; }
  .kpi .sub { font-size: 9px; color: #64748b; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
  th { background: #0f172a; color: white; padding: 8px 6px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
  th.right, td.right { text-align: right; }
  th.center, td.center { text-align: center; }
  td { padding: 7px 6px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) td { background: #f8fafc; }
  .cat-badge { display: inline-block; padding: 2px 6px; border-radius: 3px; background: #e0e7ff; color: #3730a3; font-size: 9px; font-weight: 700; }
  .cat-summary { margin-top: 20px; page-break-inside: avoid; }
  .cat-summary h3 { margin: 0 0 8px 0; font-size: 13px; }
  .cat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .cat-item { display: flex; justify-content: space-between; padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 5px; font-size: 10px; }
  .cat-item .amt { font-weight: 800; }
  .total-row td { background: #0f172a !important; color: white; font-weight: 800; font-size: 12px; }
  .footer { margin-top: 20px; padding-top: 10px; border-top: 2px solid #0f172a; font-size: 9px; color: #64748b; text-align: center; }
  .signature-block { margin-top: 40px; display: flex; justify-content: space-between; page-break-inside: avoid; }
  .sig { text-align: center; font-size: 10px; }
  .sig-line { border-top: 1px solid #0f172a; width: 150px; margin: 40px auto 4px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
  <div class="header">
    <h1>📊 Expenses Report</h1>
    <div class="sub">${shopName} • Generated: ${new Date().toLocaleString('en-PK')} • Period: ${period.toUpperCase()}${period === 'custom' ? ` (${customFrom || 'any'} → ${customTo || 'any'})` : ''}${categoryFilter !== 'all' ? ` • Category: ${getCategoryConfig(categoryFilter).label}` : ''}</div>
  </div>
  <div class="meta">
    <div class="kpi"><div class="lbl">Total Expenses</div><div class="val">${formatPKR(stats.total)}</div><div class="sub">${stats.count} transactions</div></div>
    <div class="kpi"><div class="lbl">Average per Entry</div><div class="val">${formatPKR(stats.avg)}</div><div class="sub">Mean value</div></div>
    <div class="kpi"><div class="lbl">Highest Expense</div><div class="val">${stats.highest ? formatPKR(stats.highest.amount) : '—'}</div><div class="sub">${(stats.highest?.description || 'N/A').slice(0, 25)}</div></div>
    <div class="kpi"><div class="lbl">Categories</div><div class="val">${stats.categoriesCount}</div><div class="sub">Different types</div></div>
  </div>
  <table>
    <thead><tr>
      <th style="width: 5%;">#</th><th style="width: 12%;">Date</th><th style="width: 15%;">Category</th>
      <th style="width: 28%;">Description</th><th style="width: 15%;">Vendor</th>
      <th style="width: 10%;">Payment</th><th class="right" style="width: 15%;">Amount</th>
    </tr></thead>
    <tbody>
      ${filteredExpenses.map((e: any, i: number) => `
        <tr>
          <td class="center">${i + 1}</td>
          <td>${formatDate(e.date || e.createdAt)}</td>
          <td><span class="cat-badge">${displayCategoryName(e).replace(/</g, '&lt;')}</span></td>
          <td>${(e.description || '').replace(/</g, '&lt;')}</td>
          <td>${(e.vendor || '—').replace(/</g, '&lt;')}</td>
          <td>${PAYMENT_METHODS.find(p => p.value === e.paymentMethod)?.label || e.paymentMethod || 'CASH'}</td>
          <td class="right">${formatPKR(e.amount)}</td>
        </tr>`).join('')}
      <tr class="total-row"><td colspan="6" class="right">GRAND TOTAL</td><td class="right">${formatPKR(totalAmt)}</td></tr>
    </tbody>
  </table>
  <div class="cat-summary">
    <h3>📈 Category-wise Breakdown</h3>
    <div class="cat-grid">
      ${categoryBreakdown.map(c => `
        <div class="cat-item">
          <span>${c.name.replace(/</g, '&lt;')}</span>
          <span class="amt">${formatPKR(c.value)} <span style="color: #64748b; font-weight: 500;">(${((c.value / totalAmt) * 100).toFixed(1)}%)</span></span>
        </div>`).join('')}
    </div>
  </div>
  <div class="signature-block">
    <div class="sig"><div class="sig-line"></div>Prepared By</div>
    <div class="sig"><div class="sig-line"></div>Verified By</div>
    <div class="sig"><div class="sig-line"></div>Approved By</div>
  </div>
  <div class="footer"><strong>${shopName}</strong> • Official Expenses Report<br/>Ye ek computer generated report hai.<br/>Powered by Nafaa POS</div>
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };</script>
</body></html>`;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) return toast.error('Popup blocked — allow popups');
    w.document.write(html);
    w.document.close();
    toast.success('PDF ready — Print dialog me "Save as PDF" choose karo');
  };

  const exportCSV = () => {
    if (filteredExpenses.length === 0) return toast.error('Koi data nahi');
    const summary = [
      ['Expenses Report'],
      [`Generated: ${new Date().toLocaleString('en-PK')}  •  Total: ${formatPKR(stats.total)}  •  Count: ${stats.count}`],
      [''],
    ];
    const headers = ['Date', 'Category', 'Description', 'Vendor', 'Payment Method', 'Reference', 'Amount', 'Notes'];
    const rows = filteredExpenses.map((e: any) => [
      formatDate(e.date || e.createdAt),
      displayCategoryName(e),
      e.description || '',
      e.vendor || '',
      e.paymentMethod || 'CASH',
      e.reference || '',
      e.amount,
      e.notes || '',
    ]);
    const csv = [...summary, headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filteredExpenses.length} expenses export ho gaye`);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTeacher) return setShowTeacher(false);
        if (showForm) return setShowForm(false);
        if (detailExpense) return setDetailExpense(null);
      }
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === 'n') { e.preventDefault(); openNewForm(); }
      if (e.key.toLowerCase() === 't') { e.preventDefault(); setShowTeacher(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTeacher, showForm, detailExpense]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = (showTeacher || showForm || detailExpense) ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [showTeacher, showForm, detailExpense]);

  const hasFilters = !!search || categoryFilter !== 'all' || period !== 'month';

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <ExpensesTeacher onClose={() => setShowTeacher(false)} />}
      {showForm && (
        <ExpenseFormModal
          form={form}
          setForm={setForm}
          editingId={editingId}
          onClose={() => setShowForm(false)}
          onSubmit={submitForm}
          loading={createMutation.isPending || updateMutation.isPending}
          amountRef={amountRef}
        />
      )}
      {detailExpense && (
        <ExpenseDetailModal
          expense={detailExpense}
          onClose={() => setDetailExpense(null)}
          onEdit={() => openEditForm(detailExpense)}
          onDelete={() => confirmDelete(detailExpense)}
          onPrint={() => printReceipt(detailExpense)}
          onDuplicate={() => duplicateExpense(detailExpense)}
          displayCategoryName={displayCategoryName}
        />
      )}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-rose-900 to-red-800 dark:from-slate-950 dark:via-rose-950 dark:to-red-900 text-white p-4 sm:p-6 shadow-2xl print:hidden">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-rose-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <Receipt className="h-3.5 w-3.5 text-amber-300" /> Business Expenses
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">💸 Expenses</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              <strong className="text-amber-300 tabular-nums">{formatPKR(stats.total)}</strong> total
              <span className="opacity-50 mx-1.5">•</span>
              <strong>{stats.count}</strong> entries
              <span className="opacity-50 mx-1.5">•</span>
              <strong className="text-emerald-300">{stats.categoriesCount}</strong> categories
              <span className="opacity-50 mx-1.5">•</span>
              Row click karo details ke liye • Har receipt print ho sakta
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button onClick={openNewForm} className="h-11 px-4 rounded-xl bg-white text-rose-700 hover:bg-rose-50 text-sm font-extrabold inline-flex items-center gap-1.5 shadow-lg transition">
              <Plus className="h-4 w-4" /> Naya Expense
            </button>
            <button onClick={() => setShowTeacher(true)} className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition">
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
            </button>
            <button onClick={() => refetch()} disabled={isRefetching} className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button onClick={downloadFullPDF} disabled={filteredExpenses.length === 0} className="h-11 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg disabled:opacity-50 transition">
              <FileDown className="h-4 w-4" /> <span className="hidden sm:inline">Full PDF</span>
            </button>
            <button onClick={exportCSV} disabled={filteredExpenses.length === 0} className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition">
              <Download className="h-4 w-4" /> <span className="hidden sm:inline">CSV</span>
            </button>
          </div>
        </div>
        <div className="relative mt-3 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center">
          <Kbd>/</Kbd><span className="text-white/60">Search</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>N</Kbd><span className="text-white/60">Naya</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>T</Kbd><span className="text-white/60">Guide</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>Esc</Kbd><span className="text-white/60">Band</span>
        </div>
      </section>

      {/* ═══ KPIs ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 print:hidden">
        <Kpi icon={TrendingDown} tone="rose" label="Total Spent" value={formatPKR(stats.total)} sub={`${period.toUpperCase()} period`} highlight />
        <Kpi icon={Activity} tone="blue" label="Entries" value={stats.count} sub={`Avg: ${formatPKR(stats.avg)}`} />
        <Kpi icon={AlertTriangle} tone="amber" label="Highest" value={stats.highest ? formatPKR(stats.highest.amount) : '—'} sub={(stats.highest?.description || 'N/A').slice(0, 20)} />
        <Kpi icon={PieIcon} tone="violet" label="Categories" value={stats.categoriesCount} sub="Different types" />
      </section>

      {/* ═══ PERIOD PILLS + CUSTOM RANGE ═══ */}
      <section className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 p-3 print:hidden">
        <div className="flex gap-1 sm:gap-2 flex-wrap">
          {(['today', 'week', 'month', 'year', 'all', 'custom'] as PeriodFilter[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition inline-flex items-center gap-1.5 ${
                period === p
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {p === 'custom' && <Calendar className="h-3 w-3" />}
              {p === 'today' ? 'Aaj' : p === 'week' ? 'Hafta' : p === 'month' ? 'Mahina' : p === 'year' ? 'Saal' : p === 'all' ? 'Sab' : 'Custom'}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="mt-3 grid sm:grid-cols-[1fr_1fr_auto] gap-2 sm:items-end p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-extrabold text-rose-700 dark:text-rose-300 mb-1">From Date</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 transition"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-extrabold text-rose-700 dark:text-rose-300 mb-1">To Date</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 transition"
              />
            </div>
            {(customFrom || customTo) && (
              <button
                onClick={() => { setCustomFrom(''); setCustomTo(''); }}
                className="h-10 px-3 rounded-lg bg-white dark:bg-slate-800 border-2 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-extrabold hover:bg-rose-100 dark:hover:bg-rose-500/20 transition inline-flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
        )}
      </section>

      {/* ═══ CHARTS ═══ */}
      {filteredExpenses.length > 0 && (
        <section className="grid lg:grid-cols-[1fr_1.3fr] gap-4 sm:gap-5">
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Category Breakdown</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Kis pe zyada kharcha</p>
              </div>
              <PieIcon className="h-5 w-5 text-rose-500 dark:text-rose-400" />
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryBreakdown} cx="50%" cy="45%" outerRadius={90} innerRadius={50} dataKey="value" label={(e: any) => `${((e.value / stats.total) * 100).toFixed(0)}%`} labelLine={false}>
                    {categoryBreakdown.map((entry, idx) => (<Cell key={`cell-${idx}`} fill={entry.color} />))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">6-Month Trend</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Monthly expense pattern</p>
              </div>
              <BarChart3 className="h-5 w-5 text-rose-500 dark:text-rose-400" />
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend}>
                  <defs>
                    <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                  <Bar dataKey="total" fill="url(#expGrad)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {/* ═══ FILTERS + LIST ═══ */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b-2 border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Sab Expenses ({filteredExpenses.length})
              {hasFilters && <span className="ml-1 text-xs font-bold text-rose-700 dark:text-rose-400">• filtered</span>}
            </h3>
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Description/vendor/custom dhundo... (/)"
                className="h-9 w-64 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-rose-500 transition"
              />
            </div>
          </div>
          <div className="flex gap-1 flex-wrap items-center">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-extrabold mr-1">Category:</span>
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition ${
                categoryFilter === 'all' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All ({filteredByPeriod.length})
            </button>
            {CATEGORIES.map((c) => {
              const count = filteredByPeriod.filter((e: any) => e.category === c.value).length;
              if (count === 0) return null;
              const Icon = c.icon;
              return (
                <button
                  key={c.value}
                  onClick={() => setCategoryFilter(c.value)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition inline-flex items-center gap-1 ${
                    categoryFilter === c.value
                      ? `${c.tone} ring-2 ring-rose-200 dark:ring-rose-500/40`
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon className="h-2.5 w-2.5" />
                  {c.label}
                  <span className="px-1 rounded-full text-[9px] bg-white/30 dark:bg-black/20">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block h-10 w-10 rounded-full border-4 border-rose-200 dark:border-rose-800 border-t-rose-600 dark:border-t-rose-400 animate-spin" />
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-12 sm:p-16 text-center">
            <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-rose-100 to-red-200 dark:from-rose-500/20 dark:to-red-500/20 flex items-center justify-center shadow-inner">
              <Receipt className="h-9 w-9 text-rose-600 dark:text-rose-400" />
            </div>
            <h4 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
              {hasFilters ? 'Kuch nahi mila' : 'Abhi koi expense nahi'}
            </h4>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 font-semibold max-w-md mx-auto">
              {hasFilters ? 'Filter change karke dekho' : 'Business ke sab kharche track karo — har entry ka receipt print aur voucher generate hota hai.'}
            </p>
            {hasFilters ? (
              <Button variant="secondary" className="mt-4" onClick={() => { setSearch(''); setCategoryFilter('all'); setPeriod('all'); setCustomFrom(''); setCustomTo(''); }}>
                <X className="h-4 w-4" /> Filter hatao
              </Button>
            ) : (
              <button onClick={openNewForm} className="mt-4 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-sm font-extrabold shadow-lg shadow-rose-500/30 inline-flex items-center gap-2">
                <Plus className="h-4 w-4" /> Pehla Expense Add Karo
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y-2 divide-slate-100 dark:divide-slate-800 max-h-[700px] overflow-y-auto">
            {filteredExpenses.map((exp: any) => {
              const cfg = getCategoryConfig(exp.category);
              const Icon = cfg.icon;
              const catName = displayCategoryName(exp);
              return (
                <div
                  key={exp.id}
                  onClick={() => setDetailExpense(exp)}
                  className="px-5 sm:px-6 py-4 hover:bg-rose-50/50 dark:hover:bg-rose-500/10 transition group cursor-pointer relative"
                  title="Click for full details"
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${cfg.color} text-white flex items-center justify-center shadow-lg shrink-0`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base line-clamp-1">{exp.description}</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold ${cfg.tone}`}>
                              <Icon className="h-2.5 w-2.5" />
                              {catName}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1 flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(exp.date || exp.createdAt)}</span>
                            {exp.vendor && (<><span className="opacity-50">•</span><span className="inline-flex items-center gap-1"><Store className="h-3 w-3" />{exp.vendor}</span></>)}
                            <span className="opacity-50">•</span>
                            <span className="inline-flex items-center gap-1"><Wallet className="h-3 w-3" />{PAYMENT_METHODS.find(p => p.value === exp.paymentMethod)?.label || 'CASH'}</span>
                            {exp.reference && (<><span className="opacity-50">•</span><span className="inline-flex items-center gap-1 font-mono text-[10px]">#{exp.reference}</span></>)}
                          </div>
                          {exp.notes && (
                            <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 italic font-semibold line-clamp-1">📝 {exp.notes}</div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="text-xl sm:text-2xl font-extrabold text-rose-700 dark:text-rose-400 tabular-nums">
                            −{formatPKR(exp.amount)}
                          </div>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => setDetailExpense(exp)} className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-500/30 flex items-center justify-center transition" title="View details">
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => printReceipt(exp)} className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 flex items-center justify-center transition" title="Print thermal receipt">
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => duplicateExpense(exp)} className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-500/30 flex items-center justify-center transition" title="Duplicate">
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => openEditForm(exp)} className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-500/30 flex items-center justify-center transition" title="Edit">
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => confirmDelete(exp)} className="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-500/30 flex items-center justify-center transition" title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300 dark:text-slate-600 shrink-0 self-center opacity-0 group-hover:opacity-100 transition" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredExpenses.length > 0 && (
          <div className="px-5 sm:px-6 py-4 border-t-2 border-slate-100 dark:border-slate-800 bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-500/10 dark:to-red-500/10 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest font-extrabold text-slate-600 dark:text-slate-400">Grand Total</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-rose-700 dark:text-rose-400 tabular-nums">−{formatPKR(stats.total)}</div>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold text-right">
              <div>{stats.count} entries • {stats.categoriesCount} categories</div>
              <div className="mt-0.5">Avg: <strong className="text-slate-700 dark:text-slate-200">{formatPKR(stats.avg)}</strong></div>
            </div>
          </div>
        )}
      </section>

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 12mm 10mm; }
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
   EXPENSE DETAIL MODAL — Full detailed view
   ═════════════════════════════════════════════════════════════ */
function ExpenseDetailModal({ expense, onClose, onEdit, onDelete, onPrint, onDuplicate, displayCategoryName }: any) {
  const cfg = getCategoryConfig(expense.category);
  const Icon = cfg.icon;
  const catName = displayCategoryName(expense);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-violet-300 dark:border-violet-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-5 py-4 bg-gradient-to-br ${cfg.color} text-white relative overflow-hidden top-0 z-10`}>
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/20 blur-2xl pointer-events-none" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-extrabold border border-white/30 mb-2">
                <Icon className="h-3 w-3" />
                {catName}
              </div>
              <h3 className="text-lg font-extrabold leading-tight line-clamp-2">{expense.description}</h3>
              <div className="text-xs text-white/80 mt-1 font-semibold flex items-center gap-2 flex-wrap">
                <Clock className="h-3 w-3" />
                {formatDateTime(expense.createdAt)}
                <span className="opacity-60">•</span>
                {formatRelative(expense.createdAt)}
              </div>
            </div>
            <button onClick={onClose} className="h-8 w-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Amount hero */}
          <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-500/10 dark:to-red-500/10 border-2 border-rose-200 dark:border-rose-500/40 p-4 text-center">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-rose-700 dark:text-rose-300">Total Amount</div>
            <div className="text-4xl font-extrabold text-rose-700 dark:text-rose-400 tabular-nums mt-1">
              −{formatPKR(expense.amount)}
            </div>
          </div>

          {/* Voucher ID */}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-widest font-extrabold text-slate-500 dark:text-slate-400">Voucher #</div>
              <div className="font-mono text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">{(expense.id || '').slice(-8).toUpperCase()}</div>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(expense.id || ''); toast.success('ID copied'); }}
              className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-700 flex items-center justify-center transition"
              title="Copy ID"
            >
              <Copy className="h-3.5 w-3.5 text-slate-500" />
            </button>
          </div>

          {/* Details */}
          <div className="rounded-xl bg-white dark:bg-slate-800/40 border-2 border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
            <DetailRow icon={Calendar} label="Expense Date" value={formatDate(expense.date || expense.createdAt)} />
            <DetailRow icon={Tag} label="Category" value={catName} />
            <DetailRow icon={Wallet} label="Payment Method" value={PAYMENT_METHODS.find(p => p.value === expense.paymentMethod)?.label || expense.paymentMethod || 'CASH'} />
            {expense.vendor && <DetailRow icon={Store} label="Vendor / Payee" value={expense.vendor} />}
            {expense.reference && <DetailRow icon={FileText} label="Reference / Bill #" value={expense.reference} mono />}
            {expense.createdBy?.fullName && <DetailRow icon={UserIcon} label="Recorded By" value={expense.createdBy.fullName} />}
            <DetailRow icon={Clock} label="Entry Time" value={formatDateTime(expense.createdAt)} />
          </div>

          {/* Notes */}
          {expense.notes && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3">
              <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-700 dark:text-amber-300 mb-1">📝 Notes</div>
              <p className="text-sm text-slate-700 dark:text-slate-200 font-semibold whitespace-pre-wrap break-words">{expense.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onPrint}
              className="h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition"
            >
              <Printer className="h-4 w-4" /> Print Receipt
            </button>
            <button
              onClick={onDuplicate}
              className="h-11 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 transition"
            >
              <Copy className="h-4 w-4" /> Duplicate
            </button>
            <button
              onClick={onEdit}
              className="h-11 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 transition"
            >
              <Edit3 className="h-4 w-4" /> Edit
            </button>
            <button
              onClick={onDelete}
              className="h-11 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 shadow-lg shadow-rose-500/30 transition"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, mono }: any) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs font-extrabold uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-sm font-extrabold text-slate-900 dark:text-white text-right break-words min-w-0 ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   EXPENSE FORM MODAL — with custom category + custom date
   ═════════════════════════════════════════════════════════════ */
function ExpenseFormModal({ form, setForm, editingId, onClose, onSubmit, loading, amountRef }: any) {
  const isOther = form.category === 'OTHER';
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-rose-200 dark:border-rose-500/30 bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-500/15 dark:to-red-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-rose-900 dark:text-rose-200 flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {editingId ? 'Expense Edit Karo' : 'Naya Expense Add Karo'}
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Category picker */}
          <div>
            <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-2">Category *</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                const active = form.category === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setForm({ ...form, category: c.value })}
                    className={`p-2.5 rounded-xl border-2 transition text-left ${
                      active
                        ? `bg-gradient-to-br ${c.color} text-white border-transparent shadow-md`
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-rose-300 dark:hover:border-rose-500/50'
                    }`}
                  >
                    <Icon className="h-4 w-4 mb-1" />
                    <div className="text-[10px] font-extrabold leading-tight">{c.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom category name when OTHER selected */}
          {isOther && (
            <div className="rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10 border-2 border-violet-200 dark:border-violet-500/40 p-3">
              <label className="block text-sm font-extrabold text-violet-900 dark:text-violet-200 mb-1.5 items-center gap-1.5">
                <Sparkles className="h-4 w-4" />
                Custom Category Name *
              </label>
              <input
                type="text"
                value={form.customCategory}
                onChange={(e) => setForm({ ...form, customCategory: e.target.value })}
                placeholder="e.g., Zakat, Charity, Tax, Insurance..."
                maxLength={40}
                className="h-11 w-full rounded-xl border-2 border-violet-200 dark:border-violet-500/40 bg-white dark:bg-slate-800 px-4 text-sm font-extrabold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition"
              />
              <div className="text-[10px] text-violet-700 dark:text-violet-300 mt-1 font-semibold">
                💡 Aap apna category name likh sakte ho — reports me isi naam se dikhega
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">Amount (PKR) *</label>
              <input
                ref={amountRef}
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="5000"
                className="h-12 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-lg font-extrabold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500 transition tabular-nums"
              />
            </div>
            <div>
              <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5 items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Expense Date *
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="h-12 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-extrabold text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 transition"
              />
              <div className="flex gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, date: new Date().toISOString().slice(0, 10) })}
                  className="text-[10px] font-extrabold text-rose-700 dark:text-rose-400 hover:underline"
                >
                  Aaj
                </button>
                <span className="text-[10px] text-slate-400">•</span>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(); d.setDate(d.getDate() - 1);
                    setForm({ ...form, date: d.toISOString().slice(0, 10) });
                  }}
                  className="text-[10px] font-extrabold text-rose-700 dark:text-rose-400 hover:underline"
                >
                  Kal
                </button>
                <span className="text-[10px] text-slate-400">•</span>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(); d.setDate(1);
                    setForm({ ...form, date: d.toISOString().slice(0, 10) });
                  }}
                  className="text-[10px] font-extrabold text-rose-700 dark:text-rose-400 hover:underline"
                >
                  Month start
                </button>
              </div>
            </div>
          </div>

          <Input
            label="Description *"
            value={form.description}
            onChange={(e: any) => setForm({ ...form, description: e.target.value })}
            placeholder="Shop rent for August 2026"
          />

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">Payment Method</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 transition"
              >
                {PAYMENT_METHODS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <Input label="Vendor / Payee" value={form.vendor} onChange={(e: any) => setForm({ ...form, vendor: e.target.value })} placeholder="ABC Suppliers" />
          </div>

          <Input
            label="Reference / Bill #"
            value={form.reference}
            onChange={(e: any) => setForm({ ...form, reference: e.target.value })}
            placeholder="INV-2026-001 or cheque number"
          />

          <div>
            <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              placeholder="Extra details, warranty info, etc."
              className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-rose-500 transition resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              <X className="h-4 w-4" /> Cancel
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 font-extrabold shadow-lg shadow-rose-500/30"
              onClick={onSubmit}
              loading={loading}
            >
              <CheckCircle2 className="h-4 w-4" /> {editingId ? 'Update' : 'Save'} Expense
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   EXPENSES TEACHER
   ═════════════════════════════════════════════════════════════ */
function ExpensesTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-rose-200 dark:border-rose-500/30 bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-500/15 dark:to-red-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-rose-900 dark:text-rose-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Expenses — Guide
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            <strong>Expense tracking = profit ka raaz.</strong> Sales badhne se profit nahi barhta — kharche control karne se barhta hai.
          </p>

          <div className="rounded-2xl border-2 border-violet-200 dark:border-violet-500/30 bg-violet-50/60 dark:bg-violet-500/5 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-violet-700 dark:text-violet-300 flex items-center gap-1">
              <Eye className="h-3 w-3" /> Naye Features (v4)
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-500/30 p-2">
                🔍 <strong>Detail View:</strong> Kisi bhi row pe click karo → full details modal khulta hai — voucher #, poori info, notes, print/edit/delete actions.
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-500/30 p-2">
                🎨 <strong>Custom Category:</strong> "Other" select karo → apni marzi ka naam do (Zakat, Charity, Tax, Insurance, kuch bhi). Reports me isi naam se dikhega.
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-500/30 p-2">
                📅 <strong>Custom Date Range:</strong> Period me "Custom" chuno → From/To dates apni marzi. Exact date range ka filter.
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-500/30 p-2">
                ⚡ <strong>Quick date shortcuts:</strong> Form me "Aaj", "Kal", "Month start" — one click date set.
              </div>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/5 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
              <Printer className="h-3 w-3" /> Print Features
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-500/30 p-2">
                🧾 <strong>Individual Receipt (80mm):</strong> Har expense ke 🖨️ button se POS thermal printer pe voucher print — vendor ko diya ja sakta hai.
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-500/30 p-2">
                📄 <strong>Full PDF Report:</strong> "Full PDF" button — poori list ka A4 professional PDF (signature blocks + grand total + category breakdown).
              </div>
              <div className="rounded-lg bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-500/30 p-2">
                📊 <strong>CSV Export:</strong> Excel me deep analysis ke liye.
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>📅 Same-day entry</strong> — Kharcha hote hi likh do. Kal bhool jaoge.</TipRow>
            <TipRow><strong>🧾 Reference number zaroor</strong> — Bill/invoice number likho. Audit ke waqt kaam ata hai.</TipRow>
            <TipRow><strong>🏪 Vendor name</strong> — Repeat vendors ka spending pattern samajh me aata hai.</TipRow>
            <TipRow><strong>🔄 Duplicate feature</strong> — Rent/salaries monthly same. Copy karo, date change karo.</TipRow>
            <TipRow><strong>💡 30% rule</strong> — Revenue ka {'<'}30% expenses hon. Zyada = margin problem.</TipRow>
            <TipRow><strong>🎨 Custom category use</strong> — Zakat, Charity, Insurance, Tax jaise special expenses ke liye.</TipRow>
          </div>

          <div className="rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30 p-3 text-xs font-semibold text-violet-800 dark:text-violet-200">
            💡 <strong>Pro tip:</strong> Month end pe "Full PDF" download karke file me rakho. Sal ke end tax filing trivial ho jata hai.
          </div>

          <Button
            className="w-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 font-extrabold shadow-lg shadow-rose-500/40 h-12"
            onClick={onClose}
          >
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya — Track Karo!
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

function Sparkles({ className }: any) {
  return <span className={className}>✨</span>;
}

function Kpi({ icon: Icon, label, value, sub, tone, highlight }: any) {
  const tones: Record<string, string> = {
    rose: 'from-rose-500 to-red-700 shadow-rose-500/40',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/40',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
    violet: 'from-violet-500 to-purple-700 shadow-violet-500/40',
  };
  return (
    <div className={`rounded-2xl border-2 p-3 sm:p-4 shadow-sm transition ${
      highlight
        ? `bg-gradient-to-br ${tones[tone]} text-white border-transparent shadow-lg`
        : 'bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-slate-200 dark:border-slate-800'
    }`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className={`text-[10px] uppercase tracking-widest font-extrabold ${highlight ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>{label}</div>
          <div className={`mt-1.5 text-lg sm:text-xl lg:text-2xl font-extrabold tabular-nums truncate ${highlight ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{value}</div>
          {sub && <div className={`text-[10px] font-bold mt-0.5 truncate ${highlight ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
          highlight ? 'bg-white/20 backdrop-blur text-white' : `bg-gradient-to-br ${tones[tone]} text-white shadow-lg`
        }`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
