import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X, Layers, Scissors, Search, AlertCircle, Ruler, Check,
  ArrowRight, Info, MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatPKR, formatPKRFull } from '@/lib/format';
import { carpetRollsApi, type CarpetRoll } from '@/features/industries/carpet/api/carpet-rolls.api';
import type { Product } from '@/api/products.api';
import type { ProductVariant } from '@/api/product-variants.api';

interface Props {
  product: Product;
  variant?: ProductVariant;
  onConfirm: (data: {
    roll: CarpetRoll;
    customerWidthFt: number;
    lengthFt: number;
    cutSqft: number;
    pricePerSqft: number;
    totalPrice: number;
    createLeftover: boolean;
  }) => void;
  onClose: () => void;
}

export function CarpetRollPicker({ product, variant, onConfirm, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [selectedRoll, setSelectedRoll] = useState<CarpetRoll | null>(null);
  const [customerWidth, setCustomerWidth] = useState('');
  const [lengthFt, setLengthFt] = useState('');
  const [createLeftover, setCreateLeftover] = useState(true);

  const { data: rollsData, isLoading } = useQuery({
    queryKey: ['carpet-rolls-pos', product.id, variant?.id],
    queryFn: () =>
      carpetRollsApi.list({
        productId: product.id,
        variantId: variant?.id,
        inStockOnly: true,
        limit: 50,
      }),
  });

  const rolls = rollsData?.items ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rolls;
    return rolls.filter(
      (r) =>
        r.rollNumber.toLowerCase().includes(q) ||
        (r.designCode || '').toLowerCase().includes(q) ||
        (r.rackNumber || '').toLowerCase().includes(q),
    );
  }, [rolls, search]);

  // When a roll is selected, default the customer width to roll's full width
  useEffect(() => {
    if (selectedRoll) {
      const fullWidth =
        Number(selectedRoll.widthFt) + Number(selectedRoll.widthInch || 0) / 12;
      setCustomerWidth(fullWidth.toFixed(2));
      setLengthFt('');
    }
  }, [selectedRoll]);

  const calc = useMemo(() => {
    if (!selectedRoll) return null;
    const fullWidth =
      Number(selectedRoll.widthFt) + Number(selectedRoll.widthInch || 0) / 12;
    const cWidth = Number(customerWidth) || 0;
    const len = Number(lengthFt) || 0;

    const cutSqft = cWidth * len;
    const widthDiff = fullWidth - cWidth;
    const leftoverSqft = widthDiff * len;
    const totalPrice = cutSqft * Number(selectedRoll.salePricePerSqft);

    const widthError =
      cWidth > fullWidth ? `Customer width ${fullWidth.toFixed(2)}ft se zyada nahi ho sakti` : null;
    const lengthError =
      len > Number(selectedRoll.remainingLengthFt)
        ? `Length ${Number(selectedRoll.remainingLengthFt).toFixed(2)}ft se zyada nahi`
        : null;

    return {
      fullWidth,
      cWidth,
      len,
      cutSqft,
      widthDiff,
      leftoverSqft,
      totalPrice,
      widthError,
      lengthError,
      isValid: !widthError && !lengthError && cWidth > 0 && len > 0,
    };
  }, [selectedRoll, customerWidth, lengthFt]);

  const handleConfirm = () => {
    if (!selectedRoll || !calc || !calc.isValid) return;
    onConfirm({
      roll: selectedRoll,
      customerWidthFt: calc.cWidth,
      lengthFt: calc.len,
      cutSqft: calc.cutSqft,
      pricePerSqft: Number(selectedRoll.salePricePerSqft),
      totalPrice: calc.totalPrice,
      createLeftover: calc.widthDiff > 0.1 ? createLeftover : false,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="w-full sm:max-w-5xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-br from-emerald-50 to-green-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center shadow-lg shrink-0">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold">
                Select Roll to Cut From
              </div>
              <h3 className="font-bold text-slate-900 truncate">
                {product.name}
                {variant && (
                  <span className="ml-2 text-violet-700 text-sm">— {variant.name}</span>
                )}
              </h3>
              <p className="text-xs text-slate-600">
                {rolls.length} active roll{rolls.length !== 1 ? 's' : ''} available
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

        <div className="flex-1 overflow-y-auto">
          {/* Body — two-column layout: rolls list + cut form */}
          <div className="grid lg:grid-cols-[1fr_380px] gap-0">
            {/* LEFT — Rolls list */}
            <div className="p-4 border-r border-slate-100">
              <div className="relative mb-3">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search roll number, design code, rack..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </div>

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
                    {search ? 'No matching rolls' : 'No active rolls'}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {variant
                      ? `${variant.name} ka koi active roll nahi`
                      : 'Pehle iss product ka roll add karein'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                  {filtered.map((roll) => {
                    const fullWidth =
                      Number(roll.widthFt) + Number(roll.widthInch || 0) / 12;
                    const percentRemaining =
                      roll.originalLengthFt > 0
                        ? (Number(roll.remainingLengthFt) / Number(roll.originalLengthFt)) * 100
                        : 0;
                    const isSelected = selectedRoll?.id === roll.id;

                    return (
                      <button
                        key={roll.id}
                        onClick={() => setSelectedRoll(roll)}
                        className={`w-full text-left rounded-xl border-2 p-3 transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 shadow-md'
                            : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-mono font-extrabold text-sm text-slate-900">
                                {roll.rollNumber}
                              </div>
                              {isSelected && (
                                <div className="h-5 w-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                                  <Check className="h-3 w-3" />
                                </div>
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
                            {roll.designCode && (
                              <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                                {roll.designCode}
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xl font-extrabold text-emerald-700 leading-none">
                              {Number(roll.remainingSqft).toFixed(0)}
                            </div>
                            <div className="text-[10px] font-bold text-emerald-700">sqft</div>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-slate-600">
                          <span>
                            {fullWidth.toFixed(2)}ft × {Number(roll.remainingLengthFt).toFixed(1)}ft
                          </span>
                          {roll.rackNumber && (
                            <span className="inline-flex items-center gap-0.5 text-slate-500">
                              <MapPin className="h-2.5 w-2.5" />
                              {roll.rackNumber}
                            </span>
                          )}
                          <span className="ml-auto text-emerald-700">
                            {formatPKR(roll.salePricePerSqft)}/sqft
                          </span>
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
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* RIGHT — Cut configuration */}
            <div className="p-4 bg-slate-50/30">
              {!selectedRoll ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <Scissors className="h-12 w-12 text-slate-300 mb-3" />
                  <div className="font-bold text-slate-700">Pehle roll select karein</div>
                  <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
                    Left list se ek roll choose karein, phir cut details daalein
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl bg-white border-2 border-emerald-200 p-3">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-700">
                      Selected Roll
                    </div>
                    <div className="font-mono font-extrabold text-slate-900 text-sm mt-0.5">
                      {selectedRoll.rollNumber}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      Width: <strong>{calc?.fullWidth.toFixed(2)}ft</strong> • Remaining:{' '}
                      <strong>{Number(selectedRoll.remainingLengthFt).toFixed(2)}ft</strong>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                      Customer Width (ft)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      autoFocus
                      value={customerWidth}
                      onChange={(e) => setCustomerWidth(e.target.value)}
                      className={`h-11 w-full rounded-xl border-2 px-3 text-lg font-bold focus:outline-none focus:ring-2 ${
                        calc?.widthError
                          ? 'border-rose-300 bg-rose-50 focus:border-rose-500 focus:ring-rose-200'
                          : 'border-slate-200 bg-white focus:border-emerald-500 focus:ring-emerald-200'
                      }`}
                    />
                    {calc?.widthError && (
                      <div className="text-[11px] text-rose-700 font-bold mt-1">
                        {calc.widthError}
                      </div>
                    )}
                    <div className="text-[10px] text-slate-500 mt-1">
                      Default = roll ki full width ({calc?.fullWidth.toFixed(2)}ft)
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                      Length to Cut (ft)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={lengthFt}
                      onChange={(e) => setLengthFt(e.target.value)}
                      placeholder="e.g. 10"
                      className={`h-11 w-full rounded-xl border-2 px-3 text-lg font-bold focus:outline-none focus:ring-2 ${
                        calc?.lengthError
                          ? 'border-rose-300 bg-rose-50 focus:border-rose-500 focus:ring-rose-200'
                          : 'border-slate-200 bg-white focus:border-emerald-500 focus:ring-emerald-200'
                      }`}
                    />
                    {calc?.lengthError && (
                      <div className="text-[11px] text-rose-700 font-bold mt-1">
                        {calc.lengthError}
                      </div>
                    )}
                  </div>

                  {/* Calculation preview */}
                  {calc && calc.cutSqft > 0 && !calc.widthError && !calc.lengthError && (
                    <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-300 p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-[9px] uppercase font-bold text-emerald-700">
                            Cut Area
                          </div>
                          <div className="text-2xl font-extrabold text-emerald-900">
                            {calc.cutSqft.toFixed(2)}
                          </div>
                          <div className="text-[10px] font-bold text-emerald-700">sqft</div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase font-bold text-emerald-700">
                            Sale Price
                          </div>
                          <div className="text-2xl font-extrabold text-emerald-900">
                            {formatPKRFull(calc.totalPrice)}
                          </div>
                          <div className="text-[10px] font-bold text-emerald-700">
                            @ {formatPKR(selectedRoll.salePricePerSqft)}/sqft
                          </div>
                        </div>
                      </div>

                      {calc.widthDiff > 0.1 && (
                        <div className="pt-2 border-t border-emerald-200">
                          <label className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={createLeftover}
                              onChange={(e) => setCreateLeftover(e.target.checked)}
                              className="h-4 w-4 rounded mt-0.5"
                            />
                            <div className="flex-1">
                              <div className="text-[11px] font-extrabold text-amber-900">
                                Auto-create leftover cut piece
                              </div>
                              <div className="text-[10px] text-amber-800 mt-0.5">
                                {calc.widthDiff.toFixed(2)}ft × {calc.len.toFixed(2)}ft ={' '}
                                <strong>{calc.leftoverSqft.toFixed(2)} sqft</strong> bachay ga
                              </div>
                            </div>
                          </label>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Helper hint */}
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-2.5 flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 text-blue-700 shrink-0 mt-0.5" />
                    <div className="text-[10px] text-blue-900">
                      <strong>Tip:</strong> Customer width chhoti hai to bachay tukre ka cut piece
                      automatically ban jayega
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <Button
            onClick={handleConfirm}
            disabled={!calc?.isValid}
            className="bg-gradient-to-r from-emerald-700 to-emerald-600"
          >
            <Scissors className="h-4 w-4" />
            {calc?.isValid
              ? `Add Cut (${calc.cutSqft.toFixed(2)} sqft • ${formatPKR(calc.totalPrice)})`
              : 'Enter cut details'}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
