import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X, Zap, Package, DollarSign, TrendingUp, Camera, Save,
  Sparkles, Tag, ArrowRight, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKRFull } from '@core/lib/format';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { forceRefreshProducts } from '@core/lib/offline/offlineProducts';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (product: any) => void;
  initialBarcode?: string;
}

const UNITS = [
  { v: 'pcs', l: 'Piece', e: '🔢' },
  { v: 'kg', l: 'Kilo', e: '⚖️' },
  { v: 'liter', l: 'Liter', e: '🥛' },
  { v: 'packet', l: 'Packet', e: '📦' },
  { v: 'bottle', l: 'Bottle', e: '🍶' },
  { v: 'dozen', l: 'Dozen', e: '🗳️' },
];

const MARKUPS = [10, 15, 20, 25, 30];

/**
 * QuickAddProductDrawer — POS pe scan kiya, product nahi mila? Yahin fatafat banao.
 * 30 second me pura product ready — naam + rate + stock. Tafseel baad me.
 */
export function QuickAddProductDrawer({ open, onClose, onCreated, initialBarcode = '' }: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState(initialBarcode);
  const [unit, setUnit] = useState('pcs');
  const [cost, setCost] = useState<number | ''>('');
  const [sale, setSale] = useState<number | ''>('');
  const [stock, setStock] = useState<number | ''>('');
  const [categoryId, setCategoryId] = useState('');
  const [scan, setScan] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  const { data: cats = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list, enabled: open });

  const create = useMutation({
    mutationFn: () => productsApi.create({
      name: name.trim(),
      barcode: barcode.trim() || undefined,
      unit,
      costPrice: Number(cost || 0),
      price: Number(sale || 0),
      stock: Number(stock || 0),
      categoryId: categoryId || undefined,
      isActive: true,
      isFeatured: false,
    } as any),
    onSuccess: (p: any) => {
      toast.success(`"${p.name}" ban gaya — POS me bhi mil jayega`);
      queryClient.invalidateQueries({ queryKey: ['retail-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      forceRefreshProducts().catch(() => {});
      onCreated?.(p);
      reset(); onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Nahi bana'),
  });

  const reset = () => {
    setName(''); setBarcode(''); setUnit('pcs');
    setCost(''); setSale(''); setStock(''); setCategoryId('');
    setAdvanced(false);
  };

  const applyMarkup = (pct: number) => {
    if (!cost) return toast.error('Pehle kharid rate likhein');
    setSale(Math.round(Number(cost) * (1 + pct / 100)));
  };

  const canSave = name.trim().length > 0 && Number(sale) > 0;
  const profit = Number(sale || 0) - Number(cost || 0);
  const margin = Number(sale || 0) > 0 ? (profit / Number(sale)) * 100 : 0;

  if (!open) return null;

  return (
    <>
      {scan && (
        <BarcodeScanner
          onDetected={(c: string) => { setBarcode(c.trim()); setScan(false); toast.success('Barcode mil gaya'); }}
          onClose={() => setScan(false)}
        />
      )}

      <div className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[520px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Head */}
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-sky-600 to-cyan-700 text-white flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold">
              <Zap className="h-3 w-3 text-amber-300" /> Quick Add
            </div>
            <h3 className="font-extrabold text-xl mt-1.5">Naya Product</h3>
            <p className="text-xs text-white/80 font-semibold">30 second me tayyar — POS pe milega</p>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
              Product ka naam *
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Colgate Toothpaste 100g"
              className="h-14 w-full rounded-2xl border-2 border-sky-300 bg-white px-4 text-lg font-extrabold text-slate-900 focus:outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-200"
            />
          </div>

          {/* Barcode */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
              Barcode <span className="text-slate-400 normal-case font-bold">(optional)</span>
            </label>
            <div className="flex gap-2">
              <input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="8901234567890"
                className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-sky-500" />
              <button type="button" onClick={() => setScan(true)}
                className="h-11 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold inline-flex items-center gap-1">
                <Camera className="h-4 w-4" /> Scan
              </button>
            </div>
          </div>

          {/* Unit */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
              Unit
            </label>
            <div className="grid grid-cols-3 gap-2">
              {UNITS.map((u) => (
                <button key={u.v} type="button" onClick={() => setUnit(u.v)}
                  className={['h-14 rounded-xl border-2 transition flex flex-col items-center justify-center gap-0.5',
                    unit === u.v ? 'border-sky-600 bg-sky-600 text-white shadow-md' : 'border-slate-200 bg-white text-slate-700 hover:border-sky-400'].join(' ')}>
                  <span className="text-lg">{u.e}</span>
                  <span className="text-xs font-extrabold">{u.l}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Rates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                Kharid rate
              </label>
              <input type="number" step="0.01" inputMode="decimal" value={cost}
                onChange={(e) => setCost(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="h-14 w-full rounded-2xl border-2 border-slate-200 px-4 text-xl font-extrabold tabular-nums focus:outline-none focus:border-slate-500" />
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-emerald-700 mb-1.5">
                Bikri rate *
              </label>
              <input type="number" step="0.01" inputMode="decimal" value={sale}
                onChange={(e) => setSale(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className="h-14 w-full rounded-2xl border-2 border-emerald-400 bg-emerald-50 px-4 text-xl font-extrabold tabular-nums text-emerald-900 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-200" />
            </div>
          </div>

          {/* Quick markup */}
          {Number(cost) > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1.5 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" /> Fatafat rate
              </div>
              <div className="flex flex-wrap gap-1.5">
                {MARKUPS.map((m) => (
                  <button key={m} type="button" onClick={() => applyMarkup(m)}
                    className="px-3 py-1.5 rounded-xl bg-white border-2 border-emerald-200 hover:border-emerald-400 text-emerald-800 text-xs font-extrabold">
                    +{m}% <span className="text-slate-500 font-bold">= {formatPKRFull(Math.round(Number(cost) * (1 + m / 100)))}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Profit preview */}
          {Number(sale) > 0 && Number(cost) > 0 && (
            <div className={['rounded-xl border-2 p-3 flex items-center justify-between',
              profit < 0 ? 'bg-rose-50 border-rose-300' : margin >= 20 ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-300'].join(' ')}>
              <div className="flex items-center gap-2">
                <TrendingUp className={['h-5 w-5', profit < 0 ? 'text-rose-700' : margin >= 20 ? 'text-emerald-700' : 'text-amber-700'].join(' ')} />
                <div>
                  <div className={['text-[10px] uppercase font-extrabold', profit < 0 ? 'text-rose-700' : margin >= 20 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
                    {profit < 0 ? 'Nuqsaan!' : 'Faida'}
                  </div>
                  <div className="text-base font-extrabold tabular-nums text-slate-900">{formatPKRFull(profit)}</div>
                </div>
              </div>
              <div className={['text-2xl font-extrabold tabular-nums', profit < 0 ? 'text-rose-700' : margin >= 20 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
                {margin.toFixed(0)}%
              </div>
            </div>
          )}

          {/* Stock */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
              Abhi kitna maal hai? ({unit})
            </label>
            <input type="number" step="0.01" inputMode="decimal" value={stock}
              onChange={(e) => setStock(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0"
              className="h-14 w-full rounded-2xl border-2 border-slate-200 px-4 text-xl font-extrabold tabular-nums focus:outline-none focus:border-sky-500" />
          </div>

          {/* Advanced */}
          <button type="button" onClick={() => setAdvanced((v) => !v)}
            className="w-full py-2.5 rounded-xl bg-white border-2 border-slate-200 hover:border-sky-300 text-xs font-extrabold text-slate-700 inline-flex items-center justify-center gap-1.5">
            {advanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {advanced ? 'Chhupao' : 'Category (optional)'}
          </button>

          {advanced && (
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5 items-center gap-1">
                <Tag className="h-3 w-3" /> Category
              </label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-sky-500">
                <option value="">Koi nahi</option>
                {(cats as any[]).map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t-2 border-slate-200 p-4 bg-slate-50 space-y-2">
          <Button
            onClick={() => create.mutate()}
            loading={create.isPending}
            disabled={!canSave}
            size="lg"
            className="w-full bg-gradient-to-r from-sky-600 to-cyan-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> Product Banao ({formatPKRFull(Number(sale || 0))})
          </Button>
          <Link to="/retail-products/new" onClick={onClose}
            className="w-full inline-flex items-center justify-center gap-1 py-2 rounded-xl bg-white border-2 border-slate-200 hover:border-sky-300 text-xs font-extrabold text-slate-700">
            Poora wizard chahiye (variants, units, batches) <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </>
  );
}

export default QuickAddProductDrawer;
