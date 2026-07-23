import { Truck, Package, Clock, MapPinned } from 'lucide-react';
import type { MarketplaceProfile } from '../api/marketplace-settings.api';

interface Props {
  s: MarketplaceProfile;
  set: <K extends keyof MarketplaceProfile>(key: K, value: MarketplaceProfile[K]) => void;
}

export default function DeliverySection({ s, set }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <ToggleCard
          icon={Truck}
          color="emerald"
          label="Home Delivery"
          desc="Ghar tak delivery karein"
          checked={s.offersDelivery ?? true}
          onChange={(v: boolean) => set('offersDelivery', v)}
        />
        <ToggleCard
          icon={Package}
          color="blue"
          label="Pickup Service"
          desc="Customer aap ki shop se pickup kare"
          checked={s.offersPickup ?? true}
          onChange={(v: boolean) => set('offersPickup', v)}
        />
      </div>

      {s.offersDelivery && (
        <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-5 space-y-4">
          <h4 className="text-sm font-black text-emerald-900 flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Delivery Configuration
          </h4>

          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Delivery Fee" hint="PKR">
              <input
                type="number"
                value={s.deliveryFee ?? 0}
                onChange={(e) => set('deliveryFee', Number(e.target.value))}
                className="w-full h-11 px-3 rounded-xl border-2 border-emerald-300 bg-white text-sm font-bold outline-none focus:border-emerald-500"
              />
            </Field>

            <Field label="Free Delivery Above" hint="Optional (PKR)">
              <input
                type="number"
                value={s.freeDeliveryAbove ?? ''}
                onChange={(e) => set('freeDeliveryAbove', e.target.value ? Number(e.target.value) : null)}
                placeholder="e.g. 1000"
                className="w-full h-11 px-3 rounded-xl border-2 border-emerald-300 bg-white text-sm outline-none focus:border-emerald-500"
              />
            </Field>

            <Field label="Min Order Amount" hint="PKR">
              <input
                type="number"
                value={s.minOrderAmount ?? 0}
                onChange={(e) => set('minOrderAmount', Number(e.target.value))}
                className="w-full h-11 px-3 rounded-xl border-2 border-emerald-300 bg-white text-sm outline-none focus:border-emerald-500"
              />
            </Field>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Estimated Delivery Time" hint="Minutes">
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
                <input
                  type="number"
                  value={s.estimatedDeliveryMinutes ?? 30}
                  onChange={(e) => set('estimatedDeliveryMinutes', Number(e.target.value))}
                  className="w-full h-11 pl-10 pr-3 rounded-xl border-2 border-emerald-300 bg-white text-sm outline-none focus:border-emerald-500"
                />
              </div>
            </Field>

            <Field label="Delivery Radius" hint="Kilometers">
              <div className="relative">
                <MapPinned className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
                <input
                  type="number"
                  value={s.deliveryRadiusKm ?? 5}
                  onChange={(e) => set('deliveryRadiusKm', Number(e.target.value))}
                  className="w-full h-11 pl-10 pr-3 rounded-xl border-2 border-emerald-300 bg-white text-sm outline-none focus:border-emerald-500"
                />
              </div>
            </Field>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleCard({ icon: Icon, color, label, desc, checked, onChange }: any) {
  const colors: any = {
    emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-50', border: 'border-emerald-500' },
    blue: { bg: 'bg-blue-500', light: 'bg-blue-50', border: 'border-blue-500' },
  };
  const c = colors[color];
  return (
    <label className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition ${
      checked ? `${c.light} ${c.border}` : 'bg-white border-slate-200 hover:border-slate-300'
    }`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
        checked ? `${c.bg} text-white` : 'bg-slate-100 text-slate-500'
      }`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-black text-sm text-slate-900">{label}</div>
        <div className="text-xs text-slate-500 font-medium mt-0.5">{desc}</div>
      </div>
      <div className={`h-6 w-11 rounded-full transition ${checked ? c.bg : 'bg-slate-200'} relative`}>
        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`} />
      </div>
    </label>
  );
}

function Field({ label, hint, children }: any) {
  return (
    <div>
      <label className="text-xs font-black text-emerald-900 mb-1.5 block">{label}</label>
      {children}
      {hint && <p className="text-xs text-emerald-700 mt-1 font-medium">{hint}</p>}
    </div>
  );
}
