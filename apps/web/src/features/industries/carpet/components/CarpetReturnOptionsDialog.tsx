import { useState, useMemo, useEffect } from 'react';
import {
  X, Scissors, Layers, AlertTriangle, CheckCircle2, Ruler, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatPKR, formatPKRFull } from '@/lib/format';

export interface CarpetReturnOptions {
  createCutPiece: boolean;
  isDamaged: boolean;
  cutPieceCondition: string;
  cutPieceWidthFt: number;
  cutPieceLengthFt: number;
  cutPieceNotes: string;
}

interface Props {
  /** Pre-parsed info from sale item note */
  carpetInfo: {
    rollNumber?: string;
    pieceCode?: string;
    widthFt?: number;
    lengthFt?: number;
    isRollCut: boolean;
    isCutPiece: boolean;
  };
  productName: string;
  variantName?: string;
  /** Returned quantity in sqft */
  returnedSqft: number;
  /** Per-sqft sale price (to calculate discount price preview) */
  pricePerSqft: number;
  /** Initial options if reopening */
  initialOptions?: Partial<CarpetReturnOptions>;
  onConfirm: (options: CarpetReturnOptions) => void;
  onClose: () => void;
}

const CONDITIONS = [
  { value: 'Good', label: 'Good', color: 'emerald' },
  { value: 'Used', label: 'Used (slightly worn)', color: 'amber' },
  { value: 'Worn', label: 'Worn / Damaged spot', color: 'orange' },
];

