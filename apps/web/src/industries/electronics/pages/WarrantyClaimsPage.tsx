// apps/web/src/industries/electronics/pages/WarrantyClaimsPage.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield, ShieldCheck, ShieldAlert, ShieldOff, Search, X, Clock,
  CheckCircle2, XCircle, RefreshCw, AlertTriangle, Calendar, Wrench,
  Eye, Trash2, Sparkles, Image as ImageIcon, GraduationCap, Keyboard,
  FileSpreadsheet, Printer, Building2, Wallet, MessageCircle, Loader2,
  Hash, User, Package, ArrowRight, Send, Barcode, HandCoins,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';
import { useAuthStore } from '@core/stores/auth.store';
import { PrintStyles } from '@core/components/print/PrintStyles';
import { warrantyClaimsApi, type WarrantyClaim } from '../api/warranty-claims.api';

/* ═════════════════════════════════════════════════════════════
   NAFAA ELECTRONICS — WARRANTY CLAIMS
   ─────────────────────────────────────────────────────────────
   🛡️ Customer kharab cheez le kar aaye to poora safar yahin:
      aaya → dekha (diagnosis) → company ko bheja → hal ho gaya
   💸 Kis ne kitna paisa dala — customer, company ya dukan
   📲 Customer ko WhatsApp par status batayein
   ═════════════════════════════════════════════════════════════ */

type Tab = 'pending' | 'all' | 'brand' | 'done';

const STATUS_META: Record<string, {
  label: string; urdu: string; chip: string; icon: any; grad: string;
}> = {
  ACTIVE:      { label: 'Naya',       urdu: 'Abhi aaya hai',        chip: 'bg-blue-100 text-blue-700',     icon: Clock,        grad: 'from-blue-500 to-indigo-600' },
  CLAIMED:     { label: 'Claim Hua',  urdu: 'Claim darj ho gaya',   chip: 'bg-amber-100 text-amber-700',   icon: AlertTriangle,grad: 'from-amber-500 to-orange-600' },
  IN_REPAIR:   { label: 'Repair Me',  urdu: 'Theek ho raha hai',    chip: 'bg-violet-100 text-violet-700', icon: Wrench,       grad: 'from-violet-500 to-purple-600' },
  EXPIRED:     { label: 'Khatam',     urdu: 'Warranty khatam thi',  chip: 'bg-slate-200 text-slate-700',   icon: XCircle,      grad: 'from-slate-400 to-slate-600' },
  VOID:        { label: 'Radd',       urdu: 'Warranty toot gayi',   chip: 'bg-rose-100 text-rose-700',     icon: ShieldOff,    grad: 'from-rose-500 to-red-600' },
  NO_WARRANTY: { label: 'Warranty Nahi', urdu: 'Is par warranty thi hi nahi', chip: 'bg-slate-200 text-slate-600', icon: ShieldOff, grad: 'from-slate-400 to-slate-600' },
};

const RESOLUTION_TYPES = [
  'Repair kar diya', 'Naya unit diya', 'Paisa wapas', 'Company ne badla',
  'Customer ne wapas le liya', 'Claim radd',
];

