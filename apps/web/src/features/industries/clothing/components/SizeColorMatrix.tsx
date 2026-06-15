import { useMemo } from 'react';
import { Check, Package, X } from 'lucide-react';
import type { ProductVariant } from '@/api/product-variants.api';
import { formatPKR } from '@/lib/format';

interface Props {
  variants: ProductVariant[];
  onSelect: (variant: ProductVariant) => void;
  onClose: () => void;
}

export function SizeColorMatrix({ variants, onSelect, onClose }: Props) {
  const { sizes, colors, matrix } = useMemo(() => {
    const sizesSet = new Set<string>();
    const colorsMap = new Map<string, { name: string; hex?: string | null }>();
    const matrix: Record<string, Record<string, ProductVariant>> = {};

    variants.forEach((v) => {
      const size = v.size || 'One Size';
      const color = v.color || 'Default';
      sizesSet.add(size);
      if (!colorsMap.has(color)) {
        colorsMap.set(color, { name: color, hex: v.colorHex });
      }
      if (!matrix[size]) matrix[size] = {};
      matrix[size][color] = v;
    });

    const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
    const sortedSizes = Array.from(sizesSet).sort((a, b) => {
      const ai = SIZE_ORDER.indexOf(a);
      const bi = SIZE_ORDER.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });

    return {
      sizes: sortedSizes,
      colors: Array.from(colorsMap.values()),
      matrix,
    };
  }, [variants]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-4xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-br from-pink-50 to-rose-50 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-pink-700 font-bold">
              Size × Color Matrix
            </div>
            <h3 className="font-bold text-slate-900">Select Variant</h3>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center">
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="inline-block min-w-full">
            <table className="border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-slate-100 border border-slate-300 px-3 py-2 text-xs font-extrabold text-slate-700 text-left">
                    Size \ Color
                  </th>
                  {colors.map((color) => (
                    <th key={color.name} className="border border-slate-300 px-2 py-2 min-w-[100px]">
                      <div className="flex flex-col items-center gap-1">
                        {color.hex && (
                          <div
                            className="h-6 w-6 rounded-full border-2 border-white shadow ring-1 ring-slate-300"
                            style={{ backgroundColor: color.hex }}
                          />
                        )}
                        <span className="text-[10px] font-bold text-slate-700">{color.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sizes.map((size) => (
                  <tr key={size}>
                    <td className="sticky left-0 z-10 bg-slate-50 border border-slate-300 px-3 py-2 font-extrabold text-slate-900 text-center">
                      {size}
                    </td>
                    {colors.map((color) => {
                      const variant = matrix[size]?.[color.name];
                      if (!variant) {
                        return (
                          <td key={color.name} className="border border-slate-200 bg-slate-50">
                            <div className="aspect-square flex items-center justify-center text-slate-300">
                              <X className="h-4 w-4" />
                            </div>
                          </td>
                        );
                      }
                      const outOfStock = variant.stock <= 0;
                      return (
                        <td key={color.name} className="border border-slate-200 p-0">
                          <button
                            onClick={() => !outOfStock && onSelect(variant)}
                            disabled={outOfStock}
                            className={`group w-full aspect-square p-1.5 flex flex-col items-center justify-center transition ${
                              outOfStock
                                ? 'bg-rose-50 opacity-50 cursor-not-allowed'
                                : 'bg-white hover:bg-emerald-50 hover:shadow-inner'
                            }`}
                          >
                            <div className={`text-xs font-extrabold ${outOfStock ? 'text-rose-600' : 'text-slate-900'}`}>
                              {variant.stock}
                            </div>
                            <div className="text-[9px] text-slate-500 font-bold mt-0.5">
                              {formatPKR(variant.price)}
                            </div>
                            {outOfStock && (
                              <div className="text-[9px] text-rose-700 font-extrabold mt-1">OUT</div>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
          <div className="text-slate-600">
            <strong>{variants.filter((v) => v.stock > 0).length}</strong> variants in stock /{' '}
            <strong>{variants.length}</strong> total
          </div>
          <div className="text-slate-500">Click cell to add to cart</div>
        </div>
      </div>
    </div>
  );
}
