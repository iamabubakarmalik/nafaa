import { useMemo, useState } from 'react';
import {
  Plus, Trash2, Copy, AlertCircle, CheckCircle2, Package,
  X, Tag as TagIcon,
} from 'lucide-react';
import { formatPKR } from '@/lib/format';

export interface ProductManualRow {
  id: string;
  name: string;
  description: string;
  categoryName: string;
  brandName: string;
  tagNames: string;
  sku: string;
  barcode: string;
  unit: string;
  price: number | '';
  costPrice: number | '';
  wholesalePrice: number | '';
  stock: number | '';
  lowStockAlert: number | '';
  variantNames: string;
  imageUrls: string;
  isActive: boolean;
  isFeatured: boolean;
}

interface RefData {
  categories: Array<{ id: string; name: string; color: string }>;
  brands: Array<{ id: string; name: string }>;
  tags: Array<{ id: string; name: string; color: string }>;
}

interface Props {
  rows: ProductManualRow[];
  onChange: (rows: ProductManualRow[]) => void;
  referenceData: RefData;
  defaultUnit?: string;
}

const UNIT_OPTIONS = [
  'pcs', 'kg', 'gram', 'liter', 'ml', 'meter', 'sqft', 'sqm',
  'sqyd', 'box', 'packet', 'dozen', 'plate', 'service', 'strip',
];

