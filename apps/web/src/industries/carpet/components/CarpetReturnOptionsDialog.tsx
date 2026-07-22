import { useState, useMemo, useEffect } from 'react';
import {
  X, Scissors, Layers, AlertTriangle, CheckCircle2, Ruler, Info,
} from 'lucide-react';
import { Button } from '@core/ui/Button';
import { formatPKR, formatPKRFull } from '@core/lib/format';

export interface CarpetReturnOptions {
  createCutPiece: boolean;
  isDamaged: boolean;
  cutPieceCondition: string;
  cutPieceWidthFt: number;
  cutPieceLengthFt: number;
  cutPieceNotes: string;
}

interface Props {
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
  returnedSqft: number;
  pricePerSqft: number;
  initialOptions?: Partial<CarpetReturnOptions>;
  onConfirm: (options: CarpetReturnOptions) => void;
  onClose: () => void;
}

const CONDITIONS = [
  { value: 'Good', label: 'Good', color: 'emerald', desc: 'Like new' },
  { value: 'Used', label: 'Used', color: 'amber', desc: 'Slightly worn' },
  { value: 'Worn', label: 'Worn', color: 'orange', desc: 'Damaged spot' },
];

export function CarpetReturnOptionsDialog({
  carpetInfo, productName, variantName, returnedSqft, pricePerSqft,
  initialOptions, onConfirm, onClose,
}: Props) {
  const [createCutPiece, setCreateCutPiece] = useState(initialOptions?.createCutPiece ?? true);
  const [isDamaged, setIsDamaged] = useState(initialOptions?.isDamaged ?? false);
  const [condition, setCondition] = useState(initialOptions?.cutPieceCondition ?? 'Good');
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

  useEffect(() => {
    if (!initialOptions?.cutPieceLengthFt && returnedSqft > 0) {
      const w = Number(widthFt) || 0;
      if (w > 0) setLengthFt((returnedSqft / w).toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widthFt, returnedSqft]);

  const previewSqft = useMemo(() => {
    const w = Number(widthFt) || 0;
    const l = Number(lengthFt) || 0;
    return Number((w * l).toFixed(2));
  }, [widthFt, lengthFt]);

  const previewPrice = useMemo(() => {
    if (isDamaged) return 0;
    return Number((previewSqft * pricePerSqft * 0.8).toFixed(2));
  }, [previewSqft, pricePerSqft, isDamaged]);

  const sqftMismatch = previewSqft > 0 && Math.abs(previewSqft - returnedSqft) > 0.5;

  const handleConfirm = () => {
    if (createCutPiece && previewSqft <= 0) {
      alert('Width aur length zaroori hain');
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
        <div className="px-5 py-4 border-b-2 border-slate-200 bg-gradient-to-br from-emerald-50 to-green-50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center shadow-md shrink-0">
              <Scissors className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wider text-emerald-700 font-extrabold">
                Carpet Return Options
              </div>
              <h3 className="font-extrabold text-slate-900 text-lg truncate">{productName}</h3>
              {variantName && (
                <p className="text-sm text-violet-700 font-bold">{variantName}</p>
              )}
            </div>
          </div>
          <button onClick={onClose}
            className="h-10 w-10 rounded-xl bg-white hover:bg-slate-100 border-2 border-slate-200 flex items-center justify-center shrink-0">
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {(carpetInfo.rollNumber || carpetInfo.pieceCode) && (
            <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3 flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <div className="font-extrabold">Original Sale Info</div>
                <div className="mt-1 space-y-0.5 text-xs font-semibold">
                  {carpetInfo.rollNumber && (
                    <div>Cut from roll: <span className="font-mono font-extrabold">{carpetInfo.rollNumber}</span></div>
                  )}
                  {carpetInfo.pieceCode && (
                    <div>Original piece: <span className="font-mono font-extrabold">{carpetInfo.pieceCode}</span></div>
                  )}
                  {carpetInfo.widthFt && carpetInfo.lengthFt && (
                    <div>
                      Sold as: <strong>{carpetInfo.widthFt}ft × {carpetInfo.lengthFt}ft{(carpetInfo as any).lengthInch ? ` ${(carpetInfo as any).lengthInch}in` : ''} ({(carpetInfo.widthFt * (carpetInfo.lengthFt + ((carpetInfo as any).lengthInch || 0) / 12)).toFixed(2)} sqft)</strong>
                    </div>
                  )}
                  <div>Returning: <strong className="text-blue-800">{returnedSqft.toFixed(2)} sqft</strong></div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">Inventory Action</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <button
                onClick={() => { setCreateCutPiece(true); setIsDamaged(false); }}
                className={`p-4 rounded-2xl border-2 text-left transition ${
                  createCutPiece && !isDamaged
                    ? 'border-emerald-500 bg-emerald-50 shadow-md ring-2 ring-emerald-200'
                    : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <CheckCircle2 className={`h-5 w-5 ${createCutPiece && !isDamaged ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span className="font-extrabold text-slate-900 text-base">Resellable</span>
                </div>
                <p className="text-xs text-slate-600 font-semibold">
                  Cut piece <strong>AVAILABLE</strong> banega — discount par bechain
                </p>
              </button>

              <button
                onClick={() => { setCreateCutPiece(true); setIsDamaged(true); }}
                className={`p-4 rounded-2xl border-2 text-left transition ${
                  createCutPiece && isDamaged
                    ? 'border-rose-500 bg-rose-50 shadow-md ring-2 ring-rose-200'
                    : 'border-slate-200 bg-white hover:border-rose-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertTriangle className={`h-5 w-5 ${createCutPiece && isDamaged ? 'text-rose-600' : 'text-slate-400'}`} />
                  <span className="font-extrabold text-slate-900 text-base">Damaged</span>
                </div>
                <p className="text-xs text-slate-600 font-semibold">
                  Cut piece <strong>DAMAGED</strong> status mein jayega
                </p>
              </button>
            </div>

            <button
              onClick={() => { setCreateCutPiece(false); setIsDamaged(false); }}
              className={`w-full p-3 rounded-xl border-2 text-left transition ${
                !createCutPiece ? 'border-slate-500 bg-slate-50 shadow-md' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers className={`h-4 w-4 ${!createCutPiece ? 'text-slate-700' : 'text-slate-400'}`} />
                <span className="font-extrabold text-slate-900 text-sm">
                  No cut piece — manual inventory adjustment
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 font-semibold">
                Sirf refund hoga, koi piece nahi banegi
              </p>
            </button>
          </div>

          {createCutPiece && (
            <>
              {!isDamaged && (
                <div>
                  <div className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">Condition</div>
                  <div className="grid grid-cols-3 gap-2">
                    {CONDITIONS.map((c) => {
                      const active = condition === c.value;
                      const colorMap: Record<string, string> = {
                        emerald: active ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-700',
                        amber: active ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-slate-200 bg-white text-slate-700',
                        orange: active ? 'border-orange-500 bg-orange-50 text-orange-900' : 'border-slate-200 bg-white text-slate-700',
                      };
                      return (
                        <button key={c.value} onClick={() => setCondition(c.value)}
                          className={`px-3 py-2.5 rounded-xl border-2 text-sm font-extrabold transition ${colorMap[c.color]} hover:shadow-sm`}>
                          <div>{c.label}</div>
                          <div className="text-[10px] font-semibold opacity-70 mt-0.5">{c.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Ruler className="h-3.5 w-3.5" /> Cut Piece Dimensions
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Width (ft)</label>
                    <input type="number" step="0.01" min="0.1" value={widthFt}
                      onChange={(e) => setWidthFt(e.target.value)}
                      className="h-11 w-full rounded-lg border-2 border-slate-200 px-2 text-base font-extrabold text-right focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Length (ft)</label>
                    <input type="number" step="0.01" min="0.1" value={lengthFt}
                      onChange={(e) => setLengthFt(e.target.value)}
                      className="h-11 w-full rounded-lg border-2 border-slate-200 px-2 text-base font-extrabold text-right focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">Sqft</label>
                    <div className="h-11 rounded-lg bg-emerald-50 border-2 border-emerald-200 px-2 flex items-center justify-end">
                      <div className="text-base font-extrabold text-emerald-700 tabular-nums">
                        {previewSqft > 0 ? previewSqft.toFixed(2) : '—'}
                      </div>
                    </div>
                  </div>
                </div>
                {sqftMismatch && (
                  <div className="mt-2 rounded-lg bg-amber-50 border-2 border-amber-200 p-2.5 flex items-start gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-900 font-semibold">
                      <strong>Mismatch:</strong> Cut piece ({previewSqft.toFixed(2)} sqft) return qty ({returnedSqft.toFixed(2)} sqft) se alag hai. OK hai agar partial damage hai.
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs uppercase font-extrabold text-emerald-700">Cut Piece Code</div>
                    <div className="font-mono text-base font-extrabold text-emerald-900 mt-0.5">Auto-generated</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase font-extrabold text-emerald-700">
                      {isDamaged ? 'Sale Price (Damaged)' : 'Sale Price (80% discount)'}
                    </div>
                    <div className="text-2xl font-extrabold text-emerald-900 tabular-nums mt-0.5">
                      {formatPKRFull(previewPrice)}
                    </div>
                  </div>
                </div>
                {!isDamaged && pricePerSqft > 0 && (
                  <div className="text-xs text-emerald-700 font-bold mt-2 pt-2 border-t-2 border-emerald-200">
                    Original: {formatPKR(pricePerSqft)}/sqft × {previewSqft.toFixed(2)} × 0.8
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-600 uppercase mb-1.5">Notes (optional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                  placeholder="e.g. Customer returned for color mismatch, slightly used corner..."
                  className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500 resize-none" />
              </div>
            </>
          )}
        </div>

        <div className="px-5 py-3 border-t-2 border-slate-200 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-extrabold text-slate-600 hover:bg-slate-200 transition">
            Cancel
          </button>
          <Button onClick={handleConfirm}
            className={isDamaged ? 'bg-rose-600 hover:bg-rose-700 shadow-lg' : 'bg-gradient-to-r from-emerald-700 to-emerald-600 shadow-lg'}>
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
      isRollCut: true, isCutPiece: false,
      rollNumber: rollMatch[1],
      widthFt: Number(rollMatch[2]),
      lengthFt: Number(rollMatch[3]),
      lengthInch: rollMatch[4] ? Number(rollMatch[4]) : 0,
    };
  }

  const cutMatch = note.match(/Cut piece ([\w-]+)(?:\s*[•·]\s*([\d.]+)\s*ft\s*[xX×]\s*([\d.]+)\s*ft)?/);
  if (cutMatch) {
    return {
      isRollCut: false, isCutPiece: true,
      pieceCode: cutMatch[1],
      widthFt: cutMatch[2] ? Number(cutMatch[2]) : undefined,
      lengthFt: cutMatch[3] ? Number(cutMatch[3]) : undefined,
    };
  }

  return { isRollCut: false, isCutPiece: false };
}
