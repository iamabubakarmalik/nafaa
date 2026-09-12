import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, Cake, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
  CreditCard, Crown, Edit3, Eye, FileDown, FileText, GraduationCap,
  Layers, Mail, MapPin, MessageCircle, Phone, Plus, Printer, RefreshCw,
  Search, SlidersHorizontal, Sparkles, Star, Store, Trash2, TrendingUp,
  Users, Wallet, X, ChevronRight as ArrowR, Loader2, Zap,
  LayoutGrid, List, BarChart3, PieChart as PieIcon, Activity, Copy,
  CheckSquare, Square, UserCheck, Ban, Wallet2, Target, Clock,
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { customersApi, type CustomersListParams } from '@modules/customers/customers/api/customers.api';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { toast } from 'sonner';
import { useAuthStore, useIsAllShops } from '@core/stores/auth.store';

/* ═════════════════════════════════════════════════════════════
   NAFAA CUSTOMERS LIST — GLOBAL (har industry me bilkul ek jaisa)
   ─────────────────────────────────────────────────────────────
   🔲 Grid / 📋 List (table) — do view, yaad rehti hai
   📊 Analytics tab — charts, brackets, top spenders, udhaar walay
   ☑️  Bulk select → VIP on/off, numbers copy, CSV, bulk delete
   👆 Action buttons HAMESHA nazar aate hain (hover ka intezar nahi)
   ➕ Quick Add • 💬 Gender-aware WhatsApp • 🎂 Birthdays
   🖨️ A4 report + 80mm thermal + CSV (selected ya poora page)
   🎓 Teacher • 🌙 Dark/Light • ⌨️ / N P T G A Esc
   ═════════════════════════════════════════════════════════════ */

const escapeHtml = (s: string) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const toDateInput = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const VIEW_KEY = 'nafaa:customers:view';

/* ─── Gender detect (WhatsApp salutation ke liye) ─── */
const FEMALE_KEYWORDS = ['baji', 'apa', 'aunty', 'madam', 'begum', 'khala', 'phupo', 'mrs', 'ms', 'miss', 'bibi', 'behn'];
const FEMALE_NAMES = new Set([
  'faiza','ayesha','aisha','fatima','zainab','khadija','maryam','sana','sara','hina','hira','saba','nida',
  'sadia','rabia','sidra','saima','salma','shazia','amna','asma','iqra','kiran','komal','laiba','mahira',
  'mahnoor','mehak','noor','rimsha','uzma','zoya','zara','nimra','areeba','kanwal','tania','urooj',
]);
function detectGender(name: string): 'M' | 'F' | 'U' {
  if (!name) return 'U';
  const tokens = name.toLowerCase().trim().split(/\s+/);
  for (const t of tokens) {
    if (FEMALE_KEYWORDS.includes(t)) return 'F';
    if (['bhai', 'chacha', 'mamu', 'uncle', 'sir', 'mr', 'haji', 'sheikh', 'baba'].includes(t)) return 'M';
  }
  if (FEMALE_NAMES.has(tokens[0])) return 'F';
  return 'U';
}
const salFor = (name: string) => {
  const g = detectGender(name);
  if (g === 'F') return 'baji';
  if (g === 'M') return 'bhai';
  return '';
};
const waNumber = (raw: string) => {
  const digits = String(raw).replace(/[^0-9]/g, '');
  return digits.startsWith('92') ? digits : digits.startsWith('0') ? '92' + digits.slice(1) : '92' + digits;
};