export function CarpetReturnOptionsDialog({
  carpetInfo, productName, variantName, returnedSqft, pricePerSqft,
  initialOptions, onConfirm, onClose,
}: Props) {
  const [createCutPiece, setCreateCutPiece] = useState(
    initialOptions?.createCutPiece ?? true,
  );
  const [isDamaged, setIsDamaged] = useState(initialOptions?.isDamaged ?? false);
  const [condition, setCondition] = useState(
    initialOptions?.cutPieceCondition ?? 'Good',
  );
  const [widthFt, setWidthFt] = useState(
    String(initialOptions?.cutPieceWidthFt ?? carpetInfo.widthFt ?? ''),
  );
  const [lengthFt, setLengthFt] = useState(
    String(
      initialOptions?.cutPieceLengthFt
        ?? (carpetInfo.widthFt && returnedSqft
          ? (returnedSqft / carpetInfo.widthFt).toFixed(2)
          : ''),
    ),
  );
  const [notes, setNotes] = useState(initialOptions?.cutPieceNotes ?? '');

  // Auto-recompute length when width changes (if user hasn't set length manually)
  useEffect(() => {
    if (!initialOptions?.cutPieceLengthFt && returnedSqft > 0) {
      const w = Number(widthFt) || 0;
      if (w > 0) {
        setLengthFt((returnedSqft / w).toFixed(2));
      }
    }
  }, [widthFt, returnedSqft, initialOptions?.cutPieceLengthFt]);

  const previewSqft = useMemo(() => {
    const w = Number(widthFt) || 0;
    const l = Number(lengthFt) || 0;
    return Number((w * l).toFixed(2));
  }, [widthFt, lengthFt]);

  const previewPrice = useMemo(() => {
    if (isDamaged) return 0;
    // Default discount: 80% of original per-sqft price
    return Number((previewSqft * pricePerSqft * 0.8).toFixed(2));
  }, [previewSqft, pricePerSqft, isDamaged]);

  const sqftMismatch =
    previewSqft > 0 && Math.abs(previewSqft - returnedSqft) > 0.5;

  const handleConfirm = () => {
    if (createCutPiece && previewSqft <= 0) {
      alert('Width aur length zaroori hain agar cut piece banana hai');
      return;
    }
    onConfirm({
      createCutPiece,
      isDamaged,
      cutPieceCondition: isDamaged ? 'Damaged' : condition,
      cutPieceWidthFt: createCutPiece ? Number(widthFt) || 0 : 0,
      cutPieceLengthFt: createCutPiece ? Number(lengthFt) || 0 : 0,
      cutPieceNotes: notes.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-br from-emerald-50 to-green-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center shadow shrink-0">
              <Scissors className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold">
                Carpet Return Options
              </div>
              <h3 className="font-bold text-slate-900 truncate">{productName}</h3>
              {variantName && (
                <p className="text-xs text-violet-700 font-bold">{variantName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0"
          >
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Original sale info */}
          {(carpetInfo.rollNumber || carpetInfo.pieceCode) && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900">
                <div className="font-bold">Original Sale Info</div>
                <div className="mt-0.5 space-y-0.5">
                  {carpetInfo.rollNumber && (
                    <div>
                      Cut from roll:{' '}
                      <span className="font-mono font-extrabold">{carpetInfo.rollNumber}</span>
                    </div>
                  )}
                  {carpetInfo.pieceCode && (
                    <div>
                      Original piece:{' '}
                      <span className="font-mono font-extrabold">{carpetInfo.pieceCode}</span>
                    </div>
                  )}
                  {carpetInfo.widthFt && carpetInfo.lengthFt && (
                    <div>
                      Sold as:{' '}
                      <strong>
                        {carpetInfo.widthFt}ft × {carpetInfo.lengthFt}ft{(carpetInfo as any).lengthInch ? ` ${(carpetInfo as any).lengthInch}in` : ''} (
                        {(carpetInfo.widthFt * (carpetInfo.lengthFt + ((carpetInfo as any).lengthInch || 0) / 12)).toFixed(2)} sqft)
                      </strong>
                    </div>
                  )}
                  <div>
                    Returning: <strong>{returnedSqft.toFixed(2)} sqft</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main toggle: Create cut piece */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              Inventory Action
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setCreateCutPiece(true);
                  setIsDamaged(false);
                }}
                className={`p-4 rounded-2xl border-2 text-left transition ${
                  createCutPiece && !isDamaged
                    ? 'border-emerald-500 bg-emerald-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2
                    className={`h-5 w-5 ${
                      createCutPiece && !isDamaged ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  />
                  <span className="font-extrabold text-slate-900">Resellable</span>
                </div>
                <p className="text-xs text-slate-600">
                  Cut piece <strong>AVAILABLE</strong> banega — discount price par bechain
                </p>
              </button>

              <button
                onClick={() => {
                  setCreateCutPiece(true);
                  setIsDamaged(true);
                }}
                className={`p-4 rounded-2xl border-2 text-left transition ${
                  createCutPiece && isDamaged
                    ? 'border-rose-500 bg-rose-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-rose-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle
                    className={`h-5 w-5 ${
                      createCutPiece && isDamaged ? 'text-rose-600' : 'text-slate-400'
                    }`}
                  />
                  <span className="font-extrabold text-slate-900">Damaged</span>
                </div>
                <p className="text-xs text-slate-600">
                  Cut piece <strong>DAMAGED</strong> status mein jayega — manual disposal
                </p>
              </button>
            </div>

            <button
              onClick={() => {
                setCreateCutPiece(false);
                setIsDamaged(false);
              }}
              className={`w-full p-3 rounded-xl border-2 text-left transition ${
                !createCutPiece
                  ? 'border-slate-500 bg-slate-50 shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers
                  className={`h-4 w-4 ${!createCutPiece ? 'text-slate-700' : 'text-slate-400'}`}
                />
                <span className="font-bold text-slate-900 text-sm">
                  No cut piece — manual inventory adjustment
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Sirf refund hoga, koi piece nahi banegi (use this if you'll add back to roll manually)
              </p>
            </button>
          </div>

          {/* Cut piece details — only if creating */}
          {createCutPiece && (
            <>
              {/* Condition (only for resellable) */}
              {!isDamaged && (
                <div>
                  <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Condition
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {CONDITIONS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setCondition(c.value)}
                        className={`px-3 py-2 rounded-xl border-2 text-xs font-bold transition ${
                          condition === c.value
                            ? `border-${c.color}-500 bg-${c.color}-50 text-${c.color}-900`
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Dimensions */}
              <div>
                <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Ruler className="h-3 w-3" /> Cut Piece Dimensions
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">
                      Width (ft)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={widthFt}
                      onChange={(e) => setWidthFt(e.target.value)}
                      className="h-10 w-full rounded-lg border-2 border-slate-200 px-2 text-sm font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">
                      Length (ft)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={lengthFt}
                      onChange={(e) => setLengthFt(e.target.value)}
                      className="h-10 w-full rounded-lg border-2 border-slate-200 px-2 text-sm font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-0.5">
                      Sqft
                    </label>
                    <div className="h-10 rounded-lg bg-emerald-50 border-2 border-emerald-200 px-2 flex items-center justify-end">
                      <div className="text-sm font-extrabold text-emerald-700">
                        {previewSqft > 0 ? previewSqft.toFixed(2) : '—'}
                      </div>
                    </div>
                  </div>
                </div>
                {sqftMismatch && (
                  <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-2 flex items-start gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-700 shrink-0 mt-0.5" />
                    <div className="text-[10px] text-amber-900">
                      <strong>Mismatch:</strong> Cut piece ({previewSqft.toFixed(2)} sqft) returned
                      qty ({returnedSqft.toFixed(2)} sqft) se thoda alag hai. OK hai agar partial
                      damage hai.
                    </div>
                  </div>
                )}
              </div>

              {/* Price preview */}
              <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-emerald-700">
                      Cut Piece Code
                    </div>
                    <div className="font-mono text-sm font-extrabold text-emerald-900">
                      Auto-generated
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-emerald-700">
                      {isDamaged ? 'Sale Price (Damaged)' : 'Sale Price (80% discount)'}
                    </div>
                    <div className="text-lg font-extrabold text-emerald-900">
                      {formatPKRFull(previewPrice)}
                    </div>
                  </div>
                </div>
                {!isDamaged && pricePerSqft > 0 && (
                  <div className="text-[10px] text-emerald-700 font-bold mt-1">
                    Original: {formatPKR(pricePerSqft)}/sqft × {previewSqft.toFixed(2)} × 0.8
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Customer returned for color mismatch, slightly used corner..."
                  className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <Button
            onClick={handleConfirm}
            className={
              isDamaged
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-gradient-to-r from-emerald-700 to-emerald-600'
            }
          >
            {createCutPiece ? (
              <>
                <Scissors className="h-4 w-4" />
                {isDamaged ? 'Mark Damaged' : 'Create Cut Piece'}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Apply (No Piece)
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper: Parse carpet info from sale item note string.
 * Mirrors the backend's parseCarpetNote logic.
 */
export function parseCarpetNoteClient(note?: string | null): {
  isRollCut: boolean;
  isCutPiece: boolean;
  rollNumber?: string;
  pieceCode?: string;
  widthFt?: number;
  lengthFt?: number;
  lengthInch?: number;
} {
  if (!note) return { isRollCut: false, isCutPiece: false };

  const rollMatch = note.match(
    /Cut from ([\w-]+):\s*([\d.]+)\s*ft\s*[xX×]\s*([\d.]+)\s*ft(?:\s+([\d.]+)\s*in)?/,
  );
  if (rollMatch) {
    return {
      isRollCut: true,
      isCutPiece: false,
      rollNumber: rollMatch[1],
      widthFt: Number(rollMatch[2]),
      lengthFt: Number(rollMatch[3]),
      lengthInch: rollMatch[4] ? Number(rollMatch[4]) : 0,
    };
  }

  const cutMatch = note.match(
    /Cut piece ([\w-]+)(?:\s*[•·]\s*([\d.]+)\s*ft\s*[xX×]\s*([\d.]+)\s*ft)?/,
  );
  if (cutMatch) {
    return {
      isRollCut: false,
      isCutPiece: true,
      pieceCode: cutMatch[1],
      widthFt: cutMatch[2] ? Number(cutMatch[2]) : undefined,
      lengthFt: cutMatch[3] ? Number(cutMatch[3]) : undefined,
    };
  }

  return { isRollCut: false, isCutPiece: false };
}
