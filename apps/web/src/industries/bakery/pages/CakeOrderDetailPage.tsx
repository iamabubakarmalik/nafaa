/**
 * One cake order: the step it is at with the next step one tap away, the
 * cake and its design with photos, occasion, pickup or delivery, the money
 * with advance and balance, the bill once handed over, the timeline and the
 * customer's rating. Prints the customer or kitchen slip.
 *
 * Keys: P slip · K kitchen slip · E edit · Esc back.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, Ban, Cake, CheckCircle2, ChefHat, Clock, Heart, History, ImageIcon, MapPin, MessageCircle, PartyPopper, Pencil, Phone, Printer,
  Receipt, Star, StickyNote, Undo2, User, Wallet,
} from 'lucide-react';
import { Button, Card, Kbd, Modal, PageShell, Skeleton, Textarea } from '@/design-system/components';
import { UploadDropzone } from '@core/components/uploads';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { useReceiptSetup } from '@core/receipt/setup';
import { cakeOrdersApi, type CakeOrder } from '../api/cake-orders.api';
import { useCakeActions } from '../components/cake/useCakeActions';
import { cakeMessage, printCakeSlip } from '../components/orderSlip';
import {
  CAKE_FLOW, CAKE_KEY, CAKE_PREV, apiError, cakeNext, creamLabel, dateTime, dayOnly, deliveryOf, dueOf, flavorLabel, flowIndex, hoursTo, isClosed,
  isDelivery, leftText, occasionOf, shapeLabel, sizeLabel, statusOf, waLink,
} from '../components/meta';

export default function CakeOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Bakery';
  const canManage = usePermission(PERMISSIONS.BAKERY_ORDERS_MANAGE);
  const [rating, setRating] = useState(false);
  useReceiptSetup();

  const q = useQuery({ queryKey: [CAKE_KEY, 'one', id], queryFn: () => cakeOrdersApi.getOne(id!), enabled: !!id, refetchInterval: 30_000 });
  const o = q.data;
  const billQ = useQuery({ queryKey: [CAKE_KEY, 'bill', id], queryFn: () => cakeOrdersApi.bill(id!), enabled: !!id && o?.status === 'DELIVERED' });
  const act = useCakeActions(shopName);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!o || e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === 'p' || e.key === 'P') printCakeSlip(o, shopName);
      if (e.key === 'k' || e.key === 'K') printCakeSlip(o, shopName, true);
      if ((e.key === 'e' || e.key === 'E') && canManage && !isClosed(o.status)) navigate(`/bakery/cake-orders/${o.id}/edit`);
      if (e.key === 'Escape') navigate('/bakery/cake-orders');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [o, shopName, canManage, navigate]);

  if (q.isLoading) return <PageShell><Skeleton className="h-32 rounded-3xl" /><div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"><Skeleton className="h-96 rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></div></PageShell>;
  if (!o) return <PageShell><div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">Yeh order nahi mila</p><Button className="mt-3" variant="secondary" onClick={() => navigate('/bakery/cake-orders')}>Orders par wapas</Button></div></PageShell>;

  const st = statusOf(o.status);
  const closed = isClosed(o.status);
  const next = cakeNext(o);
  const left = hoursTo(o.neededBy);
  const late = !closed && left !== null && left < 0;
  const due = dueOf(o);
  const advanceShort = !closed && !['DRAFT', 'QUOTED'].includes(o.status) ? Math.max(o.advanceRequired - o.paidAmount, 0) : 0;
  const wa = waLink(o.customerPhone, cakeMessage(o, shopName));
  const idx = flowIndex(o.status);
  const Del = deliveryOf(o.deliveryType).icon;
  const busy = act.busyId === o.id;

  return (
    <PageShell>
      <div className="rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-4 text-white shadow-lg sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => navigate('/bakery/cake-orders')} aria-label="Wapas (Esc)" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/25"><ArrowLeft className="h-4 w-4" /></button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-bold">{o.customerName}</h1>
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[0.75rem] font-semibold ring-1 ring-white/25">{st.label}</span>
              <span className="font-mono text-[0.75rem] text-white/70">{o.orderNumber}</span>
            </div>
            <p className={cn('mt-0.5 flex items-center gap-1.5 text-[0.8125rem]', late ? 'font-semibold text-rose-200' : 'text-white/80')}>
              <Clock className="h-3.5 w-3.5" />{closed ? dateTime(o.neededBy) : `${leftText(left)} · ${dateTime(o.neededBy)}`} · <Del className="h-3.5 w-3.5" />{deliveryOf(o.deliveryType).label}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => printCakeSlip(o, shopName)} title="Customer parchi (P)" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-2.5 text-[0.8125rem] font-semibold ring-1 ring-white/25 hover:bg-white/25"><Printer className="h-4 w-4" />Parchi</button>
            <button type="button" onClick={() => printCakeSlip(o, shopName, true)} title="Kitchen parchi (K)" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-2.5 text-[0.8125rem] font-semibold ring-1 ring-white/25 hover:bg-white/25"><ChefHat className="h-4 w-4" />Kitchen</button>
            {wa && <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white/15 px-2.5 text-[0.8125rem] font-semibold ring-1 ring-white/25 hover:bg-white/25"><MessageCircle className="h-4 w-4" />WhatsApp</a>}
            {canManage && !closed && <Link to={`/bakery/cake-orders/${o.id}/edit`} title="Badlein (E)" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-[0.8125rem] font-bold text-brand-800 hover:bg-brand-50"><Pencil className="h-4 w-4" />Badlein</Link>}
          </div>
        </div>
        {o.status !== 'CANCELLED' && o.status !== 'REFUNDED' && (
          <ol className="mt-4 grid grid-cols-5 gap-1.5">
            {CAKE_FLOW.map((s, i) => (
              <li key={s} className="min-w-0">
                <div className={cn('h-1.5 rounded-full', i <= idx ? 'bg-white' : 'bg-white/25')} />
                <p className={cn('mt-1 truncate text-[0.6875rem]', i === idx ? 'font-bold text-white' : 'text-white/60')}>{statusOf(s).label}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      {canManage && !closed && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/80">
          {next && <Button variant={next.to === 'DELIVER' ? 'success' : 'primary'} loading={busy} onClick={() => act.next(o)} leftIcon={next.to === 'DELIVER' ? <Receipt className="h-4 w-4" /> : <ChefHat className="h-4 w-4" />}>{next.label}</Button>}
          {due > 0.5 && <Button variant="secondary" onClick={() => act.pay(o)} leftIcon={<Wallet className="h-4 w-4" />}>Paisa mila</Button>}
          {CAKE_PREV[o.status] && <Button variant="ghost" disabled={busy} onClick={() => act.back(o)} leftIcon={<Undo2 className="h-4 w-4" />}>Ek qadam peeche</Button>}
          <Button variant="ghost" className="ml-auto text-rose-700" onClick={() => act.cancel(o)} leftIcon={<Ban className="h-4 w-4" />}>Cancel</Button>
        </div>
      )}
      {canManage && o.status === 'CANCELLED' && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-[0.8125rem] text-rose-900 ring-1 ring-rose-200">
          <Ban className="h-4 w-4" /> Cancel hua {dateTime(o.cancelledAt)}{o.cancellationReason ? ` — ${o.cancellationReason}` : ''}
          <Button size="sm" variant="secondary" className="ml-auto" loading={busy} onClick={() => act.confirm(o)}>Dobara pakka karein</Button>
        </div>
      )}
      {advanceShort > 0.5 && <p className="rounded-2xl bg-amber-50 px-4 py-2.5 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">Advance me {formatPKR(advanceShort)} kam hai — bara cake bina advance ke na banayein.</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={Cake}>Cake</T>}>
            <dl className="grid gap-x-6 gap-y-2 text-[0.8125rem] sm:grid-cols-2">
              <Fact k="Size" v={o.size === 'CUSTOM' && o.customWeightKg ? `${o.customWeightKg} kg` : sizeLabel(o.size)} />
              <Fact k="Shakal" v={o.shape === 'CUSTOM_SHAPE' ? o.customShapeDesc || 'Apni' : shapeLabel(o.shape)} />
              <Fact k="Flavour" v={o.flavor === 'CUSTOM_FLAVOR' ? o.customFlavorDesc || 'Apna' : flavorLabel(o.flavor)} />
              <Fact k="Cream" v={o.creamType ? creamLabel(o.creamType) : '—'} />
              {o.numberOfTiers > 1 && <Fact k="Manzil" v={String(o.numberOfTiers)} />}
              {o.numberOrLetter && <Fact k="Number / harf" v={o.numberOrLetter} />}
              {o.productName && <Fact k="Maal se jura" v={o.productName} />}
            </dl>
            {o.messageOnCake && (
              <div className="mt-3 rounded-xl bg-fuchsia-50 px-3 py-2.5 ring-1 ring-fuchsia-100">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-fuchsia-700">Cake par likhna hai{o.messageColor ? ` · ${o.messageColor}` : ''}</p>
                <p className="text-lg font-bold text-slate-900">"{o.messageOnCake}"</p>
              </div>
            )}
            {(o.isEggless || o.isSugarFree || o.isVegan || o.allergies?.length > 0 || o.dietaryNotes) && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[0.75rem]">
                <Heart className="h-4 w-4 text-rose-500" />
                {o.isEggless && <Pill>Anday ke bagair</Pill>}
                {o.isSugarFree && <Pill>Cheeni ke bagair</Pill>}
                {o.isVegan && <Pill>Vegan</Pill>}
                {(o.allergies ?? []).map((a) => <Pill key={a} danger>Allergy: {a}</Pill>)}
                {o.dietaryNotes && <span className="text-slate-600">{o.dietaryNotes}</span>}
              </div>
            )}
          </Card>

          <Card className="rounded-2xl" title={<T icon={ImageIcon}>Design</T>}>
            <div className="space-y-3 text-[0.8125rem]">
              {o.designInstructions ? <p className="whitespace-pre-line rounded-xl bg-slate-50 px-3 py-2.5 text-slate-800">{o.designInstructions}</p> : <p className="text-slate-500">Design ki details nahi likhi</p>}
              {(o.colorTheme || o.primaryColor) && <p className="text-slate-700">{[o.colorTheme && `Theme: ${o.colorTheme}`, o.primaryColor && `Rang: ${o.primaryColor}${o.secondaryColor ? ` + ${o.secondaryColor}` : ''}`].filter(Boolean).join(' · ')}</p>}
              {o.decorativeItems?.length > 0 && <div className="flex flex-wrap gap-1.5">{o.decorativeItems.map((d) => <Pill key={d}>{d}</Pill>)}</div>}
              {(o.candlesRequired || o.cakeStand || o.cakeKnife) && <p className="text-slate-700">{[o.candlesRequired ? `${o.candlesRequired} mombatti${o.candleType ? ` (${o.candleType})` : ''}` : '', o.cakeStand && 'Cake stand', o.cakeKnife && 'Chhuri'].filter(Boolean).join(' · ')}</p>}
              {(o.hasPhotoOnCake || o.designReferenceUrls?.length > 0) && (
                <div className="flex flex-wrap gap-2">
                  {o.hasPhotoOnCake && o.photoUrl && <Photo url={o.photoUrl} label={`Cake ki photo${o.hasEdibleImage ? ' · edible' : ''}`} />}
                  {(o.designReferenceUrls ?? []).map((u, i) => <Photo key={u} url={u} label={`Misaal ${i + 1}`} />)}
                </div>
              )}
              {o.hasPhotoOnCake && !o.photoUrl && <p className="text-amber-800">Photo cake hai magar photo nahi lagi — customer se mangwa lein.</p>}
            </div>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="rounded-2xl" title={<T icon={PartyPopper}>Mauqa</T>}>
              <dl className="space-y-1.5 text-[0.8125rem]">
                <Fact k="Mauqa" v={`${occasionOf(o.occasion).emoji} ${occasionOf(o.occasion).label}`} />
                {o.celebrantName && <Fact k="Kis ke liye" v={`${o.celebrantName}${o.celebrantAge ? ` (${o.celebrantAge})` : ''}`} />}
                {o.eventDate && <Fact k="Function" v={`${dayOnly(o.eventDate)}${o.eventTime ? ` · ${o.eventTime}` : ''}`} />}
                {o.eventVenue && <Fact k="Jagah" v={o.eventVenue} />}
              </dl>
            </Card>
            <Card className="rounded-2xl" title={<T icon={MapPin}>{isDelivery(o.deliveryType) ? 'Pahunchana' : 'Dukaan se lena'}</T>}>
              <dl className="space-y-1.5 text-[0.8125rem]">
                <Fact k="Kab" v={dateTime(o.neededBy)} />
                <Fact k="Kaise" v={deliveryOf(o.deliveryType).label} />
                {o.deliveryAddress && <p className="text-slate-800">{o.deliveryAddress}{o.deliveryLandmark ? ` — ${o.deliveryLandmark}` : ''}</p>}
                {o.deliveryCharges > 0 && <Fact k="Delivery charges" v={formatPKR(o.deliveryCharges)} />}
              </dl>
            </Card>
          </div>

          {(o.specialInstructions || o.internalNotes) && (
            <Card className="rounded-2xl" title={<T icon={StickyNote}>Note</T>}>
              <div className="space-y-2 text-[0.8125rem]">
                {o.specialInstructions && <p><span className="text-slate-500">Customer ke liye: </span>{o.specialInstructions}</p>}
                {o.internalNotes && <p><span className="text-slate-500">Andar ke liye: </span>{o.internalNotes}</p>}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={Wallet}>Paisa</T>}>
            <dl className="space-y-1.5 text-[0.8125rem]">
              <Row k="Cake" v={formatPKR(o.basePrice)} />
              {o.customizationCharges > 0 && <Row k="Design" v={`+${formatPKR(o.customizationCharges)}`} />}
              {o.photoCakeCharges > 0 && <Row k="Photo cake" v={`+${formatPKR(o.photoCakeCharges)}`} />}
              {o.deliveryCharges > 0 && <Row k="Delivery" v={`+${formatPKR(o.deliveryCharges)}`} />}
              {o.taxAmount > 0 && <Row k="Tax" v={`+${formatPKR(o.taxAmount)}`} />}
              {o.discount > 0 && <Row k="Discount" v={`−${formatPKR(o.discount)}`} />}
              <Row k="Kul" v={formatPKR(o.total)} strong />
              <Row k="Advance chahiye tha" v={formatPKR(o.advanceRequired)} />
              <Row k="Mila" v={formatPKR(o.paidAmount)} />
            </dl>
            <div className={cn('mt-3 flex items-center justify-between rounded-xl px-3 py-2.5 ring-1', due > 0.5 ? 'bg-amber-50 ring-amber-200' : 'bg-success-50 ring-success-200')}>
              <span className="text-[0.8125rem] font-medium text-slate-700">{o.status === 'DELIVERED' ? (due > 0.5 ? 'Khate me gaya' : 'Poora mil gaya') : due > 0.5 ? 'Lete waqt baqi' : 'Poora mil gaya'}</span>
              <span className="text-lg font-bold tabular-nums text-slate-900">{formatPKR(due)}</span>
            </div>
            {o.status === 'DELIVERED' && billQ.data && (
              <Link to={`/sales/${billQ.data.id}/receipt`} className="mt-3 flex items-center justify-between rounded-xl bg-white px-3 py-2.5 text-[0.8125rem] ring-1 ring-slate-200 hover:bg-slate-50">
                <span className="inline-flex items-center gap-2 font-medium text-slate-800"><Receipt className="h-4 w-4 text-brand-600" />Bill {billQ.data.saleNumber}</span>
                <span className="text-brand-700">Dekhein →</span>
              </Link>
            )}
          </Card>

          <Card className="rounded-2xl" title={<T icon={User}>Customer</T>}>
            <p className="text-[0.9375rem] font-semibold text-slate-900">{o.customerName}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a href={`tel:${o.customerPhone}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-2.5 text-[0.8125rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Phone className="h-4 w-4" />{o.customerPhone}</a>
              {wa && <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.8125rem] font-semibold text-success-700 ring-1 ring-success-200 hover:bg-success-50"><MessageCircle className="h-4 w-4" />WhatsApp</a>}
              {o.customerId && <Link to={`/customers/${o.customerId}`} className="inline-flex h-8 items-center rounded-lg px-2.5 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-50">Customer ka khata →</Link>}
            </div>
            {o.customerEmail && <p className="mt-2 text-[0.75rem] text-slate-500">{o.customerEmail}</p>}
          </Card>

          <Card className="rounded-2xl" title={<T icon={History}>Kab kya hua</T>}>
            <ol className="space-y-2 text-[0.8125rem]">
              {[
                ['Order likha', o.createdAt], ['Pakka hua', o.confirmedAt], ['Banana shuru', o.startedAt], ['Tayyar hua', o.completedAt],
                ['De diya', o.deliveredAt], ['Cancel hua', o.cancelledAt],
              ].filter(([, at]) => at).map(([label, at]) => (
                <li key={label} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success-600" /><span className="flex-1 text-slate-700">{label}</span><span className="text-slate-500">{dateTime(at)}</span></li>
              ))}
            </ol>
          </Card>

          {o.status === 'DELIVERED' && (
            <Card className="rounded-2xl" title={<T icon={Star}>Customer ki raye</T>}
              actions={canManage && !o.customerRating ? <Button size="sm" variant="secondary" onClick={() => setRating(true)}>Raye likhein</Button> : undefined}>
              {o.customerRating ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1">{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={cn('h-5 w-5', n <= (o.customerRating ?? 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} />)}</div>
                  {o.customerFeedback && <p className="text-[0.8125rem] italic text-slate-700">"{o.customerFeedback}"</p>}
                  {o.finalPhotoUrls?.length > 0 && <div className="flex flex-wrap gap-2">{o.finalPhotoUrls.map((u, i) => <Photo key={u} url={u} label={`Bana hua ${i + 1}`} />)}</div>}
                </div>
              ) : <p className="text-[0.8125rem] text-slate-500">Abhi raye nahi likhi. Customer se pooch kar likhein — aur bane hue cake ki photo bhi lagayein.</p>}
            </Card>
          )}
        </div>
      </div>

      <p className="hidden items-center gap-2 text-[0.75rem] text-slate-500 sm:flex"><Kbd>P</Kbd> parchi · <Kbd>K</Kbd> kitchen parchi{canManage && !closed && <> · <Kbd>E</Kbd> badlein</>} · <Kbd>Esc</Kbd> wapas</p>

      {act.modals}
      {rating && <RatingModal o={o} onClose={() => setRating(false)} />}
    </PageShell>
  );
}

function RatingModal({ o, onClose }: { o: CakeOrder; onClose: () => void }) {
  const qc = useQueryClient();
  const [stars, setStars] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const save = useMutation({
    mutationFn: () => cakeOrdersApi.rate(o.id, stars, feedback.trim() || undefined, photos),
    onSuccess: () => { toast.success('Raye save ho gayi'); qc.invalidateQueries({ queryKey: [CAKE_KEY] }); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Save nahi hui')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title="Customer ki raye" description={`${o.customerName} · ${o.orderNumber}`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} onClick={() => save.mutate()} leftIcon={<Star className="h-4 w-4" />}>Save karein</Button></>}>
      <div className="space-y-3">
        <div className="flex justify-center gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setStars(n)} aria-label={`${n} sitare`}><Star className={cn('h-9 w-9', n <= stars ? 'fill-amber-400 text-amber-400' : 'text-slate-300')} /></button>
          ))}
        </div>
        <Textarea label="Customer ne kya kaha" value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={2} maxLength={500} />
        {photos.length > 0 && <div className="flex flex-wrap gap-2">{photos.map((u) => <img key={u} src={u} alt="" className="h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200" />)}</div>}
        <UploadDropzone maxFiles={4} purpose="product-image" hint="Bane hue cake ki photo — agle customer ko dikhane ke kaam aati hai" onUploaded={(r) => setPhotos((p) => [...p, ...r.map((x) => x.url).filter(Boolean)].slice(0, 4))} />
      </div>
    </Modal>
  );
}

function Photo({ url, label }: { url: string; label: string }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="group block w-24">
      <img src={url} alt={label} loading="lazy" className="h-24 w-24 rounded-xl object-cover ring-1 ring-slate-200 group-hover:ring-brand-400" />
      <span className="mt-0.5 block truncate text-[0.6875rem] text-slate-500">{label}</span>
    </a>
  );
}

function Pill({ children, danger }: { children: ReactNode; danger?: boolean }) {
  return <span className={cn('rounded-full px-2 py-0.5 text-[0.75rem] font-medium', danger ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700')}>{children}</span>;
}

function Fact({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-slate-500">{k}</dt><dd className="text-right font-medium text-slate-900">{v}</dd></div>;
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return <div className="flex justify-between gap-3"><dt className="text-slate-500">{k}</dt><dd className={cn('tabular-nums', strong ? 'font-bold text-slate-900' : 'font-medium text-slate-800')}>{v}</dd></div>;
}

const T = ({ icon: Icon, children }: { icon: typeof Cake; children: string }) => <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{children}</span>;
