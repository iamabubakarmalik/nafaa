import { useMemo, useState } from 'react';
import {
  Layers, Plus, Copy, Trash2, ChevronDown, ChevronUp, AlertCircle,
  Ruler, DollarSign, MapPin, Sparkles, Info, Package,
} from 'lucide-react';
import { CarpetPiecesTable } from './CarpetPiecesTable';
import { CarpetFtStockCard } from './CarpetFtStockCard';
import { resolveVariantStockType } from '../../hooks/useCarpetWizard';
import { formatPKRFull } from '@core/lib/format';
import type {
  CarpetWizardBasic,
  CarpetWizardRoll,
  CarpetWizardVariant,
  CarpetWizardPieceLine,
  CarpetWizardFtStock,
} from '../../hooks/useCarpetWizard';

interface Props {
  basic: CarpetWizardBasic;
  hasVariants: boolean;
  variants: CarpetWizardVariant[];
  rolls: CarpetWizardRoll[];
  pieceLines: CarpetWizardPieceLine[];
  ftStock: CarpetWizardFtStock[];
  onAddRoll: (variantTempId: string | null, seed?: Partial<CarpetWizardRoll>) => void;
  onDuplicateRoll: (tempId: string) => void;
  onUpdateRoll: (tempId: string, patch: Partial<CarpetWizardRoll>) => void;
  onRemoveRoll: (tempId: string) => void;
  onAddPieceLine: (variantTempId: string | null, seed?: Partial<CarpetWizardPieceLine>) => void;
  onUpdatePieceLine: (tempId: string, patch: Partial<CarpetWizardPieceLine>) => void;
  onDuplicatePieceLine: (tempId: string) => void;
  onRemovePieceLine: (tempId: string) => void;
  onUpsertFtStock: (variantTempId: string | null, patch: Partial<CarpetWizardFtStock>) => void;
  errors: string[];
}

interface VariantBucket {
  tempId: string | null;
  name: string;
  colorHex?: string;
  designCode?: string;
  stockType: 'ROLLS' | 'PIECES' | 'FT';
}

