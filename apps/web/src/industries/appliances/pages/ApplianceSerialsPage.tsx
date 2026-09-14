import { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Barcode, Search, X, RefreshCw, Plus, ShieldCheck, Package, Wallet,
  Loader2, CheckCircle2, Trash2, FileDown, Printer, HardHat, Wrench,
  AlertTriangle, ChevronLeft, ChevronRight, Layers, Zap, Boxes, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { useAuthStore } from '@core/stores/auth.store';
import { applianceSerialApi, type ApplianceSerial } from '../api/serial-tracking.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import {
  ApplianceHero, Kpi, Panel, Teacher, Empty, Sheet, Field, inputCls, ChipRow,
  StatusBadge, useShortcuts, printHtml, downloadCsv, a4Shell, escapeHtml,
  toDateInput, fmtDate, fmtDateTime, guideAction, printAction, Kbd,
} from '../components/shared';
import {
  serialStatusMeta, instStatusMeta, SERIAL_STATUS_ORDER,
  catEmoji, catLabel, daysPhrase, svcTypeMeta,
} from '../constants';

/* ═════════════════════════════════════════════════════════════
   SERIAL REGISTER — har unit ka apna safar
   ─────────────────────────────────────────────────────────────
   Appliance me serial sirf ek number nahi — usi se pata chalta
   hai ke ye unit kab aaya, kis ko bika, kab laga, kitni warranty
   baqi hai aur is par ab tak kitna kharcha aaya.
   ═════════════════════════════════════════════════════════════ */

