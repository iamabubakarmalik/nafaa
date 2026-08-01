import { useState } from 'react';
import {
  X, Truck, Calendar, Clock, MapPin, User, Phone, MessageCircle,
  CheckCircle2, Zap, Sunrise, Sun, Sunset, Store, Heart,
} from 'lucide-react';
import { Button } from '@core/ui/Button';
import { formatPKR } from '@core/lib/format';

export interface DeliveryDetails {
  orderType: string;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  city: string;
  area: string;
  landmark: string;
  messageCard: string;
  isAnonymous: boolean;
  senderName: string;
  deliveryTimeSlot: string;
  scheduledDeliveryDate: string;
  scheduledDeliveryTime: string;
  deliveryCharge: number;
  wrappingCharge: number;
  specialInstructions: string;
  eventName: string;
  eventVenue: string;
}

interface Props {
  cartTotal: number;
  customerName?: string;
  customerPhone?: string;
  initial?: Partial<DeliveryDetails>;
  onConfirm: (d: DeliveryDetails) => void;
  onClose: () => void;
}

const TIME_SLOTS = [
  { v: 'MORNING', l: 'Morning', desc: '9 AM – 12 PM', icon: Sunrise, tone: 'amber' },
  { v: 'AFTERNOON', l: 'Afternoon', desc: '12 PM – 4 PM', icon: Sun, tone: 'blue' },
  { v: 'EVENING', l: 'Evening', desc: '4 PM – 8 PM', icon: Sunset, tone: 'violet' },
  { v: 'EXPRESS', l: 'Express', desc: 'Within 2 hours', icon: Zap, tone: 'rose' },
  { v: 'SCHEDULED', l: 'Exact Time', desc: 'Pick a time', icon: Clock, tone: 'slate' },
];

const ORDER_TYPES = [
  { v: 'WALK_IN', l: 'Walk-in', icon: Store, desc: 'Customer collects now' },
  { v: 'DELIVERY', l: 'Delivery', icon: Truck, desc: 'Send to an address' },
  { v: 'PHONE_ORDER', l: 'Phone Order', icon: Phone, desc: 'Ordered by phone' },
  { v: 'EVENT_ORDER', l: 'Event', icon: Heart, desc: 'Function / venue' },
];

const DELIVERY_PRESETS = [0, 150, 200, 300, 500];
const WRAP_PRESETS = [0, 100, 200, 350, 500];

const MESSAGE_TEMPLATES = [
  'Happy Birthday! 🎂',
  'Happy Anniversary! 💕',
  'Congratulations! 🎉',
  'Get Well Soon 🌼',
  'With Deepest Sympathy 🕊️',
  'Thinking of You 💐',
  'Thank You 🙏',
  'I\'m Sorry 💌',
];

const CITIES = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta'];

