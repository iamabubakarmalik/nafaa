import { useState } from 'react';
import {
  ChevronDown, Save, Trash2, Image as ImageIcon, Palette, Hash,
  DollarSign, Package, Sparkles, TrendingUp, AlertTriangle, Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AvatarUpload } from '@/components/uploads';
import { formatPKRFull } from '@/lib/format';
import type { ProductVariant, UpsertVariantPayload } from '@/api/product-variants.api';

interface Props {
  variant: ProductVariant;
  draft: UpsertVariantPayload;
  parentUnit: string;
  onUpdate: (patch: Partial<UpsertVariantPayload>) => void;
  onImageChange: (url: string | null) => void;
  onSave: () => void;
  onDelete: () => void;
  saving: boolean;
  deleting: boolean;
}

export function VariantCard({
  variant, draft, parentUnit, onUpdate, onImageChange,
  onSave, onDelete, saving, deleting,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const profit = (draft.price ?? 0) - (draft.costPrice ?? 0);
  const margin = draft.price ? ((profit / draft.price) * 100) : 0;
  const stockValue = (draft.stock ?? 0) * (draft.price ?? 0);
  const isLowStock = (draft.stock ?? 0) > 0 && (draft.stock ?? 0) <= (draft.lowStockAlert ?? 5);
  const isOutOfStock = (draft.stock ?? 0) === 0;
  const isLoss = profit < 0;

  return (
    <div
      className={`rounded-2xl border-2 bg-white overflow-hidden transition-all ${
        expanded
          ? 'border-emerald-400 shadow-xl shadow-emerald-500/10'
          : 'border-slate-200 hover:border-emerald-300 hover:shadow-md'
      }`}
    >
      {/* COLLAPSED HEADER */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-4 p-3 text-left hover:bg-slate-50 transition-colors"
      >
        {/* Thumbnail */}
        <div className="h-16 w-16 rounded-xl overflow-hidden bg-slate-100 border-2 border-slate-200 shrink-0 ring-2 ring-white shadow-sm">
          {draft.imageUrl ? (
            <img src={draft.imageUrl} alt={draft.name} className="h-full w-full object-cover" />
          ) : draft.colorHex ? (
            <div className="h-full w-full" style={{ backgroundColor: draft.colorHex }} />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
              <ImageIcon className="h-6 w-6 text-slate-400" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {draft.colorHex && (
              <span
                className="h-3 w-3 rounded-full border border-slate-300 shrink-0 shadow-sm"
                style={{ backgroundColor: draft.colorHex }}
              />
            )}
            <div className="font-extrabold text-slate-900 truncate">
              {draft.name || 'Unnamed variant'}
            </div>
            {!draft.isActive && (
              <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[9px] font-extrabold uppercase">
                INACTIVE
              </span>
            )}
            {isLoss && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[9px] font-extrabold uppercase">
                <AlertTriangle className="h-2.5 w-2.5" /> LOSS
              </span>
            )}
            {isOutOfStock && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[9px] font-extrabold uppercase">
                OUT
              </span>
            )}
            {isLowStock && !isOutOfStock && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-extrabold uppercase">
                LOW
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap font-semibold">
            {draft.sku && <span>SKU: <strong className="text-slate-700 font-mono">{draft.sku}</strong></span>}
            {draft.size && <span>• Code: <strong className="text-slate-700">{draft.size}</strong></span>}
            {draft.color && !draft.colorHex && <span>• {draft.color}</span>}
          </div>
        </div>

        {/* Price + Stock */}
        <div className="text-right shrink-0 hidden sm:block">
          <div className="text-lg font-extrabold text-emerald-700 tabular-nums">
            {formatPKRFull(draft.price ?? 0)}
          </div>
          <div className="text-[11px] text-slate-500 font-bold">
            Stock: <strong className={isOutOfStock ? 'text-rose-700' : isLowStock ? 'text-amber-700' : 'text-slate-900'}>{draft.stock ?? 0}</strong>
          </div>
        </div>

        {/* Toggle icon */}
        <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
          expanded ? 'bg-emerald-600 text-white rotate-180 shadow-md' : 'bg-slate-100 text-slate-600'
        }`}>
          <ChevronDown className="h-5 w-5" />
        </div>
      </button>

      {/* EXPANDED EDITOR */}
      {expanded && (
        <div className="border-t-2 border-slate-100 p-5 bg-gradient-to-br from-slate-50/50 to-white">
          <div className="grid gap-5 lg:grid-cols-[180px_1fr]">
            {/* Image area */}
            <div className="space-y-3">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                Variant Image
              </div>
              <div className="aspect-square rounded-xl border-2 border-slate-200 bg-white overflow-hidden shadow-sm">
                {draft.imageUrl ? (
                  <img src={draft.imageUrl} alt={draft.name} className="w-full h-full object-cover" />
                ) : draft.colorHex ? (
                  <div className="w-full h-full relative" style={{ backgroundColor: draft.colorHex }}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/30 backdrop-blur rounded-lg px-2 py-1 text-white text-[10px] font-extrabold">
                        {draft.colorHex}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-gradient-to-br from-slate-100 to-slate-200">
                    <ImageIcon className="h-10 w-10 mb-1" />
                    <div className="text-xs font-extrabold">No image</div>
                  </div>
                )}
              </div>
              <AvatarUpload
                value={draft.imageUrl ?? null}
                onChange={onImageChange}
                purpose="product-image"
                size="sm"
                shape="square"
                fallbackText={draft.name || 'V'}
              />
            </div>

            {/* Fields */}
            <div className="space-y-4">
              {/* Identifiers */}
              <FieldGroup icon={Hash} title="Identifiers" tone="slate">
                <div className="grid sm:grid-cols-3 gap-3">
                  <FieldInput
                    label="Variant Name *"
                    value={draft.name ?? ''}
                    onChange={(v) => onUpdate({ name: v })}
                    placeholder="e.g. Red - Large"
                  />
                  <FieldInput
                    label="SKU"
                    value={draft.sku ?? ''}
                    onChange={(v) => onUpdate({ sku: v })}
                    mono
                  />
                  <FieldInput
                    label="Barcode"
                    value={draft.barcode ?? ''}
                    onChange={(v) => onUpdate({ barcode: v })}
                    mono
                  />
                </div>
              </FieldGroup>

              {/* Appearance */}
              <FieldGroup icon={Palette} title="Appearance" tone="violet">
                <div className="grid sm:grid-cols-3 gap-3">
                  <FieldInput
                    label="Color Name"
                    value={draft.color ?? ''}
                    onChange={(v) => onUpdate({ color: v })}
                    placeholder="Red"
                  />
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">Color Hex</label>
                    <div className="flex gap-1.5">
                      <input
                        type="color"
                        className="h-10 w-12 rounded-lg border-2 border-slate-200 cursor-pointer"
                        value={draft.colorHex || '#16a34a'}
                        onChange={(e) => onUpdate({ colorHex: e.target.value })}
                      />
                      <input
                        className="h-10 flex-1 rounded-lg border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-violet-500"
                        value={draft.colorHex ?? ''}
                        onChange={(e) => onUpdate({ colorHex: e.target.value })}
                        placeholder="#16a34a"
                      />
                    </div>
                  </div>
                  <FieldInput
                    label="Size / Code"
                    value={draft.size ?? ''}
                    onChange={(v) => onUpdate({ size: v })}
                    placeholder="M, L, 17R"
                  />
                </div>
              </FieldGroup>

              {/* Pricing */}
              <FieldGroup icon={DollarSign} title="Pricing" tone="emerald">
                <div className="grid sm:grid-cols-3 gap-3">
                  <FieldInput
                    label="Sell Price (PKR)"
                    type="number"
                    step="0.01"
                    value={String(draft.price ?? 0)}
                    onChange={(v) => onUpdate({ price: Number(v || 0) })}
                    bold
                    accentClass="text-emerald-700"
                  />
                  <FieldInput
                    label="Cost Price (PKR)"
                    type="number"
                    step="0.01"
                    value={String(draft.costPrice ?? 0)}
                    onChange={(v) => onUpdate({ costPrice: Number(v || 0) })}
                  />
                  <FieldInput
                    label="Wholesale (PKR)"
                    type="number"
                    step="0.01"
                    value={String(draft.wholesalePrice ?? '')}
                    onChange={(v) => onUpdate({ wholesalePrice: v ? Number(v) : undefined })}
                  />
                </div>
              </FieldGroup>

              {/* Stock */}
              <FieldGroup icon={Package} title="Stock & Inventory" tone="blue">
                <div className="grid sm:grid-cols-3 gap-3">
                  <FieldInput
                    label="Stock"
                    type="number"
                    value={String(draft.stock ?? 0)}
                    onChange={(v) => onUpdate({ stock: Number(v || 0) })}
                    bold
                  />
                  <FieldInput
                    label="Low Stock Alert"
                    type="number"
                    value={String(draft.lowStockAlert ?? 5)}
                    onChange={(v) => onUpdate({ lowStockAlert: Number(v || 0) })}
                  />
                  <FieldInput
                    label="Unit"
                    value={draft.unit ?? ''}
                    onChange={(v) => onUpdate({ unit: v })}
                    placeholder={parentUnit || 'pcs'}
                  />
                </div>
              </FieldGroup>

              {/* Live analytics bar */}
              <div className="grid sm:grid-cols-3 gap-3">
                <div className={`rounded-xl border-2 p-3 ${
                  isLoss ? 'bg-rose-50 border-rose-300' : 'bg-emerald-50 border-emerald-200'
                }`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className={`h-3.5 w-3.5 ${isLoss ? 'text-rose-700' : 'text-emerald-700'}`} />
                    <div className={`text-[10px] uppercase tracking-wider font-extrabold ${
                      isLoss ? 'text-rose-700' : 'text-emerald-700'
                    }`}>
                      Profit per Unit
                    </div>
                  </div>
                  <div className={`text-lg font-extrabold tabular-nums ${
                    isLoss ? 'text-rose-900' : 'text-emerald-900'
                  }`}>
                    {formatPKRFull(profit)}
                  </div>
                  <div className={`text-[10px] font-bold mt-0.5 ${
                    isLoss ? 'text-rose-700' : 'text-emerald-700'
                  }`}>
                    Margin: {margin.toFixed(1)}%
                  </div>
                </div>

                <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Package className="h-3.5 w-3.5 text-blue-700" />
                    <div className="text-[10px] uppercase tracking-wider font-extrabold text-blue-700">Stock Value</div>
                  </div>
                  <div className="text-lg font-extrabold text-blue-900 tabular-nums">
                    {formatPKRFull(stockValue)}
                  </div>
                  <div className="text-[10px] text-blue-700 font-bold mt-0.5">
                    {draft.stock ?? 0} × {formatPKRFull(draft.price ?? 0)}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3 flex items-center justify-between">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.isActive ?? true}
                      onChange={(e) => onUpdate({ isActive: e.target.checked })}
                      className="h-4 w-4 rounded"
                    />
                    <Eye className="h-4 w-4 text-slate-600" />
                    <div>
                      <div className="text-xs font-extrabold text-slate-900">Active</div>
                      <div className="text-[9px] text-slate-500 font-bold">Visible in POS</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Warnings */}
              {isLoss && (
                <div className="rounded-xl bg-rose-50 border-2 border-rose-300 p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-900">
                    <strong>Warning:</strong> Sale price is less than cost price. You'll sell at a loss!
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t-2 border-slate-100">
                <Button variant="secondary" onClick={onDelete} loading={deleting}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
                <Button onClick={onSave} loading={saving} className="bg-gradient-to-r from-emerald-600 to-emerald-700 shadow-md">
                  <Save className="h-4 w-4" /> Save Variant
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────

function FieldGroup({
  icon: Icon, title, tone, children,
}: { icon: any; title: string; tone: string; children: React.ReactNode }) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-50/50 border-slate-200',
    emerald: 'bg-emerald-50/50 border-emerald-200',
    blue: 'bg-blue-50/50 border-blue-200',
    violet: 'bg-violet-50/50 border-violet-200',
  };
  const titleTones: Record<string, string> = {
    slate: 'text-slate-700',
    emerald: 'text-emerald-700',
    blue: 'text-blue-700',
    violet: 'text-violet-700',
  };
  return (
    <div className={`rounded-xl border-2 p-3 ${tones[tone]}`}>
      <div className={`text-[10px] uppercase tracking-wider font-extrabold mb-2 flex items-center gap-1 ${titleTones[tone]}`}>
        <Icon className="h-3 w-3" />
        {title}
      </div>
      {children}
    </div>
  );
}

function FieldInput({
  label, value, onChange, type = 'text', step, placeholder, mono, bold, accentClass,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  placeholder?: string;
  mono?: boolean;
  bold?: boolean;
  accentClass?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">{label}</label>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`h-10 w-full rounded-lg border-2 border-slate-200 px-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 ${
          mono ? 'font-mono' : ''
        } ${bold ? 'font-bold' : ''} ${accentClass ?? ''}`}
      />
    </div>
  );
}