export default function ApplianceSerialsPage() {
  const qc = useQueryClient();
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Meri Dukaan';
  const shopPhone = useAuthStore((s: any) => s.tenant?.phone || '');
  const searchRef = useRef<HTMLInputElement>(null);

  const [showTeacher, setShowTeacher] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [warranty, setWarranty] = useState<'active' | 'expiring' | 'expired' | null>(null);
  const [page, setPage] = useState(1);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['appliance-serials'] });
    qc.invalidateQueries({ queryKey: ['appliance-serial-summary'] });
    qc.invalidateQueries({ queryKey: ['appliance-stock-report'] });
  };

  const { data: summary } = useQuery({
    queryKey: ['appliance-serial-summary'],
    queryFn: applianceSerialApi.summary,
  });

  const params = {
    search: search.trim() || undefined,
    status: status ?? undefined,
    warranty: warranty ?? undefined,
    page, limit: 60,
  };

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['appliance-serials', params],
    queryFn: () => applianceSerialApi.list(params),
  });

  const rows = data?.items ?? [];
  const hasFilters = !!(search || status || warranty);

  const exportCsv = () => {
    if (!rows.length) return toast.error('Koi serial nahi');
    downloadCsv(`serials-${toDateInput(new Date())}.csv`, [
      [`Serial Register — ${shopName}`],
      [`Nikala gaya: ${new Date().toLocaleString('en-PK')}`],
      [],
      ['Serial', 'Cheez', 'Qism', 'Brand', 'Model', 'Batch', 'Halat',
       'Kharidne ka rate', 'Kharidne ki tareekh', 'Supplier',
       'Bechne ka rate', 'Bika', 'Customer', 'Phone', 'Invoice',
       'Installation', 'Laga', 'Warranty tak', 'Din baqi',
       'Compressor tak', 'Motor tak'],
      ...rows.map((r) => [
        r.serialNumber, r.product?.name ?? '', catLabel(r.product?.categoryType), r.product?.brand ?? '',
        r.modelNumber ?? '', r.batchNumber ?? '', serialStatusMeta(r.status).label,
        r.purchasePrice ?? '', r.purchaseDate ? fmtDate(r.purchaseDate) : '', r.supplierRef ?? '',
        r.soldPrice ?? '', r.soldAt ? fmtDate(r.soldAt) : '', r.customerName ?? '', r.customerPhone ?? '',
        r.invoiceNumber ?? '',
        instStatusMeta(r.installationStatus).label, r.installedAt ? fmtDate(r.installedAt) : '',
        r.warrantyEndDate ? fmtDate(r.warrantyEndDate) : '', r.warranty?.mainDaysLeft ?? '',
        r.compressorWarrantyEndDate ? fmtDate(r.compressorWarrantyEndDate) : '',
        r.motorWarrantyEndDate ? fmtDate(r.motorWarrantyEndDate) : '',
      ]),
    ]);
    toast.success(`${rows.length} serial export ho gaye`);
  };

  const printA4 = () => {
    if (!rows.length) return toast.error('Koi serial nahi');
    const body = `
      <h2 class="sec">🔖 Serial Register</h2>
      <table>
        <thead><tr>
          <th>#</th><th>Serial / Cheez</th><th>Brand / Model</th><th class="c">Halat</th>
          <th class="c">Installation</th><th class="c">Warranty</th><th class="r">Lagat</th><th class="r">Bika</th>
        </tr></thead>
        <tbody>
          ${rows.map((r, i) => `
            <tr>
              <td class="num">${i + 1}</td>
              <td><div class="main">${escapeHtml(r.serialNumber)}</div><div class="sub">${escapeHtml(r.product?.name ?? '—')}</div></td>
              <td>${escapeHtml(r.product?.brand ?? '—')}${r.modelNumber ? `<div class="sub">${escapeHtml(r.modelNumber)}</div>` : ''}</td>
              <td class="c"><span class="pill">${escapeHtml(serialStatusMeta(r.status).label)}</span></td>
              <td class="c">${escapeHtml(instStatusMeta(r.installationStatus).label)}</td>
              <td class="c">${r.warranty?.soonestDays != null ? `${r.warranty.soonestDays} din` : '—'}</td>
              <td class="r">${r.purchasePrice ? formatPKR(r.purchasePrice) : '—'}</td>
              <td class="r">${r.soldPrice ? formatPKR(r.soldPrice) : '—'}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;

    const ok = printHtml(a4Shell({
      title: `Serial Register — ${shopName}`,
      heading: '🔖 Serial Register',
      shopName, shopPhone, badge: 'Serial Report',
      kpis: [
        { label: '📦 Stock Me', value: String(summary?.inStock.units ?? 0), sub: formatPKR(summary?.inStock.value ?? 0), tone: 'blue' },
        { label: '💰 Bik Chuke', value: String(summary?.sold.units ?? 0), sub: `munafa ${formatPKR(summary?.sold.profit ?? 0)}`, tone: 'green' },
        { label: '🔧 Lagana Baqi', value: String(summary?.installation.pending ?? 0), tone: 'amber' },
        { label: '🛡️ Warranty Khatam', value: String(summary?.warrantyExpiringSoon ?? 0), sub: '30 din me', tone: 'rose' },
      ],
      body,
    }));
    if (!ok) toast.error('Popup block hai — allow karein');
  };

  useShortcuts({
    '/': () => searchRef.current?.focus(),
    n: () => setShowBulk(true),
    t: () => setShowTeacher(true),
    p: () => printA4(),
    Escape: () => {
      if (showBulk) setShowBulk(false);
      else if (detailId) setDetailId(null);
      else if (showTeacher) setShowTeacher(false);
    },
  }, [showBulk, detailId, showTeacher, rows]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {showTeacher && <SerialTeacher onClose={() => setShowTeacher(false)} />}
      {showBulk && <BulkSerialModal onClose={() => setShowBulk(false)} onDone={() => { setShowBulk(false); invalidate(); }} />}
      {detailId && <SerialDetailSheet id={detailId} onClose={() => setDetailId(null)} onChanged={invalidate} shopName={shopName} shopPhone={shopPhone} />}

      <ApplianceHero
        badge="Serial Register"
        badgeIcon={<Barcode className="h-3.5 w-3.5 text-amber-300" />}
        title="🔖 Serial Tracking"
        subtitle={
          summary ? (
            <>
              <strong className="text-cyan-200">{summary.inStock.units}</strong> stock me
              <span className="opacity-50 mx-1.5">•</span>
              <strong className="text-emerald-300">{summary.sold.units}</strong> bik chuke
              {summary.installation.pending > 0 && (
                <><span className="opacity-50 mx-1.5">•</span><strong className="text-amber-300">{summary.installation.pending}</strong> lagana baqi</>
              )}
            </>
          ) : 'Har unit ka apna record — kab aaya, kis ko gaya, kya hua'
        }
        actions={[
          guideAction(() => setShowTeacher(true)),
          { key: 'refresh', label: 'Refresh', icon: <RefreshCw className="h-4 w-4" />, onClick: () => refetch(), spinning: isFetching, hideLabelOnMobile: true },
          { key: 'csv', label: 'CSV', icon: <FileDown className="h-4 w-4" />, onClick: exportCsv, disabled: !rows.length, hideLabelOnMobile: true },
          printAction(printA4, !rows.length),
          { key: 'bulk', label: 'Shipment Add', icon: <Plus className="h-4 w-4" />, shortcut: 'N', onClick: () => setShowBulk(true), variant: 'solid' },
        ]}
        shortcuts={[
          { keys: '/', label: 'Search' }, { keys: 'N', label: 'Shipment' },
          { keys: 'P', label: 'Print' }, { keys: 'T', label: 'Guide' },
        ]}
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <Kpi icon={Boxes} tone="cyan" label="Stock Me" value={summary?.inStock.units ?? 0}
          sub={`lagat ${formatPKR(summary?.inStock.value ?? 0)}`}
          onClick={() => { setStatus(status === 'IN_STOCK' ? null : 'IN_STOCK'); setPage(1); }}
          active={status === 'IN_STOCK'} />
        <Kpi icon={Wallet} tone="emerald" label="Bik Chuke" value={summary?.sold.units ?? 0}
          sub={`munafa ${formatPKR(summary?.sold.profit ?? 0)}`}
          onClick={() => { setStatus(status === 'SOLD' ? null : 'SOLD'); setPage(1); }}
          active={status === 'SOLD'} />
        <Kpi icon={HardHat} tone="amber" label="Lagana Baqi" value={summary?.installation.pending ?? 0}
          sub="bik gaya, laga nahi" alert={(summary?.installation.pending ?? 0) > 0} />
        <Kpi icon={ShieldCheck} tone="violet" label="Warranty Khatam Ho Rahi" value={summary?.warrantyExpiringSoon ?? 0}
          sub="30 din me" alert={(summary?.warrantyExpiringSoon ?? 0) > 0}
          onClick={() => { setWarranty(warranty === 'expiring' ? null : 'expiring'); setPage(1); }}
          active={warranty === 'expiring'} />
      </section>

      {/* Toolbar */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input ref={searchRef} className={inputCls('h-12 pl-10 pr-10 text-sm font-semibold font-mono')}
            placeholder="Serial, model, batch, customer, invoice... (/)"
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center">
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>
        <div className="inline-flex rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 h-12">
          {([['active', '🛡️ Warranty chal rahi'], ['expiring', '⏳ Khatam ho rahi'], ['expired', '❌ Khatam']] as const).map(([v, label]) => (
            <button key={v} onClick={() => { setWarranty(warranty === v ? null : (v as any)); setPage(1); }}
              className={`px-2.5 rounded-xl text-[11px] font-extrabold transition whitespace-nowrap ${
                warranty === v ? 'bg-cyan-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}>{label}</button>
          ))}
        </div>
        <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400 tabular-nums px-1">
          {data?.meta.total ?? 0} serials
        </div>
      </div>

      <ChipRow
        options={SERIAL_STATUS_ORDER.map((s) => ({
          value: s, label: serialStatusMeta(s).label, emoji: serialStatusMeta(s).emoji,
          count: summary?.byStatus?.[s],
        }))}
        value={status} onChange={(v) => { setStatus(v); setPage(1); }} allLabel={`Sab (${summary?.total ?? 0})`} />

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}
        </div>
      ) : rows.length === 0 ? (
        <Empty
          icon={Barcode}
          title={hasFilters ? 'Koi serial nahi mila' : 'Abhi koi serial register nahi'}
          hint={
            hasFilters
              ? 'Search ya filter badal kar dekhein'
              : 'Jab shipment aaye to "Shipment Add" se ek sath saare serial daal dein — warranty ki tareekhein khud lag jayengi'
          }
          action={
            hasFilters
              ? <Button variant="secondary" onClick={() => { setSearch(''); setStatus(null); setWarranty(null); setPage(1); }}>
                  <X className="h-4 w-4" /> Filter Clear
                </Button>
              : <Button className="bg-gradient-to-r from-cyan-600 to-teal-700 font-extrabold shadow-lg shadow-cyan-500/40" onClick={() => setShowBulk(true)}>
                  <Plus className="h-4 w-4" /> Pehla Shipment
                </Button>
          }
        />
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((r) => <SerialRow key={r.id} r={r} onOpen={() => setDetailId(r.id)} />)}
          </div>
        </div>
      )}

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between flex-wrap gap-2 bg-white dark:bg-slate-900/80 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-bold">
            Page <strong className="text-slate-900 dark:text-white">{data.meta.page}</strong> / <strong className="text-slate-900 dark:text-white">{data.meta.totalPages}</strong>
            <span className="opacity-50 mx-1">•</span>
            <strong className="text-slate-900 dark:text-white tabular-nums">{data.meta.total}</strong> serials
          </div>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
              className="h-10 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1">
              <ChevronLeft className="h-4 w-4" /> Pehle
            </button>
            <button disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}
              className="h-10 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1">
              Agla <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═════════════ ROW ═════════════ */
function SerialRow({ r, onOpen }: { r: ApplianceSerial; onOpen: () => void }) {
  const st = serialStatusMeta(r.status);
  const inst = instStatusMeta(r.installationStatus);
  const w = r.warranty;
  const wTone = !w?.isUnderWarranty ? 'text-slate-400'
    : (w.soonestDays ?? 999) <= 30 ? 'text-amber-600 dark:text-amber-400'
    : 'text-emerald-600 dark:text-emerald-400';

  return (
    <button onClick={onOpen} className="w-full text-left px-3 sm:px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl shrink-0">
          {catEmoji(r.product?.categoryType)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-xs font-extrabold text-cyan-700 dark:text-cyan-400">{r.serialNumber}</span>
            <StatusBadge meta={st} size="xs" />
            {r.status === 'SOLD' && inst.isOpen && (
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">
                LAGANA BAQI
              </span>
            )}
          </div>
          <div className="text-[13px] font-extrabold text-slate-900 dark:text-white truncate group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition">
            {r.product?.name ?? 'Product'}
          </div>
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate">
            {r.product?.brand ? `${r.product.brand} • ` : ''}{catLabel(r.product?.categoryType)}
            {r.modelNumber ? ` • ${r.modelNumber}` : ''}
            {r.customerName ? ` • ${r.customerName}` : ''}
          </div>
        </div>
        <div className="hidden sm:block text-right shrink-0">
          <div className={`text-[11px] font-extrabold ${wTone}`}>
            {w?.isUnderWarranty ? `🛡️ ${daysPhrase(w.soonestDays)}` : '⌛ Warranty khatam'}
          </div>
          {w?.soonestKind && w.isUnderWarranty && (
            <div className="text-[9px] font-bold text-slate-400">
              {w.soonestKind === 'COMPRESSOR' ? 'Compressor' : w.soonestKind === 'MOTOR' ? 'Motor' : 'Main'}
            </div>
          )}
        </div>
        <div className="text-right shrink-0 w-20 sm:w-24">
          <div className="text-xs font-extrabold tabular-nums text-slate-800 dark:text-slate-100">
            {r.soldPrice ? formatPKR(r.soldPrice) : r.purchasePrice ? formatPKR(r.purchasePrice) : '—'}
          </div>
          <div className="text-[9px] font-bold text-slate-400">
            {r.soldAt ? fmtDate(r.soldAt) : r.purchaseDate ? fmtDate(r.purchaseDate) : ''}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0 group-hover:translate-x-0.5 group-hover:text-cyan-500 transition" />
      </div>
    </button>
  );
}

/* ═════════════════════════════════════════════════════════════
   SHIPMENT ADD — 20 AC ek sath
   ═════════════════════════════════════════════════════════════ */
function BulkSerialModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [productId, setProductId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [serialText, setSerialText] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(toDateInput(new Date()));
  const [supplierRef, setSupplierRef] = useState('');

  const { data: products } = useQuery({
    queryKey: ['products-for-serials', productSearch],
    queryFn: () => productsApi.list({ page: 1, limit: 40, search: productSearch.trim() || undefined }),
  });

  const serials = useMemo(
    () => [...new Set(serialText.split(/[\n,;\t]+/).map((s) => s.trim()).filter(Boolean))],
    [serialText],
  );

  const picked = (products?.items ?? []).find((p: any) => p.id === productId);

  const mut = useMutation({
    mutationFn: () => applianceSerialApi.bulkCreate({
      productId,
      serialNumbers: serials,
      ...(batchNumber.trim() ? { batchNumber: batchNumber.trim() } : {}),
      ...(purchasePrice ? { purchasePrice: Number(purchasePrice) } : {}),
      ...(purchaseDate ? { purchaseDate } : {}),
      ...(supplierRef.trim() ? { supplierRef: supplierRef.trim() } : {}),
    }),
    onSuccess: (r) => {
      toast.success(r.message);
      if (r.skipped > 0) {
        toast.warning(`${r.skipped} serial pehle se thay: ${r.skippedSerials.slice(0, 5).join(', ')}`);
      }
      onDone();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Serial add nahi hue'),
  });

  const ok = !!productId && serials.length > 0;

  return (
    <Sheet
      wide
      badge="Naya Shipment"
      icon={<Barcode className="h-3 w-3" />}
      title="📦 Shipment Ke Serial Daalein"
      subtitle="Ek sath saare serial — warranty ki tareekhein product profile se khud lag jayengi"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1 h-12" onClick={onClose}><X className="h-4 w-4" /> Cancel</Button>
          <button onClick={() => mut.mutate()} disabled={!ok || mut.isPending}
            className="flex-[2] h-12 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-700 hover:from-cyan-500 hover:to-teal-600 disabled:opacity-50 text-white text-sm font-black inline-flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/40 transition active:scale-[0.98]">
            {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {serials.length > 0 ? `${serials.length} Serial Add Karein` : 'Serial Add Karein'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <Panel icon={Package} title="Kaunsa Product" tone="blue">
          <Field label="Product dhoondein" required>
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input className={inputCls('h-11 pl-10 font-semibold')} placeholder="Naam ya SKU likhein"
                value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
            </div>
          </Field>
          <div className="mt-2 space-y-1 max-h-56 overflow-y-auto">
            {(products?.items ?? []).map((p: any) => (
              <button key={p.id} type="button" onClick={() => setProductId(p.id)}
                className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border-2 transition text-left ${
                  productId === p.id
                    ? 'bg-cyan-50 dark:bg-cyan-500/15 border-cyan-400 dark:border-cyan-500/50'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-cyan-300'
                }`}>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{p.name}</div>
                  <div className="text-[10px] font-bold text-slate-400 truncate">
                    {p.sku ? `${p.sku} • ` : ''}Stock {p.stock} • Lagat {formatPKR(p.costPrice ?? 0)}
                  </div>
                </div>
                {productId === p.id && <CheckCircle2 className="h-4 w-4 text-cyan-600 shrink-0" />}
              </button>
            ))}
            {(products?.items ?? []).length === 0 && (
              <p className="text-xs font-bold text-slate-400 py-4 text-center">Koi product nahi mila</p>
            )}
          </div>
        </Panel>

        <Panel icon={Barcode} title="Serial Numbers" hint="Har serial nayi line par — ya comma se alag" tone="cyan">
          <textarea rows={7} className={inputCls('py-2 font-mono text-xs font-bold resize-none')}
            placeholder={'SN-001\nSN-002\nSN-003\n…'}
            value={serialText} onChange={(e) => setSerialText(e.target.value)} />
          <div className="mt-2 flex items-center justify-between">
            <span className={`text-[11px] font-extrabold ${serials.length ? 'text-cyan-700 dark:text-cyan-400' : 'text-slate-400'}`}>
              {serials.length} serial mile
            </span>
            {serials.length > 0 && (
              <button type="button" onClick={() => setSerialText('')}
                className="text-[11px] font-extrabold text-rose-600 dark:text-rose-400 hover:underline">
                Sab hatao
              </button>
            )}
          </div>
          {serials.length > 0 && (
            <div className="mt-2 flex gap-1 flex-wrap max-h-24 overflow-y-auto">
              {serials.slice(0, 30).map((s) => (
                <span key={s} className="px-2 py-0.5 rounded-lg bg-cyan-100 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 font-mono text-[10px] font-extrabold">{s}</span>
              ))}
              {serials.length > 30 && (
                <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-extrabold">+{serials.length - 30}</span>
              )}
            </div>
          )}
        </Panel>

        <Panel icon={Wallet} title="Shipment Ki Tafseel" hint="Sab serials par lag jayegi" tone="emerald">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Kharidne ka rate (per unit)" hint={picked ? `product ki lagat ${formatPKR(picked.costPrice ?? 0)}` : 'khali chhorein to product ki lagat'}>
              <input type="number" min={0} className={inputCls('h-11 font-extrabold tabular-nums')}
                placeholder={String(picked?.costPrice ?? 0)}
                value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} />
            </Field>
            <Field label="Kharidne ki tareekh" hint="warranty isi se gini jayegi">
              <input type="date" className={inputCls('h-11 font-bold [color-scheme:light] dark:[color-scheme:dark]')}
                value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
            </Field>
          </div>
          <div className="mt-3 grid sm:grid-cols-2 gap-3">
            <Field label="Batch number" hint="optional">
              <input className={inputCls('h-11 font-bold font-mono')} placeholder="BATCH-2026-04"
                value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} />
            </Field>
            <Field label="Supplier / Invoice ref" hint="optional">
              <input className={inputCls('h-11 font-bold')} placeholder="Haier Lahore — INV-9981"
                value={supplierRef} onChange={(e) => setSupplierRef(e.target.value)} />
            </Field>
          </div>
          {picked && serials.length > 0 && (
            <div className="mt-3 rounded-xl bg-slate-900 dark:bg-slate-950 text-white p-3">
              <div className="flex items-center justify-between text-sm font-extrabold">
                <span>Shipment ki kul lagat</span>
                <span className="tabular-nums text-cyan-300">
                  {formatPKR(serials.length * (Number(purchasePrice) || picked.costPrice || 0))}
                </span>
              </div>
              <div className="mt-0.5 text-[10px] font-bold text-white/60">
                {serials.length} units × {formatPKR(Number(purchasePrice) || picked.costPrice || 0)}
              </div>
            </div>
          )}
        </Panel>
      </div>
    </Sheet>
  );
}

