import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X, Layers, Scissors, Search, AlertCircle, Check,
  ArrowRight, MapPin, DollarSign, Percent, RotateCcw, Tag,
  Sparkles, Award, ChevronLeft, Package, TrendingDown,
  Filter, SortAsc, Ruler,
} from 'lucide-react';
import { Button } from '@core/ui/Button';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { carpetRollsApi, type CarpetRoll } from '@industries/carpet/api/carpet-rolls.api';
import type { Product } from '@modules/inventory/products/api/products.api';
import type { ProductVariant } from '@modules/inventory/products/api/product-variants.api';

interface Props {
  product: Product;
  variant?: ProductVariant;
  preSelectedRoll?: CarpetRoll;
  onConfirm: (data: {
    roll: CarpetRoll;
    customerWidthFt: number;
    customerWidthInch: number;
    lengthFt: number;
    lengthInch: number;
    lengthReal: number;
    widthReal: number;
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

export function CarpetRollPicker({ product, variant, preSelectedRoll, onConfirm, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('largest');
  const [selectedRoll, setSelectedRoll] = useState<CarpetRoll | null>(preSelectedRoll || null);

  const [customerWidthFt, setCustomerWidthFt] = useState('');
  const [customerWidthInch, setCustomerWidthInch] = useState('');
  const [lengthFt, setLengthFt] = useState('');
  const [lengthInch, setLengthInch] = useState('');

  const [createLeftover, setCreateLeftover] = useState(true);
  const [customRate, setCustomRate] = useState('');
  const [useWholesale, setUseWholesale] = useState(false);
  const [showMobileConfig, setShowMobileConfig] = useState(!!preSelectedRoll);

  const widthInputRef = useRef<HTMLInputElement>(null);

  const { data: rollsData, isLoading } = useQuery({
    queryKey: ['carpet-rolls-pos', product.id, variant?.id],
    queryFn: () => carpetRollsApi.list({
      productId: product.id,
      variantId: variant?.id,
      inStockOnly: true,
      limit: 200,
    }),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const rolls = rollsData?.items ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let result = q
      ? rolls.filter((r) => {
          const hay = [
            r.rollNumber, (r as any).designCode, (r as any).rackNumber,
            (r as any).variant?.name, (r as any).variant?.color,
            String(r.remainingSqft),
            `${r.widthFt}x${r.remainingLengthFt}`,
            `${r.widthFt}×${r.remainingLengthFt}`,
          ].filter(Boolean).join(' ').toLowerCase();
          return hay.includes(q);
        })
      : [...rolls];

    result.sort((a, b) => {
      switch (sortBy) {
        case 'largest':  return Number(b.remainingSqft) - Number(a.remainingSqft);
        case 'smallest': return Number(a.remainingSqft) - Number(b.remainingSqft);
        case 'cheapest': return Number((a as any).salePricePerSqft) - Number((b as any).salePricePerSqft);
        case 'newest':
        default:         return new Date((b as any).createdAt).getTime() - new Date((a as any).createdAt).getTime();
      }
    });
    return result;
  }, [rolls, search, sortBy]);

  useEffect(() => {
    if (!selectedRoll && filtered.length > 0 && !preSelectedRoll) {
      setSelectedRoll(filtered[0]);
    }
  }, [filtered, selectedRoll, preSelectedRoll]);

  useEffect(() => {
    if (selectedRoll) {
      setCustomerWidthFt(String(Number(selectedRoll.widthFt)));
      setCustomerWidthInch(String(Number((selectedRoll as any).widthInch || 0)));
      setLengthFt('');
      setLengthInch('');
      setCustomRate('');
      setUseWholesale(false);
      setTimeout(() => {
        widthInputRef.current?.focus();
        widthInputRef.current?.select();
      }, 80);
    }
  }, [selectedRoll]);

  const calc = useMemo(() => {
    if (!selectedRoll) return null;
    const rollFullWidth = Number(selectedRoll.widthFt) + Number((selectedRoll as any).widthInch || 0) / 12;
    const customerWidth = (Number(customerWidthFt) || 0) + (Number(customerWidthInch) || 0) / 12;
    const cutLength = (Number(lengthFt) || 0) + (Number(lengthInch) || 0) / 12;
    const cutSqft = customerWidth * cutLength;
    const widthDiff = rollFullWidth - customerWidth;
    const leftoverSqft = widthDiff * cutLength;
    const availableReal = Number(selectedRoll.remainingLengthFt) + Number((selectedRoll as any).remainingLengthInch || 0) / 12;
    const remainingAfterCut = availableReal - cutLength;
    const defaultRate = Number((selectedRoll as any).salePricePerSqft);
    const wholesaleRate = (selectedRoll as any).wholesalePricePerSqft ? Number((selectedRoll as any).wholesalePricePerSqft) : null;

    let effectiveRate = defaultRate;
    let rateSource: 'default' | 'wholesale' | 'custom' = 'default';
    if (customRate && Number(customRate) > 0) {
      effectiveRate = Number(customRate); rateSource = 'custom';
    } else if (useWholesale && wholesaleRate) {
      effectiveRate = wholesaleRate; rateSource = 'wholesale';
    }

    const totalPrice = cutSqft * effectiveRate;
    const defaultTotalPrice = cutSqft * defaultRate;
    const discount = defaultTotalPrice - totalPrice;
    const discountPercent = defaultTotalPrice > 0 ? (discount / defaultTotalPrice) * 100 : 0;

    const widthError = customerWidth > rollFullWidth + 0.01
      ? `Width ${rollFullWidth.toFixed(2)}ft se zyada nahi ho sakti`
      : customerWidth < 0.1 ? `Width too small` : null;
    const lengthError = cutLength > availableReal + 0.01
      ? `Length available (${availableReal.toFixed(2)}ft) se zyada nahi` : null;
    const rateError = customRate && Number(customRate) < 0 ? 'Rate negative nahi ho sakti' : null;

    return {
      rollFullWidth, customerWidth, cutLength, cutSqft,
      widthDiff, leftoverSqft, remainingAfterCut,
      defaultRate, wholesaleRate, effectiveRate, rateSource,
      totalPrice, defaultTotalPrice, discount, discountPercent,
      widthError, lengthError, rateError,
      isValid: !widthError && !lengthError && !rateError && customerWidth > 0 && cutLength > 0 && effectiveRate > 0,
    };
  }, [selectedRoll, customerWidthFt, customerWidthInch, lengthFt, lengthInch, customRate, useWholesale]);

  const applyDiscount = (percent: number) => {
    if (!selectedRoll) return;
    const defaultRate = Number((selectedRoll as any).salePricePerSqft);
    setCustomRate((defaultRate * (1 - percent / 100)).toFixed(2));
    setUseWholesale(false);
  };

  const resetRate = () => { setCustomRate(''); setUseWholesale(false); };

  const handleConfirm = () => {
    if (!selectedRoll || !calc || !calc.isValid) return;
    onConfirm({
      roll: selectedRoll,
      customerWidthFt: Number(customerWidthFt) || 0,
      customerWidthInch: Number(customerWidthInch) || 0,
      lengthFt: Number(lengthFt) || 0,
      lengthInch: Number(lengthInch) || 0,
      lengthReal: calc.cutLength,
      widthReal: calc.customerWidth,
      cutSqft: calc.cutSqft,
      pricePerSqft: calc.effectiveRate,
      totalPrice: calc.totalPrice,
      createLeftover: calc.widthDiff > 0.05 ? createLeftover : false,
      isCustomRate: calc.rateSource !== 'default',
      originalRate: calc.defaultRate,
    });
  };

  const totalSqft = useMemo(() => rolls.reduce((sum, r) => sum + Number(r.remainingSqft), 0), [rolls]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-6xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95dvh] sm:max-h-[92vh] flex flex-col min-h-0">
        {/* HEADER */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white shrink-0">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl" />
          <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-amber-400/15 blur-2xl" />

          <div className="relative px-5 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {showMobileConfig && (
                <button onClick={() => setShowMobileConfig(false)}
                  className="lg:hidden h-10 w-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                  <ChevronLeft className="h-5 w-5 text-white" />
                </button>
              )}
              <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-lg ring-2 ring-white/20 shrink-0">
                <Layers className="h-7 w-7 text-white" />
              </div>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider mb-1 border border-white/20">
                  <Scissors className="h-3 w-3 text-amber-300" />
                  Cut from Roll
                </div>
                <h3 className="font-extrabold text-xl leading-tight truncate">
                  {product.name}
                  {variant && <span className="ml-2 text-amber-300 text-base font-bold">— {variant.name}</span>}
                </h3>
                <p className="text-sm text-white/85 font-semibold mt-1 flex items-center gap-2 flex-wrap">
                  <Package className="h-3 w-3" />
                  {rolls.length} rolls
                  <span className="text-white/40">•</span>
                  <span className="text-emerald-300 font-extrabold">{totalSqft.toFixed(0)} sqft</span>
                </p>
              </div>
            </div>
            <button onClick={onClose}
              className="h-10 w-10 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur border border-white/20 flex items-center justify-center transition shrink-0">
              <X className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden min-h-0 flex">
          <div className="flex flex-col lg:flex-row w-full h-full min-h-0">
            {/* LEFT — ROLLS LIST */}
            <div className={`flex flex-col min-h-0 border-r-2 border-slate-200 lg:flex-1 lg:min-w-0 ${showMobileConfig ? 'hidden lg:flex' : 'flex flex-1'}`}>
              <div className="px-4 py-3 border-b-2 border-slate-100 bg-white space-y-2 shrink-0">
                <div className="relative">
                  <Search className="h-5 w-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search: roll #, design, rack, size..."
                    className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-11 pr-11 text-base font-semibold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition" />
                  {search && (
                    <button onClick={() => setSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md hover:bg-slate-100 flex items-center justify-center">
                      <X className="h-4 w-4 text-slate-500" />
                    </button>
                  )}
                </div>

                <div className="flex gap-1 overflow-x-auto pb-1">
                  {[
                    { v: 'largest' as SortBy, l: 'Largest', icon: SortAsc },
                    { v: 'newest' as SortBy, l: 'Newest', icon: Sparkles },
                    { v: 'cheapest' as SortBy, l: 'Cheapest', icon: TrendingDown },
                    { v: 'smallest' as SortBy, l: 'Smallest', icon: Filter },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    const active = sortBy === opt.v;
                    return (
                      <button key={opt.v} onClick={() => setSortBy(opt.v)}
                        className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-extrabold inline-flex items-center gap-1 transition ${
                          active ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}>
                        <Icon className="h-3 w-3" />
                        {opt.l}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 bg-gradient-to-b from-slate-50/30 to-white min-h-0">
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-28 rounded-xl bg-slate-100 animate-pulse" />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center">
                      <AlertCircle className="h-8 w-8 text-slate-400" />
                    </div>
                    <div className="mt-3 font-extrabold text-slate-700 text-base">
                      {search ? 'No matching rolls' : 'No active rolls'}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filtered.map((roll) => {
                      const isSelected = selectedRoll?.id === roll.id;
                      const percentRemaining = (roll as any).originalLengthFt > 0
                        ? (Number(roll.remainingLengthFt) / Number((roll as any).originalLengthFt)) * 100
                        : 0;
                      const isLowRoll = percentRemaining < 20;

                      return (
                        <button key={roll.id}
                          onClick={() => { setSelectedRoll(roll); setShowMobileConfig(true); }}
                          className={`w-full text-left rounded-2xl border-2 p-3.5 transition-all ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50 shadow-lg ring-2 ring-emerald-200'
                              : 'border-slate-200 bg-white hover:border-emerald-400 hover:shadow-md hover:-translate-y-0.5'
                          }`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="font-mono font-extrabold text-base text-slate-900">{roll.rollNumber}</div>
                                {isSelected && (
                                  <div className="h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                                    <Check className="h-3.5 w-3.5" />
                                  </div>
                                )}
                                {isLowRoll && (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[10px] font-extrabold uppercase animate-pulse">Low</span>
                                )}
                              </div>
                              {(roll as any).variant && (
                                <div className="text-sm font-bold text-violet-700 mt-1 inline-flex items-center gap-1">
                                  {(roll as any).variant.colorHex && (
                                    <span className="h-3 w-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: (roll as any).variant.colorHex }} />
                                  )}
                                  {(roll as any).variant.name}
                                </div>
                              )}
                              {(roll as any).designCode && (
                                <div className="text-xs font-mono text-slate-500 mt-0.5">{(roll as any).designCode}</div>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-3xl font-extrabold text-emerald-700 leading-none tabular-nums">
                                {Number(roll.remainingSqft).toFixed(0)}
                              </div>
                              <div className="text-xs font-extrabold text-emerald-700">sqft</div>
                            </div>
                          </div>

                          <div className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-600 flex-wrap">
                            <span className="inline-flex items-center gap-1">
                              <Ruler className="h-3 w-3 text-slate-500" />
                              <strong>{Number(roll.widthFt)}ft{Number((roll as any).widthInch || 0) > 0 ? ` ${Number((roll as any).widthInch)}in` : ''}</strong>
                              {' × '}
                              <strong>{Number(roll.remainingLengthFt)}ft{Number((roll as any).remainingLengthInch || 0) > 0 ? ` ${Number((roll as any).remainingLengthInch)}in` : ''}</strong>
                            </span>
                            {(roll as any).rackNumber && (
                              <span className="inline-flex items-center gap-0.5 text-slate-500">
                                <MapPin className="h-3 w-3" />
                                {(roll as any).rackNumber}
                              </span>
                            )}
                            <span className="ml-auto text-emerald-700 font-extrabold tabular-nums">
                              {formatPKR(Number((roll as any).salePricePerSqft || 0))}/sqft
                            </span>
                          </div>

                          <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden">
                            <div className={`h-full transition-all ${
                              percentRemaining > 50 ? 'bg-emerald-500'
                              : percentRemaining > 20 ? 'bg-amber-500'
                              : 'bg-rose-500'
                            }`} style={{ width: `${Math.max(percentRemaining, 3)}%` }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT — CUT CONFIG */}
            <div className={`flex flex-col min-h-0 bg-slate-50/30 lg:w-[500px] lg:shrink-0 ${!showMobileConfig ? 'hidden lg:flex' : 'flex flex-1'}`}>
              {!selectedRoll ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12">
                  <div className="h-20 w-20 rounded-3xl bg-emerald-100 flex items-center justify-center">
                    <Scissors className="h-10 w-10 text-emerald-600" />
                  </div>
                  <div className="mt-4 font-extrabold text-slate-900 text-lg">Select a roll</div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                  <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-4 shadow-lg">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="text-xs uppercase tracking-wider font-extrabold opacity-90">Selected Roll</div>
                      <Award className="h-4 w-4 text-amber-300" />
                    </div>
                    <div className="font-mono font-extrabold text-2xl leading-none">{selectedRoll.rollNumber}</div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs uppercase font-extrabold opacity-75">Roll Width</div>
                        <div className="font-extrabold tabular-nums text-lg">
                          {Number(selectedRoll.widthFt)}ft
                          {Number((selectedRoll as any).widthInch || 0) > 0 && ` ${Number((selectedRoll as any).widthInch)}in`}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs uppercase font-extrabold opacity-75">Available</div>
                        <div className="font-extrabold tabular-nums text-lg">
                          {Number(selectedRoll.remainingLengthFt)}ft
                          {Number((selectedRoll as any).remainingLengthInch || 0) > 0 && ` ${Number((selectedRoll as any).remainingLengthInch)}in`}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white border-2 border-emerald-200 p-3 space-y-2">
                    <div className="text-xs uppercase tracking-wider font-extrabold text-emerald-700 flex items-center gap-1">
                      <Ruler className="h-3.5 w-3.5" />
                      Customer Width
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-extrabold text-slate-700 mb-1 uppercase">Feet</label>
                        <input ref={widthInputRef} type="number" inputMode="decimal" step="1" min="0"
                          value={customerWidthFt} onChange={(e) => setCustomerWidthFt(e.target.value)}
                          className={`h-14 w-full rounded-xl border-2 px-3 text-2xl font-extrabold focus:outline-none focus:ring-2 transition ${
                            calc?.widthError ? 'border-rose-300 bg-rose-50 focus:border-rose-500 focus:ring-rose-200'
                            : 'border-emerald-200 bg-white focus:border-emerald-500 focus:ring-emerald-200'
                          }`} />
                      </div>
                      <div>
                        <label className="block text-xs font-extrabold text-slate-700 mb-1 uppercase">Inches (0-11)</label>
                        <input type="number" inputMode="numeric" step="1" min="0" max="11"
                          value={customerWidthInch} onChange={(e) => setCustomerWidthInch(e.target.value)}
                          placeholder="0"
                          className="h-14 w-full rounded-xl border-2 border-emerald-200 bg-white px-3 text-2xl font-extrabold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white border-2 border-emerald-200 p-3 space-y-2">
                    <div className="text-xs uppercase tracking-wider font-extrabold text-emerald-700 flex items-center gap-1">
                      <Ruler className="h-3.5 w-3.5 rotate-90" />
                      Cut Length
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-extrabold text-slate-700 mb-1 uppercase">Feet</label>
                        <input type="number" inputMode="decimal" step="1" min="0"
                          value={lengthFt} onChange={(e) => setLengthFt(e.target.value)}
                          placeholder="e.g. 10"
                          className={`h-14 w-full rounded-xl border-2 px-3 text-2xl font-extrabold focus:outline-none focus:ring-2 transition ${
                            calc?.lengthError ? 'border-rose-300 bg-rose-50 focus:border-rose-500 focus:ring-rose-200'
                            : 'border-emerald-200 bg-white focus:border-emerald-500 focus:ring-emerald-200'
                          }`} />
                      </div>
                      <div>
                        <label className="block text-xs font-extrabold text-slate-700 mb-1 uppercase">Inches (0-11)</label>
                        <input type="number" inputMode="numeric" step="1" min="0" max="11"
                          value={lengthInch} onChange={(e) => setLengthInch(e.target.value)}
                          placeholder="0"
                          className="h-14 w-full rounded-xl border-2 border-emerald-200 bg-white px-3 text-2xl font-extrabold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition" />
                      </div>
                    </div>
                    <div className="text-xs font-bold text-slate-500 leading-relaxed">
                      💡 Stock book "29.6"? → Feet: <strong>29</strong>, Inches: <strong>6</strong>
                    </div>
                    {(calc?.widthError || calc?.lengthError) && (
                      <div className="rounded-lg bg-rose-50 border-2 border-rose-200 p-2.5 flex items-start gap-1.5">
                        <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-rose-900 font-bold">{calc?.widthError || calc?.lengthError}</p>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-4 w-4 text-amber-700" />
                        <span className="text-xs uppercase font-extrabold tracking-wider text-amber-900">Rate / sqft</span>
                      </div>
                      {calc?.rateSource !== 'default' && (
                        <button onClick={resetRate}
                          className="inline-flex items-center gap-0.5 text-xs font-extrabold text-amber-700 hover:text-amber-900 hover:underline">
                          <RotateCcw className="h-3 w-3" /> Reset
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <input type="number" step="0.01"
                        value={customRate || (useWholesale && calc?.wholesaleRate ? calc.wholesaleRate.toFixed(2) : '')}
                        onChange={(e) => { setCustomRate(e.target.value); setUseWholesale(false); }}
                        placeholder={`Default: ${calc?.defaultRate.toFixed(2) ?? 0}`}
                        className="h-14 w-full rounded-xl border-2 border-amber-300 bg-white pl-3 pr-24 text-2xl font-extrabold text-amber-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition" />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-amber-700">Rs/sqft</div>
                    </div>

                    {calc && calc.rateSource !== 'default' && (
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold ${
                        calc.rateSource === 'custom' ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'
                      }`}>
                        <Tag className="h-3 w-3" />
                        {calc.rateSource === 'custom' ? 'CUSTOM RATE' : 'WHOLESALE'}
                        {calc.discount > 0 && <span>(–{calc.discountPercent.toFixed(1)}%)</span>}
                      </div>
                    )}

                    <div className="grid grid-cols-4 gap-1.5">
                      {calc?.wholesaleRate && (
                        <button onClick={() => { setUseWholesale(true); setCustomRate(''); }}
                          className={`h-10 rounded-lg border-2 text-sm font-extrabold transition ${
                            useWholesale ? 'border-violet-500 bg-violet-100 text-violet-900 shadow-sm'
                            : 'border-violet-200 bg-white text-violet-700 hover:border-violet-400'
                          }`}>
                          W/S
                        </button>
                      )}
                      {[5, 10, 15].map((p) => (
                        <button key={p} onClick={() => applyDiscount(p)}
                          className="h-10 rounded-lg border-2 border-amber-200 bg-white text-amber-700 hover:border-amber-400 text-sm font-extrabold inline-flex items-center justify-center gap-0.5 transition">
                          <Percent className="h-3 w-3" />{p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {calc && calc.cutSqft > 0 && !calc.widthError && !calc.lengthError && (
                    <div className={`rounded-2xl border-2 p-3 space-y-2 ${
                      calc.rateSource === 'custom' ? 'bg-blue-50 border-blue-300'
                      : calc.rateSource === 'wholesale' ? 'bg-violet-50 border-violet-300'
                      : 'bg-emerald-50 border-emerald-300'
                    }`}>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs uppercase font-extrabold text-slate-600">Cut Area</div>
                          <div className="text-3xl font-extrabold text-slate-900 tabular-nums">{calc.cutSqft.toFixed(2)}</div>
                          <div className="text-xs font-extrabold text-slate-600">sqft</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs uppercase font-extrabold text-slate-600">Total Price</div>
                          <div className="text-3xl font-extrabold text-slate-900 tabular-nums">{formatPKRFull(calc.totalPrice)}</div>
                          <div className="text-xs font-extrabold text-slate-600">@ {formatPKR(calc.effectiveRate)}/sqft</div>
                        </div>
                      </div>

                      {calc.widthDiff > 0.05 && (
                        <div className="pt-2 border-t-2 border-slate-300">
                          <label className="flex items-start gap-2 cursor-pointer">
                            <input type="checkbox" checked={createLeftover}
                              onChange={(e) => setCreateLeftover(e.target.checked)}
                              className="h-5 w-5 rounded mt-0.5" />
                            <div className="flex-1">
                              <div className="text-sm font-extrabold text-amber-900">Create leftover cut piece</div>
                              <div className="text-xs text-amber-800 mt-0.5 font-semibold">
                                {calc.widthDiff.toFixed(2)}ft × {calc.cutLength.toFixed(2)}ft = <strong>{calc.leftoverSqft.toFixed(2)} sqft</strong>
                              </div>
                            </div>
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="border-t-2 border-slate-200 bg-emerald-50 px-5 py-3 flex items-center justify-between gap-3 shrink-0">
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-extrabold text-slate-600 hover:bg-slate-100 transition">
            Cancel
          </button>

          {selectedRoll && !showMobileConfig && (
            <button onClick={() => setShowMobileConfig(true)}
              className="lg:hidden flex-1 px-4 py-3 rounded-xl bg-emerald-600 text-white text-base font-extrabold inline-flex items-center justify-center gap-1.5">
              Configure Cut <ArrowRight className="h-5 w-5" />
            </button>
          )}

          <Button onClick={handleConfirm} disabled={!calc?.isValid}
            className="bg-gradient-to-r from-emerald-700 to-emerald-600 shadow-lg disabled:from-slate-300 disabled:to-slate-400 disabled:shadow-none px-6 py-3 text-base">
            <Scissors className="h-5 w-5" />
            {calc?.isValid ? `Add Cut • ${formatPKR(calc.totalPrice)}` : selectedRoll ? 'Enter dimensions' : 'Select roll'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
