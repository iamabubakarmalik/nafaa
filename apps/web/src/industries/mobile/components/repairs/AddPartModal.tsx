import { useState, useMemo, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X, Package, Plus, Search, ScanLine, Info, AlertTriangle,
  TrendingUp, Percent, Boxes, Sparkles, Keyboard,
} from 'lucide-react';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { toast } from 'sonner';
import { repairsApi } from '../../api/repairs.api';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { formatPKR } from '@core/lib/format';

interface Props {
  ticketId: string;
  ticketNumber: string;
  onClose: () => void;
}

const SOURCES = [
  {
    val: 'OWN_STOCK',
    label: 'Own Stock',
    hint: 'Inventory se ghata',
    icon: Boxes,
    color: 'emerald',
  },
  {
    val: 'PURCHASED_FOR_REPAIR',
    label: 'Bahar se laaya',
    hint: 'Market purchase',
    icon: Package,
    color: 'blue',
  },
  {
    val: 'CUSTOMER_PROVIDED',
    label: 'Customer ne di',
    hint: 'Free part',
    icon: Sparkles,
    color: 'violet',
  },
];

const QUICK_MARGINS = [10, 15, 20, 25, 30, 40, 50];

export function AddPartModal({ ticketId, ticketNumber, onClose }: Props) {
  const queryClient = useQueryClient();
  const [source, setSource] = useState('OWN_STOCK');
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [partName, setPartName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitCost, setUnitCost] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '?' && e.shiftKey) setShowShortcuts((v) => !v);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const { data: productsData } = useQuery({
    queryKey: ['products-for-repair-part'],
    queryFn: () => productsApi.list({ page: 1, limit: 500 }),
    enabled: source === 'OWN_STOCK',
  });

  const filteredProducts = useMemo(() => {
    const list = productsData?.items ?? [];
    const q = productSearch.toLowerCase().trim();
    if (!q) return list.slice(0, 15);
    return list
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku || '').toLowerCase().includes(q) ||
          (p.barcode || '').includes(q),
      )
      .slice(0, 15);
  }, [productsData, productSearch]);

  const selectedProduct = productsData?.items.find((p) => p.id === selectedProductId);

  const qtyN = Number(quantity) || 0;
  const costN = Number(unitCost) || 0;
  const priceN = Number(unitPrice) || 0;
  const total = qtyN * priceN;
  const totalCost = qtyN * costN;
  const profit = total - totalCost;
  const marginPct = priceN > 0 && costN > 0 ? ((priceN - costN) / priceN) * 100 : 0;

  // Low stock warning
  const lowStockWarn =
    selectedProduct && source === 'OWN_STOCK' && qtyN > (selectedProduct.stock || 0);

  const applyMargin = (pct: number) => {
    if (!costN) return toast.error('Pehle unit cost daalo');
    const suggested = Math.round(costN / (1 - pct / 100));
    setUnitPrice(String(suggested));
    toast.success(`${pct}% margin lagaya: ${formatPKR(suggested)}`);
  };

  const mutation = useMutation({
    mutationFn: () =>
      repairsApi.addPart(ticketId, {
        productId: selectedProductId || undefined,
        partName: partName.trim() || selectedProduct?.name || '',
        partNumber: partNumber.trim() || undefined,
        quantity: qtyN,
        unitCost: costN,
        unitPrice: priceN,
        source,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Part add ho gaya ✅');
      queryClient.invalidateQueries({ queryKey: ['repair-ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['repair-tickets'] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const submit = () => {
    if (!partName.trim() && !selectedProduct) return toast.error('Part name required');
    if (qtyN <= 0) return toast.error('Quantity required');
    if (priceN <= 0) return toast.error('Unit price required');
    if (lowStockWarn) {
      if (!confirm(`Stock sirf ${selectedProduct?.stock} hai, aap ${qtyN} de rahay ho. Confirm?`))
        return;
    }
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-bold">
                Add Part / Spare
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">{ticketNumber}</h3>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowShortcuts((v) => !v)}
              className="h-9 w-9 rounded-xl hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center"
              title="Shortcuts (Shift+?)"
            >
              <Keyboard className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            </button>
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-xl hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center"
            >
              <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
            </button>
          </div>
        </div>

        {showShortcuts && (
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-4 flex-wrap">
              <span><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border font-mono">Esc</kbd> Close</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border font-mono">Shift+?</kbd> Toggle help</span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border font-mono">Ctrl+Enter</kbd> Save</span>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Source */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Part Source
            </label>
            <div className="grid grid-cols-3 gap-2">
              {SOURCES.map((s) => {
                const Icon = s.icon;
                const active = source === s.val;
                return (
                  <button
                    key={s.val}
                    type="button"
                    onClick={() => {
                      setSource(s.val);
                      if (s.val !== 'OWN_STOCK') {
                        setSelectedProductId('');
                        setProductSearch('');
                      }
                      if (s.val === 'CUSTOMER_PROVIDED') {
                        setUnitCost('0');
                        setUnitPrice('0');
                      }
                    }}
                    className={`p-3 rounded-xl border-2 text-xs font-bold transition ${
                      active
                        ? `bg-${s.color}-50 dark:bg-${s.color}-950/40 border-${s.color}-400 text-${s.color}-800 dark:text-${s.color}-200 shadow`
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="h-4 w-4 mx-auto mb-1" />
                    <div>{s.label}</div>
                    <div className="text-[9px] font-normal opacity-70 mt-0.5">{s.hint}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product link */}
          {source === 'OWN_STOCK' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Link to Inventory Product
              </label>
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setSelectedProductId('');
                  }}
                  placeholder="Naam, SKU, ya barcode se search karo..."
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white pl-9 pr-10 text-sm focus:outline-none focus:border-emerald-500"
                />
                <ScanLine className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
              {productSearch && !selectedProductId && filteredProducts.length > 0 && (
                <div className="mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700 shadow-lg">
                  {filteredProducts.map((p) => {
                    const threshold = (p as any).lowStockThreshold ?? (p as any).minStock ?? 5;
                    const low = (p.stock || 0) <= threshold;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedProductId(p.id);
                          setPartName(p.name);
                          setProductSearch(p.name);
                          setUnitCost(String(p.costPrice || ''));
                          setUnitPrice(String(p.price || ''));
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-sm transition"
                      >
                        <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center justify-between">
                          {p.name}
                          {low && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold">
                              LOW
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          Stock: <strong>{p.stock} {p.unit}</strong> · Cost:{' '}
                          {formatPKR(p.costPrice || 0)} · Price: {formatPKR(p.price || 0)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedProduct && (
                <div className="mt-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-2 flex items-center justify-between">
                  <div className="text-[11px] text-emerald-800 dark:text-emerald-200 font-bold">
                    ✓ {selectedProduct.name} — Stock: {selectedProduct.stock} {selectedProduct.unit}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedProductId('');
                      setProductSearch('');
                    }}
                    className="text-[10px] text-rose-600 hover:underline font-bold"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}

          {lowStockWarn && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-700 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900 dark:text-rose-200">
                <strong>Low stock warning:</strong> Sirf {selectedProduct?.stock} unit available hai,
                aap {qtyN} de rahay ho.
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <Input
              label="Part Name *"
              value={partName}
              onChange={(e) => setPartName(e.target.value)}
              placeholder="LCD Display, Battery..."
            />
            <Input
              label="Part Number"
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              placeholder="Brand part ID"
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <Input
              label="Quantity *"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <Input
              label="Unit Cost (PKR)"
              type="number"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
            />
            <Input
              label="Unit Price *"
              type="number"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="Customer rate"
            />
          </div>

          {/* Quick margin buttons */}
          {costN > 0 && (
            <div>
              <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5 flex items-center gap-1">
                <Percent className="h-3 w-3" /> Quick Margin
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_MARGINS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => applyMargin(m)}
                    className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950/40 hover:bg-blue-200 dark:hover:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-bold transition"
                  >
                    {m}%
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Live summary */}
          {total > 0 && (
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-200 dark:border-emerald-800 p-3 text-center">
                <div className="text-[9px] uppercase font-bold text-emerald-700 dark:text-emerald-300">Total</div>
                <div className="text-lg font-extrabold text-emerald-900 dark:text-emerald-100">
                  {formatPKR(total)}
                </div>
              </div>
              <div className="rounded-xl bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-200 dark:border-blue-800 p-3 text-center">
                <div className="text-[9px] uppercase font-bold text-blue-700 dark:text-blue-300">Profit</div>
                <div className={`text-lg font-extrabold ${profit >= 0 ? 'text-blue-900 dark:text-blue-100' : 'text-rose-700'}`}>
                  {formatPKR(profit)}
                </div>
              </div>
              <div className="rounded-xl bg-violet-50 dark:bg-violet-950/40 border-2 border-violet-200 dark:border-violet-800 p-3 text-center">
                <div className="text-[9px] uppercase font-bold text-violet-700 dark:text-violet-300 flex items-center justify-center gap-0.5">
                  <TrendingUp className="h-2.5 w-2.5" /> Margin
                </div>
                <div className="text-lg font-extrabold text-violet-900 dark:text-violet-100">
                  {marginPct.toFixed(1)}%
                </div>
              </div>
            </div>
          )}

          <Input
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
          />

          <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-2.5 text-[10px] text-slate-600 dark:text-slate-400 flex items-start gap-2">
            <Info className="h-3 w-3 flex-shrink-0 mt-0.5 text-blue-600" />
            <span>
              <strong>Tip:</strong> "Own Stock" par inventory automatically ghatega. "Customer Provided"
              par cost/price 0 rehta hai.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={submit}
            loading={mutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" /> Add Part
          </Button>
        </div>
      </div>
    </div>
  );
}
