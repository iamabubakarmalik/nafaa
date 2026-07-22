import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Layers, Check, ChevronDown } from 'lucide-react';
import { productUnitsApi, type ProductUnit } from '@industries/retail/api/product-units.api';
import { formatPKR } from '@core/lib/format';

interface Props {
  productId: string;
  variantId?: string;
  currentUnitId?: string;
  onSelect: (unit: ProductUnit) => void;
  compact?: boolean;
}

export function UnitSelectorInline({ productId, variantId, currentUnitId, onSelect, compact = false }: Props) {
  const [open, setOpen] = useState(false);

  const { data: units = [] } = useQuery({
    queryKey: ['product-units-pos', productId, variantId],
    queryFn: () => productUnitsApi.byProduct(productId, variantId),
    staleTime: 60_000,
  });

  const activeUnits = units.filter((u) => u.isActive);
  if (activeUnits.length <= 1) return null;

  const current = currentUnitId
    ? activeUnits.find((u) => u.id === currentUnitId)
    : activeUnits.find((u) => u.isDefault) || activeUnits.find((u) => u.isBase) || activeUnits[0];

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className={
          'inline-flex items-center gap-1 rounded-lg border-2 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-extrabold transition hover:bg-emerald-100 dark:hover:bg-emerald-950/60 ' +
          (compact ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1')
        }
      >
        <Layers className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
        <span className="capitalize">{current?.unitName || 'Unit'}</span>
        {activeUnits.length > 1 && (
          <ChevronDown className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[240px] rounded-xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-700 shadow-2xl overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/50">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 dark:text-slate-400">
                Select Unit
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {activeUnits.map((unit) => {
                const isSelected = unit.id === current?.id;
                return (
                  <button
                    key={unit.id}
                    onClick={() => {
                      onSelect(unit);
                      setOpen(false);
                    }}
                    className={
                      'w-full px-3 py-2 flex items-center justify-between gap-3 transition text-left ' +
                      (isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-l-4 border-emerald-500'
                        : 'hover:bg-slate-50 dark:hover:bg-neutral-800')
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-sm capitalize text-slate-900 dark:text-white">
                          {unit.unitName}
                        </span>
                        {unit.isBase && (
                          <span className="px-1 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-700 text-[8px] font-extrabold uppercase">
                            Base
                          </span>
                        )}
                        {unit.isDefault && !unit.isBase && (
                          <span className="px-1 rounded bg-amber-100 dark:bg-amber-900 text-amber-700 text-[8px] font-extrabold uppercase">
                            Default
                          </span>
                        )}
                      </div>
                      {unit.unitLabel && (
                        <div className="text-[10px] text-slate-500 font-semibold">{unit.unitLabel}</div>
                      )}
                      <div className="text-[10px] text-slate-500 font-bold mt-0.5">
                        1 {unit.unitName} = {unit.conversionRate} base
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        {formatPKR(unit.price)}
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 text-emerald-600 ml-auto mt-0.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
