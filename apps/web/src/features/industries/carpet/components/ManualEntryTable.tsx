import { useState, useMemo } from 'react';
import {
  Plus, Trash2, Copy, AlertCircle, CheckCircle2, Package,
  Ruler, DollarSign, MapPin, Tag, X, GripVertical,
} from 'lucide-react';
import { formatPKR } from '@/lib/format';

export interface ManualRow {
  id: string; // local row id for UI
  productName: string;
  variantName: string;
  rollNumber: string;
  designCode: string;
  widthFt: number | '';
  widthInch: number | '';
  lengthFt: number | '';
  costPerSqft: number | '';
  salePricePerSqft: number | '';
  rackNumber: string;
  quality: string;
  pile: string;
  notes: string;
}

interface ProductOption {
  productName: string;
  variantName: string;
  productSku?: string;
  variantSku?: string;
  defaultCost?: number;
  defaultPrice?: number;
}

interface Props {
  rows: ManualRow[];
  onChange: (rows: ManualRow[]) => void;
  productOptions: ProductOption[];
}

const QUALITY_OPTIONS = ['', 'Premium', 'Standard', 'Economy'];
const PILE_OPTIONS = ['', 'Wool', 'Synthetic', 'Mixed', 'Cotton', 'Jute'];

export function ManualEntryTable({ rows, onChange, productOptions }: Props) {
  // Group products by name for dropdown
  const productGroups = useMemo(() => {
    const map = new Map<string, ProductOption[]>();
    for (const opt of productOptions) {
      const existing = map.get(opt.productName) ?? [];
      existing.push(opt);
      map.set(opt.productName, existing);
    }
    return map;
  }, [productOptions]);

  const productNames = useMemo(
    () => Array.from(productGroups.keys()).sort(),
    [productGroups],
  );

  const newRow = (overrides?: Partial<ManualRow>): ManualRow => ({
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    productName: '',
    variantName: '',
    rollNumber: '',
    designCode: '',
    widthFt: '',
    widthInch: '',
    lengthFt: '',
    costPerSqft: '',
    salePricePerSqft: '',
    rackNumber: '',
    quality: '',
    pile: '',
    notes: '',
    ...overrides,
  });

  const addRow = () => {
    onChange([...rows, newRow()]);
  };

  const addEmptyRows = (count: number) => {
    const newRows: ManualRow[] = [];
    for (let i = 0; i < count; i++) {
      newRows.push(newRow());
    }
    onChange([...rows, ...newRows]);
  };

  const removeRow = (id: string) => {
    onChange(rows.filter((r) => r.id !== id));
  };

  const duplicateRow = (id: string) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const dup = newRow({
      productName: row.productName,
      variantName: row.variantName,
      widthFt: row.widthFt,
      widthInch: row.widthInch,
      costPerSqft: row.costPerSqft,
      salePricePerSqft: row.salePricePerSqft,
      rackNumber: row.rackNumber,
      quality: row.quality,
      pile: row.pile,
    });
    const index = rows.findIndex((r) => r.id === id);
    const next = [...rows];
    next.splice(index + 1, 0, dup);
    onChange(next);
  };

  const updateRow = (id: string, patch: Partial<ManualRow>) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  /**
   * When product changes, auto-fill defaults (variant, cost, price)
   */
  const handleProductChange = (id: string, productName: string) => {
    const variants = productGroups.get(productName) ?? [];
    const firstVariant = variants[0];
    updateRow(id, {
      productName,
      variantName: firstVariant?.variantName ?? '',
      costPerSqft:
        firstVariant?.defaultCost && firstVariant.defaultCost > 0
          ? firstVariant.defaultCost
          : '',
      salePricePerSqft:
        firstVariant?.defaultPrice && firstVariant.defaultPrice > 0
          ? firstVariant.defaultPrice
          : '',
    });
  };

  /**
   * When variant changes, auto-fill defaults for that variant
   */
  const handleVariantChange = (id: string, variantName: string) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const variants = productGroups.get(row.productName) ?? [];
    const match = variants.find((v) => v.variantName === variantName);
    updateRow(id, {
      variantName,
      costPerSqft:
        match?.defaultCost && match.defaultCost > 0
          ? match.defaultCost
          : row.costPerSqft,
      salePricePerSqft:
        match?.defaultPrice && match.defaultPrice > 0
          ? match.defaultPrice
          : row.salePricePerSqft,
    });
  };

  // Validation for each row
  const getRowStatus = (row: ManualRow) => {
    const errors: string[] = [];
    if (!row.productName) errors.push('Product required');
    if (!row.widthFt || Number(row.widthFt) <= 0) errors.push('Width required');
    if (!row.lengthFt || Number(row.lengthFt) <= 0) errors.push('Length required');
    return {
      isValid: errors.length === 0,
      errors,
      isEmpty:
        !row.productName &&
        !row.widthFt &&
        !row.lengthFt &&
        !row.rollNumber,
    };
  };

  const stats = useMemo(() => {
    let valid = 0;
    let invalid = 0;
    let empty = 0;
    let totalSqft = 0;
    let totalCost = 0;
    let totalValue = 0;

    for (const row of rows) {
      const status = getRowStatus(row);
      if (status.isEmpty) {
        empty++;
        continue;
      }
      if (status.isValid) {
        valid++;
        const sqft =
          (Number(row.widthFt) + Number(row.widthInch || 0) / 12) *
          Number(row.lengthFt);
        totalSqft += sqft;
        totalCost += sqft * Number(row.costPerSqft || 0);
        totalValue += sqft * Number(row.salePricePerSqft || 0);
      } else {
        invalid++;
      }
    }

    return { valid, invalid, empty, totalSqft, totalCost, totalValue };
  }, [rows]);

  if (productOptions.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-amber-300 bg-amber-50/30 p-12 text-center">
        <div className="h-16 w-16 rounded-2xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center mb-3">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-extrabold text-amber-900">
          No Carpet Products Yet
        </h3>
        <p className="text-sm text-amber-800 mt-2 max-w-md mx-auto">
          Manual entry mode use karne ke liye pehle aap ke products mein
          carpet items hone chahiye (with <strong>sqft / sqm / sqyd</strong> unit).
        </p>
        <a
          href="/products/new"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold"
        >
          <Plus className="h-4 w-4" /> Add First Carpet Product
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <StatPill label="Total Rows" value={String(rows.length)} color="slate" />
        <StatPill label="Valid" value={String(stats.valid)} color="emerald" />
        <StatPill label="Invalid" value={String(stats.invalid)} color="rose" />
        <StatPill label="Total Sqft" value={stats.totalSqft.toFixed(0)} color="violet" />
        <StatPill label="Total Value" value={formatPKR(stats.totalValue)} color="amber" />
      </div>

      {/* Table */}
      <div className="rounded-2xl border-2 border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gradient-to-br from-slate-100 to-slate-50 sticky top-0">
              <tr>
                <th className="px-2 py-3 text-left font-bold uppercase tracking-wider text-slate-700 w-8">#</th>
                <th className="px-2 py-3 text-left font-bold uppercase tracking-wider text-slate-700 min-w-[180px]">
                  Product *
                </th>
                <th className="px-2 py-3 text-left font-bold uppercase tracking-wider text-slate-700 min-w-[140px]">
                  Variant
                </th>
                <th className="px-2 py-3 text-left font-bold uppercase tracking-wider text-slate-700 min-w-[100px]">
                  Roll #
                </th>
                <th className="px-2 py-3 text-center font-bold uppercase tracking-wider text-slate-700 min-w-[90px]">
                  Width *
                </th>
                <th className="px-2 py-3 text-center font-bold uppercase tracking-wider text-slate-700 min-w-[80px]">
                  Inch
                </th>
                <th className="px-2 py-3 text-center font-bold uppercase tracking-wider text-slate-700 min-w-[90px]">
                  Length *
                </th>
                <th className="px-2 py-3 text-right font-bold uppercase tracking-wider text-slate-700 min-w-[80px]">
                  Sqft
                </th>
                <th className="px-2 py-3 text-right font-bold uppercase tracking-wider text-slate-700 min-w-[100px]">
                  Cost/sqft
                </th>
                <th className="px-2 py-3 text-right font-bold uppercase tracking-wider text-slate-700 min-w-[100px]">
                  Sale/sqft
                </th>
                <th className="px-2 py-3 text-left font-bold uppercase tracking-wider text-slate-700 min-w-[100px]">
                  Rack
                </th>
                <th className="px-2 py-3 text-left font-bold uppercase tracking-wider text-slate-700 min-w-[100px]">
                  Quality
                </th>
                <th className="px-2 py-3 text-left font-bold uppercase tracking-wider text-slate-700 min-w-[100px]">
                  Pile
                </th>
                <th className="px-2 py-3 text-center font-bold uppercase tracking-wider text-slate-700 w-20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-12 text-center">
                    <Package className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">No rows yet</p>
                    <p className="text-xs text-slate-500 mt-1">
                      "Add Row" button click karein neeche
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  const status = getRowStatus(row);
                  const variants = productGroups.get(row.productName) ?? [];
                  const sqft =
                    Number(row.widthFt || 0) > 0 && Number(row.lengthFt || 0) > 0
                      ? (Number(row.widthFt) + Number(row.widthInch || 0) / 12) *
                        Number(row.lengthFt)
                      : 0;

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
                      {/* Row number + status */}
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

                      {/* Product dropdown */}
                      <td className="px-2 py-2">
                        <select
                          value={row.productName}
                          onChange={(e) => handleProductChange(row.id, e.target.value)}
                          className={`w-full px-2 py-1.5 rounded-lg border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-200 ${
                            row.productName
                              ? 'border-emerald-300 bg-emerald-50/50 text-slate-900'
                              : 'border-slate-200 bg-white text-slate-400'
                          }`}
                        >
                          <option value="">— Select product —</option>
                          {productNames.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Variant dropdown — always show if product selected and has variants */}
                      <td className="px-2 py-2">
                        {!row.productName ? (
                          <span className="px-2 py-1.5 text-xs text-slate-400 block">—</span>
                        ) : variants.length === 0 ? (
                          <span className="px-2 py-1.5 text-[10px] italic text-slate-500 block">
                            No variants
                          </span>
                        ) : variants.length === 1 && !variants[0].variantName ? (
                          <span className="px-2 py-1.5 text-[10px] italic text-slate-500 block">
                            (default)
                          </span>
                        ) : (
                          <select
                            value={row.variantName}
                            onChange={(e) => handleVariantChange(row.id, e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border-2 border-violet-300 bg-violet-50 text-xs font-bold text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-500"
                          >
                            {variants.length > 1 && <option value="">— Select variant —</option>}
                            {variants.map((v) => (
                              <option key={v.variantName} value={v.variantName}>
                                {v.variantName || '(default)'}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>

                      {/* Roll number */}
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={row.rollNumber}
                          onChange={(e) => updateRow(row.id, { rollNumber: e.target.value })}
                          placeholder="Auto"
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500"
                        />
                      </td>

                      {/* Width Ft */}
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.widthFt}
                          onChange={(e) =>
                            updateRow(row.id, {
                              widthFt: e.target.value === '' ? '' : Number(e.target.value),
                            })
                          }
                          placeholder="12"
                          className={`w-full px-2 py-1.5 rounded-lg border text-xs font-bold text-center focus:outline-none focus:ring-2 ${
                            row.widthFt && Number(row.widthFt) > 0
                              ? 'border-emerald-300 bg-emerald-50/50 focus:ring-emerald-200'
                              : 'border-slate-200 bg-white focus:ring-slate-200'
                          }`}
                        />
                      </td>

                      {/* Width Inch */}
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          max="11"
                          value={row.widthInch}
                          onChange={(e) =>
                            updateRow(row.id, {
                              widthInch: e.target.value === '' ? '' : Number(e.target.value),
                            })
                          }
                          placeholder="0"
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-center focus:outline-none focus:border-emerald-500"
                        />
                      </td>

                      {/* Length */}
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.lengthFt}
                          onChange={(e) =>
                            updateRow(row.id, {
                              lengthFt: e.target.value === '' ? '' : Number(e.target.value),
                            })
                          }
                          placeholder="100"
                          className={`w-full px-2 py-1.5 rounded-lg border text-xs font-bold text-center focus:outline-none focus:ring-2 ${
                            row.lengthFt && Number(row.lengthFt) > 0
                              ? 'border-emerald-300 bg-emerald-50/50 focus:ring-emerald-200'
                              : 'border-slate-200 bg-white focus:ring-slate-200'
                          }`}
                        />
                      </td>

                      {/* Sqft (auto-calculated) */}
                      <td className="px-2 py-2 text-right">
                        <div className="font-extrabold text-emerald-700 text-sm tabular-nums">
                          {sqft > 0 ? sqft.toFixed(2) : '—'}
                        </div>
                      </td>

                      {/* Cost per sqft */}
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.costPerSqft}
                          onChange={(e) =>
                            updateRow(row.id, {
                              costPerSqft: e.target.value === '' ? '' : Number(e.target.value),
                            })
                          }
                          placeholder="0"
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-right focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Sale per sqft */}
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.salePricePerSqft}
                          onChange={(e) =>
                            updateRow(row.id, {
                              salePricePerSqft: e.target.value === '' ? '' : Number(e.target.value),
                            })
                          }
                          placeholder="0"
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-right focus:outline-none focus:border-emerald-500"
                        />
                      </td>

                      {/* Rack */}
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={row.rackNumber}
                          onChange={(e) => updateRow(row.id, { rackNumber: e.target.value })}
                          placeholder="Wall-1"
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold focus:outline-none focus:border-emerald-500"
                        />
                      </td>

                      {/* Quality */}
                      <td className="px-2 py-2">
                        <select
                          value={row.quality}
                          onChange={(e) => updateRow(row.id, { quality: e.target.value })}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold focus:outline-none focus:border-emerald-500"
                        >
                          {QUALITY_OPTIONS.map((q) => (
                            <option key={q || 'none'} value={q}>
                              {q || '—'}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Pile */}
                      <td className="px-2 py-2">
                        <select
                          value={row.pile}
                          onChange={(e) => updateRow(row.id, { pile: e.target.value })}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold focus:outline-none focus:border-emerald-500"
                        >
                          {PILE_OPTIONS.map((p) => (
                            <option key={p || 'none'} value={p}>
                              {p || '—'}
                            </option>
                          ))}
                        </select>
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
            💡 Tip: Product select karte hi cost/sale price auto-fill ho jate hain product defaults se
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
  color: 'slate' | 'emerald' | 'rose' | 'violet' | 'amber';
}) {
  const colors = {
    slate: 'bg-slate-50 border-slate-200 text-slate-900',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    rose: 'bg-rose-50 border-rose-200 text-rose-900',
    violet: 'bg-violet-50 border-violet-200 text-violet-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
  };
  return (
    <div className={`rounded-xl border-2 px-3 py-2 ${colors[color]}`}>
      <div className="text-[9px] uppercase font-bold opacity-70">{label}</div>
      <div className="text-base font-extrabold mt-0.5 tabular-nums">{value}</div>
    </div>
  );
}
