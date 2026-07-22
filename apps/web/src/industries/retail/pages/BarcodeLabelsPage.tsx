import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Barcode, Plus, Printer, Trash2, Search, X, Package,
  Sparkles, RefreshCw, Layers, CheckCircle2, Clock,
  FileText, Eye, Save,
} from 'lucide-react';
import { barcodeLabelsApi, type BarcodeLabelBatch, type BarcodeLabelItem } from '../api/barcode-labels.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { formatPKR } from '@core/lib/format';
import { Button } from '@core/ui/Button';
import { toast } from 'sonner';

const LAYOUTS = [
  { value: '30_per_sheet', label: '30 per sheet (A4)', cols: 3, rows: 10 },
  { value: '40_per_sheet', label: '40 per sheet (A4)', cols: 4, rows: 10 },
  { value: '24_per_sheet', label: '24 per sheet (A4)', cols: 3, rows: 8 },
  { value: 'thermal_58mm', label: 'Thermal 58mm', cols: 1, rows: 100 },
];

export default function BarcodeLabelsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [printBatch, setPrintBatch] = useState<BarcodeLabelBatch | null>(null);

  const { data: batches = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['barcode-batches'],
    queryFn: () => barcodeLabelsApi.list(),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => barcodeLabelsApi.remove(id),
    onSuccess: () => {
      toast.success('Batch deleted');
      queryClient.invalidateQueries({ queryKey: ['barcode-batches'] });
    },
  });

  const openPrint = async (batchId: string) => {
    const full = await barcodeLabelsApi.getOne(batchId);
    setPrintBatch(full);
  };

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-purple-900 to-fuchsia-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-purple-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Barcode Labels
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              🏷️ Print Labels
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              A4 sheets ya thermal — sab products ke labels ek saath
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20"
            >
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button
              className="bg-white text-slate-900 hover:bg-slate-100"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-4 w-4" />
              New Batch
            </Button>
          </div>
        </div>
      </section>

      {showForm && (
        <BarcodeBatchForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ['barcode-batches'] });
          }}
        />
      )}

      {/* BATCHES */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : batches.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <div className="h-20 w-20 rounded-3xl bg-purple-100 dark:bg-purple-950/40 mx-auto flex items-center justify-center">
            <Barcode className="h-10 w-10 text-purple-600" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">No label batches</h3>
          <p className="mt-1 text-sm text-slate-500 font-semibold">
            Naya batch banao — products ke barcode labels print karo
          </p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map((b) => (
            <div key={b.id} className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 p-4 shadow-sm hover:shadow-lg transition">
              <div className="flex items-start justify-between gap-2">
                <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center">
                  <Barcode className="h-6 w-6 text-purple-600" />
                </div>
                {b.printedAt ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-1">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    Printed
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-600 text-[9px] font-extrabold uppercase inline-flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    New
                  </span>
                )}
              </div>

              <h4 className="mt-3 font-extrabold text-slate-900 dark:text-white truncate">{b.name}</h4>
              <div className="mt-1 text-xs text-slate-500 font-semibold">
                {b.totalLabels} labels • {LAYOUTS.find((l) => l.value === b.layout)?.label || b.layout}
              </div>

              <div className="mt-3 flex gap-1">
                <button
                  onClick={() => openPrint(b.id)}
                  className="flex-1 h-9 rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-700 text-white text-xs font-extrabold inline-flex items-center justify-center gap-1"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete "' + b.name + '"?')) removeMutation.mutate(b.id);
                  }}
                  className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 flex items-center justify-center"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {printBatch && <PrintPreview batch={printBatch} onClose={() => setPrintBatch(null)} />}
    </div>
  );
}

function BarcodeBatchForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('Labels batch — ' + new Date().toLocaleDateString());
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
    queryFn: () => productsApi.list({ page: 1, limit: 30, search: productSearch || undefined }),
  });

  const products = productsData?.items ?? [];

  const addProduct = (p: any, qty = 1) => {
    const existing = selectedItems.find((i) => i.productId === p.id);
    if (existing) {
      setSelectedItems(selectedItems.map((i) => i.productId === p.id ? { ...i, quantity: i.quantity + qty } : i));
    } else {
      setSelectedItems([...selectedItems, { productId: p.id, quantity: qty, product: p }]);
    }
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setSelectedItems(selectedItems.filter((i) => i.productId !== productId));
    } else {
      setSelectedItems(selectedItems.map((i) => i.productId === productId ? { ...i, quantity: qty } : i));
    }
  };

  const saveMutation = useMutation({
    mutationFn: () => barcodeLabelsApi.create({
      name,
      layout,
      ...options,
      items: selectedItems.map(({ product, ...rest }) => rest),
    }),
    onSuccess: () => {
      toast.success('Batch created');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const totalLabels = selectedItems.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-purple-300 dark:border-purple-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-purple-50 dark:bg-purple-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">New Label Batch</h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-neutral-800 flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-5 grid lg:grid-cols-2 gap-5">
        {/* LEFT */}
        <div className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Batch Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Layout</label>
            <select
              value={layout}
              onChange={(e) => setLayout(e.target.value)}
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-purple-500"
            >
              {LAYOUTS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-2 block">Show on Label</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'includeName', label: 'Product Name' },
                { key: 'includePrice', label: 'Price' },
                { key: 'includeShop', label: 'Shop Name' },
                { key: 'includeMrp', label: 'MRP' },
              ].map((opt) => (
                <label key={opt.key} className="flex items-center gap-2 p-2.5 rounded-xl border-2 border-slate-200 dark:border-neutral-700 cursor-pointer hover:border-purple-300">
                  <input
                    type="checkbox"
                    checked={(options as any)[opt.key]}
                    onChange={(e) => setOptions({ ...options, [opt.key]: e.target.checked })}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Add Products</label>
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products..."
                className="h-10 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="mt-2 max-h-64 overflow-y-auto space-y-1">
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addProduct(p, 1)}
                  className="w-full px-3 py-2 flex items-center gap-3 rounded-lg hover:bg-slate-50 dark:hover:bg-neutral-800 transition text-left"
                >
                  <Package className="h-4 w-4 text-slate-400" />
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-sm truncate text-slate-900 dark:text-white">{p.name}</div>
                    <div className="text-xs text-slate-500 font-semibold font-mono">
                      {p.barcode || p.sku || 'No barcode'} • {formatPKR(p.price)}
                    </div>
                  </div>
                  <Plus className="h-4 w-4 text-purple-600" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — selected items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600">
              Selected ({selectedItems.length} products, {totalLabels} labels)
            </label>
            {selectedItems.length > 0 && (
              <button
                onClick={() => setSelectedItems([])}
                className="text-xs font-extrabold text-rose-600 hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="rounded-xl border-2 border-slate-200 dark:border-neutral-700 max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-neutral-800">
            {selectedItems.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500 font-semibold">
                Left side se products add karo
              </div>
            ) : (
              selectedItems.map((item) => (
                <div key={item.productId} className="p-2 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                    <Package className="h-4 w-4 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-extrabold truncate text-slate-900 dark:text-white">
                      {item.product?.name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      {item.product?.barcode || item.product?.sku || 'No barcode'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(item.productId, item.quantity - 1)}
                      className="h-7 w-7 rounded-md bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 text-slate-700 font-extrabold"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateQty(item.productId, Number(e.target.value))}
                      className="h-7 w-14 text-center rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-extrabold"
                    />
                    <button
                      onClick={() => updateQty(item.productId, item.quantity + 1)}
                      className="h-7 w-7 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-extrabold"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="px-5 py-3 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between gap-2">
        <div className="text-xs font-extrabold text-slate-600">
          Total: <span className="text-purple-700 tabular-nums">{totalLabels} labels</span>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-gradient-to-r from-purple-600 to-fuchsia-700"
            onClick={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
            disabled={selectedItems.length === 0}
          >
            <Save className="h-4 w-4" />
            Save Batch
          </Button>
        </div>
      </div>
    </div>
  );
}

function PrintPreview({ batch, onClose }: { batch: BarcodeLabelBatch; onClose: () => void }) {
  const queryClient = useQueryClient();
  const items = batch.enrichedItems || [];

  // Expand items to individual labels
  const labels: any[] = [];
  items.forEach((item) => {
    for (let i = 0; i < item.quantity; i++) {
      labels.push(item);
    }
  });

  const layoutCfg = LAYOUTS.find((l) => l.value === batch.layout) || LAYOUTS[0];

  const markPrinted = async () => {
    await barcodeLabelsApi.markPrinted(batch.id);
    queryClient.invalidateQueries({ queryKey: ['barcode-batches'] });
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 print:bg-white print:p-0">
      <div className="w-full max-w-5xl bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col print:max-h-none print:rounded-none print:shadow-none">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between print:hidden">
          <h3 className="font-extrabold text-slate-900 dark:text-white">{batch.name}</h3>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Close</Button>
            <Button className="bg-gradient-to-r from-purple-600 to-fuchsia-700" onClick={markPrinted}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-neutral-950 print:bg-white print:p-0">
          <div
            className="mx-auto bg-white shadow-md print:shadow-none"
            style={{ width: '210mm', minHeight: '297mm', padding: '10mm' }}
          >
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: 'repeat(' + layoutCfg.cols + ', 1fr)' }}
            >
              {labels.map((item, i) => (
                <LabelCell key={i} item={item} options={batch} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 8mm; }
          body * { visibility: hidden; }
          .print-visible, .print-visible * { visibility: visible; }
        }
      `}</style>
    </div>
  );
}

function LabelCell({ item, options }: { item: any; options: any }) {
  const p = item.product;
  const barcodeValue = p?.barcode || p?.sku || p?.id?.slice(-8) || '';
  const price = item.customPrice ?? p?.price ?? 0;

  return (
    <div className="border border-slate-300 p-2 text-center text-black" style={{ minHeight: '30mm' }}>
      {options.includeShop && (
        <div className="text-[8px] font-extrabold uppercase text-slate-700 truncate">
          {/* Shop name will show */}
          MY SHOP
        </div>
      )}
      {options.includeName && (
        <div className="text-[10px] font-bold mt-0.5 leading-tight line-clamp-2">
          {p?.name || 'Product'}
        </div>
      )}
      <div className="my-1 font-mono text-[11px] font-extrabold tracking-widest">
        <div className="h-8 flex items-center justify-center">
          {/* Barcode visual — using CSS lines pattern */}
          <div className="flex gap-[1px] items-end h-full">
            {Array.from({ length: 30 }).map((_, i) => (
              <div
                key={i}
                className="bg-black"
                style={{
                  width: (i % 3 === 0 ? '2px' : '1px'),
                  height: (i % 2 === 0 ? '100%' : '80%'),
                }}
              />
            ))}
          </div>
        </div>
        <div className="text-[9px] mt-0.5">{barcodeValue}</div>
      </div>
      {options.includePrice && (
        <div className="text-sm font-extrabold text-black">
          Rs {price.toLocaleString()}
        </div>
      )}
      {options.includeMrp && p?.mrpPrice && (
        <div className="text-[8px] text-slate-600 line-through">
          MRP {p.mrpPrice.toLocaleString()}
        </div>
      )}
    </div>
  );
}
