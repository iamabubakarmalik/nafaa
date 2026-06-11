import { useState, useMemo, useEffect } from 'react';
import { X, Ruler, Plus, Trash2, Equal } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Piece {
  length: string;
  width: string;
  quantity: string;
}

interface Props {
  productName: string;
  unit: string;
  initialQuantity?: number;
  onApply: (quantity: number, note: string) => void;
  onClose: () => void;
}

const UNIT_FORMULAS: Record<string, { label: string; calc: (l: number, w: number) => number; pieceLabel: string }> = {
  sqft: {
    label: 'Square Feet',
    calc: (l, w) => l * w,
    pieceLabel: 'ft',
  },
  sqm: {
    label: 'Square Meter',
    calc: (l, w) => l * w,
    pieceLabel: 'm',
  },
  meter: {
    label: 'Meter (length only)',
    calc: (l, _w) => l,
    pieceLabel: 'm',
  },
  ft: {
    label: 'Foot (length only)',
    calc: (l, _w) => l,
    pieceLabel: 'ft',
  },
  yard: {
    label: 'Yard',
    calc: (l, _w) => l,
    pieceLabel: 'yard',
  },
  gaj: {
    label: 'Gaj',
    calc: (l, _w) => l,
    pieceLabel: 'gaj',
  },
};

export function LengthWidthCalculator({
  productName, unit, initialQuantity, onApply, onClose,
}: Props) {
  const [pieces, setPieces] = useState<Piece[]>([
    { length: '', width: '', quantity: '1' },
  ]);

  const formula = UNIT_FORMULAS[unit] || UNIT_FORMULAS.sqft;
  const isAreaBased = unit === 'sqft' || unit === 'sqm';

  useEffect(() => {
    // Auto-focus first input
    const t = setTimeout(() => {
      const el = document.getElementById('lw-len-0') as HTMLInputElement;
      el?.focus();
    }, 100);
    return () => clearTimeout(t);
  }, []);

  const addPiece = () => {
    setPieces((p) => [...p, { length: '', width: '', quantity: '1' }]);
  };

  const removePiece = (i: number) => {
    setPieces((p) => p.filter((_, idx) => idx !== i));
  };

  const updatePiece = (i: number, field: keyof Piece, value: string) => {
    setPieces((p) =>
      p.map((piece, idx) => (idx === i ? { ...piece, [field]: value } : piece)),
    );
  };

  const calculations = useMemo(() => {
    return pieces.map((piece) => {
      const l = parseFloat(piece.length) || 0;
      const w = parseFloat(piece.width) || 0;
      const q = parseFloat(piece.quantity) || 0;
      const perPiece = formula.calc(l, w);
      const total = perPiece * q;
      return { l, w, q, perPiece, total };
    });
  }, [pieces, formula]);

  const grandTotal = useMemo(
    () => calculations.reduce((sum, c) => sum + c.total, 0),
    [calculations],
  );

  const noteParts = pieces.map((piece, i) => {
    const calc = calculations[i];
    if (calc.total === 0) return null;
    if (isAreaBased) {
      return `${calc.l}×${calc.w} ${formula.pieceLabel}${calc.q > 1 ? ` × ${calc.q}` : ''}`;
    }
    return `${calc.l} ${formula.pieceLabel}${calc.q > 1 ? ` × ${calc.q}` : ''}`;
  }).filter(Boolean);

  const note = noteParts.length > 0 ? noteParts.join(' + ') + ` = ${grandTotal.toFixed(2)} ${unit}` : '';

  const handleApply = () => {
    if (grandTotal <= 0) return;
    onApply(Number(grandTotal.toFixed(2)), note);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-br from-brand-50 to-emerald-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
              <Ruler className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Size Calculator</h3>
              <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">
                {productName} • {formula.label}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center transition"
          >
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Helper hint */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-700">
            <strong>Tip:</strong>{' '}
            {isAreaBased
              ? `Enter length × width per piece, then quantity. e.g. 12 ft × 12 ft = 144 ${unit}`
              : `Enter length per piece, then quantity. Width is optional.`}
          </div>

          {/* Pieces input */}
          {pieces.map((piece, i) => {
            const calc = calculations[i];
            return (
              <div
                key={i}
                className="rounded-2xl border-2 border-slate-200 bg-white p-4 hover:border-brand-300 transition"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                    Piece {i + 1}
                  </div>
                  {pieces.length > 1 && (
                    <button
                      onClick={() => removePiece(i)}
                      className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className={`grid gap-3 ${isAreaBased ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2'}`}>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                      Length
                    </label>
                    <div className="relative">
                      <input
                        id={`lw-len-${i}`}
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        value={piece.length}
                        onChange={(e) => updatePiece(i, 'length', e.target.value)}
                        placeholder="0"
                        className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-3 pr-10 text-lg font-bold text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        {formula.pieceLabel}
                      </div>
                    </div>
                  </div>

                  {isAreaBased && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                        Width
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          value={piece.width}
                          onChange={(e) => updatePiece(i, 'width', e.target.value)}
                          placeholder="0"
                          className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-3 pr-10 text-lg font-bold text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          {formula.pieceLabel}
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                      Pieces
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      step="1"
                      value={piece.quantity}
                      onChange={(e) => updatePiece(i, 'quantity', e.target.value)}
                      placeholder="1"
                      className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-lg font-bold text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-emerald-700 mb-1 uppercase">
                      Sub Total
                    </label>
                    <div className="h-12 rounded-xl bg-emerald-50 border-2 border-emerald-200 px-3 flex items-center justify-end">
                      <div className="text-lg font-extrabold text-emerald-700">
                        {calc.total.toFixed(2)}
                      </div>
                      <div className="text-[10px] font-bold text-emerald-600 ml-1">
                        {unit}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Formula display */}
                {calc.total > 0 && (
                  <div className="mt-2 text-[11px] font-mono text-slate-500">
                    {isAreaBased
                      ? `${calc.l} × ${calc.w} = ${calc.perPiece.toFixed(2)} ${unit}${calc.q > 1 ? ` × ${calc.q} pieces = ${calc.total.toFixed(2)} ${unit}` : ''}`
                      : `${calc.l} ${formula.pieceLabel}${calc.q > 1 ? ` × ${calc.q} = ${calc.total.toFixed(2)} ${unit}` : ''}`}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add more button */}
          <button
            onClick={addPiece}
            className="w-full h-12 rounded-xl border-2 border-dashed border-slate-300 hover:border-brand-400 text-slate-600 hover:text-brand-700 hover:bg-brand-50 font-bold text-sm transition inline-flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Another Piece
          </button>
        </div>

        {/* Footer with total */}
        <div className="px-6 py-4 border-t border-slate-200 bg-gradient-to-br from-emerald-50 to-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Equal className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-bold text-slate-700">Grand Total</span>
            </div>
            <div className="text-right">
              <div className="text-3xl font-extrabold text-emerald-700 leading-none">
                {grandTotal.toFixed(2)}
              </div>
              <div className="text-xs font-bold text-emerald-600 mt-0.5">{unit}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleApply}
              disabled={grandTotal <= 0}
            >
              Apply {grandTotal > 0 ? `${grandTotal.toFixed(2)} ${unit}` : ''}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
