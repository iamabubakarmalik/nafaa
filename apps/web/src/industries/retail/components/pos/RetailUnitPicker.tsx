import { useState, useMemo, useEffect } from 'react';
import { X, Scale, Package, Boxes, Hash, Sparkles } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { BigNumpad } from './BigNumpad';

export interface RetailUnitOption {
  id: string;
  unitName: string;
  label: string;
  emoji: string;
  conversionRate: number;
  price: number;
  wholesalePrice?: number | null;
  isBase?: boolean;
}

interface Props {
  productName: string;
  productImage?: string;
  baseUnit: string;
  basePrice: number;
  baseStock: number;
  units: RetailUnitOption[];
  onConfirm: (data: {
    unit: RetailUnitOption;
    quantity: number;
    baseQuantity: number;
    lineTotal: number;
  }) => void;
  onClose: () => void;
}

const UNIT_ICON: Record<string, any> = {
  kg: Scale, gram: Scale, g: Scale, liter: Scale, ml: Scale,
  pcs: Hash, piece: Hash, box: Boxes, carton: Boxes,
  dozen: Package, packet: Package, bag: Package,
};

const QTY_PRESETS: Record<string, number[]> = {
  kg: [0.25, 0.5, 1, 1.5, 2, 5],
  gram: [100, 250, 500, 750, 1000],
  liter: [0.5, 1, 1.5, 2, 5],
  ml: [250, 500, 1000],
  pcs: [1, 2, 3, 5, 10, 12],
  piece: [1, 2, 3, 5, 10, 12],
  box: [1, 2, 3, 5],
  carton: [1, 2, 5],
  dozen: [1, 2, 3],
  packet: [1, 2, 5, 10],
  bag: [1, 2, 5],
};

export function RetailUnitPicker({
  productName, productImage, baseUnit, baseStock,
  units, onConfirm, onClose,
}: Props) {
  const [selectedUnitId, setSelectedUnitId] = useState(
    units.find((u) => u.isBase)?.id ?? units[0]?.id ?? '',
  );
  const [qtyStr, setQtyStr] = useState('1');

  const selectedUnit = units.find((u) => u.id === selectedUnitId) ?? units[0];
  const qty = Number(qtyStr) || 0;

  const presets = useMemo(() => {
    const key = (selectedUnit?.unitName || '').toLowerCase();
    return QTY_PRESETS[key] ?? [1, 2, 5, 10];
  }, [selectedUnit]);

  const baseQuantity = qty * (selectedUnit?.conversionRate ?? 1);
  const lineTotal = qty * (selectedUnit?.price ?? 0);
  const exceedsStock = baseQuantity > baseStock;

  useEffect(() => { setQtyStr('1'); }, [selectedUnitId]);

  if (!selectedUnit) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        <div className="px-5 py-4 bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 text-white flex items-center gap-4 shrink-0">
          <div className="h-16 w-16 rounded-2xl bg-white/15 overflow-hidden shrink-0 flex items-center justify-center">
            {productImage ? (
              <img src={productImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <Package className="h-8 w-8 text-white/70" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase font-extrabold text-white/70 tracking-wider">
              Kitna chahiye?
            </div>
            <h3 className="text-2xl font-extrabold leading-tight truncate">{productName}</h3>
            <div className="text-sm font-bold text-cyan-200">
              Stock: {baseStock.toFixed(baseStock % 1 === 0 ? 0 : 2)} {baseUnit}
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-12 w-12 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center shrink-0 transition"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {units.length > 1 && (
            <div>
              <div className="text-sm font-extrabold text-slate-700 mb-2 uppercase tracking-wide">
                Unit chunein
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {units.map((u) => {
                  const Icon = UNIT_ICON[(u.unitName || '').toLowerCase()] ?? Package;
                  const active = selectedUnitId === u.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => setSelectedUnitId(u.id)}
                      className={[
                        'h-[88px] rounded-2xl border-4 transition-all flex flex-col items-center justify-center gap-1 active:scale-95',
                        active
                          ? 'border-sky-600 bg-sky-600 text-white shadow-lg shadow-sky-500/40 scale-105'
                          : 'border-slate-200 bg-white text-slate-800 hover:border-sky-400 shadow-sm',
                      ].join(' ')}
                    >
                      <span className="text-2xl">{u.emoji}</span>
                      <span className="text-sm font-extrabold uppercase">{u.unitName}</span>
                      <span className={['text-xs font-bold tabular-nums', active ? 'text-cyan-100' : 'text-emerald-700'].join(' ')}>
                        {formatPKR(u.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div className="text-sm font-extrabold text-slate-700 mb-2 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Jaldi select karein
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {presets.map((p) => {
                const active = Number(qtyStr) === p;
                return (
                  <button
                    key={p}
                    onClick={() => setQtyStr(String(p))}
                    className={[
                      'h-[64px] rounded-2xl border-4 font-extrabold text-lg tabular-nums transition-all active:scale-95',
                      active
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-500/40'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-emerald-400 shadow-sm',
                    ].join(' ')}
                  >
                    {p}
                    <div className={['text-[10px] font-bold uppercase', active ? 'text-emerald-100' : 'text-slate-500'].join(' ')}>
                      {selectedUnit.unitName}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={[
            'rounded-3xl p-4 border-4 transition-colors',
            exceedsStock
              ? 'bg-rose-50 border-rose-400'
              : 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300',
          ].join(' ')}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase font-extrabold text-slate-600 tracking-wider">Quantity</div>
                <div className="text-4xl font-extrabold text-slate-900 tabular-nums leading-none mt-1">
                  {qtyStr || '0'}
                  <span className="text-xl font-bold text-slate-600 ml-1.5">{selectedUnit.unitName}</span>
                </div>
                {selectedUnit.conversionRate !== 1 && (
                  <div className="text-xs font-bold text-slate-600 mt-1">
                    = {baseQuantity.toFixed(2)} {baseUnit}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs uppercase font-extrabold text-slate-600 tracking-wider">Total</div>
                <div className="text-4xl font-extrabold text-emerald-700 tabular-nums leading-none mt-1">
                  {formatPKR(lineTotal)}
                </div>
              </div>
            </div>
            {exceedsStock && (
              <div className="mt-2 text-sm font-extrabold text-rose-700">
                ⚠️ Stock sirf {baseStock.toFixed(2)} {baseUnit} hai!
              </div>
            )}
          </div>

          <BigNumpad
            value={qtyStr}
            onChange={setQtyStr}
            onConfirm={() => {
              if (qty <= 0) return;
              onConfirm({
                unit: selectedUnit,
                quantity: qty,
                baseQuantity,
                lineTotal,
              });
            }}
            onCancel={onClose}
            allowDecimal
            confirmLabel="Cart mein daalo"
          />
        </div>
      </div>
    </div>
  );
}
