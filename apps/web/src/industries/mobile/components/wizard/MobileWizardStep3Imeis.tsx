import { useMemo, useState } from 'react';
import {
  Smartphone, Plus, ChevronDown, ChevronUp, AlertCircle,
  Info, Cable, ShieldCheck,
} from 'lucide-react';
import { MobileImeiTable } from './MobileImeiTable';
import { MobileAccessoryStockCard } from './MobileAccessoryStockCard';
import { resolveVariantProductType } from '../../hooks/useMobileWizard';
import {
  PTA_STATUS_COLORS, PTA_STATUS_LABELS, type PtaStatus,
} from '../../api/imei.api';
import type {
  MobileWizardBasic,
  MobileWizardVariant,
  MobileWizardImeiLine,
  MobileWizardAccessoryStock,
} from '../../hooks/useMobileWizard';

interface Props {
  basic: MobileWizardBasic;
  hasVariants: boolean;
  variants: MobileWizardVariant[];
  imeiLines: MobileWizardImeiLine[];
  accessoryStock: MobileWizardAccessoryStock[];
  onAddImeiLine: (variantTempId: string | null) => void;
  onUpdateImeiLine: (tempId: string, patch: Partial<MobileWizardImeiLine>) => void;
  onRemoveImeiLine: (tempId: string) => void;
  onAddImeisBulk: (variantTempId: string | null, imeis: string[]) => void;
  onApplyPtaToAll: (status: PtaStatus) => void;
  onUpsertAccessoryStock: (variantTempId: string | null, patch: Partial<MobileWizardAccessoryStock>) => void;
  errors: string[];
}

interface VariantBucket {
  tempId: string | null;
  name: string;
  colorHex?: string;
  storage?: string;
  productType: 'PHONE' | 'ACCESSORY';
}

