import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BookOpen, Search, X, Phone, MessageCircle, RefreshCw,
  AlertTriangle, CheckCircle2, ShoppingCart, Calendar,
  ChevronDown, ChevronUp, ChevronRight, Banknote, GraduationCap, BellRing,
  SkipForward, Copy, CheckCheck, Clock, Flame, ArrowLeft,
  Printer, ArrowRight, TrendingDown, TrendingUp, CalendarRange,
  CalendarDays, FileText, FileDown,
  Sparkles, Award, Edit3, Zap, Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { offlineCustomersApi as customersApi } from '@core/lib/offline/offlineCustomers';
import { customerLedgerApi } from '@modules/customers/khata/api/customer-ledger.api';
import { salesApi } from '@modules/sales/sales/api/sales.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useCostHidden, PrivacyToggle } from '@core/ui/HiddenValue';
import { AppLockGate } from '@core/security/AppLockGate';
import { useAuthStore } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   NAFAA GLOBAL KHATA — CLEAN v3
   ─────────────────────────────────────────────────────────────
   ✅ Quick Udhaar COMPLETELY REMOVED
   ✅ Udhaar sirf POS se aata hai (as it should)
   💬 Smart WhatsApp reminders (gender-aware)
   🖨️ A4 PDF + 80mm thermal + CSV
   📅 Custom date range • 🌙 Dark mode • ⌨️ Shortcuts
   ═════════════════════════════════════════════════════════════ */

const DAY = 864e5;
const LS_TEMPLATE_KEY = 'nafaa.khata.reminder-templates';

type SortKey = 'balance-high' | 'balance-low' | 'name' | 'recent' | 'oldest-due';
type FilterKey = 'all' | 'pending' | 'clear' | 'high' | 'aging30' | 'advance';
type PeriodFilter = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';
type Salutation = 'auto' | 'bhai' | 'baji' | 'uncle' | 'aunty' | 'sir' | 'madam' | 'sahib' | 'none';
type Tone = 'polite' | 'firm' | 'final';

const escapeHtml = (s: string) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const formatDate = (v: string | Date) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v));
const formatShortDate = (v: string | Date) =>
  new Intl.DateTimeFormat('en-PK', { day: '2-digit', month: 'short' }).format(new Date(v));

const toDateInput = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

/* ═══════════════════════════════════════════════════════════════
   💬 SMART SALUTATION ENGINE
   ═══════════════════════════════════════════════════════════════ */

const FEMALE_KEYWORDS = [
  'baji', 'apa', 'aunty', 'aunt', 'madam', 'begum', 'khala', 'phupo', 'phuppo',
  'mama', 'ammi', 'ma\'am', 'maam', 'ms', 'mrs', 'miss', 'sister', 'behn', 'bibi',
];

const FEMALE_NAME_ENDINGS = ['a', 'i', 'ah', 'een', 'iya', 'na', 'sha', 'za', 'ra'];

const FEMALE_FIRST_NAMES = new Set([
  'faiza', 'ayesha', 'aisha', 'fatima', 'zainab', 'khadija', 'maryam', 'mariam',
  'sana', 'sara', 'sarah', 'hina', 'hira', 'saba', 'nida', 'sadia', 'nadia',
  'rabia', 'sadaf', 'sidra', 'saima', 'salma', 'samina', 'shazia', 'sobia',
  'anum', 'anam', 'amna', 'amina', 'ambreen', 'asma', 'anila',
  'iqra', 'insha', 'ifra', 'javeria', 'kiran', 'komal', 'laiba', 'mahira',
  'mahnoor', 'maha', 'mehak', 'minahil', 'nazia', 'nazish', 'noor', 'noreen',
  'nusrat', 'palwasha', 'qurat', 'rida', 'rimsha', 'romaisa', 'rukhsana',
  'shabana', 'shaista', 'sumaira', 'tahira', 'uzma', 'wajiha', 'yasmeen', 'yumna',
  'zoya', 'zara', 'zunaira', 'nimra', 'aroosa', 'humna', 'iman',
  'kanwal', 'laraib', 'mehreen', 'misbah', 'natasha', 'ramsha',
  'sabeen', 'shanza', 'tania', 'urooj', 'wania', 'zoha', 'areeba',
]);

const MALE_KEYWORDS = [
  'bhai', 'chacha', 'mamu', 'uncle', 'sir', 'khan', 'saab', 'sahib', 'sahab',
  'mr', 'mister', 'brother', 'bro', 'ustad', 'ustaz', 'hafiz', 'qari',
  'sheikh', 'hajji', 'haji', 'baba', 'abba', 'abbu',
];

const ELDER_KEYWORDS = ['uncle', 'aunty', 'chacha', 'khala', 'phupo', 'mamu', 'baba', 'haji', 'hajji'];

type Detected = { gender: 'M' | 'F' | 'U'; isElder: boolean; embeddedSalutation: string | null };

function detectFromName(name: string): Detected {
  if (!name) return { gender: 'U', isElder: false, embeddedSalutation: null };
  const lower = name.toLowerCase().trim();
  const tokens = lower.split(/\s+/);

  let embeddedSalutation: string | null = null;
  let isElder = false;
  let gender: 'M' | 'F' | 'U' = 'U';

  for (const t of tokens) {
    if (FEMALE_KEYWORDS.includes(t)) {
      embeddedSalutation = t; gender = 'F';
      if (ELDER_KEYWORDS.includes(t)) isElder = true;
      break;
    }
    if (MALE_KEYWORDS.includes(t)) {
      embeddedSalutation = t; gender = 'M';
      if (ELDER_KEYWORDS.includes(t)) isElder = true;
      break;
    }
  }

  if (gender === 'U') {
    const first = tokens[0];
    if (FEMALE_FIRST_NAMES.has(first)) gender = 'F';
  }

  if (gender === 'U') {
    const first = tokens[0];
    if (first.length >= 4 && FEMALE_NAME_ENDINGS.some((e) => first.endsWith(e))) {
      const maleExceptions = ['raza', 'reza', 'musa', 'isa', 'usama', 'osama', 'hamza', 'ali'];
      if (!maleExceptions.includes(first)) gender = 'F';
    }
  }

  return { gender, isElder, embeddedSalutation };
}

function resolveSalutation(name: string, override: Salutation): string {
  if (override === 'none') return '';
  if (override !== 'auto') {
    const map: Record<string, string> = {
      bhai: 'bhai', baji: 'baji', uncle: 'uncle', aunty: 'aunty',
      sir: 'sir', madam: 'madam', sahib: 'sahib',
    };
    return map[override] || '';
  }

  const d = detectFromName(name);
  if (d.embeddedSalutation) return '';
  if (d.isElder) return d.gender === 'F' ? 'aunty' : 'uncle';
  if (d.gender === 'F') return 'baji';
  if (d.gender === 'M') return 'bhai';
  return '';
}

function getGreeting(_name: string): string {
  return 'Assalam-o-Alaikum';
}

/* ═══════════════════════════════════════════════════════════════
   💬 MESSAGE TEMPLATES
   ═══════════════════════════════════════════════════════════════ */

const DEFAULT_TEMPLATES: Record<Tone, string> = {
  polite: `{greeting} {name}{sal}! 🙏

{shop} ki taraf se yaad-dihani — {aap} ka *{amount}* ka hisaab baqi hai.

Jab moqa mile, ada kar dein. Shukriya! 😊`,

  firm: `{greeting} {name}{sal},

{shop} mein {aap} ka *{amount}* ka hisaab kaafi arsay se pending hai ({days} din).

Baraye meherbani is hafte tak ada kar dein.

Shukriya 🙏`,

  final: `{name}{sal},

⚠️ FINAL REMINDER — {shop}

{aap} ka *{amount}* ka hisaab {days} din se baqi hai. Baraye meherbani foran ada karein.

💳 Payment options:
• Cash
• Bank Transfer
• JazzCash / EasyPaisa

Shukriya.`,
};