export function CarpetWizardStep3Rolls({
  basic, hasVariants, variants, rolls, pieceLines, ftStock,
  onAddRoll, onDuplicateRoll, onUpdateRoll, onRemoveRoll,
  onAddPieceLine, onUpdatePieceLine, onDuplicatePieceLine, onRemovePieceLine,
  onUpsertFtStock, errors,
}: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const buckets: VariantBucket[] = useMemo(() => {
    if (!hasVariants || variants.length === 0) {
      return [{
        tempId: null,
        name: basic.name || 'This product',
        stockType: resolveVariantStockType(basic, undefined),
      }];
    }
    return variants.map((v) => ({
      tempId: v.tempId,
      name: v.name,
      colorHex: v.colorHex,
      designCode: v.designCode,
      stockType: resolveVariantStockType(basic, v),
    }));
  }, [hasVariants, variants, basic]);

  const isCollapsed = (id: string | null) => collapsed[id ?? '__none__'] === true;
  const toggle = (id: string | null) =>
    setCollapsed((c) => ({ ...c, [id ?? '__none__']: !c[id ?? '__none__'] }));

  const stockTypeIcon = (t: 'ROLLS' | 'PIECES' | 'FT') =>
    t === 'ROLLS' ? Layers : t === 'PIECES' ? Package : Ruler;

  const stockTypeColor = (t: 'ROLLS' | 'PIECES' | 'FT') =>
    t === 'ROLLS' ? 'emerald' : t === 'PIECES' ? 'violet' : 'blue';

  const totalRolls = rolls.length;
  const totalPieces = pieceLines.reduce((a, p) => a + Number(p.quantity || 0), 0);

  return (
    <div className="space-y-4">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-300 p-4 flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm text-rose-900">
            <div className="font-extrabold mb-1">Save se pehle theek karein:</div>
            <ul className="list-disc pl-4 space-y-0.5 font-semibold">
              {errors.slice(0, 6).map((e, i) => <li key={i}>{e}</li>)}
              {errors.length > 6 && <li>...aur {errors.length - 6} aur</li>}
            </ul>
          </div>
        </div>
      )}

      {/* Info banner */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-200 p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
          <Layers className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-extrabold text-emerald-900 text-sm">Stock Entry</h3>
          <p className="text-xs text-emerald-800 font-semibold mt-0.5 leading-relaxed">
            Har variant apni stock type ke hisaab se. Prices <strong>auto-fill</strong> hote hain from product default.
            {basic.stockType === 'MIXED' && ' Har variant ki apni stock type — Step 2 me set kar chuke ho.'}
          </p>
        </div>
      </div>

      {buckets.map((b) => {
        const Icon = stockTypeIcon(b.stockType);
        const color = stockTypeColor(b.stockType);
        const collapsedNow = isCollapsed(b.tempId);

        const bucketRolls = rolls.filter((r) => r.variantTempId === b.tempId);
        const bucketPieces = pieceLines.filter((p) => p.variantTempId === b.tempId);
        const bucketFt = ftStock.find((f) => f.variantTempId === b.tempId);

        // Summary for header
        const rollSqft = bucketRolls.reduce((a, r) => {
          const w = Number(r.widthFt) + Number(r.widthInch || 0) / 12;
          const l = Number(r.lengthFt) + Number(r.lengthInch || 0) / 12;
          return a + w * l;
        }, 0);
        const pieceCount = bucketPieces.reduce((a, p) => a + Number(p.quantity || 0), 0);
        const ftCurrent = bucketFt?.currentFt || 0;

        return (
          <section key={b.tempId ?? '__none__'} className="rounded-2xl border-2 border-slate-200 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(b.tempId)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-slate-50 to-white hover:from-slate-100 transition"
            >
              {b.colorHex ? (
                <div className="h-10 w-10 rounded-lg border-2 border-slate-200 shrink-0 shadow-inner" style={{ backgroundColor: b.colorHex }} />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
              )}
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-extrabold text-slate-900 text-sm truncate">{b.name}</div>
                  <span className={[
                    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold',
                    color === 'emerald' ? 'bg-emerald-100 text-emerald-700' :
                    color === 'violet' ? 'bg-violet-100 text-violet-700' :
                    'bg-blue-100 text-blue-700',
                  ].join(' ')}>
                    <Icon className="h-2.5 w-2.5" />
                    {b.stockType}
                  </span>
                  {b.designCode && <span className="text-[10px] font-mono text-slate-500">{b.designCode}</span>}
                </div>
                <div className="text-[10px] text-slate-500 font-bold mt-0.5">
                  {b.stockType === 'ROLLS' && `${bucketRolls.length} rolls • ${rollSqft.toFixed(1)} sqft`}
                  {b.stockType === 'PIECES' && `${pieceCount} pieces • ${bucketPieces.length} lines`}
                  {b.stockType === 'FT' && `${ftCurrent.toFixed(1)} ft stock`}
                </div>
              </div>

              {b.stockType === 'ROLLS' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddRoll(b.tempId);
                    setCollapsed((c) => ({ ...c, [b.tempId ?? '__none__']: false }));
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1 shadow-sm active:scale-95 transition"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Roll
                </button>
              )}
              {b.stockType === 'PIECES' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddPieceLine(b.tempId);
                    setCollapsed((c) => ({ ...c, [b.tempId ?? '__none__']: false }));
                  }}
                  className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-extrabold inline-flex items-center gap-1 shadow-sm active:scale-95 transition"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Pieces
                </button>
              )}

              {collapsedNow ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronUp className="h-4 w-4 text-slate-500" />}
            </button>

            {!collapsedNow && (
              <>
                {b.stockType === 'ROLLS' && (
                  <RollsTable
                    lines={bucketRolls}
                    onAdd={() => onAddRoll(b.tempId)}
                    onUpdate={onUpdateRoll}
                    onDuplicate={onDuplicateRoll}
                    onRemove={onRemoveRoll}
                  />
                )}
                {b.stockType === 'PIECES' && (
                  <CarpetPiecesTable
                    basic={basic}
                    bucketName={b.name}
                    bucketColorHex={b.colorHex}
                    variantTempId={b.tempId}
                    lines={bucketPieces}
                    onAdd={() => onAddPieceLine(b.tempId)}
                    onUpdate={onUpdatePieceLine}
                    onDuplicate={onDuplicatePieceLine}
                    onRemove={onRemovePieceLine}
                  />
                )}
                {b.stockType === 'FT' && (
                  <CarpetFtStockCard
                    basic={basic}
                    bucketName={b.name}
                    variantTempId={b.tempId}
                    ftStock={bucketFt}
                    onChange={(patch) => onUpsertFtStock(b.tempId, patch)}
                  />
                )}
              </>
            )}
          </section>
        );
      })}

      {/* Empty state */}
      {totalRolls === 0 && totalPieces === 0 && ftStock.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <Info className="h-10 w-10 text-slate-400 mx-auto mb-2" />
          <div className="font-extrabold text-slate-700 text-sm">Stock optional hai</div>
          <div className="text-xs text-slate-500 font-semibold mt-1">
            Sirf product create karna hai to <strong>Save</strong> kar dein — stock baad me add ho sakti hai
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Rolls table ────────────────────────────────
function RollsTable({
  lines, onAdd, onUpdate, onDuplicate, onRemove,
}: {
  lines: CarpetWizardRoll[];
  onAdd: () => void;
  onUpdate: (tempId: string, patch: Partial<CarpetWizardRoll>) => void;
  onDuplicate: (tempId: string) => void;
  onRemove: (tempId: string) => void;
}) {
  const isLocked = (tempId: string) => tempId.startsWith('edit-roll-');

  if (lines.length === 0) {
    return (
      <div className="p-6 text-center border-t border-slate-100">
        <div className="h-14 w-14 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center mb-2">
          <Layers className="h-7 w-7 text-slate-400" />
        </div>
        <div className="text-sm font-extrabold text-slate-700">No rolls yet</div>
        <div className="text-xs text-slate-500 font-semibold mt-1">
          Click <strong>Add Roll</strong> above to start
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto border-t border-slate-100">
        <table className="w-full text-xs">
          <thead className="bg-slate-50">
            <tr>
              <ColHead label="Roll #" />
              <ColHead label="Width" hint="ft × in" icon={Ruler} />
              <ColHead label="Length" hint="ft × in" icon={Ruler} />
              <ColHead label="Sqft" hint="auto" />
              <ColHead label="Cost /sqft" icon={DollarSign} />
              <ColHead label="Sale /sqft" icon={DollarSign} />
              <ColHead label="Rack" icon={MapPin} />
              <ColHead label="" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lines.map((r) => {
              const w = Number(r.widthFt) + Number(r.widthInch || 0) / 12;
              const l = Number(r.lengthFt) + Number(r.lengthInch || 0) / 12;
              const sqft = w * l;
              const locked = isLocked(r.tempId);
              return (
                <tr key={r.tempId} className={locked ? 'bg-slate-50/70' : 'hover:bg-slate-50/50'}>
                  <td className="px-2 py-1.5">
                    {locked ? (
                      <div className="w-24 h-8 rounded-lg bg-slate-100 border-2 border-slate-200 px-2 text-xs font-mono font-bold flex items-center text-slate-600">
                        🔒 {r.rollNumber}
                      </div>
                    ) : (
                      <input
                        value={r.rollNumber}
                        onChange={(e) => onUpdate(r.tempId, { rollNumber: e.target.value })}
                        className="w-24 h-8 rounded-lg border-2 border-slate-200 px-2 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500"
                      />
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex gap-1 items-center">
                      <NumCell value={r.widthFt} onChange={(v) => onUpdate(r.tempId, { widthFt: v })} suffix="ft" width="w-14" disabled={locked} />
                      <NumCell value={r.widthInch} onChange={(v) => onUpdate(r.tempId, { widthInch: v })} suffix="in" width="w-12" max={11} disabled={locked} />
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex gap-1 items-center">
                      <NumCell value={r.lengthFt} onChange={(v) => onUpdate(r.tempId, { lengthFt: v })} suffix="ft" width="w-14" disabled={locked} />
                      <NumCell value={r.lengthInch} onChange={(v) => onUpdate(r.tempId, { lengthInch: v })} suffix="in" width="w-12" max={11} disabled={locked} />
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className={['text-xs font-extrabold tabular-nums', sqft > 0 ? 'text-emerald-700' : 'text-slate-400'].join(' ')}>
                      {sqft.toFixed(1)}
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <NumCell value={r.costPerSqft} onChange={(v) => onUpdate(r.tempId, { costPerSqft: v })} width="w-20" disabled={locked} />
                  </td>
                  <td className="px-2 py-1.5">
                    <NumCell value={r.salePricePerSqft} onChange={(v) => onUpdate(r.tempId, { salePricePerSqft: v })} width="w-20" accent="emerald" disabled={locked} />
                  </td>
                  <td className="px-2 py-1.5">
                    {locked ? (
                      <div className="w-20 h-8 rounded-lg bg-slate-100 border-2 border-slate-200 px-2 text-xs font-bold flex items-center text-slate-600">
                        {r.rackNumber || '—'}
                      </div>
                    ) : (
                      <input
                        value={r.rackNumber}
                        onChange={(e) => onUpdate(r.tempId, { rackNumber: e.target.value })}
                        placeholder="Wall-1"
                        className="w-20 h-8 rounded-lg border-2 border-slate-200 px-2 text-xs font-bold focus:outline-none focus:border-emerald-500"
                      />
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {locked ? (
                      <span className="text-[9px] font-extrabold text-slate-500 bg-slate-200 px-2 py-1 rounded-md" title="Existing roll — edit from /carpet-rolls page">
                        SAVED
                      </span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => onDuplicate(r.tempId)} className="h-7 w-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center active:scale-95 transition">
                          <Copy className="h-3 w-3" />
                        </button>
                        <button type="button" onClick={() => onRemove(r.tempId)} className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center active:scale-95 transition">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/70 p-2 flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[10px] font-extrabold text-slate-600 flex items-center gap-1 pl-1">
          <Sparkles className="h-3 w-3 text-amber-500" />
          Prices auto-filled — you can override per roll
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="px-2.5 py-1 rounded-lg bg-white border-2 border-dashed border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50 text-emerald-700 text-[11px] font-extrabold inline-flex items-center gap-1 transition active:scale-95"
        >
          <Plus className="h-3 w-3" /> Add Another Roll
        </button>
      </div>
    </>
  );
}

function ColHead({ label, hint, icon: Icon }: { label: string; hint?: string; icon?: any }) {
  return (
    <th className="px-2 py-2 text-left font-extrabold uppercase tracking-wider text-slate-700 text-[9px]">
      <div className="flex items-center gap-0.5">
        {Icon && <Icon className="h-2.5 w-2.5" />}
        {label}
      </div>
      {hint && <div className="text-[9px] font-bold text-slate-400 normal-case">{hint}</div>}
    </th>
  );
}

function NumCell({
  value, onChange, suffix, width = 'w-20', accent, max, disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  width?: string;
  accent?: 'emerald' | 'violet';
  max?: number;
  disabled?: boolean;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        step="0.01"
        value={value === 0 ? '' : value}
        onChange={(e) => {
          if (disabled) return;
          const v = e.target.value === '' ? 0 : Number(e.target.value);
          if (max !== undefined && v > max) return;
          onChange(v);
        }}
        disabled={disabled}
        placeholder="0"
        className={[
          'h-8 rounded-lg border-2 px-2 text-xs font-bold tabular-nums text-right focus:outline-none',
          width,
          disabled ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed' :
          accent === 'emerald' ? 'border-emerald-200 bg-emerald-50/50 focus:border-emerald-500 text-emerald-800' :
          accent === 'violet' ? 'border-violet-200 bg-violet-50/50 focus:border-violet-500 text-violet-800' :
          'border-slate-200 focus:border-emerald-500',
          suffix ? 'pr-6' : '',
        ].join(' ')}
      />
      {suffix && (
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-extrabold text-slate-400 pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}