export function MobileWizardStep3Imeis({
  basic, hasVariants, variants, imeiLines, accessoryStock,
  onAddImeiLine, onUpdateImeiLine, onRemoveImeiLine, onAddImeisBulk, onApplyPtaToAll,
  onUpsertAccessoryStock, errors,
}: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const buckets: VariantBucket[] = useMemo(() => {
    if (!hasVariants || variants.length === 0) {
      return [{
        tempId: null,
        name: basic.name || 'This product',
        productType: resolveVariantProductType(basic, undefined),
      }];
    }
    return variants.map((v) => ({
      tempId: v.tempId,
      name: v.name,
      colorHex: v.colorHex,
      storage: v.storage,
      productType: resolveVariantProductType(basic, v),
    }));
  }, [hasVariants, variants, basic]);

  const imeisByBucket = useMemo(() => {
    const map = new Map<string | null, MobileWizardImeiLine[]>();
    for (const b of buckets) map.set(b.tempId, []);
    for (const l of imeiLines) {
      const key = l.variantTempId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    }
    return map;
  }, [imeiLines, buckets]);

  const accByBucket = useMemo(() => {
    const map = new Map<string | null, MobileWizardAccessoryStock | undefined>();
    for (const b of buckets) map.set(b.tempId, undefined);
    for (const s of accessoryStock) map.set(s.variantTempId, s);
    return map;
  }, [accessoryStock, buckets]);

  const isCollapsed = (id: string | null) => collapsed[id ?? '__none__'] === true;
  const toggle = (id: string | null) =>
    setCollapsed((c) => ({ ...c, [id ?? '__none__']: !c[id ?? '__none__'] }));

  const totalImeis = imeiLines.length;
  const totalAccUnits = accessoryStock.reduce((a, s) => a + Number(s.currentStock || 0), 0);
  const phoneBuckets = buckets.filter((b) => b.productType === 'PHONE').length;
  const accBuckets = buckets.length - phoneBuckets;
  const allAccessory = phoneBuckets === 0;

  return (
    <div className="space-y-4">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/40 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900 dark:text-rose-200">
            <div className="font-extrabold mb-0.5">Save se pehle fix karein:</div>
            <ul className="list-disc pl-4 space-y-0.5">
              {errors.slice(0, 6).map((e, i) => <li key={i}>{e}</li>)}
              {errors.length > 6 && <li>...and {errors.length - 6} more</li>}
            </ul>
          </div>
        </div>
      )}

      {/* Intro — type-aware */}
      <div className={`rounded-2xl border-2 p-4 flex items-start gap-3 ${
        allAccessory
          ? 'bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-500/10 dark:to-slate-900 border-emerald-200 dark:border-emerald-500/40'
          : 'bg-gradient-to-br from-blue-50 to-white dark:from-blue-500/10 dark:to-slate-900 border-blue-200 dark:border-blue-500/40'
      }`}>
        <div className={`h-10 w-10 rounded-xl text-white flex items-center justify-center shadow-md shrink-0 ${allAccessory ? 'bg-emerald-600' : 'bg-blue-600'}`}>
          {allAccessory ? <Cable className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          <h3 className={`font-extrabold text-sm ${allAccessory ? 'text-emerald-900 dark:text-emerald-200' : 'text-blue-900 dark:text-blue-200'}`}>
            {allAccessory ? 'Stock Quantity' : 'Add Inventory'}
          </h3>
          <p className={`text-xs font-semibold mt-0.5 leading-relaxed ${allAccessory ? 'text-emerald-800 dark:text-emerald-300' : 'text-blue-800 dark:text-blue-300'}`}>
            {allAccessory
              ? 'Sirf units ki ginti likho — koi IMEI nahi chahiye. Optional hai — baad me purchase se bhi stock aa sakta hai.'
              : 'Phone variants ke liye IMEI table (har unit ka 15-digit IMEI + PTA), accessory variants ke liye simple stock. Optional — skip kar ke sirf product bhi bana sakte ho.'}
          </p>
          {!allAccessory && accBuckets > 0 && (
            <div className="mt-1.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400">
              ℹ️ {accBuckets} accessory variant{accBuckets > 1 ? 's' : ''} — unka simple stock neeche hai
            </div>
          )}
        </div>
      </div>

      {/* Quick PTA set for all IMEIs */}
      {totalImeis > 0 && (
        <section className="rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border-2 border-indigo-200 dark:border-indigo-500/40 p-3 space-y-2">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> Quick Set PTA for All {totalImeis} IMEIs
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(['APPROVED', 'NON_PTA', 'PATCH', 'PENDING', 'EXEMPT'] as PtaStatus[]).map((status) => {
              const colors = PTA_STATUS_COLORS[status];
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => onApplyPtaToAll(status)}
                  className={[
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border-2 hover:shadow transition active:scale-95',
                    colors.bg, colors.text, colors.border,
                  ].join(' ')}
                >
                  Set All {PTA_STATUS_LABELS[status]}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {buckets.map((b) => {
        const collapsedNow = isCollapsed(b.tempId);
        const isPhone = b.productType === 'PHONE';
        const Icon = isPhone ? Smartphone : Cable;

        return (
          <section
            key={b.tempId ?? '__none__'}
            className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggle(b.tempId)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 hover:from-slate-100 dark:hover:from-slate-800/80 transition"
            >
              {b.colorHex ? (
                <div
                  className="h-9 w-9 rounded-lg border-2 border-slate-200 dark:border-slate-600 shrink-0 shadow-inner"
                  style={{ backgroundColor: b.colorHex }}
                />
              ) : (
                <div className="h-9 w-9 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
              )}
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-extrabold text-slate-900 dark:text-white text-sm truncate">{b.name}</div>
                  <span className={[
                    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold',
                    isPhone
                      ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                      : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
                  ].join(' ')}>
                    <Icon className="h-2.5 w-2.5" />
                    {b.productType}
                  </span>
                  {b.storage && (
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/20 px-1.5 py-0.5 rounded">
                      {b.storage}
                    </span>
                  )}
                </div>
              </div>

              {isPhone && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onAddImeiLine(b.tempId); setCollapsed(c => ({ ...c, [b.tempId ?? '__none__']: false })); }}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold inline-flex items-center gap-1 shadow-sm transition active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" /> Add IMEI
                </button>
              )}

              {collapsedNow ? <ChevronDown className="h-4 w-4 text-slate-500 dark:text-slate-400" /> : <ChevronUp className="h-4 w-4 text-slate-500 dark:text-slate-400" />}
            </button>

            {!collapsedNow && (
              <>
                {isPhone ? (
                  <MobileImeiTable
                    basic={basic}
                    bucketName={b.name}
                    variantTempId={b.tempId}
                    lines={imeisByBucket.get(b.tempId) ?? []}
                    onAdd={() => onAddImeiLine(b.tempId)}
                    onUpdate={onUpdateImeiLine}
                    onRemove={onRemoveImeiLine}
                    onBulkAdd={(imeis) => onAddImeisBulk(b.tempId, imeis)}
                  />
                ) : (
                  <MobileAccessoryStockCard
                    basic={basic}
                    bucketName={b.name}
                    variantTempId={b.tempId}
                    stock={accByBucket.get(b.tempId)}
                    onChange={(patch) => onUpsertAccessoryStock(b.tempId, patch)}
                  />
                )}
              </>
            )}
          </section>
        );
      })}

      {totalImeis === 0 && totalAccUnits === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-8 text-center">
          <Info className="h-10 w-10 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
          <div className="font-extrabold text-slate-700 dark:text-slate-200 text-sm">Inventory optional hai</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
            Sirf product create karna hai to <strong>Save</strong> dein — {allAccessory ? 'stock' : 'IMEIs'} baad mein add ho sakti hain
          </div>
        </div>
      )}
    </div>
  );
}
