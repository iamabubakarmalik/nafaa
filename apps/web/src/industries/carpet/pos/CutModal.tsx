/**
 * Roll cut and piece picker for one carpet product, used by the counter and
 * by bookings. Roll tab: pick a roll, write the width the customer takes
 * (full width by default) and the length; sqft, rate in the product's unit,
 * total and the strip left beside the cut are worked out live. Piece tab:
 * remnants and returned pieces of this product, sold whole.
 *
 * Rolls and pieces come from the server, or from the offline copy when
 * there is no internet (the bill is then cut from stock once it syncs).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Check, Layers, MapPin, Scissors, WifiOff } from 'lucide-react';
import { Button, Modal, Segmented, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { useShopParam } from '@core/stores/auth.store';
import { getCachedCutPieces, getCachedRollsForProduct } from '@core/lib/offline/offlineCarpet';
import { carpetRollsApi, type CarpetRoll } from '../api/carpet-rolls.api';
import { carpetCutPiecesApi, type CarpetCutPiece } from '../api/carpet-cut-pieces.api';
import { PIECES_KEY, ROLLS_KEY, ftIn, pieceNote, qtyInUnit, r2, rateInUnit, realFt, rollCutNote, unitLabel } from '../lib/meta';

export interface RollCut {
  roll: CarpetRoll;
  widthFt: number;
  widthInch: number;
  lengthFt: number;
  lengthInch: number;
  /** Customer's area. */
  sqft: number;
  /** Quantity in the product's unit, and the rate for one unit. */
  qty: number;
  rate: number;
  keepLeftover: boolean;
  note: string;
}

export interface PieceSale { piece: CarpetCutPiece; qty: number; rate: number; note: string }

interface Props {
  product: { id: string; name: string; unit: string; price?: number };
  variantId?: string | null;
  /** Which tabs to show; both by default. */
  mode?: 'both' | 'roll' | 'piece';
  preSelectedRollId?: string;
  onRoll?: (cut: RollCut) => void;
  onPiece?: (sale: PieceSale) => void;
  onClose: () => void;
}

const num = (v: string) => (v.trim() === '' ? 0 : Number(v));
const field = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[0.9375rem] tabular-nums text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15';

function useRollsAndPieces(productId: string, variantId?: string | null) {
  const shopId = useShopParam();
  const online = typeof navigator === 'undefined' || navigator.onLine;
  const rolls = useQuery({
    queryKey: [ROLLS_KEY, 'cut', productId, variantId ?? '', shopId ?? '', online],
    queryFn: async (): Promise<CarpetRoll[]> => {
      if (online) {
        const res = await carpetRollsApi.list({ productId, variantId: variantId ?? undefined, inStockOnly: true, shopId, limit: 200 });
        return res.items.filter((r) => r.status === 'ACTIVE' || r.status === 'RESERVED');
      }
      const cached = await getCachedRollsForProduct(productId, variantId ?? undefined);
      return cached.map((c) => ({
        id: c.id, rollNumber: c.rollNumber, productId: c.productId, variantId: c.variantId ?? null,
        widthFt: c.widthFt, widthInch: c.widthInch, remainingLengthFt: c.lengthFt, remainingLengthInch: c.lengthInch,
        remainingSqft: c.totalSqft, salePricePerSqft: c.salePricePerSqft, status: 'ACTIVE',
      }) as unknown as CarpetRoll);
    },
    staleTime: 15_000,
  });
  const pieces = useQuery({
    queryKey: [PIECES_KEY, 'cut', productId, variantId ?? '', shopId ?? '', online],
    queryFn: async (): Promise<CarpetCutPiece[]> => {
      if (online) return (await carpetCutPiecesApi.list({ productId, variantId: variantId ?? undefined, status: 'AVAILABLE', shopId, limit: 200 })).items;
      return (await getCachedCutPieces(productId)) as unknown as CarpetCutPiece[];
    },
    staleTime: 15_000,
  });
  return { rolls, pieces, online };
}

