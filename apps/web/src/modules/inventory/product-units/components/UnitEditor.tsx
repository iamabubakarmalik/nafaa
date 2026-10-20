/**
 * Inline form to add or edit one pack of a product: name (quick presets),
 * how many base units it holds, price with quick "x% kam" buttons, cost,
 * wholesale price, barcode (scan or generate) and POS default. Shows the
 * loose price, the buyer's saving, margin and whole packs in stock live.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Save, ScanLine, Wand2, X } from 'lucide-react';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { Button, Switch } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { productUnitsApi, type UnitConversionType } from '@modules/inventory/products/api/product-units.api';
import type { OverviewProduct, OverviewUnit } from '../api/units-page.api';
import { TYPE_LABEL, TYPE_ORDER, UNIT_KEYS, packPrice, presetsFor, qtyText } from './meta';

const input = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15';

type ApiError = { response?: { data?: { message?: string | string[] } } };
export const apiMessage = (e: unknown, fallback: string) => {
  const m = (e as ApiError)?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || fallback;
};

export function UnitEditor({ product, unit, industryId, costHidden, onDone }: {
  product: OverviewProduct;
  /** The pack being edited; a new pack when empty. */
  unit?: OverviewUnit;
  industryId?: string;
  costHidden: boolean;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const isBase = !!unit?.isBase;
  const [name, setName] = useState(unit?.unitName ?? '');
  const [type, setType] = useState<UnitConversionType>(unit?.conversionType ?? 'PACK');
  const [rate, setRate] = useState(unit ? String(unit.conversionRate) : '');
  const [price, setPrice] = useState(unit ? String(unit.price) : '');
  const [cost, setCost] = useState(unit?.costPrice ? String(unit.costPrice) : '');
  const [wholesale, setWholesale] = useState(unit?.wholesalePrice ? String(unit.wholesalePrice) : '');
  const [barcode, setBarcode] = useState(unit?.barcode ?? '');
  const [variantId, setVariantId] = useState(unit?.variantId ?? '');
  const [isDefault, setDefault] = useState(!!unit?.isDefault);
  const [isActive, setActive] = useState(unit?.isActive ?? true);
  const [scan, setScan] = useState(false);

  const variant = product.variants.find((v) => v.id === variantId);
  const basePrice = Number(variant?.price ?? product.price) || 0;
  const baseCost = Number(product.costPrice) || 0;
  const r = Number(rate);
  const loose = r > 0 ? basePrice * r : 0;
  const p = Number(price) || 0;
  const c = cost.trim() ? Number(cost) || 0 : baseCost * (r || 0);
  const saving = loose - p;
  const margin = p > 0 ? ((p - c) / p) * 100 : 0;
  const presets = presetsFor(product.unit, industryId);

  const pickPreset = (n: string, rr: number, t: UnitConversionType) => {
    setName(n); setRate(String(rr)); setType(t);
    if (!price.trim() || !unit) setPrice(String(packPrice(basePrice, rr)));
  };

  const invalidate = () => UNIT_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const save = useMutation({
    mutationFn: () => {
      const data = {
        unitName: name.trim(),
        unitLabel: isBase ? undefined : `${name.trim()} (${qtyText(r)} ${product.unit})`,
        conversionType: isBase ? 'BASE' as const : type,
        conversionRate: isBase ? 1 : r,
        price: p,
        costPrice: cost.trim() ? Number(cost) || 0 : 0,
        wholesalePrice: wholesale.trim() ? Number(wholesale) || 0 : null,
        barcode: barcode.trim() || null,
        isDefault,
        isActive,
      };
      return unit ? productUnitsApi.update(unit.id, data) : productUnitsApi.create({ ...data, productId: product.id, variantId: variantId || null });
    },
    onSuccess: () => { invalidate(); toast.success(unit ? 'Pack save ho gaya' : `${name.trim()} jur gaya`); onDone(); },
    onError: (e) => toast.error(apiMessage(e, 'Save nahi hua')),
  });
  const gen = useMutation({
    mutationFn: () => productUnitsApi.generateBarcode(unit!.id),
    onSuccess: (u) => { setBarcode(u.barcode ?? ''); invalidate(); toast.success('Barcode ban gaya'); },
    onError: (e) => toast.error(apiMessage(e, 'Barcode nahi bana')),
  });

  const problem = !name.trim() ? 'Pack ka naam likhein'
    : !isBase && !(r > 0) ? 'Ek pack me kitne — 0 se zyada likhein'
      : !isBase && r === 1 ? 'Rate 1 matlab asal unit hi — 1 se alag likhein'
        : null;

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!problem) save.mutate(); }} className="space-y-3 rounded-2xl bg-brand-50/40 p-3 ring-1 ring-brand-100 sm:p-4">
      {scan && <BarcodeScanner title="Pack ka barcode" hint="Dabbe / carton ka barcode rakhein" onDetected={(code) => { setScan(false); setBarcode(code.trim()); }} onClose={() => setScan(false)} />}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">{unit ? `${unit.unitName} badlein` : 'Naya pack'} <span className="font-normal text-slate-500">· {product.name}</span></p>
        <button type="button" onClick={onDone} aria-label="Band" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white"><X className="h-4 w-4" /></button>
      </div>

      {!unit && (
        <div className="flex flex-wrap gap-1.5">
          {presets.map((ps) => (
            <button key={ps.name} type="button" onClick={() => pickPreset(ps.name, ps.rate, ps.type)}
              className={cn('rounded-full px-2.5 py-1 text-[0.75rem] font-medium ring-1', name === ps.name ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-brand-50')}>
              {ps.name} <span className="opacity-70">· {qtyText(ps.rate)} {product.unit}</span>
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <L label="Naam *" hint="Jaise counter par bolte hain — carton, dabba, bori">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className={input} disabled={isBase} />
        </L>
        <L label={`Ek me kitne ${product.unit} *`} hint={isBase ? 'Asal unit hamesha 1 hota hai' : r > 0 ? `1 ${name || 'pack'} = ${qtyText(r)} ${product.unit}` : 'Misaal: carton me 24'}>
          <input value={isBase ? '1' : rate} onChange={(e) => setRate(e.target.value)} inputMode="decimal" disabled={isBase} className={cn(input, 'tabular-nums')} />
        </L>
        <L label="Bechne ki qeemat" hint={loose > 0 ? `Khula lene par ${formatPKR(loose)}${saving > 0.5 ? ` — ${formatPKR(saving)} bachat` : ''}` : 'Khali = khula rate × quantity'}>
          <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder={loose ? String(Math.round(loose)) : '0'} className={cn(input, 'tabular-nums')} />
          {loose > 0 && !isBase && (
            <span className="mt-1 flex flex-wrap gap-1">
              {[0, 2, 5, 10].map((off) => (
                <button key={off} type="button" onClick={() => setPrice(String(packPrice(basePrice, r, off, loose >= 500 ? 5 : 1)))}
                  className="rounded-full bg-white px-2 py-0.5 text-[0.6875rem] font-semibold text-brand-800 ring-1 ring-brand-200 hover:bg-brand-50">{off ? `${off}% kam` : 'Barabar'}</button>
              ))}
            </span>
          )}
        </L>
        {!costHidden && (
          <L label="Cost (cost)" hint={`Khali = ${formatPKR(baseCost * (r || 0))} (cost × quantity)`}>
            <input value={cost} onChange={(e) => setCost(e.target.value)} inputMode="decimal" placeholder={String(Math.round(baseCost * (r || 0)))} className={cn(input, 'tabular-nums')} />
          </L>
        )}
        <L label="Wholesale qeemat" hint="Thok wale customer ke liye (ikhtiyari)">
          <input value={wholesale} onChange={(e) => setWholesale(e.target.value)} inputMode="decimal" className={cn(input, 'tabular-nums')} />
        </L>
        <L label="Barcode" hint="Carton par chhapa barcode scan karein — POS par seedha ye pack aata hai">
          <span className="flex gap-1.5">
            <input value={barcode} onChange={(e) => setBarcode(e.target.value.replace(/\s/g, ''))} maxLength={60} className={cn(input, 'font-mono')} />
            <button type="button" onClick={() => setScan(true)} title="Camera se scan" aria-label="Scan" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-slate-200 hover:bg-slate-50"><ScanLine className="h-4 w-4" /></button>
            {unit && !barcode && (
              <button type="button" onClick={() => gen.mutate()} disabled={gen.isPending} title="Naya barcode banayein" aria-label="Barcode banayein" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-slate-200 hover:bg-slate-50"><Wand2 className="h-4 w-4" /></button>
            )}
          </span>
        </L>
        {!unit && product.variants.length > 0 && (
          <L label="Type" hint="Sirf ek type ka pack ho to chunein">
            <select value={variantId} onChange={(e) => setVariantId(e.target.value)} className={input}>
              <option value="">Sab types</option>
              {product.variants.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </L>
        )}
        {!isBase && (
          <L label="Type (type)" hint="Reports me chhantne ke liye">
            <select value={type} onChange={(e) => setType(e.target.value as UnitConversionType)} className={input}>
              {TYPE_ORDER.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select>
          </L>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Switch size="sm" checked={isDefault} onChange={(e) => setDefault(e.target.checked)} label="POS par pehle ye" description="Product chunte hi yahi pack khulega" />
        {!isBase && <Switch size="sm" checked={isActive} onChange={(e) => setActive(e.target.checked)} label="Chalu" description="Band pack POS aur purchase me nahi aata" />}
        {!costHidden && p > 0 && <span className={cn('text-[0.8125rem] font-semibold tabular-nums', margin < 0 ? 'text-rose-700' : 'text-emerald-700')}>Margin {Math.round(margin)}% · profit {formatPKR(p - c)}</span>}
        {r > 0 && !isBase && <span className="text-[0.8125rem] text-slate-500">Stock me {qtyText(Math.floor(product.stock / r))} {name || 'pack'}</span>}
      </div>

      {!isBase && loose > 0 && p > loose + 0.5 && <Warn>Pack khula lene se mehnga hai ({formatPKR(p)} vs {formatPKR(loose)}) — customer khula le lega.</Warn>}
      {!costHidden && p > 0 && p < c && <Warn>Qeemat cost se kam hai — har pack par nuqsan.</Warn>}

      <div className="flex items-center justify-end gap-2">
        {problem && <span className="mr-auto text-[0.75rem] text-amber-700">{problem}</span>}
        <Button type="button" variant="secondary" size="sm" onClick={onDone}>Rehne dein</Button>
        <Button type="submit" size="sm" loading={save.isPending} disabled={!!problem} leftIcon={<Save className="h-4 w-4" />}>{unit ? 'Save' : 'Pack jorein'}</Button>
      </div>
    </form>
  );
}

function L({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block text-[0.8125rem] font-medium text-slate-700">
      {label}<div className="mt-1">{children}</div>{hint && <span className="mt-1 block text-[0.75rem] font-normal text-slate-500">{hint}</span>}
    </label>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return <p className="flex gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-900 ring-1 ring-amber-100"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{children}</p>;
}
