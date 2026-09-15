import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ComposedChart,
} from 'recharts';
import {
  Truck, ArrowLeft, Edit3, BookOpen, Phone, MessageCircle, Mail, MapPin,
  Wallet, Package, TrendingUp, TrendingDown, Clock, CheckCircle2, AlertTriangle,
  Printer, FileSpreadsheet, GraduationCap, Keyboard, RefreshCw, Landmark,
  FileText, Copy, ChevronRight, Banknote, Loader2, ShoppingCart, BarChart3,
  Hash, CalendarClock, HandCoins, Activity, Crown, Plus, PowerOff, Power,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { useCostHidden, PrivacyToggle } from '@/core/security/HiddenValue';
import { suppliersApi } from '../api/suppliers.api';
import { SupplierKhataModal } from '../components/SupplierKhataModal';
import {
  SUPPLIER_GRADIENT, Kpi, Panel, Empty, Teacher, Shortcuts,
  fmtDate, fmtDateTime, initials, daysPhrase, waNumber, payMeta,
  printHtml, a4Shell, downloadCsv,
} from '../components/SuppliersKit';

/* ═════════════════════════════════════════════════════════════
   SUPPLIER DETAIL — ek supplier ka poora record
   ─────────────────────────────────────────────────────────────
   Teen sawal jin ka jawab dukaan-daar yahan dhoondta hai:
   1. Is ka kitna dena hai aur kab se?
   2. Is se kya kya aata hai, aur rate barh to nahi raha?
   3. Kitne arse se maal nahi aaya?

   Rate ka safar (price history) sab se kaam ki cheez hai —
   ek hi cheez chupke chupke mehngi hoti rehti hai aur kisi ko
   pata nahi chalta.
   ═════════════════════════════════════════════════════════════ */

type Tab = 'overview' | 'purchases' | 'products' | 'analytics';

export default function SupplierDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const hideCost = useCostHidden();

  const [tab, setTab] = useState<Tab>('overview');
  const [showKhata, setShowKhata] = useState(false);
  const [showTeacher, setShowTeacher] = useState(false);
  const [showKeys, setShowKeys] = useState(false);

  const { data: s, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['supplier', id],
    queryFn: () => suppliersApi.getOne(id!),
    enabled: !!id,
  });

  const toggleActive = useMutation({
    mutationFn: () => suppliersApi.update(id!, { isActive: !s?.isActive } as any),
    onSuccess: () => {
      toast.success(s?.isActive ? 'Supplier band kar diya' : 'Supplier chalu kar diya');
      qc.invalidateQueries({ queryKey: ['supplier', id] });
      qc.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Update nahi hua'),
  });

  /* ─── Keyboard ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = /input|textarea|select/i.test(el?.tagName ?? '') || el?.isContentEditable;
      if (e.key === 'Escape') {
        if (showKhata) return setShowKhata(false);
        if (showTeacher) return setShowTeacher(false);
        if (showKeys) return setShowKeys(false);
      }
      if (typing) return;
      if (e.key.toLowerCase() === 'k') setShowKhata(true);
      if (e.key.toLowerCase() === 'e') navigate(`/suppliers/${id}/edit`);
      if (e.key.toLowerCase() === 'b') navigate('/suppliers');
      if (e.key.toLowerCase() === 'a') setTab('analytics');
      if (e.key.toLowerCase() === 't') setShowTeacher(true);
      if (e.key === '?') setShowKeys(true);
      if (e.key.toLowerCase() === 'p') doPrint();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const due = Number(s?.outstandingDue ?? 0);
  const wa = waNumber(s?.phone);
  const stats = s?.stats;
  const ledger = s?.ledger;

  /* ─── Kis kis tarah ki cheez aati hai ─── */
  const categories = useMemo(() => {
    if (!s?.purchases) return [];
    const map = new Map<string, { name: string; total: number; qty: number }>();
    for (const p of s.purchases) {
      for (const it of p.items ?? []) {
        const key = it.product?.name ?? 'Doosra';
        const hit = map.get(key) ?? { name: key, total: 0, qty: 0 };
        hit.total += Number(it.total ?? 0);
        hit.qty += Number(it.quantity ?? 0);
        map.set(key, hit);
      }
    }
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 8);
  }, [s]);

  /* ─── Print: supplier ka poora kaghaz ─── */
  const doPrint = () => {
    if (!s) return;
    const body = `
      <div class="cards">
        <div class="card"><div class="l">Kul bill</div><div class="v">${s.stats?.totalPurchases ?? 0}</div></div>
        <div class="card"><div class="l">Kul kharidari</div><div class="v">${formatPKR(s.stats?.totalAmount ?? 0)}</div></div>
        <div class="card"><div class="l">Diya</div><div class="v ok">${formatPKR(s.stats?.totalPaid ?? 0)}</div></div>
        <div class="card"><div class="l">Hamara baqi</div><div class="v due">${formatPKR(Number(s.outstandingDue ?? 0))}</div></div>
      </div>
      <table>
        <thead><tr><th>Bill #</th><th>Tareekh</th><th>Tareeqa</th><th class="r">Kul</th><th class="r">Diya</th><th class="r">Baqi</th></tr></thead>
        <tbody>${(s.purchases ?? []).map((p) => {
          const d = Number(p.total ?? 0) - Number(p.paidAmount ?? 0);
          return `<tr>
            <td><strong>${p.purchaseNumber}</strong></td>
            <td>${fmtDate(p.purchasedAt)}</td>
            <td>${payMeta(p.paymentMethod).label}</td>
            <td class="r num">${formatPKR(Number(p.total ?? 0))}</td>
            <td class="r num">${formatPKR(Number(p.paidAmount ?? 0))}</td>
            <td class="r num ${d > 0 ? 'due' : 'ok'}">${formatPKR(d)}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>`;
    printHtml(a4Shell(
      s.name,
      body,
      [s.contactPerson, s.phone, s.city, s.ntn ? `NTN ${s.ntn}` : null].filter(Boolean).join(' · '),
    ));
  };

  const doCsv = () => {
    if (!s) return;
    downloadCsv(`${s.name.replace(/\s+/g, '-').toLowerCase()}-bills.csv`, [
      ['Bill #', 'Tareekh', 'Tareeqa', 'Halat', 'Kul', 'Diya', 'Baqi'],
      ...(s.purchases ?? []).map((p) => [
        p.purchaseNumber, fmtDate(p.purchasedAt), payMeta(p.paymentMethod).label, p.status,
        Number(p.total ?? 0), Number(p.paidAmount ?? 0),
        Number(p.total ?? 0) - Number(p.paidAmount ?? 0),
      ]),
    ]);
    toast.success('CSV ban gaya');
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="h-7 w-7 animate-spin mx-auto text-teal-600 mb-3" />
        <p className="text-sm font-bold text-slate-500">Supplier aa raha hai…</p>
      </div>
    );
  }

  if (!s) {
    return (
      <div className="rounded-3xl bg-[#ffffff] dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800">
        <Empty icon={Truck} title="Ye supplier nahi mila"
          desc="Shayad delete ho gaya ya link ghalat hai."
          action={<Link to="/suppliers"><Button><ArrowLeft className="h-4 w-4" /> Suppliers</Button></Link>} />
      </div>
    );
  }

  const money = (n: number) => (hideCost ? '•••' : formatPKR(n));

  return (
    <div className="space-y-5 pb-24">
      {/* ─────── HERO ─────── */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${SUPPLIER_GRADIENT} text-white p-5 sm:p-7`}>
        <div className="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl" />

        <Link to="/suppliers" className="relative inline-flex items-center gap-1.5 text-xs font-extrabold text-white/80 hover:text-white transition">
          <ArrowLeft className="h-3.5 w-3.5" /> Suppliers
        </Link>

        <div className="relative flex flex-wrap items-start justify-between gap-4 mt-3">
          <div className="flex items-start gap-4 min-w-0">
            <div className="h-16 w-16 rounded-3xl bg-white/20 border-2 border-white/30 flex items-center justify-center font-black text-xl shrink-0 overflow-hidden">
              {s.logoUrl ? <img src={s.logoUrl} alt="" className="h-full w-full object-cover" /> : initials(s.name)}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black truncate">{s.name}</h1>
              <div className="flex items-center gap-2 flex-wrap mt-1.5 text-[11px] font-extrabold">
                {!s.isActive && <span className="px-2 py-0.5 rounded-full bg-black/30 border border-white/30">Band</span>}
                {s.contactPerson && <span className="px-2 py-0.5 rounded-full bg-white/20">👤 {s.contactPerson}</span>}
                {s.city && <span className="px-2 py-0.5 rounded-full bg-white/20">📍 {s.city}{s.area ? `, ${s.area}` : ''}</span>}
                {s.paymentTerms && <span className="px-2 py-0.5 rounded-full bg-white/20">📅 {s.paymentTerms}</span>}
                {s.ntn && <span className="px-2 py-0.5 rounded-full bg-white/20 font-mono">NTN {s.ntn}</span>}
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-2">
                {s.phone && (
                  <a href={`tel:${s.phone}`} className="h-9 px-3 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-extrabold inline-flex items-center gap-1.5 transition">
                    <Phone className="h-3.5 w-3.5" /> {s.phone}
                  </a>
                )}
                {wa && (
                  <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer"
                    className="h-9 px-3 rounded-xl bg-emerald-500/90 hover:bg-emerald-400 text-xs font-extrabold inline-flex items-center gap-1.5 transition">
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                )}
                {s.email && (
                  <a href={`mailto:${s.email}`} className="h-9 px-3 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-extrabold inline-flex items-center gap-1.5 transition">
                    <Mail className="h-3.5 w-3.5" /> Email
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <PrivacyToggle />
            <button onClick={() => setShowTeacher(true)} title="Sikhein (T)"
              className="h-11 w-11 rounded-2xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
              <GraduationCap className="h-4 w-4" />
            </button>
            <button onClick={() => setShowKeys(true)} title="Shortcuts (?)"
              className="h-11 w-11 rounded-2xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
              <Keyboard className="h-4 w-4" />
            </button>
            <button onClick={() => refetch()} disabled={isRefetching} title="Taaza"
              className="h-11 w-11 rounded-2xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={doPrint} title="Print (P)"
              className="h-11 w-11 rounded-2xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition">
              <Printer className="h-4 w-4" />
            </button>
            <Link to={`/suppliers/${s.id}/edit`}
              className="h-11 px-3.5 rounded-2xl bg-white/20 hover:bg-white/30 text-sm font-extrabold inline-flex items-center gap-1.5 transition">
              <Edit3 className="h-4 w-4" /> <span className="hidden sm:inline">Badlein</span>
            </Link>
            <button onClick={() => setShowKhata(true)}
              className="h-11 px-4 rounded-2xl bg-[#ffffff] text-violet-800 text-sm font-black inline-flex items-center gap-1.5 shadow-lg hover:bg-violet-50 transition">
              <BookOpen className="h-4 w-4" /> Khata
            </button>
          </div>
        </div>

        {/* baqi ki patti */}
        <div className={`relative mt-5 rounded-2xl p-4 ${due > 0 ? 'bg-rose-500/25 border-2 border-rose-300/40' : 'bg-emerald-500/25 border-2 border-emerald-300/40'}`}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-white/80">
                {due > 0 ? 'Hum ne is supplier ko dena hai' : 'Hisab saaf hai'}
              </div>
              <div className="text-3xl font-black tabular-nums">{money(due)}</div>
              <div className="text-[11px] font-bold text-white/85 mt-0.5">
                {ledger?.lastPaymentAt
                  ? `Aakhri adaigi ${money(Number(ledger.lastPaymentAmount ?? 0))} — ${daysPhrase(ledger.daysSincePayment)}`
                  : due > 0 ? 'Ab tak ek bhi adaigi darj nahi' : 'Sab kuch chuka diya gaya'}
              </div>
            </div>
            <button onClick={() => setShowKhata(true)}
              className="h-12 px-5 rounded-2xl bg-[#ffffff] text-slate-900 text-sm font-black inline-flex items-center gap-2 shadow-lg transition">
              <Banknote className="h-4 w-4" /> {due > 0 ? 'Paisa Dein' : 'Khata Dekhein'}
            </button>
          </div>
        </div>
      </div>

      {/* ─────── KPI ─────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-2.5">
        <Kpi icon={ShoppingCart} label="Kul bill" tone="blue" value={stats?.totalPurchases ?? 0}
          sub={`Ausat ${money(stats?.averagePurchase ?? 0)}`} />
        <Kpi icon={Package} label="Kul kharidari" tone="teal" value={money(stats?.totalAmount ?? 0)}
          sub={`${money(stats?.totalPaid ?? 0)} diya`} />
        <Kpi icon={Wallet} label="Hamara baqi" tone="rose" value={money(due)}
          sub={due > 0 ? daysPhrase(ledger?.daysSincePayment) + ' se' : 'Saaf'} />
        <Kpi icon={BookOpen} label="Purana hisab" tone="violet" value={money(ledger?.openingBalance ?? 0)}
          sub="Khata shuru hone se pehle" />
        <Kpi icon={HandCoins} label="Kul adaigi" tone="emerald" value={money(ledger?.paymentsMade ?? 0)}
          sub={`${ledger?.entryCount ?? 0} khate ki entry`} />
        <Kpi icon={TrendingDown} label="Maal wapas" tone="amber" value={money(ledger?.returns ?? 0)}
          sub="Baqi me se ghata" />
        <Kpi icon={Clock} label="Aakhri maal" tone="indigo"
          value={stats?.lastPurchaseDate ? fmtDate(stats.lastPurchaseDate) : '—'}
          sub={daysPhrase(stats?.daysSinceLastPurchase)} />
        <Kpi icon={CalendarClock} label="Rishta" tone="slate" value={fmtDate(s.createdAt)}
          sub={`${daysPhrase(Math.floor((Date.now() - new Date(s.createdAt).getTime()) / 86400000))} se`} />
      </div>

      {/* ─────── TABS ─────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {([
          { v: 'overview' as Tab, label: 'Khulasa', icon: Activity },
          { v: 'purchases' as Tab, label: 'Bill', icon: ShoppingCart, n: s._count?.purchases },
          { v: 'products' as Tab, label: 'Kya Aata Hai', icon: Package, n: s.topProducts?.length },
          { v: 'analytics' as Tab, label: 'Analytics', icon: BarChart3 },
        ]).map((t) => (
          <button key={t.v} onClick={() => setTab(t.v)}
            className={`h-11 px-4 rounded-2xl text-sm font-extrabold inline-flex items-center gap-2 shrink-0 transition ${
              tab === t.v
                ? 'bg-gradient-to-r from-teal-600 to-emerald-700 text-white shadow-lg shadow-teal-500/30'
                : 'bg-[#ffffff] dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-teal-400'
            }`}>
            <t.icon className="h-4 w-4" /> {t.label}
            {t.n !== undefined && t.n > 0 && (
              <span className={`px-1.5 rounded-full text-[10px] tabular-nums ${tab === t.v ? 'bg-black/20' : 'bg-slate-200 dark:bg-slate-800'}`}>{t.n}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════ OVERVIEW ══════════ */}
      {tab === 'overview' && (
        <div className="grid lg:grid-cols-[1fr_340px] gap-4 items-start">
          <div className="space-y-4 min-w-0">
            {/* khata ka tootna */}
            <Panel icon={BookOpen} title="Baqi Bana Kaise" desc="Har hissa alag alag" tone="violet"
              right={
                <button onClick={() => setShowKhata(true)}
                  className="h-9 px-3 rounded-xl bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-[11px] font-extrabold inline-flex items-center gap-1 transition">
                  Poora khata <ChevronRight className="h-3.5 w-3.5" />
                </button>
              }>
              <div className="space-y-2">
                {[
                  { label: 'Purana hisab', value: ledger?.openingBalance ?? 0, sign: '+', tone: 'violet', desc: 'System se pehle ka' },
                  { label: 'Udhaar par maal', value: ledger?.purchaseCredit ?? 0, sign: '+', tone: 'amber', desc: 'Bill ka bacha hua' },
                  { label: 'Adaigi', value: ledger?.paymentsMade ?? 0, sign: '−', tone: 'emerald', desc: 'Jo hum ne diya' },
                  { label: 'Maal wapas', value: ledger?.returns ?? 0, sign: '−', tone: 'blue', desc: 'Jo wapas kiya' },
                  { label: 'Durusti', value: ledger?.adjustments ?? 0, sign: '±', tone: 'slate', desc: 'Haath se theek ki' },
                ].map((r) => {
                  const tones: Record<string, string> = {
                    violet: 'text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-500/10',
                    amber: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10',
                    emerald: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10',
                    blue: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10',
                    slate: 'text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60',
                  };
                  return (
                    <div key={r.label} className={`flex items-center justify-between gap-3 rounded-xl p-2.5 ${tones[r.tone]}`}>
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold truncate">{r.label}</div>
                        <div className="text-[10px] font-bold opacity-70">{r.desc}</div>
                      </div>
                      <div className="text-sm font-black tabular-nums shrink-0">
                        {r.sign} {money(r.value)}
                      </div>
                    </div>
                  );
                })}
                <div className={`flex items-center justify-between gap-3 rounded-2xl p-3 border-2 ${
                  due > 0
                    ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-300 dark:border-rose-500/40'
                    : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40'
                }`}>
                  <div className="text-sm font-black text-slate-900 dark:text-white">Ab hamara dena</div>
                  <div className={`text-xl font-black tabular-nums ${due > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                    {money(due)}
                  </div>
                </div>
              </div>
            </Panel>

            {/* 30 din */}
            <Panel icon={Activity} title="Pichlay 30 Din" desc="Rozana kitna maal aaya" tone="teal">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={s.trend30Days ?? []}>
                    <defs>
                      <linearGradient id="sd30" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => String(v).slice(5)} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                    <Tooltip formatter={(v: any) => formatPKR(Number(v))}
                      contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700 }} />
                    <Area type="monotone" dataKey="total" stroke="#0d9488" strokeWidth={2.5} fill="url(#sd30)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            {/* haal ke bill */}
            <Panel icon={ShoppingCart} title="Haal ke Bill" desc="Aakhri 20 kharidari" tone="blue"
              right={
                <button onClick={doCsv}
                  className="h-9 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-extrabold inline-flex items-center gap-1 transition">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
                </button>
              }>
              {(s.purchases ?? []).length === 0 ? (
                <Empty icon={ShoppingCart} title="Is se abhi koi maal nahi aaya"
                  desc="Kharidari ke safhe se pehla bill banayein."
                  action={<Link to="/purchases"><Button><Plus className="h-4 w-4" /> Kharidari</Button></Link>} />
              ) : (
                <div className="space-y-1.5">
                  {s.purchases.slice(0, 8).map((p) => <PurchaseRow key={p.id} p={p} money={money} />)}
                  {s.purchases.length > 8 && (
                    <button onClick={() => setTab('purchases')}
                      className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs font-extrabold text-slate-600 dark:text-slate-300 transition">
                      Baqi {s.purchases.length - 8} bill dekhein
                    </button>
                  )}
                </div>
              )}
            </Panel>
          </div>

          {/* sidebar */}
          <div className="space-y-4">
            <Panel icon={Truck} title="Tafseel" tone="slate">
              <div className="space-y-2">
                <Info label="Banda" value={s.contactPerson} icon={Truck} />
                <Info label="Phone" value={s.phone} icon={Phone} mono copy />
                <Info label="Doosra phone" value={s.altPhone} icon={Phone} mono copy />
                <Info label="Email" value={s.email} icon={Mail} copy />
                <Info label="Pata" value={[s.address, s.area, s.city].filter(Boolean).join(', ')} icon={MapPin} />
                <Info label="NTN" value={s.ntn} icon={Hash} mono copy />
                <Info label="CNIC" value={s.cnic} icon={Hash} mono copy />
                <Info label="Payment terms" value={s.paymentTerms} icon={CalendarClock} />
              </div>
            </Panel>

            {(s.bankName || s.accountNumber || s.iban) && (
              <Panel icon={Landmark} title="Bank" desc="Adaigi bhejne ke liye" tone="emerald">
                <div className="space-y-2">
                  <Info label="Bank" value={s.bankName} icon={Landmark} />
                  <Info label="Account" value={s.accountNumber} icon={Hash} mono copy />
                  <Info label="IBAN" value={s.iban} icon={Hash} mono copy />
                </div>
              </Panel>
            )}

            {s.notes && (
              <Panel icon={FileText} title="Yaad-dasht" tone="amber">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {s.notes}
                </p>
              </Panel>
            )}

            <Panel icon={Activity} title="Kaam" tone="teal">
              <div className="space-y-2">
                <Link to="/purchases"
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-700 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 shadow transition">
                  <Plus className="h-4 w-4" /> Nayi Kharidari
                </Link>
                <button onClick={() => setShowKhata(true)}
                  className="w-full h-11 rounded-xl bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-sm font-extrabold inline-flex items-center justify-center gap-2 transition">
                  <BookOpen className="h-4 w-4" /> Khata (K)
                </button>
                <button onClick={doPrint}
                  className="w-full h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-extrabold inline-flex items-center justify-center gap-2 transition">
                  <Printer className="h-4 w-4" /> Print (P)
                </button>
                <button onClick={() => toggleActive.mutate()} disabled={toggleActive.isPending}
                  className="w-full h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-extrabold inline-flex items-center justify-center gap-2 disabled:opacity-50 transition">
                  {s.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                  {s.isActive ? 'Band Karein' : 'Chalu Karein'}
                </button>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* ══════════ PURCHASES ══════════ */}
      {tab === 'purchases' && (
        <Panel icon={ShoppingCart} title="Saray Bill" desc={`${s._count?.purchases ?? 0} kharidari — aakhri 20 yahan`} tone="blue"
          right={
            <div className="flex gap-1.5">
              <button onClick={doCsv} className="h-9 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-extrabold inline-flex items-center gap-1 transition">
                <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
              </button>
              <button onClick={doPrint} className="h-9 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-extrabold inline-flex items-center gap-1 transition">
                <Printer className="h-3.5 w-3.5" /> Print
              </button>
            </div>
          }>
          {(s.purchases ?? []).length === 0 ? (
            <Empty icon={ShoppingCart} title="Koi bill nahi" desc="Is supplier se abhi tak maal nahi aaya." />
          ) : (
            <div className="space-y-2">
              {s.purchases.map((p) => <PurchaseRow key={p.id} p={p} money={money} expandable />)}
            </div>
          )}
        </Panel>
      )}

      {/* ══════════ PRODUCTS ══════════ */}
      {tab === 'products' && (
        <div className="space-y-4">
          <Panel icon={Package} title="Is se Kya Kya Aata Hai" desc="Sab se zyada kharide gaye maal" tone="teal">
            {(s.topProducts ?? []).length === 0 ? (
              <Empty icon={Package} title="Abhi kuch nahi aaya" />
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {s.topProducts.map((p, i) => (
                  <Link key={p.productId} to={`/products/${p.productId}`}
                    className="flex items-center gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-3 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition">
                    <div className="h-11 w-11 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden shrink-0 text-lg">
                      {p.product?.images?.[0]?.url
                        ? <img src={p.product.images[0].url} alt="" className="h-full w-full object-cover" />
                        : '📦'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                        {p.product?.name ?? '—'}
                      </div>
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {p.quantity} {p.product?.unit ?? ''} · {p.orderCount} bill
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-black text-slate-900 dark:text-white tabular-nums">{money(p.total)}</div>
                      <div className="text-[10px] font-bold text-slate-400">#{i + 1}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          {/* rate ka safar */}
          <Panel icon={TrendingUp} title="Rate Ka Safar" desc="Ek hi cheez har baar mehngi to nahi ho rahi" tone="rose">
            {(s.priceHistory ?? []).length === 0 ? (
              <Empty icon={TrendingUp} title="Rate ka moqabla nahi ho sakta"
                desc="Jab ek hi cheez do ya zyada baar aayegi, tab yahan uska rate ka safar nazar aayega." />
            ) : (
              <div className="space-y-3">
                {s.priceHistory.map((ph) => {
                  const up = ph.changePct > 0.5;
                  const down = ph.changePct < -0.5;
                  return (
                    <div key={ph.productId} className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                        <div className="min-w-0">
                          <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{ph.productName}</div>
                          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            {ph.points.length} dafa aaya · pehla {money(ph.firstCost)} → abhi {money(ph.lastCost)}
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black tabular-nums inline-flex items-center gap-1 shrink-0 ${
                          up ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                             : down ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                             : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}>
                          {up ? <TrendingUp className="h-3.5 w-3.5" /> : down ? <TrendingDown className="h-3.5 w-3.5" /> : null}
                          {ph.changePct > 0 ? '+' : ''}{ph.changePct.toFixed(1)}%
                        </span>
                      </div>
                      {ph.points.length > 1 && (
                        <div className="h-28">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={ph.points}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                              <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(v) => String(v).slice(5)} />
                              <YAxis tick={{ fontSize: 9 }} width={44} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                              <Tooltip formatter={(v: any) => formatPKR(Number(v))}
                                labelFormatter={(l) => `Tareekh ${l}`}
                                contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700 }} />
                              <Line type="monotone" dataKey="costPrice" stroke={up ? '#e11d48' : down ? '#10b981' : '#64748b'}
                                strokeWidth={2.5} dot={{ r: 3 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                      {up && ph.changePct > 15 && (
                        <div className="mt-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-2.5 flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                          <div className="text-[11px] font-bold text-rose-900 dark:text-rose-200">
                            Rate {ph.changePct.toFixed(0)}% barh chuka hai — bechne ka rate bhi dekh lein warna munafa khatam ho jayega.
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* ══════════ ANALYTICS ══════════ */}
      {tab === 'analytics' && (
        <div className="space-y-4">
          <Panel icon={TrendingUp} title="12 Mahine" desc="Kis mahine kitna maal aaya aur kitna diya" tone="teal">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={s.months12 ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fontWeight: 700 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                  <Tooltip formatter={(v: any, n: any) => [formatPKR(Number(v)), n === 'total' ? 'Kharidari' : n === 'paid' ? 'Diya' : 'Bill']}
                    contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700 }} />
                  <Legend formatter={(v) => (v === 'total' ? 'Kharidari' : v === 'paid' ? 'Diya' : 'Bill')} />
                  <Bar dataKey="total" fill="#0d9488" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="paid" fill="#34d399" radius={[6, 6, 0, 0]} />
                  <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <div className="grid lg:grid-cols-2 gap-4">
            <Panel icon={Banknote} title="Adaigi Ka Tareeqa" desc="Cash, bank ya wallet" tone="emerald">
              {(s.paymentBreakdown ?? []).length === 0 ? (
                <Empty icon={Banknote} title="Abhi koi adaigi nahi" />
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie dataKey="total" nameKey="paymentMethod" cx="50%" cy="50%" innerRadius={48} outerRadius={78} paddingAngle={3}
                        data={(s.paymentBreakdown ?? []).map((p) => ({ ...p, paymentMethod: payMeta(p.paymentMethod).label }))}>
                        {(s.paymentBreakdown ?? []).map((p, i) => <Cell key={i} fill={payMeta(p.paymentMethod).hex} />)}
                      </Pie>
                      <Tooltip formatter={(v: any, n: any) => [formatPKR(Number(v)), n]}
                        contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700 }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            <Panel icon={Package} title="Kaun Si Cheez Par Kitna" desc="Bill ki lines ke hisab se" tone="indigo">
              {categories.length === 0 ? (
                <Empty icon={Package} title="Abhi kuch nahi aaya" />
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categories} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fontWeight: 700 }} />
                      <Tooltip formatter={(v: any) => formatPKR(Number(v))}
                        contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700 }} />
                      <Bar dataKey="total" fill="#6366f1" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>
          </div>

          <Panel icon={Activity} title="Pichlay 30 Din" desc="Rozana" tone="slate">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={s.trend30Days ?? []}>
                  <defs>
                    <linearGradient id="sd30b" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => String(v).slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                  <Tooltip formatter={(v: any) => formatPKR(Number(v))}
                    contentStyle={{ borderRadius: 12, border: '2px solid #e2e8f0', fontWeight: 700 }} />
                  <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2.5} fill="url(#sd30b)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      )}

      {/* ─────── MODALS ─────── */}
      {showKhata && <SupplierKhataModal supplierId={s.id} onClose={() => setShowKhata(false)} />}

      {showTeacher && (
        <Teacher onClose={() => setShowTeacher(false)}
          title="Supplier ka safha"
          subtitle="Yahan se kya kya pata chalta hai"
          steps={[
            { icon: '💰', head: 'Upar wali patti', body: 'Sab se pehle wohi nazar aata hai jo sab se zyada ahem hai: is supplier ko hum ne kitna dena hai aur aakhri dafa paisa kab diya tha.' },
            { icon: '📖', head: 'Baqi bana kaise', body: 'Khulasa me poora tootna hai — purana hisab, udhaar par liya maal, adaigi, wapas kiya maal aur haath se ki gayi durusti. In sab ka jamaa hi wo number hai jo upar likha hai.' },
            { icon: '📈', head: 'Rate ka safar', body: '"Kya Aata Hai" me har cheez ka rate ka safar hai. Agar koi cheez 15% se zyada mehngi ho chuki hai to safha khud warning deta hai — aksar ye chupke chupke hota hai aur munafa kha jata hai.' },
            { icon: '🧾', head: 'Bill', body: 'Har bill ka kul, diya hua aur bacha hua alag nazar aata hai. CSV aur print dono mojood hain.' },
            { icon: '⏰', head: 'Aakhri maal', body: 'Agar bohat arse se maal nahi aaya to shayad rate ya quality ka masla hai — ya supplier ne dukaan badal li. Rabta kar lein.' },
            { icon: '🚫', head: 'Band karna', body: 'Jis se ab kaam nahi karna use "band" kar dein — purana record mehfooz rahega, naye bill me nazar nahi aayega.' },
          ]}
          tips={[
            'K dabayein — khata foran khul jata hai.',
            'E se badlein, B se wapas list par.',
            'Bank ki tafseel par click karne se copy ho jati hai.',
            'Print A4 par poora record nikalta hai — supplier ko dikhane ke liye.',
          ]} />
      )}

      {showKeys && (
        <Shortcuts onClose={() => setShowKeys(false)} list={[
          ['K', 'Khata kholein'],
          ['E', 'Badlein'],
          ['B', 'Wapas list par'],
          ['A', 'Analytics'],
          ['P', 'Print'],
          ['T', 'Sikhein'],
          ['?', 'Ye list'],
          ['Esc', 'Band karein'],
        ]} />
      )}
    </div>
  );
}

/* ─────── purzay ─────── */
function PurchaseRow({ p, money, expandable }: { p: any; money: (n: number) => string; expandable?: boolean }) {
  const [open, setOpen] = useState(false);
  const d = Number(p.total ?? 0) - Number(p.paidAmount ?? 0);
  const meta = payMeta(p.paymentMethod);

  return (
    <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden">
      <button onClick={() => expandable && setOpen((o) => !o)}
        className={`w-full p-3 flex items-center gap-3 text-left ${expandable ? 'hover:bg-slate-50 dark:hover:bg-slate-800/60' : ''} transition`}>
        <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
          <Package className="h-4 w-4 text-slate-500" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-extrabold text-sm text-slate-900 dark:text-white font-mono truncate">{p.purchaseNumber}</div>
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
            <span>{fmtDate(p.purchasedAt)}</span>
            <span className="px-1.5 rounded" style={{ background: `${meta.hex}22`, color: meta.hex }}>{meta.label}</span>
            {p.items?.length > 0 && <span>{p.items.length} cheezein</span>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{money(Number(p.total ?? 0))}</div>
          {d > 0
            ? <div className="text-[10px] font-extrabold text-rose-600 tabular-nums">{money(d)} udhaar</div>
            : <div className="text-[10px] font-extrabold text-emerald-600">Poora diya</div>}
        </div>
        {expandable && <ChevronRight className={`h-4 w-4 text-slate-400 shrink-0 transition ${open ? 'rotate-90' : ''}`} />}
      </button>

      {open && p.items?.length > 0 && (
        <div className="border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3 space-y-1.5">
          {p.items.map((it: any) => (
            <div key={it.id} className="flex items-center gap-2 text-[11px] font-bold">
              <span className="flex-1 min-w-0 truncate text-slate-700 dark:text-slate-200">{it.product?.name ?? '—'}</span>
              <span className="text-slate-500 tabular-nums shrink-0">
                {it.quantity} {it.product?.unit ?? ''} × {money(Number(it.costPrice ?? 0))}
              </span>
              <span className="text-slate-900 dark:text-white tabular-nums shrink-0 w-20 text-right">
                {money(Number(it.total ?? 0))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Info({ label, value, icon: Icon, mono, copy }: {
  label: string; value?: string | null; icon: any; mono?: boolean; copy?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2.5">
      <Icon className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">{label}</div>
        <div className={`text-sm font-extrabold text-slate-900 dark:text-white break-words ${mono ? 'font-mono' : ''}`}>
          {value}
        </div>
      </div>
      {copy && (
        <button onClick={() => { navigator.clipboard.writeText(value); toast.success('Copy ho gaya'); }}
          className="h-7 w-7 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center shrink-0 transition">
          <Copy className="h-3.5 w-3.5 text-slate-500" />
        </button>
      )}
    </div>
  );
}
