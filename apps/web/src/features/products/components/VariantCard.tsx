import { useState } from 'react';
import { ChevronDown, Save, Trash2, Image as ImageIcon, Edit3 } from 'lucide-react';
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

  return (
    <div
      className={`rounded-2xl border-2 bg-white overflow-hidden transition-all ${
        expanded
          ? 'border-brand-400 shadow-lg'
          : 'border-slate-200 hover:border-brand-300 hover:shadow-md'
      }`}
    >
      {/* COLLAPSED HEADER — always visible, clickable */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-4 p-3 text-left hover:bg-slate-50 transition-colors"
      >
        {/* Thumbnail */}
        <div className="h-16 w-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
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
          <div className="flex items-center gap-2">
            {draft.colorHex && (
              <span
                className="h-3 w-3 rounded-full border border-slate-300 shrink-0"
                style={{ backgroundColor: draft.colorHex }}
              />
            )}
            <div className="font-bold text-slate-900 truncate">
              {draft.name || 'Unnamed variant'}
            </div>
            {!draft.isActive && (
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                INACTIVE
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
            {draft.sku && <span>SKU: <strong>{draft.sku}</strong></span>}
            {draft.size && <span>• Code: <strong>{draft.size}</strong></span>}
            {draft.color && !draft.colorHex && <span>• {draft.color}</span>}
          </div>
        </div>

        {/* Price + Stock */}
        <div className="text-right shrink-0 hidden sm:block">
          <div className="text-lg font-bold text-emerald-700">
            {formatPKRFull(draft.price ?? 0)}
          </div>
          <div className="text-[11px] text-slate-500">
            Stock: <strong>{draft.stock ?? 0}</strong>
          </div>
        </div>

        {/* Toggle icon */}
        <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
          expanded ? 'bg-brand-100 text-brand-700 rotate-180' : 'bg-slate-100 text-slate-600'
        }`}>
          <ChevronDown className="h-5 w-5" />
        </div>
      </button>

      {/* EXPANDED EDITOR */}
      {expanded && (
        <div className="border-t-2 border-slate-100 p-5 bg-slate-50/30">
          <div className="grid gap-5 lg:grid-cols-[180px_1fr]">
            {/* Image area */}
            <div className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Variant Image
              </div>
              <div className="aspect-square rounded-xl border-2 border-slate-200 bg-white overflow-hidden">
                {draft.imageUrl ? (
                  <img src={draft.imageUrl} alt={draft.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <ImageIcon className="h-10 w-10 mb-1" />
                    <div className="text-xs font-bold">No image</div>
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
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Variant Name *</label>
                  <input
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30"
                    value={draft.name ?? ''}
                    onChange={(e) => onUpdate({ name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">SKU</label>
                  <input
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                    value={draft.sku ?? ''}
                    onChange={(e) => onUpdate({ sku: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Barcode</label>
                  <input
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                    value={draft.barcode ?? ''}
                    onChange={(e) => onUpdate({ barcode: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Color Name</label>
                  <input
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                    value={draft.color ?? ''}
                    onChange={(e) => onUpdate({ color: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Color Hex</label>
                  <div className="flex gap-1.5">
                    <input
                      type="color"
                      className="h-10 w-10 rounded-lg border border-slate-200 cursor-pointer"
                      value={draft.colorHex || '#16a34a'}
                      onChange={(e) => onUpdate({ colorHex: e.target.value })}
                    />
                    <input
                      className="h-10 flex-1 rounded-lg border border-slate-200 px-3 text-sm font-mono"
                      value={draft.colorHex ?? ''}
                      onChange={(e) => onUpdate({ colorHex: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Size / Code</label>
                  <input
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                    value={draft.size ?? ''}
                    onChange={(e) => onUpdate({ size: e.target.value })}
                    placeholder="1D, 17R, M, L"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Sell Price (PKR)</label>
                  <input
                    type="number" step="0.01"
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold text-emerald-700"
                    value={draft.price ?? 0}
                    onChange={(e) => onUpdate({ price: Number(e.target.value || 0) })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Cost Price (PKR)</label>
                  <input
                    type="number" step="0.01"
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                    value={draft.costPrice ?? 0}
                    onChange={(e) => onUpdate({ costPrice: Number(e.target.value || 0) })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Wholesale (PKR)</label>
                  <input
                    type="number" step="0.01"
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                    value={draft.wholesalePrice ?? ''}
                    onChange={(e) => onUpdate({ wholesalePrice: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Stock</label>
                  <input
                    type="number"
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                    value={draft.stock ?? 0}
                    onChange={(e) => onUpdate({ stock: Number(e.target.value || 0) })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Low Stock Alert</label>
                  <input
                    type="number"
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                    value={draft.lowStockAlert ?? 5}
                    onChange={(e) => onUpdate({ lowStockAlert: Number(e.target.value || 0) })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Unit</label>
                  <input
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                    value={draft.unit ?? ''}
                    onChange={(e) => onUpdate({ unit: e.target.value })}
                    placeholder={parentUnit || 'pcs'}
                  />
                </div>
              </div>

              {/* Profit bar */}
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 text-sm">
                <div className="flex items-center gap-4 text-emerald-900">
                  <span><strong>Profit:</strong> {formatPKRFull(profit)}</span>
                  <span className="text-emerald-600">•</span>
                  <span><strong>Margin:</strong> {margin.toFixed(1)}%</span>
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={draft.isActive ?? true}
                    onChange={(e) => onUpdate({ isActive: e.target.checked })}
                    className="h-4 w-4 rounded"
                  />
                  Active
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="secondary" onClick={onDelete} loading={deleting}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
                <Button onClick={onSave} loading={saving}>
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
