import { useState, useMemo, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Receipt, Plus, Trash2, Search, TrendingDown,
  Calendar, Tag, X, RefreshCw,
  Download, Printer, GraduationCap, CheckCircle2, AlertTriangle,
  Wallet, PieChart as PieIcon, Activity, Copy,
  BarChart3, ChevronRight, Clock, FileDown, Eye,
  Settings2, FileText, Zap, Sparkles, Flame,
  CalendarRange, CalendarDays,
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  expensesApi, expenseCategoriesApi,
  type Expense, type ExpenseCategory,
} from '@modules/finance/expenses/api/expenses.api';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   NAFAA EXPENSES — BILLION-$ GRADE v7
   ─────────────────────────────────────────────────────────────
   🖨️ PRINT — A4 clean layout OR 80mm thermal (dono working)
   📄 PDF   — sahi complete pages, colored, signature blocks
   📅 CUSTOM DATE RANGE — apni marzi ka from-to select karo
   🧾 Har expense ka clean thermal receipt
   ⚡ Quick Add • 🪄 Auto-Setup • 🎓 Teacher • 🌙 Dark mode
   ═════════════════════════════════════════════════════════════ */

const PAYMENT_METHODS = [
  { value: 'CASH', label: '💵 Cash' },
  { value: 'CARD', label: '💳 Card' },
  { value: 'JAZZCASH', label: '📱 JazzCash' },
  { value: 'EASYPAISA', label: '📲 EasyPaisa' },
  { value: 'BANK_TRANSFER', label: '🏦 Bank' },
] as const;

const CAT_COLORS = [
  '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444',
  '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
  '#84cc16', '#d946ef', '#64748b', '#dc2626', '#0ea5e9',
];

const CAT_EMOJIS = ['💸', '🏠', '⚡', '👷', '📦', '🚗', '🔧', '📢', '🌐', '☕', '🏥', '📚', '🧾', '🛡️', '⛽', '🎯'];

const DEFAULT_CATEGORIES: Array<{ name: string; icon: string; color: string }> = [
  { name: 'Kiraya (Rent)',      icon: '🏠', color: '#f59e0b' },
  { name: 'Bijli / Bills',      icon: '⚡', color: '#3b82f6' },
  { name: 'Salary / Wages',     icon: '👷', color: '#8b5cf6' },
  { name: 'Stock Purchase',     icon: '📦', color: '#10b981' },
  { name: 'Transport',          icon: '🚗', color: '#06b6d4' },
  { name: 'Chai-Pani / Khana',  icon: '☕', color: '#f97316' },
  { name: 'Maintenance',        icon: '🔧', color: '#64748b' },
  { name: 'Marketing / Ads',    icon: '📢', color: '#ec4899' },
];

const QUICK_PRESETS: Array<{ title: string; catName: string; icon: string; hint: string }> = [
  { title: 'Chai-Pani',            catName: 'Chai-Pani / Khana',  icon: '☕', hint: 'Daily chai, nashta' },
  { title: 'Bijli ka Bill',        catName: 'Bijli / Bills',      icon: '⚡', hint: 'Monthly electricity' },
  { title: 'Dukaan ka Kiraya',     catName: 'Kiraya (Rent)',      icon: '🏠', hint: 'Monthly rent' },
  { title: 'Staff Salary',         catName: 'Salary / Wages',     icon: '👷', hint: 'Monthly salary' },
  { title: 'Petrol / Transport',   catName: 'Transport',          icon: '⛽', hint: 'Delivery, pickup' },
  { title: 'Packing Material',     catName: 'Stock Purchase',     icon: '📦', hint: 'Shoppers, tape...' },
  { title: 'Internet / Mobile',    catName: 'Bijli / Bills',      icon: '🌐', hint: 'WiFi, easyload' },
  { title: 'Repair / Maintenance', catName: 'Maintenance',        icon: '🔧', hint: 'Kaam karwana' },
];

const paymentLabel = (v: string) =>
  PAYMENT_METHODS.find((p) => p.value === v)?.label ?? v;

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const formatDate = (v: string | Date) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v));
const formatDateTime = (v: string | Date) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));
const formatShortDate = (v: string | Date) =>
  new Intl.DateTimeFormat('en-PK', { day: '2-digit', month: 'short' }).format(new Date(v));
const formatRelative = (v: string) => {
  const diff = Math.floor((Date.now() - new Date(v).getTime()) / 1000);
  if (diff < 60) return 'Abhi abhi';
  if (diff < 3600) return `${Math.floor(diff / 60)} min pehle`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ghante pehle`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} din pehle`;
  return formatDate(v);
};

function dateGroupLabel(v: string): string {
  const d = new Date(v);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const itemDay = new Date(d); itemDay.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - itemDay.getTime()) / 86400000);
  if (diffDays === 0) return 'Aaj';
  if (diffDays === 1) return 'Kal';
  if (diffDays <= 7) return 'Is Hafte';
  if (diffDays <= 30) return 'Is Mahine';
  return 'Purane';
}
const GROUP_ORDER = ['Aaj', 'Kal', 'Is Hafte', 'Is Mahine', 'Purane'];

type PeriodFilter = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';