export function CutModal({ product, variantId, mode = 'both', preSelectedRollId, onRoll, onPiece, onClose }: Props) {
  const { rolls, pieces, online } = useRollsAndPieces(product.id, variantId);
  const rollList = useMemo(() => rolls.data ?? [], [rolls.data]);
  const pieceList = pieces.data ?? [];
  const [tab, setTab] = useState<'roll' | 'piece'>(mode === 'piece' ? 'piece' : 'roll');
  const [rollId, setRollId] = useState<string | undefined>(preSelectedRollId);
  const roll = rollList.find((r) => r.id === rollId) ?? (rollList.length === 1 ? rollList[0] : undefined);

  // Once rolls load with nothing chosen, an empty roll tab moves to pieces.
  useEffect(() => {
    if (mode === 'both' && rolls.isSuccess && pieces.isSuccess && rollList.length === 0 && pieceList.length > 0) setTab('piece');
  }, [mode, rolls.isSuccess, pieces.isSuccess, rollList.length, pieceList.length]);

  return (
    <Modal open onClose={onClose} size="xl" title={product.name}
      description={`Roll se kaatein ya tukra chunein · bill ${unitLabel(product.unit)} me banega`}>
      {!online && (
        <p className="mb-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
          <WifiOff className="h-4 w-4" />Internet nahi — purani list dikh rahi hai. Bill sync hone par roll se kaata jayega.
        </p>
      )}
      {mode === 'both' && (
        <Segmented className="mb-4" value={tab} onChange={setTab}
          items={[{ value: 'roll', label: <span className="inline-flex items-center gap-1.5"><Layers className="h-4 w-4" />Roll se kaatein</span>, count: rollList.length },
            { value: 'piece', label: <span className="inline-flex items-center gap-1.5"><Scissors className="h-4 w-4" />Tukre</span>, count: pieceList.length }]} />
      )}
      {tab === 'roll' ? (
        rolls.isLoading ? <Skeleton className="h-48 rounded-2xl" />
          : rollList.length === 0 ? <Empty text="Is product ka koi chalu roll nahi." hint="Carpet Rolls se roll daalein ya purchase karein." />
            : (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <ul className="grid max-h-[52dvh] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {rollList.map((r) => (
                    <li key={r.id}>
                      <button type="button" onClick={() => setRollId(r.id)}
                        className={cn('w-full rounded-2xl p-3 text-left ring-1 transition', roll?.id === r.id ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-slate-200 hover:bg-slate-50')}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[0.8125rem] font-semibold text-slate-900">{r.rollNumber}</span>
                          {roll?.id === r.id && <Check className="h-4 w-4 text-brand-600" />}
                        </div>
                        {r.variant?.name && <p className="mt-0.5 flex items-center gap-1.5 text-[0.75rem] text-slate-600">{r.variant.colorHex && <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style={{ background: r.variant.colorHex }} />}{r.variant.name}</p>}
                        <p className="mt-1 text-[0.8125rem] text-slate-700">{ftIn(r.widthFt, r.widthInch)} chaurai · {ftIn(r.remainingLengthFt, r.remainingLengthInch)} bacha</p>
                        <p className="text-[0.75rem] text-slate-500 tabular-nums">{r2(r.remainingSqft)} sqft · {formatPKR(r.salePricePerSqft)}/sqft{r.rackNumber ? ` · ${r.rackNumber}` : ''}</p>
                        {r.status === 'RESERVED' && <span className="mt-1 inline-block rounded-md bg-violet-50 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-violet-700">Reserved</span>}
                      </button>
                    </li>
                  ))}
                </ul>
                {roll ? <RollCutForm key={roll.id} roll={roll} product={product} onDone={(c) => onRoll?.(c)} />
                  : <Empty text="Roll chunein" hint="Baayein taraf se roll par click karein." />}
              </div>
            )
      ) : (
        pieces.isLoading ? <Skeleton className="h-48 rounded-2xl" />
          : pieceList.length === 0 ? <Empty text="Is product ka koi tukra nahi." hint="Roll kaatne par bacha tukra yahan khud aata hai." />
            : (
              <ul className="grid max-h-[56dvh] gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                {pieceList.map((p) => {
                  const w = realFt(p.widthFt, p.widthInch ?? 0);
                  const l = realFt(p.lengthFt, p.lengthInch ?? 0);
                  const qty = qtyInUnit(product.unit, w, l);
                  const price = Number(p.salePrice) || r2(Number(p.pricePerSqft ?? 0) * Number(p.totalSqft));
                  return (
                    <li key={p.id}>
                      <button type="button" disabled={!(price > 0) || !(qty > 0)}
                        onClick={() => onPiece?.({ piece: p, qty, rate: r2(price / qty), note: pieceNote(p.pieceCode, p.widthFt, p.widthInch ?? 0, p.lengthFt, p.lengthInch ?? 0) })}
                        className="w-full rounded-2xl bg-white p-3 text-left ring-1 ring-slate-200 transition hover:bg-violet-50 hover:ring-violet-300 disabled:opacity-50">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[0.8125rem] font-semibold text-slate-900">{p.pieceCode}</span>
                          <span className="font-semibold tabular-nums text-violet-700">{price > 0 ? formatPKR(price) : 'Rate nahi'}</span>
                        </div>
                        <p className="mt-1 text-[0.8125rem] text-slate-700">{ftIn(p.widthFt, p.widthInch ?? 0)} × {ftIn(p.lengthFt, p.lengthInch ?? 0)} · {r2(p.totalSqft)} sqft</p>
                        <p className="text-[0.75rem] text-slate-500">{[p.condition, p.rackNumber && `Rack ${p.rackNumber}`, p.sourceRoll?.rollNumber && `Roll ${p.sourceRoll.rollNumber}`].filter(Boolean).join(' · ')}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
      )}
    </Modal>
  );
}

function Empty({ text, hint }: { text: string; hint: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-slate-50 px-6 py-10 text-center ring-1 ring-slate-200">
      <Layers className="h-8 w-8 text-slate-400" />
      <p className="mt-2 font-semibold text-slate-800">{text}</p>
      <p className="text-[0.8125rem] text-slate-500">{hint}</p>
    </div>
  );
}

function RollCutForm({ roll, product, onDone }: { roll: CarpetRoll; product: Props['product']; onDone: (c: RollCut) => void }) {
  const fullW = realFt(roll.widthFt, roll.widthInch);
  const leftLen = realFt(roll.remainingLengthFt, roll.remainingLengthInch);
  const [wFt, setWFt] = useState(String(Math.floor(fullW)));
  const [wIn, setWIn] = useState(String(r2((fullW - Math.floor(fullW)) * 12) || ''));
  const [lFt, setLFt] = useState('');
  const [lIn, setLIn] = useState('');
  const [keep, setKeep] = useState(true);
  const lenRef = useRef<HTMLInputElement>(null);
  useEffect(() => { lenRef.current?.focus(); }, []);

  const width = realFt(num(wFt), num(wIn));
  const length = realFt(num(lFt), num(lIn));
  const defaultRate = Number(roll.salePricePerSqft) > 0 ? rateInUnit(product.unit, Number(roll.salePricePerSqft), width || fullW) : Number(product.price ?? 0);
  const [rateText, setRateText] = useState('');
  const rate = rateText.trim() === '' ? defaultRate : num(rateText);
  const area = r2(width * length);
  const qty = qtyInUnit(product.unit, width, length);
  const total = r2(qty * rate);
  const strip = r2(fullW - width);

  const error =
    num(wIn) >= 12 || num(lIn) >= 12 ? 'Inch 12 se kam likhein'
      : width <= 0 ? 'Chaurai likhein'
        : width > fullW + 0.001 ? `Chaurai roll se zyada hai (roll ${ftIn(roll.widthFt, roll.widthInch)})`
          : length <= 0 ? 'Lambai likhein'
            : length > leftLen + 0.001 ? `Roll me sirf ${ftIn(roll.remainingLengthFt, roll.remainingLengthInch)} bacha hai`
              : !(rate > 0) ? 'Rate likhein'
                : null;

  const submit = () => {
    if (error) return;
    const wf = Math.floor(width + 1e-9);
    const lf = Math.floor(length + 1e-9);
    const wi = r2((width - wf) * 12);
    const li = r2((length - lf) * 12);
    onDone({
      roll, widthFt: wf, widthInch: wi, lengthFt: lf, lengthInch: li, sqft: area, qty, rate, keepLeftover: keep,
      note: rollCutNote(roll.rollNumber, wf, wi, lf, li, strip > 0.1 ? keep : true),
    });
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <p className="text-[0.8125rem] font-semibold text-slate-800">{roll.rollNumber} · {ftIn(roll.widthFt, roll.widthInch)} × {ftIn(roll.remainingLengthFt, roll.remainingLengthInch)}</p>
      <div>
        <span className="mb-1 block text-[0.8125rem] font-medium text-slate-700">Chaurai (customer kitni chaurai le raha hai)</span>
        <div className="grid grid-cols-2 gap-2">
          <input aria-label="Chaurai feet" inputMode="decimal" value={wFt} onChange={(e) => setWFt(e.target.value.replace(/[^\d.]/g, ''))} className={field} placeholder="ft" />
          <input aria-label="Chaurai inch" inputMode="decimal" value={wIn} onChange={(e) => setWIn(e.target.value.replace(/[^\d.]/g, ''))} className={field} placeholder="inch" />
        </div>
        <button type="button" onClick={() => { setWFt(String(Math.floor(fullW))); setWIn(String(r2((fullW - Math.floor(fullW)) * 12) || '')); }}
          className="mt-1 text-[0.75rem] font-semibold text-brand-700 hover:underline">Poori chaurai ({ftIn(roll.widthFt, roll.widthInch)})</button>
      </div>
      <div>
        <span className="mb-1 block text-[0.8125rem] font-medium text-slate-700">Lambai</span>
        <div className="grid grid-cols-2 gap-2">
          <input ref={lenRef} aria-label="Lambai feet" inputMode="decimal" value={lFt} onChange={(e) => setLFt(e.target.value.replace(/[^\d.]/g, ''))} className={field} placeholder="ft" />
          <input aria-label="Lambai inch" inputMode="decimal" value={lIn} onChange={(e) => setLIn(e.target.value.replace(/[^\d.]/g, ''))} className={field} placeholder="inch" />
        </div>
      </div>
      <div>
        <span className="mb-1 block text-[0.8125rem] font-medium text-slate-700">Rate / {unitLabel(product.unit)}</span>
        <input aria-label="Rate" inputMode="decimal" value={rateText} placeholder={String(defaultRate)} onChange={(e) => setRateText(e.target.value.replace(/[^\d.]/g, ''))} className={field} />
        <p className="mt-1 text-[0.75rem] text-slate-500">Khaali chhorein to roll ka rate ({formatPKR(Number(roll.salePricePerSqft))}/sqft) lagega.</p>
      </div>
      {strip > 0.1 && length > 0 && (
        <label className="flex items-start gap-2 rounded-xl bg-white p-2.5 text-[0.8125rem] ring-1 ring-slate-200">
          <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-600" />
          <span>Bacha tukra {ftIn(Math.floor(strip), r2((strip - Math.floor(strip)) * 12))} × {ftIn(Math.floor(length), r2((length - Math.floor(length)) * 12))} ({r2(strip * length)} sqft) <b>piece</b> ban kar stock me rahega. Waste hai to tick hata dein.</span>
        </label>
      )}
      <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
        <div className="flex justify-between text-[0.8125rem] text-slate-600"><span>Customer ka area</span><span className="tabular-nums">{area} sqft</span></div>
        {product.unit !== 'sqft' && <div className="flex justify-between text-[0.8125rem] text-slate-600"><span>Bill me</span><span className="tabular-nums">{qty} {unitLabel(product.unit)}</span></div>}
        <div className="mt-1 flex justify-between text-[1.0625rem] font-bold text-slate-900"><span>Total</span><span className="tabular-nums">{formatPKR(total)}</span></div>
      </div>
      {error && length > 0 && <p className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-rose-600"><AlertTriangle className="h-4 w-4" />{error}</p>}
      {roll.rackNumber && <p className="flex items-center gap-1 text-[0.75rem] text-slate-500"><MapPin className="h-3.5 w-3.5" />Rack {roll.rackNumber}</p>}
      <Button type="submit" className="w-full" disabled={!!error}>Bill me dalein (Enter)</Button>
    </form>
  );
}
