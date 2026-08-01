import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldAlert, ShieldCheck, RefreshCw, Search, X, AlertTriangle,
  Package, ArrowRight, Award, Edit3, Download, Baby,
} from 'lucide-react';
import { toast } from 'sonner';
import { toyProductsApi } from '../api/products.api';
import { formatPKR } from '@core/lib/format';

const RISK_LABELS: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  CHOKING_HAZARD: { label: 'Choking Hazard', color: 'text-rose-800', bg: 'bg-rose-100 border-rose-300', emoji: '⚠️' },
  SMALL_PARTS: { label: 'Small Parts', color: 'text-amber-800', bg: 'bg-amber-100 border-amber-300', emoji: '🔍' },
  NOT_CERTIFIED_NON_TOXIC: { label: 'Not Certified Non-Toxic', color: 'text-orange-800', bg: 'bg-orange-100 border-orange-300', emoji: '🧪' },
  NO_SAFETY_CERTIFICATION: { label: 'No Safety Certification', color: 'text-red-800', bg: 'bg-red-100 border-red-300', emoji: '📄' },
};

export default function ToySafetyReviewPage() {
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');

  const { data: risky = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['toy-safety-review'],
    queryFn: () => toyProductsApi.safetyReview(),
  });

  const filtered = useMemo(() => {
    let list = risky;
    const q = search.toLowerCase().trim();
    if (q) list = list.filter((r: any) =>
      (r.product?.name || '').toLowerCase().includes(q) ||
      (r.brand || '').toLowerCase().includes(q)
    );
    if (riskFilter !== 'all') list = list.filter((r: any) => r.riskFlags?.includes(riskFilter));
    return list;
  }, [risky, search, riskFilter]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = {
      CHOKING_HAZARD: 0, SMALL_PARTS: 0, NOT_CERTIFIED_NON_TOXIC: 0, NO_SAFETY_CERTIFICATION: 0,
    };
    risky.forEach((r: any) => {
      (r.riskFlags || []).forEach((flag: string) => {
        if (counts[flag] !== undefined) counts[flag]++;
      });
    });
    return { total: risky.length, ...counts };
  }, [risky]);

  const exportCSV = () => {
    if (!filtered.length) return toast.error('Nothing to export');
    const head = ['Product', 'Brand', 'Age Group', 'Category', 'Risk Flags', 'Retail Price', 'Stock'];
    const rows = filtered.map((r: any) => [
      r.product?.name || '',
      r.brand || '',
      r.ageGroup || '',
      r.categoryType || '',
      (r.riskFlags || []).join('; '),
      r.retailPrice || 0,
      r.product?.stock || 0,
    ]);
    const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `safety-review-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Exported');
  };

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-rose-900 to-red-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-rose-400/20 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-300" /> Compliance Review
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🛡️ Safety Review</h1>
            <p className="mt-2 text-sm text-white/80">
              {stats.total} toys need safety attention • Fix these to avoid liability
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => refetch()} disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <button onClick={exportCSV}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold border border-white/20">
              <Download className="h-4 w-4" /> Export
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <RiskStat label="Choking Hazard" value={(stats as any).CHOKING_HAZARD || 0} icon="⚠️" tone="rose" onClick={() => setRiskFilter('CHOKING_HAZARD')} />
        <RiskStat label="Small Parts" value={(stats as any).SMALL_PARTS || 0} icon="🔍" tone="amber" onClick={() => setRiskFilter('SMALL_PARTS')} />
        <RiskStat label="Not Non-Toxic" value={(stats as any).NOT_CERTIFIED_NON_TOXIC || 0} icon="🧪" tone="orange" onClick={() => setRiskFilter('NOT_CERTIFIED_NON_TOXIC')} />
        <RiskStat label="No Certification" value={(stats as any).NO_SAFETY_CERTIFICATION || 0} icon="📄" tone="red" onClick={() => setRiskFilter('NO_SAFETY_CERTIFICATION')} />
      </section>

      <section className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm p-4 space-y-3">
        <div className="relative">
          <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product or brand..."
            className="h-12 w-full rounded-2xl border-2 border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
          <button onClick={() => setRiskFilter('all')}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
              riskFilter === 'all' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600'}`}>
            All Risks ({stats.total})
          </button>
          {Object.entries(RISK_LABELS).map(([key, meta]) => (
            <button key={key} onClick={() => setRiskFilter(key)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold transition inline-flex items-center gap-1 ${
                riskFilter === key ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600'}`}>
              {meta.emoji} {meta.label}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 p-16 text-center">
          <ShieldCheck className="h-16 w-16 text-emerald-600 mx-auto mb-3" />
          <h3 className="text-xl font-extrabold text-emerald-900">All clear! ✨</h3>
          <p className="text-sm text-emerald-800 font-semibold mt-1">
            {stats.total === 0 ? 'No safety issues found — all your toys are compliant' : 'No matches for current filter'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item: any) => (
            <RiskCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* HELPFUL GUIDE */}
      <section className="rounded-3xl bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 p-5">
        <h3 className="font-extrabold text-blue-900 mb-3 flex items-center gap-2">
          <Award className="h-5 w-5" /> Fixing Safety Issues
        </h3>
        <ul className="space-y-2 text-sm text-slate-700 font-semibold">
          <li className="flex items-start gap-2">
            <span className="text-rose-600 font-extrabold">⚠️</span>
            <div>
              <strong>Choking Hazard:</strong> Only sell to children 3+ years. Add warning labels and update age group in product wizard.
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-600 font-extrabold">🔍</span>
            <div>
              <strong>Small Parts:</strong> Add "Small Parts Warning" flag and require adult supervision note.
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-600 font-extrabold">🧪</span>
            <div>
              <strong>Not Certified Non-Toxic:</strong> Contact supplier for certification. Toggle "Non-toxic" flag when documentation received.
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-600 font-extrabold">📄</span>
            <div>
              <strong>No Safety Certification:</strong> Get CE, EN71, ASTM or ISO 8124 certificates from supplier. Add them in product wizard Step 3.
            </div>
          </li>
        </ul>
      </section>
    </div>
  );
}

function RiskCard({ item }: any) {
  return (
    <div className="rounded-2xl bg-white border-2 border-rose-200 shadow-sm p-4 hover:shadow-md transition">
      <div className="flex items-start gap-4 flex-wrap sm:flex-nowrap">
        <div className="h-14 w-14 rounded-2xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
          {item.product?.images?.[0]?.url ? (
            <img src={item.product.images[0].url} alt="" className="w-full h-full object-cover" />
          ) : (
            <Baby className="h-6 w-6 text-slate-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-extrabold text-slate-900 text-base truncate">{item.product?.name}</h3>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            {item.brand && <span className="text-xs font-bold text-slate-600">{item.brand}</span>}
            {item.ageGroup && <span className="text-[10px] font-extrabold uppercase text-pink-700 px-1.5 py-0.5 rounded bg-pink-50">{item.ageGroup.replace(/_/g, ' ')}</span>}
            {item.genderTarget && <span className="text-[10px] font-extrabold uppercase text-violet-700 px-1.5 py-0.5 rounded bg-violet-50">{item.genderTarget}</span>}
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {(item.riskFlags || []).map((flag: string) => {
              const meta = RISK_LABELS[flag];
              if (!meta) return null;
              return (
                <span key={flag} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border-2 text-[10px] font-extrabold uppercase ${meta.bg} ${meta.color}`}>
                  {meta.emoji} {meta.label}
                </span>
              );
            })}
          </div>
        </div>

        <div className="text-right shrink-0 flex flex-col gap-2 items-end">
          <div>
            <div className="text-lg font-extrabold text-emerald-700 tabular-nums">{formatPKR(item.product?.price || 0)}</div>
            <div className="text-[10px] font-bold text-slate-500">Stock: {item.product?.stock || 0}</div>
          </div>
          <Link to={`/toy-products/${item.productId}/edit`}
            className="h-9 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-extrabold inline-flex items-center gap-1">
            <Edit3 className="h-3.5 w-3.5" /> Fix
          </Link>
        </div>
      </div>
    </div>
  );
}

function RiskStat({ label, value, icon, tone, onClick }: any) {
  const tones: Record<string, string> = {
    rose: 'from-rose-500 to-red-700', amber: 'from-amber-500 to-orange-600',
    orange: 'from-orange-500 to-red-600', red: 'from-red-500 to-red-800',
  };
  return (
    <button onClick={onClick}
      className={`rounded-2xl bg-white border-2 border-slate-200 hover:border-rose-300 hover:shadow-md p-4 shadow-sm text-left w-full transition`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase font-extrabold text-slate-500">{label}</div>
          <div className="text-2xl font-extrabold text-slate-900 tabular-nums mt-1">{value}</div>
        </div>
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md text-lg`}>
          {icon}
        </div>
      </div>
    </button>
  );
}
