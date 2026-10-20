/** Add a piece by hand (opening remnant, rug offcut) or edit a piece's size, price, condition and place. Sold pieces cannot be edited. */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, Input, Modal, Select } from '@/design-system/components';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { useShopParam } from '@core/stores/auth.store';
import { carpetCutPiecesApi, type CarpetCutPiece, type CarpetCutPieceStatus } from '../api/carpet-cut-pieces.api';
import { isCarpetUnit, r2, realFt } from '../lib/meta';
import { useSaveKey } from '../hooks/usePageKeys';

const n = (v: string) => (v.trim() === '' ? 0 : Number(v));
const digits = (v: string) => v.replace(/[^\d.]/g, '');
const errText = (e: unknown, fb: string) => (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message?.toString() || fb;

export function PieceFormModal({ piece, onClose, onSaved }: { piece?: CarpetCutPiece; onClose: () => void; onSaved: () => void }) {
  const shopId = useShopParam();
  const edit = !!piece;
  const [f, setF] = useState({
    productId: piece?.productId ?? '', pieceCode: piece?.pieceCode ?? '',
    widthFt: piece ? String(piece.widthFt) : '', widthInch: piece?.widthInch ? String(piece.widthInch) : '',
    lengthFt: piece ? String(piece.lengthFt) : '', lengthInch: piece?.lengthInch ? String(piece.lengthInch) : '',
    cost: piece ? String(piece.costAmount) : '', price: piece ? String(piece.salePrice) : '',
    condition: piece?.condition ?? 'Good', rack: piece?.rackNumber ?? '', notes: piece?.notes ?? '',
    status: (piece?.status ?? 'AVAILABLE') as CarpetCutPieceStatus,
  });
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const { data: products } = useQuery({ queryKey: ['carpet-roll-products'], queryFn: () => productsApi.list({ limit: 1000, isActive: true }), enabled: !edit, staleTime: 60_000 });
  const sqft = r2(realFt(n(f.widthFt), n(f.widthInch)) * realFt(n(f.lengthFt), n(f.lengthInch)));

  const errors: Record<string, string> = {};
  if (!edit && !f.productId) errors.product = 'Carpet chunein';
  if (!(sqft > 0)) errors.size = 'Chaurai aur lambai likhein';
  if (n(f.widthInch) >= 12 || n(f.lengthInch) >= 12) errors.size = 'Inch 12 se kam likhein';
  if (!(n(f.price) > 0) && f.status !== 'DAMAGED') errors.price = 'Poore tukre ki qeemat likhein';

  const save = async () => {
    setTried(true);
    if (Object.keys(errors).length || busy) return;
    setBusy(true);
    const body = {
      pieceCode: f.pieceCode.trim() || undefined, widthFt: n(f.widthFt), widthInch: n(f.widthInch), lengthFt: n(f.lengthFt), lengthInch: n(f.lengthInch),
      costAmount: n(f.cost), salePrice: n(f.price), condition: f.condition.trim() || undefined, rackNumber: f.rack.trim() || undefined, notes: f.notes.trim() || undefined, status: f.status,
    };
    try {
      if (edit) await carpetCutPiecesApi.update(piece!.id, body);
      else await carpetCutPiecesApi.create({ ...body, productId: f.productId, shopId, sourceType: 'MANUAL' });
      toast.success(edit ? 'Tukra save ho gaya' : 'Tukra ban gaya');
      onSaved();
    } catch (e) { toast.error(errText(e, 'Save nahi hua')); } finally { setBusy(false); }
  };
  useSaveKey(() => void save());
  const err = (k: string) => (tried ? errors[k] : undefined);

  return (
    <Modal open onClose={onClose} size="lg" title={edit ? `Tukra ${piece!.pieceCode}` : 'Naya tukra'} description="Bacha hua ya alag para carpet ka tukra, poori qeemat par bikta hai"
      footer={<><Button variant="ghost" onClick={onClose}>Band karein</Button><Button onClick={() => void save()} loading={busy}>Save (Ctrl+S)</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {!edit && <Select label="Carpet" value={f.productId} onChange={(e) => set({ productId: e.target.value })} error={err('product')} placeholder="Carpet chunein"
          options={(products?.items ?? []).filter((p) => isCarpetUnit(p.unit)).map((p) => ({ value: p.id, label: p.name }))} />}
        <Input label="Piece code" value={f.pieceCode} onChange={(e) => set({ pieceCode: e.target.value })} hint="Khaali chhorein to khud banega" />
        <div className="grid grid-cols-2 gap-2">
          <Input label="Chaurai ft" inputMode="decimal" value={f.widthFt} onChange={(e) => set({ widthFt: digits(e.target.value) })} error={err('size')} />
          <Input label="inch" inputMode="decimal" value={f.widthInch} onChange={(e) => set({ widthInch: digits(e.target.value) })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input label="Lambai ft" inputMode="decimal" value={f.lengthFt} onChange={(e) => set({ lengthFt: digits(e.target.value) })} />
          <Input label="inch" inputMode="decimal" value={f.lengthInch} onChange={(e) => set({ lengthInch: digits(e.target.value) })} />
        </div>
        <Input label="Poore tukre ki qeemat" inputMode="decimal" value={f.price} onChange={(e) => set({ price: digits(e.target.value) })} error={err('price')} hint={sqft > 0 && n(f.price) > 0 ? `${r2(n(f.price) / sqft)} / sqft` : undefined} />
        <Input label="Poore tukre ki cost" inputMode="decimal" value={f.cost} onChange={(e) => set({ cost: digits(e.target.value) })} hint="Profit report isi se banti hai" />
        <Input label="Halat" value={f.condition} onChange={(e) => set({ condition: e.target.value })} placeholder="Good, kinara ghisa hua" />
        <Input label="Rack / jagah" value={f.rack} onChange={(e) => set({ rack: e.target.value })} />
        {edit && <Select label="Status" value={f.status} onChange={(e) => set({ status: e.target.value as CarpetCutPieceStatus })}
          options={[{ value: 'AVAILABLE', label: 'Bikne ko tayyar' }, { value: 'RESERVED', label: 'Reserved (customer ke liye)' }, { value: 'DAMAGED', label: 'Damage' }]} />}
        <Input label="Note" value={f.notes} onChange={(e) => set({ notes: e.target.value })} wrapperClassName="sm:col-span-2" />
      </div>
      <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[0.875rem] text-slate-700">Area: <b className="tabular-nums">{sqft} sqft</b></p>
    </Modal>
  );
}
