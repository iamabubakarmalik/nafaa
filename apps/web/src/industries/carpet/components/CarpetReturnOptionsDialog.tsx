/**
 * Carpet line in a return: what comes back. A roll cut comes back as a
 * piece of the returned size (good or damaged); a sold piece goes back on
 * sale by itself once the whole line is returned.
 */

import { useState } from 'react';
import { Button, Input, Modal, Segmented } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { r2, readCarpetNote, realFt } from '../lib/meta';

export interface CarpetReturnOptions {
  createCutPiece: boolean;
  isDamaged: boolean;
  cutPieceCondition: string;
  cutPieceWidthFt: number;
  cutPieceLengthFt: number;
  cutPieceNotes: string;
}

interface CarpetInfo { rollNumber?: string; pieceCode?: string; widthFt?: number; lengthFt?: number; isRollCut: boolean; isCutPiece: boolean }

/** Reads a carpet bill line note (roll numbers with spaces, widths with inches). */
export function parseCarpetNoteClient(note?: string | null): CarpetInfo & { lengthInch?: number } {
  const info = readCarpetNote(note);
  if (!info) return { isRollCut: false, isCutPiece: false };
  const m = info.size && /^(\d+(?:\.\d+)?)ft(?:\s+(\d+(?:\.\d+)?)in)?\s*×\s*(\d+(?:\.\d+)?)ft(?:\s+(\d+(?:\.\d+)?)in)?/.exec(info.size);
  const widthFt = m ? r2(realFt(Number(m[1]), Number(m[2] ?? 0))) : undefined;
  const lengthFt = m ? r2(realFt(Number(m[3]), Number(m[4] ?? 0))) : undefined;
  return info.kind === 'roll'
    ? { isRollCut: true, isCutPiece: false, rollNumber: info.ref, widthFt, lengthFt, lengthInch: 0 }
    : { isRollCut: false, isCutPiece: true, pieceCode: info.ref, widthFt, lengthFt };
}

const CONDITIONS = ['Good', 'Thora istemal', 'Kinara ghisa'];
const digits = (v: string) => v.replace(/[^\d.]/g, '');

export function CarpetReturnOptionsDialog({ carpetInfo, productName, variantName, returnedSqft, pricePerSqft, initialOptions, onConfirm, onClose }: {
  carpetInfo: CarpetInfo; productName: string; variantName?: string; returnedSqft: number; pricePerSqft: number;
  initialOptions?: Partial<CarpetReturnOptions>; onConfirm: (options: CarpetReturnOptions) => void; onClose: () => void;
}) {
  const [state, setState] = useState<'good' | 'damaged'>(initialOptions?.isDamaged ? 'damaged' : 'good');
  const [condition, setCondition] = useState(initialOptions?.cutPieceCondition ?? 'Good');
  const [width, setWidth] = useState(String(initialOptions?.cutPieceWidthFt ?? carpetInfo.widthFt ?? ''));
  const [length, setLength] = useState(String(initialOptions?.cutPieceLengthFt ?? (carpetInfo.widthFt && returnedSqft ? r2(returnedSqft / carpetInfo.widthFt) : carpetInfo.lengthFt ?? '')));
  const [notes, setNotes] = useState(initialOptions?.cutPieceNotes ?? '');
  const w = Number(width || 0);
  const l = Number(length || 0);
  const error = carpetInfo.isRollCut && !(w > 0 && l > 0) ? 'Wapas aaye tukre ki chaurai aur lambai likhein' : null;

  const confirm = () => {
    if (error) return;
    onConfirm({
      // A sold piece is put back on sale after the return; only roll cuts make a new piece.
      createCutPiece: carpetInfo.isRollCut,
      isDamaged: state === 'damaged',
      cutPieceCondition: state === 'damaged' ? 'Damaged' : condition,
      cutPieceWidthFt: w,
      cutPieceLengthFt: l,
      cutPieceNotes: notes.trim(),
    });
  };

  return (
    <Modal open onClose={onClose} size="md" title={`Carpet wapsi — ${productName}${variantName ? ` (${variantName})` : ''}`}
      description={carpetInfo.isRollCut ? `Roll ${carpetInfo.rollNumber} se kata hissa — wapas aa kar tukra banega` : `Tukra ${carpetInfo.pieceCode} — poori line wapas ho to dobara bikne ko tayyar ho jata hai`}
      footer={<><Button variant="ghost" onClick={onClose}>Band karein</Button><Button onClick={confirm} disabled={!!error}>Theek hai</Button></>}>
      <div className="space-y-3">
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-[0.875rem] text-slate-700">Wapsi: <b className="tabular-nums">{r2(returnedSqft)}</b> · refund rate {formatPKR(pricePerSqft)}</p>
        <Segmented value={state} onChange={setState} items={[{ value: 'good', label: 'Theek halat' }, { value: 'damaged', label: 'Kharab / damage' }]} />
        {carpetInfo.isRollCut ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Input label="Chaurai (ft)" inputMode="decimal" value={width} onChange={(e) => setWidth(digits(e.target.value))} />
              <Input label="Lambai (ft)" inputMode="decimal" value={length} onChange={(e) => setLength(digits(e.target.value))} error={error ?? undefined} />
            </div>
            {state === 'good' && (
              <div className="flex flex-wrap gap-1.5">
                {CONDITIONS.map((c) => <button key={c} type="button" onClick={() => setCondition(c)} className={`h-8 rounded-lg px-2.5 text-[0.8125rem] font-medium ${condition === c ? 'bg-brand-600 text-brand-fg' : 'bg-slate-100 text-slate-700'}`}>{c}</button>)}
              </div>
            )}
            <p className="text-[0.8125rem] text-slate-600">{state === 'good' ? `Naya tukra ${r2(w * l)} sqft ka banega, roll rate ke 80% par.` : 'Tukra damage me jayega — stock me nahi ginega.'}</p>
          </>
        ) : (
          <p className="text-[0.8125rem] text-slate-600">{state === 'good' ? 'Tukra dobara bikne ko tayyar ho jayega.' : 'Wapsi ke baad Tukre page par is tukre ko "Hatayein" karein taake ye na bike.'}</p>
        )}
        <Input label="Note" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Wapsi ki wajah" />
      </div>
    </Modal>
  );
}