export function DeliverySchedulerModal({ cartTotal, customerName, customerPhone, initial, onConfirm, onClose }: Props) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [d, setD] = useState<DeliveryDetails>({
    orderType: initial?.orderType ?? 'DELIVERY',
    recipientName: initial?.recipientName ?? '',
    recipientPhone: initial?.recipientPhone ?? '',
    deliveryAddress: initial?.deliveryAddress ?? '',
    city: initial?.city ?? '',
    area: initial?.area ?? '',
    landmark: initial?.landmark ?? '',
    messageCard: initial?.messageCard ?? '',
    isAnonymous: initial?.isAnonymous ?? false,
    senderName: initial?.senderName ?? customerName ?? '',
    deliveryTimeSlot: initial?.deliveryTimeSlot ?? 'AFTERNOON',
    scheduledDeliveryDate: initial?.scheduledDeliveryDate ?? todayStr,
    scheduledDeliveryTime: initial?.scheduledDeliveryTime ?? '',
    deliveryCharge: initial?.deliveryCharge ?? 0,
    wrappingCharge: initial?.wrappingCharge ?? 0,
    specialInstructions: initial?.specialInstructions ?? '',
    eventName: initial?.eventName ?? '',
    eventVenue: initial?.eventVenue ?? '',
  });

  const needsAddress = d.orderType === 'DELIVERY' || d.orderType === 'EVENT_ORDER';
  const grandTotal = cartTotal + Number(d.deliveryCharge || 0) + Number(d.wrappingCharge || 0);

  const valid = !needsAddress || (d.recipientName.trim() && d.deliveryAddress.trim());

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-3xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[96vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in duration-200">

        <div className="shrink-0 bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white px-5 py-4">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs uppercase font-extrabold text-white/70 tracking-wider inline-flex items-center gap-1">
              <Truck className="h-3 w-3" /> Order & Delivery Details
            </div>
            <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition">
              <X className="h-5 w-5" />
            </button>
          </div>
          <h3 className="text-2xl font-extrabold">Where is this going?</h3>
          <p className="text-sm font-bold text-pink-200 mt-0.5">Cart total {formatPKR(cartTotal)}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* ORDER TYPE */}
          <div>
            <Lbl>Order Type</Lbl>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ORDER_TYPES.map((t) => {
                const a = d.orderType === t.v;
                const Icon = t.icon;
                return (
                  <button key={t.v} type="button" onClick={() => setD({ ...d, orderType: t.v })}
                    className={`p-3 rounded-2xl border-2 transition text-left ${
                      a ? 'border-pink-600 bg-pink-600 text-white shadow-md scale-[1.02]' : 'border-slate-200 bg-white text-slate-700 hover:border-pink-400'}`}>
                    <Icon className="h-5 w-5 mb-1" />
                    <div className="font-extrabold text-sm">{t.l}</div>
                    <div className={`text-[10px] font-semibold ${a ? 'text-white/80' : 'text-slate-500'}`}>{t.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RECIPIENT */}
          {needsAddress && (
            <>
              <section className="rounded-2xl border-2 border-pink-200 bg-pink-50/50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-pink-700" />
                  <h4 className="font-extrabold text-pink-900 text-sm">Recipient</h4>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Lbl>Recipient Name *</Lbl>
                    <input autoFocus value={d.recipientName}
                      onChange={(e) => setD({ ...d, recipientName: e.target.value })}
                      placeholder="Who receives the flowers"
                      className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-base font-bold focus:outline-none focus:border-pink-500" />
                  </div>
                  <div>
                    <Lbl>Recipient Phone</Lbl>
                    <input value={d.recipientPhone}
                      onChange={(e) => setD({ ...d, recipientPhone: e.target.value })}
                      placeholder="03XX XXXXXXX"
                      className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-base font-bold focus:outline-none focus:border-pink-500" />
                  </div>
                </div>

                <div>
                  <Lbl>Delivery Address *</Lbl>
                  <textarea rows={2} value={d.deliveryAddress}
                    onChange={(e) => setD({ ...d, deliveryAddress: e.target.value })}
                    placeholder="House / flat, street, block..."
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:border-pink-500" />
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <Lbl>City</Lbl>
                    <input list="cityList" value={d.city} onChange={(e) => setD({ ...d, city: e.target.value })}
                      placeholder="Karachi"
                      className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
                    <datalist id="cityList">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>
                  </div>
                  <div>
                    <Lbl>Area / Sector</Lbl>
                    <input value={d.area} onChange={(e) => setD({ ...d, area: e.target.value })}
                      placeholder="DHA Phase 5"
                      className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
                  </div>
                  <div>
                    <Lbl>Landmark</Lbl>
                    <input value={d.landmark} onChange={(e) => setD({ ...d, landmark: e.target.value })}
                      placeholder="Near mosque"
                      className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
                  </div>
                </div>
              </section>

              {/* EVENT */}
              {d.orderType === 'EVENT_ORDER' && (
                <section className="rounded-2xl border-2 border-rose-200 bg-rose-50/50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-rose-700" />
                    <h4 className="font-extrabold text-rose-900 text-sm">Event Details</h4>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Lbl>Event Name</Lbl>
                      <input value={d.eventName} onChange={(e) => setD({ ...d, eventName: e.target.value })}
                        placeholder="Ahmed & Sara Nikkah"
                        className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
                    </div>
                    <div>
                      <Lbl>Venue</Lbl>
                      <input value={d.eventVenue} onChange={(e) => setD({ ...d, eventVenue: e.target.value })}
                        placeholder="Pearl Continental Hall"
                        className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
                    </div>
                  </div>
                </section>
              )}

              {/* TIME SLOT */}
              <section className="rounded-2xl border-2 border-amber-200 bg-amber-50/50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-700" />
                  <h4 className="font-extrabold text-amber-900 text-sm">Delivery Timing</h4>
                </div>

                <div>
                  <Lbl>Time Slot</Lbl>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {TIME_SLOTS.map((s) => {
                      const a = d.deliveryTimeSlot === s.v;
                      const Icon = s.icon;
                      const tones: Record<string, string> = {
                        amber: 'border-amber-500 bg-amber-500 text-white',
                        blue: 'border-blue-500 bg-blue-500 text-white',
                        violet: 'border-violet-500 bg-violet-500 text-white',
                        rose: 'border-rose-500 bg-rose-500 text-white',
                        slate: 'border-slate-600 bg-slate-600 text-white',
                      };
                      return (
                        <button key={s.v} type="button" onClick={() => setD({ ...d, deliveryTimeSlot: s.v })}
                          className={`p-2.5 rounded-xl border-2 transition flex flex-col items-center gap-1 ${
                            a ? `${tones[s.tone]} shadow-md scale-[1.02]` : 'border-slate-200 bg-white text-slate-700 hover:border-amber-400'}`}>
                          <Icon className="h-5 w-5" />
                          <div className="text-[11px] font-extrabold">{s.l}</div>
                          <div className={`text-[9px] font-semibold ${a ? 'text-white/85' : 'text-slate-500'}`}>{s.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Lbl><Calendar className="h-3 w-3 inline mr-1" /> Delivery Date</Lbl>
                    <input type="date" value={d.scheduledDeliveryDate} min={todayStr}
                      onChange={(e) => setD({ ...d, scheduledDeliveryDate: e.target.value })}
                      className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
                    <div className="mt-1.5 flex gap-1.5">
                      {[
                        { l: 'Today', d: 0 },
                        { l: 'Tomorrow', d: 1 },
                        { l: '+2 days', d: 2 },
                      ].map((q) => (
                        <button key={q.l} type="button"
                          onClick={() => {
                            const dt = new Date(); dt.setDate(dt.getDate() + q.d);
                            setD({ ...d, scheduledDeliveryDate: dt.toISOString().slice(0, 10) });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white border-2 border-amber-200 hover:border-amber-400 text-amber-800 text-[10px] font-extrabold">
                          {q.l}
                        </button>
                      ))}
                    </div>
                  </div>
                  {d.deliveryTimeSlot === 'SCHEDULED' && (
                    <div>
                      <Lbl>Exact Time</Lbl>
                      <input type="time" value={d.scheduledDeliveryTime}
                        onChange={(e) => setD({ ...d, scheduledDeliveryTime: e.target.value })}
                        className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
                    </div>
                  )}
                </div>
              </section>

              {/* MESSAGE CARD */}
              <section className="rounded-2xl border-2 border-violet-200 bg-violet-50/50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-violet-700" />
                  <h4 className="font-extrabold text-violet-900 text-sm">Message Card</h4>
                </div>

                <div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {MESSAGE_TEMPLATES.map((m) => (
                      <button key={m} type="button" onClick={() => setD({ ...d, messageCard: m })}
                        className="px-2.5 py-1 rounded-lg bg-white border-2 border-violet-200 hover:border-violet-400 text-violet-800 text-[10px] font-extrabold">
                        {m}
                      </button>
                    ))}
                  </div>
                  <textarea rows={3} value={d.messageCard}
                    onChange={(e) => setD({ ...d, messageCard: e.target.value })}
                    placeholder="Write the card message here..."
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:border-violet-500" />
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Lbl>From (Sender Name)</Lbl>
                    <input value={d.senderName} onChange={(e) => setD({ ...d, senderName: e.target.value })}
                      disabled={d.isAnonymous}
                      placeholder={customerName || 'Sender name'}
                      className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-violet-500 disabled:opacity-50" />
                  </div>
                  <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 bg-white hover:border-violet-300 cursor-pointer self-end">
                    <input type="checkbox" checked={d.isAnonymous}
                      onChange={(e) => setD({ ...d, isAnonymous: e.target.checked })}
                      className="h-5 w-5 rounded" />
                    <div className="flex-1">
                      <div className="font-extrabold text-sm text-slate-900">Anonymous</div>
                      <div className="text-[10px] text-slate-500 font-semibold">Hide sender name</div>
                    </div>
                  </label>
                </div>
              </section>
            </>
          )}

          {/* CHARGES */}
          <section className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-emerald-700" />
              <h4 className="font-extrabold text-emerald-900 text-sm">Extra Charges</h4>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Lbl>Delivery Charge</Lbl>
                <input type="number" value={d.deliveryCharge}
                  onChange={(e) => setD({ ...d, deliveryCharge: Math.max(0, Number(e.target.value)) })}
                  className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-lg font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {DELIVERY_PRESETS.map((p) => (
                    <button key={p} type="button" onClick={() => setD({ ...d, deliveryCharge: p })}
                      className="px-2.5 py-1 rounded-lg bg-white border-2 border-emerald-200 hover:border-emerald-400 text-emerald-800 text-[10px] font-extrabold">
                      {p === 0 ? 'Free' : formatPKR(p)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Lbl>Wrapping / Extras</Lbl>
                <input type="number" value={d.wrappingCharge}
                  onChange={(e) => setD({ ...d, wrappingCharge: Math.max(0, Number(e.target.value)) })}
                  className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-lg font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {WRAP_PRESETS.map((p) => (
                    <button key={p} type="button" onClick={() => setD({ ...d, wrappingCharge: p })}
                      className="px-2.5 py-1 rounded-lg bg-white border-2 border-emerald-200 hover:border-emerald-400 text-emerald-800 text-[10px] font-extrabold">
                      {p === 0 ? 'None' : formatPKR(p)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Lbl>Special Instructions</Lbl>
              <input value={d.specialInstructions}
                onChange={(e) => setD({ ...d, specialInstructions: e.target.value })}
                placeholder="Ring the bell twice, leave with guard..."
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
            </div>
          </section>

          {/* TOTAL PREVIEW */}
          <section className="rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white p-4 space-y-1.5">
            <BillRow label="Items" value={formatPKR(cartTotal)} />
            {d.deliveryCharge > 0 && <BillRow label="Delivery" value={formatPKR(d.deliveryCharge)} />}
            {d.wrappingCharge > 0 && <BillRow label="Wrapping" value={formatPKR(d.wrappingCharge)} />}
            <div className="pt-2 border-t border-white/25 flex items-center justify-between">
              <div className="text-sm font-extrabold uppercase tracking-wider">Grand Total</div>
              <div className="text-3xl font-extrabold tabular-nums">{formatPKR(grandTotal)}</div>
            </div>
          </section>
        </div>

        <div className="shrink-0 px-5 py-3 border-t-2 border-slate-100 bg-slate-50 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-gradient-to-r from-pink-500 to-rose-600"
            onClick={() => onConfirm(d)} disabled={!valid}>
            <CheckCircle2 className="h-4 w-4" /> Continue to Payment
          </Button>
        </div>
      </div>
    </div>
  );
}

function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}
function BillRow({ label, value }: any) {
  return (
    <div className="flex items-center justify-between text-sm font-bold">
      <span className="text-white/85">{label}</span>
      <span className="tabular-nums font-extrabold">{value}</span>
    </div>
  );
}
