import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Plus, ChefHat, Info } from 'lucide-react';
import { menuItemsApi } from '@/features/industries/restaurant/api/menu-items.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';

interface Props {
  productId: string;
  onConfirm: (selections: Array<{
    modifierOptionId: string;
    optionName: string;
    quantity: number;
    priceAdjustment: number;
  }>) => void;
  onClose: () => void;
}

export function RestaurantModifierPicker({ productId, onConfirm, onClose }: Props) {
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  // Fetch menu item with modifiers
  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ['menu-item-for-product', productId],
    queryFn: () => menuItemsApi.list({}),
  });

  const menuItem = menuItems.find((m: any) => m.productId === productId);
  const groups = menuItem?.modifiers?.map((mm: any) => mm.modifierGroup).filter(Boolean) ?? [];

  const toggle = (groupId: string, optionId: string, maxSel: number) => {
    setSelections((prev) => {
      const current = prev[groupId] || [];
      const already = current.includes(optionId);
      if (already) return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      if (maxSel === 1) return { ...prev, [groupId]: [optionId] };
      if (current.length >= maxSel) return prev;
      return { ...prev, [groupId]: [...current, optionId] };
    });
  };

  const canConfirm = groups.every((g: any) => {
    const sel = selections[g.id] || [];
    if (g.isRequired && sel.length < g.minSelections) return false;
    return true;
  });

  const totalAdjustment = groups.reduce((sum: number, g: any) => {
    const sel = selections[g.id] || [];
    for (const optId of sel) {
      const opt = g.options?.find((o: any) => o.id === optId);
      if (opt) sum += opt.priceAdjustment || 0;
    }
    return sum;
  }, 0);

  const handleConfirm = () => {
    const selected: any[] = [];
    for (const g of groups) {
      const sel = selections[g.id] || [];
      for (const optId of sel) {
        const opt = g.options?.find((o: any) => o.id === optId);
        if (opt) selected.push({
          modifierOptionId: opt.id,
          optionName: opt.name,
          quantity: 1,
          priceAdjustment: opt.priceAdjustment || 0,
        });
      }
    }
    onConfirm(selected);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-neutral-800 bg-gradient-to-br from-slate-950 via-orange-900 to-red-700 text-white flex items-center justify-between shrink-0">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase font-extrabold text-white/70">Customize</div>
            <h3 className="font-extrabold text-lg truncate">{menuItem?.product?.name || 'Item'}</h3>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-slate-500 font-semibold">Loading...</div>
          ) : !menuItem ? (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-800 p-4 text-center">
              <Info className="h-8 w-8 text-amber-600 mx-auto mb-2" />
              <div className="font-extrabold text-amber-900 dark:text-amber-300 text-sm">
                No menu configuration for this product
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold mt-1">
                Add to cart directly, or configure it in Menu Items
              </p>
              <Button className="mt-3 bg-gradient-to-r from-amber-600 to-orange-700" onClick={() => onConfirm([])}>
                <Plus className="h-4 w-4" />
                Add without customization
              </Button>
            </div>
          ) : groups.length === 0 ? (
            <div className="rounded-xl bg-slate-50 dark:bg-neutral-800 p-4 text-center">
              <ChefHat className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <div className="font-extrabold text-slate-700 dark:text-slate-300 text-sm">
                No modifiers available
              </div>
              <p className="text-xs text-slate-500 font-semibold mt-1">Just add to cart</p>
              <Button className="mt-3 bg-gradient-to-r from-orange-600 to-red-700" onClick={() => onConfirm([])}>
                <Plus className="h-4 w-4" />
                Add to Cart
              </Button>
            </div>
          ) : (
            groups.map((g: any) => {
              const sel = selections[g.id] || [];
              return (
                <div key={g.id} className="rounded-xl border-2 border-slate-200 dark:border-neutral-700 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-extrabold text-slate-900 dark:text-white text-sm">{g.name}</div>
                      <div className="text-[10px] text-slate-500 font-bold">
                        {g.isRequired ? 'Required' : 'Optional'} • Choose {g.minSelections}–{g.maxSelections}
                      </div>
                    </div>
                    <span className={
                      'px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ' +
                      (g.isRequired
                        ? (sel.length >= g.minSelections ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')
                        : 'bg-slate-100 text-slate-600')
                    }>
                      {sel.length}/{g.maxSelections}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {g.options?.filter((o: any) => o.isActive).map((opt: any) => {
                      const active = sel.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          onClick={() => toggle(g.id, opt.id, g.maxSelections)}
                          className={
                            'p-2 rounded-lg border-2 text-left text-xs font-extrabold transition ' +
                            (active
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-700 shadow'
                              : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-700 hover:border-orange-300')
                          }
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="flex items-center gap-1 min-w-0">
                              {opt.emoji && <span>{opt.emoji}</span>}
                              <span className="truncate">{opt.name}</span>
                            </span>
                            {(opt.priceAdjustment ?? 0) !== 0 && (
                              <span className={(opt.priceAdjustment ?? 0) > 0 ? 'text-emerald-700 shrink-0' : 'text-rose-700 shrink-0'}>
                                {(opt.priceAdjustment ?? 0) > 0 ? '+' : ''}{formatPKR(opt.priceAdjustment ?? 0)}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with total */}
        {menuItem && groups.length > 0 && (
          <div className="border-t-2 border-slate-200 dark:border-neutral-800 p-4 space-y-2">
            {totalAdjustment !== 0 && (
              <div className="flex justify-between items-center text-sm font-extrabold">
                <span className="text-slate-600 dark:text-slate-400">Modifier total:</span>
                <span className={totalAdjustment > 0 ? 'text-emerald-700 tabular-nums' : 'text-rose-700 tabular-nums'}>
                  {totalAdjustment > 0 ? '+' : ''}{formatPKR(totalAdjustment)}
                </span>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button
                className="flex-1 bg-gradient-to-r from-orange-600 to-red-700"
                onClick={handleConfirm}
                disabled={!canConfirm}
              >
                <Plus className="h-4 w-4" />
                Add to Cart
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
