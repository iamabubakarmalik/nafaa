import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, CheckCircle2, X, Ban, Sparkles, User, Phone, Mail, Clock,
  Printer, DollarSign, CreditCard, Star, Calendar, Truck, MapPin,
  Cake, Camera, Heart, ArrowRight, ChefHat, Palette, Type,
} from 'lucide-react';
import { cakeOrdersApi, type BakeryOrderStatus } from '../api/cake-orders.api';
import { CATEGORY_EMOJI, OCCASION_EMOJI, FLAVORS, SIZES, SHAPES, CREAMS } from '../api/constants';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { UploadDropzone } from '@/components/uploads';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_FLOW: BakeryOrderStatus[] = [
  'CONFIRMED', 'DEPOSIT_PAID', 'IN_PRODUCTION', 'BAKING',
  'DECORATING', 'QUALITY_CHECK', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED',
];

const STATUS_CONFIG: Record<BakeryOrderStatus, { label: string; color: string; icon: any }> = {
  DRAFT: { label: 'Draft', color: 'bg-slate-500', icon: Clock },
  QUOTED: { label: 'Quoted', color: 'bg-blue-500', icon: Clock },
  CONFIRMED: { label: 'Confirmed', color: 'bg-cyan-500', icon: CheckCircle2 },
  DEPOSIT_PAID: { label: 'Deposit Paid', color: 'bg-teal-500', icon: DollarSign },
  IN_PRODUCTION: { label: 'In Production', color: 'bg-amber-500', icon: ChefHat },
  BAKING: { label: 'Baking', color: 'bg-orange-500', icon: ChefHat },
  DECORATING: { label: 'Decorating', color: 'bg-fuchsia-500', icon: Palette },
  QUALITY_CHECK: { label: 'Quality Check', color: 'bg-violet-500', icon: CheckCircle2 },
  READY: { label: 'Ready', color: 'bg-emerald-500', icon: CheckCircle2 },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'bg-blue-600', icon: Truck },
  DELIVERED: { label: 'Delivered', color: 'bg-green-600', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', color: 'bg-rose-500', icon: X },
  REFUNDED: { label: 'Refunded', color: 'bg-slate-600', icon: X },
};