function loadTemplates(): Record<Tone, string> {
  try {
    const raw = localStorage.getItem(LS_TEMPLATE_KEY);
    if (raw) return { ...DEFAULT_TEMPLATES, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_TEMPLATES };
}

function saveTemplates(t: Record<Tone, string>) {
  try { localStorage.setItem(LS_TEMPLATE_KEY, JSON.stringify(t)); } catch {}
}

function fillTemplate(
  template: string,
  c: any,
  shopName: string,
  salutationOverride: Salutation,
): string {
  const sal = resolveSalutation(c.name || '', salutationOverride);
  const salStr = sal ? ` ${sal}` : '';
  const amt = `Rs ${Number(c.balance).toLocaleString('en-PK')}`;
  return template
    .replace(/\{greeting\}/g, getGreeting(c.name || ''))
    .replace(/\{name\}/g, c.name || '')
    .replace(/\{sal\}/g, salStr)
    .replace(/\{shop\}/g, shopName)
    .replace(/\{amount\}/g, amt)
    .replace(/\{days\}/g, String(c.ageDays || 0))
    .replace(/\{aap\}/g, 'aap')
    .replace(/\{phone\}/g, c.phone || '');
}

const REMINDER_TONES: Array<{ v: Tone; l: string; d: string; grad: string }> = [
  { v: 'polite', l: '😊 Polite', d: 'Pehli baar', grad: 'from-emerald-500 to-teal-600' },
  { v: 'firm', l: '💼 Firm', d: 'Dobara', grad: 'from-amber-500 to-orange-600' },
  { v: 'final', l: '⚠️ Final', d: 'Aakhri', grad: 'from-rose-500 to-red-600' },
];

const SALUTATIONS: Array<{ v: Salutation; l: string; d: string }> = [
  { v: 'auto', l: '🤖 Auto', d: 'AI se pehchano' },
  { v: 'bhai', l: '👨 Bhai', d: 'Male' },
  { v: 'baji', l: '👩 Baji', d: 'Female' },
  { v: 'uncle', l: '👴 Uncle', d: 'Elder male' },
  { v: 'aunty', l: '👵 Aunty', d: 'Elder female' },
  { v: 'sir', l: '🎩 Sir', d: 'Formal male' },
  { v: 'madam', l: '💃 Madam', d: 'Formal female' },
  { v: 'sahib', l: '🕌 Sahib', d: 'Respect' },
  { v: 'none', l: '🚫 None', d: 'Sirf naam' },
];

export default function GlobalKhataPage() {
  return (
    <AppLockGate title="Khata Locked" description="PIN daalo unlock karne ke liye">
      <GlobalKhataContent />
    </AppLockGate>
  );
}

function GlobalKhataContent() {
  const queryClient = useQueryClient();
  const hideCost = useCostHidden();
  const tenantName = useAuthStore((s: any) => s.user?.assignedShop?.name || s.tenant?.name || 'Meri Dukaan');
  const shopPhone = useAuthStore((s: any) => s.user?.assignedShop?.phone || s.tenant?.phone || '');
  const shopAddress = useAuthStore((s: any) => s.user?.assignedShop?.address || s.tenant?.address || '');
  const searchRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('balance-high');
  const [filter, setFilter] = useState<FilterKey>('pending');
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [customFrom, setCustomFrom] = useState<string>(toDateInput(monthStart));
  const [customTo, setCustomTo] = useState<string>(toDateInput(today));

  const [paymentModal, setPaymentModal] = useState<any>(null);
  const [showTeacher, setShowTeacher] = useState(false);
  const [showBulkReminder, setShowBulkReminder] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [singleReminderCustomer, setSingleReminderCustomer] = useState<any>(null);

  const [templates, setTemplates] = useState<Record<Tone, string>>(() => loadTemplates());
  useEffect(() => { saveTemplates(templates); }, [templates]);

  const { data: customersData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['khata-customers'],
    queryFn: () => customersApi.list({ page: 1, limit: 2000 }),
    staleTime: 30_000,
  });

  const { data: allSales = [] } = useQuery({
    queryKey: ['khata-sales'],
    queryFn: () => salesApi.list(),
    staleTime: 60_000,
  });

  const customers: any[] = customersData?.items ?? [];

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

  const khataData = useMemo(() => {
    return customers.map((c: any) => {
      let custSales = allSales.filter((s: any) => s.customer?.id === c.id);
      if (period !== 'all') {
        custSales = custSales.filter((s: any) => {
          const d = new Date(s.soldAt).getTime();
          return d >= periodStart.getTime() && d <= periodEnd.getTime();
        });
      }
      const totalSales = custSales.reduce((a: number, s: any) => a + Number(s.total || 0), 0);
      const totalPaid = custSales.reduce((a: number, s: any) => a + Number(s.paidAmount || 0), 0);
      const pendingSales = custSales.filter((s: any) => Number(s.creditAmount || 0) > 0);
      const lastSaleAt = custSales.length > 0
        ? Math.max(...custSales.map((s: any) => new Date(s.soldAt).getTime()))
        : 0;
      const oldestDueAt = pendingSales.length > 0
        ? Math.min(...pendingSales.map((s: any) => new Date(s.soldAt).getTime()))
        : 0;
      const ageDays = oldestDueAt > 0 ? Math.floor((Date.now() - oldestDueAt) / DAY) : 0;
      const balance = Number(c.balance || 0);
      const detected = detectFromName(c.name || '');
      return {
        ...c,
        balance,
        isAdvance: balance < 0,
        absBalance: Math.abs(balance),
        totalSales, totalPaid,
        salesCount: custSales.length,
        pendingCount: pendingSales.length,
        pendingSales, allSales: custSales,
        lastSaleAt, oldestDueAt, ageDays,
        detectedGender: detected.gender,
        isElder: detected.isElder,
      };
    });
  }, [customers, allSales, period, periodStart, periodEnd]);

  const filtered = useMemo(() => {
    let list = khataData;
    if (filter === 'pending') list = list.filter((c) => c.balance > 0);
    if (filter === 'clear') list = list.filter((c) => c.balance === 0 && c.salesCount > 0);
    if (filter === 'high') list = list.filter((c) => c.balance > 10000);
    if (filter === 'aging30') list = list.filter((c) => c.balance > 0 && c.ageDays >= 30);
    if (filter === 'advance') list = list.filter((c) => c.balance < 0);

    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter((c) =>
        c.name?.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q),
      );
    }

    list = [...list].sort((a, b) => {
      if (sortKey === 'balance-high') return b.balance - a.balance;
      if (sortKey === 'balance-low') return a.balance - b.balance;
      if (sortKey === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortKey === 'recent') return b.lastSaleAt - a.lastSaleAt;
      if (sortKey === 'oldest-due') return (b.ageDays || 0) - (a.ageDays || 0);
      return 0;
    });
    return list;
  }, [khataData, search, sortKey, filter]);

  const stats = useMemo(() => {
    const due = khataData.filter((c) => c.balance > 0);
    const advance = khataData.filter((c) => c.balance < 0);
    const totalDue = due.reduce((a, c) => a + c.balance, 0);
    const totalAdvance = advance.reduce((a, c) => a + Math.abs(c.balance), 0);
    const withDues = due.length;
    const clearCustomers = khataData.filter((c) => c.balance === 0 && c.salesCount > 0).length;
    const highDue = due.filter((c) => c.balance > 10000).length;
    const aging = {
      fresh: due.filter((c) => c.ageDays < 7).reduce((a, c) => a + c.balance, 0),
      week: due.filter((c) => c.ageDays >= 7 && c.ageDays < 30).reduce((a, c) => a + c.balance, 0),
      old: due.filter((c) => c.ageDays >= 30).reduce((a, c) => a + c.balance, 0),
      oldCount: due.filter((c) => c.ageDays >= 30).length,
    };
    return {
      totalDue, totalAdvance, withDues, clearCustomers, highDue,
      totalCustomers: khataData.length, aging,
      advanceCount: advance.length,
    };
  }, [khataData]);

  const paymentMutation = useMutation({
    mutationFn: async ({ customerId, amount, note }: { customerId: string; amount: number; note?: string }) => {
      return customerLedgerApi.receivePayment(customerId, { amount, note });
    },
    onSuccess: (_, vars) => {
      toast.success(`${formatPKR(vars.amount)} wasool ho gaye ✓`);
      setPaymentModal(null);
      invalidateAll();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Payment fail'),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['khata-customers'] });
    queryClient.invalidateQueries({ queryKey: ['khata-sales'] });
    queryClient.invalidateQueries({ queryKey: ['khata-ledger'] });
    queryClient.invalidateQueries({ queryKey: ['khata-summary'] });
    queryClient.invalidateQueries({ queryKey: ['customers-for-pos'] });
    queryClient.invalidateQueries({ queryKey: ['customers'] });
  };

  const reminderList = useMemo(() =>
    khataData
      .filter((c) => c.balance > 0 && c.phone)
      .sort((a, b) => b.balance - a.balance),
    [khataData]);

  /* ═══ PRINT A4 REPORT ═══ */
  const printA4Report = () => {
    if (filtered.length === 0) return toast.error('Koi data nahi is filter me');

    const rowsHtml = filtered.map((c, i) => {
      const balColor = c.isAdvance ? '#059669' : c.balance > 10000 ? '#b91c1c' : c.balance > 0 ? '#d97706' : '#64748b';
      const balLabel = c.isAdvance ? `+${formatPKR(c.absBalance)}` : c.balance > 0 ? `−${formatPKR(c.balance)}` : '—';
      const statusPill = c.isAdvance
        ? `<span class="pill" style="background:#059669">ADVANCE</span>`
        : c.ageDays >= 30
          ? `<span class="pill" style="background:#b91c1c">🔥 ${c.ageDays}d</span>`
          : c.balance > 10000
            ? `<span class="pill" style="background:#dc2626">HIGH</span>`
            : c.balance > 0
              ? `<span class="pill" style="background:#d97706">UDHAAR</span>`
              : `<span class="pill" style="background:#10b981">CLEAR</span>`;
      return `
        <tr>
          <td class="num">${i + 1}</td>
          <td class="name">
            <div class="n-main">${escapeHtml(c.name || 'Unknown')}</div>
            ${c.phone ? `<div class="n-sub">📞 ${escapeHtml(c.phone)}</div>` : ''}
          </td>
          <td>${statusPill}</td>
          <td class="c-count">${c.salesCount}</td>
          <td class="c-count">${c.pendingCount || '—'}</td>
          <td class="date">${c.lastSaleAt ? formatDate(new Date(c.lastSaleAt)) : '—'}</td>
          <td class="date">${c.ageDays > 0 ? c.ageDays + ' din' : '—'}</td>
          <td class="amt" style="color:${balColor}">${balLabel}</td>
        </tr>`;
    }).join('');

    const agingSection = stats.withDues > 0 ? `
      <div class="section-title">📅 Aging Breakdown</div>
      <div class="aging-grid">
        <div class="aging-card" style="border-color:#10b981;background:#ecfdf5;">
          <div class="aging-emoji">🌱</div>
          <div class="aging-label">Naya (0-7 din)</div>
          <div class="aging-value" style="color:#065f46;">${formatPKR(stats.aging.fresh)}</div>
        </div>
        <div class="aging-card" style="border-color:#f59e0b;background:#fffbeb;">
          <div class="aging-emoji">⏰</div>
          <div class="aging-label">Week+ (7-30 din)</div>
          <div class="aging-value" style="color:#92400e;">${formatPKR(stats.aging.week)}</div>
        </div>
        <div class="aging-card" style="border-color:#dc2626;background:#fef2f2;">
          <div class="aging-emoji">🔥</div>
          <div class="aging-label">Purana (30+ din)</div>
          <div class="aging-value" style="color:#991b1b;">${formatPKR(stats.aging.old)}</div>
          <div class="aging-sub">${stats.aging.oldCount} customers</div>
        </div>
      </div>
    ` : '';

    const html = `<!doctype html>
<html><head><meta charset="utf-8"/>
<title>Khata Report — ${escapeHtml(tenantName)}</title>
<style>
  @page { size: A4; margin: 12mm 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    color: #0f172a; font-size: 10.5px; line-height: 1.45; background: #fff;
    -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
  }
  .header {
    background: linear-gradient(135deg, #0f172a 0%, #7c2d12 50%, #b45309 100%);
    color: #fff; padding: 18px 20px; border-radius: 10px; margin-bottom: 14px;
    position: relative; overflow: hidden;
  }
  .header::before { content: ''; position: absolute; top: -30px; right: -30px;
    width: 140px; height: 140px; background: rgba(255,255,255,0.08); border-radius: 50%; }
  .header-inner { position: relative; display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
  .header h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.1; margin-bottom: 4px; }
  .header .shop { font-size: 12px; font-weight: 600; opacity: 0.95; margin-bottom: 8px; }
  .header .meta { display: flex; gap: 14px; font-size: 10px; font-weight: 600; opacity: 0.9; flex-wrap: wrap; }
  .header .badge { background: rgba(255,255,255,0.2); border: 1.5px solid rgba(255,255,255,0.4);
    padding: 4px 10px; border-radius: 20px; font-size: 9px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 1.5px; }
  .header .print-info { text-align: right; font-size: 9.5px; opacity: 0.85; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
  .kpi { border: 2px solid #e2e8f0; border-radius: 9px; padding: 10px 12px;
    background: linear-gradient(180deg, #f8fafc 0%, #fff 100%); }
  .kpi.rose { background: linear-gradient(135deg, #fef2f2, #fee2e2); border-color: #fca5a5; }
  .kpi.emerald { background: linear-gradient(135deg, #ecfdf5, #d1fae5); border-color: #86efac; }
  .kpi.amber { background: linear-gradient(135deg, #fffbeb, #fef3c7); border-color: #fcd34d; }
  .kpi .l { font-size: 8.5px; color: #64748b; text-transform: uppercase; letter-spacing: 1.3px; font-weight: 800; margin-bottom: 4px; }
  .kpi.rose .l { color: #991b1b; } .kpi.emerald .l { color: #065f46; } .kpi.amber .l { color: #92400e; }
  .kpi .v { font-size: 16px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px; }
  .kpi.rose .v { color: #991b1b; } .kpi.emerald .v { color: #065f46; } .kpi.amber .v { color: #92400e; }
  .kpi .s { font-size: 9px; color: #94a3b8; font-weight: 600; margin-top: 2px; }
  .section-title { font-size: 12px; font-weight: 800; color: #0f172a; text-transform: uppercase;
    letter-spacing: 1.5px; margin: 14px 0 8px; padding-bottom: 6px; border-bottom: 2.5px solid #0f172a; }
  .aging-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
  .aging-card { border: 2px solid; border-radius: 9px; padding: 10px; text-align: center; }
  .aging-emoji { font-size: 20px; }
  .aging-label { font-size: 8.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin: 4px 0 2px; }
  .aging-value { font-size: 14px; font-weight: 800; }
  .aging-sub { font-size: 9px; color: #64748b; font-weight: 600; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5px; border-radius: 8px; overflow: hidden; }
  thead th { background: #0f172a; color: #fff; padding: 8px 6px; text-align: left; font-size: 9px;
    font-weight: 800; text-transform: uppercase; letter-spacing: 1px; white-space: nowrap; }
  thead th.r { text-align: right; } thead th.c { text-align: center; }
  tbody td { padding: 7px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
  tbody tr:nth-child(even) td { background: #f8fafc; }
  td.num { width: 3%; color: #94a3b8; font-weight: 700; text-align: center; }
  td.name { width: 22%; } td.name .n-main { font-weight: 700; color: #0f172a; margin-bottom: 1px; }
  td.name .n-sub { font-size: 8.5px; color: #64748b; font-weight: 600; }
  td.c-count { width: 8%; text-align: center; font-weight: 700; color: #475569; }
  td.date { width: 11%; font-weight: 600; color: #475569; font-size: 9px; }
  td.amt { width: 12%; text-align: right; font-weight: 800; font-size: 11px; white-space: nowrap; }
  .pill { display: inline-block; padding: 3px 7px; border-radius: 4px; color: #fff; font-size: 8.5px;
    font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
  tr.grand td { background: linear-gradient(135deg, #0f172a, #7c2d12) !important; color: #fff !important;
    font-weight: 800; font-size: 13px; padding: 10px 6px; border-top: 3px solid #0f172a; }
  tr.grand td.amt-due { color: #fca5a5 !important; font-size: 15px; }
  .sigs { margin-top: 30px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; page-break-inside: avoid; }
  .sig { text-align: center; font-size: 10px; font-weight: 700; color: #475569; }
  .sig .line { border-top: 1.5px solid #0f172a; width: 100%; margin: 32px auto 6px; }
  .sig .role { text-transform: uppercase; letter-spacing: 1.2px; font-size: 9px; color: #64748b; }
  .footer { margin-top: 20px; padding-top: 10px; border-top: 2px solid #0f172a; font-size: 8.5px;
    color: #64748b; text-align: center; line-height: 1.5; }
  .footer strong { color: #0f172a; font-weight: 800; }
  @media print { body { padding: 0; } .header, .kpis, .aging-grid, .sigs { break-inside: avoid; } tr, td, th { break-inside: avoid; } }
</style></head><body>
  <div class="header">
    <div class="header-inner">
      <div>
        <div class="badge">Customer Khata Report</div>
        <h1 style="margin-top:8px;">📔 Udhaar Ledger</h1>
        <div class="shop">🏪 ${escapeHtml(tenantName)}${shopAddress ? ` • ${escapeHtml(shopAddress)}` : ''}</div>
        <div class="meta">
          <span>📅 <strong>Period:</strong> ${escapeHtml(periodLabel)}</span>
          <span>👥 <strong>Customers:</strong> ${filtered.length} of ${stats.totalCustomers}</span>
        </div>
      </div>
      <div class="print-info">
        <div><strong>Generated:</strong></div>
        <div>${new Date().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</div>
      </div>
    </div>
  </div>
  <div class="kpis">
    <div class="kpi rose"><div class="l">💸 Total Udhaar</div><div class="v">${formatPKR(stats.totalDue)}</div><div class="s">${stats.withDues} customers</div></div>
    <div class="kpi emerald"><div class="l">💰 Advance</div><div class="v">${formatPKR(stats.totalAdvance)}</div><div class="s">${stats.advanceCount} customers</div></div>
    <div class="kpi amber"><div class="l">🔥 30+ Din</div><div class="v">${formatPKR(stats.aging.old)}</div><div class="s">${stats.aging.oldCount} customers</div></div>
    <div class="kpi"><div class="l">✅ Clear</div><div class="v">${stats.clearCustomers}</div><div class="s">Zero balance</div></div>
  </div>
  ${agingSection}
  <div class="section-title">📋 Customer Ledger — ${escapeHtml(periodLabel)}</div>
  <table>
    <thead><tr><th>#</th><th>Customer / Phone</th><th>Status</th><th class="c">Sales</th><th class="c">Pending</th><th>Last Sale</th><th>Age</th><th class="r">Balance</th></tr></thead>
    <tbody>
      ${rowsHtml}
      <tr class="grand"><td colspan="7" style="text-align:right;padding-right:14px;">GRAND TOTAL UDHAAR</td><td class="amt amt-due" style="text-align:right;">−${formatPKR(stats.totalDue)}</td></tr>
    </tbody>
  </table>
  <div class="sigs">
    <div class="sig"><div class="line"></div><div class="role">Prepared By</div></div>
    <div class="sig"><div class="line"></div><div class="role">Verified By</div></div>
    <div class="sig"><div class="line"></div><div class="role">Customer Ack.</div></div>
  </div>
  <div class="footer"><strong>${escapeHtml(tenantName)}</strong>${shopPhone ? ` • ${escapeHtml(shopPhone)}` : ''}<br/>Powered by <strong>Nafaa POS</strong> — ${new Date().getFullYear()}</div>
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 400); };</script>
</body></html>`;

    const w = window.open('', '_blank', 'width=1000,height=800');
    if (!w) return toast.error('Popup blocked — allow popups!');
    w.document.open(); w.document.write(html); w.document.close();
    toast.success('Report ready');
  };

  const printCustomerStatement = (c: any) => {
    const salesHtml = c.allSales.length === 0
      ? `<div class="center" style="font-size:10px;margin:6px 0;">Koi purchase nahi</div>`
      : [...c.allSales].sort((a: any, b: any) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime()).slice(0, 20).map((s: any) => `
          <div class="sale-row">
            <div class="sale-line1"><span>${escapeHtml(s.saleNumber || '-')}</span><span>${formatPKR(s.total)}</span></div>
            <div class="sale-line2"><span>${new Date(s.soldAt).toLocaleDateString('en-PK')}</span>${Number(s.creditAmount || 0) > 0 ? `<span class="baqi">Baqi ${formatPKR(s.creditAmount)}</span>` : `<span>✓ Paid</span>`}</div>
          </div>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Statement — ${escapeHtml(c.name)}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 80mm; }
  body { font-family: 'Courier New', monospace; padding: 5mm 4mm; color: #000; font-size: 12px; line-height: 1.4; background: #fff; }
  .center { text-align: center; } .bold { font-weight: 700; } .xl { font-size: 16px; font-weight: 800; letter-spacing: 1px; } .huge { font-size: 22px; font-weight: 800; }
  .divider { border-top: 1px dashed #000; margin: 8px 0; } .double { border-top: 2px solid #000; margin: 8px 0; }
  .row { display: flex; justify-content: space-between; gap: 8px; margin: 3px 0; }
  .row .k { font-weight: 600; } .row .v { font-weight: 700; text-align: right; }
  .badge { display: inline-block; border: 1.5px solid #000; padding: 3px 10px; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; margin: 6px 0; }
  .balance-box { border: 2.5px solid #000; padding: 10px 8px; margin: 8px 0; text-align: center; }
  .balance-box .l { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; margin-bottom: 3px; }
  .sale-row { padding: 4px 0; border-bottom: 1px dotted #666; font-size: 10px; }
  .sale-line1 { display: flex; justify-content: space-between; font-weight: 700; }
  .sale-line2 { display: flex; justify-content: space-between; font-size: 9px; color: #333; margin-top: 1px; }
  .baqi { font-weight: 800; color: #000; }
  .sig-block { margin-top: 20px; } .sig-line { border-bottom: 1px solid #000; height: 14px; margin: 4px 0 2px; }
  .sig-label { font-size: 9px; font-weight: 700; letter-spacing: 1px; }
</style></head><body>
  <div class="center xl">${escapeHtml(tenantName)}</div>
  ${shopAddress ? `<div class="center" style="font-size:10px;margin-top:2px;">${escapeHtml(shopAddress)}</div>` : ''}
  ${shopPhone ? `<div class="center" style="font-size:10px;">Ph: ${escapeHtml(shopPhone)}</div>` : ''}
  <div class="divider"></div>
  <div class="center"><span class="badge">CUSTOMER STATEMENT</span></div>
  <div class="row"><span class="k">Customer:</span><span class="v">${escapeHtml(c.name)}</span></div>
  ${c.phone ? `<div class="row"><span class="k">Phone:</span><span class="v">${escapeHtml(c.phone)}</span></div>` : ''}
  <div class="row"><span class="k">Statement:</span><span class="v">${escapeHtml(periodLabel)}</span></div>
  <div class="row"><span class="k">Printed:</span><span class="v">${new Date().toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
  <div class="divider"></div>
  <div class="bold" style="font-size:11px;">SUMMARY:</div>
  <div class="row"><span class="k">Total Sales:</span><span class="v">${c.salesCount}</span></div>
  <div class="row"><span class="k">Total Amount:</span><span class="v">${formatPKR(c.totalSales)}</span></div>
  <div class="row"><span class="k">Total Paid:</span><span class="v">${formatPKR(c.totalPaid)}</span></div>
  <div class="row"><span class="k">Pending Bills:</span><span class="v">${c.pendingCount}</span></div>
  ${c.ageDays > 0 ? `<div class="row"><span class="k">Oldest Due:</span><span class="v">${c.ageDays} din</span></div>` : ''}
  <div class="balance-box">
    <div class="l">${c.isAdvance ? 'ADVANCE (HAMARE PAAS)' : c.balance > 0 ? 'UDHAAR BAQI' : 'KHATA CLEAR'}</div>
    <div class="huge">${c.balance === 0 ? '—' : (c.isAdvance ? '+' : '−') + formatPKR(c.absBalance)}</div>
  </div>
  <div class="divider"></div>
  <div class="bold" style="font-size:11px;margin-bottom:4px;">SALES HISTORY:</div>
  ${salesHtml}
  <div class="double"></div>
  <div class="sig-block"><div class="sig-line"></div><div class="row"><span class="sig-label">CUSTOMER SIGN:</span><span></span></div></div>
  <div class="sig-block"><div class="sig-line"></div><div class="row"><span class="sig-label">SHOPKEEPER:</span><span></span></div></div>
  <div class="divider"></div>
  <div class="center bold" style="margin-top:8px;letter-spacing:2px;">* * SHUKRIYA * *</div>
  <script>window.onload=function(){setTimeout(function(){window.print();setTimeout(function(){window.close();},800);},250);};</script>
</body></html>`;
    const w = window.open('', '_blank', 'width=400,height=700');
    if (!w) return toast.error('Popup blocked!');
    w.document.open(); w.document.write(html); w.document.close();
  };

  const exportCSV = () => {
    if (filtered.length === 0) return toast.error('Koi data nahi');
    const head = ['#', 'Naam', 'Phone', 'Status', 'Balance', 'Total Sales', 'Sales Count', 'Pending Bills', 'Age (days)', 'Last Sale'];
    const rows = filtered.map((c, i) => [
      String(i + 1), c.name || '', c.phone || '',
      c.isAdvance ? 'ADVANCE' : c.balance > 0 ? 'UDHAAR' : 'CLEAR',
      c.isAdvance ? Number(c.absBalance).toFixed(2) : c.balance > 0 ? '-' + Number(c.balance).toFixed(2) : '0',
      Number(c.totalSales).toFixed(2), String(c.salesCount), String(c.pendingCount),
      String(c.ageDays || ''), c.lastSaleAt ? formatDate(new Date(c.lastSaleAt)) : '',
    ]);
    const csv = [
      [`Khata Report — ${tenantName}`], [`Period: ${periodLabel}`],
      [`Generated: ${new Date().toLocaleString('en-PK')}`],
      [`Total Udhaar: ${formatPKR(stats.totalDue)}`], [''], head, ...rows,
    ].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `khata-${toDateInput(new Date())}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} entries export`);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault(); searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (showBulkReminder) setShowBulkReminder(false);
        else if (showTeacher) setShowTeacher(false);
        else if (showPrintOptions) setShowPrintOptions(false);
        else if (showTemplateEditor) setShowTemplateEditor(false);
        else if (singleReminderCustomer) setSingleReminderCustomer(null);
        else if (paymentModal) setPaymentModal(null);
      }
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key.toLowerCase() === 'p') { e.preventDefault(); setShowPrintOptions(true); }
      if (e.key.toLowerCase() === 't') { e.preventDefault(); setShowTeacher(true); }
      if (e.key.toLowerCase() === 'n' && reminderList.length > 0) { e.preventDefault(); setShowBulkReminder(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line
  }, [showBulkReminder, showTeacher, paymentModal, showPrintOptions, showTemplateEditor, singleReminderCustomer, reminderList.length]);

  return (
    <>
      {paymentModal && (
        <PaymentModal
          customer={paymentModal}
          loading={paymentMutation.isPending}
          onClose={() => setPaymentModal(null)}
          onConfirm={(amount: number, note: string) => paymentMutation.mutate({ customerId: paymentModal.id, amount, note })}
        />
      )}

      {showTeacher && (
        <KhataTeacher
          onClose={() => setShowTeacher(false)}
          onStartBulk={() => { setShowTeacher(false); setShowBulkReminder(true); }}
          onEditTemplates={() => { setShowTeacher(false); setShowTemplateEditor(true); }}
          hasDues={stats.withDues > 0}
        />
      )}

      {showBulkReminder && (
        <BulkReminderWizard
          customers={reminderList}
          shopName={tenantName}
          templates={templates}
          onEditTemplates={() => setShowTemplateEditor(true)}
          onClose={() => setShowBulkReminder(false)}
        />
      )}

      {singleReminderCustomer && (
        <SingleReminderModal
          customer={singleReminderCustomer}
          shopName={tenantName}
          templates={templates}
          onEditTemplates={() => setShowTemplateEditor(true)}
          onClose={() => setSingleReminderCustomer(null)}
        />
      )}

      {showTemplateEditor && (
        <TemplateEditorModal
          templates={templates}
          onSave={(t: Record<Tone, string>) => { setTemplates(t); setShowTemplateEditor(false); toast.success('Templates save ho gaye ✓'); }}
          onReset={() => { setTemplates({ ...DEFAULT_TEMPLATES }); toast.success('Default templates restore ho gaye'); }}
          onClose={() => setShowTemplateEditor(false)}
          shopName={tenantName}
        />
      )}

      {showPrintOptions && (
        <PrintOptionsModal
          filtered={filtered}
          totalDue={stats.totalDue}
          periodLabel={periodLabel}
          onA4={() => { printA4Report(); setShowPrintOptions(false); }}
          onCSV={() => { exportCSV(); setShowPrintOptions(false); }}
          onClose={() => setShowPrintOptions(false)}
        />
      )}

      <div className="space-y-4 sm:space-y-5 pb-10">
        {/* ═══ HERO ═══ */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-purple-900 to-fuchsia-800 dark:from-slate-950 dark:via-purple-950 dark:to-fuchsia-900 text-white p-5 sm:p-7 shadow-2xl">
          <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-fuchsia-500/30 blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" style={{ transform: 'translate(-50%, -50%)' }} />
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }} />

          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-xl px-3 py-1.5 text-[11px] font-black border border-white/20 uppercase tracking-widest shadow-lg">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-fuchsia-400" />
                </span>
                <BookOpen className="h-3.5 w-3.5 text-fuchsia-300" /> Khata Book
                <span className="opacity-40">•</span>
                <span className="text-fuchsia-200">🏪 {tenantName}</span>
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight">
                <span className="bg-gradient-to-r from-white via-fuchsia-100 to-cyan-200 bg-clip-text text-transparent">
                  📔 Udhaar Book
                </span>
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-white/85 font-bold">
                {stats.withDues > 0 ? (
                  <>
                    <strong className="text-fuchsia-300">{stats.withDues}</strong> customers ka{' '}
                    <strong className="text-cyan-300">{formatPKR(stats.totalDue)}</strong> baqi
                    {stats.aging.old > 0 && (
                      <> <span className="opacity-50 mx-1">•</span> <strong className="text-rose-300">🔥 {formatPKR(stats.aging.old)}</strong> 30+ din</>
                    )}
                    {stats.totalAdvance > 0 && (
                      <> <span className="opacity-50 mx-1">•</span> <strong className="text-emerald-300">+{formatPKR(stats.totalAdvance)}</strong> advance</>
                    )}
                  </>
                ) : (
                  <>Sab clear — MashaAllah! ✨</>
                )}
              </p>
            </div>

            <div className="flex gap-2 flex-wrap items-center shrink-0">
              <button
                onClick={() => setShowTeacher(true)}
                className="h-11 w-11 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 flex items-center justify-center transition"
                title="Guide (T)"
              >
                <GraduationCap className="h-5 w-5" />
              </button>
              <PrivacyToggle compact />
              <button
                onClick={() => refetch()}
                disabled={isRefetching}
                className="h-11 w-11 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 flex items-center justify-center disabled:opacity-50 transition"
              >
                <RefreshCw className={`h-5 w-5 ${isRefetching ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowPrintOptions(true)}
                disabled={filtered.length === 0}
                className="h-11 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-black inline-flex items-center gap-1.5 shadow-lg shadow-cyan-500/40 disabled:opacity-50 transition"
              >
                <Printer className="h-4 w-4" /> Print <Kbd>P</Kbd>
              </button>
              <Link to="/pos">
                <button className="h-11 px-4 rounded-2xl bg-white text-purple-900 hover:bg-fuchsia-50 text-sm font-black inline-flex items-center gap-1.5 shadow-2xl transition hover:scale-[1.03] active:scale-95">
                  <ShoppingCart className="h-4 w-4" /> POS
                </button>
              </Link>
            </div>
          </div>

          {stats.withDues > 0 && (
            <div className="relative mt-5 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-cyan-500/15 to-blue-500/20 backdrop-blur-xl border border-emerald-300/30 p-3.5 flex items-center gap-3 flex-wrap overflow-hidden group hover:border-emerald-300/60 transition">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <div className="relative h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/50 shrink-0">
                <BellRing className="h-5 w-5 animate-pulse" />
              </div>
              <div className="relative flex-1 min-w-0">
                <div className="font-black text-sm">Sab ko yaad dilao — 1 click 🔔</div>
                <div className="text-[11px] text-white/80 font-bold flex items-center gap-2 flex-wrap">
                  <span>{reminderList.length} customers • ready messages</span>
                  <button
                    onClick={() => setShowTemplateEditor(true)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-[10px] font-black transition"
                  >
                    <Edit3 className="h-2.5 w-2.5" /> Templates
                  </button>
                </div>
              </div>
              <button
                onClick={() => reminderList.length > 0 ? setShowBulkReminder(true) : toast.error('Kisi ka phone nahi')}
                className="relative h-11 px-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-300 hover:to-cyan-400 text-white text-xs font-black inline-flex items-center gap-1.5 shadow-lg shadow-emerald-500/50 transition active:scale-95"
              >
                <MessageCircle className="h-4 w-4" /> Reminders <Kbd>N</Kbd>
              </button>
            </div>
          )}

          <div className="relative mt-3 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-black items-center">
            <Kbd>/</Kbd><span className="text-white/60">Search</span>
            <span className="text-white/30 mx-1">•</span>
            <Kbd>N</Kbd><span className="text-white/60">Reminders</span>
            <span className="text-white/30 mx-1">•</span>
            <Kbd>P</Kbd><span className="text-white/60">Print</span>
            <span className="text-white/30 mx-1">•</span>
            <Kbd>T</Kbd><span className="text-white/60">Guide</span>
          </div>
        </section>

        {/* ═══ KPIs ═══ */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <Kpi icon={TrendingDown} label="Total Udhaar" value={hideCost ? '••••' : formatPKR(stats.totalDue)} sub={`${stats.withDues} customers`} tone="rose" highlight />
          <Kpi icon={TrendingUp} label="Advance" value={hideCost ? '••••' : formatPKR(stats.totalAdvance)} sub={`${stats.advanceCount} customers`} tone="emerald" active={filter === 'advance'} onClick={() => setFilter(filter === 'advance' ? 'pending' : 'advance')} />
          <Kpi icon={AlertTriangle} label="10K+ Udhaar" value={stats.highDue} sub="Bara udhaar" tone="amber" active={filter === 'high'} onClick={() => setFilter(filter === 'high' ? 'pending' : 'high')} />
          <Kpi icon={Flame} label="30+ Din" value={stats.aging.oldCount} sub={hideCost ? '••••' : formatPKR(stats.aging.old)} tone="rose" active={filter === 'aging30'} onClick={() => setFilter(filter === 'aging30' ? 'pending' : 'aging30')} />
        </section>

        {stats.withDues > 0 && !hideCost && (
          <section className="rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-fuchsia-500 via-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/40">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-sm">Udhaar Kitna Purana?</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Jitna purana, utna mushkil wasooli</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <AgingBucket emoji="🌱" label="Naya (0-7 din)" value={stats.aging.fresh} tone="emerald" />
              <AgingBucket emoji="⏰" label="Week+ (7-30)" value={stats.aging.week} tone="amber" />
              <AgingBucket emoji="🔥" label="Purana (30+)" value={stats.aging.old} tone="rose" />
            </div>
          </section>
        )}

        {/* Period */}
        <section className="rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 p-3 space-y-3">
          <div className="flex gap-1.5 flex-wrap items-center">
            <div className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider mr-1">Period:</div>
            {(['all', 'today', 'week', 'month', 'year'] as PeriodFilter[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                  period === p
                    ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-lg shadow-fuchsia-500/40'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {p === 'all' ? 'Sab' : p === 'today' ? 'Aaj' : p === 'week' ? '7D' : p === 'month' ? '30D' : '1Y'}
              </button>
            ))}
            <button
              onClick={() => setPeriod('custom')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition inline-flex items-center gap-1.5 ${
                period === 'custom'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/40'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <CalendarRange className="h-3.5 w-3.5" /> Custom
            </button>
          </div>

          {period === 'custom' && (
            <div className="rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-500/10 dark:to-blue-500/10 border-2 border-cyan-300 dark:border-cyan-500/40 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-md">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-cyan-900 dark:text-cyan-100">Custom Date Range</h4>
                  <p className="text-[10px] text-cyan-700 dark:text-cyan-300 font-bold">Apni marzi ke dates</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-black text-cyan-700 dark:text-cyan-300 tracking-wider mb-1">📅 From</label>
                  <input type="date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)}
                    className="h-11 w-full rounded-xl border-2 border-cyan-300 dark:border-cyan-500/40 bg-white dark:bg-slate-800 px-3 text-sm font-black text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 transition" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-black text-cyan-700 dark:text-cyan-300 tracking-wider mb-1">📅 To</label>
                  <input type="date" value={customTo} min={customFrom} max={toDateInput(new Date())} onChange={(e) => setCustomTo(e.target.value)}
                    className="h-11 w-full rounded-xl border-2 border-cyan-300 dark:border-cyan-500/40 bg-white dark:bg-slate-800 px-3 text-sm font-black text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 transition" />
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { l: 'Last 15 Din', fn: () => { const s = new Date(); s.setDate(s.getDate() - 15); setCustomFrom(toDateInput(s)); setCustomTo(toDateInput(new Date())); } },
                  { l: 'Ye Mahina', fn: () => { const n = new Date(); setCustomFrom(toDateInput(new Date(n.getFullYear(), n.getMonth(), 1))); setCustomTo(toDateInput(n)); } },
                  { l: 'Pichla Mahina', fn: () => { const n = new Date(); const l = new Date(n.getFullYear(), n.getMonth() - 1, 1); const e = new Date(n.getFullYear(), n.getMonth(), 0); setCustomFrom(toDateInput(l)); setCustomTo(toDateInput(e)); } },
                  { l: 'Is Saal', fn: () => { const n = new Date(); setCustomFrom(toDateInput(new Date(n.getFullYear(), 0, 1))); setCustomTo(toDateInput(n)); } },
                ].map((p) => (
                  <button key={p.l} onClick={p.fn}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border-2 border-cyan-200 dark:border-cyan-500/40 text-[10px] font-black text-cyan-700 dark:text-cyan-300 hover:border-cyan-400 transition">
                    {p.l}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Toolbar */}
        <section className="rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 p-4 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Customer naam ya phone... (/)"
                className="h-12 w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-10 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:focus:ring-fuchsia-500/30 transition"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="h-12 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-black text-slate-900 dark:text-white focus:outline-none focus:border-fuchsia-500 transition">
              <option value="balance-high">💰 Zyada udhaar</option>
              <option value="balance-low">Kam udhaar</option>
              <option value="oldest-due">🔥 Sab se purana</option>
              <option value="recent">🕐 Nayi sales</option>
              <option value="name">🔤 Naam A-Z</option>
            </select>
          </div>

          <div className="flex gap-1.5 flex-wrap items-center">
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 flex-wrap">
              {[
                { v: 'pending', l: 'Baqi', c: stats.withDues },
                { v: 'all', l: 'Sab', c: stats.totalCustomers },
                { v: 'clear', l: 'Clear', c: stats.clearCustomers },
                { v: 'high', l: '10K+', c: stats.highDue },
                { v: 'aging30', l: '🔥 30+', c: stats.aging.oldCount },
                { v: 'advance', l: '💰 Advance', c: stats.advanceCount },
              ].map((o) => (
                <button
                  key={o.v}
                  onClick={() => setFilter(o.v as FilterKey)}
                  className={[
                    'px-3 py-1.5 rounded-lg text-xs font-black transition inline-flex items-center gap-1.5',
                    filter === o.v ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
                  ].join(' ')}
                >
                  {o.l}
                  <span className={['px-1.5 rounded text-[10px] tabular-nums', filter === o.v ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'].join(' ')}>
                    {o.c}
                  </span>
                </button>
              ))}
            </div>
            <div className="ml-auto text-xs font-black text-slate-500 dark:text-slate-400 tabular-nums">
              {filtered.length} customers
            </div>
          </div>
        </section>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-dashed border-slate-300 dark:border-slate-700 p-12 sm:p-16 text-center">
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-fuchsia-100 to-purple-200 dark:from-fuchsia-500/20 dark:to-purple-500/20 mx-auto flex items-center justify-center">
              {filter === 'pending' ? <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" /> : <BookOpen className="h-10 w-10 text-fuchsia-600 dark:text-fuchsia-400" />}
            </div>
            <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">
              {filter === 'pending' && stats.withDues === 0 ? 'MashaAllah! Sab clear ✨' : search ? 'Koi nahi mila' : 'Khaate mein kuch nahi'}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 font-bold max-w-md mx-auto">
              {filter === 'pending' && stats.withDues === 0
                ? 'Kisi ka udhaar nahi — zabardast!'
                : search ? 'Doosra naam try karo'
                : 'POS se udhaar sale karo — customer ka khaata yahan aa jayega'}
            </p>
            <div className="mt-4 flex gap-2 justify-center flex-wrap">
              {search && <Button variant="secondary" className="font-black" onClick={() => setSearch('')}><X className="h-4 w-4" /> Clear</Button>}
              <Link to="/pos">
                <button className="h-11 px-4 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-700 hover:from-fuchsia-500 hover:to-purple-600 text-white text-xs font-black inline-flex items-center gap-1.5 shadow-lg shadow-fuchsia-500/40 transition">
                  <ShoppingCart className="h-4 w-4" /> POS Khol Ke Sale Karo
                </button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((c) => (
              <CustomerKhataRow
                key={c.id} customer={c} expanded={expandedId === c.id} hideCost={hideCost}
                onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
                onPayment={() => setPaymentModal(c)}
                onReminder={() => setSingleReminderCustomer(c)}
                onPrintStatement={() => printCustomerStatement(c)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ═════════════════════════════════════════════════════════════
   💬 SINGLE REMINDER MODAL
   ═════════════════════════════════════════════════════════════ */
function SingleReminderModal({ customer, shopName, templates, onEditTemplates, onClose }: any) {
  const detected = detectFromName(customer.name || '');
  const autoTone: Tone = customer.ageDays >= 30 ? 'final' : customer.ageDays >= 7 ? 'firm' : 'polite';
  const [tone, setTone] = useState<Tone>(autoTone);
  const [salutation, setSalutation] = useState<Salutation>('auto');
  const [customMsg, setCustomMsg] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [copied, setCopied] = useState(false);

  const generatedMsg = fillTemplate(templates[tone], customer, shopName, salutation);
  const finalMsg = isCustom ? customMsg : generatedMsg;

  useEffect(() => {
    if (!isCustom) setCustomMsg(generatedMsg);
    // eslint-disable-next-line
  }, [tone, salutation]);

  const openWhatsApp = () => {
    if (!customer.phone) return toast.error('Phone number nahi hai');
    const phone = String(customer.phone).replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('92') ? phone : phone.startsWith('0') ? '92' + phone.slice(1) : '92' + phone;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(finalMsg)}`, '_blank');
    toast.success('WhatsApp khul gaya ✓');
    onClose();
  };

  const copyMsg = () => {
    navigator.clipboard.writeText(finalMsg);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success('Copy ho gaya');
  };

  const resolvedSal = resolveSalutation(customer.name, salutation);
  const genderIcon = detected.gender === 'F' ? '👩' : detected.gender === 'M' ? '👨' : '👤';

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 relative bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 text-white px-5 py-4 overflow-hidden">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-emerald-400/25 blur-2xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur px-2.5 py-0.5 text-[10px] font-black border border-white/30">
                <MessageCircle className="h-3 w-3" /> WhatsApp Reminder
              </div>
              <h3 className="text-xl font-black mt-2 truncate">{genderIcon} {customer.name}</h3>
              <div className="text-xs text-white/85 font-bold mt-1 flex items-center gap-2 flex-wrap">
                <span>📞 {customer.phone}</span>
                <span>•</span>
                <span className="text-amber-200">{formatPKR(customer.balance)}</span>
                {customer.ageDays >= 7 && (
                  <>
                    <span>•</span>
                    <span className="text-rose-200">{customer.ageDays} din se</span>
                  </>
                )}
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/10 border border-white/20 text-[10px] font-black">
                <Wand2 className="h-2.5 w-2.5" />
                AI: {detected.gender === 'F' ? 'Female' : detected.gender === 'M' ? 'Male' : 'Unknown'}
                {detected.isElder && ' • Elder'}
                {resolvedSal ? ` → "${resolvedSal}"` : ' → no salutation'}
              </div>
            </div>
            <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/20 hover:bg-white/30 active:scale-95 flex items-center justify-center transition shrink-0">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <div className="text-[10px] uppercase font-black text-slate-500 dark:text-slate-400 tracking-wider mb-1.5">Tone</div>
            <div className="grid grid-cols-3 gap-1.5">
              {REMINDER_TONES.map((t) => (
                <button
                  key={t.v}
                  onClick={() => { setTone(t.v); setIsCustom(false); }}
                  className={[
                    'p-2.5 rounded-xl border-2 text-center transition',
                    tone === t.v && !isCustom
                      ? `border-transparent bg-gradient-to-br ${t.grad} text-white shadow-lg`
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300',
                  ].join(' ')}
                >
                  <div className="text-sm font-black">{t.l}</div>
                  <div className={`text-[9px] font-bold ${tone === t.v && !isCustom ? 'text-white/80' : 'text-slate-500'}`}>{t.d}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] uppercase font-black text-slate-500 dark:text-slate-400 tracking-wider">Salutation (kaise pukaro)</div>
              {salutation === 'auto' && (
                <div className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5" /> AI ne pehchan liya
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SALUTATIONS.map((s) => (
                <button
                  key={s.v}
                  onClick={() => { setSalutation(s.v); setIsCustom(false); }}
                  title={s.d}
                  className={`px-2.5 py-1.5 rounded-lg border-2 text-[11px] font-black transition ${
                    salutation === s.v
                      ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 border-transparent text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-fuchsia-300'
                  }`}
                >
                  {s.l}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] uppercase font-black text-slate-500 dark:text-slate-400 tracking-wider">
                Message {isCustom && <span className="text-amber-600 dark:text-amber-400 ml-1">✏️ Custom</span>}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={onEditTemplates}
                  className="text-[10px] font-black text-fuchsia-700 dark:text-fuchsia-400 inline-flex items-center gap-1 hover:underline"
                >
                  <Edit3 className="h-2.5 w-2.5" /> Templates
                </button>
                <button
                  onClick={copyMsg}
                  className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1 hover:underline"
                >
                  {copied ? <CheckCircle2 className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <textarea
              value={finalMsg}
              onChange={(e) => { setCustomMsg(e.target.value); setIsCustom(true); }}
              rows={8}
              className={`w-full rounded-2xl border-2 px-3 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed focus:outline-none transition ${
                isCustom
                  ? 'border-amber-400 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-500/10 focus:border-amber-500'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 focus:border-emerald-500'
              }`}
              placeholder="Message likho..."
            />
            {isCustom && (
              <button
                onClick={() => { setIsCustom(false); setCustomMsg(generatedMsg); }}
                className="mt-1 text-[10px] font-black text-amber-700 dark:text-amber-400 inline-flex items-center gap-1 hover:underline"
              >
                <RefreshCw className="h-2.5 w-2.5" /> Auto-generated pe wapas
              </button>
            )}
          </div>

          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-3 text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-start gap-2">
            <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              <strong>Smart:</strong> Naam ke hisaab se salutation auto-set — "Faiza baji" ✓ (bhai nahi lagega), "Uncle Shuja" ✓ (extra bhai nahi). Message me bhi manually edit kar sakte ho.
            </span>
          </div>
        </div>

        <div className="shrink-0 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 p-4 flex gap-2">
          <Button variant="secondary" className="flex-1 h-12" onClick={onClose}>
            <X className="h-4 w-4" /> Cancel
          </Button>
          <button
            onClick={openWhatsApp}
            disabled={!finalMsg.trim() || !customer.phone}
            className="flex-[2] h-12 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 disabled:opacity-40 text-white text-sm font-black inline-flex items-center justify-center gap-2 shadow-lg shadow-green-500/40 transition active:scale-95"
          >
            <MessageCircle className="h-5 w-5" /> WhatsApp Bhejo
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   ✏️ TEMPLATE EDITOR MODAL
   ═════════════════════════════════════════════════════════════ */
function TemplateEditorModal({ templates, onSave, onReset, onClose, shopName }: any) {
  const [drafts, setDrafts] = useState<Record<Tone, string>>(templates);
  const [activeTone, setActiveTone] = useState<Tone>('polite');

  const PLACEHOLDERS = [
    { k: '{name}', d: 'Customer ka naam' },
    { k: '{sal}', d: 'Salutation (auto: bhai/baji/uncle...)' },
    { k: '{greeting}', d: 'Assalam-o-Alaikum' },
    { k: '{shop}', d: 'Dukaan ka naam' },
    { k: '{amount}', d: 'Baqi paisa (Rs X)' },
    { k: '{days}', d: 'Kitne din pehle' },
    { k: '{aap}', d: 'Aap' },
    { k: '{phone}', d: 'Phone number' },
  ];

  const sampleCustomer = {
    name: 'Faiza',
    balance: 5500,
    ageDays: 12,
    phone: '03001234567',
  };

  const preview = fillTemplate(drafts[activeTone], sampleCustomer, shopName, 'auto');

  const insertPlaceholder = (p: string) => {
    setDrafts((prev) => ({ ...prev, [activeTone]: prev[activeTone] + p }));
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 relative bg-gradient-to-br from-fuchsia-600 via-purple-600 to-indigo-700 text-white px-5 py-4 overflow-hidden">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-fuchsia-400/25 blur-2xl" />
          <div className="relative flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur px-2.5 py-0.5 text-[10px] font-black border border-white/30">
                <Edit3 className="h-3 w-3" /> Template Editor
              </div>
              <h3 className="text-xl font-black mt-2">Reminder Messages Customize</h3>
              <p className="text-xs text-white/85 font-bold mt-1">Har tone ka apna message likho — save automatic</p>
            </div>
            <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/20 hover:bg-white/30 flex items-center justify-center">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="shrink-0 px-5 pt-4">
          <div className="grid grid-cols-3 gap-1.5">
            {REMINDER_TONES.map((t) => (
              <button
                key={t.v}
                onClick={() => setActiveTone(t.v)}
                className={[
                  'p-2.5 rounded-xl border-2 text-center transition',
                  activeTone === t.v
                    ? `border-transparent bg-gradient-to-br ${t.grad} text-white shadow-lg`
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300',
                ].join(' ')}
              >
                <div className="text-sm font-black">{t.l}</div>
                <div className={`text-[9px] font-bold ${activeTone === t.v ? 'text-white/80' : 'text-slate-500'}`}>{t.d}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <div className="text-[10px] uppercase font-black text-slate-500 dark:text-slate-400 tracking-wider mb-1.5">
              Placeholders (click to insert)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PLACEHOLDERS.map((p) => (
                <button
                  key={p.k}
                  onClick={() => insertPlaceholder(p.k)}
                  title={p.d}
                  className="px-2 py-1 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-500/20 border border-fuchsia-300 dark:border-fuchsia-500/40 text-[10px] font-mono font-black text-fuchsia-700 dark:text-fuchsia-300 hover:bg-fuchsia-200 dark:hover:bg-fuchsia-500/30 transition"
                >
                  {p.k}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-black text-slate-500 dark:text-slate-400 tracking-wider mb-1.5">
              Template ({activeTone})
            </div>
            <textarea
              value={drafts[activeTone]}
              onChange={(e) => setDrafts((prev) => ({ ...prev, [activeTone]: e.target.value }))}
              rows={8}
              className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-3 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-fuchsia-500 transition font-mono"
            />
          </div>

          <div>
            <div className="text-[10px] uppercase font-black text-slate-500 dark:text-slate-400 tracking-wider mb-1.5">
              Live Preview (sample: Faiza, Rs 5,500, 12 din)
            </div>
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-200 dark:border-emerald-500/30 p-3 text-sm font-semibold text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
              {preview}
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            💡 <strong>Smart:</strong> <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{sal}'}</code> automatically bhai/baji/uncle/aunty lagata hai — agar naam mein pehle se hai to skip. Faiza ✓ Uncle Shuja ✓
          </div>
        </div>

        <div className="shrink-0 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 p-4 flex gap-2">
          <button
            onClick={() => { if (confirm('Default templates restore karein?')) { onReset(); setDrafts({ ...DEFAULT_TEMPLATES }); } }}
            className="h-12 px-4 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-xs font-black text-slate-700 dark:text-slate-200 hover:border-rose-300 hover:text-rose-600 transition inline-flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reset
          </button>
          <Button variant="secondary" className="flex-1 h-12" onClick={onClose}><X className="h-4 w-4" /> Cancel</Button>
          <Button
            className="flex-1 h-12 bg-gradient-to-r from-fuchsia-600 to-purple-700 hover:from-fuchsia-500 font-black shadow-lg shadow-fuchsia-500/40"
            onClick={() => onSave(drafts)}
          >
            <CheckCircle2 className="h-4 w-4" /> Save Templates
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   🔔 BULK REMINDER WIZARD
   ═════════════════════════════════════════════════════════════ */
function BulkReminderWizard({ customers, shopName, templates, onEditTemplates, onClose }: any) {
  const [idx, setIdx] = useState(0);
  const [tone, setTone] = useState<Tone>('polite');
  const [salutation, setSalutation] = useState<Salutation>('auto');
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [customMsg, setCustomMsg] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [copied, setCopied] = useState(false);

  const total = customers.length;
  const current = customers[idx];
  const finished = doneIds.size + skippedIds.size;
  const allDone = finished >= total;

  useEffect(() => {
    if (current?.ageDays >= 30) setTone('final');
    else if (current?.ageDays >= 7) setTone('firm');
    else setTone('polite');
    setSalutation('auto');
    setIsCustom(false);
  }, [current?.id, current?.ageDays]);

  const generatedMsg = current ? fillTemplate(templates[tone], current, shopName, salutation) : '';
  const finalMsg = isCustom ? customMsg : generatedMsg;

  useEffect(() => {
    if (!isCustom) setCustomMsg(generatedMsg);
    // eslint-disable-next-line
  }, [tone, salutation, current?.id]);

  const openWhatsApp = () => {
    if (!current?.phone) return;
    const phone = String(current.phone).replace(/[^0-9]/g, '');
    const cleanPhone = phone.startsWith('92') ? phone : phone.startsWith('0') ? '92' + phone.slice(1) : '92' + phone;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(finalMsg)}`, '_blank');
    setDoneIds((p) => new Set([...p, current.id]));
  };

  const copyMsg = () => {
    navigator.clipboard.writeText(finalMsg);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success('Copy ho gaya');
  };

  const next = (skipped = false) => {
    if (current && skipped) setSkippedIds((p) => new Set([...p, current.id]));
    if (idx < total - 1) setIdx(idx + 1);
  };

  const prev = () => { if (idx > 0) setIdx(idx - 1); };

  const detected = current ? detectFromName(current.name || '') : null;
  const genderIcon = detected?.gender === 'F' ? '👩' : detected?.gender === 'M' ? '👨' : '👤';

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 text-white px-5 py-4 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-emerald-400/25 blur-2xl" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border border-white/20">
                <BellRing className="h-3 w-3 text-emerald-300" /> Bulk Reminders
              </div>
              <h3 className="font-black text-lg mt-1">Sab Ko Yaad Dilao 🔔</h3>
              <p className="text-xs text-white/80 font-bold">{allDone ? 'Ho gaya!' : `${finished}/${total} done`}</p>
            </div>
            <div className="flex gap-1.5">
              <button onClick={onEditTemplates} title="Templates edit" className="h-10 w-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition">
                <Edit3 className="h-4 w-4" />
              </button>
              <button onClick={onClose} className="h-10 w-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center shrink-0 transition">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-white/15 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-300" style={{ width: `${total > 0 ? (finished / total) * 100 : 0}%` }} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {allDone ? (
            <div className="text-center py-6">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/40">
                <CheckCheck className="h-8 w-8 text-white" />
              </div>
              <h4 className="mt-3 text-lg font-black text-slate-900 dark:text-white">Sab Done! 🎉</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1">
                {doneIds.size} bheje • {skippedIds.size} skip
              </p>
              <Button className="mt-4 bg-gradient-to-r from-emerald-600 to-teal-700 font-black" onClick={onClose}>
                <CheckCircle2 className="h-4 w-4" /> Band Karo
              </Button>
            </div>
          ) : current && (
            <>
              <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 p-4 flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-md">
                  {(current.name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-black text-slate-900 dark:text-white truncate">{genderIcon} {current.name}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 font-bold flex items-center gap-2 flex-wrap">
                    <span className="tabular-nums text-rose-700 dark:text-rose-400 font-black">{formatPKR(current.balance)}</span>
                    <span>•</span>
                    <span>{current.phone}</span>
                    {current.ageDays >= 7 && (
                      <>
                        <span>•</span>
                        <span className="text-amber-700 dark:text-amber-400">{current.ageDays} din</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 text-[10px] font-black text-slate-500 dark:text-slate-400">
                  {idx + 1} / {total}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-black text-slate-500 dark:text-slate-400 tracking-wider mb-1.5">Tone</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {REMINDER_TONES.map((t) => (
                    <button
                      key={t.v}
                      onClick={() => { setTone(t.v); setIsCustom(false); }}
                      className={[
                        'p-2 rounded-xl border-2 text-center transition',
                        tone === t.v && !isCustom
                          ? `border-transparent bg-gradient-to-br ${t.grad} text-white shadow-md`
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800',
                      ].join(' ')}
                    >
                      <div className="text-xs font-black">{t.l}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-black text-slate-500 dark:text-slate-400 tracking-wider mb-1.5">Kaise pukaro</div>
                <div className="flex flex-wrap gap-1">
                  {SALUTATIONS.map((s) => (
                    <button
                      key={s.v}
                      onClick={() => { setSalutation(s.v); setIsCustom(false); }}
                      title={s.d}
                      className={`px-2 py-1 rounded-lg border text-[10px] font-black transition ${
                        salutation === s.v
                          ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 border-transparent text-white'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {s.l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-[10px] uppercase font-black text-slate-500 dark:text-slate-400 tracking-wider">
                    Message {isCustom && <span className="text-amber-600 ml-1">✏️</span>}
                  </div>
                  <button onClick={copyMsg} className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1 hover:underline">
                    {copied ? <CheckCircle2 className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <textarea
                  value={finalMsg}
                  onChange={(e) => { setCustomMsg(e.target.value); setIsCustom(true); }}
                  rows={6}
                  className={`w-full rounded-xl border-2 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 whitespace-pre-wrap focus:outline-none transition ${
                    isCustom
                      ? 'border-amber-400 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-500/10'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60'
                  }`}
                />
              </div>
            </>
          )}
        </div>

        {!allDone && current && (
          <div className="shrink-0 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 p-4 space-y-2">
            <div className="flex gap-2">
              <button onClick={prev} disabled={idx === 0} className="h-12 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-xs font-black disabled:opacity-40 transition">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => { openWhatsApp(); setTimeout(() => next(false), 400); }}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white text-sm font-black inline-flex items-center justify-center gap-2 shadow-lg shadow-green-500/40 transition active:scale-[0.98]"
              >
                <MessageCircle className="h-5 w-5" /> WhatsApp → Agla
              </button>
              <button onClick={() => next(true)} title="Skip" className="h-12 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-xs font-black transition">
                <SkipForward className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   🖨️ PRINT OPTIONS MODAL
   ═════════════════════════════════════════════════════════════ */
function PrintOptionsModal({ filtered, totalDue, periodLabel, onA4, onCSV, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 relative bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-700 text-white px-5 py-4 overflow-hidden">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-cyan-400/25 blur-2xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur px-2.5 py-0.5 text-[10px] font-black border border-white/30">
                <Printer className="h-3 w-3" /> Print & Export
              </div>
              <h3 className="text-xl font-black mt-2">📊 Khata Nikalo</h3>
              <p className="text-xs text-white/85 font-bold mt-1">{filtered.length} customers • {formatPKR(totalDue)} • {periodLabel}</p>
            </div>
            <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <button onClick={onA4} className="w-full group rounded-2xl border-2 border-cyan-300 dark:border-cyan-500/40 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-500/10 dark:to-blue-500/10 hover:border-cyan-500 hover:shadow-xl transition-all p-5 text-left active:scale-[0.98]">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 text-white flex items-center justify-center shadow-lg shrink-0 group-hover:scale-110 transition">
                <FileText className="h-7 w-7" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h4 className="text-base font-black text-slate-900 dark:text-white">A4 Full Report</h4>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase">PDF</span>
                </div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
                  Colored PDF, KPIs, aging, complete table, signatures.
                </p>
              </div>
              <ChevronRight className="h-6 w-6 text-slate-400 shrink-0 self-center group-hover:translate-x-1 transition" />
            </div>
          </button>

          <button onClick={onCSV} className="w-full group rounded-2xl border-2 border-emerald-300 dark:border-emerald-500/40 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10 hover:border-emerald-500 hover:shadow-xl transition-all p-5 text-left active:scale-[0.98]">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-green-700 text-white flex items-center justify-center shadow-lg shrink-0 group-hover:scale-110 transition">
                <FileDown className="h-7 w-7" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-base font-black text-slate-900 dark:text-white">CSV Export</h4>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-[9px] font-black uppercase">Excel</span>
                </div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">Excel/Google Sheets ke liye raw data.</p>
              </div>
              <ChevronRight className="h-6 w-6 text-slate-400 shrink-0 self-center group-hover:translate-x-1 transition" />
            </div>
          </button>

          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-4 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <div className="text-[10px] uppercase tracking-widest font-black text-slate-500 dark:text-slate-400 mb-1">💡 Tips</div>
            <TipRow><strong>PDF:</strong> A4 → print dialog me "Save as PDF"</TipRow>
            <TipRow><strong>Colored:</strong> "Background graphics" ON karo</TipRow>
            <TipRow><strong>Per customer:</strong> Row me 🖨️ dabao → 80mm thermal</TipRow>
          </div>
        </div>

        <div className="shrink-0 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 p-4">
          <Button variant="secondary" className="w-full" onClick={onClose}><X className="h-4 w-4" /> Band</Button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   🎓 KHATA TEACHER
   ═════════════════════════════════════════════════════════════ */
function KhataTeacher({ onClose, onStartBulk, onEditTemplates, hasDues }: any) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-fuchsia-300 dark:border-fuchsia-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-fuchsia-200 dark:border-fuchsia-500/30 bg-gradient-to-r from-fuchsia-50 to-purple-50 dark:from-fuchsia-500/15 dark:to-purple-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-black text-fuchsia-900 dark:text-fuchsia-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Khata Guide
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-2xl border-2 border-fuchsia-300 dark:border-fuchsia-500/40 bg-gradient-to-br from-fuchsia-50 to-purple-50 dark:from-fuchsia-500/10 dark:to-purple-500/10 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-black text-fuchsia-800 dark:text-fuchsia-200 flex items-center gap-1">
              <ShoppingCart className="h-3 w-3" /> 🛒 Udhaar Sale Kaise?
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <TipRow>POS pe jao → customer choose karo → "Udhaar" / partial payment select karo</TipRow>
              <TipRow>Sale complete karo — udhaar automatic yahan khaate mein aa jayega</TipRow>
              <TipRow>Wapas milne pe "Paisay Wasool" button dabao — khata clear</TipRow>
            </div>
            <Link to="/pos">
              <button className="mt-2 h-10 px-4 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-700 text-white text-xs font-black inline-flex items-center gap-1.5 shadow-md">
                <ShoppingCart className="h-3.5 w-3.5" /> POS Kholo
              </button>
            </Link>
          </div>

          <div className="rounded-2xl border-2 border-emerald-300 dark:border-emerald-500/40 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-black text-emerald-800 dark:text-emerald-200 flex items-center gap-1">
              <MessageCircle className="h-3 w-3" /> 💬 Smart Reminders
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <TipRow><strong>AI naam pehchan leta hai</strong> — Faiza baji ✓ (bhai nahi), Uncle Shuja ✓ (extra bhai nahi lagega)</TipRow>
              <TipRow>Message manually <strong>edit</strong> kar sakte ho har reminder bhejne se pehle</TipRow>
              <TipRow>3 tones: 😊 Polite • 💼 Firm • ⚠️ Final (age ke hisab se auto)</TipRow>
              <TipRow><strong>Templates fully customizable</strong> — apni marzi ka message likho</TipRow>
              <button onClick={onEditTemplates} className="mt-2 h-10 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-xs font-black inline-flex items-center gap-1.5 shadow-md">
                <Edit3 className="h-3.5 w-3.5" /> Templates Edit Karo
              </button>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-cyan-300 dark:border-cyan-500/40 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-500/10 dark:to-blue-500/10 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-black text-cyan-800 dark:text-cyan-200 flex items-center gap-1">
              <Printer className="h-3 w-3" /> 🖨️ Print & PDF
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <TipRow>"Print" → A4 colored PDF (Save as PDF chuno)</TipRow>
              <TipRow>Per-customer 80mm thermal statement — row me 🖨️</TipRow>
              <TipRow>"Background graphics" ON karo colors ke liye</TipRow>
            </div>
          </div>

          <div className="rounded-xl bg-slate-900 dark:bg-slate-950 border border-slate-700 p-3 text-xs font-semibold text-slate-200">
            <div className="text-[10px] uppercase tracking-widest font-black text-fuchsia-300 mb-2">⌨️ Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div><kbd className="px-1.5 py-0.5 bg-slate-700 rounded font-mono">P</kbd> Print / PDF</div>
              <div><kbd className="px-1.5 py-0.5 bg-slate-700 rounded font-mono">N</kbd> Bulk reminders</div>
              <div><kbd className="px-1.5 py-0.5 bg-slate-700 rounded font-mono">/</kbd> Search</div>
              <div><kbd className="px-1.5 py-0.5 bg-slate-700 rounded font-mono">T</kbd> Guide</div>
              <div><kbd className="px-1.5 py-0.5 bg-slate-700 rounded font-mono">Esc</kbd> Band</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link to="/pos" className="contents">
              <Button className="bg-gradient-to-r from-fuchsia-600 to-purple-700 hover:from-fuchsia-500 font-black shadow-lg shadow-fuchsia-500/40 h-12 w-full">
                <ShoppingCart className="h-4 w-4" /> POS
              </Button>
            </Link>
            {hasDues ? (
              <Button className="bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 font-black shadow-lg shadow-emerald-500/40 h-12" onClick={onStartBulk}>
                <BellRing className="h-4 w-4" /> Reminders
              </Button>
            ) : (
              <Button className="bg-gradient-to-r from-slate-600 to-slate-700 font-black h-12" onClick={onClose}>
                <CheckCircle2 className="h-4 w-4" /> Samajh Gaya
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   CUSTOMER ROW
   ═════════════════════════════════════════════════════════════ */
function CustomerKhataRow({ customer, expanded, hideCost, onToggle, onPayment, onReminder, onPrintStatement }: any) {
  const hasBalance = customer.balance > 0;
  const isAdvance = customer.balance < 0;
  const isHigh = customer.balance > 10000;
  const isAged = hasBalance && customer.ageDays >= 30;
  const genderIcon = customer.detectedGender === 'F' ? '👩' : customer.detectedGender === 'M' ? '👨' : '👤';

  return (
    <div className={[
      'rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 shadow-sm dark:shadow-black/20 transition-all hover:shadow-lg',
      isAged ? 'border-rose-300 dark:border-rose-500/50'
        : isHigh ? 'border-rose-300 dark:border-rose-500/40'
        : isAdvance ? 'border-emerald-300 dark:border-emerald-500/40'
        : hasBalance ? 'border-amber-300 dark:border-amber-500/40'
        : 'border-slate-200 dark:border-slate-800',
    ].join(' ')}>
      <div className="p-4 flex items-center gap-3 flex-wrap sm:flex-nowrap">
        <div className={[
          'h-14 w-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shrink-0 shadow-md relative',
          isAged ? 'bg-gradient-to-br from-rose-600 to-red-800'
            : isHigh ? 'bg-gradient-to-br from-rose-500 to-red-700'
            : isAdvance ? 'bg-gradient-to-br from-emerald-500 to-teal-700'
            : hasBalance ? 'bg-gradient-to-br from-fuchsia-500 via-purple-500 to-indigo-600'
            : 'bg-gradient-to-br from-slate-500 to-slate-700',
        ].join(' ')}>
          {(customer.name || '?').charAt(0).toUpperCase()}
          <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white dark:bg-slate-900 border-2 border-white dark:border-slate-900 flex items-center justify-center text-xs shadow-sm">
            {genderIcon}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg truncate">{customer.name}</h3>
            {isAged && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black uppercase inline-flex items-center gap-1 animate-pulse">
                <Flame className="h-2.5 w-2.5" /> {customer.ageDays} din
              </span>
            )}
            {!isAged && isHigh && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black uppercase inline-flex items-center gap-1">
                <AlertTriangle className="h-2.5 w-2.5" /> Zyada
              </span>
            )}
            {isAdvance && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase inline-flex items-center gap-1">
                <Award className="h-2.5 w-2.5" /> Advance
              </span>
            )}
            {!hasBalance && !isAdvance && customer.salesCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[9px] font-black uppercase">Clear ✓</span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 font-bold flex-wrap">
            {customer.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{customer.phone}</span>}
            {customer.salesCount > 0 && (<><span>•</span><span>{customer.salesCount} sales</span></>)}
            {customer.pendingCount > 0 && (
              <><span>•</span><span className="text-amber-700 dark:text-amber-400 inline-flex items-center gap-1"><BookOpen className="h-3 w-3" /> {customer.pendingCount} pending</span></>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase font-black text-slate-500 dark:text-slate-400 tracking-wider">
            {isAdvance ? 'Advance' : 'Udhaar'}
          </div>
          <div className={[
            'text-2xl sm:text-3xl font-black tabular-nums leading-none',
            isAdvance ? 'text-emerald-700 dark:text-emerald-400'
              : isAged || isHigh ? 'text-rose-700 dark:text-rose-400'
              : hasBalance ? 'text-amber-700 dark:text-amber-400'
              : 'text-slate-600 dark:text-slate-300',
          ].join(' ')}>
            {hideCost ? '••••' : (customer.balance === 0 ? formatPKR(0) : (isAdvance ? '+' : '−') + formatPKR(customer.absBalance))}
          </div>
        </div>
      </div>

      <div className="px-4 pb-3 flex gap-2 flex-wrap border-t border-slate-100 dark:border-slate-800 pt-3">
        {hasBalance && (
          <button onClick={onPayment} className="flex-1 min-w-[120px] h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white text-sm font-black inline-flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/40 active:scale-95 transition">
            <Banknote className="h-4 w-4" /> Paisay Wasool
          </button>
        )}
        {customer.phone && hasBalance && (
          <button onClick={onReminder} title="Smart WhatsApp reminder"
            className="h-11 px-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 text-white text-sm font-black inline-flex items-center gap-1.5 shadow-sm shadow-green-500/40 active:scale-95 transition">
            <MessageCircle className="h-4 w-4" /> Reminder
          </button>
        )}
        <button onClick={onPrintStatement} title="Print statement"
          className="h-11 w-11 rounded-xl bg-cyan-100 dark:bg-cyan-500/20 hover:bg-cyan-200 dark:hover:bg-cyan-500/30 text-cyan-700 dark:text-cyan-300 flex items-center justify-center transition active:scale-95">
          <Printer className="h-4 w-4" />
        </button>
        <button onClick={onToggle} className="h-11 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-black inline-flex items-center gap-1 transition">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {expanded ? 'Chhupao' : 'Tafseel'}
        </button>
      </div>

      {expanded && (
        <div className="border-t-2 border-slate-100 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-800/40 space-y-2 max-h-96 overflow-y-auto">
          <div className="text-[10px] uppercase font-black text-slate-600 dark:text-slate-400 tracking-wider mb-2">
            Sales History ({customer.allSales.length})
          </div>
          {customer.allSales.length === 0 ? (
            <div className="rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-3 text-center">
              <BookOpen className="h-8 w-8 text-slate-400 mx-auto mb-1" />
              <p className="text-sm text-slate-600 dark:text-slate-300 font-black">Koi Sale Nahi</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Is period me sales nahi hui</p>
            </div>
          ) : (
            [...customer.allSales].sort((a: any, b: any) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime()).slice(0, 20).map((sale: any) => {
              const credit = Number(sale.creditAmount || 0);
              return (
                <Link key={sale.id} to={`/sales/${sale.id}/receipt`}
                  className="block rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 hover:border-fuchsia-300 hover:shadow-md transition p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-slate-900 dark:text-white text-xs">{sale.saleNumber}</span>
                        {credit > 0 && <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[9px] font-black uppercase">Udhaar</span>}
                      </div>
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 inline-flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5" />
                        {new Date(sale.soldAt).toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-slate-900 dark:text-white tabular-nums text-sm">
                        {hideCost ? '••••' : formatPKR(sale.total)}
                      </div>
                      {credit > 0 && <div className="text-[10px] font-black text-amber-700 dark:text-amber-400">Baqi {formatPKR(credit)}</div>}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   💳 PAYMENT MODAL
   ═════════════════════════════════════════════════════════════ */
function PaymentModal({ customer, loading, onClose, onConfirm }: any) {
  const [amount, setAmount] = useState<string>(String(customer.balance > 0 ? customer.balance : ''));
  const [note, setNote] = useState('');
  const [showCalc, setShowCalc] = useState(false);

  const payAmount = Number(amount) || 0;
  const newBalance = customer.balance - payAmount;
  const isValid = payAmount > 0 && payAmount <= customer.balance;
  const QUICK = [100, 500, 1000, 2000, 5000, 10000];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 relative overflow-hidden bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 text-white px-5 py-4">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] uppercase font-black text-emerald-200 tracking-wider">Paisay Wasool</div>
              <div className="text-xl font-black mt-1 truncate">{customer.name}</div>
              <div className="text-xs font-bold text-white/80 mt-0.5">Kul udhaar: <strong className="text-amber-300">{formatPKR(customer.balance)}</strong></div>
            </div>
            <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center border-2 border-white/20 transition shrink-0">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] uppercase font-black text-slate-600 dark:text-slate-400 tracking-wider">Kitna paisa mila?</label>
              <button onClick={() => setShowCalc(!showCalc)} className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                <Zap className="h-3 w-3" /> Calculator
              </button>
            </div>
            <input autoFocus type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
              onFocus={(e) => e.target.select()} placeholder="0"
              className="h-16 sm:h-20 w-full rounded-2xl border-4 border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-4 text-3xl sm:text-4xl font-black tabular-nums text-emerald-900 dark:text-emerald-200 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-200 dark:focus:ring-emerald-500/20 text-center transition" />

            <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {QUICK.map((amt) => (
                <button key={amt} onClick={() => setAmount(String((Number(amount) || 0) + amt))}
                  className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 active:scale-95 text-xs font-black text-slate-800 dark:text-slate-200 transition">
                  +{amt}
                </button>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2">
              <button onClick={() => setAmount(String(customer.balance))} className="h-11 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 hover:bg-emerald-200 active:scale-95 text-sm font-black text-emerald-800 dark:text-emerald-200 transition inline-flex items-center justify-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> Pura
              </button>
              <button onClick={() => setAmount(String(Math.floor(customer.balance / 2)))} className="h-11 rounded-xl bg-blue-100 dark:bg-blue-500/20 hover:bg-blue-200 active:scale-95 text-sm font-black text-blue-800 dark:text-blue-200 transition">
                Aadha
              </button>
              <button onClick={() => setAmount('')} className="h-11 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 active:scale-95 text-sm font-black text-slate-700 dark:text-slate-200 transition">
                Clear
              </button>
            </div>

            {showCalc && (
              <div className="mt-3 grid grid-cols-4 gap-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 p-2">
                {[7, 8, 9, 'C', 4, 5, 6, '←', 1, 2, 3, '00', 0, '.', '000', '='].map((k) => (
                  <button key={String(k)} onClick={() => {
                    const key = String(k);
                    if (key === 'C') return setAmount('');
                    if (key === '←') return setAmount(amount.slice(0, -1));
                    if (key === '=') return;
                    setAmount(amount + key);
                  }} className={['h-11 rounded-xl font-black text-lg transition active:scale-95',
                    k === 'C' ? 'bg-rose-500 text-white' : k === '←' ? 'bg-amber-500 text-white' : k === '=' ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'].join(' ')}>{k}</button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] uppercase font-black text-slate-600 dark:text-slate-400 tracking-wider mb-1 block">Note (optional)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Cash, Bank transfer..."
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition" />
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/60 dark:to-slate-900 border-4 border-slate-200 dark:border-slate-700 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-slate-600 dark:text-slate-300">Purana udhaar</span>
              <span className="font-black text-slate-900 dark:text-white tabular-nums">{formatPKR(customer.balance)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-slate-600 dark:text-slate-300">Wasool</span>
              <span className="font-black text-emerald-700 dark:text-emerald-400 tabular-nums">− {formatPKR(payAmount)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-sm font-black text-slate-700 dark:text-slate-200">Baqi</span>
              <span className={['text-xl font-black tabular-nums', newBalance <= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'].join(' ')}>
                {formatPKR(Math.max(newBalance, 0))}
              </span>
            </div>
            {newBalance <= 0 && payAmount > 0 && (
              <div className="rounded-xl bg-emerald-500 text-white p-2.5 mt-2 text-center text-sm font-black inline-flex items-center justify-center gap-2 w-full">
                <Award className="h-4 w-4" /> Khata clear! 🎉
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 p-4 border-t-4 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button onClick={() => onConfirm(payAmount, note)} disabled={!isValid || loading}
            className="w-full h-14 sm:h-16 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 text-white font-black shadow-2xl shadow-emerald-500/50 transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between px-5">
            <div className="text-left">
              <div className="text-[10px] uppercase font-black text-white/80 tracking-wider">
                {loading ? 'Save...' : 'Payment confirm'}
              </div>
              <div className="text-xl sm:text-2xl tabular-nums leading-none mt-0.5">{formatPKR(payAmount)}</div>
            </div>
            <ArrowRight className="h-6 w-6 sm:h-7 sm:w-7" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════ */
function AgingBucket({ emoji, label, value, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'border-emerald-200 dark:border-emerald-500/40 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 text-emerald-800 dark:text-emerald-300',
    amber:   'border-amber-200 dark:border-amber-500/40 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 text-amber-800 dark:text-amber-300',
    rose:    'border-rose-200 dark:border-rose-500/40 bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-500/10 dark:to-red-500/10 text-rose-800 dark:text-rose-300',
  };
  return (
    <div className={`rounded-xl border-2 p-3 text-center ${tones[tone]}`}>
      <div className="text-xl">{emoji}</div>
      <div className="text-[9px] uppercase tracking-wider font-black opacity-80 mt-1">{label}</div>
      <div className="text-base font-black tabular-nums mt-0.5">{formatPKR(value)}</div>
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
    <kbd className="px-1.5 py-0.5 rounded bg-white/15 border border-white/25 text-white font-mono font-bold shadow-sm text-[10px]">
      {children}
    </kbd>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone, highlight, onClick, active }: any) {
  const tones: Record<string, string> = {
    rose: 'from-rose-500 via-pink-500 to-red-600 shadow-rose-500/40',
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/40',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
    emerald: 'from-emerald-500 via-green-500 to-teal-600 shadow-emerald-500/40',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={[
        'group relative rounded-2xl border-2 p-3 sm:p-4 shadow-sm dark:shadow-black/20 text-left w-full transition overflow-hidden',
        highlight
          ? 'bg-gradient-to-br from-rose-50 via-pink-50 to-white dark:from-rose-500/10 dark:via-pink-500/10 dark:to-slate-900/60 border-rose-300 dark:border-rose-500/40'
          : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800',
        onClick ? 'hover:border-fuchsia-300 dark:hover:border-fuchsia-500/50 hover:shadow-lg hover:-translate-y-0.5' : '',
        active ? 'ring-2 ring-fuchsia-400 dark:ring-fuchsia-500/50' : '',
      ].join(' ')}
    >
      {onClick && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
      )}
      <div className="relative flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-black">{label}</div>
          <div className="mt-1.5 text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 truncate">{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0 group-hover:scale-110 transition`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Comp>
  );
}
