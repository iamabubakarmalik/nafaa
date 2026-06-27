import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X, Layers, Search, AlertCircle, Check, MapPin, Ruler, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatPKR } from '@/lib/format';
import { carpetRollsApi, type CarpetRoll } from '@/features/industries/carpet/api/carpet-rolls.api';
import type { Product } from '@/api/products.api';

interface Props {
  product: Product;
  fromShopId: string;
  /** Already selected roll IDs (to exclude from picker) */
  excludeRollIds?: string[];
  onConfirm: (rolls: CarpetRoll[]) => void;
  onClose: () => void;
}

export function TransferRollPicker({
  product, fromShopId, excludeRollIds = [], onConfirm, onClose,
}: Props) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: rollsData, isLoading } = useQuery({
    queryKey: ['carpet-rolls-for-transfer', product.id, fromShopId],
    queryFn: () =>
      carpetRollsApi.list({
        productId: product.id,
        shopId: fromShopId,
        inStockOnly: true,
        limit: 100,
      }),
    enabled: !!product.id && !!fromShopId,
  });

  const allRolls = rollsData?.items ?? [];

  const availableRolls = useMemo(
    () => allRolls.filter((r) => !excludeRollIds.includes(r.id)),
    [allRolls, excludeRollIds],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return availableRolls;
    return availableRolls.filter(
      (r) =>
        r.rollNumber.toLowerCase().includes(q) ||
        (r.designCode || '').toLowerCase().includes(q) ||
        (r.rackNumber || '').toLowerCase().includes(q) ||
        (r.variant?.name || '').toLowerCase().includes(q),
    );
  }, [availableRolls, search]);

  const toggleRoll = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((r) => r.id)));
    }
  };

  const handleConfirm = () => {
    const selected = availableRolls.filter((r) => selectedIds.has(r.id));
    if (selected.length === 0) return;
    onConfirm(selected);
  };

  const selectedRolls = availableRolls.filter((r) => selectedIds.has(r.id));
  const totalSqft = selectedRolls.reduce((s, r) => s + Number(r.remainingSqft), 0);

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-4xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-br from-cyan-50 to-blue-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center shadow-lg shrink-0">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-cyan-700 font-bold">
                Select Rolls to Transfer
              </div>
              <h3 className="font-bold text-slate-900 truncate">{product.name}</h3>
              <p className="text-xs text-slate-600">
                {availableRolls.length} active roll{availableRolls.length !== 1 ? 's' : ''} available
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0"
          >
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>

        {/* Search + select all */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by roll number, design, rack, color..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
            />
          </div>
          {filtered.length > 0 && (
            <button
              onClick={toggleAll}
              className="h-10 px-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700"
            >
              {selectedIds.size === filtered.length ? 'Deselect all' : 'Select all'}
            </button>
          )}
        </div>

        {/* Rolls grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
              <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <div className="font-bold text-slate-700 text-sm">
                {search ? 'No matching rolls' : excludeRollIds.length > 0 ? 'No more rolls available' : 'No active rolls in source shop'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {!search && availableRolls.length === 0 && 'Source shop mein iss product ke active rolls nahi hain'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((roll) => {
                const fullWidth =
                  Number(roll.widthFt) + Number(roll.widthInch || 0) / 12;
                const isSelected = selectedIds.has(roll.id);

                return (
                  <button
                    key={roll.id}
                    onClick={() => toggleRoll(roll.id)}
                    className={`w-full text-left rounded-xl border-2 p-3 transition-all ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-50 shadow-md'
                        : 'border-slate-200 bg-white hover:border-cyan-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <div
                        className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition ${
                          isSelected
                            ? 'bg-cyan-600 border-cyan-600'
                            : 'bg-white border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-mono font-extrabold text-sm text-slate-900">
                            {roll.rollNumber}
                          </div>
                          {roll.designCode && (
                            <span className="text-[10px] font-mono text-slate-500">
                              {roll.designCode}
                            </span>
                          )}
                        </div>
                        {roll.variant && (
                          <div className="text-[11px] font-bold text-violet-700 mt-0.5 flex items-center gap-1">
                            {roll.variant.colorHex && (
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: roll.variant.colorHex }}
                              />
                            )}
                            {roll.variant.name}
                          </div>
                        )}
                        <div className="mt-1.5 flex items-center gap-2 text-[10px] font-bold text-slate-600 flex-wrap">
                          <span className="inline-flex items-center gap-0.5">
                            <Ruler className="h-2.5 w-2.5" />
                            {Number(roll.widthFt)}ft{Number(roll.widthInch || 0) > 0 ? ` ${roll.widthInch}in` : ''} × {Number(roll.remainingLengthFt)}ft{Number(roll.remainingLengthInch || 0) > 0 ? ` ${roll.remainingLengthInch}in` : ''}
                          </span>
                          {roll.rackNumber && (
                            <span className="inline-flex items-center gap-0.5 text-slate-500">
                              <MapPin className="h-2.5 w-2.5" />
                              {roll.rackNumber}
                            </span>
                          )}
                          <span className="ml-auto text-cyan-700">
                            {formatPKR(roll.salePricePerSqft)}/sqft
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xl font-extrabold text-cyan-700 leading-none">
                          {Number(roll.remainingSqft).toFixed(0)}
                        </div>
                        <div className="text-[10px] font-bold text-cyan-700">sqft</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white">
          {selectedIds.size > 0 && (
            <div className="mb-3 rounded-xl bg-cyan-50 border-2 border-cyan-200 p-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-cyan-700">Selected</div>
                <div className="text-sm font-extrabold text-cyan-900">
                  {selectedIds.size} roll{selectedIds.size !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-cyan-700">Total</div>
                <div className="text-lg font-extrabold text-cyan-900">
                  {totalSqft.toFixed(2)} <span className="text-xs">sqft</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <Button
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              className="bg-gradient-to-r from-cyan-700 to-blue-700"
            >
              <Layers className="h-4 w-4" />
              Add {selectedIds.size > 0 ? `${selectedIds.size} roll${selectedIds.size !== 1 ? 's' : ''}` : 'Rolls'}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
