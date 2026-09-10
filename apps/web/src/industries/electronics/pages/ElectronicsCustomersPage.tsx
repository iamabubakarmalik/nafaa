// apps/web/src/industries/electronics/pages/ElectronicsCustomersPage.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, Barcode, ShieldCheck, ShieldAlert, Crown,
  HandCoins, GraduationCap, Keyboard, X, CheckCircle2, Sparkles,
  FileSpreadsheet, Printer, TrendingUp, Cpu,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { PrintStyles } from '@core/components/print/PrintStyles';
import { useAuthStore } from '@core/stores/auth.store';
import { customersApi, type CustomersListParams } from '@modules/customers/customers/api/customers.api';
import { CustomersHero, CustomerStatCard, CustomerCard } from '@modules/customers/customers/components/shared/CustomerShared';
import { serialTrackingApi } from '../api/serial-tracking.api';

/* ═════════════════════════════════════════════════════════════
   NAFAA ELECTRONICS — CUSTOMERS
   ─────────────────────────────────────────────────────────────
   🔖 Har customer ke paas kaunse serial units gaye
   🛡️ Kitni warranty abhi chal rahi hai — claim ke waqt kaam aata
   💰 Udhaar wale alag
   ═════════════════════════════════════════════════════════════ */

type Filter = 'all' | 'serial' | 'warranty' | 'udhaar' | 'vip';

