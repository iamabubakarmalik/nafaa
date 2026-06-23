import { useState, useMemo, useEffect } from 'react';
import {
  X, Ruler, Plus, Trash2, Equal, Calculator, Sparkles,
  Copy, CheckCircle2, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

interface Piece {
  id: string;
  label?: string;
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

const UNIT_FORMULAS: Record<string, { label: string; calc: (l: number, w: number) => number; pieceLabel: string; needsWidth: boolean }> = {
  sqft: { label: 'Square Feet', calc: (l, w) => l * w, pieceLabel: 'ft', needsWidth: true },
  sqm: { label: 'Square Meter', calc: (l, w) => l * w, pieceLabel: 'm', needsWidth: true },
  sqyd: { label: 'Square Yard', calc: (l, w) => l * w, pieceLabel: 'yd', needsWidth: true },
  meter: { label: 'Meter', calc: (l, _w) => l, pieceLabel: 'm', needsWidth: false },
  ft: { label: 'Foot', calc: (l, _w) => l, pieceLabel: 'ft', needsWidth: false },
  yard: { label: 'Yard', calc: (l, _w) => l, pieceLabel: 'yard', needsWidth: false },
  gaj: { label: 'Gaj', calc: (l, _w) => l, pieceLabel: 'gaj', needsWidth: false },
};

const newId = () => Math.random().toString(36).slice(2, 8);

export function LengthWidthCalculator({
  productName, unit, initialQuantity, onApply, onClose,
}: Props) {
  const [pieces, setPieces] = useState<Piece[]>([
    { id: newId(), length: '', width: '', quantity: '1' },
  ]);

  const formula = UNIT_FORMULAS[unit] || UNIT_FORMULAS.sqft;
  const isAreaBased = formula.needsWidth;

  useEffect(() => {
    const t = setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>('[data-piece-input="length-0"]');
      el?.focus();
      el?.select();
    }, 100);
    return () => clearTimeout(t);
  }, []);

  const addPiece = () => {
    setPieces((p) => [...p, { id: newId(), length: '', width: '', quantity: '1' }]);
    setTimeout(() => {
      const inputs = document.querySelectorAll<HTMLInputElement>('[data-piece-input^="length-"]');
      inputs[inputs.length - 1]?.focus();
    }, 50);
  };

  const removePiece = (id: string) => {
    if (pieces.length === 1) {
      setPieces([{ id: newId(), length: '', width: '', quantity: '1' }]);
      return;
    }
    setPieces((p) => p.filter((piece) => piece.id !== id));
  };

  const duplicatePiece = (id: string) => {
    setPieces((p) => {
      const idx = p.findIndex((pc) => pc.id === id);
      if (idx === -1) return p;
      const copy = { ...p[idx], id: newId() };
      return [...p.slice(0, idx + 1), copy, ...p.slice(idx + 1)];
    });
    toast.success('Piece duplicated');
  };

  const updatePiece = (id: string, field: keyof Piece, value: string) => {
    setPieces((p) =>
      p.map((piece) => (piece.id === id ? { ...piece, [field]: value } : piece)),
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

  const totalPieces = useMemo(
    () => calculations.reduce((sum, c) => sum + c.q, 0),
    [calculations],
  );

  const noteParts = pieces.map((piece, i) => {
    const calc = calculations[i];
    if (calc.total === 0) return null;
    if (isAreaBased) {
      return `${calc.l}×${calc.w}${formula.pieceLabel}${calc.q > 1 ? ` × ${calc.q}` : ''}`;
    }
    return `${calc.l}${formula.pieceLabel}${calc.q > 1 ? ` × ${calc.q}` : ''}`;
  }).filter(Boolean);

  const note = noteParts.length > 0 ? noteParts.join(' + ') + ` = ${grandTotal.toFixed(2)} ${unit}` : '';

  const handleApply = () => {
    if (grandTotal <= 0) {
      toast.error('Pehle dimensions enter karein');
      return;
    }
    onApply(Number(grandTotal.toFixed(2)), note);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-150">
        {/* ═══ HEADER ═══ */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl" />
          <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-amber-400/15 blur-2xl" />

          <div className="relative px-6 py-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-lg ring-2 ring-white/20 shrink-0">
                <Calculator className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider mb-1 border border-white/20">
                  <Ruler className="h-2.5 w-2.5 text-amber-300" />
                  {formula.label}
                </div>
                <h3 className="font-extrabold text-lg leading-tight truncate">{productName}</h3>
                <p className="text-[11px] text-white/80 font-semibold mt-0.5">
                  Multiple pieces • Auto total in {unit}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur border border-white/20 flex items-center justify-center transition shrink-0"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>

        {/* ═══ BODY ═══ */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-gradient-to-b from-slate-50/30 to-white">
          {/* Hint */}
          <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3 flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 font-semibold leading-snug">
              {isAreaBased
                ? <><strong>Tip:</strong> Length × Width per piece, phir pieces count. e.g. <strong>12 × 12 ft × 3 pieces = 432 sqft</strong></>
                : <><strong>Tip:</strong> Length per piece, phir quantity. e.g. <strong>10 m × 5 pieces = 50 m</strong></>}
            </div>
          </div>

          {/* Pieces */}
          {pieces.map((piece, i) => {
            const calc = calculations[i];
            const hasValue = calc.total > 0;
            return (
              <div
                key={piece.id}
                className={`rounded-2xl border-2 p-3 sm:p-4 transition ${
                  hasValue
                    ? 'border-emerald-300 bg-gradient-to-br from-emerald-50/60 to-white'
                    : 'border-slate-200 bg-white hover:border-emerald-200'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="inline-flex items-center gap-2">
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center font-extrabold text-[11px] ${
                      hasValue ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                      Piece {i + 1}
                    </div>
                    {hasValue && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => duplicatePiece(piece.id)}
                      className="h-7 w-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 flex items-center justify-center transition"
                      title="Duplicate"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => removePiece(piece.id)}
                      className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition"
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className={`grid gap-2.5 ${isAreaBased ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'}`}>
                  {/* Length */}
                  <div>
                    <label className="block text-[9px] font-extrabold text-slate-600 mb-1 uppercase tracking-wider">
                      Length
                    </label>
                    <div className="relative">
                      <input
                        data-piece-input={`length-${i}`}
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        value={piece.length}
                        onChange={(e) => updatePiece(piece.id, 'length', e.target.value)}
                        placeholder="0"
                        className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 pr-9 text-lg font-extrabold text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition"
                      />
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-slate-400">
                        {formula.pieceLabel}
                      </div>
                    </div>
                  </div>

                  {/* Width (only if needed) */}
                  {isAreaBased && (
                    <div>
                      <label className="block text-[9px] font-extrabold text-slate-600 mb-1 uppercase tracking-wider">
                        Width
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          value={piece.width}
                          onChange={(e) => updatePiece(piece.id, 'width', e.target.value)}
                          placeholder="0"
                          className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 pr-9 text-lg font-extrabold text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition"
                        />
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-slate-400">
                          {formula.pieceLabel}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quantity */}
                  <div>
                    <label className="block text-[9px] font-extrabold text-slate-600 mb-1 uppercase tracking-wider">
                      Pieces
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      step="1"
                      value={piece.quantity}
                      onChange={(e) => updatePiece(piece.id, 'quantity', e.target.value)}
                      placeholder="1"
                      className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-lg font-extrabold text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition"
                    />
                  </div>

                  {/* Sub Total */}
                  <div>
                    <label className="block text-[9px] font-extrabold text-emerald-700 mb-1 uppercase tracking-wider">
                      Sub Total
                    </label>
                    <div className="h-11 rounded-xl bg-emerald-50 border-2 border-emerald-300 px-3 flex items-center justify-end shadow-sm">
                      <div className="text-lg font-extrabold text-emerald-700 tabular-nums">
                        {calc.total.toFixed(2)}
                      </div>
                      <div className="text-[10px] font-extrabold text-emerald-600 ml-1">
                        {unit}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Formula display */}
                {calc.total > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t border-emerald-200/50 text-[11px] font-mono text-emerald-800 font-bold">
                    {isAreaBased
                      ? `${calc.l} × ${calc.w} = ${calc.perPiece.toFixed(2)} ${unit}${calc.q > 1 ? ` × ${calc.q} = ${calc.total.toFixed(2)} ${unit}` : ''}`
                      : `${calc.l} ${formula.pieceLabel}${calc.q > 1 ? ` × ${calc.q} = ${calc.total.toFixed(2)} ${unit}` : ''}`}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add more */}
          <button
            onClick={addPiece}
            className="w-full h-12 rounded-xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 text-emerald-700 hover:bg-emerald-50 font-extrabold text-sm transition inline-flex items-center justify-center gap-2 group"
          >
            <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform" />
            Add Another Piece
          </button>
        </div>

        {/* ═══ FOOTER ═══ */}
        <div className="border-t-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-5 py-4 space-y-3">
          {/* Grand total */}
          <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-4 shadow-lg shadow-emerald-500/30">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                  <Equal className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wider font-extrabold opacity-90">
                    Grand Total
                  </div>
                  <div className="text-[10px] font-bold opacity-80">
                    {totalPieces.toFixed(0)} piece{totalPieces !== 1 ? 's' : ''} • {pieces.length} row{pieces.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-3xl sm:text-4xl font-extrabold leading-none tabular-nums">
                  {grandTotal.toFixed(2)}
                </div>
                <div className="text-xs font-extrabold opacity-90 mt-0.5">{unit}</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg shadow-emerald-500/30"
              onClick={handleApply}
              disabled={grandTotal <= 0}
            >
              <Sparkles className="h-4 w-4" />
              Apply {grandTotal > 0 ? `${grandTotal.toFixed(2)} ${unit}` : ''}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