/* ═════════════════════════════════════════════════════════════
   DETAIL — ek unit ka poora safar
   ═════════════════════════════════════════════════════════════ */
function SerialDetailSheet({ id, onClose, onChanged, shopName, shopPhone }: any) {
  const { data: s, isLoading } = useQuery({
    queryKey: ['appliance-serial', id],
    queryFn: () => applianceSerialApi.getOne(id),
  });

  const delMut = useMutation({
    mutationFn: () => applianceSerialApi.remove(id),
    onSuccess: () => { toast.success('Serial delete ho gaya'); onChanged(); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete nahi hua'),
  });

  if (isLoading || !s) {
    return (
      <Sheet wide badge="Serial" title="Khul raha hai…" onClose={onClose}>
        <div className="h-64 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-cyan-500" /></div>
      </Sheet>
    );
  }

  const st = serialStatusMeta(s.status);
  const w = s.warranty;

  /* Warranty card — customer ko dene wala kaghaz */
  const printWarrantyCard = () => {
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(s.serialNumber)}</title>
<style>
  @page { size: A5 landscape; margin: 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; font-size: 11px;
    -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .card { border: 3px double #0f766e; border-radius: 10px; padding: 16px; height: 100%; }
  .head { text-align: center; border-bottom: 2px solid #0f766e; padding-bottom: 8px; margin-bottom: 10px; }
  .shop { font-size: 18px; font-weight: 800; color: #0f766e; }
  h1 { font-size: 13px; font-weight: 800; letter-spacing: 3px; margin-top: 6px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 4px 3px; border-bottom: 1px solid #e2e8f0; }
  td.k { width: 30%; font-weight: 700; color: #475569; font-size: 10px; }
  td.v { font-weight: 700; }
  .warr { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 8px; }
  .wbox { border: 1.5px solid #0f766e; border-radius: 7px; padding: 6px; text-align: center; }
  .wbox .l { font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #64748b; }
  .wbox .d { font-size: 11px; font-weight: 800; color: #0f766e; }
  .note { margin-top: 8px; background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; padding: 6px 8px; font-size: 8.5px; }
  .foot { margin-top: 8px; text-align: center; font-size: 8px; color: #64748b; }
</style></head><body>
  <div class="card">
    <div class="head">
      <div class="shop">${escapeHtml(shopName)}</div>
      ${shopPhone ? `<div style="font-size:9px;color:#64748b;">📞 ${escapeHtml(shopPhone)}</div>` : ''}
      <h1>Warranty Card</h1>
    </div>
    <table>
      <tr><td class="k">Cheez</td><td class="v">${escapeHtml(s.product?.name ?? '—')}</td></tr>
      <tr><td class="k">Serial Number</td><td class="v" style="font-family:monospace;font-size:12px;">${escapeHtml(s.serialNumber)}</td></tr>
      ${s.modelNumber ? `<tr><td class="k">Model</td><td class="v">${escapeHtml(s.modelNumber)}</td></tr>` : ''}
      ${s.customerName ? `<tr><td class="k">Customer</td><td class="v">${escapeHtml(s.customerName)}${s.customerPhone ? ` — ${escapeHtml(s.customerPhone)}` : ''}</td></tr>` : ''}
      ${s.soldAt ? `<tr><td class="k">Bikne ki tareekh</td><td class="v">${fmtDate(s.soldAt)}</td></tr>` : ''}
      ${s.installedAt ? `<tr><td class="k">Lagne ki tareekh</td><td class="v">${fmtDate(s.installedAt)}</td></tr>` : ''}
    </table>
    <div class="warr">
      <div class="wbox"><div class="l">Main Warranty</div><div class="d">${s.warrantyEndDate ? fmtDate(s.warrantyEndDate) : '—'}</div></div>
      <div class="wbox"><div class="l">Compressor</div><div class="d">${s.compressorWarrantyEndDate ? fmtDate(s.compressorWarrantyEndDate) : '—'}</div></div>
      <div class="wbox"><div class="l">Motor</div><div class="d">${s.motorWarrantyEndDate ? fmtDate(s.motorWarrantyEndDate) : '—'}</div></div>
    </div>
    <div class="note">
      <strong>Zaroori:</strong> Warranty ke liye ye card aur serial number zaroori hai. Khud khol kar
      theek karne, bijli ke utaar charhao, ya ghair mustanad banday se kaam karwane par warranty khatam
      ho jati hai. Koi masla ho to pehle hamein phone karein.
    </div>
    <div class="foot">${escapeHtml(shopName)} • Powered by Nafaa POS</div>
  </div>
  <script>window.onload=function(){setTimeout(function(){window.print();},300);};</script>
</body></html>`;
    if (!printHtml(html, { width: 800, height: 600 })) toast.error('Popup block hai — allow karein');
  };

  const timeline = [
    { at: s.purchaseDate ?? s.createdAt, label: `Stock me aaya${s.supplierRef ? ` — ${s.supplierRef}` : ''}`, emoji: '📦' },
    { at: s.soldAt, label: `Bika${s.customerName ? ` — ${s.customerName}` : ''}${s.invoiceNumber ? ` (${s.invoiceNumber})` : ''}`, emoji: '💰' },
    { at: s.deliveredAt, label: `Ghar pohancha${s.deliveredBy ? ` — ${s.deliveredBy}` : ''}`, emoji: '🚚' },
    { at: s.installationScheduledFor, label: 'Installation ki tareekh lagi', emoji: '📅' },
    { at: s.installedAt, label: 'Lag gaya', emoji: '🔧' },
  ].filter((t) => t.at);

  return (
    <Sheet
      wide
      badge={st.label}
      icon={<span>{st.emoji}</span>}
      title={s.serialNumber}
      subtitle={<span>{s.product?.name ?? 'Product'}{s.product?.brand ? ` • ${s.product.brand}` : ''}</span>}
      onClose={onClose}
      footer={
        <div className="flex gap-2 flex-wrap">
          <button onClick={printWarrantyCard}
            className="h-11 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-700 hover:from-cyan-500 hover:to-teal-600 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shadow-lg shadow-cyan-500/30 transition">
            <ShieldCheck className="h-4 w-4" /> Warranty Card
          </button>
          {s.productId && (
            <Link to={`/appliance-products/${s.productId}`}
              className="h-11 px-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-extrabold inline-flex items-center gap-1.5 transition">
              <Package className="h-4 w-4" /> Product
            </Link>
          )}
          {s.status !== 'SOLD' && (
            <button onClick={() => { if (confirm(`Serial ${s.serialNumber} delete karein?`)) delMut.mutate(); }}
              disabled={delMut.isPending}
              className="h-11 px-4 rounded-xl border-2 border-rose-200 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs font-extrabold inline-flex items-center gap-1.5 ml-auto transition">
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Warranty */}
        <Panel icon={ShieldCheck} title="Warranty" hint="Teen alag warranty — jo pehle khatam ho wahi asal hai"
          tone={w?.isUnderWarranty ? 'emerald' : 'rose'}>
          <div className="grid grid-cols-3 gap-2">
            <WBox label="Main" end={s.warrantyEndDate} days={w?.mainDaysLeft} />
            <WBox label="Compressor" end={s.compressorWarrantyEndDate} days={w?.compressorDaysLeft} />
            <WBox label="Motor" end={s.motorWarrantyEndDate} days={w?.motorDaysLeft} />
          </div>
          {w && (
            <div className={`mt-3 rounded-xl border-2 p-3 text-xs font-bold ${
              w.isUnderWarranty
                ? (w.soonestDays ?? 999) <= 30
                  ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200'
                  : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-200'
            }`}>
              {w.isUnderWarranty
                ? `✅ Warranty chal rahi hai — ${w.soonestKind === 'COMPRESSOR' ? 'compressor' : w.soonestKind === 'MOTOR' ? 'motor' : 'main'} me ${daysPhrase(w.soonestDays)}. Is unit ka repair free karna hoga.`
                : '⌛ Saari warranty khatam ho chuki — ab repair ka paisa customer se lena hai.'}
            </div>
          )}
        </Panel>

        {/* Paisa */}
        <Panel icon={Wallet} title="Hisab" tone="cyan">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Box label="Kharidne ka rate" value={s.purchasePrice ? formatPKR(s.purchasePrice) : '—'} />
            <Box label="Bechne ka rate" value={s.soldPrice ? formatPKR(s.soldPrice) : '—'} tone="emerald" />
            <Box label="Munafa" value={s.soldPrice && s.purchasePrice ? formatPKR(s.soldPrice - s.purchasePrice) : '—'} tone="cyan" />
            <Box label="Service ka kharcha" value={formatPKR(s.serviceCost)} tone={s.serviceCost > 0 ? 'rose' : 'slate'} />
          </div>
          {s.serviceCost > 0 && s.soldPrice && s.purchasePrice && (
            <div className="mt-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              Asal munafa is unit par: <strong className={s.soldPrice - s.purchasePrice - s.serviceCost >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                {formatPKR(s.soldPrice - s.purchasePrice - s.serviceCost)}
              </strong> (service ka kharcha nikal kar)
            </div>
          )}
        </Panel>

        {/* Tafseel */}
        <Panel icon={Package} title="Tafseel" tone="blue">
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <Row label="Cheez" value={s.product?.name ?? '—'} />
            <Row label="Qism" value={catLabel(s.product?.categoryType)} />
            <Row label="Brand" value={s.product?.brand ?? '—'} />
            <Row label="Model" value={s.modelNumber ?? s.product?.modelNumber ?? '—'} />
            {s.batchNumber && <Row label="Batch" value={s.batchNumber} />}
            {s.supplierRef && <Row label="Supplier" value={s.supplierRef} />}
            {s.customerName && <Row label="Customer" value={`${s.customerName}${s.customerPhone ? ` — ${s.customerPhone}` : ''}`} />}
            {s.invoiceNumber && <Row label="Invoice" value={s.invoiceNumber} />}
            {s.deliveryAddress && <Row label="Pata" value={s.deliveryAddress} />}
          </div>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <StatusBadge meta={st} size="md" />
            <StatusBadge meta={instStatusMeta(s.installationStatus)} size="md" />
          </div>
        </Panel>

        {/* Timeline */}
        {timeline.length > 0 && (
          <Panel icon={Clock} title="Is Unit Ka Safar" tone="violet">
            <div className="space-y-2">
              {timeline.map((t, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm shrink-0">{t.emoji}</div>
                  <div className="flex-1 min-w-0 text-xs font-extrabold text-slate-800 dark:text-slate-100 truncate">{t.label}</div>
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 shrink-0">{fmtDate(t.at)}</div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* Installations */}
        {s.installations.length > 0 && (
          <Panel icon={HardHat} title={`Installation Ka Record (${s.installations.length})`} tone="blue">
            <div className="space-y-1.5">
              {s.installations.map((i) => (
                <Link key={i.id} to="/appliances/installations"
                  className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-2 transition">
                  <span className="text-base shrink-0">{svcTypeMeta(i.serviceType).emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-extrabold text-slate-900 dark:text-white truncate">{i.installationNumber}</div>
                    <div className="text-[10px] font-bold text-slate-400 truncate">
                      {fmtDate(i.completedAt || i.scheduledDate)}{i.technicianName ? ` • ${i.technicianName}` : ''}
                    </div>
                  </div>
                  <StatusBadge meta={instStatusMeta(i.status)} size="xs" />
                  <div className="text-[11px] font-extrabold tabular-nums text-slate-700 dark:text-slate-200 shrink-0">{formatPKR(i.totalCharge)}</div>
                </Link>
              ))}
            </div>
          </Panel>
        )}

        {/* Services */}
        {s.services.length > 0 && (
          <Panel icon={Wrench} title={`Repair Ka Record (${s.services.length})`}
            hint={s.services.length > 2 ? '⚠️ Ye unit baar baar kharab ho rahi hai' : undefined} tone="amber">
            <div className="space-y-1.5">
              {s.services.map((r) => (
                <Link key={r.id} to="/appliances/service-requests"
                  className="flex items-start gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-2 transition">
                  <span className="text-base shrink-0 mt-0.5">{svcTypeMeta(r.serviceType).emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-extrabold text-slate-900 dark:text-white truncate">
                      {r.requestNumber} — {r.issueCategory || r.reportedIssue}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 truncate">
                      {fmtDate(r.requestedAt)}{r.technicianName ? ` • ${r.technicianName}` : ''}
                      {r.workDone ? ` • ${r.workDone}` : ''}
                    </div>
                  </div>
                  {r.coveredUnderWarranty && (
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 shrink-0">FREE</span>
                  )}
                  <div className="text-[11px] font-extrabold tabular-nums text-slate-700 dark:text-slate-200 shrink-0">{formatPKR(r.totalCharge)}</div>
                </Link>
              ))}
            </div>
          </Panel>
        )}

        {s.notes && (
          <Panel icon={Zap} title="Notes" tone="slate">
            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{s.notes}</p>
          </Panel>
        )}
      </div>
    </Sheet>
  );
}

function WBox({ label, end, days }: { label: string; end?: string | null; days?: number | null }) {
  const tone = days == null ? 'slate' : days < 0 ? 'rose' : days <= 30 ? 'amber' : 'emerald';
  const tones: Record<string, string> = {
    slate: 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400',
    rose: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300',
    amber: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
  };
  return (
    <div className={`rounded-xl border-2 px-2 py-2 text-center ${tones[tone]}`}>
      <div className="text-[9px] font-extrabold uppercase tracking-wider opacity-75">{label}</div>
      <div className="text-[11px] font-extrabold">{end ? fmtDate(end) : '—'}</div>
      <div className="text-[10px] font-bold opacity-80">{days != null ? daysPhrase(days) : ''}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</div>
      <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 break-words">{value}</div>
    </div>
  );
}

function Box({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'slate' | 'cyan' | 'emerald' | 'rose' }) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200',
    cyan: 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/30 text-cyan-700 dark:text-cyan-300',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
    rose: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300',
  };
  return (
    <div className={`rounded-xl border px-2.5 py-2 ${tones[tone]}`}>
      <div className="text-[9px] font-extrabold uppercase tracking-wider opacity-75">{label}</div>
      <div className="text-sm font-extrabold tabular-nums truncate">{value}</div>
    </div>
  );
}

function SerialTeacher({ onClose }: { onClose: () => void }) {
  return (
    <Teacher
      title="Serial Register Kyun Zaroori Hai?"
      intro={
        <>
          Appliance me serial sirf ek number nahi. Usi se pata chalta hai ke <strong>ye unit kab aaya,
          kis ko bika, kab laga, kitni warranty baqi hai</strong> aur is par ab tak kitna kharcha aaya.
        </>
      }
      blocks={[
        {
          title: '📦 Shipment aate hi daal dein',
          tone: 'cyan',
          tips: [
            <><strong>"Shipment Add"</strong> (<Kbd dark>N</Kbd>) — 20 AC ke serial ek sath copy-paste karein, har ek nayi line par</>,
            <><strong>Warranty ki tareekhein khud lag jati hain</strong> — product profile me jitne mahine likhe hain, purchase date se ginn kar</>,
            <>Jo serial pehle se register hon wo <strong>khud chhut jate hain</strong> — dobara entry ka dar nahi</>,
            <><strong>Batch aur supplier ref</strong> likhein — agar poora batch kharab nikle to sab dhoondna asaan ho jata hai</>,
          ],
        },
        {
          title: '🛡️ Teen warranty — appliance ka khaas masla',
          tone: 'emerald',
          tips: [
            <><strong>Main warranty</strong> aam tor par 1 saal, <strong>compressor</strong> 5–10 saal, <strong>motor</strong> 2–5 saal</>,
            <>Customer aaye to serial daal kar dekh lein — <strong>kaun si warranty chal rahi hai</strong></>,
            <>Agar compressor warranty me hai lekin main khatam, to <strong>compressor free, baqi paid</strong></>,
            <><strong>"Warranty Card"</strong> — A5 par card nikalta hai jo customer ko diya jata hai, teenon tareekhon ke sath</>,
          ],
        },
        {
          title: '📜 Har unit ka poora safar',
          tone: 'violet',
          tips: [
            <>Kisi bhi serial par click karein — <strong>stock me aane se le kar aaj tak</strong> sab kuch nazar aata hai</>,
            <><strong>"Service ka kharcha"</strong> — is unit par ab tak kitna kharch hua. Warranty wale repair dukaan ke kandhe par hote hain</>,
            <>Neeche <strong>asal munafa</strong> likha hota hai — bechne ka rate minus lagat minus service ka kharcha</>,
            <>Agar ek unit par <strong>2 se ziyada repair</strong> ho chuke hain to system tanbeeh de deta hai</>,
          ],
        },
      ]}
      shortcuts={[
        { keys: '/', label: 'Search' },
        { keys: 'N', label: 'Shipment add' },
        { keys: 'P', label: 'Print' },
        { keys: 'T', label: 'Ye guide' },
      ]}
      golden={
        <>
          <strong>Sunahri usool:</strong> Serial <strong>bechne se pehle</strong> register karein, baad me nahi.
          Warranty ka jhagra hamesha usi unit par hota hai jiska record nahi hota.
        </>
      }
      onClose={onClose}
    />
  );
}
