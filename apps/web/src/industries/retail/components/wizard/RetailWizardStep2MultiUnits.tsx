import { useState } from 'react';
import {
  Layers, Plus, X, AlertCircle, Sparkles, Info, ToggleLeft, ToggleRight,
  ArrowRightLeft, Hash, Barcode as BarcodeIcon, Star, Lightbulb,
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

/* ═════════════════════════════════════════════════════════════
   STEP 2 — MULTI-UNITS (FULL BEST v2)
   🌙 Dark mode perfect • 💡 Misal guide • ⚡ 1-click presets
   🏷️ Bulk discount chips • 📊 Per-unit profit summary
   ═════════════════════════════════════════════════════════════ */

const PRESETS = [
  { n: 'Half-Dozen', r: 6, t: 'PACK', e: '🥚' },
  { n: 'Dozen', r: 12, t: 'DOZEN', e: '🗳️' },
  { n: 'Pack', r: 10, t: 'PACK', e: '📦' },
  { n: 'Box', r: 24, t: 'BOX', e: '🗃️' },
  { n: 'Carton', r: 120, t: 'CARTON', e: '📮' },
  { n: 'Bag', r: 50, t: 'CUSTOM', e: '👝' },
];

const TYPES = [
  { value: 'PACK', label: 'Pack' }, { value: 'BOX', label: 'Box' },
  { value: 'DOZEN', label: 'Dozen' }, { value: 'CARTON', label: 'Carton' },
  { value: 'CUSTOM', label: 'Custom' },
] as const;

export function RetailWizardStep2MultiUnits({
  basic, hasMultiUnits, onToggleMultiUnits, units,
  onAddUnit, onUpdateUnit, onRemoveUnit, errors,
}: Props) {
  const [cn, setCn] = useState('');
  const [cr, setCr] = useState<number | ''>('');
  const [ct, setCt] = useState<any>('CUSTOM');

  const sale = Number(basic.salePrice || 0);
  const cost = Number(basic.costPrice || 0);
  const U = basic.baseUnit || 'pcs';

  const add = (name: string, rate: number, type: any) => {
    if (units.some((u) => u.unitName.toLowerCase() === name.toLowerCase())) return;
    onAddUnit({
      unitName: name.toLowerCase(),
      unitLabel: `${name} (${rate} ${U})`,
      conversionType: type,
      conversionRate: rate,
      price: sale * rate,
      costPrice: cost * rate,
      wholesalePrice: basic.wholesalePrice ? Number(basic.wholesalePrice) * rate : undefined,
      mrpPrice: basic.mrpPrice ? Number(basic.mrpPrice) * rate : undefined,
    });
  };

  const addCustom = () => {
    if (!cn.trim() || !cr) return;
    add(cn.trim(), Number(cr), ct);
    setCn(''); setCr('');
  };

  const applyDiscount = (u: RetailWizardUnit, pct: number) => {
    const full = sale * Number(u.conversionRate || 1);
    onUpdateUnit(u.tempId, { price: Math.round(full * (1 - pct / 100)) });
  };

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-300 dark:border-rose-500/40 p-4 flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="text-sm text-rose-900 dark:text-rose-200">
            <div className="font-extrabold mb-1">Next se pehle ye theek karein:</div>
            <ul className="list-disc pl-4 space-y-0.5 font-semibold">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        </div>
      )}

      {/* 💡 Mini guide */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-500/10 dark:to-yellow-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3.5 flex items-start gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/40">
          <Lightbulb className="h-4 w-4" />
        </div>
        <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 leading-relaxed">
          Zyadatar products ke liye <strong>"Nahi"</strong> kaafi hai — seedha Next dabao.
          Sirf tab "Haan" karo jab <strong>dozen/carton ka alag (sasta) rate</strong> ho.
        </p>
      </div>

      {/* Toggle */}
      <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm p-5 space-y-4">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-700 text-white flex items-center justify-center shadow-md shadow-sky-500/40 shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">Dozen / Carton ka alag rate?</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 font-semibold mt-0.5 leading-relaxed">
              Misaal: 1 {U} = <strong>Rs {sale || 0}</strong>, magar 1 dozen (12 {U}) sasta —{' '}
              <strong className="text-emerald-700 dark:text-emerald-400">Rs {sale ? Math.round(sale * 12 * 0.95) : 0}</strong>. Aisa rate yahan set karo.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-2">
          <button type="button" onClick={() => onToggleMultiUnits(false)}
            className={['p-4 rounded-2xl border-2 text-left transition', !hasMultiUnits ? 'border-slate-900 dark:border-white bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500'].join(' ')}>
            <div className="flex items-center gap-2"><ToggleLeft className="h-5 w-5" /><span className="font-extrabold text-sm">Nahi — sirf {U}</span></div>
            <div className={['text-[11px] font-bold mt-1', !hasMultiUnits ? 'text-white/70 dark:text-slate-500' : 'text-slate-500 dark:text-slate-400'].join(' ')}>Simple product. Seedha Step 3.</div>
          </button>
          <button type="button" onClick={() => onToggleMultiUnits(true)}
            className={['p-4 rounded-2xl border-2 text-left transition', hasMultiUnits ? 'border-sky-600 bg-sky-600 text-white shadow-lg shadow-sky-500/40' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-sky-400 dark:hover:border-sky-500/50'].join(' ')}>
            <div className="flex items-center gap-2"><ToggleRight className="h-5 w-5" /><span className="font-extrabold text-sm">Haan — multi-unit</span></div>
            <div className={['text-[11px] font-bold mt-1', hasMultiUnits ? 'text-white/70' : 'text-slate-500 dark:text-slate-400'].join(' ')}>Dozen, carton, pack ke alag rate.</div>
          </button>
        </div>

        {!hasMultiUnits && (
          <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 border-2 border-blue-200 dark:border-blue-500/30 p-3 flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-700 dark:text-blue-300 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 dark:text-blue-200 font-semibold">
              Baad me bhi add ho sakta hai — <strong>Edit</strong> ya <strong>Units Manage</strong> page se.
            </div>
          </div>
        )}
      </section>

      {hasMultiUnits && (
        <>
          {/* Presets */}
          <section className="rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm p-5 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" /> Ek click me add
                </div>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm mt-0.5">Aam conversions</h4>
              </div>
              <span className="text-[10px] font-extrabold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/15 px-2 py-1 rounded-lg tabular-nums">{units.length} units</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {PRESETS.map((p) => {
                const ex = units.some((u) => u.unitName.toLowerCase() === p.n.toLowerCase());
                return (
                  <button key={p.n} type="button" disabled={ex} onClick={() => add(p.n, p.r, p.t)}
                    className={['p-3 rounded-2xl border-2 text-center transition disabled:cursor-not-allowed',
                      ex ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-sky-400 dark:hover:border-sky-500/50 hover:shadow-sm'].join(' ')}>
                    <div className="text-2xl leading-none">{p.e}</div>
                    <div className="font-extrabold text-xs text-slate-900 dark:text-white mt-1">{p.n}</div>
                    <div className="text-[9px] text-slate-500 dark:text-slate-400 font-bold">= {p.r} {U}</div>
                    <div className="text-[9px] text-emerald-700 dark:text-emerald-400 font-extrabold mt-0.5 tabular-nums">
                      {ex ? '✓ Added' : formatPKRFull(sale * p.r)}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Custom */}
          <section className="rounded-2xl border-2 border-violet-200 dark:border-violet-500/40 bg-gradient-to-br from-violet-50 to-white dark:from-violet-500/10 dark:to-slate-900 p-5 space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-violet-700 dark:text-violet-300 flex items-center gap-1">
                <Plus className="h-3 w-3" /> Apna unit banao
              </div>
              <h4 className="font-extrabold text-slate-900 dark:text-white text-sm mt-0.5">Jaise "Peti = 30 {U}"</h4>
            </div>
            <div className="grid sm:grid-cols-[1fr_110px_130px_auto] gap-2 items-end">
              <Input label="Unit ka naam" value={cn} onChange={(e) => setCn(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustom()} placeholder="Peti" />
              <Input label="Kitne?" type="number" step="0.01" value={cr}
                onChange={(e) => setCr(e.target.value === '' ? '' : Number(e.target.value))} placeholder="30" hint={`× ${U}`} />
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">Type</label>
                <select value={ct} onChange={(e) => setCt(e.target.value)}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-violet-500 transition">
                  {TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                </select>
              </div>
              <button type="button" onClick={addCustom} disabled={!cn.trim() || !cr}
                className="h-11 px-5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-sm inline-flex items-center gap-1 disabled:opacity-50 shadow-md shadow-violet-500/40 transition">
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
          </section>

          {/* List */}
          {units.length > 0 ? (
            <section className="rounded-2xl border-2 border-sky-200 dark:border-sky-500/40 bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm p-5 space-y-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-sky-700 dark:text-sky-300">Set kiye huay units</div>
                <h4 className="font-extrabold text-slate-900 dark:text-white text-sm mt-0.5">
                  {units.length} unit{units.length !== 1 ? 's' : ''} — rate/barcode badal sakte ho
                </h4>
              </div>

              {units.map((u) => {
                const rate = Number(u.conversionRate || 1);
                const full = sale * rate;
                const disc = full > 0 ? ((full - Number(u.price || 0)) / full) * 100 : 0;
                const profit = Number(u.price || 0) - Number(u.costPrice || 0);
                return (
                  <div key={u.tempId} className={['rounded-2xl border-2 p-3 space-y-3',
                    u.isBase ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-500/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60'].join(' ')}>
                    <div className="flex items-center gap-3">
                      <div className={['h-11 w-11 rounded-xl flex items-center justify-center shrink-0',
                        u.isBase ? 'bg-emerald-500 text-white' : 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300'].join(' ')}>
                        {u.isBase ? <Star className="h-5 w-5 fill-white" /> : <Layers className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <input value={u.unitName} disabled={u.isBase}
                            onChange={(e) => onUpdateUnit(u.tempId, { unitName: e.target.value })}
                            className="text-sm font-extrabold text-slate-900 dark:text-white bg-transparent focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-700 rounded px-1 capitalize disabled:cursor-not-allowed" />
                          {u.isBase && <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-extrabold">BASE</span>}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                          <ArrowRightLeft className="h-2.5 w-2.5" />
                          1 {u.unitName} = <strong className="text-slate-700 dark:text-slate-200 tabular-nums">{rate}</strong> {U}
                        </div>
                      </div>
                      {!u.isBase && (
                        <button type="button" onClick={() => onRemoveUnit(u.tempId)}
                          className="h-9 w-9 rounded-xl bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 transition">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Quick discount */}
                    {!u.isBase && sale > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400">Bulk discount:</span>
                        {[0, 3, 5, 8, 10].map((d) => (
                          <button key={d} type="button" onClick={() => applyDiscount(u, d)}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500/50 text-[11px] font-extrabold text-slate-700 dark:text-slate-200 transition">
                            {d === 0 ? 'Full' : `-${d}%`} <span className="text-emerald-700 dark:text-emerald-400 tabular-nums">{formatPKRFull(Math.round(full * (1 - d / 100)))}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Prices */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Fld lbl="Sale" tone="emerald" v={u.price} onV={(n) => onUpdateUnit(u.tempId, { price: n })} />
                      <Fld lbl="Cost" tone="slate" v={u.costPrice} onV={(n) => onUpdateUnit(u.tempId, { costPrice: n })} />
                      <Fld lbl="Wholesale" tone="violet" v={u.wholesalePrice ?? ''} ph="Optional"
                        onV={(n) => onUpdateUnit(u.tempId, { wholesalePrice: n || undefined } as any)} />
                      <Fld lbl="MRP" tone="blue" v={u.mrpPrice ?? ''} ph="Optional"
                        onV={(n) => onUpdateUnit(u.tempId, { mrpPrice: n || undefined } as any)} />
                    </div>

                    {/* Barcode/SKU */}
                    <div className="grid sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase mb-1 flex items-center gap-1">
                          <BarcodeIcon className="h-2.5 w-2.5" /> Unit Barcode
                        </label>
                        <input value={u.barcode ?? ''} onChange={(e) => onUpdateUnit(u.tempId, { barcode: e.target.value })}
                          placeholder="Scan ya type"
                          className="h-9 w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs font-mono font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500 transition" />
                      </div>
                      <div>
                        <label className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300 uppercase mb-1 flex items-center gap-1">
                          <Hash className="h-2.5 w-2.5" /> Unit SKU
                        </label>
                        <input value={u.sku ?? ''} onChange={(e) => onUpdateUnit(u.tempId, { sku: e.target.value })}
                          placeholder="COLG-DZN"
                          className="h-9 w-full rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs font-mono font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500 transition" />
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 p-2.5 grid grid-cols-3 gap-2 text-center">
                      <Cell l="1 unit ka rate" v={formatPKRFull(u.price)} tone="emerald" />
                      <Cell l="Faida" v={formatPKRFull(profit)} tone={profit >= 0 ? 'emerald' : 'rose'} />
                      <Cell l={disc > 0 ? 'Bulk discount' : 'Full rate'} v={disc > 0 ? `${disc.toFixed(1)}%` : '—'} tone="sky" />
                    </div>
                  </div>
                );
              })}
            </section>
          ) : (
            <section className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-8 text-center">
              <Layers className="h-10 w-10 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
              <div className="font-extrabold text-slate-700 dark:text-slate-200 text-sm">Abhi koi unit nahi</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">Upar se preset click karo ya custom banao</div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Fld({ lbl, tone, v, onV, ph }: { lbl: string; tone: string; v: number | string; onV: (n: number) => void; ph?: string }) {
  const t: Record<string, string> = {
    emerald: 'border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-200 focus:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-500/10',
    slate: 'border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:border-slate-500',
    violet: 'border-violet-200 dark:border-violet-500/40 text-violet-800 dark:text-violet-200 focus:border-violet-500',
    blue: 'border-blue-200 dark:border-blue-500/40 text-blue-800 dark:text-blue-200 focus:border-blue-500',
  };
  const lc: Record<string, string> = { emerald: 'text-emerald-700 dark:text-emerald-400', slate: 'text-slate-600 dark:text-slate-300', violet: 'text-violet-700 dark:text-violet-400', blue: 'text-blue-700 dark:text-blue-400' };
  return (
    <div>
      <label className={['block text-[10px] font-extrabold uppercase mb-1', lc[tone]].join(' ')}>{lbl}</label>
      <input type="number" step="0.01" value={v} placeholder={ph}
        onChange={(e) => onV(e.target.value === '' ? 0 : Number(e.target.value))}
        className={['h-10 w-full rounded-lg border-2 px-2 text-sm font-extrabold tabular-nums bg-white dark:bg-slate-800 focus:outline-none transition', t[tone]].join(' ')} />
    </div>
  );
}
function Cell({ l, v, tone }: any) {
  const t: Record<string, string> = { emerald: 'text-emerald-700 dark:text-emerald-400', rose: 'text-rose-700 dark:text-rose-400', sky: 'text-sky-700 dark:text-sky-400' };
  return (
    <div>
      <div className="text-[9px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider">{l}</div>
      <div className={['text-sm font-extrabold tabular-nums', t[tone]].join(' ')}>{v}</div>
    </div>
  );
}