const toDateInput = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const emptyForm = {
  title: '',
  amount: '',
  categoryId: '',
  paymentMethod: 'CASH',
  description: '',
};

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const shopName = useAuthStore((s: any) => s.user?.assignedShop?.name || s.tenant?.name || 'Nafaa POS');
  const shopPhone = useAuthStore((s: any) => s.user?.assignedShop?.phone || s.tenant?.phone || '');
  const shopAddress = useAuthStore((s: any) => s.user?.assignedShop?.address || s.tenant?.address || '');

  const searchRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [period, setPeriod] = useState<PeriodFilter>('month');

  // 📅 Custom range
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [customFrom, setCustomFrom] = useState<string>(toDateInput(monthStart));
  const [customTo, setCustomTo] = useState<string>(toDateInput(today));

  const [showTeacher, setShowTeacher] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showCatManager, setShowCatManager] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);
  const [detailExpense, setDetailExpense] = useState<Expense | null>(null);

  /* ─── Data ─── */
  const { data: expenses = [], isLoading, refetch, isRefetching } = useQuery<Expense[]>({
    queryKey: ['expenses'],
    queryFn: () => expensesApi.list(),
  });

  const { data: categories = [] } = useQuery<ExpenseCategory[]>({
    queryKey: ['expense-categories'],
    queryFn: () => expenseCategoriesApi.list(),
  });

  const { data: summary } = useQuery({
    queryKey: ['expenses-summary'],
    queryFn: () => expensesApi.summary(),
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => expensesApi.create(payload),
    onSuccess: () => {
      toast.success('Expense record ho gaya ✅');
      setForm(emptyForm);
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save nahi hua'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expensesApi.remove(id),
    onSuccess: () => {
      toast.success('Expense delete ho gaya');
      setDetailExpense(null);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete nahi hua'),
  });

  /* ─── Category helpers ─── */
  const catById = useMemo(() => {
    const m = new Map<string, ExpenseCategory>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  const catOf = (e: Expense) => {
    const cid = (e as any).categoryId;
    return e.category ?? (cid ? catById.get(cid) ?? null : null);
  };
  const catName = (e: Expense) => catOf(e)?.name || 'General';
  const catColor = (e: Expense) => catOf(e)?.color || '#64748b';
  const catIcon = (e: Expense) => catOf(e)?.icon || '💸';

  const catByName = useMemo(() => {
    const m = new Map<string, ExpenseCategory>();
    for (const c of categories) m.set(c.name.toLowerCase(), c);
    return m;
  }, [categories]);

  /* ─── Period filter ─── */
  const { periodStart, periodEnd, periodLabel } = useMemo(() => {
    const now = new Date();
    const end = new Date(); end.setHours(23, 59, 59, 999);
    let start = new Date(0);
    let label = 'All Time';

    if (period === 'today') {
      start = new Date(); start.setHours(0, 0, 0, 0);
      label = `Aaj — ${formatDate(now)}`;
    } else if (period === 'week') {
      start = new Date(); start.setDate(start.getDate() - 7); start.setHours(0, 0, 0, 0);
      label = `Pichlay 7 Din (${formatShortDate(start)} — ${formatShortDate(now)})`;
    } else if (period === 'month') {
      start = new Date(); start.setDate(start.getDate() - 30); start.setHours(0, 0, 0, 0);
      label = `Pichlay 30 Din (${formatShortDate(start)} — ${formatShortDate(now)})`;
    } else if (period === 'year') {
      start = new Date(); start.setFullYear(start.getFullYear() - 1); start.setHours(0, 0, 0, 0);
      label = `Pichla 1 Saal (${formatShortDate(start)} — ${formatShortDate(now)})`;
    } else if (period === 'custom') {
      start = new Date(customFrom + 'T00:00:00');
      const cEnd = new Date(customTo + 'T23:59:59');
      label = `${formatDate(start)} — ${formatDate(cEnd)}`;
      return { periodStart: start, periodEnd: cEnd, periodLabel: label };
    }
    return { periodStart: start, periodEnd: end, periodLabel: label };
  }, [period, customFrom, customTo]);

  const filteredByPeriod = useMemo(() => {
    if (period === 'all') return expenses;
    return expenses.filter((e) => {
      const d = new Date(e.expenseDate).getTime();
      return d >= periodStart.getTime() && d <= periodEnd.getTime();
    });
  }, [expenses, period, periodStart, periodEnd]);

  const filtered = useMemo(() => {
    let result = [...filteredByPeriod];
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter((e) =>
        e.title.toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q) ||
        (e.expenseNumber || '').toLowerCase().includes(q) ||
        catName(e).toLowerCase().includes(q),
      );
    }
    if (categoryFilter !== 'all') {
      result = categoryFilter === 'none'
        ? result.filter((e) => !catOf(e))
        : result.filter((e) => catOf(e)?.id === categoryFilter);
    }
    return result
      .filter((e) => e.status !== 'CANCELLED')
      .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredByPeriod, search, categoryFilter, catById]);

  const stats = useMemo(() => {
    const total = filtered.reduce((s, e) => s + Number(e.amount || 0), 0);
    const avg = filtered.length > 0 ? total / filtered.length : 0;
    const highest = filtered.reduce((max: Expense | null, e) => (Number(e.amount) > Number(max?.amount || 0) ? e : max), null);
    const catsUsed = new Set(filtered.map((e) => catOf(e)?.id || 'none')).size;
    return { total, avg, highest, count: filtered.length, catsUsed };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, catById]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; value: number; color: string; count: number }>();
    for (const e of filtered) {
      const c = catOf(e);
      const key = c?.id || 'none';
      const cur = map.get(key) || { name: c?.name || 'General', value: 0, color: c?.color || '#64748b', count: 0 };
      cur.value += Number(e.amount || 0);
      cur.count += 1;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, catById]);

  const topCategory = categoryBreakdown[0];
  const topCategoryPct = topCategory && stats.total > 0 ? Math.round((topCategory.value / stats.total) * 100) : 0;

  const monthlyTrend = useMemo(() => {
    const buckets: Record<string, { label: string; total: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      buckets[key] = { label: d.toLocaleDateString('en-PK', { month: 'short', year: '2-digit' }), total: 0 };
    }
    for (const e of expenses) {
      if (e.status === 'CANCELLED') continue;
      const d = new Date(e.expenseDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (buckets[key]) buckets[key].total += Number(e.amount || 0);
    }
    return Object.values(buckets);
  }, [expenses]);

  const grouped = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of filtered) {
      const g = dateGroupLabel(e.expenseDate);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(e);
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({
      label: g,
      items: map.get(g)!,
      total: map.get(g)!.reduce((s, e) => s + Number(e.amount || 0), 0),
    }));
  }, [filtered]);

  /* ─── Actions ─── */
  const openNewForm = () => {
    setForm({ ...emptyForm });
    setShowForm(true);
    setTimeout(() => titleRef.current?.focus(), 100);
  };

  const quickAdd = (preset: (typeof QUICK_PRESETS)[number]) => {
    const cat = catByName.get(preset.catName.toLowerCase());
    setForm({
      ...emptyForm,
      title: preset.title,
      categoryId: cat?.id || '',
    });
    setShowForm(true);
    setTimeout(() => {
      document.querySelector<HTMLInputElement>('[data-expense-amount]')?.focus();
    }, 100);
  };

  const submitForm = () => {
    const title = String(form.title || '').trim();
    const amount = Number(form.amount);
    if (!title) return toast.error('Title likhna zaroori hai');
    if (title.length > 120) return toast.error('Title 120 characters se chhota rakho');
    if (isNaN(amount) || amount <= 0) return toast.error('Sahi amount likho');

    const payload: any = {
      title,
      amount,
      paymentMethod: form.paymentMethod,
    };
    if (form.description?.trim()) payload.description = form.description.trim();
    if (form.categoryId) payload.categoryId = form.categoryId;

    createMutation.mutate(payload);
  };

  const confirmDelete = (e: Expense) => {
    if (confirm(`"${e.title}" (${formatPKR(e.amount)}) delete karein?\n\nYe permanent hai.`)) {
      deleteMutation.mutate(e.id);
    }
  };

  const duplicateExpense = (e: Expense) => {
    setForm({
      title: e.title,
      amount: String(e.amount),
      categoryId: catOf(e)?.id || '',
      paymentMethod: e.paymentMethod || 'CASH',
      description: e.description || '',
    });
    setDetailExpense(null);
    setShowForm(true);
    toast.success('Copy ho gaya — check karke save karo');
    setTimeout(() => titleRef.current?.focus(), 100);
  };

  /* ═════════════════════════════════════════════════════════════
     🧾 CLEAN THERMAL RECEIPT (80mm) — per expense
     ═════════════════════════════════════════════════════════════ */
  const printThermalReceipt = (e: Expense) => {
    const html = `<!doctype html>
<html><head><meta charset="utf-8"/><title>Voucher ${e.expenseNumber}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 80mm; }
  body {
    font-family: 'Courier New', 'Consolas', monospace;
    padding: 5mm 4mm;
    color: #000;
    font-size: 12px;
    line-height: 1.4;
    background: #fff;
  }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: 700; }
  .big { font-size: 14px; }
  .xl { font-size: 16px; font-weight: 800; letter-spacing: 1px; }
  .huge { font-size: 22px; font-weight: 800; letter-spacing: 0.5px; }
  .divider { border-top: 1px dashed #000; margin: 8px 0; }
  .double { border-top: 2px solid #000; margin: 8px 0; }
  .row { display: flex; justify-content: space-between; gap: 8px; margin: 3px 0; align-items: baseline; }
  .row .k { font-weight: 600; }
  .row .v { text-align: right; font-weight: 700; word-break: break-word; }
  .badge {
    display: inline-block;
    border: 1.5px solid #000;
    padding: 3px 10px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1.5px;
    margin: 6px 0;
  }
  .amount-box {
    border: 2.5px solid #000;
    padding: 10px 8px;
    margin: 8px 0;
    text-align: center;
  }
  .amount-box .l { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; margin-bottom: 3px; }
  .desc {
    background: #f5f5f5;
    padding: 6px 8px;
    margin: 6px 0;
    font-size: 11px;
    border-left: 3px solid #000;
    word-break: break-word;
  }
  .sig-block { margin-top: 20px; }
  .sig-line {
    border-bottom: 1px solid #000;
    height: 14px;
    margin: 4px 0 2px;
  }
  .sig-label { font-size: 9px; font-weight: 700; letter-spacing: 1px; }
  .footer { font-size: 9px; line-height: 1.3; margin-top: 10px; }
  @media print { body { padding: 3mm 3mm; } }
</style></head><body>
  <div class="center xl">${escapeHtml(shopName)}</div>
  ${shopAddress ? `<div class="center" style="font-size:10px;margin-top:2px;">${escapeHtml(shopAddress)}</div>` : ''}
  ${shopPhone ? `<div class="center" style="font-size:10px;">Ph: ${escapeHtml(shopPhone)}</div>` : ''}
  <div class="divider"></div>
  <div class="center"><span class="badge">EXPENSE VOUCHER</span></div>

  <div class="row"><span class="k">Voucher #:</span><span class="v">${escapeHtml(e.expenseNumber)}</span></div>
  <div class="row"><span class="k">Date:</span><span class="v">${formatDateTime(e.expenseDate)}</span></div>
  <div class="row"><span class="k">Printed:</span><span class="v">${new Date().toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}</span></div>

  <div class="divider"></div>

  <div class="row"><span class="k">Category:</span><span class="v">${escapeHtml(catIcon(e))} ${escapeHtml(catName(e))}</span></div>
  <div class="row"><span class="k">Payment:</span><span class="v">${escapeHtml(paymentLabel(e.paymentMethod))}</span></div>
  <div class="row"><span class="k">Status:</span><span class="v">${escapeHtml(e.status)}</span></div>

  <div class="divider"></div>

  <div class="bold" style="font-size:11px;">KHARCHA:</div>
  <div style="margin:4px 0;font-size:12px;font-weight:700;word-break:break-word;">${escapeHtml(e.title)}</div>
  ${e.description ? `<div class="desc">${escapeHtml(e.description)}</div>` : ''}

  <div class="amount-box">
    <div class="l">TOTAL AMOUNT</div>
    <div class="huge">${formatPKR(e.amount)}</div>
  </div>

  <div class="double"></div>

  <div class="sig-block">
    <div class="sig-line"></div>
    <div class="row"><span class="sig-label">RECEIVED BY:</span><span></span></div>
  </div>
  <div class="sig-block">
    <div class="sig-line"></div>
    <div class="row"><span class="sig-label">SIGNATURE:</span><span></span></div>
  </div>
  <div class="sig-block">
    <div class="sig-line"></div>
    <div class="row"><span class="sig-label">APPROVED BY:</span><span></span></div>
  </div>

  <div class="divider"></div>
  <div class="center footer">Official expense voucher.<br/>Accounting record ke liye rakhein.</div>
  <div class="center bold" style="margin-top:8px;letter-spacing:2px;">* * SHUKRIYA * *</div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        setTimeout(function() { window.close(); }, 800);
      }, 250);
    };
  </script>
</body></html>`;

    const w = window.open('', '_blank', 'width=400,height=700');
    if (!w) return toast.error('Popup blocked — allow popups!');
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  /* ═════════════════════════════════════════════════════════════
     📄 A4 CLEAN REPORT — Print or Save as PDF
     ═════════════════════════════════════════════════════════════ */
  const printA4Report = () => {
    if (filtered.length === 0) return toast.error('Koi expense nahi is filter me');

    const rowsHtml = filtered.map((e, i) => {
      const c = catOf(e);
      const clr = c?.color || '#64748b';
      const ic = c?.icon || '';
      return `
        <tr>
          <td class="num">${i + 1}</td>
          <td class="date">${formatDate(e.expenseDate)}</td>
          <td class="voucher">${escapeHtml(e.expenseNumber)}</td>
          <td>
            <span class="cat-pill" style="background:${clr}">
              ${ic ? `<span class="ic">${escapeHtml(ic)}</span>` : ''}${escapeHtml(catName(e))}
            </span>
          </td>
          <td class="title">
            <div class="t-main">${escapeHtml(e.title)}</div>
            ${e.description ? `<div class="t-sub">${escapeHtml(e.description.slice(0, 80))}${e.description.length > 80 ? '…' : ''}</div>` : ''}
          </td>
          <td class="pay">${escapeHtml(paymentLabel(e.paymentMethod))}</td>
          <td class="amt">${formatPKR(e.amount)}</td>
        </tr>`;
    }).join('');

    const catRowsHtml = categoryBreakdown.map((c) => {
      const pct = stats.total > 0 ? (c.value / stats.total) * 100 : 0;
      return `
        <tr>
          <td>
            <div class="cat-row">
              <span class="cat-dot" style="background:${c.color}"></span>
              <span class="cat-name">${escapeHtml(c.name)}</span>
            </div>
          </td>
          <td class="c-count">${c.count}</td>
          <td class="c-amt">${formatPKR(c.value)}</td>
          <td class="c-pct">${pct.toFixed(1)}%</td>
          <td>
            <div class="bar-bg">
              <div class="bar-fill" style="width:${pct.toFixed(1)}%;background:${c.color}"></div>
            </div>
          </td>
        </tr>`;
    }).join('');

    const html = `<!doctype html>
<html><head><meta charset="utf-8"/>
<title>Expenses Report — ${escapeHtml(shopName)}</title>
<style>
  @page {
    size: A4;
    margin: 12mm 10mm;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    color: #0f172a;
    font-size: 10.5px;
    line-height: 1.45;
    background: #fff;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* ═══ HEADER ═══ */
  .header {
    background: linear-gradient(135deg, #0f172a 0%, #7f1d1d 50%, #b91c1c 100%);
    color: #fff;
    padding: 18px 20px;
    border-radius: 10px;
    margin-bottom: 14px;
    position: relative;
    overflow: hidden;
  }
  .header::before {
    content: '';
    position: absolute;
    top: -30px; right: -30px;
    width: 140px; height: 140px;
    background: rgba(255,255,255,0.08);
    border-radius: 50%;
  }
  .header-inner { position: relative; display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
  .header h1 {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.5px;
    line-height: 1.1;
    margin-bottom: 4px;
  }
  .header .shop {
    font-size: 12px;
    font-weight: 600;
    opacity: 0.95;
    margin-bottom: 8px;
  }
  .header .meta {
    display: flex;
    gap: 14px;
    font-size: 10px;
    font-weight: 600;
    opacity: 0.9;
    flex-wrap: wrap;
  }
  .header .meta span { display: inline-flex; align-items: center; gap: 4px; }
  .header .badge {
    background: rgba(255,255,255,0.2);
    border: 1.5px solid rgba(255,255,255,0.4);
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1.5px;
  }
  .header .print-info {
    text-align: right;
    font-size: 9.5px;
    opacity: 0.85;
  }

  /* ═══ KPI GRID ═══ */
  .kpis {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 14px;
  }
  .kpi {
    border: 2px solid #e2e8f0;
    border-radius: 9px;
    padding: 10px 12px;
    background: linear-gradient(180deg, #f8fafc 0%, #fff 100%);
    position: relative;
    overflow: hidden;
  }
  .kpi.highlight {
    background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
    border-color: #fca5a5;
  }
  .kpi .l {
    font-size: 8.5px;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 1.3px;
    font-weight: 800;
    margin-bottom: 4px;
  }
  .kpi.highlight .l { color: #991b1b; }
  .kpi .v {
    font-size: 16px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.3px;
  }
  .kpi.highlight .v { color: #991b1b; }
  .kpi .s {
    font-size: 9px;
    color: #94a3b8;
    font-weight: 600;
    margin-top: 2px;
  }

  /* ═══ SECTION TITLE ═══ */
  .section-title {
    font-size: 12px;
    font-weight: 800;
    color: #0f172a;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin: 14px 0 8px;
    padding-bottom: 6px;
    border-bottom: 2.5px solid #0f172a;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* ═══ TABLE ═══ */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9.5px;
    border-radius: 8px;
    overflow: hidden;
  }
  thead th {
    background: #0f172a;
    color: #fff;
    padding: 8px 6px;
    text-align: left;
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
    white-space: nowrap;
  }
  thead th.r { text-align: right; }
  tbody td {
    padding: 7px 6px;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: middle;
  }
  tbody tr:nth-child(even) td { background: #f8fafc; }
  tbody tr:hover td { background: #eef2ff; }

  td.num { width: 3%; color: #94a3b8; font-weight: 700; text-align: center; }
  td.date { width: 10%; font-weight: 600; color: #475569; }
  td.voucher { width: 12%; font-family: 'Courier New', monospace; font-size: 9px; color: #64748b; font-weight: 700; }
  td.pay { width: 12%; font-size: 9px; color: #475569; font-weight: 600; }
  td.amt {
    width: 12%;
    text-align: right;
    font-weight: 800;
    color: #b91c1c;
    font-size: 10.5px;
    white-space: nowrap;
  }
  td.title .t-main { font-weight: 700; color: #0f172a; margin-bottom: 1px; }
  td.title .t-sub { font-size: 8.5px; color: #64748b; font-style: italic; }

  .cat-pill {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 3px 7px;
    border-radius: 4px;
    color: #fff;
    font-size: 8.5px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
  }
  .cat-pill .ic { font-size: 10px; }

  /* ═══ GRAND TOTAL ═══ */
  tr.grand td {
    background: linear-gradient(135deg, #0f172a, #7f1d1d) !important;
    color: #fff !important;
    font-weight: 800;
    font-size: 13px;
    padding: 10px 6px;
    border-top: 3px solid #0f172a;
  }
  tr.grand td.amt { color: #fca5a5 !important; font-size: 15px; }

  /* ═══ CATEGORY BREAKDOWN ═══ */
  .cats-section {
    margin-top: 14px;
    page-break-inside: avoid;
  }
  .cat-table th { background: #7f1d1d; }
  .cat-row { display: flex; align-items: center; gap: 6px; }
  .cat-dot {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    display: inline-block;
  }
  .cat-name { font-weight: 700; color: #0f172a; }
  .c-count { text-align: center; font-weight: 700; color: #64748b; width: 10%; }
  .c-amt { text-align: right; font-weight: 800; color: #b91c1c; width: 15%; }
  .c-pct { text-align: right; font-weight: 700; color: #475569; width: 10%; }
  .bar-bg {
    width: 100%;
    height: 10px;
    background: #f1f5f9;
    border-radius: 5px;
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    border-radius: 5px;
  }

  /* ═══ INSIGHT BOX ═══ */
  .insight {
    margin-top: 12px;
    padding: 10px 14px;
    border-radius: 8px;
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    border: 2px solid #f59e0b;
    display: flex;
    align-items: center;
    gap: 10px;
    page-break-inside: avoid;
  }
  .insight-icon {
    width: 32px; height: 32px;
    border-radius: 50%;
    background: #f59e0b;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: 800;
    flex-shrink: 0;
  }
  .insight-text {
    font-size: 10.5px;
    color: #78350f;
    font-weight: 700;
    line-height: 1.5;
  }
  .insight-text strong { color: #451a03; }

  /* ═══ SIGNATURES ═══ */
  .sigs {
    margin-top: 30px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    page-break-inside: avoid;
  }
  .sig {
    text-align: center;
    font-size: 10px;
    font-weight: 700;
    color: #475569;
  }
  .sig .line {
    border-top: 1.5px solid #0f172a;
    width: 100%;
    margin: 32px auto 6px;
  }
  .sig .role {
    text-transform: uppercase;
    letter-spacing: 1.2px;
    font-size: 9px;
    color: #64748b;
  }

  /* ═══ FOOTER ═══ */
  .footer {
    margin-top: 20px;
    padding-top: 10px;
    border-top: 2px solid #0f172a;
    font-size: 8.5px;
    color: #64748b;
    text-align: center;
    line-height: 1.5;
  }
  .footer strong { color: #0f172a; font-weight: 800; }

  @media print {
    body { padding: 0; }
    .header, .kpis, .cats-section, .insight, .sigs { break-inside: avoid; }
    tr, td, th { break-inside: avoid; }
  }
</style></head><body>
  <!-- ═══ HEADER ═══ -->
  <div class="header">
    <div class="header-inner">
      <div>
        <div class="badge">Expenses Report</div>
        <h1 style="margin-top:8px;">📊 Kharcha Report</h1>
        <div class="shop">🏪 ${escapeHtml(shopName)}${shopAddress ? ` • ${escapeHtml(shopAddress)}` : ''}</div>
        <div class="meta">
          <span>📅 <strong>Period:</strong> ${escapeHtml(periodLabel)}</span>
          ${categoryFilter !== 'all' && categoryFilter !== 'none' ? `<span>🏷️ <strong>Category:</strong> ${escapeHtml(categories.find(c => c.id === categoryFilter)?.name || 'All')}</span>` : ''}
          ${search ? `<span>🔍 <strong>Search:</strong> "${escapeHtml(search)}"</span>` : ''}
        </div>
      </div>
      <div class="print-info">
        <div><strong>Generated:</strong></div>
        <div>${new Date().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</div>
      </div>
    </div>
  </div>

  <!-- ═══ KPIs ═══ -->
  <div class="kpis">
    <div class="kpi highlight">
      <div class="l">💸 Total Spent</div>
      <div class="v">${formatPKR(stats.total)}</div>
      <div class="s">Grand total (Rs)</div>
    </div>
    <div class="kpi">
      <div class="l">📝 Entries</div>
      <div class="v">${stats.count}</div>
      <div class="s">${stats.catsUsed} categories</div>
    </div>
    <div class="kpi">
      <div class="l">📊 Average</div>
      <div class="v">${formatPKR(stats.avg)}</div>
      <div class="s">Per entry</div>
    </div>
    <div class="kpi">
      <div class="l">🔥 Highest</div>
      <div class="v">${stats.highest ? formatPKR(stats.highest.amount) : '—'}</div>
      <div class="s">${stats.highest ? escapeHtml(stats.highest.title.slice(0, 22)) : 'N/A'}</div>
    </div>
  </div>

  <!-- ═══ INSIGHT ═══ -->
  ${topCategory && stats.total > 0 ? `
    <div class="insight">
      <div class="insight-icon">💡</div>
      <div class="insight-text">
        <strong>Sab se bara kharcha:</strong> ${escapeHtml(topCategory.name)} —
        <strong>${formatPKR(topCategory.value)}</strong>
        (${topCategoryPct}% of total, ${topCategory.count} entries).
        ${topCategoryPct >= 40 ? '<br/>⚠️ Ye 40%+ hai — is category pe control zaroori.' : ''}
      </div>
    </div>
  ` : ''}

  <!-- ═══ EXPENSE TABLE ═══ -->
  <div class="section-title">📋 Complete Expense Ledger</div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Date</th>
        <th>Voucher</th>
        <th>Category</th>
        <th>Kharcha / Description</th>
        <th>Payment</th>
        <th class="r">Amount (Rs)</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr class="grand">
        <td colspan="6" style="text-align:right;padding-right:14px;">GRAND TOTAL</td>
        <td class="amt">${formatPKR(stats.total)}</td>
      </tr>
    </tbody>
  </table>

  <!-- ═══ CATEGORY BREAKDOWN ═══ -->
  <div class="cats-section">
    <div class="section-title">📈 Category-Wise Breakdown</div>
    <table class="cat-table">
      <thead>
        <tr>
          <th>Category</th>
          <th style="text-align:center;">Entries</th>
          <th class="r">Amount</th>
          <th class="r">Share</th>
          <th>Visual</th>
        </tr>
      </thead>
      <tbody>
        ${catRowsHtml}
      </tbody>
    </table>
  </div>

  <!-- ═══ SIGNATURES ═══ -->
  <div class="sigs">
    <div class="sig">
      <div class="line"></div>
      <div class="role">Prepared By</div>
      <div style="margin-top:2px;font-size:8.5px;font-weight:600;color:#94a3b8;">Accountant / Owner</div>
    </div>
    <div class="sig">
      <div class="line"></div>
      <div class="role">Verified By</div>
      <div style="margin-top:2px;font-size:8.5px;font-weight:600;color:#94a3b8;">Manager</div>
    </div>
    <div class="sig">
      <div class="line"></div>
      <div class="role">Approved By</div>
      <div style="margin-top:2px;font-size:8.5px;font-weight:600;color:#94a3b8;">Authorized Signatory</div>
    </div>
  </div>

  <!-- ═══ FOOTER ═══ -->
  <div class="footer">
    <strong>${escapeHtml(shopName)}</strong>${shopPhone ? ` • ${escapeHtml(shopPhone)}` : ''}<br/>
    Ye computer generated report hai — signature ki zaroorat nahi jab tak audit / bank / tax purpose na ho.<br/>
    Powered by <strong>Nafaa POS</strong> — ${new Date().getFullYear()}
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body></html>`;

    const w = window.open('', '_blank', 'width=1000,height=800');
    if (!w) return toast.error('Popup blocked — allow popups!');
    w.document.open();
    w.document.write(html);
    w.document.close();
    toast.success('Report ready — "Save as PDF" ya print karo');
  };

  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('Koi data nahi');
    const head = ['#', 'Voucher', 'Date', 'Title', 'Description', 'Category', 'Payment', 'Status', 'Amount (Rs)'];
    const rows = filtered.map((e, i) => [
      String(i + 1),
      e.expenseNumber,
      formatDateTime(e.expenseDate),
      e.title,
      e.description || '',
      catName(e),
      paymentLabel(e.paymentMethod),
      e.status,
      Number(e.amount).toFixed(2),
    ]);
    const csv = [
      [`Expenses Report — ${shopName}`],
      [`Period: ${periodLabel}`],
      [`Generated: ${new Date().toLocaleString('en-PK')}`],
      [`Total: ${formatPKR(stats.total)}  •  ${stats.count} entries  •  Avg: ${formatPKR(stats.avg)}`],
      [''], head, ...rows,
      [''],
      ['Category Breakdown:'],
      ['Category', 'Count', 'Amount', 'Share %'],
      ...categoryBreakdown.map((c) => [
        c.name, String(c.count), Number(c.value).toFixed(2),
        stats.total > 0 ? ((c.value / stats.total) * 100).toFixed(2) : '0',
      ]),
    ].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${toDateInput(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} expenses export ho gaye`);
  };

  /* ─── Keyboard + scroll lock ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTeacher) return setShowTeacher(false);
        if (showCatManager) return setShowCatManager(false);
        if (showPrintOptions) return setShowPrintOptions(false);
        if (showForm) return setShowForm(false);
        if (detailExpense) return setDetailExpense(null);
      }
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key.toLowerCase() === 'n') { e.preventDefault(); openNewForm(); }
      if (e.key.toLowerCase() === 't') { e.preventDefault(); setShowTeacher(true); }
      if (e.key.toLowerCase() === 'p') { e.preventDefault(); setShowPrintOptions(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTeacher, showForm, detailExpense, showCatManager, showPrintOptions]);

  const anyModal = showTeacher || showForm || !!detailExpense || showCatManager || showPrintOptions;
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = anyModal ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [anyModal]);

  const hasFilters = !!search || categoryFilter !== 'all' || period !== 'month';
  const clearFilters = () => { setSearch(''); setCategoryFilter('all'); setPeriod('month'); };

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <ExpensesTeacher onClose={() => setShowTeacher(false)} />}
      {showForm && (
        <ExpenseFormModal
          form={form}
          setForm={setForm}
          categories={categories}
          titleRef={titleRef}
          onClose={() => setShowForm(false)}
          onSubmit={submitForm}
          loading={createMutation.isPending}
          onManageCategories={() => { setShowForm(false); setShowCatManager(true); }}
        />
      )}
      {showCatManager && (
        <CategoryManagerModal
          categories={categories}
          onClose={() => setShowCatManager(false)}
        />
      )}
      {showPrintOptions && (
        <PrintOptionsModal
          filtered={filtered}
          period={period}
          periodLabel={periodLabel}
          onA4={() => { printA4Report(); setShowPrintOptions(false); }}
          onCSV={() => { exportCSV(); setShowPrintOptions(false); }}
          onClose={() => setShowPrintOptions(false)}
        />
      )}
      {detailExpense && (
        <ExpenseDetailModal
          expense={detailExpense}
          catName={catName(detailExpense)}
          catColor={catColor(detailExpense)}
          catIcon={catIcon(detailExpense)}
          onClose={() => setDetailExpense(null)}
          onDelete={() => confirmDelete(detailExpense)}
          onPrint={() => printThermalReceipt(detailExpense)}
          onDuplicate={() => duplicateExpense(detailExpense)}
        />
      )}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-rose-900 to-red-800 dark:from-slate-950 dark:via-rose-950 dark:to-red-900 text-white p-4 sm:p-6 shadow-2xl">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-rose-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <Receipt className="h-3.5 w-3.5 text-amber-300" /> Business Expenses
              {shopName && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="text-rose-200">🏪 {shopName}</span>
                </>
              )}
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">💸 Expenses</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              Aaj <strong className="text-rose-300">{formatPKR(summary?.todayExpenses ?? 0)}</strong>
              <span className="opacity-50 mx-1.5">•</span>
              Is mahine <strong className="text-amber-300">{formatPKR(summary?.monthExpenses ?? stats.total)}</strong>
              <span className="opacity-50 mx-1.5">•</span>
              <strong>{stats.count}</strong> entries (filtered)
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button onClick={openNewForm} className="h-11 px-4 rounded-xl bg-white text-rose-700 hover:bg-rose-50 text-sm font-extrabold inline-flex items-center gap-1.5 shadow-2xl transition hover:scale-[1.02] active:scale-95">
              <Plus className="h-4 w-4" /> Naya <Kbd>N</Kbd>
            </button>
            <button onClick={() => setShowCatManager(true)} className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md transition" title="Categories manage karo">
              <Settings2 className="h-4 w-4" /> <span className="hidden sm:inline">Categories</span>
            </button>
            <button onClick={() => setShowTeacher(true)} className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition">
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
            </button>
            <button onClick={() => refetch()} disabled={isRefetching} className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => setShowPrintOptions(true)}
              disabled={filtered.length === 0}
              className="h-11 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg disabled:opacity-50 transition"
              title="Print / PDF / CSV"
            >
              <Printer className="h-4 w-4" /> Print & PDF <Kbd>P</Kbd>
            </button>
          </div>
        </div>

        {/* 💡 Smart insight */}
        {topCategory && stats.total > 0 && (
          <div className="relative mt-4 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-3 flex items-center gap-3 flex-wrap">
            <div className="h-9 w-9 rounded-xl bg-amber-500 flex items-center justify-center shrink-0 shadow-lg">
              <Flame className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">💡 Smart Insight</div>
              <div className="font-extrabold text-sm truncate">
                Sab se bara kharcha: <span className="text-amber-300">{topCategory.name}</span>
                <span className="text-white/70 font-bold"> — {formatPKR(topCategory.value)} ({topCategoryPct}%)</span>
              </div>
            </div>
          </div>
        )}

        <div className="relative mt-3 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center">
          <Kbd>/</Kbd><span className="text-white/60">Search</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>N</Kbd><span className="text-white/60">Naya</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>P</Kbd><span className="text-white/60">Print/PDF</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>T</Kbd><span className="text-white/60">Guide</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>Esc</Kbd><span className="text-white/60">Band</span>
        </div>
      </section>

      {/* ═══ QUICK ADD BAR ═══ */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Quick Add — 1 Click</h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Click karo → sirf amount likho → save</p>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'thin' }}>
          {QUICK_PRESETS.map((p) => (
            <button
              key={p.title}
              onClick={() => quickAdd(p)}
              className="shrink-0 group rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:border-rose-400 dark:hover:border-rose-500/50 hover:bg-rose-50 dark:hover:bg-rose-500/10 px-3.5 py-2.5 transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-95"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{p.icon}</span>
                <div className="text-left">
                  <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100 whitespace-nowrap group-hover:text-rose-700 dark:group-hover:text-rose-300 transition">{p.title}</div>
                  <div className="text-[9px] text-slate-400 dark:text-slate-500 font-bold whitespace-nowrap">{p.hint}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ═══ KPIs ═══ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Kpi icon={TrendingDown} tone="rose" label="Total Spent" value={formatPKR(stats.total)} sub={`${stats.count} entries`} highlight />
        <Kpi icon={Activity} tone="blue" label="Average" value={formatPKR(stats.avg)} sub="Per entry" />
        <Kpi icon={AlertTriangle} tone="amber" label="Highest" value={stats.highest ? formatPKR(stats.highest.amount) : '—'} sub={(stats.highest?.title || 'N/A').slice(0, 22)} />
        <Kpi icon={PieIcon} tone="violet" label="Categories" value={stats.catsUsed} sub={`${categories.length} total`} />
      </section>

      {/* ═══ PERIOD PILLS + CUSTOM RANGE ═══ */}
      <section className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 p-3 space-y-3">
        <div className="flex gap-1.5 flex-wrap items-center">
          <div className="text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider mr-1">Period:</div>
          {(['today', 'week', 'month', 'year', 'all'] as PeriodFilter[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition ${
                period === p
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {p === 'today' ? 'Aaj' : p === 'week' ? '7 Din' : p === 'month' ? '30 Din' : p === 'year' ? '1 Saal' : 'Sab'}
            </button>
          ))}
          <button
            onClick={() => setPeriod('custom')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition inline-flex items-center gap-1.5 ${
              period === 'custom'
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <CalendarRange className="h-3.5 w-3.5" />
            Custom
          </button>
          {hasFilters && (
            <button onClick={clearFilters} className="ml-auto text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:text-rose-700 inline-flex items-center gap-1 transition">
              <X className="h-3 w-3" /> Filter hatao
            </button>
          )}
        </div>

        {/* 📅 CUSTOM DATE RANGE */}
        {period === 'custom' && (
          <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10 border-2 border-violet-300 dark:border-violet-500/40 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow-md">
                <CalendarDays className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-violet-900 dark:text-violet-100">Custom Date Range</h4>
                <p className="text-[10px] text-violet-700 dark:text-violet-300 font-bold">Apni marzi ke dates select karo</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-extrabold text-violet-700 dark:text-violet-300 tracking-wider mb-1">📅 From</label>
                <input
                  type="date"
                  value={customFrom}
                  max={customTo}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-11 w-full rounded-xl border-2 border-violet-300 dark:border-violet-500/40 bg-white dark:bg-slate-800 px-3 text-sm font-extrabold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-extrabold text-violet-700 dark:text-violet-300 tracking-wider mb-1">📅 To</label>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  max={toDateInput(new Date())}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-11 w-full rounded-xl border-2 border-violet-300 dark:border-violet-500/40 bg-white dark:bg-slate-800 px-3 text-sm font-extrabold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition"
                />
              </div>
            </div>
            {/* Quick range presets */}
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => {
                  const s = new Date(); s.setDate(s.getDate() - 15);
                  setCustomFrom(toDateInput(s));
                  setCustomTo(toDateInput(new Date()));
                }}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border-2 border-violet-200 dark:border-violet-500/40 text-[10px] font-extrabold text-violet-700 dark:text-violet-300 hover:border-violet-400 transition"
              >
                Last 15 Din
              </button>
              <button
                onClick={() => {
                  const now = new Date();
                  setCustomFrom(toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)));
                  setCustomTo(toDateInput(now));
                }}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border-2 border-violet-200 dark:border-violet-500/40 text-[10px] font-extrabold text-violet-700 dark:text-violet-300 hover:border-violet-400 transition"
              >
                Ye Mahina (1st se)
              </button>
              <button
                onClick={() => {
                  const now = new Date();
                  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                  const lastEnd = new Date(now.getFullYear(), now.getMonth(), 0);
                  setCustomFrom(toDateInput(last));
                  setCustomTo(toDateInput(lastEnd));
                }}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border-2 border-violet-200 dark:border-violet-500/40 text-[10px] font-extrabold text-violet-700 dark:text-violet-300 hover:border-violet-400 transition"
              >
                Pichla Mahina
              </button>
              <button
                onClick={() => {
                  const now = new Date();
                  setCustomFrom(toDateInput(new Date(now.getFullYear(), 0, 1)));
                  setCustomTo(toDateInput(now));
                }}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border-2 border-violet-200 dark:border-violet-500/40 text-[10px] font-extrabold text-violet-700 dark:text-violet-300 hover:border-violet-400 transition"
              >
                Is Saal
              </button>
            </div>
            <div className="text-[11px] font-bold text-violet-800 dark:text-violet-200 bg-violet-100 dark:bg-violet-500/20 rounded-lg px-3 py-2 inline-flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              Showing: <strong>{formatDate(customFrom)}</strong> se <strong>{formatDate(customTo)}</strong>
              <span className="opacity-70">•</span>
              <strong>{filteredByPeriod.length}</strong> entries
            </div>
          </div>
        )}
      </section>

      {/* ═══ CHARTS ═══ */}
      {filtered.length > 0 && (
        <section className="grid lg:grid-cols-[1fr_1.3fr] gap-4">
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Category Breakdown</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Kis pe zyada kharcha</p>
              </div>
              <PieIcon className="h-5 w-5 text-rose-500" />
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryBreakdown} cx="50%" cy="45%" outerRadius={85} innerRadius={45} dataKey="value"
                    label={(e: any) => `${stats.total > 0 ? ((e.value / stats.total) * 100).toFixed(0) : 0}%`} labelLine={false}>
                    {categoryBreakdown.map((entry, idx) => (<Cell key={idx} fill={entry.color} />))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatPKR(Number(v))} contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0' }} />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">6-Month Trend</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Monthly expense pattern</p>
              </div>
              <BarChart3 className="h-5 w-5 text-rose-500" />
            </div>
            <div className="h-[260px]">
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

      {/* ═══ LIST ═══ */}
      <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Sab Expenses <span className="text-sm text-slate-500 dark:text-slate-400">({filtered.length})</span>
            </h3>
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Title, voucher #, category... (/)"
                className="h-10 w-64 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-rose-500 transition"
              />
            </div>
          </div>

          {/* Category chips */}
          <div className="flex gap-1.5 flex-wrap items-center">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition ${
                categoryFilter === 'all' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Sab ({filteredByPeriod.length})
            </button>
            {categories.map((c) => {
              const count = filteredByPeriod.filter((e) => catOf(e)?.id === c.id).length;
              if (count === 0) return null;
              const active = categoryFilter === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setCategoryFilter(active ? 'all' : c.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition inline-flex items-center gap-1 ${
                    active ? 'text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                  style={active ? { backgroundColor: c.color } : {}}
                >
                  {c.icon && <span>{c.icon}</span>}
                  {c.name}
                  <span className={`px-1 rounded-full text-[9px] tabular-nums ${active ? 'bg-white/25' : 'bg-slate-200 dark:bg-slate-700'}`}>{count}</span>
                </button>
              );
            })}
            {filteredByPeriod.some((e) => !catOf(e)) && (
              <button
                onClick={() => setCategoryFilter(categoryFilter === 'none' ? 'all' : 'none')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition ${
                  categoryFilter === 'none' ? 'bg-slate-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                General
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (<div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 sm:p-16 text-center">
            <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-rose-100 to-red-200 dark:from-rose-500/20 dark:to-red-500/20 flex items-center justify-center">
              <Receipt className="h-9 w-9 text-rose-600 dark:text-rose-400" />
            </div>
            <h4 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">
              {hasFilters ? 'Kuch nahi mila' : 'Abhi koi expense nahi'}
            </h4>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 font-semibold max-w-md mx-auto">
              {hasFilters ? 'Filter change kar ke dekho' : 'Business ka har kharcha likho — month end pe profit ka asli hisaab milega!'}
            </p>
            <div className="mt-5 flex gap-2 justify-center flex-wrap">
              {hasFilters ? (
                <Button variant="secondary" onClick={clearFilters}><X className="h-4 w-4" /> Filter hatao</Button>
              ) : (
                <>
                  <button onClick={() => setShowTeacher(true)} className="h-11 px-4 rounded-xl bg-amber-100 dark:bg-amber-500/20 hover:bg-amber-200 dark:hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-extrabold inline-flex items-center gap-1.5 border-2 border-amber-300 dark:border-amber-500/40 transition">
                    <GraduationCap className="h-4 w-4" /> Pehle Seekh Lo
                  </button>
                  <button onClick={openNewForm} className="h-11 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg shadow-rose-500/30 transition">
                    <Plus className="h-4 w-4" /> Pehla Expense
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="max-h-[700px] overflow-y-auto">
              {grouped.map((group) => (
                <div key={group.label}>
                  <div className="sticky top-0 z-10 px-5 py-2 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-sm border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      {group.label}
                    </span>
                    <span className="text-[11px] font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
                      −{formatPKR(group.total)}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {group.items.map((e) => {
                      const color = catColor(e);
                      const name = catName(e);
                      const cat = catOf(e);
                      return (
                        <div
                          key={e.id}
                          onClick={() => setDetailExpense(e)}
                          className="px-5 py-4 hover:bg-rose-50/50 dark:hover:bg-rose-500/5 transition group cursor-pointer"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className="h-11 w-11 rounded-2xl text-white flex items-center justify-center shadow-lg shrink-0 text-lg"
                              style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
                            >
                              {cat?.icon || <Wallet className="h-5 w-5" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-slate-900 dark:text-white text-sm line-clamp-1">{e.title}</span>
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold text-white"
                                  style={{ backgroundColor: color }}
                                >
                                  {name}
                                </span>
                                {e.status === 'PENDING' && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">PENDING</span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1 flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(e.expenseDate)}</span>
                                <span className="opacity-50">•</span>
                                <span className="font-mono text-[10px]">{e.expenseNumber}</span>
                                <span className="opacity-50">•</span>
                                <span>{paymentLabel(e.paymentMethod)}</span>
                                <span className="opacity-50">•</span>
                                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{formatRelative(e.expenseDate)}</span>
                              </div>
                              {e.description && (
                                <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-semibold line-clamp-1">📝 {e.description}</div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <div className="text-xl font-extrabold text-rose-700 dark:text-rose-400 tabular-nums">
                                −{formatPKR(e.amount)}
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition" onClick={(ev) => ev.stopPropagation()}>
                                <button onClick={() => setDetailExpense(e)} className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 hover:bg-violet-200 flex items-center justify-center transition" title="Details">
                                  <Eye className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => printThermalReceipt(e)} className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 flex items-center justify-center transition" title="Thermal receipt print">
                                  <Printer className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => duplicateExpense(e)} className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 hover:bg-blue-200 flex items-center justify-center transition" title="Duplicate">
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => confirmDelete(e)} className="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 hover:bg-rose-200 flex items-center justify-center transition" title="Delete">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-slate-300 dark:text-slate-600 shrink-0 self-center opacity-0 group-hover:opacity-100 transition" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer total */}
            <div className="px-5 py-4 border-t-2 border-slate-100 dark:border-slate-800 bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-500/10 dark:to-red-500/10 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-widest font-extrabold text-slate-600 dark:text-slate-400">Grand Total ({periodLabel})</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-rose-700 dark:text-rose-400 tabular-nums">−{formatPKR(stats.total)}</div>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold text-right">
                <div>{stats.count} entries • {stats.catsUsed} categories</div>
                <div className="mt-0.5">Avg: <strong className="text-slate-700 dark:text-slate-200">{formatPKR(stats.avg)}</strong></div>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   🖨️ PRINT OPTIONS MODAL — Best UX
   ═════════════════════════════════════════════════════════════ */
function PrintOptionsModal({ filtered, period, periodLabel, onA4, onCSV, onClose }: any) {
  const total = filtered.reduce((s: number, e: Expense) => s + Number(e.amount || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 relative bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700 text-white px-5 py-4 overflow-hidden">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-amber-400/25 blur-2xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur px-2.5 py-0.5 text-[10px] font-extrabold border border-white/30">
                <Printer className="h-3 w-3" /> Print & Export
              </div>
              <h3 className="text-xl font-extrabold mt-2">📊 Report Nikalo</h3>
              <p className="text-xs text-white/85 font-bold mt-1">
                {filtered.length} entries • {formatPKR(total)} • {periodLabel}
              </p>
            </div>
            <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/20 hover:bg-white/30 active:scale-95 flex items-center justify-center transition">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {/* A4 Full Report */}
          <button
            onClick={onA4}
            className="w-full group rounded-2xl border-2 border-rose-300 dark:border-rose-500/40 bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-500/10 dark:to-red-500/10 hover:from-rose-100 hover:to-red-100 hover:border-rose-500 hover:shadow-xl transition-all p-5 text-left active:scale-[0.98]"
          >
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-rose-600 to-red-700 text-white flex items-center justify-center shadow-lg shrink-0 group-hover:scale-110 transition">
                <FileText className="h-7 w-7" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white">A4 Full Report</h4>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-extrabold uppercase">Best for PDF</span>
                </div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
                  Poori report — KPIs, category breakdown, complete table, signatures.
                  Print karo ya <strong>"Save as PDF"</strong> select karo.
                </p>
                <div className="mt-2 flex gap-1.5 flex-wrap">
                  <Badge>Colored</Badge>
                  <Badge>Category chart</Badge>
                  <Badge>Signatures</Badge>
                  <Badge>Grand total</Badge>
                </div>
              </div>
              <ChevronRight className="h-6 w-6 text-slate-400 dark:text-slate-500 shrink-0 self-center group-hover:translate-x-1 transition" />
            </div>
          </button>

          {/* CSV Export */}
          <button
            onClick={onCSV}
            className="w-full group rounded-2xl border-2 border-emerald-300 dark:border-emerald-500/40 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10 hover:from-emerald-100 hover:to-green-100 hover:border-emerald-500 hover:shadow-xl transition-all p-5 text-left active:scale-[0.98]"
          >
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-green-700 text-white flex items-center justify-center shadow-lg shrink-0 group-hover:scale-110 transition">
                <FileDown className="h-7 w-7" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white">CSV Export</h4>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-[9px] font-extrabold uppercase">Excel</span>
                </div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
                  Excel / Google Sheets me kholo. Accountant ya audit ke liye best — raw data manipulate kar sakte ho.
                </p>
                <div className="mt-2 flex gap-1.5 flex-wrap">
                  <Badge>Excel compatible</Badge>
                  <Badge>Raw data</Badge>
                  <Badge>Category summary</Badge>
                </div>
              </div>
              <ChevronRight className="h-6 w-6 text-slate-400 dark:text-slate-500 shrink-0 self-center group-hover:translate-x-1 transition" />
            </div>
          </button>

          {/* Info box */}
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-4 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-slate-500 dark:text-slate-400 mb-1">💡 Print Tips</div>
            <TipRow><strong>PDF banane ke liye:</strong> A4 Report → print dialog me destination "<strong>Save as PDF</strong>" choose karo</TipRow>
            <TipRow><strong>Colored print:</strong> Browser print settings me "<strong>Background graphics</strong>" ON karo — warna colors nahi ayenge</TipRow>
            <TipRow><strong>Har expense ka thermal receipt:</strong> List me expense pe click karo → 🖨️ button → 80mm printer pe nikal jayega</TipRow>
            <TipRow><strong>Custom date range:</strong> Upar "Custom" chuno → From-To select karo → phir print</TipRow>
          </div>
        </div>

        <div className="shrink-0 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 p-4">
          <Button variant="secondary" className="w-full" onClick={onClose}>
            <X className="h-4 w-4" /> Band Karo
          </Button>
        </div>
      </div>
    </div>
  );
}

function Badge({ children }: any) {
  return (
    <span className="inline-block px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[10px] font-extrabold text-slate-700 dark:text-slate-200">
      {children}
    </span>
  );
}

/* ═════════════════════════════════════════════════════════════
   EXPENSE FORM MODAL
   ═════════════════════════════════════════════════════════════ */
function ExpenseFormModal({ form, setForm, categories, titleRef, onClose, onSubmit, loading, onManageCategories }: any) {
  const titleLen = (form.title || '').length;
  const selectedCat = categories.find((c: ExpenseCategory) => c.id === form.categoryId);
  const queryClient = useQueryClient();
  const [seeding, setSeeding] = useState(false);

  const autoSetup = async () => {
    setSeeding(true);
    let created = 0;
    for (const cat of DEFAULT_CATEGORIES) {
      const exists = categories.some(
        (c: ExpenseCategory) => c.name.toLowerCase() === cat.name.toLowerCase(),
      );
      if (exists) continue;
      try {
        await expenseCategoriesApi.create({ name: cat.name, color: cat.color, icon: cat.icon });
        created++;
      } catch {}
    }
    setSeeding(false);
    queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
    if (created > 0) toast.success(`🪄 ${created} categories ban gayi!`);
    else toast.info('Sab pehle se mojood hain');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div
        className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onSubmit(); }
        }}
      >
        <div className="px-5 py-3 border-b-2 border-rose-200 dark:border-rose-500/30 bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-500/15 dark:to-red-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-rose-900 dark:text-rose-200 flex items-center gap-2">
            <Receipt className="h-5 w-5" /> Naya Expense
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
              Kis cheez ka kharcha? *
            </label>
            <input
              ref={titleRef}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value.slice(0, 120) })}
              placeholder="August ka kiraya, bijli ka bill, staff chai..."
              maxLength={120}
              className="h-12 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-extrabold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-rose-500 transition"
            />
            <div className={`text-[10px] font-bold mt-1 text-right tabular-nums ${titleLen > 110 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'}`}>
              {titleLen}/120
            </div>
          </div>

          <div>
            <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">Amount (PKR) *</label>
            <input
              data-expense-amount
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="5000"
              className="h-14 w-full rounded-xl border-2 border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 px-4 text-2xl font-extrabold tabular-nums text-rose-900 dark:text-rose-200 placeholder:text-rose-300 dark:placeholder:text-rose-500/50 focus:outline-none focus:border-rose-500 transition"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-extrabold text-slate-700 dark:text-slate-300">Category</label>
              <button
                type="button"
                onClick={onManageCategories}
                className="text-[11px] font-extrabold text-rose-700 dark:text-rose-400 hover:underline inline-flex items-center gap-1"
              >
                <Settings2 className="h-3 w-3" /> Manage / Nayi banao
              </button>
            </div>
            {categories.length === 0 ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={autoSetup}
                  disabled={seeding}
                  className="w-full h-14 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 shadow-lg shadow-violet-500/30 transition disabled:opacity-60"
                >
                  {seeding ? (
                    <><RefreshCw className="h-4 w-4 animate-spin" /> Ban rahi hain…</>
                  ) : (
                    <><Sparkles className="h-4 w-4" /> 🪄 Auto-Setup: 8 standard categories</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onManageCategories}
                  className="w-full h-10 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-xs font-extrabold text-slate-500 dark:text-slate-400 hover:border-rose-400 hover:text-rose-600 transition inline-flex items-center justify-center gap-2"
                >
                  <Plus className="h-3.5 w-3.5" /> Ya khud custom banao
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, categoryId: '' })}
                  className={`px-3 py-2 rounded-xl border-2 text-xs font-extrabold transition ${
                    !form.categoryId
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  General
                </button>
                {categories.map((c: ExpenseCategory) => {
                  const active = form.categoryId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setForm({ ...form, categoryId: active ? '' : c.id })}
                      className={`px-3 py-2 rounded-xl border-2 text-xs font-extrabold transition inline-flex items-center gap-1.5 ${
                        active ? 'text-white border-transparent shadow-md' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:shadow-sm'
                      }`}
                      style={active ? { backgroundColor: c.color } : { borderColor: `${c.color}50` }}
                    >
                      {c.icon && <span>{c.icon}</span>}
                      {c.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">Payment Method</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {PAYMENT_METHODS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setForm({ ...form, paymentMethod: p.value })}
                  className={`px-3 py-2.5 rounded-xl border-2 text-xs font-extrabold transition ${
                    form.paymentMethod === p.value
                      ? 'bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-500/30'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-rose-300 dark:hover:border-rose-500/50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
              Tafseel <span className="text-slate-400 dark:text-slate-500 font-bold">(optional)</span>
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="Bill #, vendor ka naam, extra details..."
              className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-rose-500 transition resize-none"
            />
          </div>

          {Number(form.amount) > 0 && form.title.trim() && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-3 flex items-center gap-3">
              <div
                className="h-9 w-9 rounded-xl text-white flex items-center justify-center shrink-0"
                style={{ backgroundColor: selectedCat?.color || '#64748b' }}
              >
                {selectedCat?.icon || <Wallet className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{form.title}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{selectedCat?.name || 'General'} • {paymentLabel(form.paymentMethod)}</div>
              </div>
              <div className="text-lg font-extrabold text-rose-700 dark:text-rose-400 tabular-nums">−{formatPKR(Number(form.amount))}</div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              <X className="h-4 w-4" /> Cancel
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 font-extrabold shadow-lg shadow-rose-500/30"
              onClick={onSubmit}
              loading={loading}
            >
              <CheckCircle2 className="h-4 w-4" /> Save Expense
            </Button>
          </div>
          <div className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-500">
            Ctrl+Enter = Save • Offline ho to bhi save hoga
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   CATEGORY MANAGER
   ═════════════════════════════════════════════════════════════ */
function CategoryManagerModal({ categories, onClose }: { categories: ExpenseCategory[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [color, setColor] = useState(CAT_COLORS[0]);
  const [icon, setIcon] = useState(CAT_EMOJIS[0]);
  const [seeding, setSeeding] = useState(false);

  const createMutation = useMutation({
    mutationFn: () => expenseCategoriesApi.create({ name: name.trim(), color, icon }),
    onSuccess: () => {
      toast.success(`"${name.trim()}" category ban gayi`);
      setName('');
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi bani'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => expenseCategoriesApi.remove(id),
    onSuccess: () => {
      toast.success('Category delete ho gayi');
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete nahi hui'),
  });

  const submit = () => {
    if (!name.trim()) return toast.error('Naam likho');
    if (categories.some((c) => c.name.toLowerCase() === name.trim().toLowerCase())) {
      return toast.error('Ye naam pehle se hai');
    }
    createMutation.mutate();
  };

  const autoSetup = async () => {
    setSeeding(true);
    let created = 0;
    for (const cat of DEFAULT_CATEGORIES) {
      const exists = categories.some((c) => c.name.toLowerCase() === cat.name.toLowerCase());
      if (exists) continue;
      try {
        await expenseCategoriesApi.create({ name: cat.name, color: cat.color, icon: cat.icon });
        created++;
      } catch {}
    }
    setSeeding(false);
    queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
    if (created > 0) toast.success(`🪄 ${created} categories ban gayi!`);
    else toast.info('Sab pehle se mojood hain');
  };

  const missingCount = DEFAULT_CATEGORIES.filter(
    (d) => !categories.some((c) => c.name.toLowerCase() === d.name.toLowerCase()),
  ).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border-2 border-violet-300 dark:border-violet-500/40 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 py-3 border-b-2 border-violet-200 dark:border-violet-500/30 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-500/15 dark:to-purple-500/15 flex items-center justify-between">
          <h3 className="font-extrabold text-violet-900 dark:text-violet-200 flex items-center gap-2">
            <Settings2 className="h-5 w-5" /> Expense Categories
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {missingCount > 0 && (
            <div className="rounded-2xl border-2 border-violet-300 dark:border-violet-500/40 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-500/10 dark:to-purple-500/10 p-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow-lg shrink-0">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-extrabold text-violet-900 dark:text-violet-100">🪄 Auto-Setup</div>
                  <div className="text-[11px] text-violet-700 dark:text-violet-300 font-semibold">
                    {missingCount} standard categories 1 click me
                  </div>
                </div>
                <button
                  onClick={autoSetup}
                  disabled={seeding}
                  className="h-10 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition disabled:opacity-60 shrink-0"
                >
                  {seeding ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {seeding ? 'Ban rahi…' : 'Setup'}
                </button>
              </div>
            </div>
          )}

          <div className="rounded-2xl border-2 border-violet-200 dark:border-violet-500/30 bg-violet-50/60 dark:bg-violet-500/5 p-4 space-y-3">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-violet-700 dark:text-violet-300">Custom Category</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
              placeholder="Apni category ka naam..."
              maxLength={40}
              className="h-11 w-full rounded-xl border-2 border-violet-200 dark:border-violet-500/40 bg-white dark:bg-slate-800 px-4 text-sm font-extrabold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500 transition"
            />
            <div>
              <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Icon</div>
              <div className="flex flex-wrap gap-1.5">
                {CAT_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setIcon(em)}
                    className={`h-9 w-9 rounded-lg text-lg transition ${icon === em ? 'bg-violet-600 shadow-md scale-110' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:scale-105'}`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Color</div>
              <div className="flex flex-wrap gap-1.5">
                {CAT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-8 w-8 rounded-lg transition ${color === c ? 'scale-110 ring-2 ring-slate-900 dark:ring-white shadow-md' : 'hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold text-white shadow-md"
                style={{ backgroundColor: color }}
              >
                {icon} {name || 'Preview'}
              </span>
              <div className="flex-1" />
              <Button
                onClick={submit}
                loading={createMutation.isPending}
                className="bg-gradient-to-r from-violet-600 to-purple-600 font-extrabold"
              >
                <Plus className="h-4 w-4" /> Banao
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-slate-500 dark:text-slate-400">
              Mojooda ({categories.length})
            </div>
            {categories.length === 0 ? (
              <div className="text-center py-6 text-sm font-bold text-slate-400 dark:text-slate-500">
                Abhi koi nahi
              </div>
            ) : (
              categories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-3 py-2.5"
                >
                  <span
                    className="h-9 w-9 rounded-lg text-white flex items-center justify-center text-base shrink-0 shadow-sm"
                    style={{ backgroundColor: c.color }}
                  >
                    {c.icon || <Tag className="h-4 w-4" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{c.name}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                      {c._count?.expenses ?? 0} expenses
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const n = c._count?.expenses ?? 0;
                      const msg = n > 0
                        ? `⚠️ "${c.name}" me ${n} expenses hain!\n\nDelete karo to woh "General" ho jayenge.\n\nPakka?`
                        : `"${c.name}" delete karein?`;
                      if (confirm(msg)) removeMutation.mutate(c.id);
                    }}
                    className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-500/20 hover:text-rose-700 dark:hover:text-rose-300 text-slate-500 dark:text-slate-400 flex items-center justify-center transition shrink-0"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   EXPENSE DETAIL MODAL
   ═════════════════════════════════════════════════════════════ */
function ExpenseDetailModal({ expense, catName, catColor, catIcon, onClose, onDelete, onPrint, onDuplicate }: any) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, #0f172a, ${catColor})` }}>
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/15 blur-2xl pointer-events-none" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-extrabold border border-white/30 mb-2">
                {catIcon} {catName}
              </div>
              <h3 className="text-lg font-extrabold leading-tight line-clamp-2">{expense.title}</h3>
              <div className="text-xs text-white/80 mt-1 font-semibold flex items-center gap-2 flex-wrap">
                <span className="font-mono">{expense.expenseNumber}</span>
                <span className="opacity-60">•</span>
                {formatRelative(expense.expenseDate)}
              </div>
            </div>
            <button onClick={onClose} className="h-8 w-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-500/10 dark:to-red-500/10 border-2 border-rose-200 dark:border-rose-500/40 p-4 text-center">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-rose-700 dark:text-rose-300">Total Amount</div>
            <div className="text-4xl font-extrabold text-rose-700 dark:text-rose-400 tabular-nums mt-1">
              −{formatPKR(expense.amount)}
            </div>
            <div className={`mt-2 inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              expense.status === 'PAID'
                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                : expense.status === 'PENDING'
                  ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}>
              {expense.status}
            </div>
          </div>

          <div className="rounded-xl bg-white dark:bg-slate-800/40 border-2 border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
            <DetailRow icon={Calendar} label="Date" value={formatDateTime(expense.expenseDate)} />
            <DetailRow icon={Tag} label="Category" value={`${catIcon} ${catName}`} />
            <DetailRow icon={Wallet} label="Payment" value={paymentLabel(expense.paymentMethod)} />
            <DetailRow icon={FileText} label="Voucher #" value={expense.expenseNumber} mono />
          </div>

          {expense.description && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3">
              <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-700 dark:text-amber-300 mb-1">📝 Tafseel</div>
              <p className="text-sm text-slate-700 dark:text-slate-200 font-semibold whitespace-pre-wrap break-words">{expense.description}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={onPrint}
              className="h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/30 transition"
            >
              <Printer className="h-4 w-4" /> 🧾 Thermal
            </button>
            <button
              onClick={onDuplicate}
              className="h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/30 transition"
            >
              <Copy className="h-4 w-4" /> Duplicate
            </button>
            <button
              onClick={onDelete}
              className="h-12 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shadow-lg shadow-rose-500/30 transition"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
          <div className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-500">
            🧾 Thermal = 80mm printer • Full report ke liye upar "Print & PDF" button
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, mono }: any) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 shrink-0">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-extrabold uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-sm font-extrabold text-slate-900 dark:text-white text-right break-words min-w-0 ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
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
            <GraduationCap className="h-5 w-5" /> Expenses — Complete Guide
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            <strong>Sale barhane se profit nahi barhta — kharcha control karne se barhta hai.</strong>
            Har kharcha likho, chahe 50 rupay ki chai ho.
          </p>

          <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/5 p-4 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-700 dark:text-amber-300 mb-1 flex items-center gap-1">
              <Printer className="h-3 w-3" /> 🖨️ Print & PDF (Sab Se Zaroori!)
            </div>
            <TipRow><strong>Upar "Print & PDF" dabao</strong> → 2 options milenge:</TipRow>
            <TipRow>📄 <strong>A4 Full Report</strong> — printer se colored A4 nikalo, ya browser me "<strong>Save as PDF</strong>" chuno. KPIs + full table + category breakdown + signatures — sab.</TipRow>
            <TipRow>📊 <strong>CSV Export</strong> — Excel/Google Sheets me kholo</TipRow>
            <TipRow>🧾 <strong>Har expense ka thermal receipt</strong> — list me expense pe click → 🖨️ button → 80mm receipt printer</TipRow>
            <TipRow>⚠️ <strong>Colored print chahiye?</strong> Browser print dialog me "<strong>Background graphics</strong>" ON karo</TipRow>
          </div>

          <div className="rounded-2xl border-2 border-violet-200 dark:border-violet-500/30 bg-violet-50/60 dark:bg-violet-500/5 p-4 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-violet-700 dark:text-violet-300 mb-1 flex items-center gap-1">
              <CalendarRange className="h-3 w-3" /> 📅 Custom Date Range
            </div>
            <TipRow>Period bar me <strong>"Custom"</strong> dabao → apni From-To dates chuno</TipRow>
            <TipRow>Quick presets: Last 15 Din, Ye Mahina, Pichla Mahina, Is Saal</TipRow>
            <TipRow>Custom range chun ke phir print/PDF nikalo — us range ka data ayega</TipRow>
          </div>

          <div className="rounded-2xl border-2 border-rose-200 dark:border-rose-500/30 bg-rose-50/60 dark:bg-rose-500/5 p-4 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <TipRow><strong>⚡ Quick Add</strong> — upar chips: 1 click → sirf amount → save</TipRow>
            <TipRow><strong>🪄 Auto-Setup</strong> — categories khatam? Form/Categories me "Auto-Setup" — 8 standard categories foran</TipRow>
            <TipRow><strong>Sirf 2 zaroori</strong> — title + amount. Bas!</TipRow>
            <TipRow><strong>📅 Date groups</strong> — list "Aaj / Kal / Is Hafte" me bandhi hui, group total bhi</TipRow>
            <TipRow><strong>🔄 Duplicate</strong> — same kiraya har mahina? Copy karo, save karo, done</TipRow>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 text-xs font-semibold text-slate-700 dark:text-slate-200">
            💡 <strong>30% rule:</strong> Revenue ka 30% se zyada expenses = margin problem. Category chart me sab se bara kharcha wahi control karo.
          </div>

          <div className="rounded-xl bg-slate-900 dark:bg-slate-950 border border-slate-700 p-3 text-xs font-semibold text-slate-200">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-300 mb-2">⌨️ Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div><kbd className="px-1.5 py-0.5 bg-slate-700 rounded font-mono">N</kbd> Naya expense</div>
              <div><kbd className="px-1.5 py-0.5 bg-slate-700 rounded font-mono">P</kbd> Print / PDF</div>
              <div><kbd className="px-1.5 py-0.5 bg-slate-700 rounded font-mono">/</kbd> Search focus</div>
              <div><kbd className="px-1.5 py-0.5 bg-slate-700 rounded font-mono">T</kbd> Guide (ye)</div>
              <div><kbd className="px-1.5 py-0.5 bg-slate-700 rounded font-mono">Esc</kbd> Modal band</div>
              <div><kbd className="px-1.5 py-0.5 bg-slate-700 rounded font-mono">Ctrl+↵</kbd> Form save</div>
            </div>
          </div>

          <Button
            className="w-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 font-extrabold shadow-lg shadow-rose-500/40 h-12"
            onClick={onClose}
          >
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya — Shuru Karo!
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
    <kbd className="px-1.5 py-0.5 rounded bg-white/15 border border-white/25 text-white font-mono font-bold shadow-sm text-[9px]">
      {children}
    </kbd>
  );
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
