import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X, Layers, Scissors, Search, AlertCircle, Check,
  ArrowRight, Info, MapPin, DollarSign, Percent, RotateCcw, Tag,
  Sparkles, Award, ChevronLeft, Package, TrendingDown,
  Filter, SortAsc,
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
    isCustomRate: boolean;
    originalRate: number;
  }) => void;
  onClose: () => void;
}

type SortBy = 'newest' | 'largest' | 'smallest' | 'cheapest';

export function CarpetRollPicker({ product, variant, onConfirm, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('largest');
  const [selectedRoll, setSelectedRoll] = useState<CarpetRoll | null>(null);
  const [customerWidth, setCustomerWidth] = useState('');
  const [lengthFt, setLengthFt] = useState('');
  const [createLeftover, setCreateLeftover] = useState(true);
  const [customRate, setCustomRate] = useState('');
  const [useWholesale, setUseWholesale] = useState(false);
  const [showMobileConfig, setShowMobileConfig] = useState(false);

  const widthInputRef = useRef<HTMLInputElement>(null);

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
    let result = q
      ? rolls.filter(
          (r) =>
            r.rollNumber.toLowerCase().includes(q) ||
            (r.designCode || '').toLowerCase().includes(q) ||
            (r.rackNumber || '').toLowerCase().includes(q),
        )
      : [...rolls];

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'largest':
          return Number(b.remainingSqft) - Number(a.remainingSqft);
        case 'smallest':
          return Number(a.remainingSqft) - Number(b.remainingSqft);
        case 'cheapest':
          return Number(a.salePricePerSqft) - Number(b.salePricePerSqft);
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return result;
  }, [rolls, search, sortBy]);

  // Auto-select first roll
  useEffect(() => {
    if (!selectedRoll && filtered.length > 0) {
      setSelectedRoll(filtered[0]);
    }
  }, [filtered, selectedRoll]);

  // Reset on roll change
  useEffect(() => {
    if (selectedRoll) {
      const fullWidth =
        Number(selectedRoll.widthFt) + Number(selectedRoll.widthInch || 0) / 12;
      setCustomerWidth(fullWidth.toFixed(2));
      setLengthFt('');
      setCustomRate('');
      setUseWholesale(false);
      setTimeout(() => {
        widthInputRef.current?.focus();
        widthInputRef.current?.select();
      }, 100);
    }
  }, [selectedRoll]);

  // Calculations
  const calc = useMemo(() => {
    if (!selectedRoll) return null;
    const fullWidth =
      Number(selectedRoll.widthFt) + Number(selectedRoll.widthInch || 0) / 12;
    const cWidth = Number(customerWidth) || 0;
    const len = Number(lengthFt) || 0;

    const cutSqft = cWidth * len;
    const widthDiff = fullWidth - cWidth;
    const leftoverSqft = widthDiff * len;
    const remainingAfterCut = Number(selectedRoll.remainingLengthFt) - len;

    const defaultRate = Number(selectedRoll.salePricePerSqft);
    const wholesaleRate = selectedRoll.wholesalePricePerSqft
      ? Number(selectedRoll.wholesalePricePerSqft)
      : null;

    let effectiveRate = defaultRate;
    let rateSource: 'default' | 'wholesale' | 'custom' = 'default';

    if (customRate && Number(customRate) > 0) {
      effectiveRate = Number(customRate);
      rateSource = 'custom';
    } else if (useWholesale && wholesaleRate) {
      effectiveRate = wholesaleRate;
      rateSource = 'wholesale';
    }

    const totalPrice = cutSqft * effectiveRate;
    const defaultTotalPrice = cutSqft * defaultRate;
    const discount = defaultTotalPrice - totalPrice;
    const discountPercent = defaultTotalPrice > 0 ? (discount / defaultTotalPrice) * 100 : 0;

    const widthError =
      cWidth > fullWidth
        ? `Width ${fullWidth.toFixed(2)}ft se zyada nahi ho sakti`
        : cWidth < 0.1
        ? `Width too small`
        : null;
    const lengthError =
      len > Number(selectedRoll.remainingLengthFt)
        ? `Length ${Number(selectedRoll.remainingLengthFt).toFixed(2)}ft se zyada nahi`
        : null;
    const rateError =
      customRate && Number(customRate) < 0 ? 'Rate negative nahi ho sakti' : null;

    return {
      fullWidth,
      cWidth,
      len,
      cutSqft,
      widthDiff,
      leftoverSqft,
      remainingAfterCut,
      defaultRate,
      wholesaleRate,
      effectiveRate,
      rateSource,
      totalPrice,
      defaultTotalPrice,
      discount,
      discountPercent,
      widthError,
      lengthError,
      rateError,
      isValid:
        !widthError && !lengthError && !rateError && cWidth > 0 && len > 0 && effectiveRate > 0,
    };
  }, [selectedRoll, customerWidth, lengthFt, customRate, useWholesale]);

  const applyDiscount = (percent: number) => {
    if (!selectedRoll) return;
    const defaultRate = Number(selectedRoll.salePricePerSqft);
    const discountedRate = defaultRate * (1 - percent / 100);
    setCustomRate(discountedRate.toFixed(2));
    setUseWholesale(false);
  };

  const resetRate = () => {
    setCustomRate('');
    setUseWholesale(false);
  };

  const handleConfirm = () => {
    if (!selectedRoll || !calc || !calc.isValid) return;
    onConfirm({
      roll: selectedRoll,
      customerWidthFt: calc.cWidth,
      lengthFt: calc.len,
      cutSqft: calc.cutSqft,
      pricePerSqft: calc.effectiveRate,
      totalPrice: calc.totalPrice,
      createLeftover: calc.widthDiff > 0.1 ? createLeftover : false,
      isCustomRate: calc.rateSource !== 'default',
      originalRate: calc.defaultRate,
    });
  };

  // Total stats
  const totalSqft = useMemo(
    () => rolls.reduce((sum, r) => sum + Number(r.remainingSqft), 0),
    [rolls],
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="w-full sm:max-w-6xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        {/* ═══ HEADER ═══ */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white shrink-0">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl" />
          <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-amber-400/15 blur-2xl" />

          <div className="relative px-5 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {showMobileConfig && (
                <button
                  onClick={() => setShowMobileConfig(false)}
                  className="lg:hidden h-9 w-9 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0"
                >
                  <ChevronLeft className="h-4 w-4 text-white" />
                </button>
              )}
              <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-lg ring-2 ring-white/20 shrink-0">
                <Layers className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider mb-1 border border-white/20">
                  <Scissors className="h-2.5 w-2.5 text-amber-300" />
                  Cut from Roll
                </div>
                <h3 className="font-extrabold text-lg leading-tight truncate">
                  {product.name}
                  {variant && (
                    <span className="ml-2 text-amber-300 text-sm font-bold">— {variant.name}</span>
                  )}
                </h3>
                <p className="text-[11px] text-white/80 font-semibold mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-0.5">
                    <Package className="h-2.5 w-2.5" />
                    {rolls.length} roll{rolls.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-white/40">•</span>
                  <span className="text-emerald-300 font-extrabold">
                    {totalSqft.toFixed(0)} sqft available
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur border border-white/20 flex items-center justify-center transition shrink-0"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden min-h-0">
          <div className="grid lg:grid-cols-[1fr_460px] h-full">
            {/* ═══ LEFT — ROLLS LIST ═══ */}
            <div className={`flex flex-col min-h-0 border-r border-slate-200 ${showMobileConfig ? 'hidden lg:flex' : 'flex'}`}>
              {/* Search & sort */}
              <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white space-y-2 shrink-0">
                <div className="relative">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search roll # or design code..."
                    className="h-10 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-10 text-sm font-semibold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md hover:bg-slate-100 flex items-center justify-center">
                      <X className="h-3.5 w-3.5 text-slate-500" />
                    </button>
                  )}
                </div>

                {/* Sort tabs */}
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {[
                    { v: 'largest' as SortBy, l: 'Largest first', icon: SortAsc },
                    { v: 'newest' as SortBy, l: 'Newest', icon: Sparkles },
                    { v: 'cheapest' as SortBy, l: 'Cheapest', icon: TrendingDown },
                    { v: 'smallest' as SortBy, l: 'Smallest', icon: Filter },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    const active = sortBy === opt.v;
                    return (
                      <button
                        key={opt.v}
                        onClick={() => setSortBy(opt.v)}
                        className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold inline-flex items-center gap-1 transition ${
                          active
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <Icon className="h-2.5 w-2.5" />
                        {opt.l}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rolls list */}
              <div className="flex-1 overflow-y-auto p-3 bg-gradient-to-b from-slate-50/30 to-white">
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center">
                      <AlertCircle className="h-8 w-8 text-slate-400" />
                    </div>
                    <div className="mt-3 font-extrabold text-slate-700">
                      {search ? 'No matching rolls' : 'No active rolls'}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-semibold">
                      {variant ? `${variant.name} ka koi active roll nahi` : 'Pehle iss product ka roll add karein'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filtered.map((roll) => {
                      const fullWidth = Number(roll.widthFt) + Number(roll.widthInch || 0) / 12;
                      const percentRemaining =
                        roll.originalLengthFt > 0
                          ? (Number(roll.remainingLengthFt) / Number(roll.originalLengthFt)) * 100
                          : 0;
                      const isSelected = selectedRoll?.id === roll.id;
                      const isLowRoll = percentRemaining < 20;

                      return (
                        <button
                          key={roll.id}
                          onClick={() => {
                            setSelectedRoll(roll);
                            setShowMobileConfig(true);
                          }}
                          className={`group w-full text-left rounded-2xl border-2 p-3 transition-all ${
                            isSelected
                              ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-green-50 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-200'
                              : 'border-slate-200 bg-white hover:border-emerald-400 hover:shadow-md hover:-translate-y-0.5'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="font-mono font-extrabold text-sm text-slate-900">
                                  {roll.rollNumber}
                                </div>
                                {isSelected && (
                                  <div className="h-5 w-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                                    <Check className="h-3 w-3" />
                                  </div>
                                )}
                                {isLowRoll && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[9px] font-extrabold uppercase tracking-wider animate-pulse">
                                    Low
                                  </span>
                                )}
                              </div>
                              {roll.variant && (
                                <div className="text-[11px] font-bold text-violet-700 mt-1 inline-flex items-center gap-1">
                                  {roll.variant.colorHex && (
                                    <span
                                      className="h-2.5 w-2.5 rounded-full border border-white shadow-sm"
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
                              <div className="text-2xl font-extrabold text-emerald-700 leading-none tabular-nums">
                                {Number(roll.remainingSqft).toFixed(0)}
                              </div>
                              <div className="text-[10px] font-extrabold text-emerald-700">sqft</div>
                            </div>
                          </div>

                          <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-slate-600 flex-wrap">
                            <span className="inline-flex items-center gap-0.5">
                              <span className="text-slate-500">📏</span>
                              {fullWidth.toFixed(2)}ft × {Number(roll.remainingLengthFt).toFixed(1)}ft
                            </span>
                            {roll.rackNumber && (
                              <span className="inline-flex items-center gap-0.5 text-slate-500">
                                <MapPin className="h-2.5 w-2.5" />
                                {roll.rackNumber}
                              </span>
                            )}
                            <span className="ml-auto text-emerald-700 font-extrabold tabular-nums">
                              {formatPKR(roll.salePricePerSqft)}/sqft
                            </span>
                          </div>

                          <div className="mt-2 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                percentRemaining > 50
                                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                                  : percentRemaining > 20
                                  ? 'bg-gradient-to-r from-amber-400 to-amber-600'
                                  : 'bg-gradient-to-r from-rose-400 to-rose-600'
                              }`}
                              style={{ width: `${Math.max(percentRemaining, 3)}%` }}
                            />
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[9px] font-bold">
                            <span className="text-slate-500">
                              {Number(roll.remainingLengthFt).toFixed(1)}/{Number(roll.originalLengthFt).toFixed(1)} ft
                            </span>
                            <span className={percentRemaining > 50 ? 'text-emerald-700' : percentRemaining > 20 ? 'text-amber-700' : 'text-rose-700'}>
                              {percentRemaining.toFixed(0)}% left
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ═══ RIGHT — CUT CONFIG ═══ */}
            <div className={`flex flex-col min-h-0 bg-gradient-to-br from-slate-50/30 to-white ${!showMobileConfig ? 'hidden lg:flex' : 'flex'}`}>
              {!selectedRoll ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12">
                  <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-green-200 flex items-center justify-center shadow-inner">
                    <Scissors className="h-10 w-10 text-emerald-600" />
                  </div>
                  <div className="mt-4 font-extrabold text-slate-900">Select a roll</div>
                  <p className="text-xs text-slate-500 mt-1 max-w-[220px] font-semibold">
                    Left side se ek roll choose karein, phir cut details daalein
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {/* Selected roll card */}
                  <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-3 shadow-lg shadow-emerald-500/30">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="text-[10px] uppercase tracking-wider font-extrabold opacity-90">
                        Selected Roll
                      </div>
                      <Award className="h-3.5 w-3.5 text-amber-300" />
                    </div>
                    <div className="font-mono font-extrabold text-lg leading-none">
                      {selectedRoll.rollNumber}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-[9px] uppercase font-extrabold opacity-75">Width</div>
                        <div className="font-extrabold tabular-nums">{calc?.fullWidth.toFixed(2)} ft</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase font-extrabold opacity-75">Available</div>
                        <div className="font-extrabold tabular-nums">{Number(selectedRoll.remainingLengthFt).toFixed(2)} ft</div>
                      </div>
                    </div>
                  </div>

                  {/* Dimensions */}
                  <div className="rounded-2xl bg-white border-2 border-emerald-200 p-3 space-y-3">
                    <div className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700 flex items-center gap-1">
                      <Scissors className="h-3 w-3" />
                      Cut Dimensions
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-700 mb-1 uppercase tracking-wider">
                          Width (ft)
                        </label>
                        <input
                          ref={widthInputRef}
                          type="number"
                          step="0.01"
                          value={customerWidth}
                          onChange={(e) => setCustomerWidth(e.target.value)}
                          className={`h-12 w-full rounded-xl border-2 px-3 text-xl font-extrabold focus:outline-none focus:ring-2 transition ${
                            calc?.widthError
                              ? 'border-rose-300 bg-rose-50 focus:border-rose-500 focus:ring-rose-200'
                              : 'border-emerald-200 bg-white focus:border-emerald-500 focus:ring-emerald-200'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-700 mb-1 uppercase tracking-wider">
                          Length (ft)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={lengthFt}
                          onChange={(e) => setLengthFt(e.target.value)}
                          placeholder="e.g. 10"
                          className={`h-12 w-full rounded-xl border-2 px-3 text-xl font-extrabold focus:outline-none focus:ring-2 transition ${
                            calc?.lengthError
                              ? 'border-rose-300 bg-rose-50 focus:border-rose-500 focus:ring-rose-200'
                              : 'border-emerald-200 bg-white focus:border-emerald-500 focus:ring-emerald-200'
                          }`}
                        />
                      </div>
                    </div>
                    {(calc?.widthError || calc?.lengthError) && (
                      <div className="rounded-lg bg-rose-50 border border-rose-200 p-2 flex items-start gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-rose-900 font-bold">
                          {calc?.widthError || calc?.lengthError}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Custom rate */}
                  <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5 text-amber-700" />
                        <span className="text-[10px] uppercase font-extrabold tracking-wider text-amber-900">
                          Customer Rate / sqft
                        </span>
                      </div>
                      {calc?.rateSource !== 'default' && (
                        <button
                          onClick={resetRate}
                          className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-amber-700 hover:text-amber-900 hover:underline"
                        >
                          <RotateCcw className="h-2.5 w-2.5" />
                          Reset
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={
                          customRate ||
                          (useWholesale && calc?.wholesaleRate ? calc.wholesaleRate.toFixed(2) : '')
                        }
                        onChange={(e) => {
                          setCustomRate(e.target.value);
                          setUseWholesale(false);
                        }}
                        placeholder={`Default: ${calc?.defaultRate.toFixed(2) ?? 0}`}
                        className="h-12 w-full rounded-xl border-2 border-amber-300 bg-white pl-3 pr-20 text-xl font-extrabold text-amber-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-amber-700">
                        Rs/sqft
                      </div>
                    </div>

                    {calc && calc.rateSource !== 'default' && (
                      <div
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-extrabold ${
                          calc.rateSource === 'custom'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-violet-100 text-violet-700'
                        }`}
                      >
                        <Tag className="h-2.5 w-2.5" />
                        {calc.rateSource === 'custom' ? 'CUSTOM' : 'WHOLESALE'}
                        {calc.discount > 0 && (
                          <span>(–{calc.discountPercent.toFixed(1)}%)</span>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-4 gap-1.5">
                      {calc?.wholesaleRate && (
                        <button
                          onClick={() => {
                            setUseWholesale(true);
                            setCustomRate('');
                          }}
                          className={`h-8 rounded-lg border-2 text-[10px] font-extrabold transition ${
                            useWholesale
                              ? 'border-violet-500 bg-violet-100 text-violet-900 shadow-sm'
                              : 'border-violet-200 bg-white text-violet-700 hover:border-violet-400'
                          }`}
                        >
                          W/S
                        </button>
                      )}
                      {[5, 10, 15].map((p) => (
                        <button
                          key={p}
                          onClick={() => applyDiscount(p)}
                          className="h-8 rounded-lg border-2 border-amber-200 bg-white text-amber-700 hover:border-amber-400 hover:bg-amber-50 text-[10px] font-extrabold inline-flex items-center justify-center gap-0.5 transition"
                        >
                          <Percent className="h-2.5 w-2.5" />
                          {p}
                        </button>
                      ))}
                    </div>

                    <div className="text-[10px] text-amber-800 font-semibold leading-relaxed">
                      💡 Default: <strong>Rs {calc?.defaultRate.toFixed(2)}/sqft</strong>
                      {calc?.wholesaleRate && (
                        <> • W/S: <strong>Rs {calc.wholesaleRate.toFixed(2)}/sqft</strong></>
                      )}
                    </div>
                  </div>

                  {/* Live preview */}
                  {calc && calc.cutSqft > 0 && !calc.widthError && !calc.lengthError && (
                    <div
                      className={`rounded-2xl border-2 p-3 space-y-2 ${
                        calc.rateSource === 'custom'
                          ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-300'
                          : calc.rateSource === 'wholesale'
                          ? 'bg-gradient-to-br from-violet-50 to-purple-50 border-violet-300'
                          : 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-300'
                      }`}
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-[9px] uppercase font-extrabold text-slate-600">
                            Cut Area
                          </div>
                          <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                            {calc.cutSqft.toFixed(2)}
                          </div>
                          <div className="text-[10px] font-extrabold text-slate-600">sqft</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] uppercase font-extrabold text-slate-600">
                            Total Price
                          </div>
                          <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                            {formatPKRFull(calc.totalPrice)}
                          </div>
                          <div className="text-[10px] font-extrabold text-slate-600">
                            @ {formatPKR(calc.effectiveRate)}/sqft
                          </div>
                        </div>
                      </div>

                      {calc.discount > 0 && (
                        <div className="pt-2 border-t border-slate-300 flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-700">
                            Default ({formatPKR(calc.defaultRate)}/sqft):
                          </span>
                          <div className="text-right">
                            <span className="text-slate-500 line-through">
                              {formatPKRFull(calc.defaultTotalPrice)}
                            </span>
                            <span className="ml-2 font-extrabold text-emerald-700">
                              –{formatPKRFull(calc.discount)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Roll state preview */}
                      <div className="pt-2 border-t border-slate-300 grid grid-cols-2 gap-2 text-[10px]">
                        <div className="rounded-lg bg-white/80 backdrop-blur p-2">
                          <div className="text-[8px] uppercase font-extrabold text-slate-500">After Cut</div>
                          <div className="font-extrabold text-emerald-700 tabular-nums">
                            {Math.max(calc.remainingAfterCut, 0).toFixed(2)} ft
                          </div>
                        </div>
                        {calc.widthDiff > 0.1 && (
                          <div className="rounded-lg bg-amber-100/80 backdrop-blur p-2">
                            <div className="text-[8px] uppercase font-extrabold text-amber-700">Leftover</div>
                            <div className="font-extrabold text-amber-700 tabular-nums">
                              {calc.leftoverSqft.toFixed(2)} sqft
                            </div>
                          </div>
                        )}
                      </div>

                      {calc.widthDiff > 0.1 && (
                        <div className="pt-2 border-t border-slate-300">
                          <label className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={createLeftover}
                              onChange={(e) => setCreateLeftover(e.target.checked)}
                              className="h-4 w-4 rounded mt-0.5"
                            />
                            <div className="flex-1">
                              <div className="text-[11px] font-extrabold text-amber-900">
                                Create leftover cut piece
                              </div>
                              <div className="text-[10px] text-amber-800 mt-0.5 font-semibold">
                                {calc.widthDiff.toFixed(2)}ft × {calc.len.toFixed(2)}ft = <strong>{calc.leftoverSqft.toFixed(2)} sqft</strong> bachay ga
                              </div>
                            </div>
                          </label>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-2.5 flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 text-blue-700 shrink-0 mt-0.5" />
                    <div className="text-[10px] text-blue-900 font-semibold leading-relaxed">
                      <strong>Tip:</strong> Customer ko special rate offer karne ke liye custom rate enter karein. Receipt mein actual rate print ho ga.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ FOOTER ═══ */}
        <div className="border-t-2 border-slate-200 bg-gradient-to-br from-emerald-50 to-white px-5 py-3 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-extrabold text-slate-600 hover:bg-slate-100 transition"
          >
            Cancel
          </button>

          {/* Mobile: show config button when roll selected */}
          {selectedRoll && !showMobileConfig && (
            <button
              onClick={() => setShowMobileConfig(true)}
              className="lg:hidden flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-extrabold inline-flex items-center justify-center gap-1.5"
            >
              Configure Cut
              <ArrowRight className="h-4 w-4" />
            </button>
          )}

          {(showMobileConfig || !selectedRoll || window.innerWidth >= 1024) && (
            <Button
              onClick={handleConfirm}
              disabled={!calc?.isValid}
              className="bg-gradient-to-r from-emerald-700 to-emerald-600 shadow-lg shadow-emerald-500/30 disabled:from-slate-300 disabled:to-slate-400 disabled:shadow-none"
            >
              <Scissors className="h-4 w-4" />
              {calc?.isValid
                ? `Add Cut • ${formatPKR(calc.totalPrice)}`
                : selectedRoll
                ? 'Enter dimensions'
                : 'Select roll first'}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
