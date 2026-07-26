import { useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Layers, Scissors, Ruler, DollarSign, MapPin,
  AlertTriangle, CheckCircle2, Edit3, Save, X, Activity, Sliders,
  Trash2, Package, History, TrendingUp, Sparkles, BarChart3, Clock,
  Award, Calendar, Hash, ChevronRight, Eye, EyeOff, ArrowUpRight,
  ArrowDownRight, Box, FileText, Copy, ExternalLink, MoreVertical,
  Printer, Share2, QrCode,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { Input } from '@core/ui/Input';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { carpetRollsApi, type CarpetRollStatus } from '../api/carpet-rolls.api';

const statusColors: Record<CarpetRollStatus, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  FINISHED: 'bg-slate-100 text-slate-700 border-slate-300',
  DAMAGED: 'bg-rose-100 text-rose-700 border-rose-300',
  RESERVED: 'bg-amber-100 text-amber-700 border-amber-300',
  TRANSFERRED: 'bg-blue-100 text-blue-700 border-blue-300',
};

const PRICE_VIS_KEY = 'nafaa.carpet-detail.price-visibility';

type Tab = 'overview' | 'history' | 'pieces' | 'edit';
type PriceVis = 'all' | 'sale-only' | 'hidden';

export default function CarpetRollDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>('overview');
  const [showCutModal, setShowCutModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [priceVis, setPriceVis] = useState<PriceVis>(
    (localStorage.getItem(PRICE_VIS_KEY) as PriceVis) || 'all',
  );

  const cyclePriceVis = () => {
    const next: PriceVis = priceVis === 'all' ? 'sale-only' : priceVis === 'sale-only' ? 'hidden' : 'all';
    setPriceVis(next);
    localStorage.setItem(PRICE_VIS_KEY, next);
  };
  const showPrice = priceVis !== 'hidden';
  const showCost = priceVis === 'all';

  const { data: roll, isLoading } = useQuery({
    queryKey: ['carpet-roll', id],
    queryFn: () => carpetRollsApi.getOne(id!),
    enabled: !!id,
  });

  const [editForm, setEditForm] = useState({
    rollNumber: '', designCode: '', widthFt: 12, widthInch: 0,
    originalLengthFt: 0, originalLengthInch: 0,
    remainingLengthFt: 0, remainingLengthInch: 0,
    costPerSqft: 0, salePricePerSqft: 0, wholesalePricePerSqft: 0,
    rackNumber: '', notes: '', quality: '', pile: '',
  });

  const startEdit = () => {
    if (!roll) return;
    setEditForm({
      rollNumber: roll.rollNumber ?? '',
      designCode: roll.designCode ?? '',
      widthFt: Number(roll.widthFt) || 12,
      widthInch: Number(roll.widthInch) || 0,
      originalLengthFt: Number(roll.originalLengthFt) || 0,
      originalLengthInch: Number((roll as any).originalLengthInch) || 0,
      remainingLengthFt: Number(roll.remainingLengthFt) || 0,
      remainingLengthInch: Number((roll as any).remainingLengthInch) || 0,
      costPerSqft: Number(roll.costPerSqft) || 0,
      salePricePerSqft: Number(roll.salePricePerSqft) || 0,
      wholesalePricePerSqft: Number(roll.wholesalePricePerSqft) || 0,
      rackNumber: roll.rackNumber ?? '',
      notes: roll.notes ?? '',
      quality: roll.quality ?? '',
      pile: roll.pile ?? '',
    });
    setTab('edit');
  };

  const updateMutation = useMutation({
    mutationFn: () => carpetRollsApi.update(id!, editForm),
    onSuccess: () => {
      toast.success('✓ Roll update ho gaya');
      queryClient.invalidateQueries({ queryKey: ['carpet-roll', id] });
      queryClient.invalidateQueries({ queryKey: ['carpet-rolls'] });
      setTab('overview');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Update fail'),
  });

  const markDamagedMutation = useMutation({
    mutationFn: (reason: string) => carpetRollsApi.markDamaged(id!, reason),
    onSuccess: () => {
      toast.success('Damaged mark ho gaya');
      queryClient.invalidateQueries({ queryKey: ['carpet-roll', id] });
    },
  });

  const markFinishedMutation = useMutation({
    mutationFn: () => carpetRollsApi.markFinished(id!),
    onSuccess: () => {
      toast.success('Finished mark ho gaya');
      queryClient.invalidateQueries({ queryKey: ['carpet-roll', id] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => carpetRollsApi.remove(id!),
    onSuccess: (res: any) => {
      toast.success(res?.message ?? 'Delete ho gaya');
      navigate('/carpet-rolls');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Delete fail'),
  });

  const analytics = useMemo(() => {
    if (!roll) return null;
    const fullWidth = Number(roll.widthFt) + Number(roll.widthInch || 0) / 12;
    const originalReal = Number(roll.originalLengthFt) + Number((roll as any).originalLengthInch || 0) / 12;
    const remainingReal = Number(roll.remainingLengthFt) + Number((roll as any).remainingLengthInch || 0) / 12;
    const soldLength = originalReal - remainingReal;
    const soldSqft = soldLength * fullWidth;
    const remainingSqft = Number(roll.remainingSqft);
    const originalSqft = Number(roll.originalSqft);
    const estimatedRevenue = soldSqft * Number(roll.salePricePerSqft);
    const estimatedCost = soldSqft * Number(roll.costPerSqft);
    const estimatedProfit = estimatedRevenue - estimatedCost;
    const profitMargin = estimatedRevenue > 0 ? (estimatedProfit / estimatedRevenue) * 100 : 0;
    const percentRemaining = originalReal > 0 ? (remainingReal / originalReal) * 100 : 0;
    const percentSold = 100 - percentRemaining;
    const lockedCapital = remainingSqft * Number(roll.costPerSqft);
    const potentialRevenue = remainingSqft * Number(roll.salePricePerSqft);
    const potentialProfit = potentialRevenue - lockedCapital;

    // Days since received + turnover rate
    const daysSinceReceived = Math.max(1, Math.floor((Date.now() - new Date(roll.receivedAt).getTime()) / (1000 * 60 * 60 * 24)));
    const sqftPerDay = soldSqft / daysSinceReceived;
    const estimatedDaysToFinish = sqftPerDay > 0 ? Math.ceil(remainingSqft / sqftPerDay) : null;

    return {
      fullWidth, originalReal, remainingReal, soldLength, soldSqft,
      remainingSqft, originalSqft,
      estimatedRevenue, estimatedCost, estimatedProfit, profitMargin,
      percentRemaining, percentSold,
      lockedCapital, potentialRevenue, potentialProfit,
      daysSinceReceived, sqftPerDay, estimatedDaysToFinish,
    };
  }, [roll]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="h-14 w-14 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin mx-auto" />
          <p className="mt-3 text-slate-700 font-extrabold">Roll details load ho rahi hain...</p>
        </div>
      </div>
    );
  }

  if (!roll || !analytics) {
    return (
      <div className="rounded-3xl bg-white border-2 border-rose-200 p-12 sm:p-16 text-center shadow-sm">
        <div className="h-16 w-16 rounded-3xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h3 className="mt-4 font-extrabold text-slate-900 text-xl">Roll nahi mila</h3>
        <p className="text-sm text-slate-500 mt-1 font-semibold">Ye roll exist nahi karta ya delete ho chuka hai</p>
        <Link to="/carpet-rolls" className="mt-4 inline-flex items-center gap-1 text-emerald-600 text-sm font-extrabold hover:underline">
          <ArrowLeft className="h-4 w-4" /> Rolls par wapas jayen
        </Link>
      </div>
    );
  }

  const copyRollNumber = () => {
    navigator.clipboard.writeText(roll.rollNumber);
    toast.success('Roll number copy ho gaya');
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-8">
      {showCutModal && (
        <CutFromRollModal
          rollId={id!}
          rollWidthFt={analytics.fullWidth}
          remainingLengthFt={roll.remainingLengthFt}
          salePricePerSqft={roll.salePricePerSqft}
          onClose={() => setShowCutModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['carpet-roll', id] });
            queryClient.invalidateQueries({ queryKey: ['carpet-rolls'] });
            setShowCutModal(false);
          }}
        />
      )}

      {showAdjustModal && (
        <AdjustRollModal
          rollId={id!}
          currentRemaining={roll.remainingLengthFt}
          onClose={() => setShowAdjustModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['carpet-roll', id] });
            queryClient.invalidateQueries({ queryKey: ['carpet-rolls'] });
            setShowAdjustModal(false);
          }}
        />
      )}

      {/* Back nav + price toggle */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Link to="/carpet-rolls" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-emerald-600 font-bold transition active:scale-95">
          <ArrowLeft className="h-4 w-4" /> Sab Rolls
        </Link>
        <div className="flex gap-2 flex-wrap">
          {roll.product?.id && (
            <Link to={`/carpet-products/${roll.product.id}`}
              className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl bg-blue-50 border-2 border-blue-200 hover:border-blue-400 text-blue-700 text-xs sm:text-sm font-extrabold transition active:scale-95">
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Product View</span>
            </Link>
          )}
          <button
            onClick={cyclePriceVis}
            className={`h-10 px-3 rounded-xl border-2 text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 transition active:scale-95 ${
              priceVis === 'all' ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
              : priceVis === 'sale-only' ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-slate-100 border-slate-300 text-slate-600'
            }`}
          >
            {priceVis === 'hidden' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="hidden sm:inline">
              {priceVis === 'all' ? 'Prices: All' : priceVis === 'sale-only' ? 'Sale only' : 'Hidden'}
            </span>
          </button>
        </div>
      </div>

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-900 to-emerald-700 text-white p-4 sm:p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20 mb-3">
              <Layers className="h-3.5 w-3.5 text-amber-300" /> Carpet Roll Detail
            </div>
            <button onClick={copyRollNumber} className="inline-flex items-center gap-2 group active:scale-95 transition">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-mono leading-tight">{roll.rollNumber}</h1>
              <Copy className="h-4 w-4 opacity-40 group-hover:opacity-100 transition" />
            </button>
            <div className="mt-3 flex items-center gap-2 flex-wrap text-sm sm:text-base">
              <span className="text-white/95 font-bold">{roll.product?.name}</span>
              {roll.variant && (
                <>
                  <span className="text-white/50">•</span>
                  <span className="inline-flex items-center gap-1.5 text-white/95 font-bold">
                    {roll.variant.colorHex && (
                      <span className="h-3.5 w-3.5 rounded-full ring-2 ring-white/50 shadow-md" style={{ backgroundColor: roll.variant.colorHex }} />
                    )}
                    {roll.variant.name}
                  </span>
                </>
              )}
              {roll.designCode && (
                <>
                  <span className="text-white/50">•</span>
                  <span className="font-mono text-white/80 bg-white/10 backdrop-blur rounded-md px-2 py-0.5 text-xs sm:text-sm">{roll.designCode}</span>
                </>
              )}
            </div>
            {(roll.shop || roll.rackNumber) && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-xs sm:text-sm text-white/80 font-bold">
                <MapPin className="h-3.5 w-3.5" />
                {roll.shop?.name}
                {roll.shop?.name && roll.rackNumber && ' • '}
                {roll.rackNumber}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className={`px-3 py-1.5 rounded-full border text-xs sm:text-sm font-extrabold ${statusColors[roll.status]} bg-white shadow-md`}>
              {roll.status}
            </span>
            <div className="text-[10px] sm:text-xs text-white/70 font-bold uppercase tracking-wider">
              {roll.sourceType.replace('_', ' ')}
            </div>
            <div className="text-[10px] sm:text-xs text-white/60 font-bold">
              Added {new Date(roll.receivedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>

        {roll.status === 'ACTIVE' && roll.remainingLengthFt > 0 && (
          <div className="relative flex gap-2 flex-wrap mt-5 sm:mt-6">
            <Button onClick={() => setShowCutModal(true)} className="bg-white text-emerald-900 hover:bg-emerald-50 font-extrabold shadow-lg shadow-black/20">
              <Scissors className="h-4 w-4" /> Cut karo
            </Button>
            <Button variant="secondary" onClick={() => setShowAdjustModal(true)} className="bg-white/15 backdrop-blur text-white hover:bg-white/25 border-white/20">
              <Sliders className="h-4 w-4" /> Adjust
            </Button>
            <Button variant="secondary" onClick={startEdit} className="bg-white/15 backdrop-blur text-white hover:bg-white/25 border-white/20">
              <Edit3 className="h-4 w-4" /> Edit
            </Button>
            <Button variant="secondary" onClick={() => {
              const reason = prompt('Damage ki wajah?');
              if (reason) markDamagedMutation.mutate(reason);
            }} className="bg-rose-500/20 backdrop-blur text-white hover:bg-rose-500/30 border-rose-300/40">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Damaged</span>
            </Button>
          </div>
        )}
      </section>

      {/* ═══ KPI GRID ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <AnalyticsCard
          label="Available"
          value={`${analytics.remainingSqft.toFixed(1)}`}
          unit="sqft"
          subValue={`${Number(roll.remainingLengthFt)}ft${Number((roll as any).remainingLengthInch || 0) > 0 ? ` ${(roll as any).remainingLengthInch}in` : ''}`}
          tone="emerald" icon={Ruler} percent={analytics.percentRemaining}
        />
        <AnalyticsCard
          label="Bik Chuka"
          value={`${analytics.soldSqft.toFixed(1)}`}
          unit="sqft"
          subValue={`${analytics.soldLength.toFixed(1)}ft sold`}
          tone="blue" icon={ArrowUpRight} percent={analytics.percentSold} trend="up"
        />
        {showPrice && (
          <AnalyticsCard
            label="Kamai Ho Gayi"
            value={formatPKRFull(analytics.estimatedRevenue)}
            subValue={`Margin: ${analytics.profitMargin.toFixed(1)}%`}
            tone="violet" icon={DollarSign} trend="up"
          />
        )}
        {showCost && (
          <AnalyticsCard
            label="Faida (Estimated)"
            value={formatPKRFull(analytics.estimatedProfit)}
            subValue={`from ${analytics.soldSqft.toFixed(1)} sqft`}
            tone="amber" icon={TrendingUp} trend="up"
          />
        )}
      </div>

      {/* ═══ PROGRESS + CAPITAL ═══ */}
      <div className="grid lg:grid-cols-[2fr_1fr] gap-4">
        <div className="rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-200 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-md">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Roll Usage</h3>
                <p className="text-xs text-slate-500 font-bold">
                  {analytics.percentRemaining.toFixed(1)}% baqi • {analytics.percentSold.toFixed(1)}% bik chuka
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-extrabold text-emerald-700 tabular-nums leading-none">{analytics.percentRemaining.toFixed(0)}%</div>
              <div className="text-xs text-slate-500 font-bold mt-0.5">stock left</div>
            </div>
          </div>

          <div className="h-4 rounded-full bg-slate-100 overflow-hidden ring-2 ring-slate-200 shadow-inner">
            <div className={`h-full transition-all rounded-r-full ${
              analytics.percentRemaining > 50 ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600'
              : analytics.percentRemaining > 20 ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600'
              : 'bg-gradient-to-r from-rose-400 via-rose-500 to-rose-600'
            }`} style={{ width: `${Math.max(analytics.percentRemaining, 3)}%` }} />
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-2.5 sm:p-3 text-center">
              <div className="text-[10px] uppercase font-extrabold text-slate-500">Original</div>
              <div className="text-sm sm:text-base font-extrabold text-slate-900 tabular-nums mt-1">
                {Number(roll.originalLengthFt)}ft{Number((roll as any).originalLengthInch || 0) > 0 ? ` ${(roll as any).originalLengthInch}in` : ''}
              </div>
              <div className="text-[10px] text-slate-500 font-bold">{analytics.originalSqft.toFixed(1)} sqft</div>
            </div>
            <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-2.5 sm:p-3 text-center">
              <div className="text-[10px] uppercase font-extrabold text-blue-700">Bik Chuka</div>
              <div className="text-sm sm:text-base font-extrabold text-blue-700 tabular-nums mt-1">{analytics.soldLength.toFixed(1)}ft</div>
              <div className="text-[10px] text-blue-600 font-bold">{analytics.soldSqft.toFixed(1)} sqft</div>
            </div>
            <div className="rounded-xl bg-emerald-50 border-2 border-emerald-200 p-2.5 sm:p-3 text-center">
              <div className="text-[10px] uppercase font-extrabold text-emerald-700">Available</div>
              <div className="text-sm sm:text-base font-extrabold text-emerald-700 tabular-nums mt-1">
                {Number(roll.remainingLengthFt)}ft{Number((roll as any).remainingLengthInch || 0) > 0 ? ` ${(roll as any).remainingLengthInch}in` : ''}
              </div>
              <div className="text-[10px] text-emerald-600 font-bold">{analytics.remainingSqft.toFixed(1)} sqft</div>
            </div>
          </div>

          {/* Turnover insights */}
          {analytics.sqftPerDay > 0 && (
            <div className="mt-4 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 p-3 flex items-center gap-3 flex-wrap">
              <div className="h-9 w-9 rounded-lg bg-blue-500 text-white flex items-center justify-center shadow shrink-0">
                <Activity className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase font-extrabold text-blue-700">Turnover Rate</div>
                <div className="text-sm font-extrabold text-blue-900">
                  {analytics.sqftPerDay.toFixed(1)} sqft/day
                  {analytics.estimatedDaysToFinish && (
                    <span className="text-blue-700 ml-2 font-bold">
                      • ~{analytics.estimatedDaysToFinish} days baqi
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {showCost && (
          <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 border-2 border-amber-300 p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md">
                <Box className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-amber-900 text-base">Locked Capital</h3>
                <p className="text-xs text-amber-700 font-bold">Baqi stock ki investment</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-[10px] uppercase font-extrabold text-amber-700">Cost Value</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-amber-900 tabular-nums">{formatPKRFull(analytics.lockedCapital)}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-3 border-t-2 border-amber-200">
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-amber-700">Sale Value</div>
                  <div className="text-sm sm:text-base font-extrabold text-amber-900 tabular-nums">{formatPKRFull(analytics.potentialRevenue)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-emerald-700">Aane Wala Faida</div>
                  <div className="text-sm sm:text-base font-extrabold text-emerald-700 tabular-nums">{formatPKRFull(analytics.potentialProfit)}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ TABS ═══ */}
      <div className="rounded-2xl sm:rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b-2 border-slate-100 bg-slate-50/50">
          <div className="flex gap-1 px-2 sm:px-3 pt-3 overflow-x-auto">
            {([
              { id: 'overview' as Tab, label: 'Overview', icon: FileText },
              { id: 'history' as Tab, label: 'History', icon: History, count: roll.movements?.length },
              { id: 'pieces' as Tab, label: 'Cut Pieces', icon: Scissors, count: roll.cutPieces?.length },
              { id: 'edit' as Tab, label: 'Edit', icon: Edit3 },
            ]).map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => { if (t.id === 'edit') startEdit(); else setTab(t.id); }}
                  className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-t-xl text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 whitespace-nowrap transition border-b-2 active:scale-95 ${
                    active ? 'bg-white text-emerald-700 border-emerald-500 shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-900 border-transparent'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                  {t.count !== undefined && t.count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                      {t.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-2 sm:gap-3">
                <DetailRow label="Dimensions" value={`${Number(roll.widthFt)}ft${Number(roll.widthInch || 0) > 0 ? ` ${roll.widthInch}in` : ''} × ${Number(roll.originalLengthFt)}ft${Number((roll as any).originalLengthInch || 0) > 0 ? ` ${(roll as any).originalLengthInch}in` : ''}`} icon={Ruler} />
                <DetailRow label="Source" value={roll.sourceType.replace('_', ' ')} icon={Box} />
                {showCost && <DetailRow label="Cost / sqft" value={formatPKRFull(roll.costPerSqft)} icon={DollarSign} tone="slate" />}
                {showPrice && <DetailRow label="Sale / sqft" value={formatPKRFull(roll.salePricePerSqft)} icon={DollarSign} tone="emerald" />}
                {showPrice && <DetailRow label="Wholesale / sqft" value={roll.wholesalePricePerSqft ? formatPKRFull(roll.wholesalePricePerSqft) : '—'} icon={DollarSign} tone="violet" />}
                <DetailRow label="Rack" value={roll.rackNumber || '—'} icon={MapPin} />
                <DetailRow label="Quality" value={roll.quality || '—'} icon={Award} />
                <DetailRow label="Pile" value={roll.pile || '—'} icon={Sparkles} />
                <DetailRow label="Shop" value={roll.shop?.name || '—'} icon={MapPin} />
                <DetailRow label="Received" value={new Date(roll.receivedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })} icon={Calendar} />
                <DetailRow label="Design Code" value={roll.designCode || '—'} mono icon={Hash} />
                <DetailRow label="Created" value={new Date(roll.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })} icon={Clock} />
                <DetailRow label="Age" value={`${analytics.daysSinceReceived} days`} icon={Activity} tone={analytics.daysSinceReceived > 90 ? 'amber' : 'slate'} />
              </div>

              {roll.notes && (
                <div className="rounded-xl bg-amber-50 border-2 border-amber-200 p-3 sm:p-4">
                  <div className="text-xs uppercase tracking-wider font-extrabold text-amber-700 mb-1.5 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Notes
                  </div>
                  <div className="text-sm text-amber-900 font-semibold whitespace-pre-wrap">{roll.notes}</div>
                </div>
              )}

              <div className="rounded-2xl bg-rose-50/30 border-2 border-rose-200 p-3 sm:p-4">
                <div className="text-xs uppercase tracking-wider font-extrabold text-rose-700 mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> Danger Zone
                </div>
                <div className="flex gap-2 flex-wrap">
                  {roll.status === 'ACTIVE' && (
                    <button
                      onClick={() => { if (confirm('Roll ko finished mark karein?')) markFinishedMutation.mutate(); }}
                      className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs sm:text-sm font-extrabold text-slate-700 border-2 border-slate-300 active:scale-95 transition"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Finished Mark Karo
                    </button>
                  )}
                  <button
                    onClick={() => { if (confirm(`Roll ${roll.rollNumber} delete karein? Ye kaam wapas nahi ho sakta.`)) removeMutation.mutate(); }}
                    className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs sm:text-sm font-extrabold text-white shadow-md active:scale-95 transition"
                  >
                    <Trash2 className="h-4 w-4" /> Delete Permanently
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div>
              {!roll.movements || roll.movements.length === 0 ? (
                <div className="py-12 text-center">
                  <Activity className="h-14 w-14 text-slate-300 mx-auto mb-2" />
                  <p className="font-extrabold text-slate-700 text-base">Koi movement nahi</p>
                  <p className="text-sm text-slate-500 mt-1 font-semibold">Roll ki activity yahan aayegi</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {(roll.movements ?? []).map((m, idx) => (
                    <MovementTimelineItem key={m.id} movement={m} isFirst={idx === 0} />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'pieces' && (
            <div>
              {!roll.cutPieces || roll.cutPieces.length === 0 ? (
                <div className="py-12 text-center">
                  <Scissors className="h-14 w-14 text-slate-300 mx-auto mb-2" />
                  <p className="font-extrabold text-slate-700 text-base">Koi cut piece nahi</p>
                  <p className="text-sm text-slate-500 mt-1 font-semibold">Leftover pieces yahan ayenge cutting ke baad</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                  {roll.cutPieces.map((piece: any) => (
                    <Link key={piece.id} to={`/carpet-cut-pieces/${piece.id}`}
                      className="rounded-xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-3 hover:border-violet-400 hover:shadow-md hover:-translate-y-0.5 transition active:scale-95">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-mono font-extrabold text-sm text-violet-900">{piece.pieceCode}</div>
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold ${
                          piece.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700'
                          : piece.status === 'SOLD' ? 'bg-violet-100 text-violet-700'
                          : 'bg-rose-100 text-rose-700'
                        }`}>{piece.status}</span>
                      </div>
                      <div className="text-sm font-extrabold text-slate-900">{piece.widthFt}ft × {piece.lengthFt}ft</div>
                      <div className="text-sm font-extrabold text-violet-700 tabular-nums">{Number(piece.totalSqft).toFixed(2)} sqft</div>
                      {showPrice && (
                        <div className="text-base font-extrabold text-emerald-700 mt-2 tabular-nums">{formatPKRFull(piece.salePrice)}</div>
                      )}
                      {piece.condition && piece.condition !== 'Good' && (
                        <div className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 text-[10px] font-extrabold">{piece.condition}</div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'edit' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl">Roll Details Edit Karo</h3>
                  <p className="text-xs sm:text-sm text-slate-500 font-bold">Koi bhi field update karo — audit log mein record ho jaye ga</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setTab('overview')} className="px-3 sm:px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs sm:text-sm font-extrabold text-slate-700 active:scale-95">Cancel</button>
                  <Button onClick={() => updateMutation.mutate()} loading={updateMutation.isPending} className="bg-gradient-to-r from-emerald-600 to-emerald-700">
                    <Save className="h-4 w-4" /> Save
                  </Button>
                </div>
              </div>

              <EditSection icon={Hash} title="Identifiers" tone="slate">
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input label="Roll Number" value={editForm.rollNumber} onChange={(e) => setEditForm({ ...editForm, rollNumber: e.target.value })} hint="Unique identifier" />
                  <Input label="Design Code" value={editForm.designCode} onChange={(e) => setEditForm({ ...editForm, designCode: e.target.value })} hint="Supplier design code" />
                </div>
              </EditSection>

              <EditSection icon={Ruler} title="Dimensions" tone="emerald">
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input label="Width (ft)" type="number" step="1" value={editForm.widthFt} onChange={(e) => setEditForm({ ...editForm, widthFt: Number(e.target.value) })} />
                  <Input label="Width (inches)" type="number" step="1" min="0" max="11" value={editForm.widthInch} onChange={(e) => setEditForm({ ...editForm, widthInch: Number(e.target.value) })} hint="0-11" />
                </div>
                <div className="grid sm:grid-cols-2 gap-3 mt-3">
                  <Input label="Original Length (ft)" type="number" step="1" value={editForm.originalLengthFt} onChange={(e) => setEditForm({ ...editForm, originalLengthFt: Number(e.target.value) })} />
                  <Input label="Original Length (inches)" type="number" step="1" min="0" max="11" value={editForm.originalLengthInch} onChange={(e) => setEditForm({ ...editForm, originalLengthInch: Number(e.target.value) })} hint="0-11" />
                </div>
                <div className="grid sm:grid-cols-2 gap-3 mt-3">
                  <Input label="Remaining Length (ft)" type="number" step="1" value={editForm.remainingLengthFt} onChange={(e) => setEditForm({ ...editForm, remainingLengthFt: Number(e.target.value) })} />
                  <Input label="Remaining Length (inches)" type="number" step="1" min="0" max="11" value={editForm.remainingLengthInch} onChange={(e) => setEditForm({ ...editForm, remainingLengthInch: Number(e.target.value) })} hint="0-11" />
                </div>
                <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs text-amber-900 font-semibold flex items-start gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span><strong>Warning:</strong> Dimensions change karne se sqft auto-recalculate hoga. Dhyan se use karein.</span>
                </div>
              </EditSection>

              <EditSection icon={DollarSign} title="Pricing (per sqft)" tone="blue">
                <div className="grid sm:grid-cols-3 gap-3">
                  <Input label="Cost / sqft (PKR)" type="number" step="0.01" value={editForm.costPerSqft} onChange={(e) => setEditForm({ ...editForm, costPerSqft: Number(e.target.value) })} />
                  <Input label="Sale / sqft (PKR)" type="number" step="0.01" value={editForm.salePricePerSqft} onChange={(e) => setEditForm({ ...editForm, salePricePerSqft: Number(e.target.value) })} />
                  <Input label="Wholesale / sqft (PKR)" type="number" step="0.01" value={editForm.wholesalePricePerSqft} onChange={(e) => setEditForm({ ...editForm, wholesalePricePerSqft: Number(e.target.value) })} />
                </div>
                {editForm.costPerSqft > 0 && editForm.salePricePerSqft > 0 && (
                  <div className="mt-2 rounded-lg bg-emerald-100 border border-emerald-300 p-2 text-sm">
                    <span className="font-extrabold text-emerald-900">
                      Profit margin: {(((editForm.salePricePerSqft - editForm.costPerSqft) / editForm.salePricePerSqft) * 100).toFixed(1)}%
                    </span>
                    <span className="text-emerald-700 ml-2 font-bold">(Rs {(editForm.salePricePerSqft - editForm.costPerSqft).toFixed(2)} per sqft)</span>
                  </div>
                )}
              </EditSection>

              <EditSection icon={Sparkles} title="Attributes & Location" tone="violet">
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input label="Quality" value={editForm.quality} onChange={(e) => setEditForm({ ...editForm, quality: e.target.value })} hint="Premium / Standard / Economy" />
                  <Input label="Pile / Material" value={editForm.pile} onChange={(e) => setEditForm({ ...editForm, pile: e.target.value })} hint="Wool / Synthetic / Mixed" />
                </div>
                <div className="mt-3">
                  <Input label="Rack / Location" value={editForm.rackNumber} onChange={(e) => setEditForm({ ...editForm, rackNumber: e.target.value })} hint="e.g. Wall-1, Rack-A" />
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Notes</label>
                  <textarea rows={3} className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500" value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Additional notes..." />
                </div>
              </EditSection>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══ Helper components ═══ */

function AnalyticsCard({ label, value, unit, subValue, tone, icon: Icon, percent, trend }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-50 to-green-50 border-emerald-200 text-emerald-900',
    blue: 'from-blue-50 to-indigo-50 border-blue-200 text-blue-900',
    violet: 'from-violet-50 to-purple-50 border-violet-200 text-violet-900',
    amber: 'from-amber-50 to-orange-50 border-amber-200 text-amber-900',
  };
  const iconTones: Record<string, string> = {
    emerald: 'from-emerald-500 to-emerald-700',
    blue: 'from-blue-500 to-blue-700',
    violet: 'from-violet-500 to-violet-700',
    amber: 'from-amber-500 to-amber-700',
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br border-2 p-3 sm:p-4 shadow-sm ${tones[tone]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br ${iconTones[tone]} text-white flex items-center justify-center shadow-md`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        {trend === 'up' && <ArrowUpRight className="h-4 w-4 opacity-60" />}
      </div>
      <div className="text-[10px] uppercase tracking-wider font-extrabold opacity-75">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <div className="text-xl sm:text-3xl font-extrabold tabular-nums leading-none">{value}</div>
        {unit && <div className="text-xs sm:text-sm font-extrabold opacity-70">{unit}</div>}
      </div>
      {subValue && <div className="text-[10px] sm:text-xs font-bold opacity-70 mt-1.5 truncate">{subValue}</div>}
      {percent !== undefined && (
        <div className="mt-2 h-1.5 rounded-full bg-white/50 overflow-hidden">
          <div className="h-full bg-current opacity-60" style={{ width: `${Math.max(percent, 3)}%` }} />
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, mono, icon: Icon, tone }: any) {
  const toneClass: Record<string, string> = {
    emerald: 'bg-emerald-50 border-emerald-200',
    blue: 'bg-blue-50 border-blue-200',
    violet: 'bg-violet-50 border-violet-200',
    slate: 'bg-slate-50 border-slate-200',
    amber: 'bg-amber-50 border-amber-200',
  };
  return (
    <div className={`rounded-xl border-2 p-2.5 sm:p-3 ${tone ? toneClass[tone] : 'bg-white border-slate-200'}`}>
      <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <div className={`text-sm sm:text-base font-extrabold text-slate-900 mt-1 ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}

function MovementTimelineItem({ movement, isFirst }: { movement: any; isFirst: boolean }) {
  const isNegative = Number(movement.lengthFt) < 0;
  const typeConfig: Record<string, { label: string; icon: any; color: string }> = {
    OPENING: { label: 'Opening Stock', icon: Sparkles, color: 'bg-blue-100 text-blue-700 border-blue-300' },
    CUT_FOR_SALE: { label: 'Cut for Sale', icon: Scissors, color: 'bg-violet-100 text-violet-700 border-violet-300' },
    ADJUSTMENT: { label: 'Adjustment', icon: Sliders, color: 'bg-amber-100 text-amber-700 border-amber-300' },
    DAMAGE: { label: 'Damage', icon: AlertTriangle, color: 'bg-rose-100 text-rose-700 border-rose-300' },
    TRANSFER: { label: 'Transfer', icon: ArrowUpRight, color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
    RETURN: { label: 'Return', icon: ArrowDownRight, color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  };
  const type = typeConfig[movement.type] ?? { label: movement.type, icon: Activity, color: 'bg-slate-100 text-slate-700 border-slate-300' };
  const Icon = type.icon;

  return (
    <div className="relative pl-10">
      <div className={`absolute left-2 top-3 h-6 w-6 rounded-full border-2 flex items-center justify-center shadow-sm ${type.color} ${isFirst ? 'ring-4 ring-emerald-100' : ''}`}>
        <Icon className="h-3 w-3" />
      </div>
      <div className="absolute left-[19px] top-8 bottom-0 w-0.5 bg-slate-200" />

      <div className="rounded-xl border-2 border-slate-200 bg-white p-3 hover:border-slate-300 transition">
        <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
          <span className={`px-2 py-0.5 rounded-full border text-xs font-extrabold ${type.color}`}>{type.label}</span>
          <div className={`text-sm sm:text-base font-extrabold tabular-nums ${isNegative ? 'text-rose-600' : 'text-emerald-600'}`}>
            {isNegative ? '' : '+'}{Number(movement.lengthFt).toFixed(2)}ft
          </div>
        </div>
        <div className="text-xs sm:text-sm text-slate-600 font-bold">
          Balance: <span className="text-slate-900">{Number(movement.balanceLengthAfter).toFixed(2)}ft</span>
          {' • '}
          <span className="text-slate-900">{Number(movement.balanceSqftAfter).toFixed(2)} sqft</span>
        </div>
        {movement.note && <div className="text-xs text-slate-500 mt-1 italic font-semibold">"{movement.note}"</div>}
        <div className="text-[10px] text-slate-400 mt-1 font-bold inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {new Date(movement.createdAt).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}
        </div>
      </div>
    </div>
  );
}

function EditSection({ icon: Icon, title, tone, children }: any) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-50 border-slate-200',
    emerald: 'bg-emerald-50/50 border-emerald-200',
    blue: 'bg-blue-50/50 border-blue-200',
    violet: 'bg-violet-50/50 border-violet-200',
  };
  const titleTones: Record<string, string> = {
    slate: 'text-slate-700',
    emerald: 'text-emerald-700',
    blue: 'text-blue-700',
    violet: 'text-violet-700',
  };
  return (
    <div className={`rounded-2xl border-2 p-3 sm:p-4 ${tones[tone]}`}>
      <div className={`text-xs uppercase tracking-wider font-extrabold mb-3 flex items-center gap-1.5 ${titleTones[tone]}`}>
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      {children}
    </div>
  );
}

function CutFromRollModal({ rollId, rollWidthFt, remainingLengthFt, salePricePerSqft, onClose, onSuccess }: any) {
  const [lengthFt, setLengthFt] = useState(0);
  const [lengthInch, setLengthInch] = useState(0);
  const [customerWidthFt, setCustomerWidthFt] = useState(rollWidthFt);
  const [createLeftoverPiece, setCreateLeftoverPiece] = useState(true);
  const [note, setNote] = useState('');

  const cutMutation = useMutation({
    mutationFn: () => carpetRollsApi.cut(rollId, { lengthFt, lengthInch, customerWidthFt, createLeftoverPiece, note: note || undefined }),
    onSuccess: (res) => {
      toast.success(`Cut ${res.cutLengthFt}ft (${res.cutSqft.toFixed(2)} sqft). ` + (res.leftoverPiece ? `Leftover piece bhi bana.` : ''));
      onSuccess();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Cut fail'),
  });

  const realLength = Number(lengthFt) + Number(lengthInch || 0) / 12;
  const cutSqft = customerWidthFt * realLength;
  const cutPrice = cutSqft * salePricePerSqft;
  const widthDiff = rollWidthFt - customerWidthFt;
  const leftoverSqft = widthDiff * realLength;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl w-full sm:max-w-2xl overflow-hidden max-h-[95vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in duration-200">
        <div className="bg-gradient-to-br from-emerald-800 to-emerald-700 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-extrabold">
              <Scissors className="h-3.5 w-3.5" /> Cut from Roll
            </div>
            <h2 className="mt-2 text-xl sm:text-2xl font-extrabold">Customer Sale</h2>
            <p className="text-xs sm:text-sm text-white/85 mt-1 font-semibold">Roll se length cut karein — stock auto reduce hoga</p>
          </div>
          <button onClick={onClose} className="h-10 w-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center active:scale-95">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 sm:space-y-4">
          <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3">
            <div className="font-extrabold text-blue-900 text-sm">Roll Info</div>
            <div className="text-blue-700 mt-1 text-xs sm:text-sm font-semibold">
              Roll width: <strong>{rollWidthFt.toFixed(2)}ft</strong> • Remaining: <strong>{Number(remainingLengthFt).toFixed(2)}ft</strong>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Customer Width (ft) *" type="number" step="0.01" value={customerWidthFt} onChange={(e) => setCustomerWidthFt(Number(e.target.value))} hint={`Max: ${rollWidthFt.toFixed(2)}ft`} />
            <Input label="Length to Cut (ft) *" type="number" step="1" value={lengthFt} onChange={(e) => setLengthFt(Number(e.target.value))} hint="Whole feet portion" />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Length Extra (inches, 0-11)" type="number" step="1" min="0" max="11" value={lengthInch} onChange={(e) => setLengthInch(Number(e.target.value))} hint='"29.6" = 29ft + 6in' />
            <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3">
              <div className="font-extrabold text-blue-900 text-sm">Available</div>
              <div className="text-blue-700 font-extrabold text-base mt-1">{Number(remainingLengthFt)}ft remaining</div>
            </div>
          </div>

          {realLength > 0 && customerWidthFt > 0 && (
            <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-3 sm:p-4">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-emerald-700">Cut Area</div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-emerald-900 tabular-nums">{cutSqft.toFixed(2)} <span className="text-sm sm:text-base">sqft</span></div>
                  <div className="text-[10px] sm:text-xs text-emerald-700 font-bold">{customerWidthFt}ft × {lengthFt}ft{lengthInch > 0 ? ` ${lengthInch}in` : ''}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-emerald-700">Sale Price</div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-emerald-900 tabular-nums">{formatPKRFull(cutPrice)}</div>
                  <div className="text-[10px] sm:text-xs text-emerald-700 font-bold">@ {formatPKRFull(salePricePerSqft)}/sqft</div>
                </div>
              </div>

              {widthDiff > 0.1 && (
                <div className="mt-3 pt-3 border-t-2 border-emerald-200">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="text-[10px] uppercase font-extrabold text-amber-700">Leftover</div>
                      <div className="text-sm sm:text-base font-extrabold text-amber-900">{widthDiff.toFixed(2)}ft × {lengthFt}ft = {leftoverSqft.toFixed(2)} sqft</div>
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm font-extrabold text-amber-900 cursor-pointer">
                      <input type="checkbox" checked={createLeftoverPiece} onChange={(e) => setCreateLeftoverPiece(e.target.checked)} className="h-4 w-4 rounded" />
                      Auto-create piece
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Sale Note (optional)</label>
            <input className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-semibold focus:outline-none focus:border-emerald-500" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Customer name, order #, etc." />
          </div>
        </div>

        <div className="bg-slate-50 border-t-2 border-slate-200 p-3 sm:p-4 flex items-center justify-between shrink-0 gap-2">
          <button onClick={onClose} className="px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-slate-600 hover:bg-slate-200 active:scale-95">Cancel</button>
          <Button
            onClick={() => {
              const requestedLen = Number(lengthFt) + Number(lengthInch || 0) / 12;
              if (requestedLen <= 0) return toast.error('Length zaroori hai');
              if (customerWidthFt <= 0) return toast.error('Width zaroori hai');
              if (requestedLen > Number(remainingLengthFt)) return toast.error(`Sirf ${remainingLengthFt}ft baqi hai`);
              if (customerWidthFt > rollWidthFt) return toast.error(`Max width ${rollWidthFt}ft`);
              cutMutation.mutate();
            }}
            loading={cutMutation.isPending}
            className="bg-gradient-to-r from-emerald-700 to-emerald-600 shadow-lg"
          >
            <Scissors className="h-4 w-4" /> Confirm Cut
          </Button>
        </div>
      </div>
    </div>
  );
}

function AdjustRollModal({ rollId, currentRemaining, onClose, onSuccess }: any) {
  const [lengthDeltaFt, setLengthDeltaFt] = useState(0);
  const [lengthDeltaInch, setLengthDeltaInch] = useState(0);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  const adjustMutation = useMutation({
    mutationFn: () => carpetRollsApi.adjust(rollId, { lengthDeltaFt, lengthDeltaInch, reason: reason || 'Manual adjustment', note: note || undefined }),
    onSuccess: () => { toast.success('Adjust ho gaya'); onSuccess(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Adjust fail'),
  });

  const deltaReal = Number(lengthDeltaFt) + Number(lengthDeltaInch || 0) / 12;
  const newRemaining = Number(currentRemaining) + deltaReal;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl w-full sm:max-w-md overflow-hidden animate-in slide-in-from-bottom sm:zoom-in duration-200">
        <div className="bg-gradient-to-br from-amber-700 to-orange-700 text-white p-4 sm:p-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold">Roll Adjust Karo</h2>
            <p className="text-sm text-white/85 mt-1 font-semibold">Manual stock correction</p>
          </div>
          <button onClick={onClose} className="h-10 w-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center active:scale-95">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
          <div className="rounded-xl bg-slate-50 border-2 border-slate-200 p-3">
            <div className="text-xs uppercase font-extrabold text-slate-500">Current Remaining</div>
            <div className="text-2xl font-extrabold text-slate-900 tabular-nums">{Number(currentRemaining).toFixed(2)} ft</div>
          </div>

          <Input label="Length Delta (ft) *" type="number" step="1" value={lengthDeltaFt} onChange={(e) => setLengthDeltaFt(Number(e.target.value))} hint="+ badhaye, - kam kare" />
          <Input label="Length Delta (inches)" type="number" step="1" value={lengthDeltaInch} onChange={(e) => setLengthDeltaInch(Number(e.target.value))} hint="Extra inches" />

          {(lengthDeltaFt !== 0 || lengthDeltaInch !== 0) && (
            <div className={`rounded-xl border-2 p-3 ${
              newRemaining < 0 ? 'bg-rose-50 border-rose-300' : deltaReal < 0 ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-300'
            }`}>
              <div className="text-xs uppercase font-extrabold">New Remaining</div>
              <div className="text-2xl font-extrabold tabular-nums">{newRemaining.toFixed(2)} ft</div>
              {newRemaining < 0 && <div className="text-xs font-bold text-rose-700 mt-1">⚠️ Negative nahi ho sakta</div>}
            </div>
          )}

          <Input label="Reason *" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Corner damaged, count correction" />

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Additional Note</label>
            <textarea rows={2} className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        <div className="bg-slate-50 border-t-2 border-slate-200 p-3 sm:p-4 flex items-center justify-between gap-2">
          <button onClick={onClose} className="px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold text-slate-600 hover:bg-slate-200 active:scale-95">Cancel</button>
          <Button
            onClick={() => {
              if (lengthDeltaFt === 0 && lengthDeltaInch === 0) return toast.error('Delta zero nahi ho sakta');
              if (!reason.trim()) return toast.error('Reason zaroori hai');
              if (newRemaining < 0) return toast.error('Remaining negative nahi ho sakta');
              adjustMutation.mutate();
            }}
            loading={adjustMutation.isPending}
            className="bg-gradient-to-r from-amber-700 to-orange-700 shadow-lg"
          >
            <Save className="h-4 w-4" /> Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}
