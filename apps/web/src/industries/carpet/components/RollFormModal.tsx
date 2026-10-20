/**
 * Add an opening roll or edit a roll's details. Size can be changed only
 * before the first cut (the server refuses it after); length changes after
 * that go through Adjust so every change is recorded.
 */

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, Input, Modal, Select } from '@/design-system/components';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { productVariantsApi } from '@modules/inventory/products/api/product-variants.api';
import { useShopParam } from '@core/stores/auth.store';
import { carpetRollsApi, type CarpetRoll } from '../api/carpet-rolls.api';
import { isCarpetUnit, r2, realFt } from '../lib/meta';
import { useSaveKey } from '../hooks/usePageKeys';

const n = (v: string) => (v.trim() === '' ? 0 : Number(v));
const digits = (v: string) => v.replace(/[^\d.]/g, '');
const errText = (e: unknown, fb: string) => (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message?.toString() || fb;

export function RollFormModal({ roll, productId, onClose, onSaved }: { roll?: CarpetRoll; productId?: string; onClose: () => void; onSaved: (r: CarpetRoll) => void }) {
  const shopId = useShopParam();
  const edit = !!roll;
  const cut = (roll?._count?.movements ?? roll?.movements?.length ?? 1) > 1;
  const [f, setF] = useState({
    productId: roll?.productId ?? productId ?? '', variantId: roll?.variantId ?? '', rollNumber: roll?.rollNumber ?? '', designCode: roll?.designCode ?? '',
    widthFt: String(roll?.widthFt ?? 12), widthInch: roll?.widthInch ? String(roll.widthInch) : '',
    lengthFt: roll ? String(roll.originalLengthFt) : '', lengthInch: roll?.originalLengthInch ? String(roll.originalLengthInch) : '',
    cost: roll ? String(roll.costPerSqft) : '', rate: roll ? String(roll.salePricePerSqft) : '', wholesale: roll?.wholesalePricePerSqft ? String(roll.wholesalePricePerSqft) : '',
    rack: roll?.rackNumber ?? '', quality: roll?.quality ?? '', notes: roll?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [tried, setTried] = useState(false);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  const { data: products } = useQuery({ queryKey: ['carpet-roll-products'], queryFn: () => productsApi.list({ limit: 1000, isActive: true }), enabled: !edit, staleTime: 60_000 });
  const carpetProducts = (products?.items ?? []).filter((p) => isCarpetUnit(p.unit));
  const { data: variants = [] } = useQuery({ queryKey: ['carpet-roll-variants', f.productId], queryFn: () => productVariantsApi.list(f.productId), enabled: !!f.productId });
  useEffect(() => {
    const p = carpetProducts.find((x) => x.id === f.productId);
    if (!edit && p && p.unit === 'sqft' && !f.rate && !f.cost) set({ rate: String(p.price || ''), cost: String(p.costPrice || '') });
  }, [f.productId]); // eslint-disable-line react-hooks/exhaustive-deps

  const sqft = r2(realFt(n(f.widthFt), n(f.widthInch)) * realFt(n(f.lengthFt), n(f.lengthInch)));
  const errors: Record<string, string> = {};
  if (!f.productId) errors.product = 'Carpet chunein';
  if (!(realFt(n(f.widthFt), n(f.widthInch)) > 0)) errors.width = 'Chaurai likhein';
  if (!(realFt(n(f.lengthFt), n(f.lengthInch)) > 0)) errors.length = 'Lambai likhein';
  if (n(f.widthInch) >= 12 || n(f.lengthInch) >= 12) errors.length = 'Inch 12 se kam likhein';
  if (!(n(f.rate) > 0)) errors.rate = 'Bechne ka rate likhein';
  if (n(f.cost) > n(f.rate) && n(f.rate) > 0) errors.cost = 'Cost rate se zyada hai — check karein';

  const save = async () => {
    setTried(true);
    if (Object.keys(errors).length || saving) return;
    setSaving(true);
    const body = {
      variantId: f.variantId || undefined, rollNumber: f.rollNumber.trim() || undefined, designCode: f.designCode.trim() || undefined,
      costPerSqft: n(f.cost), salePricePerSqft: n(f.rate), wholesalePricePerSqft: f.wholesale ? n(f.wholesale) : undefined,
      rackNumber: f.rack.trim() || undefined, quality: f.quality.trim() || undefined, notes: f.notes.trim() || undefined,
      ...(!cut && { widthFt: n(f.widthFt), widthInch: n(f.widthInch), originalLengthFt: n(f.lengthFt), originalLengthInch: n(f.lengthInch) }),
    };
    try {
      const saved = edit
        ? await carpetRollsApi.update(roll!.id, body)
        : await carpetRollsApi.create({ ...body, productId: f.productId, shopId, widthFt: n(f.widthFt), originalLengthFt: n(f.lengthFt), sourceType: 'OPENING_STOCK' });
      toast.success(edit ? 'Roll save ho gaya' : `Roll ${saved.rollNumber} ban gaya`);
      onSaved(saved);
    } catch (e) { toast.error(errText(e, 'Roll save nahi hua')); } finally { setSaving(false); }
  };
  useSaveKey(() => void save());
  const err = (k: string) => (tried ? errors[k] : undefined);

  return (
    <Modal open onClose={onClose} size="lg" title={edit ? `Roll ${roll!.rollNumber}` : 'Naya roll (opening stock)'}
      description={edit ? 'Rate, rack aur details. Lambai badalni ho to Adjust karein.' : 'Dukaan me para roll. Supplier se aaya roll Purchase se daalein, taake payment bhi likhi jaye.'}
      footer={<><Button variant="ghost" onClick={onClose}>Band karein</Button><Button onClick={() => void save()} loading={saving}>Save (Ctrl+S)</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {!edit && (
          <Select label="Carpet" value={f.productId} onChange={(e) => set({ productId: e.target.value, variantId: '' })} error={err('product')} placeholder="Carpet chunein"
            options={carpetProducts.map((p) => ({ value: p.id, label: p.name }))} hint={carpetProducts.length ? undefined : 'Pehle sqft / running ft wala product banayein'} />
        )}
        {variants.length > 0 && <Select label="Design / rang" value={f.variantId} onChange={(e) => set({ variantId: e.target.value })} placeholder="Koi nahi" options={variants.filter((v) => v.isActive).map((v) => ({ value: v.id, label: v.name }))} />}
        <Input label="Roll number" value={f.rollNumber} onChange={(e) => set({ rollNumber: e.target.value })} hint="Khaali chhorein to khud banega (CR-2026-0001)" />
        <Input label="Supplier ka design code" value={f.designCode} onChange={(e) => set({ designCode: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <Input label="Chaurai ft" inputMode="decimal" value={f.widthFt} disabled={cut} onChange={(e) => set({ widthFt: digits(e.target.value) })} error={err('width')} />
          <Input label="inch" inputMode="decimal" value={f.widthInch} disabled={cut} onChange={(e) => set({ widthInch: digits(e.target.value) })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input label="Lambai ft" inputMode="decimal" value={f.lengthFt} disabled={cut} onChange={(e) => set({ lengthFt: digits(e.target.value) })} error={err('length')} />
          <Input label="inch" inputMode="decimal" value={f.lengthInch} disabled={cut} onChange={(e) => set({ lengthInch: digits(e.target.value) })} />
        </div>
        <Input label="Cost / sqft" inputMode="decimal" value={f.cost} onChange={(e) => set({ cost: digits(e.target.value) })} error={err('cost')} hint="Aap ne kitne me liya" />
        <Input label="Rate / sqft" inputMode="decimal" value={f.rate} onChange={(e) => set({ rate: digits(e.target.value) })} error={err('rate')} hint="Counter par yehi rate lagta hai" />
        <Input label="Wholesale rate / sqft" inputMode="decimal" value={f.wholesale} onChange={(e) => set({ wholesale: digits(e.target.value) })} />
        <Input label="Rack / jagah" value={f.rack} onChange={(e) => set({ rack: e.target.value })} placeholder="Godown-A, Rack 3" />
        <Input label="Quality" value={f.quality} onChange={(e) => set({ quality: e.target.value })} placeholder="Premium, Standard" />
        <Input label="Note" value={f.notes} onChange={(e) => set({ notes: e.target.value })} />
      </div>
      <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[0.875rem] text-slate-700">Roll ka area: <b className="tabular-nums">{sqft} sqft</b>{n(f.rate) > 0 && <> · bechne par <b className="tabular-nums">Rs {Math.round(sqft * n(f.rate)).toLocaleString('en-PK')}</b></>}{cut && ' · size ab nahi badal sakta (roll kat chuka)'}</p>
    </Modal>
  );
}
