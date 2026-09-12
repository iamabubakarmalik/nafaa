// apps/web/src/industries/mobile/pages/MobileLowStockPage.tsx
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, Smartphone, Cable, Search, RefreshCw, FileSpreadsheet,
  Printer, PackageX, PackageSearch, ShoppingCart, ChevronRight, XCircle,
  ShieldAlert, Boxes,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { useAuthStore, useShopParam } from '@core/stores/auth.store';
import { mobileReportsApi } from '../api/mobile-reports.api';
import { PrintStyles } from '@core/components/print/PrintStyles';

/* ═════════════════════════════════════════════════════════════
   NAFAA MOBILE — LOW STOCK
   ─────────────────────────────────────────────────────────────
   Mobile me stock ki ginti IMEI se banti hai — jitne IMEI, utna
   stock. Ye page batata hai kaunsa model khatam ho raha hai aur
   kaunsi accessory dobara mangwani hai.
   📱 Phone models (IMEI count) + 🎧 Accessories (shop stock)
   🖨️ Print + CSV • 🌗 Dark/light • 📱 Mobile → 4K
   ═════════════════════════════════════════════════════════════ */

type Tab = 'all' | 'phones' | 'accessories';

export default function MobileLowStockPage() {
  const currentShopId = useShopParam();
  const shopName = useAuthStore((s: any) => s.user?.assignedShop?.name);
  const tenantName = useAuthStore((s: any) => s.tenant?.name);

  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [onlyOut, setOnlyOut] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['mobile-low-stock', currentShopId],
    queryFn: () => mobileReportsApi.lowStock(currentShopId || undefined),
  });

  const summary = data?.summary;

  const phones = useMemo(() => {
    let rows = data?.phones ?? [];
    const q = search.toLowerCase().trim();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.brand ?? '').toLowerCase().includes(q) ||
          (r.variantName ?? '').toLowerCase().includes(q) ||
          (r.sku ?? '').toLowerCase().includes(q),
      );
    }
    if (onlyOut) rows = rows.filter((r) => r.isOut);
    return rows;
  }, [data, search, onlyOut]);

  const accessories = useMemo(() => {
    let rows = data?.accessories ?? [];
    const q = search.toLowerCase().trim();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.brand ?? '').toLowerCase().includes(q) ||
          (r.sku ?? '').toLowerCase().includes(q),
      );
    }
    if (onlyOut) rows = rows.filter((r) => r.isOut);
    return rows;
  }, [data, search, onlyOut]);

  const totalShown =
    (tab === 'accessories' ? 0 : phones.length) + (tab === 'phones' ? 0 : accessories.length);

  const exportCsv = () => {
    const rows: string[][] = [
      [`${tenantName ?? 'Nafaa'} — Mobile Low Stock`],
      [`Shop: ${shopName ?? 'All'}`, new Date().toLocaleString('en-PK')],
      [],
      ['PHONE MODELS', 'Brand', 'Variant', 'In Stock', 'Alert Level', 'Price', 'Stock Value'],
      ...phones.map((p) => [
        p.name, p.brand ?? '', p.variantName ?? '', String(p.inStock),
        String(p.lowStockAlert), p.price.toFixed(0), p.stockValue.toFixed(0),
      ]),
      [],
      ['ACCESSORIES', 'Brand', 'Stock', 'Alert Level', 'Unit', 'Price'],
      ...accessories.map((a) => [
        a.name, a.brand ?? '', String(a.stock), String(a.lowStockAlert), a.unit, a.price.toFixed(0),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `mobile-low-stock-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV download ho gaya');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-40 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      </div>
    );
  }

  const nothingLow = (data?.phones.length ?? 0) === 0 && (data?.accessories.length ?? 0) === 0;

  return (
    <div className="space-y-4 sm:space-y-5 pb-10 print:space-y-3">
      <PrintStyles orientation="portrait" title="Low Stock Report" subtitle="Kya khatam ho raha hai" />

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-700 dark:from-slate-950 dark:via-amber-950 dark:to-orange-900 text-white p-4 sm:p-6 shadow-2xl">
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-amber-400/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-orange-400/20 blur-3xl pointer-events-none" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-300" /> Low Stock Alert
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold">Kya khatam ho raha hai?</h1>
            <p className="mt-1 text-xs sm:text-sm font-semibold text-white/80">
              {shopName ? `${shopName} · ` : ''}Phone ka stock IMEI se ginta hai
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap print:hidden">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-10 w-10 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center transition disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={exportCsv}
              className="h-10 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 transition"
            >
              <FileSpreadsheet className="h-4 w-4" /> CSV
            </button>
            <button
              onClick={() => window.print()}
              className="h-10 px-3 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-xs font-extrabold inline-flex items-center gap-1.5 transition"
            >
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
        </div>
      </section>

      {/* ═══ SUMMARY ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <SummaryCard
          label="Models Khatam"
          value={summary?.phoneModelsOut ?? 0}
          icon={XCircle}
          tone="rose"
          hint="Ek bhi IMEI nahi"
        />
        <SummaryCard
          label="Models Kam"
          value={summary?.phoneModelsLow ?? 0}
          icon={Smartphone}
          tone="amber"
          hint="Alert level se neeche"
        />
        <SummaryCard
          label="Accessory Khatam"
          value={summary?.accessoriesOut ?? 0}
          icon={PackageX}
          tone="rose"
          hint="Stock zero"
        />
        <SummaryCard
          label="Accessory Kam"
          value={summary?.accessoriesLow ?? 0}
          icon={Cable}
          tone="amber"
          hint="Dobara mangwao"
        />
      </div>

      {nothingLow ? (
        <div className="rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-emerald-200 dark:border-emerald-500/30 p-14 text-center">
          <div className="mx-auto h-16 w-16 rounded-3xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center mb-3">
            <Boxes className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">Sab kuch stock me hai 🎉</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
            Koi model ya accessory alert level se neeche nahi
          </p>
        </div>
      ) : (
        <>
          {/* ═══ FILTERS ═══ */}
          <div className="flex items-center gap-2 flex-wrap print:hidden">
            <div className="flex gap-1.5 bg-white dark:bg-slate-900 rounded-xl border-2 border-slate-200 dark:border-slate-700 p-1">
              {([
                { v: 'all', label: 'Sab', icon: Boxes },
                { v: 'phones', label: 'Phones', icon: Smartphone },
                { v: 'accessories', label: 'Accessories', icon: Cable },
              ] as const).map((t) => (
                <button
                  key={t.v}
                  onClick={() => setTab(t.v)}
                  className={`h-9 px-3 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
                    tab === t.v
                      ? 'bg-gradient-to-r from-amber-600 to-orange-700 text-white shadow'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <t.icon className="h-3.5 w-3.5" /> {t.label}
                </button>
              ))}
            </div>

            <div className="relative flex-1 min-w-[12rem]">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Model, brand ya SKU..."
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            <button
              onClick={() => setOnlyOut((v) => !v)}
              className={`h-11 px-3.5 rounded-xl text-xs font-extrabold border-2 inline-flex items-center gap-1.5 transition ${
                onlyOut
                  ? 'bg-rose-600 text-white border-transparent shadow-lg shadow-rose-500/30'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-rose-300'
              }`}
            >
              <XCircle className="h-3.5 w-3.5" /> Sirf khatam wale
            </button>
          </div>

          {totalShown === 0 && (
            <div className="rounded-2xl bg-white dark:bg-slate-900/80 border-2 border-slate-200 dark:border-slate-800 p-10 text-center">
              <PackageSearch className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                In filters se kuch nahi mila
              </p>
            </div>
          )}

          {/* ═══ PHONE MODELS ═══ */}
          {tab !== 'accessories' && phones.length > 0 && (
            <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                  <Smartphone className="h-5 w-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 dark:text-white">
                  Phone Models{' '}
                  <span className="text-slate-500 dark:text-slate-400 font-bold tabular-nums">({phones.length})</span>
                </h3>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {phones.map((p) => (
                  <div
                    key={`${p.productId}-${p.variantId ?? 'base'}`}
                    className="p-3 sm:p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                  >
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                      p.isOut
                        ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'
                        : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                    }`}>
                      <Smartphone className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-slate-900 dark:text-white text-sm truncate">
                        {p.name}
                        {p.variantName && (
                          <span className="ml-1.5 text-violet-700 dark:text-violet-400 font-bold">
                            {p.variantName}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 flex-wrap text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {p.brand && <span>{p.brand}</span>}
                        {p.color && <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{p.color}</span>}
                        {p.sku && <span className="font-mono">{p.sku}</span>}
                        <span className="tabular-nums">{formatPKR(p.price)}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`text-lg font-extrabold tabular-nums ${
                        p.isOut ? 'text-rose-600 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'
                      }`}>
                        {p.inStock}
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        {p.isOut ? 'khatam' : `alert: ${p.lowStockAlert}`}
                      </div>
                    </div>

                    <Link
                      to={`/products/${p.productId}/imei`}
                      className="h-9 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-extrabold inline-flex items-center gap-1 shrink-0 transition print:hidden"
                      title="IMEI add karo"
                    >
                      IMEI <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ ACCESSORIES ═══ */}
          {tab !== 'phones' && accessories.length > 0 && (
            <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 border-b-2 border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                  <Cable className="h-5 w-5" />
                </div>
                <h3 className="font-extrabold text-slate-900 dark:text-white">
                  Accessories{' '}
                  <span className="text-slate-500 dark:text-slate-400 font-bold tabular-nums">({accessories.length})</span>
                </h3>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {accessories.map((a) => (
                  <div
                    key={a.productId}
                    className="p-3 sm:p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                  >
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                      a.isOut
                        ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'
                        : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                    }`}>
                      <Cable className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-slate-900 dark:text-white text-sm truncate">{a.name}</div>
                      <div className="mt-0.5 flex items-center gap-2 flex-wrap text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {a.brand && <span>{a.brand}</span>}
                        {a.sku && <span className="font-mono">{a.sku}</span>}
                        <span className="tabular-nums">{formatPKR(a.price)}</span>
                        {a.notInShop && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                            Shop me assign nahi
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className={`text-lg font-extrabold tabular-nums ${
                        a.isOut ? 'text-rose-600 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'
                      }`}>
                        {a.stock}
                        <span className="text-[10px] font-bold text-slate-400 ml-0.5">{a.unit}</span>
                      </div>
                      <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                        {a.isOut ? 'khatam' : `alert: ${a.lowStockAlert}`}
                      </div>
                    </div>

                    <Link
                      to="/purchases"
                      className="h-9 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold inline-flex items-center gap-1 shrink-0 transition print:hidden"
                      title="Purchase entry karo"
                    >
                      <ShoppingCart className="h-3 w-3" /> Mangwao
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════ */

const SUMMARY_TONES: Record<string, string> = {
  rose: 'from-rose-500 to-red-600 shadow-rose-500/30',
  amber: 'from-amber-500 to-orange-600 shadow-amber-500/30',
};

function SummaryCard({ label, value, icon: Icon, tone, hint }: any) {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-3 sm:p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${SUMMARY_TONES[tone]} text-white flex items-center justify-center shadow-lg shrink-0`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider truncate">
          {label}
        </div>
        <div className="font-extrabold text-slate-900 dark:text-white text-xl tabular-nums">{value}</div>
        {hint && <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate">{hint}</div>}
      </div>
    </div>
  );
}
