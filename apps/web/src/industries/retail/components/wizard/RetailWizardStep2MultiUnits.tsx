import { useState } from 'react';
import {
  Layers, Plus, X, AlertCircle, Sparkles, Info, ToggleLeft, ToggleRight,
  ArrowRightLeft, DollarSign, Hash, Barcode as BarcodeIcon, Star,
  Package, Boxes, Container,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import { formatPKRFull } from '@core/lib/format';
import type { RetailWizardBasic, RetailWizardUnit } from '../../hooks/useRetailWizard';

interface Props {
  basic: RetailWizardBasic;
  hasMultiUnits: boolean;
  onToggleMultiUnits: (v: boolean) => void;
  units: RetailWizardUnit[];
  onAddUnit: (u: Omit<RetailWizardUnit, 'tempId' | 'isBase' | 'isDefault' | 'isActive'>) => void;
  onUpdateUnit: (tempId: string, patch: Partial<RetailWizardUnit>) => void;
  onRemoveUnit: (tempId: string) => void;
  errors: string[];
}

const PRESET_UNITS = [
  { name: 'Pack', rate: 6, icon: Package, color: 'blue' },
  { name: 'Dozen', rate: 12, icon: Boxes, color: 'violet' },
  { name: 'Box', rate: 24, icon: Package, color: 'amber' },
  { name: 'Carton', rate: 120, icon: Container, color: 'emerald' },
];

const CONVERSION_TYPES = [
  { value: 'PACK', label: 'Pack' },
  { value: 'BOX', label: 'Box' },
  { value: 'DOZEN', label: 'Dozen' },
  { value: 'CARTON', label: 'Carton' },
  { value: 'CUSTOM', label: 'Custom' },
] as const;

export function RetailWizardStep2MultiUnits({
  basic, hasMultiUnits, onToggleMultiUnits, units,
  onAddUnit, onUpdateUnit, onRemoveUnit, errors,
}: Props) {
  const [customName, setCustomName] = useState('');
  const [customRate, setCustomRate] = useState<number | ''>('');
  const [customType, setCustomType] = useState<any>('CUSTOM');

  const salePrice = Number(basic.salePrice || 0);
  const costPrice = Number(basic.costPrice || 0);

  const addPreset = (name: string, rate: number, conversionType: any) => {
    const exists = units.some((u) => u.unitName.toLowerCase() === name.toLowerCase());
    if (exists) return;
    onAddUnit({
      unitName: name.toLowerCase(),
      unitLabel: `${name} (${rate} ${basic.baseUnit})`,
      conversionType,
      conversionRate: rate,
      price: salePrice * rate,
      costPrice: costPrice * rate,
      wholesalePrice: basic.wholesalePrice ? Number(basic.wholesalePrice) * rate : undefined,
      mrpPrice: basic.mrpPrice ? Number(basic.mrpPrice) * rate : undefined,
    });
  };

  const addCustom = () => {
    const name = customName.trim();
    if (!name || !customRate) return;
    const rate = Number(customRate);
    onAddUnit({
      unitName: name.toLowerCase(),
      unitLabel: `${name} (${rate} ${basic.baseUnit})`,
      conversionType: customType,
      conversionRate: rate,
      price: salePrice * rate,
      costPrice: costPrice * rate,
      wholesalePrice: basic.wholesalePrice ? Number(basic.wholesalePrice) * rate : undefined,
      mrpPrice: basic.mrpPrice ? Number(basic.mrpPrice) * rate : undefined,
    });
    setCustomName('');
    setCustomRate('');
  };

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900">
            <div className="font-extrabold mb-0.5">Fix before Next:</div>
            <ul className="list-disc pl-4 space-y-0.5">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Toggle */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-700 text-white flex items-center justify-center shadow-md shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Multi-Unit Selling</h3>
            <p className="text-sm text-slate-600 font-semibold mt-0.5">
              Same product ko piece, dozen, carton — sab different prices se becho
            </p>
          </div>
          <button type="button" onClick={() => onToggleMultiUnits(!hasMultiUnits)}
            className={[
              'inline-flex items-center gap-2 px-4 py-2 rounded-xl font-extrabold text-sm transition shrink-0',
              hasMultiUnits ? 'bg-sky-100 text-sky-800 hover:bg-sky-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            ].join(' ')}>
            {hasMultiUnits ? (<><ToggleRight className="h-5 w-5" /> Yes, multi-unit</>)
              : (<><ToggleLeft className="h-5 w-5" /> No, single unit</>)}
          </button>
        </div>

        {!hasMultiUnits && (
          <div className="mt-4 rounded-xl bg-blue-50 border-2 border-blue-200 p-3 flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900">
              <div className="font-extrabold mb-0.5">Single unit mode</div>
              <div className="font-semibold">
                Product sirf {basic.baseUnit || 'base unit'} mein sale hoga. Seedha Step 3 pe jao.
              </div>
            </div>
          </div>
        )}
      </section>

      {hasMultiUnits && (
        <>
          {/* Preset units */}
          <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
            <div className="flex items-center gap-2 flex-wrap justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" /> Quick Add Presets
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm mt-0.5">
                  Common conversions — one click to add
                </h4>
              </div>
              <div className="text-[10px] font-extrabold text-sky-700 bg-sky-50 px-2 py-1 rounded-lg">
                {units.length} units
              </div>
            </div>

            <div className="grid sm:grid-cols-4 gap-2">
              {PRESET_UNITS.map((p) => {
                const exists = units.some((u) => u.unitName.toLowerCase() === p.name.toLowerCase());
                const conversionType = p.name === 'Pack' ? 'PACK' :
                  p.name === 'Dozen' ? 'DOZEN' :
                  p.name === 'Box' ? 'BOX' : 'CARTON';
                return (
                  <button key={p.name} type="button" disabled={exists}
                    onClick={() => addPreset(p.name, p.rate, conversionType)}
                    className={[
                      'p-3 rounded-xl border-2 transition text-left disabled:opacity-40 disabled:cursor-not-allowed',
                      exists ? 'border-emerald-300 bg-emerald-50'
                        : 'border-slate-200 bg-white hover:border-sky-400 hover:shadow-sm',
                    ].join(' ')}>
                    <div className="flex items-center gap-2">
                      <p.icon className="h-4 w-4 text-slate-600" />
                      <div className="font-extrabold text-sm text-slate-900">{p.name}</div>
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold mt-1">
                      1 = {p.rate} {basic.baseUnit}
                    </div>
                    {exists && <div className="text-[9px] text-emerald-700 font-extrabold mt-0.5">✓ Added</div>}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Custom unit */}
          <section className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-violet-700 flex items-center gap-1">
                <Plus className="h-3 w-3" /> Custom Unit
              </div>
              <h4 className="font-extrabold text-slate-900 text-sm mt-0.5">Apni marzi ka conversion</h4>
            </div>

            <div className="grid sm:grid-cols-[1fr_100px_140px_auto] gap-2 items-end">
              <Input label="Unit Name" value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustom()}
                placeholder="e.g. Half-Dozen" />
              <Input label="Conversion" type="number" step="0.01" value={customRate}
                onChange={(e) => setCustomRate(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="6" hint={`× ${basic.baseUnit}`} />
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Type</label>
                <select value={customType} onChange={(e) => setCustomType(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-violet-500">
                  {CONVERSION_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                </select>
              </div>
              <button type="button" onClick={addCustom}
                disabled={!customName.trim() || !customRate}
                className="h-11 px-5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-sm inline-flex items-center gap-1 disabled:opacity-50 shadow-md">
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
          </section>

          {/* Units list */}
          {units.length > 0 ? (
            <section className="rounded-2xl border-2 border-sky-200 bg-white p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-extrabold text-sky-700">
                    Configured Units
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-sm mt-0.5">
                    {units.length} unit{units.length !== 1 ? 's' : ''} — edit price/barcode as needed
                  </h4>
                </div>
              </div>

              <div className="space-y-2">
                {units.map((u) => (
                  <div key={u.tempId} className={[
                    'rounded-xl border-2 p-3 space-y-3',
                    u.isBase ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-white',
                  ].join(' ')}>
                    <div className="flex items-center gap-3">
                      <div className={[
                        'h-11 w-11 rounded-xl flex items-center justify-center shrink-0',
                        u.isBase ? 'bg-emerald-500 text-white' : 'bg-sky-100 text-sky-700',
                      ].join(' ')}>
                        {u.isBase ? <Star className="h-5 w-5 fill-white" /> : <Layers className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <input value={u.unitName} disabled={u.isBase}
                            onChange={(e) => onUpdateUnit(u.tempId, { unitName: e.target.value })}
                            className="text-sm font-extrabold text-slate-900 bg-transparent focus:outline-none focus:bg-slate-50 rounded px-1 disabled:cursor-not-allowed" />
                          {u.isBase && (
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[9px] font-extrabold">BASE</span>
                          )}
                          <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                            <ArrowRightLeft className="h-2.5 w-2.5" />
                            1 {u.unitName} = <strong className="text-slate-700 tabular-nums">{u.conversionRate}</strong> {basic.baseUnit}
                          </span>
                        </div>
                        {u.unitLabel && (
                          <div className="text-[10px] text-slate-500 font-semibold italic mt-0.5">{u.unitLabel}</div>
                        )}
                      </div>
                      {!u.isBase && (
                        <button type="button" onClick={() => onRemoveUnit(u.tempId)}
                          className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Price grid */}
                    <div className="grid sm:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[10px] font-extrabold text-emerald-700 uppercase mb-1">Sale</label>
                        <input type="number" step="0.01" value={u.price}
                          onChange={(e) => onUpdateUnit(u.tempId, { price: Number(e.target.value) })}
                          className="h-9 w-full rounded-lg border-2 border-emerald-200 bg-white px-2 text-sm font-extrabold tabular-nums text-emerald-800 focus:outline-none focus:border-emerald-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">Cost</label>
                        <input type="number" step="0.01" value={u.costPrice}
                          onChange={(e) => onUpdateUnit(u.tempId, { costPrice: Number(e.target.value) })}
                          className="h-9 w-full rounded-lg border-2 border-slate-200 px-2 text-sm font-bold tabular-nums focus:outline-none focus:border-sky-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-violet-700 uppercase mb-1">Wholesale</label>
                        <input type="number" step="0.01" value={u.wholesalePrice ?? ''}
                          onChange={(e) => onUpdateUnit(u.tempId, { wholesalePrice: e.target.value === '' ? undefined : Number(e.target.value) })}
                          placeholder="Optional"
                          className="h-9 w-full rounded-lg border-2 border-violet-200 px-2 text-sm font-bold tabular-nums focus:outline-none focus:border-violet-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-blue-700 uppercase mb-1">MRP</label>
                        <input type="number" step="0.01" value={u.mrpPrice ?? ''}
                          onChange={(e) => onUpdateUnit(u.tempId, { mrpPrice: e.target.value === '' ? undefined : Number(e.target.value) })}
                          placeholder="Optional"
                          className="h-9 w-full rounded-lg border-2 border-blue-200 px-2 text-sm font-bold tabular-nums focus:outline-none focus:border-blue-500" />
                      </div>
                    </div>

                    {/* Barcode + SKU */}
                    <div className="grid sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1 flex items-center gap-1">
                          <BarcodeIcon className="h-2.5 w-2.5" /> Unit Barcode
                        </label>
                        <input value={u.barcode ?? ''}
                          onChange={(e) => onUpdateUnit(u.tempId, { barcode: e.target.value })}
                          placeholder="Scan or type"
                          className="h-9 w-full rounded-lg border-2 border-slate-200 px-2 text-xs font-mono font-bold focus:outline-none focus:border-sky-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1 flex items-center gap-1">
                          <Hash className="h-2.5 w-2.5" /> Unit SKU
                        </label>
                        <input value={u.sku ?? ''}
                          onChange={(e) => onUpdateUnit(u.tempId, { sku: e.target.value })}
                          placeholder="COLG-DZN"
                          className="h-9 w-full rounded-lg border-2 border-slate-200 px-2 text-xs font-mono font-bold focus:outline-none focus:border-sky-500" />
                      </div>
                    </div>

                    {/* Total value */}
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-2 text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Selling 1 {u.unitName} = <strong className="text-emerald-700">{formatPKRFull(u.price)}</strong></span>
                      {u.costPrice > 0 && (
                        <span>Profit: <strong className="text-emerald-700">{formatPKRFull(u.price - u.costPrice)}</strong></span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <Layers className="h-10 w-10 text-slate-400 mx-auto mb-2" />
              <div className="font-extrabold text-slate-700 text-sm">No units configured yet</div>
              <div className="text-xs text-slate-500 font-semibold mt-1">
                Preset chip click karein ya custom unit add karein
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