export default function CustomersListPage() {
  const queryClient = useQueryClient();
  const tenantName = useAuthStore((s) => s.tenant?.name) || 'Meri Dukaan';
  const shopPhone = useAuthStore((s: any) => s.tenant?.phone || '');
  const searchRef = useRef<HTMLInputElement>(null);

  const [params, setParams] = useState<CustomersListParams>({
    search: '', page: 1, limit: 24, sortBy: 'createdAt', sortOrder: 'desc',
  });
  const isAllShops = useIsAllShops();

  const [tab, setTab] = useState<'customers' | 'analytics'>('customers');
  const [view, setView] = useState<'grid' | 'list'>(() => {
    try { return (localStorage.getItem(VIEW_KEY) as 'grid' | 'list') || 'grid'; } catch { return 'grid'; }
  });
  useEffect(() => { try { localStorage.setItem(VIEW_KEY, view); } catch { /* private mode */ } }, [view]);

  const [showFilters, setShowFilters] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [bulkDelete, setBulkDelete] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

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

  /* Analytics ke liye barra data set — sirf tab khulne par */
  const { data: wide, isLoading: wideLoading } = useQuery({
    queryKey: ['customers-analytics', params.scope ?? 'branch'],
    queryFn: () => customersApi.list({ page: 1, limit: 500, scope: params.scope, sortBy: 'totalSpent', sortOrder: 'desc' }),
    enabled: tab === 'analytics',
  });

  const items: any[] = data?.items ?? [];

  /* page badle to purani selection sambhal ke rakho sirf wohi jo abhi nazar aa rahe */
  useEffect(() => { setSelected(new Set()); }, [params.page, params.search, params.isVip, params.hasCredit, params.city, params.scope]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['customers'] });
    queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
    queryClient.invalidateQueries({ queryKey: ['customers-analytics'] });
  };

  const removeMutation = useMutation({
    mutationFn: customersApi.remove,
    onSuccess: () => {
      toast.success('Customer delete ho gaya');
      setDeleteTarget(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete fail — sales history ho sakti hai'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      let ok = 0; const failed: string[] = [];
      for (const id of ids) {
        try { await customersApi.remove(id); ok++; }
        catch { failed.push(items.find((c) => c.id === id)?.name || id); }
      }
      return { ok, failed };
    },
    onSuccess: ({ ok, failed }) => {
      setBulkDelete(false);
      setSelected(new Set());
      invalidate();
      if (ok) toast.success(`${ok} customer delete ho gaye`);
      if (failed.length) toast.error(`${failed.length} delete nahi hue (sales/khata history hai): ${failed.slice(0, 3).join(', ')}`);
    },
  });

  const bulkVipMutation = useMutation({
    mutationFn: async ({ ids, vip }: { ids: string[]; vip: boolean }) => {
      let ok = 0;
      for (const id of ids) {
        const c = items.find((x) => x.id === id);
        if (!c || !!c.isVip === vip) continue;
        try { await customersApi.toggleVip(id); ok++; } catch { /* skip */ }
      }
      return ok;
    },
    onSuccess: (ok, { vip }) => {
      invalidate();
      toast.success(ok ? `${ok} customer ${vip ? 'VIP ban gaye 👑' : 'normal ho gaye'}` : 'Koi tabdeeli nahi — pehle hi aise thay');
    },
  });

  const hasFilters = !!(params.search || params.isVip !== undefined || params.hasCredit !== undefined || params.city);

  /* jin par bulk / print chalega */
  const selectedRows = useMemo(() => items.filter((c) => selected.has(c.id)), [items, selected]);
  const printRows = selectedRows.length ? selectedRows : items;

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  const allOnPageSelected = items.length > 0 && items.every((c) => selected.has(c.id));
  const toggleAll = () =>
    setSelected(allOnPageSelected ? new Set() : new Set(items.map((c) => c.id)));

  /* 🎂 Is mahine ki birthdays (page ke customers me se) */
  const birthdays = useMemo(() => {
    const m = new Date().getMonth();
    return items
      .filter((c) => c.dateOfBirth && new Date(c.dateOfBirth).getMonth() === m)
      .map((c) => ({ ...c, day: new Date(c.dateOfBirth).getDate() }))
      .sort((a, b) => a.day - b.day)
      .slice(0, 6);
  }, [items]);

  /* ─── Smart WhatsApp (gender-aware) ─── */
  const whatsappCustomer = (c: any, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!c.phone) return toast.error('Phone number nahi hai');
    const sal = salFor(c.name);
    const salStr = sal ? ` ${sal}` : '';
    const msg = c.balance > 0
      ? `Assalam-o-Alaikum ${c.name}${salStr}! 🙏\n\n${tenantName} ki taraf se yaad-dihani — aap ka *Rs ${Number(c.balance).toLocaleString('en-PK')}* ka hisaab baqi hai.\n\nJab moqa mile ada kar dein. Shukriya! 😊`
      : `Assalam-o-Alaikum ${c.name}${salStr}! 🙏\n\n${tenantName} ki taraf se shukriya aap ki shopping ka. Phir tashreef layein! 😊`;
    window.open(`https://wa.me/${waNumber(c.phone)}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const birthdayWish = (c: any) => {
    if (!c.phone) return toast.error('Phone number nahi hai');
    const sal = salFor(c.name);
    const msg = `Assalam-o-Alaikum ${c.name}${sal ? ' ' + sal : ''}! 🎂\n\n${tenantName} ki poori team ki taraf se *Salgirah Mubarak*! 🎉\n\nAap ke liye aj dukaan pe khaas treat hai — zaroor tashreef layein! 😊`;
    window.open(`https://wa.me/${waNumber(c.phone)}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  /* ─── Numbers copy (bulk WhatsApp/SMS blast ke liye) ─── */
  const copyNumbers = async () => {
    const nums = (selectedRows.length ? selectedRows : items).map((c) => c.phone).filter(Boolean);
    if (!nums.length) return toast.error('Kisi ka phone number nahi hai');
    try {
      await navigator.clipboard.writeText(nums.join(', '));
      toast.success(`${nums.length} numbers copy ho gaye — WhatsApp broadcast me paste karo`);
    } catch {
      toast.error('Copy nahi hua — browser ne mana kar diya');
    }
  };

  /* ─── CSV Export ─── */
  const exportCSV = () => {
    const rowsSrc = printRows;
    if (rowsSrc.length === 0) return toast.error('Koi data nahi');
    const summary = [
      [`Customers Report — ${tenantName}`],
      [`Generated: ${new Date().toLocaleString('en-PK')}`],
      stats ? [`Total: ${stats.total}  •  VIP: ${stats.vip}  •  Khata walay: ${stats.withCredit}  •  Total khata: ${Number(stats.totalDebt).toFixed(2)}`] : [],
      [''],
    ].filter((r) => r.length > 0);
    const headers = ['Name', 'Phone', 'Email', 'City', 'Area', 'CNIC', 'VIP', 'Active', 'Total Spent', 'Balance', 'Credit Limit', 'Loyalty Points', 'Birthday', 'Created'];
    const rows = rowsSrc.map((c) => [
      c.name, c.phone || '', c.email || '', c.city || '', c.area || '', c.cnic || '',
      c.isVip ? 'Yes' : 'No', c.isActive === false ? 'No' : 'Yes',
      Number(c.totalSpent).toFixed(2), Number(c.balance).toFixed(2), Number(c.creditLimit || 0).toFixed(2),
      c.loyaltyPoints, c.dateOfBirth ? new Date(c.dateOfBirth).toLocaleDateString('en-PK') : '',
      new Date(c.createdAt).toLocaleDateString('en-PK'),
    ]);
    const csv = [...summary, headers, ...rows]
      .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers-${toDateInput(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${rowsSrc.length} customers export ho gaye`);
  };

  /* ═══ A4 STYLED REPORT ═══ */
  const printA4 = () => {
    const rowsSrc = printRows;
    if (rowsSrc.length === 0) return toast.error('Koi data nahi');
    const rowsHtml = rowsSrc.map((c, i) => {
      const balColor = c.balance > 0 ? '#b91c1c' : '#059669';
      return `
      <tr>
        <td class="num">${i + 1}</td>
        <td class="name">
          <div class="n-main">${c.isVip ? '👑 ' : ''}${escapeHtml(c.name)}</div>
          ${c.phone ? `<div class="n-sub">📞 ${escapeHtml(c.phone)}</div>` : ''}
        </td>
        <td class="city">${escapeHtml([c.city, c.area].filter(Boolean).join(', ') || '—')}</td>
        <td class="c-count">${Number(c.loyaltyPoints || 0).toLocaleString()}</td>
        <td class="amt" style="color:#065f46">${formatPKR(c.totalSpent)}</td>
        <td class="amt" style="color:${balColor}">${c.balance > 0 ? '−' + formatPKR(c.balance) : 'Clear ✓'}</td>
      </tr>`;
    }).join('');

    const html = `<!doctype html><html><head><meta charset="utf-8"/>
<title>Customers — ${escapeHtml(tenantName)}</title>
<style>
  @page { size: A4; margin: 12mm 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; font-size: 10.5px; line-height: 1.45; background: #fff;
    -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .header { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0369a1 100%); color: #fff; padding: 18px 20px;
    border-radius: 10px; margin-bottom: 14px; position: relative; overflow: hidden; }
  .header::before { content:''; position:absolute; top:-30px; right:-30px; width:140px; height:140px; background:rgba(255,255,255,0.08); border-radius:50%; }
  .header-inner { position: relative; display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
  .header h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin: 6px 0 4px; }
  .header .shop { font-size: 12px; font-weight: 600; opacity: 0.95; }
  .header .badge { background: rgba(255,255,255,0.2); border: 1.5px solid rgba(255,255,255,0.4); padding: 4px 10px;
    border-radius: 20px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; }
  .header .print-info { text-align: right; font-size: 9.5px; opacity: 0.85; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
  .kpi { border: 2px solid #e2e8f0; border-radius: 9px; padding: 10px 12px; background: linear-gradient(180deg, #f8fafc, #fff); }
  .kpi.blue { background: linear-gradient(135deg,#eff6ff,#dbeafe); border-color:#93c5fd; }
  .kpi.amber { background: linear-gradient(135deg,#fffbeb,#fef3c7); border-color:#fcd34d; }
  .kpi.rose { background: linear-gradient(135deg,#fef2f2,#fee2e2); border-color:#fca5a5; }
  .kpi .l { font-size: 8.5px; color: #64748b; text-transform: uppercase; letter-spacing: 1.3px; font-weight: 800; margin-bottom: 4px; }
  .kpi .v { font-size: 16px; font-weight: 800; color: #0f172a; }
  .kpi .s { font-size: 9px; color: #94a3b8; font-weight: 600; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
  thead th { background: #0f172a; color: #fff; padding: 8px 6px; text-align: left; font-size: 9px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 1px; white-space: nowrap; }
  thead th.r { text-align: right; } thead th.c { text-align: center; }
  tbody td { padding: 7px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
  tbody tr:nth-child(even) td { background: #f8fafc; }
  td.num { width: 3%; color: #94a3b8; font-weight: 700; text-align: center; }
  td.name .n-main { font-weight: 700; color: #0f172a; } td.name .n-sub { font-size: 8.5px; color: #64748b; font-weight: 600; }
  td.city { font-size: 9px; color: #475569; font-weight: 600; }
  td.c-count { text-align: center; font-weight: 700; color: #92400e; }
  td.amt { text-align: right; font-weight: 800; font-size: 10.5px; white-space: nowrap; }
  tr.grand td { background: linear-gradient(135deg,#0f172a,#1e3a8a) !important; color: #fff !important; font-weight: 800; font-size: 12px; padding: 10px 6px; }
  .footer { margin-top: 16px; padding-top: 10px; border-top: 2px solid #0f172a; font-size: 8.5px; color: #64748b; text-align: center; }
  @media print { .header, .kpis { break-inside: avoid; } tr, td, th { break-inside: avoid; } }
</style></head><body>
  <div class="header">
    <div class="header-inner">
      <div>
        <div class="badge">Customers Report</div>
        <h1>👥 Gahak List</h1>
        <div class="shop">🏪 ${escapeHtml(tenantName)}</div>
      </div>
      <div class="print-info"><div><strong>Generated:</strong></div><div>${new Date().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</div></div>
    </div>
  </div>
  <div class="kpis">
    <div class="kpi blue"><div class="l">👥 Total</div><div class="v">${stats?.total ?? rowsSrc.length}</div><div class="s">is report me: ${rowsSrc.length}</div></div>
    <div class="kpi amber"><div class="l">👑 VIP</div><div class="v">${stats?.vip ?? 0}</div><div class="s">Premium tier</div></div>
    <div class="kpi rose"><div class="l">💳 Total Khata</div><div class="v">${formatPKR(stats?.totalDebt ?? 0)}</div><div class="s">${stats?.withCredit ?? 0} customers</div></div>
    <div class="kpi"><div class="l">📈 Growth</div><div class="v">${stats && stats.growthPct >= 0 ? '+' : ''}${stats?.growthPct?.toFixed(1) ?? 0}%</div><div class="s">vs last month</div></div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Customer / Phone</th><th>City</th><th class="c">Points</th><th class="r">Total Spent</th><th class="r">Khata</th></tr></thead>
    <tbody>
      ${rowsHtml}
      <tr class="grand"><td colspan="4" style="text-align:right;padding-right:12px;">TOTAL</td>
        <td class="amt" style="color:#a5f3fc !important;">${formatPKR(rowsSrc.reduce((s, c) => s + Number(c.totalSpent || 0), 0))}</td>
        <td class="amt" style="color:#fca5a5 !important;">−${formatPKR(rowsSrc.reduce((s, c) => s + Math.max(0, Number(c.balance || 0)), 0))}</td></tr>
    </tbody>
  </table>
  <div class="footer"><strong>${escapeHtml(tenantName)}</strong>${shopPhone ? ` • ${escapeHtml(shopPhone)}` : ''}<br/>Powered by <strong>Nafaa POS</strong> — ${new Date().getFullYear()}</div>
  <script>window.onload=function(){setTimeout(function(){window.print();},400);};</script>
</body></html>`;
    const w = window.open('', '_blank', 'width=1000,height=800');
    if (!w) return toast.error('Popup blocked — allow popups!');
    w.document.open(); w.document.write(html); w.document.close();
  };

  /* ═══ THERMAL LIST (80mm) — sab ek print me ═══ */
  const printThermalList = () => {
    const rowsSrc = printRows;
    if (rowsSrc.length === 0) return toast.error('Koi data nahi');
    const rows = rowsSrc.map((c, i) => `
      <div class="row"><span class="k">${i + 1}. ${c.isVip ? '👑' : ''}${escapeHtml((c.name || '').slice(0, 20))}</span>
      <span class="v">${c.balance > 0 ? '−' + formatPKR(c.balance) : 'Clear'}</span></div>
      <div style="font-size:9px;display:flex;justify-content:space-between;">
        <span>${c.phone ? escapeHtml(c.phone) : '—'}</span><span>${formatPKR(c.totalSpent)}</span>
      </div>
      <div class="divider" style="margin:2px 0;"></div>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Customers List</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 80mm; }
  body { font-family: 'Courier New', monospace; padding: 5mm 4mm; color: #000; font-size: 11px; line-height: 1.4; }
  .center { text-align: center; } .bold { font-weight: 700; }
  .xl { font-size: 15px; font-weight: 800; letter-spacing: 1px; } .huge { font-size: 18px; font-weight: 800; }
  .divider { border-top: 1px dashed #000; margin: 8px 0; } .double { border-top: 2px solid #000; margin: 8px 0; }
  .row { display: flex; justify-content: space-between; gap: 6px; margin: 2px 0; }
  .row .k { font-weight: 600; word-break: break-word; } .row .v { font-weight: 700; white-space: nowrap; }
  .badge { display: inline-block; border: 1.5px solid #000; padding: 3px 10px; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; margin: 6px 0; }
  .amount-box { border: 2.5px solid #000; padding: 8px; margin: 8px 0; text-align: center; }
</style></head><body>
  <div class="center xl">${escapeHtml(tenantName)}</div>
  ${shopPhone ? `<div class="center" style="font-size:10px;">Ph: ${escapeHtml(shopPhone)}</div>` : ''}
  <div class="divider"></div>
  <div class="center"><span class="badge">CUSTOMERS LIST</span></div>
  <div class="center" style="font-size:9px;">${rowsSrc.length} customers • ${new Date().toLocaleString('en-PK', { dateStyle: 'short', timeStyle: 'short' })}</div>
  <div class="double"></div>
  ${rows}
  <div class="amount-box">
    <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;">IN KA KUL KHATA</div>
    <div class="huge">${formatPKR(rowsSrc.reduce((s, c) => s + Math.max(0, Number(c.balance || 0)), 0))}</div>
  </div>
  <div class="center bold" style="margin-top:10px;font-size:10px;letter-spacing:2px;">* * SHUKRIYA * *</div>
  <script>window.onload=function(){setTimeout(function(){window.print();},300);};</script>
</body></html>`;
    const w = window.open('', '_blank', 'width=400,height=700');
    if (!w) return toast.error('Popup blocked!');
    w.document.open(); w.document.write(html); w.document.close();
  };

  /* ─── Keyboard shortcuts ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
        e.preventDefault(); setTab('customers'); setTimeout(() => searchRef.current?.focus(), 0);
      }
      if (e.key === 'Escape') {
        if (showQuickAdd) setShowQuickAdd(false);
        else if (showPrintOptions) setShowPrintOptions(false);
        else if (showTeacher) setShowTeacher(false);
        else if (bulkDelete) setBulkDelete(false);
        else if (deleteTarget) setDeleteTarget(null);
        else if (showFilters) setShowFilters(false);
        else if (selected.size) setSelected(new Set());
      }
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'n') { e.preventDefault(); setShowQuickAdd(true); }
      if (k === 'p') { e.preventDefault(); setShowPrintOptions(true); }
      if (k === 't') { e.preventDefault(); setShowTeacher(true); }
      if (k === 'g') { e.preventDefault(); setView((v) => (v === 'grid' ? 'list' : 'grid')); }
      if (k === 'a') { e.preventDefault(); setTab((t) => (t === 'analytics' ? 'customers' : 'analytics')); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showTeacher, deleteTarget, showFilters, showQuickAdd, showPrintOptions, bulkDelete, selected.size]);

  const clearFilters = () => {
    setSearchInput('');
    setParams({ search: '', page: 1, limit: params.limit ?? 24, sortBy: 'createdAt', sortOrder: 'desc' });
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {/* ═══ MODALS ═══ */}
      {showTeacher && <CustomersTeacher onClose={() => setShowTeacher(false)} />}
      {showQuickAdd && (
        <QuickAddCustomerModal
          onClose={() => setShowQuickAdd(false)}
          onCreated={() => { setShowQuickAdd(false); invalidate(); }}
        />
      )}
      {showPrintOptions && (
        <PrintOptionsModal
          count={printRows.length}
          onlySelected={selectedRows.length > 0}
          onA4={() => { printA4(); setShowPrintOptions(false); }}
          onThermal={() => { printThermalList(); setShowPrintOptions(false); }}
          onCSV={() => { exportCSV(); setShowPrintOptions(false); }}
          onClose={() => setShowPrintOptions(false)}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          customer={deleteTarget}
          loading={removeMutation.isPending}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => removeMutation.mutate(deleteTarget.id)}
        />
      )}
      {bulkDelete && (
        <BulkDeleteModal
          rows={selectedRows}
          loading={bulkDeleteMutation.isPending}
          onClose={() => setBulkDelete(false)}
          onConfirm={() => bulkDeleteMutation.mutate(selectedRows.map((c) => c.id))}
        />
      )}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 dark:from-slate-950 dark:via-blue-950 dark:to-cyan-900 text-white p-4 sm:p-6 shadow-2xl">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-400/25 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <Users className="h-3.5 w-3.5 text-amber-300" /> Customer Management
              <span className="opacity-40">•</span>
              <span className="text-cyan-200">🏪 {tenantName}</span>
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">👥 Customers</h1>
            <p className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">
              {stats ? (
                <>
                  <strong className="text-cyan-200">{stats.total}</strong> total
                  <span className="opacity-50 mx-1.5">•</span>
                  <strong className="text-amber-300">👑 {stats.vip}</strong> VIP
                  <span className="opacity-50 mx-1.5">•</span>
                  <strong className="text-rose-300">{stats.withCredit}</strong> khata walay
                  {stats.newThisMonth > 0 && (
                    <><span className="opacity-50 mx-1.5">•</span><strong className="text-emerald-300">+{stats.newThisMonth}</strong> is mahine</>
                  )}
                </>
              ) : 'VIP, regular, khata wale — sab gahak ek hi jagah'}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap items-center shrink-0">
            <button onClick={() => setShowTeacher(true)}
              className="h-11 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-400 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition" title="Guide (T)">
              <GraduationCap className="h-4 w-4" /> <span className="hidden sm:inline">Guide</span>
            </button>
            <button onClick={() => refetch()} disabled={isFetching}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition">
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button onClick={() => setShowPrintOptions(true)} disabled={items.length === 0}
              className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur-md disabled:opacity-50 transition" title="Print / PDF / CSV (P)">
              <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Print</span> <Kbd>P</Kbd>
            </button>
            <button onClick={() => setShowQuickAdd(true)}
              className="h-11 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg shadow-emerald-500/40 transition active:scale-95" title="Quick add (N)">
              <Zap className="h-4 w-4" /> Quick <Kbd>N</Kbd>
            </button>
            <Link to="/customers/new">
              <button className="h-11 px-4 rounded-xl bg-[#ffffff] text-slate-900 hover:bg-slate-100 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-2xl transition hover:scale-[1.02] active:scale-95">
                <Plus className="h-4 w-4" /> Full Form
              </button>
            </Link>
          </div>
        </div>

        <div className="relative mt-3 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center">
          <Kbd>/</Kbd><span className="text-white/60">Search</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>N</Kbd><span className="text-white/60">Quick add</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>G</Kbd><span className="text-white/60">Grid/List</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>A</Kbd><span className="text-white/60">Analytics</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>P</Kbd><span className="text-white/60">Print</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>T</Kbd><span className="text-white/60">Guide</span>
          <span className="text-white/30 mx-1">•</span>
          <Kbd>Esc</Kbd><span className="text-white/60">Band</span>
        </div>
      </section>

      {/* ═══ TABS ═══ */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 shadow-sm">
          <TabBtn active={tab === 'customers'} onClick={() => setTab('customers')} icon={Users} label="Customers" />
          <TabBtn active={tab === 'analytics'} onClick={() => setTab('analytics')} icon={BarChart3} label="Analytics" />
        </div>
        {!isAllShops && (
          <div className="inline-flex rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 shadow-sm">
            <button
              onClick={() => setParams((p) => ({ ...p, scope: 'branch', page: 1 }))}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold transition ${
                params.scope !== 'all' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Store className="h-3.5 w-3.5 inline mr-1 -mt-0.5" /> Is shop ke
            </button>
            <button
              onClick={() => setParams((p) => ({ ...p, scope: 'all', page: 1 }))}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold transition ${
                params.scope === 'all' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Layers className="h-3.5 w-3.5 inline mr-1 -mt-0.5" /> Saare
            </button>
          </div>
        )}
      </div>

      {tab === 'analytics' ? (
        <CustomerAnalytics rows={wide?.items ?? []} loading={wideLoading} stats={stats} total={wide?.meta?.total ?? 0} />
      ) : (
        <>
          {/* ═══ KPIs ═══ */}
          <section className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3">
            <Kpi icon={Users} label="Total Customers" value={stats?.total ?? 0} sub={stats && stats.newThisMonth > 0 ? `+${stats.newThisMonth} is mahine` : undefined} tone="blue" />
            <Kpi icon={Crown} label="VIP Members" value={stats?.vip ?? 0} sub="Premium tier" tone="amber"
              active={params.isVip === true}
              onClick={() => setParams({ ...params, isVip: params.isVip ? undefined : true, hasCredit: undefined, page: 1 })} />
            <Kpi icon={Wallet} label="Total Khata" value={formatPKR(stats?.totalDebt ?? 0)} sub={`${stats?.withCredit ?? 0} customers`} tone="rose"
              active={params.hasCredit === true}
              onClick={() => setParams({ ...params, hasCredit: params.hasCredit ? undefined : true, isVip: undefined, page: 1 })} />
            <Kpi icon={TrendingUp} label="Growth" value={`${stats && stats.growthPct >= 0 ? '+' : ''}${stats?.growthPct?.toFixed(1) ?? 0}%`} sub="vs last month" tone="emerald" />
          </section>

          {/* ═══ 🎂 BIRTHDAYS THIS MONTH ═══ */}
          {birthdays.length > 0 && (
            <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-500/10 dark:to-rose-500/10 border-2 border-pink-200 dark:border-pink-500/30 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center shadow-md">
                  <Cake className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-pink-900 dark:text-pink-200 text-sm">🎂 Is Mahine Ki Birthdays</h3>
                  <p className="text-[10px] text-pink-700 dark:text-pink-300 font-bold">Wish bhejo — customer khush hoke wapas aata hai!</p>
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'thin' }}>
                {birthdays.map((c) => {
                  const isToday = c.day === new Date().getDate();
                  return (
                    <div key={c.id} className={`shrink-0 rounded-2xl border-2 px-3.5 py-2.5 flex items-center gap-2.5 ${
                      isToday ? 'bg-gradient-to-br from-pink-500 to-rose-600 border-transparent text-white shadow-lg' : 'bg-white dark:bg-slate-900 border-pink-200 dark:border-pink-500/30'
                    }`}>
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 ${
                        isToday ? 'bg-white/20' : 'bg-gradient-to-br from-pink-400 to-rose-500 text-white'
                      }`}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className={`text-xs font-extrabold truncate ${isToday ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                          {c.name} {isToday && '🎉'}
                        </div>
                        <div className={`text-[10px] font-bold ${isToday ? 'text-white/80' : 'text-pink-600 dark:text-pink-400'}`}>
                          {isToday ? 'Aaj hai!' : `${c.day} ${new Date().toLocaleDateString('en-PK', { month: 'short' })}`}
                        </div>
                      </div>
                      {c.phone && (
                        <button onClick={() => birthdayWish(c)}
                          className={`h-8 w-8 rounded-lg flex items-center justify-center transition active:scale-95 shrink-0 ${
                            isToday ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-green-100 dark:bg-green-500/20 hover:bg-green-200 text-green-700 dark:text-green-300'
                          }`} title="WhatsApp wish bhejo">
                          <MessageCircle className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ═══ TOP SPENDERS ═══ */}
          {stats && stats.topSpenders.length > 0 && (
            <section className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <h3 className="font-extrabold text-slate-900 dark:text-white">Top Spenders</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                {stats.topSpenders.map((s: any, idx: number) => (
                  <Link key={s.id} to={`/customers/${s.id}`}
                    className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3 hover:shadow-md hover:-translate-y-0.5 transition group">
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
          <div className="flex gap-2 flex-wrap items-center">
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

            {/* Grid / List toggle */}
            <div className="inline-flex rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 h-12" title="Grid / List (G)">
              <button onClick={() => setView('grid')}
                className={`px-3 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
                  view === 'grid' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}>
                <LayoutGrid className="h-4 w-4" /> <span className="hidden md:inline">Cards</span>
              </button>
              <button onClick={() => setView('list')}
                className={`px-3 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
                  view === 'list' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}>
                <List className="h-4 w-4" /> <span className="hidden md:inline">List</span>
              </button>
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
              <SlidersHorizontal className="h-4 w-4" /> <span className="hidden sm:inline">Filters</span>
              {hasFilters && <span className="h-5 w-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">!</span>}
            </button>
            <div className="hidden lg:flex items-center text-xs font-extrabold text-slate-500 dark:text-slate-400 tabular-nums px-1">
              {data?.meta?.total ?? items.length} customers
            </div>
          </div>

          {/* ═══ FILTERS PANEL ═══ */}
          {showFilters && (
            <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-3">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Ek page pe</label>
                  <select
                    className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-extrabold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
                    value={String(params.limit ?? 24)}
                    onChange={(e) => setParams({ ...params, limit: Number(e.target.value), page: 1 })}
                  >
                    <option value="12">12</option>
                    <option value="24">24</option>
                    <option value="48">48</option>
                    <option value="100">100</option>
                  </select>
                </div>
              </div>
              {hasFilters && (
                <button onClick={clearFilters} className="text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:text-rose-700 inline-flex items-center gap-1 transition">
                  <X className="h-3 w-3" /> Sab filters clear karo
                </button>
              )}
            </div>
          )}

          {/* ═══ BULK BAR ═══ */}
          {selected.size > 0 && (
            <div className="sticky top-2 z-30 rounded-2xl bg-gradient-to-r from-slate-900 to-blue-900 dark:from-slate-950 dark:to-blue-950 text-white border-2 border-blue-400/40 shadow-2xl p-3 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 mr-1">
                <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center font-extrabold tabular-nums text-sm">{selected.size}</div>
                <div className="text-xs font-extrabold leading-tight">
                  select hue<br />
                  <span className="text-white/60 font-bold">
                    kul khata {formatPKR(selectedRows.reduce((s, c) => s + Math.max(0, Number(c.balance || 0)), 0))}
                  </span>
                </div>
              </div>
              <button onClick={toggleAll}
                className="h-10 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-[11px] font-extrabold inline-flex items-center gap-1.5 transition">
                {allOnPageSelected ? <Square className="h-3.5 w-3.5" /> : <CheckSquare className="h-3.5 w-3.5" />}
                {allOnPageSelected ? 'Sab hatao' : 'Poora page'}
              </button>
              <button onClick={() => bulkVipMutation.mutate({ ids: [...selected], vip: true })} disabled={bulkVipMutation.isPending}
                className="h-10 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-[11px] font-extrabold inline-flex items-center gap-1.5 transition disabled:opacity-50">
                <Crown className="h-3.5 w-3.5" /> VIP banao
              </button>
              <button onClick={() => bulkVipMutation.mutate({ ids: [...selected], vip: false })} disabled={bulkVipMutation.isPending}
                className="h-10 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-[11px] font-extrabold inline-flex items-center gap-1.5 transition disabled:opacity-50">
                <Ban className="h-3.5 w-3.5" /> VIP hatao
              </button>
              <button onClick={copyNumbers}
                className="h-10 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-[11px] font-extrabold inline-flex items-center gap-1.5 transition">
                <Copy className="h-3.5 w-3.5" /> Numbers copy
              </button>
              <button onClick={exportCSV}
                className="h-10 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-[11px] font-extrabold inline-flex items-center gap-1.5 transition">
                <FileDown className="h-3.5 w-3.5" /> CSV
              </button>
              <button onClick={() => setShowPrintOptions(true)}
                className="h-10 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-[11px] font-extrabold inline-flex items-center gap-1.5 transition">
                <Printer className="h-3.5 w-3.5" /> Print
              </button>
              <button onClick={() => setBulkDelete(true)}
                className="h-10 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-extrabold inline-flex items-center gap-1.5 transition">
                <Trash2 className="h-3.5 w-3.5" /> Delete ({selected.size})
              </button>
              <button onClick={() => setSelected(new Set())}
                className="h-10 w-10 ml-auto rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition" title="Selection clear (Esc)">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ═══ LIST / GRID ═══ */}
          {isLoading ? (
            view === 'grid' ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="h-52 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
            )
          ) : items.length === 0 ? (
            <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-dashed border-slate-300 dark:border-slate-700 p-12 sm:p-16 text-center">
              <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/40">
                <Users className="h-9 w-9 text-white" />
              </div>
              <h3 className="mt-5 text-xl font-extrabold text-slate-900 dark:text-white">
                {hasFilters ? 'Koi customer nahi mila' : 'Abhi koi customer nahi'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mt-2 max-w-md mx-auto">
                {hasFilters ? 'Filter change kar ke dekho ya clear karo' : 'Apna pehla customer add karo — phir sales, khata, loyalty sab yahan track hogi'}
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
                    <button onClick={() => setShowQuickAdd(true)}
                      className="h-11 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg shadow-emerald-500/40 transition">
                      <Zap className="h-4 w-4" /> Quick Add (5 sec)
                    </button>
                    <Link to="/customers/new">
                      <Button className="bg-gradient-to-r from-blue-600 to-cyan-700 font-extrabold shadow-lg shadow-blue-500/40">
                        <Plus className="h-4 w-4" /> Full Form
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          ) : view === 'grid' ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {items.map((c) => (
                <CustomerCard
                  key={c.id}
                  c={c}
                  checked={selected.has(c.id)}
                  onToggle={() => toggleOne(c.id)}
                  onWhatsapp={(e: React.MouseEvent) => whatsappCustomer(c, e)}
                  onDelete={() => setDeleteTarget(c)}
                />
              ))}
            </div>
          ) : (
            <CustomerTable
              rows={items}
              selected={selected}
              allSelected={allOnPageSelected}
              onToggle={toggleOne}
              onToggleAll={toggleAll}
              onWhatsapp={whatsappCustomer}
              onDelete={setDeleteTarget}
            />
          )}

          {/* ═══ PAGINATION ═══ */}
          {data && data.meta.totalPages > 1 && (
            <div className="flex items-center justify-between flex-wrap gap-2 bg-white dark:bg-slate-900/80 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-3 sm:p-4">
              <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-bold">
                Page <strong className="text-slate-900 dark:text-white">{data.meta.page}</strong> of <strong className="text-slate-900 dark:text-white">{data.meta.totalPages}</strong>
                <span className="opacity-50 mx-1">•</span>
                <strong className="text-slate-900 dark:text-white tabular-nums">{data.meta.total}</strong> total
              </div>
              <div className="flex gap-2">
                <button disabled={params.page === 1} onClick={() => setParams({ ...params, page: (params.page ?? 1) - 1 })}
                  className="h-10 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1 transition">
                  <ChevronLeft className="h-4 w-4" /> Pehle
                </button>
                <button disabled={(params.page ?? 1) >= data.meta.totalPages} onClick={() => setParams({ ...params, page: (params.page ?? 1) + 1 })}
                  className="h-10 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1 transition">
                  Agla <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   🔲 CUSTOMER CARD (grid view)
   ═════════════════════════════════════════════════════════════ */
function CustomerCard({ c, checked, onToggle, onWhatsapp, onDelete }: any) {
  return (
    <div
      className={[
        'group relative rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all overflow-hidden',
        checked ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-500/25'
          : c.isActive === false ? 'opacity-70 border-slate-200 dark:border-slate-800'
          : c.isVip ? 'border-amber-300 dark:border-amber-500/40 hover:border-amber-400'
          : c.balance > 0 ? 'border-rose-200 dark:border-rose-500/30 hover:border-rose-300'
          : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-500/50',
      ].join(' ')}
    >
      {/* select checkbox — hamesha nazar aata hai */}
      <button
        onClick={onToggle}
        title="Select karo (bulk actions ke liye)"
        className={`absolute top-2.5 right-2.5 z-10 h-7 w-7 rounded-lg border-2 flex items-center justify-center transition ${
          checked ? 'bg-blue-600 border-blue-600 text-white shadow' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-transparent hover:border-blue-400'
        }`}
      >
        <CheckCircle2 className="h-4 w-4" />
      </button>

      <Link to={`/customers/${c.id}`} className="block p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            {c.avatarUrl ? (
              <img src={c.avatarUrl} className="h-14 w-14 rounded-2xl object-cover shadow" alt={c.name} />
            ) : (
              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-lg font-extrabold shadow ${
                c.isVip ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                  : c.balance > 0 ? 'bg-gradient-to-br from-rose-500 to-red-700 text-white'
                  : 'bg-gradient-to-br from-blue-500 to-cyan-600 text-white'
              }`}>
                {c.name.charAt(0).toUpperCase()}
              </div>
            )}
            {c.isVip && (
              <div className="absolute -top-1 -left-1 h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center shadow ring-2 ring-white dark:ring-slate-900">
                <Crown className="h-3 w-3 text-white" />
              </div>
            )}
            {c.isActive === false && (
              <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-slate-600 text-white text-[8px] font-black shadow">OFF</div>
            )}
          </div>
          <div className="flex-1 min-w-0 pr-7">
            <h3 className="font-extrabold text-slate-900 dark:text-white truncate group-hover:text-blue-700 dark:group-hover:text-blue-300 transition">{c.name}</h3>
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
            c.balance > 0 ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30' : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
          }`}>
            <div className={`text-[10px] font-extrabold uppercase tracking-wider ${c.balance > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>Khata</div>
            <div className={`text-sm font-extrabold truncate tabular-nums ${c.balance > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
              {c.balance > 0 ? formatPKR(c.balance) : 'Clear ✓'}
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          {c.loyaltyPoints > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-extrabold">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
              {Number(c.loyaltyPoints).toLocaleString()} pts
            </span>
          )}
          {c.creditLimit > 0 && c.balance > c.creditLimit && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold">
              <AlertTriangle className="h-3 w-3" /> Limit paar
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 font-bold">
            <CalendarDays className="h-2.5 w-2.5" />
            {new Date(c.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: '2-digit' })}
          </span>
        </div>
      </Link>

      {/* Quick actions — HAMESHA nazar aate hain */}
      <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
        <div className="flex items-center gap-1">
          {c.phone && (
            <button onClick={onWhatsapp}
              className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-500/15 hover:bg-green-200 dark:hover:bg-green-500/25 text-green-700 dark:text-green-300 flex items-center justify-center transition"
              title={c.balance > 0 ? 'WhatsApp: Udhaar reminder' : 'WhatsApp: Thank you'}>
              <MessageCircle className="h-3.5 w-3.5" />
            </button>
          )}
          {c.phone && (
            <a href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()}
              className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-500/15 hover:bg-blue-200 dark:hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 flex items-center justify-center transition" title="Call">
              <Phone className="h-3.5 w-3.5" />
            </a>
          )}
          {c.email && (
            <a href={`mailto:${c.email}`} onClick={(e) => e.stopPropagation()}
              className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-500/15 hover:bg-violet-200 dark:hover:bg-violet-500/25 text-violet-700 dark:text-violet-300 flex items-center justify-center transition" title="Email">
              <Mail className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Link to={`/customers/${c.id}`}
            className="h-8 w-8 rounded-lg bg-slate-200/70 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center transition" title="Poori detail">
            <Eye className="h-3.5 w-3.5" />
          </Link>
          <Link to={`/customers/${c.id}/edit`}
            className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-500/15 hover:bg-blue-200 dark:hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 flex items-center justify-center transition" title="Edit">
            <Edit3 className="h-3.5 w-3.5" />
          </Link>
          <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(); }}
            className="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-500/15 hover:bg-rose-200 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-400 flex items-center justify-center transition" title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   📋 CUSTOMER TABLE (list view) — mobile pe scroll hota hai
   ═════════════════════════════════════════════════════════════ */
function CustomerTable({ rows, selected, allSelected, onToggle, onToggleAll, onWhatsapp, onDelete }: any) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[880px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b-2 border-slate-200 dark:border-slate-700">
              <th className="px-3 py-3 w-10">
                <button onClick={onToggleAll} title="Poora page select"
                  className={`h-6 w-6 rounded-md border-2 flex items-center justify-center transition ${
                    allSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-transparent hover:border-blue-400'
                  }`}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </button>
              </th>
              <Th className="text-left">Customer</Th>
              <Th className="text-left">Rabta</Th>
              <Th className="text-left">Sheher</Th>
              <Th className="text-center">Points</Th>
              <Th className="text-right">Kharch</Th>
              <Th className="text-right">Khata</Th>
              <Th className="text-right pr-4">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c: any) => {
              const checked = selected.has(c.id);
              return (
                <tr key={c.id}
                  className={`border-b border-slate-100 dark:border-slate-800 transition ${
                    checked ? 'bg-blue-50 dark:bg-blue-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  } ${c.isActive === false ? 'opacity-60' : ''}`}>
                  <td className="px-3 py-2.5">
                    <button onClick={() => onToggle(c.id)}
                      className={`h-6 w-6 rounded-md border-2 flex items-center justify-center transition ${
                        checked ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-transparent hover:border-blue-400'
                      }`}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <Link to={`/customers/${c.id}`} className="flex items-center gap-2.5 group">
                      {c.avatarUrl ? (
                        <img src={c.avatarUrl} className="h-9 w-9 rounded-xl object-cover shrink-0" alt={c.name} />
                      ) : (
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs font-extrabold text-white shrink-0 ${
                          c.isVip ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                            : c.balance > 0 ? 'bg-gradient-to-br from-rose-500 to-red-700'
                            : 'bg-gradient-to-br from-blue-500 to-cyan-600'
                        }`}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-extrabold text-slate-900 dark:text-white text-[13px] truncate group-hover:text-blue-700 dark:group-hover:text-blue-300 transition flex items-center gap-1">
                          {c.isVip && <Crown className="h-3 w-3 text-amber-500 shrink-0" />}
                          {c.name}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                          {new Date(c.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: '2-digit' })}
                          {c.cnic ? ` • ${c.cnic}` : ''}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                    {c.phone || <span className="text-slate-400">—</span>}
                    {c.email && <div className="text-[10px] text-slate-400 truncate max-w-[160px]">{c.email}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                    {[c.city, c.area].filter(Boolean).join(', ') || <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center text-xs font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
                    {Number(c.loyaltyPoints || 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                    {formatPKR(c.totalSpent)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs font-extrabold tabular-nums whitespace-nowrap">
                    {c.balance > 0 ? (
                      <span className="text-rose-600 dark:text-rose-400">{formatPKR(c.balance)}</span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">Clear ✓</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 pr-4">
                    <div className="flex items-center justify-end gap-1">
                      {c.phone && (
                        <button onClick={(e) => onWhatsapp(c, e)}
                          className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-500/15 hover:bg-green-200 dark:hover:bg-green-500/25 text-green-700 dark:text-green-300 flex items-center justify-center transition" title="WhatsApp">
                          <MessageCircle className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <Link to={`/customers/${c.id}`}
                        className="h-8 w-8 rounded-lg bg-slate-200/70 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center transition" title="Poori detail">
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                      <Link to={`/customers/${c.id}/edit`}
                        className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-500/15 hover:bg-blue-200 dark:hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 flex items-center justify-center transition" title="Edit">
                        <Edit3 className="h-3.5 w-3.5" />
                      </Link>
                      <button onClick={() => onDelete(c)}
                        className="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-500/15 hover:bg-rose-200 dark:hover:bg-rose-500/25 text-rose-700 dark:text-rose-400 flex items-center justify-center transition" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-900 dark:bg-slate-950 text-white">
              <td colSpan={5} className="px-3 py-3 text-right text-[11px] font-extrabold uppercase tracking-widest">Is page ka total</td>
              <td className="px-3 py-3 text-right text-xs font-extrabold text-emerald-300 tabular-nums whitespace-nowrap">
                {formatPKR(rows.reduce((s: number, c: any) => s + Number(c.totalSpent || 0), 0))}
              </td>
              <td className="px-3 py-3 text-right text-xs font-extrabold text-rose-300 tabular-nums whitespace-nowrap">
                {formatPKR(rows.reduce((s: number, c: any) => s + Math.max(0, Number(c.balance || 0)), 0))}
              </td>
              <td />
            </tr>
          </tfoot>
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

/* ═════════════════════════════════════════════════════════════
   📊 ANALYTICS TAB
   ═════════════════════════════════════════════════════════════ */
const PIE_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

function CustomerAnalytics({ rows, loading, stats, total }: { rows: any[]; loading: boolean; stats: any; total: number }) {
  const a = useMemo(() => {
    const n = rows.length || 1;
    const spend = rows.reduce((s, c) => s + Number(c.totalSpent || 0), 0);
    const debt = rows.reduce((s, c) => s + Math.max(0, Number(c.balance || 0)), 0);
    const debtors = rows.filter((c) => Number(c.balance) > 0);
    const overLimit = rows.filter((c) => Number(c.creditLimit || 0) > 0 && Number(c.balance || 0) > Number(c.creditLimit));
    const neverBought = rows.filter((c) => Number(c.totalSpent || 0) <= 0);
    const withPhone = rows.filter((c) => !!c.phone);

    /* naye customers — 6 mahine */
    const months: { label: string; naye: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      const y = d.getFullYear(), m = d.getMonth();
      months.push({
        label: d.toLocaleDateString('en-PK', { month: 'short' }),
        naye: rows.filter((c) => {
          const cd = new Date(c.createdAt);
          return cd.getFullYear() === y && cd.getMonth() === m;
        }).length,
      });
    }

    /* kharch ke bracket */
    const buckets = [
      { label: 'Kuch nahi', min: -1, max: 0 },
      { label: '1–5k', min: 0, max: 5000 },
      { label: '5k–25k', min: 5000, max: 25000 },
      { label: '25k–1 lakh', min: 25000, max: 100000 },
      { label: '1 lakh+', min: 100000, max: Infinity },
    ].map((b) => ({
      label: b.label,
      log: rows.filter((c) => { const v = Number(c.totalSpent || 0); return v > b.min && v <= b.max; }).length,
    }));

    /* sheher */
    const cityMap = new Map<string, number>();
    rows.forEach((c) => {
      const key = (c.city || '').trim() || 'Na-maloom';
      cityMap.set(key, (cityMap.get(key) || 0) + 1);
    });
    const cities = [...cityMap.entries()].sort((x, y) => y[1] - x[1]);
    const topCities = cities.slice(0, 7).map(([name, value]) => ({ name, value }));
    const restCity = cities.slice(7).reduce((s, [, v]) => s + v, 0);
    if (restCity > 0) topCities.push({ name: 'Baqi sheher', value: restCity });

    /* khata ki soorat */
    const khataPie = [
      { name: 'Clear', value: rows.length - debtors.length },
      { name: 'Udhaar hai', value: debtors.length - overLimit.length },
      { name: 'Limit paar', value: overLimit.length },
    ].filter((d) => d.value > 0);

    return {
      spend, debt, debtors, overLimit, neverBought, withPhone, months, buckets, topCities, khataPie,
      avgSpend: spend / n,
      avgDebt: debtors.length ? debt / debtors.length : 0,
      vipCount: rows.filter((c) => c.isVip).length,
      points: rows.reduce((s, c) => s + Number(c.loyaltyPoints || 0), 0),
      topSpenders: [...rows].sort((x, y) => Number(y.totalSpent || 0) - Number(x.totalSpent || 0)).slice(0, 10),
      topDebtors: [...debtors].sort((x, y) => Number(y.balance) - Number(x.balance)).slice(0, 10),
    };
  }, [rows]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-3">
          {[1, 2].map((i) => <div key={i} className="h-72 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-dashed border-slate-300 dark:border-slate-700 p-16 text-center">
        <BarChart3 className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600" />
        <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">Abhi analytics ke liye data nahi</h3>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">Pehle kuch customers add karo — phir yahan poori tasveer milegi.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* note */}
      <div className="rounded-2xl bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/30 p-3 text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-2">
        <Activity className="h-4 w-4 shrink-0" />
        <span>
          Ye analysis <strong>{rows.length}</strong> customers par hai{total > rows.length ? ` (kul ${total} me se sab se ziyada kharch karne walay)` : ''}.
        </span>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <AnaBox icon={Wallet2} tone="emerald" label="Kul Kharch" value={formatPKR(a.spend)} sub={`aik customer ~ ${formatPKR(a.avgSpend)}`} />
        <AnaBox icon={CreditCard} tone="rose" label="Kul Udhaar" value={formatPKR(a.debt)} sub={`${a.debtors.length} logon par • aik ka ~ ${formatPKR(a.avgDebt)}`} />
        <AnaBox icon={Crown} tone="amber" label="VIP" value={String(a.vipCount)} sub={`${((a.vipCount / rows.length) * 100).toFixed(0)}% customers`} />
        <AnaBox icon={Star} tone="blue" label="Loyalty Points" value={Number(a.points).toLocaleString()} sub="sab customers milakar" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <AnaBox icon={UserCheck} tone="blue" label="Phone Number Wale" value={`${a.withPhone.length}`} sub={`${((a.withPhone.length / rows.length) * 100).toFixed(0)}% — WhatsApp bhej sakte ho`} />
        <AnaBox icon={AlertTriangle} tone="rose" label="Limit Paar" value={String(a.overLimit.length)} sub="credit limit se ziyada udhaar" />
        <AnaBox icon={Clock} tone="slate" label="Kuch Nahi Khareeda" value={String(a.neverBought.length)} sub="register hue, sale nahi hui" />
        <AnaBox icon={Target} tone="emerald" label="Is Mahine Naye" value={String(stats?.newThisMonth ?? a.months[a.months.length - 1]?.naye ?? 0)} sub={stats ? `${stats.growthPct >= 0 ? '+' : ''}${stats.growthPct.toFixed(1)}% vs pichla mahina` : undefined} />
      </div>

      {/* charts */}
      <div className="grid lg:grid-cols-2 gap-3 sm:gap-4">
        <ChartCard icon={TrendingUp} title="Naye Customers — 6 Mahine" hint="Har mahine kitne naye gahak bane">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={a.months} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 700 }} stroke="#94a3b8" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fontWeight: 700 }} stroke="#94a3b8" />
              <Tooltip contentStyle={TOOLTIP} cursor={{ fill: '#3b82f61a' }} />
              <Bar dataKey="naye" name="Naye customers" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard icon={BarChart3} title="Kharch Ke Bracket" hint="Kitne customers ne kitna kharcha kiya">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={a.buckets} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fontWeight: 700 }} stroke="#94a3b8" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fontWeight: 700 }} stroke="#94a3b8" />
              <Tooltip contentStyle={TOOLTIP} cursor={{ fill: '#10b9811a' }} />
              <Bar dataKey="log" name="Customers" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard icon={MapPin} title="Sheher Ke Hisaab Se" hint="Kaun se ilaqe se ziyada gahak aate hain">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={a.topCities} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={84} paddingAngle={2}>
                {a.topCities.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP} />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard icon={PieIcon} title="Khata Ki Soorat-e-Haal" hint="Kitne clear, kitne udhaar par, kitne limit se upar">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={a.khataPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={84} paddingAngle={2}>
                {a.khataPie.map((d, i) => (
                  <Cell key={i} fill={d.name === 'Clear' ? '#10b981' : d.name === 'Udhaar hai' ? '#f59e0b' : '#ef4444'} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP} />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* leaderboards */}
      <div className="grid lg:grid-cols-2 gap-3 sm:gap-4">
        <LeaderCard
          title="🏆 Top 10 — Sab Se Ziyada Kharch"
          rows={a.topSpenders}
          valueOf={(c: any) => formatPKR(c.totalSpent)}
          tone="emerald"
          empty="Abhi koi sale nahi hui"
        />
        <LeaderCard
          title="⚠️ Top 10 — Sab Se Ziyada Udhaar"
          rows={a.topDebtors}
          valueOf={(c: any) => formatPKR(c.balance)}
          tone="rose"
          empty="MashaAllah — kisi ka udhaar baqi nahi!"
        />
      </div>
    </div>
  );
}

const TOOLTIP: React.CSSProperties = {
  borderRadius: 12, border: '2px solid #334155', background: '#0f172a',
  color: '#fff', fontSize: 12, fontWeight: 700,
};

function ChartCard({ icon: Icon, title, hint, children }: any) {
  return (
    <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
      <div className="flex items-start gap-2 mb-3">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex items-center justify-center shadow shrink-0">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">{title}</h3>
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{hint}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function LeaderCard({ title, rows, valueOf, tone, empty }: any) {
  const toneCls = tone === 'rose'
    ? 'text-rose-700 dark:text-rose-400'
    : 'text-emerald-700 dark:text-emerald-400';
  return (
    <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5">
      <h3 className="font-extrabold text-slate-900 dark:text-white text-sm mb-3">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 py-6 text-center">{empty}</p>
      ) : (
        <div className="space-y-1">
          {rows.map((c: any, i: number) => (
            <Link key={c.id} to={`/customers/${c.id}`}
              className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition group">
              <span className={`h-6 w-6 rounded-lg text-[10px] font-extrabold flex items-center justify-center shrink-0 ${
                i === 0 ? 'bg-amber-500 text-white' : i === 1 ? 'bg-slate-400 text-white' : i === 2 ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
              }`}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate group-hover:text-blue-700 dark:group-hover:text-blue-300 transition">
                  {c.isVip ? '👑 ' : ''}{c.name}
                </div>
                {c.phone && <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{c.phone}</div>}
              </div>
              <div className={`text-xs font-extrabold tabular-nums whitespace-nowrap ${toneCls}`}>{valueOf(c)}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function AnaBox({ icon: Icon, tone, label, value, sub }: any) {
  const tones: Record<string, string> = {
    blue: 'from-blue-500 to-indigo-700 shadow-blue-500/40',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
    rose: 'from-rose-500 to-red-600 shadow-rose-500/40',
    emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/40',
    slate: 'from-slate-500 to-slate-700 shadow-slate-500/40',
  };
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-extrabold">{label}</div>
          <div className="mt-1.5 text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 truncate">{sub}</div>}
        </div>
        <div className={`h-10 w-10 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   ➕ QUICK ADD CUSTOMER MODAL — 5 second me customer ready
   ═════════════════════════════════════════════════════════════ */
function QuickAddCustomerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isVip, setIsVip] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => nameRef.current?.focus(), 100); }, []);

  const phoneOk = !phone || /^(\+?92|0)?3[0-9]{9}$/.test(phone.replace(/[\s-]/g, ''));

  const createMutation = useMutation({
    mutationFn: () =>
      customersApi.create({
        name: name.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        isVip,
      } as any),
    onSuccess: (c: any) => {
      toast.success(`"${c?.name || name.trim()}" ban gaya ✓`);
      onCreated();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Customer nahi bana'),
  });

  const submit = () => {
    if (!name.trim()) return toast.error('Naam likhna zaroori hai');
    if (!phoneOk) return toast.error('Sahi mobile likho (03XX-XXXXXXX) ya khali chhodo');
    createMutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}>
        <div className="relative bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white px-5 py-4 overflow-hidden">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-400/25 blur-2xl" />
          <div className="relative flex items-start justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-black border border-white/30">
                <Zap className="h-3 w-3" /> Quick Add
              </div>
              <h3 className="text-xl font-black mt-2">Naya Customer — 5 Sec</h3>
              <p className="text-xs text-white/85 font-bold mt-0.5">Sirf naam zaroori • details baad me add karo</p>
            </div>
            <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">Naam *</label>
            <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Ali Raza, Faiza Baji..." maxLength={60}
              className="h-12 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-base font-black text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition" />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Phone <span className="text-slate-400 normal-case font-bold">(optional — WhatsApp ke liye)</span>
            </label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0300-1234567" inputMode="tel"
              className={`h-12 w-full rounded-xl border-2 bg-white dark:bg-slate-800 px-4 text-sm font-bold font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none transition ${
                phone && !phoneOk ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
              }`} />
            {phone && !phoneOk && (
              <div className="mt-1 text-[11px] font-black text-rose-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Sahi mobile likho (03XX-XXXXXXX)
              </div>
            )}
          </div>
          <button type="button" onClick={() => setIsVip(!isVip)}
            className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition ${
              isVip ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/15 dark:to-orange-500/10 border-amber-300 dark:border-amber-500/40'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
            }`}>
            <div className="flex items-center gap-2.5">
              <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <div className="text-left">
                <div className="text-sm font-extrabold text-slate-900 dark:text-white">VIP Customer</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Premium tier — khaas treatment</div>
              </div>
            </div>
            <div className={`h-6 w-11 rounded-full transition-colors relative shrink-0 ${isVip ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
              <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isVip ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
            </div>
          </button>
          <div className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-500">
            Baqi details (CNIC, address, photo) baad me full form se — <Link to="/customers/new" className="text-blue-600 dark:text-blue-400 hover:underline">Full Form</Link>
          </div>
        </div>

        <div className="border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-4 flex gap-2">
          <Button variant="secondary" className="flex-1 h-12" onClick={onClose}><X className="h-4 w-4" /> Cancel</Button>
          <button onClick={submit} disabled={!name.trim() || !phoneOk || createMutation.isPending}
            className="flex-[2] h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 disabled:opacity-50 text-white text-sm font-black inline-flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/40 transition active:scale-[0.98]">
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Customer Banao
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   🖨️ PRINT OPTIONS MODAL
   ═════════════════════════════════════════════════════════════ */
function PrintOptionsModal({ count, onlySelected, onA4, onThermal, onCSV, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 relative bg-gradient-to-br from-blue-700 via-indigo-600 to-violet-700 text-white px-5 py-4 overflow-hidden">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-blue-400/25 blur-2xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-black border border-white/30">
                <Printer className="h-3 w-3" /> Print & Export
              </div>
              <h3 className="text-xl font-black mt-2">👥 Customers Nikalo</h3>
              <p className="text-xs text-white/85 font-bold mt-1">
                {count} customers {onlySelected ? '— sirf jo aap ne select kiye ☑️' : 'is page pe'}
              </p>
            </div>
            <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <PrintOption
            icon={<FileText className="h-7 w-7" />} grad="from-blue-600 to-indigo-700"
            border="border-blue-300 dark:border-blue-500/40 hover:border-blue-500"
            bg="from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10"
            title="A4 Full Report" badge="PDF" badgeCls="bg-emerald-500"
            desc="Colored report — KPIs, spent, khata, VIP marks. Print ya 'Save as PDF'."
            onClick={onA4}
          />
          <PrintOption
            icon={<Printer className="h-7 w-7" />} grad="from-amber-500 to-orange-600"
            border="border-amber-300 dark:border-amber-500/40 hover:border-amber-500"
            bg="from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10"
            title="Thermal List (80mm)" badge="Sab Ek Print Me" badgeCls="bg-rose-500"
            desc="Naam, phone, spent, khata — ek hi lambi thermal print pe."
            onClick={onThermal}
          />
          <PrintOption
            icon={<FileDown className="h-7 w-7" />} grad="from-emerald-600 to-green-700"
            border="border-emerald-300 dark:border-emerald-500/40 hover:border-emerald-500"
            bg="from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10"
            title="CSV Export" badge="Excel" badgeCls="bg-blue-500"
            desc="Excel / Google Sheets ke liye — credit limit aur birthday column bhi included."
            onClick={onCSV}
          />
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-4 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <div className="text-[10px] uppercase tracking-widest font-black text-slate-500 dark:text-slate-400 mb-1">💡 Tips</div>
            <TipRow><strong>PDF:</strong> A4 → print dialog me "Save as PDF"</TipRow>
            <TipRow><strong>Colored:</strong> "Background graphics" ON karo</TipRow>
            <TipRow><strong>Chuno phir print karo</strong> — jin customers ko ☑️ select karo ge, sirf unka report banega</TipRow>
          </div>
        </div>

        <div className="shrink-0 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 p-4">
          <Button variant="secondary" className="w-full" onClick={onClose}><X className="h-4 w-4" /> Band Karo</Button>
        </div>
      </div>
    </div>
  );
}

function PrintOption({ icon, grad, border, bg, title, badge, badgeCls, desc, onClick }: any) {
  return (
    <button onClick={onClick}
      className={`w-full group rounded-2xl border-2 bg-gradient-to-br ${border} ${bg} hover:shadow-xl transition-all p-5 text-left active:scale-[0.98]`}>
      <div className="flex items-start gap-4">
        <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${grad} text-white flex items-center justify-center shadow-lg shrink-0 group-hover:scale-110 transition`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="text-base font-black text-slate-900 dark:text-white">{title}</h4>
            <span className={`px-2 py-0.5 rounded-full ${badgeCls} text-white text-[9px] font-black uppercase`}>{badge}</span>
          </div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">{desc}</p>
        </div>
        <ArrowR className="h-6 w-6 text-slate-400 shrink-0 self-center group-hover:translate-x-1 transition" />
      </div>
    </button>
  );
}

/* ═════════════════════════════════════════════════════════════
   DELETE CONFIRM MODALS
   ═════════════════════════════════════════════════════════════ */
function DeleteConfirmModal({ customer, loading, onClose, onConfirm }: any) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-500/40 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="p-5 text-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-rose-500 to-red-700 text-white mx-auto flex items-center justify-center shadow-lg shadow-rose-500/40">
            <Trash2 className="h-7 w-7" />
          </div>
          <h3 className="mt-3 text-lg font-extrabold text-slate-900 dark:text-white">"{customer.name}" delete karein?</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-semibold">
            {customer.balance > 0
              ? `⚠️ Is ka ${formatPKR(customer.balance)} udhaar baqi hai! Pehle wusooli karo.`
              : 'Ye action undo nahi ho sakta. Sales history mehfooz rahegi.'}
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-rose-600 to-red-700 font-extrabold shadow-lg shadow-rose-500/40"
              onClick={onConfirm} loading={loading}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BulkDeleteModal({ rows, loading, onClose, onConfirm }: any) {
  const withDebt = rows.filter((c: any) => Number(c.balance) > 0);
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-500/40 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="p-5 text-center shrink-0">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-rose-500 to-red-700 text-white mx-auto flex items-center justify-center shadow-lg shadow-rose-500/40">
            <Trash2 className="h-7 w-7" />
          </div>
          <h3 className="mt-3 text-lg font-extrabold text-slate-900 dark:text-white">{rows.length} customers delete karein?</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-semibold">
            Ye action undo nahi ho sakta. Jin ki sales ya khata history hai, wo delete nahi honge — unka naam baad me bata diya jayega.
          </p>
        </div>

        {withDebt.length > 0 && (
          <div className="mx-5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3 text-xs font-bold text-amber-900 dark:text-amber-200 flex gap-2 shrink-0">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              In me se <strong>{withDebt.length}</strong> par kul{' '}
              <strong>{formatPKR(withDebt.reduce((s: number, c: any) => s + Number(c.balance), 0))}</strong> udhaar baqi hai — pehle wusooli kar lo!
            </span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 pt-3">
          <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 max-h-52 overflow-y-auto">
            {rows.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                <span className="font-extrabold text-slate-800 dark:text-slate-100 truncate">{c.isVip ? '👑 ' : ''}{c.name}</span>
                <span className={`font-extrabold tabular-nums shrink-0 ${c.balance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                  {c.balance > 0 ? formatPKR(c.balance) : 'Clear'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="shrink-0 border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-4 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-rose-600 to-red-700 font-extrabold shadow-lg shadow-rose-500/40"
            onClick={onConfirm} loading={loading}>
            <Trash2 className="h-4 w-4" /> Sab Delete
          </Button>
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
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-300 dark:border-blue-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
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
            Ye aapki <strong>poori gahak list</strong> hai — VIP 👑, khata wale 💳, top spenders 🏆, birthdays 🎂. Har industry me bilkul ek jaisa page.
          </p>

          <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/5 p-4 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <div className="text-[10px] uppercase tracking-widest font-black text-emerald-800 dark:text-emerald-200 mb-1">⚡ Customer Banao</div>
            <TipRow>Hero me <strong>"Quick"</strong> (ya <Kbd dark>N</Kbd>) — sirf naam likho, customer ready. Details baad me</TipRow>
            <TipRow><strong>Full Form</strong> — photo, CNIC, address, credit limit sab ke liye</TipRow>
          </div>

          <div className="rounded-2xl border-2 border-violet-200 dark:border-violet-500/30 bg-violet-50/60 dark:bg-violet-500/5 p-4 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <div className="text-[10px] uppercase tracking-widest font-black text-violet-800 dark:text-violet-200 mb-1">🔲 Do View • ☑️ Bulk Kaam</div>
            <TipRow><strong>Cards / List</strong> — upar toggle se (ya <Kbd dark>G</Kbd>). List view me table bante hai — kharch, khata, points ek nazar me</TipRow>
            <TipRow><strong>☑️ Select</strong> — card ke kone ka checkbox ya list ka box. Phir upar wali bar se: VIP banao, numbers copy, CSV, print, bulk delete</TipRow>
            <TipRow><strong>Numbers copy</strong> — select kiye gahak ke sab numbers clipboard me — WhatsApp broadcast me seedha paste</TipRow>
            <TipRow>Buttons <strong>hamesha nazar aate hain</strong> — mouse le jane ka intezar nahi karna parta</TipRow>
          </div>

          <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/5 p-4 space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <div className="text-[10px] uppercase tracking-widest font-black text-blue-800 dark:text-blue-200 mb-1">📊 Analytics & Rabta</div>
            <TipRow><strong>Analytics tab</strong> (<Kbd dark>A</Kbd>) — naye customers ka mahina-war graph, kharch ke bracket, sheher, khata ki soorat, top 10 spenders aur top 10 udhaar walay</TipRow>
            <TipRow><strong>💬 Smart WhatsApp</strong> — Faiza ko "baji", Ali ko "bhai" khud lagta hai. Udhaar wale ko reminder, clear wale ko thank-you</TipRow>
            <TipRow><strong>🎂 Birthdays</strong> — is mahine ki salgirah upar dikhti hai, 1-click wish bhejo</TipRow>
            <TipRow><strong>💳 "Total Khata" KPI pe click</strong> — sirf udhaar wale filter ho jate hain</TipRow>
            <TipRow><strong>🖨️ Print</strong> — A4 report, 80mm thermal list, CSV — filters aur selection dono ke sath</TipRow>
          </div>

          <div className="rounded-xl bg-slate-900 dark:bg-slate-950 border border-slate-700 p-3 text-xs font-semibold text-slate-200">
            <div className="text-[10px] uppercase tracking-widest font-black text-blue-300 mb-2">⌨️ Shortcuts</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div><Kbd dark>/</Kbd> Search</div>
              <div><Kbd dark>N</Kbd> Quick add</div>
              <div><Kbd dark>G</Kbd> Grid / List</div>
              <div><Kbd dark>A</Kbd> Analytics</div>
              <div><Kbd dark>P</Kbd> Print</div>
              <div><Kbd dark>T</Kbd> Guide</div>
              <div><Kbd dark>Esc</Kbd> Band / selection clear</div>
            </div>
          </div>

          <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3 text-xs font-semibold text-amber-900 dark:text-amber-200 flex gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <span><strong>Sunahri usool:</strong> Jo customer 30 din se nahi aya, usay WhatsApp pe "miss you" message bhejo — 3 mein se 1 wapas aata hai! 😊</span>
          </div>

          <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-700 hover:from-blue-700 hover:to-cyan-800 font-extrabold shadow-lg shadow-blue-500/40 h-12" onClick={onClose}>
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

/**
 * <span> hai, <kbd> nahi — index.css ka global `html.dark kbd {}` rule
 * specificity me utility classes ko hara deta tha aur chip ghayab ho jati thi.
 */
function Kbd({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded font-mono font-bold shadow-sm text-[10px] ${
      dark ? 'bg-slate-700 text-slate-100 border border-slate-600' : 'bg-white/15 border border-white/25 text-white'
    }`}>
      {children}
    </span>
  );
}

function TabBtn({ active, onClick, icon: Icon, label }: any) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
        active ? 'bg-slate-900 dark:bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}>
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone, onClick, active }: any) {
  const tones: Record<string, string> = {
    blue: 'from-blue-500 to-indigo-700 shadow-blue-500/40',
    amber: 'from-amber-500 to-orange-600 shadow-amber-500/40',
    rose: 'from-rose-500 to-red-600 shadow-rose-500/40',
    emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/40',
  };
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={[
        'group rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 p-3 sm:p-4 shadow-sm text-left w-full transition-all',
        onClick ? 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer' : '',
        active ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-500/20' : 'border-slate-200 dark:border-slate-800',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-extrabold">{label}</div>
          <div className="mt-1.5 text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 truncate">{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-lg shrink-0 group-hover:scale-110 transition`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Comp>
  );
}
