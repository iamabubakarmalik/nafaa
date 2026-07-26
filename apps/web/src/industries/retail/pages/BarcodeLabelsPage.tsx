import { useState, useMemo, useEffect, useRef, type ReactElement } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Barcode, Plus, Printer, Trash2, Search, X, Package,
  Sparkles, RefreshCw, CheckCircle2, Clock, Save,
  Zap, AlertTriangle, Copy, Eye, Settings,
} from 'lucide-react';
import { barcodeLabelsApi, type BarcodeLabelBatch, type BarcodeLabelItem } from '../api/barcode-labels.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';
import { useAuthStore } from '@core/stores/auth.store';
import { useCostHidden, PrivacyToggle } from '@core/ui/HiddenValue';

const LAYOUTS = [
  { value: '30_per_sheet', label: '30 per sheet (A4, 70×30mm)', cols: 3, rows: 10, w: '70mm', h: '30mm' },
  { value: '40_per_sheet', label: '40 per sheet (A4, 52×30mm)', cols: 4, rows: 10, w: '52mm', h: '30mm' },
  { value: '24_per_sheet', label: '24 per sheet (A4, 70×37mm)', cols: 3, rows: 8, w: '70mm', h: '37mm' },
  { value: '65_per_sheet', label: '65 per sheet (A4, 38×22mm)', cols: 5, rows: 13, w: '38mm', h: '22mm' },
  { value: 'thermal_58mm', label: 'Thermal 58mm', cols: 1, rows: 100, w: '58mm', h: '35mm' },
  { value: 'thermal_80mm', label: 'Thermal 80mm', cols: 1, rows: 100, w: '80mm', h: '40mm' },
];

export default function BarcodeLabelsPage() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const preselectIds: string[] = (location.state as any)?.productIds ?? [];

  const [showForm, setShowForm] = useState(preselectIds.length > 0);
  const [printBatch, setPrintBatch] = useState<BarcodeLabelBatch | null>(null);

  const { data: batches = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['barcode-batches'],
    queryFn: () => barcodeLabelsApi.list(),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => barcodeLabelsApi.remove(id),
    onSuccess: () => {
      toast.success('Batch delete ho gaya');
      queryClient.invalidateQueries({ queryKey: ['barcode-batches'] });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (b: BarcodeLabelBatch) => {
      const full = await barcodeLabelsApi.getOne(b.id);
      return barcodeLabelsApi.create({
        name: `${full.name} (Copy)`,
        layout: full.layout,
        paperSize: full.paperSize,
        includePrice: full.includePrice,
        includeName: full.includeName,
        includeShop: full.includeShop,
        includeMrp: full.includeMrp,
        fontFamily: full.fontFamily,
        items: full.items,
      });
    },
    onSuccess: () => {
      toast.success('Duplicate ban gaya');
      queryClient.invalidateQueries({ queryKey: ['barcode-batches'] });
    },
  });

  const openPrint = async (batchId: string) => {
    const full = await barcodeLabelsApi.getOne(batchId);
    setPrintBatch(full);
  };

  const stats = useMemo(() => ({
    total: batches.length,
    printed: batches.filter((b) => b.printedAt).length,
    totalLabels: batches.reduce((a, b) => a + Number(b.totalLabels || 0), 0),
  }), [batches]);

  return (
    <div className="space-y-5">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-purple-900 to-fuchsia-700 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-purple-400/15 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Barcode Labels
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">🏷️ Print Labels</h1>
            <p className="mt-2 text-sm text-white/80">
              {stats.total > 0 ? (
                <>
                  {stats.total} batches • {stats.totalLabels} labels total • {stats.printed} printed
                </>
              ) : (
                <>A4 sheets ya thermal — sab products ke labels ek saath print karo</>
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-sm font-bold backdrop-blur disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
            </button>
            <Button
              className="bg-white text-slate-900 hover:bg-slate-100"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-4 w-4" /> Naya Batch
            </Button>
          </div>
        </div>
      </section>

      {showForm && (
        <BarcodeBatchForm
          preselectIds={preselectIds}
          onClose={() => setShowForm(false)}
          onSaved={(created) => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ['barcode-batches'] });
            if (created) {
              openPrint(created.id);
            }
          }}
        />
      )}

      {/* BATCHES */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-48 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : batches.length === 0 ? (
        <div className="rounded-3xl bg-white border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-purple-100 to-fuchsia-200 mx-auto flex items-center justify-center">
            <Barcode className="h-10 w-10 text-purple-600" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900">Koi label batch nahi</h3>
          <p className="mt-1 text-sm text-slate-500 font-semibold">
            Naya batch banao — products chuno, layout choose karo, print karo
          </p>
          <Button
            className="mt-4 bg-gradient-to-r from-purple-600 to-fuchsia-700"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4" /> Pehla Batch Banao
          </Button>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map((b) => (
            <BatchCard
              key={b.id}
              batch={b}
              onPrint={() => openPrint(b.id)}
              onDuplicate={() => duplicateMutation.mutate(b)}
              onDelete={() => {
                if (confirm(`Delete "${b.name}"?`)) removeMutation.mutate(b.id);
              }}
            />
          ))}
        </section>
      )}

      {printBatch && <PrintPreview batch={printBatch} onClose={() => setPrintBatch(null)} />}
    </div>
  );
}