export default function WarrantyClaimsPage() {
  const qc = useQueryClient();
  const tenantName = useAuthStore((s: any) => s.tenant?.name);

  const [tab, setTab] = useState<Tab>('pending');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<WarrantyClaim | null>(null);
  const [showTeacher, setShowTeacher] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: claims = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['warranty-claims-list'],
    queryFn: () => warrantyClaimsApi.list({}),
  });

  const { data: summary } = useQuery({
    queryKey: ['warranty-claims-summary'],
    queryFn: () => warrantyClaimsApi.summary(),
  });

  const remove = useMutation({
    mutationFn: (id: string) => warrantyClaimsApi.remove(id),
    onSuccess: () => {
      toast.success('Claim delete ho gaya');
      qc.invalidateQueries({ queryKey: ['warranty-claims-list'] });
      qc.invalidateQueries({ queryKey: ['warranty-claims-summary'] });
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
        if (selected) return setSelected(null);
        return;
      }
      if (typing || e.ctrlKey || e.metaKey) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'g') setShowTeacher(true);
      if (e.key === 'r') refetch();
      if (e.key === 'p') window.print();
      if (e.key === '?') setShowShortcuts((v) => !v);
      if (['1', '2', '3', '4'].includes(e.key)) {
        const t: Tab[] = ['pending', 'all', 'brand', 'done'];
        setTab(t[Number(e.key) - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTeacher, showShortcuts, selected]);

  const anyModal = showTeacher || showShortcuts || !!selected;
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = anyModal ? 'hidden' : prev;
    return () => { document.body.style.overflow = prev; };
  }, [anyModal]);

  const isOpen = (c: WarrantyClaim) =>
    !c.resolvedAt && ['ACTIVE', 'CLAIMED', 'IN_REPAIR'].includes(c.status);

  const counts = useMemo(() => ({
    pending: claims.filter(isOpen).length,
    all: claims.length,
    brand: claims.filter((c) => c.sentToBrand && !c.resolvedAt).length,
    done: claims.filter((c) => !!c.resolvedAt).length,
  }), [claims]);

  const list = useMemo(() => {
    let l = claims;
    if (tab === 'pending') l = l.filter(isOpen);
    if (tab === 'brand') l = l.filter((c) => c.sentToBrand && !c.resolvedAt);
    if (tab === 'done') l = l.filter((c) => !!c.resolvedAt);
    const q = search.toLowerCase().trim();
    if (q) {
      l = l.filter((c) =>
        c.claimNumber.toLowerCase().includes(q) ||
        c.customerName.toLowerCase().includes(q) ||
        (c.customerPhone ?? '').includes(q) ||
        c.productName.toLowerCase().includes(q) ||
        (c.serialNumber ?? '').toLowerCase().includes(q) ||
        (c.imei ?? '').includes(q),
      );
    }
    return [...l].sort((a, b) => +new Date(b.claimDate) - +new Date(a.claimDate));
  }, [claims, tab, search]);

  const exportCsv = () => {
    const out: string[][] = [
      [`${tenantName ?? 'Nafaa'} — Warranty Claims`],
      [new Date().toLocaleString('en-PK')],
      [],
      ['KHULASA'],
      ['Kul claims', String(summary?.total ?? 0)],
      ['Khule hue', String(summary?.pending ?? 0)],
      ['Hal ho gaye', String(summary?.resolved ?? 0)],
      ['Company ko bheje', String(summary?.sentToBrand ?? 0)],
      ['Is mahine', String(summary?.thisMonth ?? 0)],
      ['Repair kharcha', String(Math.round(summary?.cost.repairCost ?? 0))],
      ['Paisa wapas kiya', String(Math.round(summary?.cost.refundAmount ?? 0))],
      ['Customer ne dala', String(Math.round(summary?.cost.paidByCustomer ?? 0))],
      ['Company ne dala', String(Math.round(summary?.cost.paidByBrand ?? 0))],
      ['Dukan ki jeb se', String(Math.round(summary?.cost.shopBore ?? 0))],
      [],
      ['Claim #', 'Tareekh', 'Customer', 'Phone', 'Product', 'Serial', 'IMEI',
        'Masla', 'Status', 'Company ko bheja', 'Repair cost', 'Refund', 'Hal hua'],
      ...list.map((c) => [
        c.claimNumber,
        new Date(c.claimDate).toLocaleDateString('en-PK'),
        c.customerName, c.customerPhone ?? '',
        c.productName, c.serialNumber ?? '', c.imei ?? '',
        c.issueDescription,
        STATUS_META[c.status]?.label ?? c.status,
        c.sentToBrand ? 'HAAN' : '',
        String(Math.round(c.repairCost ?? 0)),
        String(Math.round(c.refundAmount ?? 0)),
        c.resolvedAt ? new Date(c.resolvedAt).toLocaleDateString('en-PK') : '',
      ]),
    ];
    const csv = out.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `warranty-claims-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV download ho gaya');
  };

  return (
    <div className="space-y-5 pb-10 print:space-y-3">
      <PrintStyles orientation="landscape" title="Warranty Claims" subtitle="Customer ke masail ka record" />
      {showTeacher && <ClaimsTeacher onClose={() => setShowTeacher(false)} />}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      {selected && (
        <ClaimDetailModal
          claim={selected}
          onClose={() => setSelected(null)}
          onUpdate={() => {
            qc.invalidateQueries({ queryKey: ['warranty-claims-list'] });
            qc.invalidateQueries({ queryKey: ['warranty-claims-summary'] });
          }}
        />
      )}

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-rose-900 to-red-700 text-white p-6 shadow-2xl print:hidden">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-rose-400/25 blur-3xl animate-pulse" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
                <Shield className="h-3.5 w-3.5 text-amber-300" /> Warranty Claims
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🛡️ Kharab Cheez Wapas Aayi</h1>
              <p className="mt-2 text-sm text-white/85 font-semibold">
                Aaya → dekha → company ko bheja → hal ho gaya. Poora safar yahin nazar aata hai.
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap print:hidden">
              <button onClick={() => setShowTeacher(true)}
                className="h-11 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg transition" title="Guide (G)">
                <GraduationCap className="h-4 w-4" /> Guide
              </button>
              <button onClick={() => setShowShortcuts(true)}
                className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 inline-flex items-center justify-center backdrop-blur transition" title="Shortcuts (?)">
                <Keyboard className="h-4 w-4" />
              </button>
              <button onClick={() => refetch()} disabled={isRefetching}
                className="h-11 w-11 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center transition disabled:opacity-50" title="Refresh (R)">
                <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={exportCsv}
                className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur transition">
                <FileSpreadsheet className="h-4 w-4" /> CSV
              </button>
              <button onClick={() => window.print()}
                className="h-11 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 backdrop-blur transition">
                <Printer className="h-4 w-4" /> Print
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <HeroStat label="Khule Hue" value={String(summary?.pending ?? counts.pending)} icon={Clock}
              highlight={(summary?.pending ?? counts.pending) > 0}
              sub={(summary?.pending ?? counts.pending) > 0 ? 'inpar kaam karna hai' : 'sab clear ✅'} />
            <HeroStat label="Company Ke Paas" value={String(summary?.sentToBrand ?? 0)} icon={Send} sub="jawab ka intezaar" />
            <HeroStat label="Hal Ho Gaye" value={String(summary?.resolved ?? 0)} icon={CheckCircle2} sub="ab tak" />
            <HeroStat label="Is Mahine" value={String(summary?.thisMonth ?? 0)} icon={Calendar} sub="naye claims" />
          </div>

          {summary && (summary.cost.repairCost > 0 || summary.cost.refundAmount > 0) && (
            <div className="mt-3 rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-3 flex items-center gap-2 flex-wrap text-[11px] font-bold">
              <Wallet className="h-3.5 w-3.5 text-amber-300" />
              <span className="text-white/70">Repair kharcha</span>
              <b>{formatPKR(summary.cost.repairCost)}</b>
              <span className="opacity-40">·</span>
              <span className="text-white/70">Customer ne dala</span>
              <b className="text-emerald-300">{formatPKR(summary.cost.paidByCustomer)}</b>
              <span className="opacity-40">·</span>
              <span className="text-white/70">Company ne dala</span>
              <b className="text-emerald-300">{formatPKR(summary.cost.paidByBrand)}</b>
              <span className="opacity-40">·</span>
              <span className="text-white/70">Dukan ki jeb se</span>
              <b className="text-rose-300">{formatPKR(summary.cost.shopBore)}</b>
            </div>
          )}
        </div>
      </section>

      {/* ═══ FILTERS ═══ */}
      <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 flex items-center justify-between gap-3 flex-wrap print:hidden">
        <div className="flex gap-1.5 flex-wrap">
          {([
            { v: 'pending', label: 'Khule Hue', icon: Clock, n: counts.pending },
            { v: 'all', label: 'Sab', icon: Shield, n: counts.all },
            { v: 'brand', label: 'Company Ke Paas', icon: Send, n: counts.brand },
            { v: 'done', label: 'Hal Ho Gaye', icon: CheckCircle2, n: counts.done },
          ] as { v: Tab; label: string; icon: any; n: number }[]).map((k, i) => (
            <button key={k.v} onClick={() => setTab(k.v)} title={`Shortcut: ${i + 1}`}
              className={`h-9 px-3 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 transition border-2 ${
                tab === k.v ? 'bg-gradient-to-r from-rose-600 to-red-700 text-white border-transparent shadow'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300'
              }`}>
              <k.icon className="h-3.5 w-3.5" /> {k.label}
              <span className={`px-1.5 rounded-full text-[10px] tabular-nums ${tab === k.v ? 'bg-black/20' : 'bg-slate-100'}`}>{k.n}</span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Claim #, customer, serial, IMEI... (/)"
            className="h-10 w-full sm:w-72 rounded-xl border-2 border-slate-200 bg-white pl-9 pr-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-rose-500 transition" />
        </div>
      </div>

      {/* ═══ LIST ═══ */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-slate-200 animate-pulse" />)}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-slate-200 p-12 text-center shadow-sm">
          <ShieldCheck className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="font-extrabold text-slate-900 text-lg">
            {search ? 'Kuch nahi mila'
              : tab === 'pending' ? 'Koi claim khula nahi 🎉'
              : tab === 'all' ? 'Abhi tak koi claim nahi aaya'
              : 'Is filter me kuch nahi'}
          </h3>
          <p className="text-sm font-semibold text-slate-500 mt-1.5 max-w-md mx-auto">
            {tab === 'pending'
              ? 'Sab claims hal ho chuke hain — dukan ka kaam saaf hai.'
              : 'Customer kharab cheez le kar aaye to yahan claim banega. Serial se uski warranty foran check ho jati hai.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((c) => (
            <ClaimCard key={c.id} claim={c}
              onView={() => setSelected(c)}
              onDelete={() => { if (confirm(`Claim ${c.claimNumber} delete karein?`)) remove.mutate(c.id); }} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   CLAIM CARD
   ═════════════════════════════════════════════════════════════ */

function ClaimCard({ claim, onView, onDelete }: {
  claim: WarrantyClaim; onView: () => void; onDelete: () => void;
}) {
  const meta = STATUS_META[claim.status] ?? STATUS_META.ACTIVE;
  const Icon = meta.icon;
  const done = !!claim.resolvedAt;
  const cost = (claim.repairCost ?? 0) + (claim.refundAmount ?? 0);
  const covered = (claim.paidByCustomer ?? 0) + (claim.paidByBrand ?? 0);
  const shopBore = Math.max(0, cost - covered);
  const ageDays = Math.floor((Date.now() - new Date(claim.claimDate).getTime()) / 86_400_000);

  return (
    <div className={`rounded-2xl bg-white border-2 shadow-sm p-4 hover:shadow-md transition ${
      done ? 'border-emerald-200' : ageDays > 14 ? 'border-amber-300' : 'border-slate-200'
    }`}>
      <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${done ? 'from-emerald-500 to-teal-600' : meta.grad} text-white flex items-center justify-center shrink-0 shadow`}>
          {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-extrabold text-slate-900 text-sm">{claim.claimNumber}</span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold inline-flex items-center gap-0.5 ${
              done ? 'bg-emerald-100 text-emerald-700' : meta.chip
            }`}>
              <Icon className="h-2.5 w-2.5" /> {done ? 'Hal Ho Gaya' : meta.label}
            </span>
            {claim.sentToBrand && !done && (
              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-extrabold inline-flex items-center gap-0.5">
                <Send className="h-2.5 w-2.5" /> Company Ke Paas
              </span>
            )}
            {!done && ageDays > 14 && (
              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-extrabold inline-flex items-center gap-0.5">
                <AlertTriangle className="h-2.5 w-2.5" /> {ageDays} din se khula
              </span>
            )}
            {claim.isChargeable && (
              <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 text-[9px] font-extrabold">
                Paisa lagega
              </span>
            )}
          </div>

          <div className="mt-1 font-extrabold text-slate-900 text-sm truncate">{claim.productName}</div>

          <div className="mt-1 flex items-center gap-2 flex-wrap text-[11px] font-bold text-slate-500">
            <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{claim.customerName}</span>
            {claim.customerPhone && <span className="inline-flex items-center gap-1">📞 {claim.customerPhone}</span>}
            {claim.serialNumber && (
              <span className="inline-flex items-center gap-1 font-mono"><Hash className="h-3 w-3" />{claim.serialNumber}</span>
            )}
            {claim.imei && <span className="font-mono">IMEI {claim.imei}</span>}
          </div>

          <div className="mt-1 text-xs font-semibold text-slate-600 italic line-clamp-1">
            “{claim.issueDescription}”
          </div>

          <div className="mt-1.5 flex items-center gap-2.5 flex-wrap text-[10px] font-bold text-slate-400">
            <span className="inline-flex items-center gap-0.5">
              <Calendar className="h-2.5 w-2.5" />
              {new Date(claim.claimDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            {(claim.imageUrls?.length ?? 0) > 0 && (
              <span className="inline-flex items-center gap-0.5">
                <ImageIcon className="h-2.5 w-2.5" /> {claim.imageUrls.length} photo
              </span>
            )}
            {done && claim.resolvedAt && (
              <span className="inline-flex items-center gap-0.5 text-emerald-600">
                <CheckCircle2 className="h-2.5 w-2.5" />
                {new Date(claim.resolvedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })} ko hal hua
              </span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          {cost > 0 && (
            <>
              <div className="text-[10px] uppercase font-extrabold text-slate-500">Kharcha</div>
              <div className="text-lg font-extrabold text-slate-900 tabular-nums leading-none">{formatPKR(cost)}</div>
              {shopBore > 0 && (
                <div className="text-[10px] font-extrabold text-rose-600 mt-0.5">
                  {formatPKR(shopBore)} dukan ki jeb se
                </div>
              )}
              {shopBore === 0 && covered > 0 && (
                <div className="text-[10px] font-extrabold text-emerald-600 mt-0.5">Poora cover ✅</div>
              )}
            </>
          )}
          <div className="mt-2 flex gap-1 justify-end print:hidden">
            <button onClick={onView}
              className="h-9 px-3 rounded-lg bg-gradient-to-r from-rose-600 to-red-700 text-white text-xs font-extrabold inline-flex items-center gap-1 shadow hover:shadow-lg transition">
              <Eye className="h-3.5 w-3.5" /> Kholein
            </button>
            <button onClick={onDelete}
              className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   CLAIM DETAIL — poora safar
   ═════════════════════════════════════════════════════════════ */

function ClaimDetailModal({ claim, onClose, onUpdate }: {
  claim: WarrantyClaim; onClose: () => void; onUpdate: () => void;
}) {
  const [status, setStatus] = useState<string>(claim.status);
  const [diagnosis, setDiagnosis] = useState(claim.diagnosis ?? '');
  const [resolution, setResolution] = useState(claim.resolution ?? '');
  const [notes, setNotes] = useState(claim.internalNotes ?? '');
  const [brandRef, setBrandRef] = useState(claim.brandRef ?? '');
  const [brandResponse, setBrandResponse] = useState(claim.brandResponse ?? '');
  const [resolutionType, setResolutionType] = useState(claim.resolutionType ?? '');
  const [repairCost, setRepairCost] = useState<number | ''>(claim.repairCost || '');
  const [paidByCustomer, setPaidByCustomer] = useState<number | ''>(claim.paidByCustomer || '');
  const [paidByBrand, setPaidByBrand] = useState<number | ''>(claim.paidByBrand || '');
  const [refundAmount, setRefundAmount] = useState<number | ''>(claim.refundAmount || '');

  const update = useMutation({
    mutationFn: () => warrantyClaimsApi.updateStatus(claim.id, {
      status: status as any, diagnosis, resolution, notes,
    }),
    onSuccess: () => { toast.success('Claim update ho gaya'); onUpdate(); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Update fail hua'),
  });

  const sendToBrand = useMutation({
    mutationFn: () => warrantyClaimsApi.contactBrand(claim.id, { brandRef, brandResponse: brandResponse || undefined }),
    onSuccess: () => { toast.success('Company ko bhej diya'); onUpdate(); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Fail hua'),
  });

  const resolve = useMutation({
    mutationFn: () => warrantyClaimsApi.resolve(claim.id, {
      resolutionType, resolution,
      repairCost: Number(repairCost || 0),
      paidByCustomer: Number(paidByCustomer || 0),
      paidByBrand: Number(paidByBrand || 0),
      refundAmount: Number(refundAmount || 0),
    }),
    onSuccess: () => { toast.success('Claim hal ho gaya ✅'); onUpdate(); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Fail hua'),
  });

  const whatsapp = () => {
    if (!claim.customerPhone) return toast.error('Customer ka phone number nahi hai');
    const p = claim.customerPhone.replace(/[^0-9]/g, '');
    const clean = p.startsWith('92') ? p : p.startsWith('0') ? '92' + p.slice(1) : '92' + p;
    const meta = STATUS_META[status] ?? STATUS_META.ACTIVE;
    const msg = [
      `Assalam-o-Alaikum ${claim.customerName}!`, '',
      `Aap ke warranty claim *${claim.claimNumber}* ki update:`,
      `📦 ${claim.productName}`,
      claim.serialNumber ? `🔖 Serial: ${claim.serialNumber}` : '',
      '',
      `Status: *${meta.label}* — ${meta.urdu}`,
      diagnosis ? `\nDekha gaya: ${diagnosis}` : '',
      resolution ? `\nNateeja: ${resolution}` : '',
      '', 'Shukriya 🙏',
    ].filter(Boolean).join('\n');
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const cost = Number(repairCost || 0) + Number(refundAmount || 0);
  const covered = Number(paidByCustomer || 0) + Number(paidByBrand || 0);
  const shopBore = Math.max(0, cost - covered);
  const done = !!claim.resolvedAt;

  /* Safar ke qadam — kahan tak pahuncha */
  const steps = [
    { label: 'Claim aaya', at: claim.claimDate, icon: Shield, done: true },
    { label: 'Dukan me mila', at: claim.receivedAt, icon: Package, done: !!claim.receivedAt },
    { label: 'Dekha gaya', at: claim.diagnosedAt, icon: Wrench, done: !!claim.diagnosedAt },
    { label: 'Company ko bheja', at: claim.brandContactedAt, icon: Send, done: !!claim.brandContactedAt },
    { label: 'Hal ho gaya', at: claim.resolvedAt, icon: CheckCircle2, done: !!claim.resolvedAt },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-3xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="shrink-0 px-5 py-4 bg-gradient-to-r from-rose-600 to-red-700 text-white flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-extrabold text-white/70 tracking-wider">Warranty Claim</div>
            <h3 className="text-xl font-extrabold font-mono truncate">{claim.claimNumber}</h3>
            <div className="text-[11px] font-bold text-white/80 truncate">{claim.productName}</div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {claim.customerPhone && (
              <button onClick={whatsapp} title="Customer ko WhatsApp par batayein"
                className="h-10 w-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center transition">
                <MessageCircle className="h-4 w-4" />
              </button>
            )}
            <button onClick={onClose} className="h-10 w-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* ── Safar ── */}
          <div className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-4">
            <div className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider mb-3">Ab Tak Ka Safar</div>
            <div className="flex items-start gap-1 overflow-x-auto pb-1">
              {steps.map((st, i) => (
                <div key={i} className="flex items-start gap-1 shrink-0">
                  <div className="flex flex-col items-center gap-1 w-20">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center shadow-sm ${
                      st.done ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white' : 'bg-white text-slate-300 border-2 border-slate-200'
                    }`}>
                      <st.icon className="h-4 w-4" />
                    </div>
                    <div className={`text-[9px] font-extrabold text-center leading-tight ${st.done ? 'text-slate-800' : 'text-slate-400'}`}>
                      {st.label}
                    </div>
                    {st.at && (
                      <div className="text-[8px] font-bold text-slate-400 tabular-nums">
                        {new Date(st.at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                      </div>
                    )}
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`h-0.5 w-4 mt-4 rounded-full ${steps[i + 1].done ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Tafseel ── */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <InfoBox label="Customer" value={claim.customerName} icon={User} />
            {claim.customerPhone && <InfoBox label="Phone" value={claim.customerPhone} />}
            {claim.customerEmail && <InfoBox label="Email" value={claim.customerEmail} />}
            {claim.serialNumber && <InfoBox label="Serial" value={claim.serialNumber} mono icon={Barcode} />}
            {claim.imei && <InfoBox label="IMEI" value={claim.imei} mono />}
            {claim.invoiceNumber && <InfoBox label="Invoice" value={claim.invoiceNumber} mono />}
            <InfoBox label="Kab khareeda" value={new Date(claim.purchaseDate).toLocaleDateString('en-PK')} icon={Calendar} />
            {claim.issueCategory && <InfoBox label="Masle ki kisam" value={claim.issueCategory} />}
          </div>

          <div>
            <Lbl>Customer Ne Kya Kaha</Lbl>
            <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-3 text-sm font-semibold text-amber-900">
              “{claim.issueDescription}”
            </div>
          </div>

          {(claim.imageUrls?.length ?? 0) > 0 && (
            <div>
              <Lbl>Photos ({claim.imageUrls.length})</Lbl>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {claim.imageUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer"
                    className="aspect-square rounded-xl overflow-hidden border-2 border-slate-200 hover:border-rose-400 transition">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* ── Status + diagnosis ── */}
          {!done && (
            <>
              <div>
                <Lbl>Abhi Kya Halat Hai</Lbl>
                <div className="grid sm:grid-cols-2 gap-2">
                  {Object.entries(STATUS_META).map(([k, v]) => (
                    <button key={k} onClick={() => setStatus(k)}
                      className={`text-left px-3 py-2.5 rounded-xl border-2 transition ${
                        status === k ? 'border-rose-500 bg-rose-50' : 'border-slate-200 bg-white hover:border-rose-300'
                      }`}>
                      <div className="flex items-center gap-1.5">
                        <v.icon className={`h-3.5 w-3.5 ${status === k ? 'text-rose-600' : 'text-slate-500'}`} />
                        <span className="font-extrabold text-sm text-slate-900">{v.label}</span>
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 mt-0.5">{v.urdu}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Lbl>Dekhne Par Kya Nikla (Diagnosis)</Lbl>
                <textarea rows={2} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="jaise: battery phool gayi hai, board par pani laga hua hai"
                  className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-rose-500 transition" />
              </div>

              <div>
                <Lbl>Andar Ka Note <span className="text-slate-400 normal-case font-bold">(customer ko nahi dikhta)</span></Lbl>
                <input value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="team ke liye"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-rose-500 transition" />
              </div>

              {/* ── Company ── */}
              <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-blue-950 text-sm">Company Ko Bhejna</h4>
                    <p className="text-[11px] font-bold text-blue-800">
                      {claim.sentToBrand ? 'Bheja ja chuka hai' : 'Company warranty de rahi ho to yahan darj karein'}
                    </p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  <input value={brandRef} onChange={(e) => setBrandRef(e.target.value)}
                    placeholder="Company ka reference / ticket #"
                    className="h-11 rounded-xl border-2 border-blue-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500 transition" />
                  <input value={brandResponse} onChange={(e) => setBrandResponse(e.target.value)}
                    placeholder="Company ka jawab (agar aaya ho)"
                    className="h-11 rounded-xl border-2 border-blue-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500 transition" />
                </div>
                <button onClick={() => sendToBrand.mutate()} disabled={!brandRef.trim() || sendToBrand.isPending}
                  className="h-10 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow disabled:opacity-50 transition">
                  {sendToBrand.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {claim.sentToBrand ? 'Company Ka Record Update Karein' : 'Company Ko Bheja Hua Mark Karein'}
                </button>
              </div>

              {/* ── Hal karna ── */}
              <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-emerald-950 text-sm">Claim Band Karein</h4>
                    <p className="text-[11px] font-bold text-emerald-800">Masla hal ho gaya to yahan se band karein</p>
                  </div>
                </div>

                <div>
                  <Lbl>Kya Kiya Gaya</Lbl>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {RESOLUTION_TYPES.map((r) => (
                      <button key={r} onClick={() => setResolutionType(r)}
                        className={`px-2.5 py-1.5 rounded-lg border-2 text-[11px] font-extrabold transition ${
                          resolutionType === r ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-emerald-200 bg-white text-slate-700 hover:border-emerald-400'
                        }`}>
                        {r}
                      </button>
                    ))}
                  </div>
                  <textarea rows={2} value={resolution} onChange={(e) => setResolution(e.target.value)}
                    placeholder="Tafseel — customer ko yehi bataya jayega"
                    className="w-full rounded-xl border-2 border-emerald-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500 transition" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Money label="Repair kharcha" value={repairCost} onChange={setRepairCost} />
                  <Money label="Paisa wapas" value={refundAmount} onChange={setRefundAmount} />
                  <Money label="Customer ne dala" value={paidByCustomer} onChange={setPaidByCustomer} tone="emerald" />
                  <Money label="Company ne dala" value={paidByBrand} onChange={setPaidByBrand} tone="emerald" />
                </div>

                {cost > 0 && (
                  <div className={`rounded-xl border-2 p-3 flex items-center justify-between ${
                    shopBore > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-emerald-200'
                  }`}>
                    <span className="text-sm font-bold text-slate-700 inline-flex items-center gap-1.5">
                      <HandCoins className="h-4 w-4" /> Dukan ki jeb se
                    </span>
                    <span className={`text-lg font-extrabold tabular-nums ${shopBore > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {shopBore > 0 ? formatPKR(shopBore) : 'Kuch nahi ✅'}
                    </span>
                  </div>
                )}

                <button onClick={() => resolve.mutate()} disabled={!resolutionType || resolve.isPending}
                  className="h-11 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-sm font-extrabold inline-flex items-center justify-center gap-1.5 shadow-lg disabled:opacity-50 transition">
                  {resolve.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Claim Hal Ho Gaya — Band Karein
                </button>
              </div>
            </>
          )}

          {done && (
            <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-300 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <div className="font-extrabold text-emerald-950">
                  Ye claim hal ho chuka hai
                  {claim.resolvedAt && (
                    <span className="font-bold text-emerald-800/80">
                      {' '}— {new Date(claim.resolvedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
              {claim.resolutionType && <InfoRow label="Kya kiya" value={claim.resolutionType} />}
              {claim.resolution && <InfoRow label="Tafseel" value={claim.resolution} />}
              {claim.diagnosis && <InfoRow label="Diagnosis" value={claim.diagnosis} />}
              {claim.replacementSerialNumber && <InfoRow label="Naya serial" value={claim.replacementSerialNumber} mono />}
              {cost > 0 && (
                <div className="mt-2 pt-2 border-t-2 border-emerald-200 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <MiniMoney label="Repair" value={claim.repairCost} />
                  <MiniMoney label="Refund" value={claim.refundAmount} />
                  <MiniMoney label="Customer" value={claim.paidByCustomer} tone="emerald" />
                  <MiniMoney label="Company" value={claim.paidByBrand} tone="emerald" />
                </div>
              )}
            </div>
          )}
        </div>

        {!done && (
          <div className="shrink-0 px-5 py-3.5 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
            <button onClick={onClose} className="h-11 px-4 rounded-xl bg-white border-2 border-slate-200 text-slate-700 text-sm font-extrabold hover:bg-slate-100 transition">
              Band Karein
            </button>
            <Button onClick={() => update.mutate()} loading={update.isPending}
              className="flex-1 bg-gradient-to-r from-rose-600 to-red-700 font-extrabold shadow-lg">
              <CheckCircle2 className="h-4 w-4" /> Status Update Karein
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════ */

function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}

function HeroStat({ label, value, sub, icon: Icon, highlight }: any) {
  return (
    <div className={`rounded-2xl backdrop-blur border p-4 ${
      highlight ? 'bg-white/25 border-white/40 shadow-lg' : 'bg-white/10 border-white/20'
    }`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase font-extrabold text-white/70 tracking-wider">
        <Icon className="h-3.5 w-3.5" /> <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-extrabold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] font-bold text-white/70 truncate">{sub}</div>}
    </div>
  );
}

function InfoBox({ label, value, mono, icon: Icon }: any) {
  return (
    <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-2.5">
      <div className="text-[9px] uppercase font-extrabold text-slate-500 tracking-wider inline-flex items-center gap-1">
        {Icon && <Icon className="h-2.5 w-2.5" />} {label}
      </div>
      <div className={`text-sm font-extrabold text-slate-900 mt-0.5 truncate ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}

function InfoRow({ label, value, mono }: any) {
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className="text-[11px] font-extrabold text-emerald-700 uppercase shrink-0">{label}</span>
      <span className={`font-bold text-emerald-950 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function Money({ label, value, onChange, tone }: any) {
  return (
    <div>
      <label className={`block text-[10px] font-extrabold uppercase mb-1 ${tone === 'emerald' ? 'text-emerald-700' : 'text-slate-600'}`}>
        {label}
      </label>
      <input type="number" min={0} value={value}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        placeholder="0"
        className={`h-10 w-full rounded-lg border-2 px-2 text-sm font-extrabold tabular-nums focus:outline-none transition ${
          tone === 'emerald' ? 'border-emerald-200 focus:border-emerald-500' : 'border-slate-200 focus:border-rose-500'
        }`} />
    </div>
  );
}

function MiniMoney({ label, value, tone }: any) {
  return (
    <div className="rounded-lg bg-white border border-emerald-200 p-2">
      <div className="text-[9px] uppercase font-extrabold text-slate-500">{label}</div>
      <div className={`text-sm font-extrabold tabular-nums ${tone === 'emerald' ? 'text-emerald-700' : 'text-slate-900'}`}>
        {formatPKR(value ?? 0)}
      </div>
    </div>
  );
}

function ClaimsTeacher({ onClose }: { onClose: () => void }) {
  const steps = [
    {
      icon: Shield, title: 'Claim ka poora safar',
      body: 'Customer kharab cheez laaye to claim banta hai. Upar patti dikhati hai wo kis marhale par hai: aaya → dukan me mila → dekha gaya → company ko bheja → hal ho gaya.',
      tips: ['14 din se khula claim ho to peela alert aata hai', '1–4 dabakar tab badlein'],
    },
    {
      icon: Building2, title: 'Company ko bhejna',
      body: 'Zyada tar electronics ki warranty company deti hai, dukan nahi. Company ka ticket number darj karein — phir "Company Ke Paas" tab me sab claims alag nazar aate hain jin ka jawab aana baqi hai.',
      tips: ['Company ka jawab bhi wahin likh dein'],
    },
    {
      icon: HandCoins, title: 'Paisa kis ne dala',
      body: 'Repair kharcha aur refund alag likhein, phir ye ke customer ne kitna dala aur company ne kitna. Jo bacha wo "dukan ki jeb se" gaya — ye number mahine ke akhir me sab se ahem hota hai.',
      tips: ['Upar hero me kul hisab nazar aata hai', 'CSV me poora record Excel ke liye'],
    },
    {
      icon: MessageCircle, title: 'Customer ko batana',
      body: 'Claim khol kar WhatsApp button dabayein — customer ko uska claim number, product, serial aur mojooda status ka message chala jata hai. Bar bar phone karne ki zaroorat nahi rehti.',
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
              <h3 className="font-extrabold text-slate-900">Warranty Claims Kaise Chalayein?</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {steps.map((st, i) => (
            <div key={i} className="rounded-xl border-2 border-slate-200 bg-slate-50 p-3.5 flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-rose-600 to-red-700 text-white flex items-center justify-center shrink-0 shadow-md">
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
  const sc = [
    ['1 – 4', 'Tab badlein'], ['/', 'Search par jao'], ['G', 'Guide kholo'],
    ['R', 'Refresh'], ['P', 'Print'], ['?', 'Ye list'], ['Esc', 'Band karo'],
  ];
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-200">
        <div className="px-5 py-4 border-b-2 border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
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
