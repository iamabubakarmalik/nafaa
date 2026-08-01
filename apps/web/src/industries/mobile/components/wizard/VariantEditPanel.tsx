import { useState } from 'react';
import {
  DollarSign, Hash, Image as ImageIcon, Sparkles,
  ChevronDown, ChevronUp, RotateCcw, Eye, EyeOff, StickyNote,
  Smartphone, Cable, HardDrive, Cpu,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import { AvatarUpload } from '@core/components/uploads';
import { formatPKRFull } from '@core/lib/format';
import type {
  MobileWizardBasic, MobileWizardVariant,
} from '../../hooks/useMobileWizard';

interface Props {
  variant: MobileWizardVariant;
  basic: MobileWizardBasic;
  onChange: (patch: Partial<MobileWizardVariant>) => void;
}

export function VariantEditPanel({ variant, basic, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);

  const effCost = variant.costPriceOverride ?? Number(basic.costPrice || 0);
  const effSale = variant.salePriceOverride ?? Number(basic.salePrice || 0);
  const effWholesale = variant.wholesalePriceOverride ?? Number(basic.wholesalePrice || 0);
  const profit = effSale - effCost;
  const margin = effSale > 0 ? (profit / effSale) * 100 : 0;

  const hasOverride =
    variant.costPriceOverride !== undefined ||
    variant.salePriceOverride !== undefined ||
    variant.wholesalePriceOverride !== undefined ||
    !!variant.sku?.trim() ||
    !!variant.barcode?.trim();

  return (
    <div className="mt-2 rounded-2xl border-2 border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={[
          'w-full flex items-center gap-3 px-3 py-2 text-left transition',
          expanded ? 'bg-slate-50' : 'hover:bg-slate-50',
        ].join(' ')}
      >
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">
            Variant Details
          </div>
          {hasOverride && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-extrabold">
              <Sparkles className="h-2.5 w-2.5" /> Custom
            </span>
          )}
          <div className="text-xs text-slate-600 font-bold ml-auto tabular-nums">
            {formatPKRFull(effSale)}
            {profit > 0 && <span className="ml-2 text-emerald-700">+{margin.toFixed(0)}%</span>}
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
      </button>

      {expanded && (
        <div className="p-4 border-t-2 border-slate-100 space-y-4">
          {/* Identifiers */}
          <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3 space-y-2.5">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 flex items-center gap-1">
              <Hash className="h-3 w-3" /> Identifiers
            </div>
            <div className="grid sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1 flex items-center gap-1">
                  <HardDrive className="h-2.5 w-2.5" /> Storage
                </label>
                <input
                  value={variant.storage ?? ''}
                  onChange={(e) => onChange({ storage: e.target.value })}
                  placeholder="128GB, 256GB..."
                  className="h-9 w-full rounded-lg border-2 border-slate-200 px-2 text-xs font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1 flex items-center gap-1">
                  <Cpu className="h-2.5 w-2.5" /> RAM
                </label>
                <input
                  value={variant.ram ?? ''}
                  onChange={(e) => onChange({ ram: e.target.value })}
                  placeholder="8GB, 12GB..."
                  className="h-9 w-full rounded-lg border-2 border-slate-200 px-2 text-xs font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
              <Input
                label="Variant SKU"
                value={variant.sku ?? ''}
                onChange={(e) => onChange({ sku: e.target.value })}
                placeholder="IP15P-BLK-256"
              />
            </div>
            <Input
              label="Variant Barcode"
              value={variant.barcode ?? ''}
              onChange={(e) => onChange({ barcode: e.target.value })}
              placeholder="1234567890"
            />
          </div>

          {/* Price overrides */}
          <div className="rounded-xl bg-emerald-50 border-2 border-emerald-200 p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700 flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Prices (per unit)
              </div>
              {(variant.costPriceOverride !== undefined ||
                variant.salePriceOverride !== undefined ||
                variant.wholesalePriceOverride !== undefined) && (
                <button
                  type="button"
                  onClick={() => onChange({
                    costPriceOverride: undefined,
                    salePriceOverride: undefined,
                    wholesalePriceOverride: undefined,
                  })}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white hover:bg-slate-100 text-[10px] font-extrabold text-slate-700 border border-slate-200"
                >
                  <RotateCcw className="h-2.5 w-2.5" /> Reset to product default
                </button>
              )}
            </div>

            <div className="grid sm:grid-cols-3 gap-2">
              <OverrideInput label="Cost" fallback={Number(basic.costPrice || 0)} value={variant.costPriceOverride} onChange={(v: number | undefined) => onChange({ costPriceOverride: v })} />
              <OverrideInput label="Sale" fallback={Number(basic.salePrice || 0)} value={variant.salePriceOverride} onChange={(v: number | undefined) => onChange({ salePriceOverride: v })} accent />
              <OverrideInput label="Wholesale" fallback={Number(basic.wholesalePrice || 0)} value={variant.wholesalePriceOverride} onChange={(v: number | undefined) => onChange({ wholesalePriceOverride: v })} />
            </div>

            {effSale > 0 && effCost > 0 && (
              <div className="rounded-lg bg-white border border-emerald-200 p-2 text-xs">
                <span className="font-bold text-slate-700">Profit: </span>
                <span className={['font-extrabold tabular-nums', profit >= 0 ? 'text-emerald-700' : 'text-rose-700'].join(' ')}>
                  {formatPKRFull(profit)}
                </span>
                <span className={['ml-2 font-bold', profit >= 0 ? 'text-emerald-700' : 'text-rose-700'].join(' ')}>
                  ({margin.toFixed(1)}% margin)
                </span>
              </div>
            )}
          </div>

          {/* Mixed-mode: product type override */}
          {basic.productType === 'MIXED' && (
            <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-3 space-y-2.5">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Type for this variant
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(['PHONE', 'ACCESSORY'] as const).map((t) => {
                  const Icon = t === 'PHONE' ? Smartphone : Cable;
                  const active = (variant.productTypeOverride ?? 'PHONE') === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onChange({ productTypeOverride: t })}
                      className={[
                        'inline-flex items-center justify-center gap-1.5 h-10 rounded-xl border-2 text-xs font-extrabold transition',
                        active ? 'border-amber-600 bg-amber-600 text-white shadow-md'
                               : 'border-slate-200 bg-white text-slate-700 hover:border-amber-400',
                      ].join(' ')}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Image + notes + active */}
          <div className="rounded-xl bg-white border-2 border-slate-200 p-3 space-y-2.5">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 flex items-center gap-1">
              <ImageIcon className="h-3 w-3" /> Image & Notes
            </div>
            <div className="grid sm:grid-cols-[100px_1fr] gap-3">
              <div>
                <div className="aspect-square rounded-xl border-2 border-slate-200 bg-slate-50 overflow-hidden mb-2">
                  {variant.imageUrl ? (
                    <img src={variant.imageUrl} alt={variant.name} className="w-full h-full object-cover" />
                  ) : variant.colorHex ? (
                    <div className="w-full h-full" style={{ backgroundColor: variant.colorHex }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <AvatarUpload
                  value={variant.imageUrl ?? null}
                  onChange={(url) => onChange({ imageUrl: url ?? undefined })}
                  purpose="product-image"
                  size="sm"
                  shape="square"
                  fallbackText={variant.name.charAt(0)}
                />
              </div>
              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1 flex items-center gap-1">
                    <StickyNote className="h-2.5 w-2.5" /> Notes
                  </label>
                  <textarea
                    rows={3}
                    value={variant.notes ?? ''}
                    onChange={(e) => onChange({ notes: e.target.value })}
                    placeholder="e.g. Limited stock, PTA batch..."
                    className="w-full rounded-lg border-2 border-slate-200 px-2 py-1.5 text-xs font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition">
                  <input
                    type="checkbox"
                    checked={variant.isActive}
                    onChange={(e) => onChange({ isActive: e.target.checked })}
                    className="h-4 w-4 rounded"
                  />
                  {variant.isActive ? <Eye className="h-4 w-4 text-slate-600" /> : <EyeOff className="h-4 w-4 text-slate-400" />}
                  <div>
                    <div className="text-xs font-extrabold text-slate-900">
                      {variant.isActive ? 'Active' : 'Inactive'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-semibold">
                      Show in POS & catalog
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OverrideInput({
  label, fallback, value, onChange, accent,
}: {
  label: string;
  fallback: number;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  accent?: boolean;
}) {
  const isOverride = value !== undefined;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] font-extrabold text-slate-600 uppercase">{label}</label>
        {isOverride && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="text-[9px] font-extrabold text-slate-500 hover:text-slate-700 underline"
          >
            use default
          </button>
        )}
      </div>
      <input
        type="number"
        step="0.01"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        placeholder={fallback > 0 ? String(fallback) : '0'}
        className={[
          'h-9 w-full rounded-lg border-2 px-2 text-sm font-bold tabular-nums focus:outline-none',
          accent ? 'border-emerald-200 bg-white focus:border-emerald-500 text-emerald-800'
                 : 'border-slate-200 focus:border-blue-500',
        ].join(' ')}
      />
      {!isOverride && fallback > 0 && (
        <div className="text-[9px] text-slate-500 font-bold mt-0.5">Default: {fallback}</div>
      )}
    </div>
  );
}