export default function CakeOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPayment, setShowPayment] = useState(false);
  const [showRating, setShowRating] = useState(false);

  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ['cake-order', id],
    queryFn: () => cakeOrdersApi.getOne(id!),
    enabled: !!id,
    refetchInterval: 30_000,
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => cakeOrdersApi.updateStatus(id!, status),
    onSuccess: () => { toast.success('Status updated'); queryClient.invalidateQueries({ queryKey: ['cake-order', id] }); queryClient.invalidateQueries({ queryKey: ['cake-orders'] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => cakeOrdersApi.updateStatus(id!, 'CANCELLED', reason),
    onSuccess: () => { toast.success('Order cancelled'); refetch(); },
  });

  if (isLoading || !order) {
    return <div className="h-64 rounded-3xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />;
  }

  const statusCfg = STATUS_CONFIG[order.status];
  const currentIdx = STATUS_FLOW.indexOf(order.status);
  const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;
  const remaining = order.total - order.paidAmount;
  const isFullyPaid = remaining <= 0.01;
  const flavor = FLAVORS.find((f) => f.value === order.flavor);
  const size = SIZES.find((s) => s.value === order.size);
  const shape = SHAPES.find((s) => s.value === order.shape);
  const cream = CREAMS.find((c) => c.value === order.creamType);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-fuchsia-800 text-white p-6 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button onClick={() => navigate('/bakery/cake-orders')} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[10px] font-extrabold border border-white/20">
                <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                {order.orderNumber}
              </div>
              <h1 className="mt-1 text-3xl font-extrabold">{order.customerName}</h1>
              <div className="mt-1 flex items-center gap-2 flex-wrap text-sm">
                <span className={'px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase text-white ' + statusCfg.color}>{statusCfg.label}</span>
                <span className="text-white/80 font-semibold inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Needed: {format(new Date(order.neededBy), 'dd MMM yyyy, HH:mm')}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold border border-white/20">
              <Printer className="h-4 w-4" />
              Print
            </button>
            {!isFullyPaid && !['CANCELLED', 'REFUNDED'].includes(order.status) && (
              <Button className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowPayment(true)}>
                <DollarSign className="h-4 w-4" />
                Add Payment
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Status flow */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Order Workflow</h3>
          {nextStatus && !['CANCELLED', 'REFUNDED', 'DELIVERED'].includes(order.status) && (
            <div className="flex gap-2">
              <Button size="sm" onClick={() => statusMutation.mutate(nextStatus)} loading={statusMutation.isPending} className={STATUS_CONFIG[nextStatus].color + ' text-white'}>
                <ArrowRight className="h-3.5 w-3.5" />
                {STATUS_CONFIG[nextStatus].label}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => {
                const reason = prompt('Cancellation reason?');
                if (reason) cancelMutation.mutate(reason);
              }} className="bg-rose-50 text-rose-700 border-rose-300">
                <Ban className="h-3.5 w-3.5" />
                Cancel
              </Button>
            </div>
          )}
          {order.status === 'DELIVERED' && !order.customerRating && (
            <Button size="sm" onClick={() => setShowRating(true)} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
              <Star className="h-3.5 w-3.5" />
              Add Rating
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {STATUS_FLOW.map((s, i) => {
            const isActive = i <= currentIdx;
            const isCurrent = i === currentIdx;
            const cfg = STATUS_CONFIG[s];
            const Icon = cfg.icon;
            return (
              <div key={s} className="flex items-center shrink-0">
                <div className="flex flex-col items-center gap-1">
                  <div className={
                    'h-10 w-10 rounded-full flex items-center justify-center transition ' +
                    (isCurrent ? cfg.color + ' text-white ring-4 ring-pink-200 dark:ring-pink-900 shadow' :
                     isActive ? cfg.color + ' text-white' : 'bg-slate-200 dark:bg-neutral-700 text-slate-500')
                  }>
                    {isActive && !isCurrent ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={
                    'text-[9px] font-extrabold uppercase ' +
                    (isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400')
                  }>
                    {cfg.label}
                  </span>
                </div>
                {i < STATUS_FLOW.length - 1 && (
                  <div className={'h-0.5 w-8 mx-1 ' + (i < currentIdx ? 'bg-pink-500' : 'bg-slate-200 dark:bg-neutral-700')} />
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        <section className="space-y-4">
          {/* Cake Preview */}
          <div className={
            'rounded-3xl overflow-hidden shadow-xl relative bg-gradient-to-br ' +
            (flavor?.color ?? 'from-pink-500 to-fuchsia-600')
          }>
            <div className="p-6 text-white text-center relative">
              <div className="absolute inset-0 bg-black/20" />
              <div className="relative">
                <div className="text-7xl mb-2">{OCCASION_EMOJI[order.occasion] || '🎂'}</div>
                <div className="text-2xl font-extrabold">{order.occasion?.replace('_', ' ')} Cake</div>
                {order.celebrantName && (
                  <div className="mt-1 text-lg font-bold">for {order.celebrantName}{order.celebrantAge ? ' (' + order.celebrantAge + ')' : ''}</div>
                )}
                {order.messageOnCake && (
                  <div className="mt-4 inline-block px-4 py-2 rounded-xl bg-white/25 backdrop-blur border border-white/30">
                    <div className="text-[10px] uppercase font-extrabold text-white/80">Message</div>
                    <div className="text-lg font-extrabold italic">"{order.messageOnCake}"</div>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-1 justify-center">
                  <span className="px-2 py-0.5 rounded-full bg-white/25 backdrop-blur text-xs font-extrabold">{size?.emoji} {size?.label}</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/25 backdrop-blur text-xs font-extrabold">{shape?.emoji} {shape?.label}</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/25 backdrop-blur text-xs font-extrabold">{flavor?.emoji} {flavor?.label}</span>
                  {cream && <span className="px-2 py-0.5 rounded-full bg-white/25 backdrop-blur text-xs font-extrabold">{cream.emoji} {cream.label}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Customer info */}
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-pink-600" />
              Customer
            </h3>
            <div className="space-y-2 text-sm">
              <div className="font-extrabold text-slate-900 dark:text-white text-base">{order.customerName}</div>
              <a href={'tel:' + order.customerPhone} className="flex items-center gap-1 text-blue-700 font-bold hover:underline">
                <Phone className="h-3 w-3" />
                {order.customerPhone}
              </a>
              {order.customerEmail && (
                <a href={'mailto:' + order.customerEmail} className="flex items-center gap-1 text-blue-700 font-bold hover:underline">
                  <Mail className="h-3 w-3" />
                  {order.customerEmail}
                </a>
              )}
            </div>
          </div>

          {/* Photo cake / references */}
          {(order.hasPhotoOnCake || order.designReferenceUrls?.length > 0) && (
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Camera className="h-4 w-4 text-fuchsia-600" />
                Design & Photos
              </h3>
              {order.hasPhotoOnCake && order.photoUrl && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-fuchsia-700 mb-1">📸 Photo for Cake (Edible Print)</div>
                  <a href={order.photoUrl} target="_blank" rel="noreferrer">
                    <img src={order.photoUrl} alt="" className="w-40 h-40 rounded-xl object-cover border-2 border-fuchsia-300" />
                  </a>
                </div>
              )}
              {order.designReferenceUrls?.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-violet-700 mb-1">Design References</div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {order.designReferenceUrls.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden border border-slate-200 hover:border-fuchsia-500 transition">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {order.designInstructions && (
                <div className="rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 p-3 text-sm text-slate-800 dark:text-slate-200">
                  {order.designInstructions}
                </div>
              )}
              {(order.colorTheme || order.primaryColor) && (
                <div className="flex flex-wrap gap-2 text-xs">
                  {order.colorTheme && <span className="px-2 py-1 rounded bg-violet-100 text-violet-700 font-extrabold">Theme: {order.colorTheme}</span>}
                  {order.primaryColor && <span className="px-2 py-1 rounded bg-pink-100 text-pink-700 font-extrabold">Primary: {order.primaryColor}</span>}
                  {order.secondaryColor && <span className="px-2 py-1 rounded bg-fuchsia-100 text-fuchsia-700 font-extrabold">Secondary: {order.secondaryColor}</span>}
                </div>
              )}
            </div>
          )}

          {/* Occasion + Event */}
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-fuchsia-600" />
              Event Details
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-[10px] uppercase font-extrabold text-slate-500">Occasion</div>
                <div className="font-extrabold flex items-center gap-1">{OCCASION_EMOJI[order.occasion] || '⭐'} {order.occasion?.replace('_', ' ')}</div>
              </div>
              {order.celebrantName && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-slate-500">For</div>
                  <div className="font-extrabold">{order.celebrantName}{order.celebrantAge ? ' (' + order.celebrantAge + ')' : ''}</div>
                </div>
              )}
              {order.eventDate && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-slate-500">Event Date</div>
                  <div className="font-extrabold">{format(new Date(order.eventDate), 'dd MMM yyyy')}</div>
                </div>
              )}
              {order.eventTime && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold text-slate-500">Event Time</div>
                  <div className="font-extrabold">{order.eventTime}</div>
                </div>
              )}
              {order.eventVenue && (
                <div className="col-span-2">
                  <div className="text-[10px] uppercase font-extrabold text-slate-500">Venue</div>
                  <div className="font-extrabold">{order.eventVenue}</div>
                </div>
              )}
            </div>
          </div>

          {/* Dietary + Extras */}
          {(order.isEggless || order.isSugarFree || order.isVegan || order.cakeStand || order.cakeKnife || (order.candlesRequired ?? 0) > 0) && (
            <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-2">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Heart className="h-4 w-4 text-emerald-600" />
                Dietary & Extras
              </h3>
              <div className="flex flex-wrap gap-1">
                {order.isEggless && <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-xs font-extrabold">🥚 Eggless</span>}
                {order.isSugarFree && <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-xs font-extrabold">🍬 Sugar-free</span>}
                {order.isVegan && <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-xs font-extrabold">🌱 Vegan</span>}
                {(order.candlesRequired ?? 0) > 0 && (
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs font-extrabold">
                    🕯️ {order.candlesRequired} candles {order.candleType && '(' + order.candleType + ')'}
                  </span>
                )}
                {order.cakeStand && <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs font-extrabold">🎂 Cake Stand</span>}
                {order.cakeKnife && <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs font-extrabold">🔪 Cake Knife</span>}
              </div>
              {order.allergies?.length > 0 && (
                <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 p-2 text-xs">
                  <div className="font-extrabold text-rose-800 mb-1">⚠️ Allergies</div>
                  <div>{order.allergies.join(', ')}</div>
                </div>
              )}
              {order.dietaryNotes && (
                <div className="text-xs italic text-slate-600">{order.dietaryNotes}</div>
              )}
            </div>
          )}

          {/* Delivery */}
          <div className="rounded-3xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-2">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Truck className="h-4 w-4 text-blue-600" />
              Delivery
            </h3>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-extrabold uppercase">
                {order.deliveryType?.replace('_', ' ')}
              </span>
              {order.deliveryTime && (
                <span className="text-xs font-bold text-slate-600">
                  <Clock className="h-3 w-3 inline mr-0.5" />
                  {order.deliveryTime}
                </span>
              )}
            </div>
            {order.deliveryAddress && (
              <div className="text-sm text-slate-700 dark:text-slate-300">
                <MapPin className="h-3 w-3 inline mr-1" />
                {order.deliveryAddress}
              </div>
            )}
            {order.deliveryLandmark && (
              <div className="text-xs text-slate-500">Landmark: {order.deliveryLandmark}</div>
            )}
            {order.deliveryCharges > 0 && (
              <div className="text-xs font-extrabold text-blue-700">Charges: {formatPKR(order.deliveryCharges)}</div>
            )}
          </div>

          {/* Rating & feedback */}
          {order.customerRating && (
            <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-800 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={'h-5 w-5 ' + (n <= (order.customerRating || 0) ? 'text-amber-500 fill-amber-500' : 'text-slate-300')} />
                  ))}
                </div>
                <span className="font-extrabold text-amber-900">{order.customerRating}/5</span>
              </div>
              {order.customerFeedback && (
                <p className="text-sm italic text-slate-700">"{order.customerFeedback}"</p>
              )}
              {order.finalPhotoUrls?.length > 0 && (
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {order.finalPhotoUrls.map((url: string, i: number) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" className="aspect-square rounded-lg overflow-hidden border border-amber-300">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Special instructions */}
          {order.specialInstructions && (
            <div className="rounded-2xl bg-fuchsia-50 dark:bg-fuchsia-950/30 border-2 border-fuchsia-200 dark:border-fuchsia-800 p-4">
              <div className="text-sm font-extrabold text-fuchsia-900 mb-1">📝 Special Instructions</div>
              <p className="text-sm text-slate-800 dark:text-slate-200">{order.specialInstructions}</p>
            </div>
          )}

          {/* Cancellation reason */}
          {order.cancellationReason && (
            <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-200 dark:border-rose-800 p-4">
              <div className="flex items-center gap-2 text-rose-700 font-extrabold text-sm">
                <Ban className="h-4 w-4" />
                Cancelled
              </div>
              <p className="mt-1 text-xs text-slate-700">{order.cancellationReason}</p>
            </div>
          )}
        </section>

        {/* Bill Summary sidebar */}
        <aside className="space-y-4">
          <div className="sticky top-4 space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-slate-950 to-pink-900 text-white p-5 shadow-xl">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-white/70 mb-3">💰 Bill Summary</div>

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-white/70">Base Price</span><span className="font-bold tabular-nums">{formatPKR(order.basePrice)}</span></div>
                {order.customizationCharges > 0 && (
                  <div className="flex justify-between"><span className="text-white/70">Customization</span><span className="font-bold tabular-nums">{formatPKR(order.customizationCharges)}</span></div>
                )}
                {order.photoCakeCharges > 0 && (
                  <div className="flex justify-between text-fuchsia-300"><span>Photo Cake</span><span className="font-bold tabular-nums">{formatPKR(order.photoCakeCharges)}</span></div>
                )}
                {order.deliveryCharges > 0 && (
                  <div className="flex justify-between text-blue-300"><span>Delivery</span><span className="font-bold tabular-nums">{formatPKR(order.deliveryCharges)}</span></div>
                )}
                {order.taxAmount > 0 && (
                  <div className="flex justify-between"><span className="text-white/70">Tax</span><span className="font-bold tabular-nums">{formatPKR(order.taxAmount)}</span></div>
                )}
                {order.discount > 0 && (
                  <div className="flex justify-between text-rose-300"><span>Discount</span><span className="font-bold tabular-nums">-{formatPKR(order.discount)}</span></div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-white/20 flex justify-between items-center">
                <span className="text-sm font-extrabold text-emerald-300">TOTAL</span>
                <span className="text-3xl font-extrabold text-emerald-300 tabular-nums">{formatPKR(order.total)}</span>
              </div>

              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/70">Advance Required</span>
                  <span className="font-extrabold text-amber-300 tabular-nums">{formatPKR(order.advanceRequired)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Paid</span>
                  <span className="font-extrabold text-emerald-300 tabular-nums">{formatPKR(order.paidAmount)}</span>
                </div>
                {remaining > 0 && (
                  <div className="flex justify-between">
                    <span className="text-amber-300 font-extrabold">Remaining</span>
                    <span className="font-extrabold text-amber-300 tabular-nums">{formatPKR(remaining)}</span>
                  </div>
                )}
                {isFullyPaid && (
                  <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/30 text-emerald-200 text-xs font-extrabold">
                    <CheckCircle2 className="h-3 w-3" />
                    PAID IN FULL
                  </div>
                )}
              </div>

              {!isFullyPaid && !['CANCELLED', 'REFUNDED'].includes(order.status) && (
                <Button size="lg" className="w-full mt-4 bg-white text-slate-900 hover:bg-slate-100" onClick={() => setShowPayment(true)}>
                  <CreditCard className="h-4 w-4" />
                  Add Payment
                </Button>
              )}
            </div>
          </div>
        </aside>
      </div>

      {showPayment && (
        <PaymentModal orderId={id!} remaining={remaining} onClose={() => setShowPayment(false)} onDone={() => { setShowPayment(false); refetch(); }} />
      )}
      {showRating && (
        <RatingModal orderId={id!} onClose={() => setShowRating(false)} onDone={() => { setShowRating(false); refetch(); }} />
      )}
    </div>
  );
}

function PaymentModal({ orderId, remaining, onClose, onDone }: any) {
  const [amount, setAmount] = useState(remaining);
  const payMutation = useMutation({
    mutationFn: () => cakeOrdersApi.addPayment(orderId, amount),
    onSuccess: () => { toast.success('Payment added'); onDone(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b bg-pink-50 dark:bg-pink-950/30 flex items-center justify-between">
          <h3 className="font-extrabold">Add Payment</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <input type="number" step="0.01" autoFocus value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="h-14 w-full rounded-xl border-2 border-pink-300 bg-pink-50 dark:bg-pink-950/30 px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-pink-500" />
          <div className="flex gap-1">
            {[0.25, 0.5, 0.75, 1].map((f) => (
              <button key={f} onClick={() => setAmount(Number((remaining * f).toFixed(2)))} className="flex-1 h-8 rounded-lg bg-slate-100 dark:bg-neutral-800 text-xs font-extrabold hover:bg-slate-200">
                {(f * 100).toFixed(0)}%
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-pink-600 to-fuchsia-700" onClick={() => payMutation.mutate()} loading={payMutation.isPending} disabled={amount <= 0}>
              <CheckCircle2 className="h-4 w-4" />
              Confirm
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RatingModal({ orderId, onClose, onDone }: any) {
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  const rateMutation = useMutation({
    mutationFn: () => cakeOrdersApi.rate(orderId, rating, feedback || undefined, photoUrls.length > 0 ? photoUrls : undefined),
    onSuccess: () => { toast.success('Rating saved'); onDone(); },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b bg-amber-50 dark:bg-amber-950/30 flex items-center justify-between">
          <h3 className="font-extrabold">Rate Order</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="text-center">
            <div className="flex justify-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} className="transition-transform hover:scale-110">
                  <Star className={'h-12 w-12 ' + (n <= rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300')} />
                </button>
              ))}
            </div>
            <div className="text-2xl font-extrabold text-amber-700">{rating}/5</div>
          </div>
          <textarea rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Customer feedback..." className="w-full rounded-xl border-2 border-slate-200 bg-white dark:bg-neutral-800 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-amber-500 resize-none" />
          <div>
            <label className="text-[10px] uppercase font-extrabold text-slate-600 mb-1 block">Final Delivery Photos</label>
            {photoUrls.length > 0 && (
              <div className="grid grid-cols-4 gap-1 mb-2">
                {photoUrls.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => setPhotoUrls(photoUrls.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 h-5 w-5 rounded-bl bg-rose-600 text-white flex items-center justify-center">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <UploadDropzone onUploaded={(records) => {
              const urls = Array.isArray(records) ? records.map((r: any) => r.url || r).filter(Boolean) : [(records as any)?.url || records];
              setPhotoUrls([...photoUrls, ...urls]);
            }} />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600" onClick={() => rateMutation.mutate()} loading={rateMutation.isPending}>
              <Star className="h-4 w-4" />
              Save Rating
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