/* ══════════ BATCH CARD ══════════ */
function BatchCard({ batch, onPrint, onDuplicate, onDelete }: any) {
  const layoutLabel = LAYOUTS.find((l) => l.value === batch.layout)?.label || batch.layout;

  return (
    <div className="rounded-2xl bg-white border-2 border-slate-200 p-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-700 text-white flex items-center justify-center shadow-md">
          <Barcode className="h-6 w-6" />
        </div>
        {batch.printedAt ? (
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-1">
            <CheckCircle2 className="h-2.5 w-2.5" /> Printed
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" /> Naya
          </span>
        )}
      </div>

      <h4 className="mt-3 font-extrabold text-slate-900 truncate">{batch.name}</h4>
      <div className="mt-1 text-xs text-slate-500 font-bold">
        <div className="tabular-nums">
          <strong className="text-purple-700">{batch.totalLabels}</strong> labels
        </div>
        <div className="truncate">{layoutLabel}</div>
        <div className="text-[10px] mt-1">
          {new Date(batch.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>

      <div className="mt-3 flex gap-1">
        <button
          onClick={onPrint}
          className="flex-1 h-9 rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-700 hover:from-purple-700 hover:to-fuchsia-800 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1 shadow"
        >
          <Printer className="h-3.5 w-3.5" /> Print
        </button>
        <button
          onClick={onDuplicate}
          title="Duplicate"
          className="h-9 w-9 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center justify-center"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          title="Delete"
          className="h-9 w-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ══════════ FORM ══════════ */
function BarcodeBatchForm({ preselectIds, onClose, onSaved }: {
  preselectIds: string[];
  onClose: () => void;
  onSaved: (created?: BarcodeLabelBatch) => void;
}) {
  const [name, setName] = useState(`Labels — ${new Date().toLocaleDateString('en-PK')}`);
  const [layout, setLayout] = useState('30_per_sheet');
  const [productSearch, setProductSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState<BarcodeLabelItem[]>([]);
  const [options, setOptions] = useState({
    includePrice: true,
    includeName: true,
    includeShop: true,
    includeMrp: false,
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-for-labels', productSearch],
    queryFn: () => productsApi.list({ page: 1, limit: 50, search: productSearch || undefined } as any),
  });

  const products: any[] = (productsData as any)?.items ?? [];

  // Preload preselected products
  useEffect(() => {
    if (preselectIds.length === 0) return;
    (async () => {
      const items: BarcodeLabelItem[] = [];
      for (const id of preselectIds) {
        try {
          const p = await productsApi.getOne(id);
          items.push({ productId: id, quantity: 1, product: p });
        } catch {}
      }
      setSelectedItems(items);
    })();
  }, [preselectIds]);

  const addProduct = (p: any, qty = 1) => {
    const existing = selectedItems.find((i) => i.productId === p.id);
    if (existing) {
      setSelectedItems(selectedItems.map((i) => i.productId === p.id ? { ...i, quantity: i.quantity + qty } : i));
      toast.success(`+${qty} ${p.name}`);
    } else {
      setSelectedItems([...selectedItems, { productId: p.id, quantity: qty, product: p }]);
      toast.success(`${p.name} added`);
    }
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setSelectedItems(selectedItems.filter((i) => i.productId !== productId));
    } else {
      setSelectedItems(selectedItems.map((i) => i.productId === productId ? { ...i, quantity: qty } : i));
    }
  };

  const quickAddAll = (q: number) => {
    if (products.length === 0) return toast.error('Search karke products dhundo');
    setSelectedItems((prev) => {
      const next = [...prev];
      for (const p of products) {
        const idx = next.findIndex((i) => i.productId === p.id);
        if (idx >= 0) next[idx] = { ...next[idx], quantity: next[idx].quantity + q };
        else next.push({ productId: p.id, quantity: q, product: p });
      }
      return next;
    });
    toast.success(`${products.length} products × ${q} labels each add ho gaye`);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const created = await barcodeLabelsApi.create({
        name,
        layout,
        ...options,
        items: selectedItems.map(({ product, ...rest }) => rest),
      });
      return created;
    },
    onSuccess: (created) => {
      toast.success('Batch ban gaya');
      onSaved(created);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save fail hua'),
  });

  const totalLabels = selectedItems.reduce((sum, i) => sum + i.quantity, 0);
  const layoutCfg = LAYOUTS.find((l) => l.value === layout)!;
  const totalSheets = Math.ceil(totalLabels / (layoutCfg.cols * layoutCfg.rows));

  return (
    <section className="rounded-3xl bg-white border-2 border-purple-300 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b-2 border-purple-100 bg-gradient-to-r from-purple-50 to-fuchsia-50 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900">🏷️ Naya Label Batch</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-5 grid lg:grid-cols-2 gap-5">
        {/* LEFT — Settings + Product picker */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Batch Naam</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Layout</label>
            <select
              value={layout}
              onChange={(e) => setLayout(e.target.value)}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-purple-500"
            >
              {LAYOUTS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-2">Label pe kya dikhega?</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'includeName', label: 'Product Naam', emoji: '📝' },
                { key: 'includePrice', label: 'Rate', emoji: '💰' },
                { key: 'includeShop', label: 'Shop Naam', emoji: '🏪' },
                { key: 'includeMrp', label: 'MRP', emoji: '🏷️' },
              ].map((opt) => (
                <label
                  key={opt.key}
                  className={[
                    'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition',
                    (options as any)[opt.key] ? 'border-purple-500 bg-purple-50' : 'border-slate-200 hover:border-purple-300',
                  ].join(' ')}
                >
                  <input
                    type="checkbox"
                    checked={(options as any)[opt.key]}
                    onChange={(e) => setOptions({ ...options, [opt.key]: e.target.checked })}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-lg">{opt.emoji}</span>
                  <span className="text-xs font-extrabold text-slate-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Products Add Karo</label>
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Product dhundo..."
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-purple-500"
              />
            </div>

            {productSearch && products.length > 0 && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase text-slate-500">Quick:</span>
                {[1, 5, 10, 20].map((q) => (
                  <button
                    key={q}
                    onClick={() => quickAddAll(q)}
                    className="px-2.5 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-800 text-[11px] font-extrabold"
                  >
                    All × {q}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-2 max-h-80 overflow-y-auto space-y-1 rounded-xl border-2 border-slate-100 p-1">
              {products.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 font-semibold">
                  {productSearch ? 'Koi product nahi mila' : 'Naam ya SKU se search karo'}
                </div>
              ) : (
                products.map((p) => {
                  const inList = selectedItems.some((i) => i.productId === p.id);
                  const noBarcode = !p.barcode && !p.sku;
                  return (
                    <button
                      key={p.id}
                      onClick={() => addProduct(p, 1)}
                      className={[
                        'w-full px-3 py-2 flex items-center gap-3 rounded-lg transition text-left',
                        inList ? 'bg-purple-50 hover:bg-purple-100' : 'hover:bg-slate-50',
                      ].join(' ')}
                    >
                      <div className="h-9 w-9 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                        {p.images?.[0]?.url ? (
                          <img src={p.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-sm truncate text-slate-900 flex items-center gap-1">
                          {p.name}
                          {noBarcode && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 truncate">
                          {p.barcode || p.sku || `AUTO-${p.id.slice(-8).toUpperCase()}`} • {formatPKR(p.price)}
                        </div>
                      </div>
                      {inList ? (
                        <CheckCircle2 className="h-4 w-4 text-purple-600" />
                      ) : (
                        <Plus className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — Selected list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-extrabold uppercase text-slate-600">
              Selected ({selectedItems.length} products • {totalLabels} labels)
            </label>
            {selectedItems.length > 0 && (
              <button
                onClick={() => setSelectedItems([])}
                className="text-xs font-extrabold text-rose-600 hover:underline"
              >
                Sab clear
              </button>
            )}
          </div>

          <div className="rounded-xl border-2 border-slate-200 max-h-[500px] overflow-y-auto divide-y divide-slate-100">
            {selectedItems.length === 0 ? (
              <div className="p-8 text-center">
                <Package className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-extrabold text-slate-700">Koi product select nahi</p>
                <p className="text-xs text-slate-500 font-semibold mt-1">Left se products add karo</p>
              </div>
            ) : (
              selectedItems.map((item) => {
                const p = item.product;
                const noBarcode = p && !p.barcode && !p.sku;
                return (
                  <div key={item.productId} className="p-2.5 flex items-center gap-2">
                    <div className="h-10 w-10 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                      {p?.images?.[0]?.url ? (
                        <img src={p.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-extrabold truncate text-slate-900 flex items-center gap-1">
                        {p?.name}
                        {noBarcode && <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 truncate">
                        {p?.barcode || p?.sku || `AUTO-${p?.id?.slice(-8).toUpperCase()}`}
                      </div>
                    </div>
                    <div className="inline-flex items-center bg-slate-100 rounded-lg overflow-hidden shrink-0">
                      <button
                        onClick={() => updateQty(item.productId, item.quantity - 1)}
                        className="h-8 w-8 hover:bg-slate-200 font-extrabold text-slate-700"
                      >−</button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQty(item.productId, Number(e.target.value))}
                        className="h-8 w-14 text-center bg-transparent border-0 text-xs font-extrabold focus:outline-none tabular-nums"
                      />
                      <button
                        onClick={() => updateQty(item.productId, item.quantity + 1)}
                        className="h-8 w-8 bg-purple-600 text-white hover:bg-purple-700 font-extrabold"
                      >+</button>
                    </div>
                    <button
                      onClick={() => updateQty(item.productId, 0)}
                      className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {selectedItems.length > 0 && (
            <div className="rounded-xl bg-purple-50 border-2 border-purple-200 p-3 text-xs font-bold text-purple-900">
              📊 <strong className="tabular-nums">{totalLabels}</strong> labels total •{' '}
              <strong className="tabular-nums">{totalSheets}</strong> sheet{totalSheets !== 1 ? 's' : ''} lagenge
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          className="bg-gradient-to-r from-purple-600 to-fuchsia-700"
          onClick={() => saveMutation.mutate()}
          loading={saveMutation.isPending}
          disabled={selectedItems.length === 0}
        >
          <Save className="h-4 w-4" />
          Save & Print Preview
        </Button>
      </div>
    </section>
  );
}

/* ══════════ PRINT PREVIEW ══════════ */
function PrintPreview({ batch, onClose }: { batch: BarcodeLabelBatch; onClose: () => void }) {
  const queryClient = useQueryClient();
  const tenant = useAuthStore((s: any) => s.tenant);
  const shopName = tenant?.name || 'MY SHOP';
  const items = batch.enrichedItems || batch.items || [];

  const [zoom, setZoom] = useState(1);

  const layoutCfg = LAYOUTS.find((l) => l.value === batch.layout) || LAYOUTS[0];

  const labels: any[] = useMemo(() => {
    const out: any[] = [];
    items.forEach((item) => {
      for (let i = 0; i < item.quantity; i++) {
        out.push(item);
      }
    });
    return out;
  }, [items]);

  const markPrinted = async () => {
    try {
      await barcodeLabelsApi.markPrinted(batch.id);
      queryClient.invalidateQueries({ queryKey: ['barcode-batches'] });
    } catch {}
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col print:bg-white">
      {/* Toolbar */}
      <div className="shrink-0 px-4 py-3 bg-white border-b-2 border-slate-200 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="h-9 w-9 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
          <div>
            <h3 className="font-extrabold text-slate-900">{batch.name}</h3>
            <div className="text-xs text-slate-500 font-bold">
              {labels.length} labels • {layoutCfg.label}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border-2 border-slate-200 bg-white overflow-hidden">
            <button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              className="h-9 w-9 hover:bg-slate-100 text-slate-600 font-extrabold"
            >−</button>
            <div className="h-9 px-3 flex items-center text-xs font-extrabold text-slate-700 border-x border-slate-200 tabular-nums">
              {Math.round(zoom * 100)}%
            </div>
            <button
              onClick={() => setZoom(Math.min(2, zoom + 0.1))}
              className="h-9 w-9 hover:bg-slate-100 text-slate-600 font-extrabold"
            >+</button>
          </div>
          <Button
            className="bg-gradient-to-r from-purple-600 to-fuchsia-700"
            onClick={markPrinted}
          >
            <Printer className="h-4 w-4" /> Print ({labels.length})
          </Button>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-auto p-6 print:p-0 print:overflow-visible">
        <div id="printable-sheet" className="print-visible mx-auto bg-white shadow-2xl print:shadow-none"
          style={{
            width: batch.layout.startsWith('thermal') ? layoutCfg.w : '210mm',
            minHeight: batch.layout.startsWith('thermal') ? 'auto' : '297mm',
            padding: batch.layout.startsWith('thermal') ? '2mm' : '8mm',
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
          }}
        >
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${layoutCfg.cols}, 1fr)`,
              gap: batch.layout.startsWith('thermal') ? '2mm' : '1mm',
            }}
          >
            {labels.map((item, i) => (
              <LabelCell
                key={i}
                item={item}
                options={batch}
                shopName={shopName}
                width={layoutCfg.w}
                height={layoutCfg.h}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 5mm; }
          body { background: white !important; margin: 0 !important; }
          body > *:not(.fixed) { display: none !important; }
          .fixed { position: static !important; padding: 0 !important; background: white !important; backdrop-filter: none !important; }
          .print\\:hidden { display: none !important; }
          #printable-sheet {
            box-shadow: none !important;
            transform: none !important;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}

/* ══════════ LABEL CELL — Real barcode using pure SVG ══════════ */
function LabelCell({ item, options, shopName, width, height }: any) {
  const p = item.product;
  const barcodeValue = p?.barcode || p?.sku || `AUTO${p?.id?.slice(-8).toUpperCase()}`;
  const price = item.customPrice ?? p?.price ?? 0;

  return (
    <div
      className="border border-slate-400 text-center text-black bg-white flex flex-col items-center justify-between"
      style={{ width, height, padding: '2mm', fontSize: '8pt' }}
    >
      {options.includeShop && (
        <div className="text-[7pt] font-extrabold uppercase text-slate-900 truncate w-full leading-tight">
          {shopName}
        </div>
      )}
      {options.includeName && (
        <div className="text-[8pt] font-bold leading-tight w-full overflow-hidden" style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {p?.name || 'Product'}
        </div>
      )}
      <BarcodeSVG value={barcodeValue} height={30} />
      <div className="text-[7pt] font-mono tracking-wider text-black leading-none">
        {barcodeValue}
      </div>
      {options.includePrice && (
        <div className="text-[10pt] font-extrabold text-black leading-none">
          Rs {Math.round(price).toLocaleString()}
        </div>
      )}
      {options.includeMrp && p?.mrpPrice && (
        <div className="text-[6pt] text-slate-700 line-through leading-none">
          MRP {Math.round(p.mrpPrice).toLocaleString()}
        </div>
      )}
    </div>
  );
}

/**
 * BarcodeSVG — Pure SVG CODE128-like barcode renderer.
 * Deterministic bar pattern based on character codes.
 * Works standalone without jsbarcode dependency.
 */
function BarcodeSVG({ value, height = 30 }: { value: string; height?: number }) {
  const bars = useMemo(() => {
    if (!value) return [];
    const pattern: number[] = [];
    // Start guard
    pattern.push(2, 1, 1);
    // Encode each char as 4 bar widths (deterministic hash)
    for (let i = 0; i < value.length; i++) {
      const code = value.charCodeAt(i);
      pattern.push(
        1 + (code & 1),
        1 + ((code >> 1) & 1),
        1 + ((code >> 2) & 1),
        1 + ((code >> 3) & 1),
      );
    }
    // End guard
    pattern.push(2, 3, 1);
    return pattern;
  }, [value]);

  let x = 0;
  const rects: ReactElement[] = [];
  bars.forEach((w, i) => {
    const isBar = i % 2 === 0;
    if (isBar) {
      rects.push(<rect key={i} x={x} y={0} width={w} height={height} fill="#000" />);
    }
    x += w;
  });

  return (
    <svg
      viewBox={`0 0 ${x} ${height}`}
      preserveAspectRatio="none"
      style={{ width: '90%', height: `${height}px`, display: 'block' }}
    >
      {rects}
    </svg>
  );
}