export function ProductManualEntryTable({
  rows,
  onChange,
  referenceData,
  defaultUnit = 'pcs',
}: Props) {
  const [showColumnHelper, setShowColumnHelper] = useState(false);

  const newRow = (overrides?: Partial<ProductManualRow>): ProductManualRow => ({
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    description: '',
    categoryName: '',
    brandName: '',
    tagNames: '',
    sku: '',
    barcode: '',
    unit: defaultUnit,
    price: '',
    costPrice: '',
    wholesalePrice: '',
    stock: '',
    lowStockAlert: '',
    variantNames: '',
    imageUrls: '',
    isActive: true,
    isFeatured: false,
    ...overrides,
  });

  const addRow = () => onChange([...rows, newRow()]);

  const addEmptyRows = (count: number) => {
    const newRows: ProductManualRow[] = [];
    for (let i = 0; i < count; i++) newRows.push(newRow());
    onChange([...rows, ...newRows]);
  };

  const removeRow = (id: string) => onChange(rows.filter((r) => r.id !== id));

  const duplicateRow = (id: string) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const { id: _, ...rest } = row;
    const dup = newRow(rest);
    const index = rows.findIndex((r) => r.id === id);
    const next = [...rows];
    next.splice(index + 1, 0, dup);
    onChange(next);
  };

  const updateRow = (id: string, patch: Partial<ProductManualRow>) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const getRowStatus = (row: ProductManualRow) => {
    const errors: string[] = [];
    if (!row.name?.trim()) errors.push('Name required');
    if (row.price === '' || Number(row.price) < 0) errors.push('Price required');
    return {
      isValid: errors.length === 0,
      errors,
      isEmpty: !row.name && row.price === '' && !row.sku,
    };
  };

  const stats = useMemo(() => {
    let valid = 0;
    let invalid = 0;
    let empty = 0;
    let totalStockValue = 0;
    let totalVariants = 0;
    const newCats = new Set<string>();
    const newBrands = new Set<string>();
    const newTags = new Set<string>();

    const catNames = new Set(referenceData.categories.map((c) => c.name.toLowerCase()));
    const brandNames = new Set(referenceData.brands.map((b) => b.name.toLowerCase()));
    const tagNames = new Set(referenceData.tags.map((t) => t.name.toLowerCase()));

    for (const row of rows) {
      const status = getRowStatus(row);
      if (status.isEmpty) {
        empty++;
        continue;
      }
      if (status.isValid) {
        valid++;
        totalStockValue += Number(row.stock || 0) * Number(row.price || 0);
        if (row.variantNames) {
          totalVariants += row.variantNames.split(',').filter((v) => v.trim()).length;
        }
        if (row.categoryName && !catNames.has(row.categoryName.toLowerCase().trim())) {
          newCats.add(row.categoryName.trim());
        }
        if (row.brandName && !brandNames.has(row.brandName.toLowerCase().trim())) {
          newBrands.add(row.brandName.trim());
        }
        for (const t of row.tagNames.split(',')) {
          const tn = t.trim();
          if (tn && !tagNames.has(tn.toLowerCase())) newTags.add(tn);
        }
      } else {
        invalid++;
      }
    }

    return {
      valid,
      invalid,
      empty,
      totalStockValue,
      totalVariants,
      newCats: newCats.size,
      newBrands: newBrands.size,
      newTags: newTags.size,
    };
  }, [rows, referenceData]);

  return (
    <div className="space-y-4">
      {/* Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        <StatPill label="Rows" value={String(rows.length)} color="slate" />
        <StatPill label="Valid" value={String(stats.valid)} color="emerald" />
        <StatPill label="Invalid" value={String(stats.invalid)} color="rose" />
        <StatPill label="Variants" value={String(stats.totalVariants)} color="violet" />
        <StatPill label="Stock Value" value={formatPKR(stats.totalStockValue)} color="amber" />
        <StatPill
          label="New Refs"
          value={String(stats.newCats + stats.newBrands + stats.newTags)}
          color="blue"
        />
      </div>

      {/* New entities preview */}
      {(stats.newCats > 0 || stats.newBrands > 0 || stats.newTags > 0) && (
        <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900">
            <strong>Auto-create:</strong>{' '}
            {stats.newCats > 0 && `${stats.newCats} new categor${stats.newCats > 1 ? 'ies' : 'y'}`}
            {stats.newCats > 0 && (stats.newBrands > 0 || stats.newTags > 0) && ', '}
            {stats.newBrands > 0 && `${stats.newBrands} new brand${stats.newBrands > 1 ? 's' : ''}`}
            {stats.newBrands > 0 && stats.newTags > 0 && ', '}
            {stats.newTags > 0 && `${stats.newTags} new tag${stats.newTags > 1 ? 's' : ''}`}
            {' '}will be created on import
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border-2 border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gradient-to-br from-slate-100 to-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-2 py-3 text-left font-bold uppercase tracking-wider text-slate-700 w-8">#</th>
                <th className="px-2 py-3 text-left font-bold uppercase tracking-wider text-slate-700 min-w-[180px]">
                  Name *
                </th>
                <th className="px-2 py-3 text-left font-bold uppercase tracking-wider text-slate-700 min-w-[140px]">
                  Category
                </th>
                <th className="px-2 py-3 text-left font-bold uppercase tracking-wider text-slate-700 min-w-[120px]">
                  Brand
                </th>
                <th className="px-2 py-3 text-left font-bold uppercase tracking-wider text-slate-700 min-w-[120px]">
                  SKU
                </th>
                <th className="px-2 py-3 text-left font-bold uppercase tracking-wider text-slate-700 min-w-[80px]">
                  Unit
                </th>
                <th className="px-2 py-3 text-right font-bold uppercase tracking-wider text-slate-700 min-w-[100px]">
                  Price *
                </th>
                <th className="px-2 py-3 text-right font-bold uppercase tracking-wider text-slate-700 min-w-[100px]">
                  Cost
                </th>
                <th className="px-2 py-3 text-right font-bold uppercase tracking-wider text-slate-700 min-w-[80px]">
                  Stock
                </th>
                <th className="px-2 py-3 text-left font-bold uppercase tracking-wider text-slate-700 min-w-[150px]">
                  Variants
                </th>
                <th className="px-2 py-3 text-left font-bold uppercase tracking-wider text-slate-700 min-w-[120px]">
                  Tags
                </th>
                <th className="px-2 py-3 text-center font-bold uppercase tracking-wider text-slate-700 w-20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center">
                    <Package className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">No rows yet</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Click "Add Row" below to start
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  const status = getRowStatus(row);
                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-50 transition ${
                        status.isEmpty
                          ? ''
                          : status.isValid
                            ? 'bg-emerald-50/30'
                            : 'bg-rose-50/30'
                      }`}
                    >
                      <td className="px-2 py-2 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-mono font-bold text-slate-500 text-[10px]">
                            {idx + 1}
                          </span>
                          {!status.isEmpty &&
                            (status.isValid ? (
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-rose-600" />
                            ))}
                        </div>
                      </td>

                      {/* Name */}
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => updateRow(row.id, { name: e.target.value })}
                          placeholder="Product name"
                          className={`w-full px-2 py-1.5 rounded-lg border text-xs font-bold focus:outline-none focus:ring-2 ${
                            row.name
                              ? 'border-emerald-300 bg-emerald-50/50 focus:ring-emerald-200'
                              : 'border-slate-200 focus:ring-emerald-200'
                          }`}
                        />
                      </td>

                      {/* Category — datalist for both existing + new */}
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          list={`cat-${row.id}`}
                          value={row.categoryName}
                          onChange={(e) => updateRow(row.id, { categoryName: e.target.value })}
                          placeholder="Type or select"
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold focus:outline-none focus:border-blue-500"
                        />
                        <datalist id={`cat-${row.id}`}>
                          {referenceData.categories.map((c) => (
                            <option key={c.id} value={c.name} />
                          ))}
                        </datalist>
                      </td>

                      {/* Brand */}
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          list={`brand-${row.id}`}
                          value={row.brandName}
                          onChange={(e) => updateRow(row.id, { brandName: e.target.value })}
                          placeholder="Type or select"
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold focus:outline-none focus:border-blue-500"
                        />
                        <datalist id={`brand-${row.id}`}>
                          {referenceData.brands.map((b) => (
                            <option key={b.id} value={b.name} />
                          ))}
                        </datalist>
                      </td>

                      {/* SKU */}
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={row.sku}
                          onChange={(e) => updateRow(row.id, { sku: e.target.value })}
                          placeholder="Optional"
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500"
                        />
                      </td>

                      {/* Unit */}
                      <td className="px-2 py-2">
                        <select
                          value={row.unit}
                          onChange={(e) => updateRow(row.id, { unit: e.target.value })}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold focus:outline-none focus:border-emerald-500"
                        >
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </td>

                      {/* Price */}
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.price}
                          onChange={(e) =>
                            updateRow(row.id, {
                              price: e.target.value === '' ? '' : Number(e.target.value),
                            })
                          }
                          placeholder="0"
                          className={`w-full px-2 py-1.5 rounded-lg border text-xs font-bold text-right focus:outline-none focus:ring-2 ${
                            row.price !== '' && Number(row.price) > 0
                              ? 'border-emerald-300 bg-emerald-50/50 focus:ring-emerald-200'
                              : 'border-slate-200 focus:ring-emerald-200'
                          }`}
                        />
                      </td>

                      {/* Cost */}
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.costPrice}
                          onChange={(e) =>
                            updateRow(row.id, {
                              costPrice: e.target.value === '' ? '' : Number(e.target.value),
                            })
                          }
                          placeholder="0"
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-right focus:outline-none focus:border-emerald-500"
                        />
                      </td>

                      {/* Stock */}
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.stock}
                          onChange={(e) =>
                            updateRow(row.id, {
                              stock: e.target.value === '' ? '' : Number(e.target.value),
                            })
                          }
                          placeholder="0"
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-right focus:outline-none focus:border-emerald-500"
                        />
                      </td>

                      {/* Variants (comma-separated) */}
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={row.variantNames}
                          onChange={(e) => updateRow(row.id, { variantNames: e.target.value })}
                          placeholder="Red, Blue, Green"
                          className="w-full px-2 py-1.5 rounded-lg border border-violet-200 bg-violet-50/30 text-xs font-bold focus:outline-none focus:border-violet-500"
                        />
                      </td>

                      {/* Tags (comma-separated) */}
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={row.tagNames}
                          onChange={(e) => updateRow(row.id, { tagNames: e.target.value })}
                          placeholder="new, sale"
                          className="w-full px-2 py-1.5 rounded-lg border border-amber-200 bg-amber-50/30 text-xs font-bold focus:outline-none focus:border-amber-500"
                        />
                      </td>

                      {/* Actions */}
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => duplicateRow(row.id)}
                            className="h-7 w-7 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center justify-center transition"
                            title="Duplicate row"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => removeRow(row.id)}
                            className="h-7 w-7 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 flex items-center justify-center transition"
                            title="Remove row"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Add rows footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="text-xs text-slate-600 font-semibold">
            💡 Tip: Type karein ya dropdown se select karein — naye categories/brands/tags auto-create honge
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={addRow}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1 transition"
            >
              <Plus className="h-3 w-3" /> Add Row
            </button>
            <button
              onClick={() => addEmptyRows(5)}
              className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition"
            >
              + 5 Rows
            </button>
            <button
              onClick={() => addEmptyRows(10)}
              className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition"
            >
              + 10 Rows
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: 'slate' | 'emerald' | 'rose' | 'violet' | 'amber' | 'blue';
}) {
  const colors = {
    slate: 'bg-slate-50 border-slate-200 text-slate-900',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    rose: 'bg-rose-50 border-rose-200 text-rose-900',
    violet: 'bg-violet-50 border-violet-200 text-violet-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
  };
  return (
    <div className={`rounded-xl border-2 px-3 py-2 ${colors[color]}`}>
      <div className="text-[9px] uppercase font-bold opacity-70">{label}</div>
      <div className="text-base font-extrabold mt-0.5 tabular-nums truncate">{value}</div>
    </div>
  );
}