export default function ElectronicsCustomersPage() {
  const qc = useQueryClient();
  const tenantName = useAuthStore((s: any) => s.tenant?.name);

  const [params, setParams] = useState<CustomersListParams>({
    search: '', page: 1, limit: 48, sortBy: 'totalSpent', sortOrder: 'desc',
  });
  const [filter, setFilter] = useState<Filter>('all');
  const [showTeacher, setShowTeacher] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => customersApi.list(params),
  });

  const { data: stats } = useQuery({
    queryKey: ['customers-stats'],
    queryFn: customersApi.stats,
  });

  /* Bike hue serial units — kis customer ke paas kya gaya */
  const { data: soldSerials = [] } = useQuery({
    queryKey: ['electronics-sold-serials'],
    queryFn: () => serialTrackingApi.list({ status: 'SOLD' }),
  });

  const removeMutation = useMutation({
    mutationFn: customersApi.remove,
    onSuccess: () => {
      toast.success('Customer delete ho gaya');
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customers-stats'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete fail hua'),
  });

  /* ─── Shortcuts ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'Escape') {
        if (showShortcuts) return setShowShortcuts(false);
        if (showTeacher) return setShowTeacher(false);
        return;
      }
      if (typing || e.ctrlKey || e.metaKey) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'g') setShowTeacher(true);
      if (e.key === 'p') window.print();
      if (e.key === '?') setShowShortcuts((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTeacher, showShortcuts]);

  const anyModal = showTeacher || showShortcuts;
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = anyModal ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [anyModal]);

  /* Har customer ke serial units + chalti warranty */
  const enriched = useMemo(() => {
    const items = data?.items ?? [];
    const now = Date.now();
    return items.map((c: any) => {
      const mine = (soldSerials as any[]).filter((s) => s.soldToCustomerId === c.id);
      const activeWarranty = mine.filter(
        (s) => s.warrantyEndDate && new Date(s.warrantyEndDate).getTime() > now,
      ).length;
      const expiringSoon = mine.filter((s) => {
        if (!s.warrantyEndDate) return false;
        const d = (new Date(s.warrantyEndDate).getTime() - now) / 86_400_000;
        return d > 0 && d <= 30;
      }).length;
      return { ...c, serialCount: mine.length, activeWarranty, expiringSoon };
    });
  }, [data, soldSerials]);

  const counts = useMemo(() => ({
    all: enriched.length,
    serial: enriched.filter((c: any) => c.serialCount > 0).length,
    warranty: enriched.filter((c: any) => c.activeWarranty > 0).length,
    udhaar: enriched.filter((c: any) => c.balance > 0).length,
    vip: enriched.filter((c: any) => c.isVip).length,
  }), [enriched]);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'serial': return enriched.filter((c: any) => c.serialCount > 0);
      case 'warranty': return enriched.filter((c: any) => c.activeWarranty > 0);
      case 'udhaar': return enriched.filter((c: any) => c.balance > 0);
      case 'vip': return enriched.filter((c: any) => c.isVip);
      default: return enriched;
    }
  }, [enriched, filter]);

  const exportCsv = () => {
    const out: string[][] = [
      [`${tenantName ?? 'Nafaa'} — Electronics Customers`],
      [new Date().toLocaleString('en-PK')],
      [],
      ['Naam', 'Phone', 'Kul kharch', 'Baqi udhaar', 'Serial units', 'Chalti warranty', '30 din me khatam', 'VIP'],
      ...filtered.map((c: any) => [
        c.name, c.phone ?? '',
        String(Math.round(c.totalSpent ?? 0)),
        String(Math.round(c.balance ?? 0)),
        String(c.serialCount),
        String(c.activeWarranty),
        String(c.expiringSoon),
        c.isVip ? 'HAAN' : '',
      ]),
    ];
    const csv = out.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `electronics-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV download ho gaya');
  };

  return (
    <div className="space-y-6 pb-10 print:space-y-3">
      <PrintStyles orientation="landscape" title="Electronics Customers" subtitle="Serial units aur warranty ke sath" />
      {showTeacher && <CustomersTeacher onClose={() => setShowTeacher(false)} />}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

      <div className="print:hidden">
        <CustomersHero
          gradient="from-slate-950 via-blue-900 to-cyan-700"
          emoji="🔌"
          industryLabel="Electronics"
          industryBadgeColor="bg-cyan-500/30 border border-cyan-300/40"
          title="Electronics Customers"
          subtitle="Kis ke paas kaunsa serial gaya aur warranty kab tak chalegi"
          actionButton={
            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => setShowTeacher(true)} title="Guide (G)"
                className="h-10 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition">
                <GraduationCap className="h-4 w-4" /> Guide
              </button>
              <button onClick={() => setShowShortcuts(true)} title="Shortcuts (?)"
                className="h-10 w-10 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 inline-flex items-center justify-center backdrop-blur transition">
                <Keyboard className="h-4 w-4" />
              </button>
              <button onClick={exportCsv}
                className="h-10 w-10 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 inline-flex items-center justify-center backdrop-blur transition" title="CSV">
                <FileSpreadsheet className="h-4 w-4" />
              </button>
              <button onClick={() => window.print()}
                className="h-10 w-10 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 inline-flex items-center justify-center backdrop-blur transition" title="Print (P)">
                <Printer className="h-4 w-4" />
              </button>
              <Link to="/customers/new">
                <Button className="bg-white text-slate-900 hover:bg-slate-100 font-extrabold">
                  <Plus className="h-4 w-4" /> Naya Customer
                </Button>
              </Link>
            </div>
          }
        />
      </div>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CustomerStatCard label="Kul Customers" value={stats?.total ?? 0}
          sub={stats && stats.newThisMonth > 0 ? `+${stats.newThisMonth} is mahine` : 'ab tak'}
          icon={Users} color="from-blue-500 to-indigo-600" />
        <CustomerStatCard label="Serial Unit Wale" value={counts.serial}
          sub="mehngi cheez le gaye" icon={Barcode} color="from-violet-500 to-purple-600" isHighlight />
        <CustomerStatCard label="Chalti Warranty" value={counts.warranty}
          sub="claim kar sakte hain" icon={ShieldCheck} color="from-emerald-500 to-teal-600" />
        <CustomerStatCard label="Udhaar Wale" value={counts.udhaar}
          sub={formatPKR(stats?.totalDebt ?? 0)} icon={HandCoins} color="from-amber-500 to-orange-600" />
      </section>

      <div className="relative print:hidden">
        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input ref={searchRef}
          className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-3 text-sm font-bold focus:outline-none focus:border-blue-500 transition"
          placeholder="Naam, phone, CNIC se dhoondein... (/)"
          value={params.search ?? ''}
          onChange={(e) => setParams({ ...params, search: e.target.value, page: 1 })} />
      </div>

      <div className="flex gap-1.5 flex-wrap print:hidden">
        {([
          { v: 'all', label: 'Sab', icon: Users, n: counts.all },
          { v: 'serial', label: 'Serial Unit Wale', icon: Barcode, n: counts.serial },
          { v: 'warranty', label: 'Chalti Warranty', icon: ShieldCheck, n: counts.warranty },
          { v: 'udhaar', label: 'Udhaar', icon: HandCoins, n: counts.udhaar },
          { v: 'vip', label: 'VIP', icon: Crown, n: counts.vip },
        ] as { v: Filter; label: string; icon: any; n: number }[]).map((o) => (
          <button key={o.v} onClick={() => setFilter(o.v)}
            className={`h-9 px-3 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 transition border-2 ${
              filter === o.v ? 'bg-gradient-to-r from-blue-600 to-cyan-700 text-white border-transparent shadow'
                : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
            }`}>
            <o.icon className="h-3.5 w-3.5" /> {o.label}
            <span className={`px-1.5 rounded-full text-[10px] tabular-nums ${filter === o.v ? 'bg-black/20' : 'bg-slate-100'}`}>{o.n}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <Cpu className="h-14 w-14 text-blue-300 mx-auto mb-3" />
          <h3 className="text-lg font-extrabold text-slate-900">
            {params.search || filter !== 'all' ? 'Kuch nahi mila' : 'Abhi koi customer nahi'}
          </h3>
          <p className="text-sm font-semibold text-slate-500 mt-1.5">
            {params.search || filter !== 'all'
              ? 'Filter hata kar dobara dekhein'
              : 'POS par sale ke waqt customer add karein — phir sab yahan aa jayega'}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((c: any) => (
            <CustomerCard
              key={c.id}
              customer={c}
              themeColor="blue"
              onDelete={(id) => {
                if (confirm(`"${c.name}" delete karein?`)) removeMutation.mutate(id);
              }}
              extraBadges={
                <>
                  {c.serialCount > 0 && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[11px] font-bold">
                      <Barcode className="h-3 w-3" /> {c.serialCount} serial unit
                    </div>
                  )}
                  {c.activeWarranty > 0 && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">
                      <ShieldCheck className="h-3 w-3" /> {c.activeWarranty} warranty chal rahi
                    </div>
                  )}
                  {c.expiringSoon > 0 && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold">
                      <ShieldAlert className="h-3 w-3" /> {c.expiringSoon} 30 din me khatam
                    </div>
                  )}
                </>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   GUIDE + SHORTCUTS
   ═════════════════════════════════════════════════════════════ */

function CustomersTeacher({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      icon: Barcode, title: 'Serial unit wale customers',
      body: 'Jin customers ne laptop, camera, drone jaisi serial wali cheez li hai unke card par badge aata hai. Un ka poora record hai — kaunsa exact unit gaya aur kab.',
      tips: ['Customer ka naam click karke poori history khulti hai'],
    },
    {
      icon: ShieldCheck, title: 'Chalti warranty',
      body: 'Customer claim le kar aaye to yahin se pata chal jata hai ke uski warranty abhi chal rahi hai ya nahi. Hara badge = chal rahi, peela = 30 din me khatam.',
      tips: ['Peele badge wale customers ko pehle service dein'],
    },
    {
      icon: HandCoins, title: 'Udhaar wale',
      body: 'Jin par paisa baqi hai wo alag tab me. Naya udhaar dene se pehle yahan dekh lein.',
      tips: ['Khata page se wasooli darj hoti hai'],
    },
    {
      icon: TrendingUp, title: 'Download aur print',
      body: 'CSV me har customer ke sath uske serial units aur warranty ki ginti bhi aati hai. Print se saaf list nikal aati hai.',
      tips: ['P dabao to print', 'G se ye guide'],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b-2 border-amber-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-amber-700 font-extrabold">Guide</div>
              <h3 className="font-extrabold text-slate-900">Customers Page</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {steps.map((st, i) => (
            <div key={i} className="rounded-xl border-2 border-slate-200 bg-slate-50 p-3.5 flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-700 text-white flex items-center justify-center shrink-0 shadow-md">
                <st.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-slate-900">{st.title}</div>
                <div className="text-xs font-semibold text-slate-600 mt-1 leading-relaxed">{st.body}</div>
                <ul className="mt-2 space-y-1">
                  {st.tips.map((tp, j) => (
                    <li key={j} className="text-[11px] font-semibold text-slate-500 flex items-start gap-1.5">
                      <Sparkles className="h-2.5 w-2.5 text-amber-500 shrink-0 mt-0.5" /> {tp}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3.5 border-t-2 border-slate-100 bg-slate-50 text-right shrink-0">
          <Button onClick={onClose} className="bg-gradient-to-r from-amber-500 to-orange-600 font-extrabold shadow-lg">
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya
          </Button>
        </div>
      </div>
    </div>
  );
}

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const sc = [['/', 'Search par jao'], ['G', 'Guide kholo'], ['P', 'Print'], ['?', 'Ye list'], ['Esc', 'Band karo']];
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-200">
        <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Keyboard className="h-4 w-4" />
            </div>
            <h3 className="font-extrabold text-slate-900">Keyboard Shortcuts</h3>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>
        <div className="p-5 space-y-2">
          {sc.map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700">{desc}</span>
              <kbd className="px-2.5 py-1 rounded-lg bg-slate-100 border-2 border-slate-200 font-mono text-xs font-extrabold text-slate-700">{key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
