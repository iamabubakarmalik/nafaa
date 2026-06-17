import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Layers, Plus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { carpetRollsApi } from '@/features/industries/carpet/api/carpet-rolls.api';
import { AddRollModal } from '@/features/industries/carpet/components/AddRollModal';
import type { IndustrySectionProps } from '@/features/industries/_shared/types/section.types';

export function CarpetInventorySection({
  productId,
  isEdit,
  variants,
}: IndustrySectionProps) {
  const queryClient = useQueryClient();
  const [showAddRoll, setShowAddRoll] = useState(false);
  const [rollVariantContext, setRollVariantContext] = useState<{ id?: string }>({});

  const { data: carpetRollsData, refetch: refetchCarpetRolls } = useQuery({
    queryKey: ['carpet-rolls-for-product', productId],
    queryFn: () => carpetRollsApi.list({ productId, limit: 100 }),
    enabled: isEdit && !!productId,
  });

  const carpetRolls = carpetRollsData?.items ?? [];

  const carpetStats = (() => {
    const activeRolls = carpetRolls.filter((r) => r.status === 'ACTIVE' && r.remainingLengthFt > 0);
    const totalSqft = activeRolls.reduce((acc, r) => acc + Number(r.remainingSqft), 0);
    const totalLength = activeRolls.reduce((acc, r) => acc + Number(r.remainingLengthFt), 0);
    return {
      activeCount: activeRolls.length,
      totalCount: carpetRolls.length,
      totalSqft,
      totalLength,
      finishedCount: carpetRolls.filter((r) => r.status === 'FINISHED').length,
      damagedCount: carpetRolls.filter((r) => r.status === 'DAMAGED').length,
    };
  })();

  return (
    <>
      {showAddRoll && productId && (
        <AddRollModal
          preselectedProductId={productId}
          preselectedVariantId={rollVariantContext.id}
          onSuccess={() => {
            refetchCarpetRolls();
            queryClient.invalidateQueries({ queryKey: ['carpet-product-summary'] });
          }}
          onClose={() => {
            setShowAddRoll(false);
            setRollVariantContext({});
          }}
        />
      )}

      <div className="space-y-5 max-w-4xl">
        {/* Hero banner */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-50 border-2 border-emerald-200 p-5">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-2xl bg-emerald-600 flex items-center justify-center shrink-0">
              <Layers className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-emerald-900 text-lg">
                Carpet Stock — Roll Based
              </h3>
              <p className="text-sm text-emerald-800 mt-1">
                Carpet ka stock <strong>"Current Stock" field</strong> se nahi balkay{' '}
                <strong>Rolls</strong> se manage hota hai. Har physical roll ki alag entry hoti hai
                jisme width, length, cost aur location track hoti hai.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div className="rounded-xl bg-white border border-emerald-200 p-3">
              <div className="text-[10px] uppercase font-bold text-emerald-700">Available</div>
              <div className="text-2xl font-extrabold text-emerald-900 mt-0.5">
                {carpetStats.totalSqft.toFixed(0)}
              </div>
              <div className="text-[10px] font-bold text-emerald-700">sqft total</div>
            </div>
            <div className="rounded-xl bg-white border border-emerald-200 p-3">
              <div className="text-[10px] uppercase font-bold text-emerald-700">Active Rolls</div>
              <div className="text-2xl font-extrabold text-emerald-900 mt-0.5">
                {carpetStats.activeCount}
              </div>
              <div className="text-[10px] font-bold text-emerald-700">in stock</div>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 p-3">
              <div className="text-[10px] uppercase font-bold text-slate-700">Finished</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-0.5">
                {carpetStats.finishedCount}
              </div>
              <div className="text-[10px] font-bold text-slate-500">rolls</div>
            </div>
            <div className="rounded-xl bg-white border border-rose-200 p-3">
              <div className="text-[10px] uppercase font-bold text-rose-700">Damaged</div>
              <div className="text-2xl font-extrabold text-rose-900 mt-0.5">
                {carpetStats.damagedCount}
              </div>
              <div className="text-[10px] font-bold text-rose-700">rolls</div>
            </div>
          </div>

          {isEdit && (
            <div className="flex gap-2 flex-wrap mt-4">
              <Button
                onClick={() => {
                  setRollVariantContext({});
                  setShowAddRoll(true);
                }}
                className="bg-gradient-to-r from-emerald-700 to-emerald-600"
              >
                <Plus className="h-4 w-4" /> Add New Roll
              </Button>
              <Link to={`/carpet-rolls?productId=${productId}`}>
                <Button variant="secondary">
                  <Layers className="h-4 w-4" /> View All Rolls
                </Button>
              </Link>
              {variants.length > 0 && (
                <select
                  onChange={(e) => {
                    if (!e.target.value) return;
                    setRollVariantContext({ id: e.target.value });
                    setShowAddRoll(true);
                    e.target.value = '';
                  }}
                  className="h-10 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3 text-sm font-bold text-emerald-700"
                  defaultValue=""
                >
                  <option value="">+ Add Roll for Variant…</option>
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                      {v.color ? ` — ${v.color}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Rolls preview */}
        {isEdit && carpetRolls.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900">
                Current Rolls <span className="text-slate-500 text-sm">({carpetRolls.length})</span>
              </h3>
              <Link
                to={`/carpet-rolls?productId=${productId}`}
                className="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {carpetRolls.slice(0, 6).map((roll) => {
                const fullWidth = Number(roll.widthFt) + Number(roll.widthInch || 0) / 12;
                const percentRemaining =
                  roll.originalLengthFt > 0
                    ? (Number(roll.remainingLengthFt) / Number(roll.originalLengthFt)) * 100
                    : 0;
                return (
                  <Link
                    key={roll.id}
                    to={`/carpet-rolls/${roll.id}`}
                    className="rounded-xl border-2 border-slate-200 hover:border-emerald-400 hover:shadow-md transition p-3 block"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-mono font-extrabold text-sm text-slate-900">
                        {roll.rollNumber}
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold ${
                          roll.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700'
                            : roll.status === 'FINISHED'
                              ? 'bg-slate-100 text-slate-700'
                              : roll.status === 'DAMAGED'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {roll.status}
                      </span>
                    </div>
                    {roll.variant && (
                      <div className="text-[11px] text-violet-700 font-bold mt-0.5 flex items-center gap-1">
                        {roll.variant.colorHex && (
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: roll.variant.colorHex }}
                          />
                        )}
                        {roll.variant.name}
                      </div>
                    )}
                    <div className="mt-2 flex items-baseline gap-1">
                      <div className="text-lg font-extrabold text-emerald-700">
                        {Number(roll.remainingSqft).toFixed(0)}
                      </div>
                      <div className="text-[10px] font-bold text-emerald-700">sqft</div>
                      <div className="text-[10px] text-slate-500 font-bold ml-auto">
                        {fullWidth.toFixed(1)}ft × {Number(roll.remainingLengthFt).toFixed(1)}ft
                      </div>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full ${
                          percentRemaining > 50
                            ? 'bg-emerald-500'
                            : percentRemaining > 20
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.max(percentRemaining, 3)}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
            {carpetRolls.length > 6 && (
              <div className="text-center mt-3">
                <Link
                  to={`/carpet-rolls?productId=${productId}`}
                  className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700 hover:underline"
                >
                  +{carpetRolls.length - 6} more rolls <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {isEdit && carpetRolls.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/30 p-8 text-center">
            <Layers className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
            <div className="font-bold text-slate-900">Koi roll add nahi hai abhi</div>
            <p className="text-sm text-slate-600 mt-1">
              Stock add karne ke liye pehla roll add karein
            </p>
            <Button
              className="mt-4 bg-gradient-to-r from-emerald-700 to-emerald-600"
              onClick={() => {
                setRollVariantContext({});
                setShowAddRoll(true);
              }}
            >
              <Plus className="h-4 w-4" /> Add First Roll
            </Button>
          </div>
        )}

        {!isEdit && (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
            Save product first, phir rolls add kar sakte hain
          </div>
        )}
      </div>
    </>
  );
}
