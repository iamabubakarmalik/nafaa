import {
  Truck, Sunrise, Sunset, Package, DollarSign, AlertCircle,
  Home, Warehouse, ShoppingBag, Info, Sparkles,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import { formatPKRFull } from '@core/lib/format';
import type { DairyWizardAvailability, DairyWizardBasic } from '../../hooks/useDairyWizard';

interface Props {
  basic: DairyWizardBasic;
  availability: DairyWizardAvailability;
  onChange: (patch: Partial<DairyWizardAvailability>) => void;
  errors: string[];
}

export function DairyWizardStep3Availability({ basic, availability, onChange, errors }: Props) {
  const basePrice = Number(basic.salePrice || 0);

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900">
            <div className="font-extrabold mb-0.5">Fix before saving:</div>
            <ul className="list-disc pl-4 space-y-0.5">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-br from-fuchsia-50 to-white border-2 border-fuchsia-200 p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-fuchsia-600 text-white flex items-center justify-center shadow-md shrink-0">
          <Truck className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-extrabold text-fuchsia-900 text-sm">Availability & Delivery Options</h3>
          <p className="text-xs text-fuchsia-800 font-semibold mt-0.5 leading-relaxed">
            Slot-based pricing (morning/evening), bulk rates, home delivery — sab set karo aur customer ko clarity milegi.
          </p>
        </div>
      </div>

      {/* Delivery Slots */}
      <section className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 space-y-4">
        <SectionHeader icon={Sunrise} title="Delivery Time Slots" desc="Kab kab available hai" tone="amber" />

        <div className="grid sm:grid-cols-2 gap-3">
          <label className={[
            'flex items-center gap-3 cursor-pointer p-4 rounded-2xl border-2 transition',
            availability.availableMorning ? 'border-amber-500 bg-amber-50 shadow-md' : 'border-slate-200 bg-white hover:border-amber-300',
          ].join(' ')}>
            <input
              type="checkbox"
              checked={availability.availableMorning}
              onChange={(e) => onChange({ availableMorning: e.target.checked })}
              className="h-5 w-5 rounded"
            />
            <div className={[
              'h-12 w-12 rounded-2xl flex items-center justify-center shrink-0',
              availability.availableMorning ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500',
            ].join(' ')}>
              <Sunrise className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-base">🌅 Morning</div>
              <div className="text-xs text-slate-500 font-semibold">4 AM - 10 AM slot</div>
            </div>
          </label>

          <label className={[
            'flex items-center gap-3 cursor-pointer p-4 rounded-2xl border-2 transition',
            availability.availableEvening ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-slate-200 bg-white hover:border-indigo-300',
          ].join(' ')}>
            <input
              type="checkbox"
              checked={availability.availableEvening}
              onChange={(e) => onChange({ availableEvening: e.target.checked })}
              className="h-5 w-5 rounded"
            />
            <div className={[
              'h-12 w-12 rounded-2xl flex items-center justify-center shrink-0',
              availability.availableEvening ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500',
            ].join(' ')}>
              <Sunset className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-base">🌆 Evening</div>
              <div className="text-xs text-slate-500 font-semibold">4 PM - 9 PM slot</div>
            </div>
          </label>
        </div>

        {(availability.availableMorning || availability.availableEvening) && (
          <div className="grid sm:grid-cols-2 gap-4 pt-3 border-t-2 border-amber-100">
            {availability.availableMorning && (
              <div>
                <label className="text-xs uppercase font-extrabold text-amber-700 mb-1 block flex items-center gap-1">
                  <Sunrise className="h-3 w-3" /> Morning Price (PKR)
                </label>
                <input
                  type="number" step="0.01"
                  value={availability.morningPrice}
                  onChange={(e) => onChange({ morningPrice: e.target.value === '' ? '' : Number(e.target.value) })}
                  placeholder={`Default: ${basePrice}`}
                  className="h-11 w-full rounded-xl border-2 border-amber-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-slate-500 mt-1 font-semibold">Slot-specific rate (optional)</p>
              </div>
            )}
            {availability.availableEvening && (
              <div>
                <label className="text-xs uppercase font-extrabold text-indigo-700 mb-1 block flex items-center gap-1">
                  <Sunset className="h-3 w-3" /> Evening Price (PKR)
                </label>
                <input
                  type="number" step="0.01"
                  value={availability.eveningPrice}
                  onChange={(e) => onChange({ eveningPrice: e.target.value === '' ? '' : Number(e.target.value) })}
                  placeholder={`Default: ${basePrice}`}
                  className="h-11 w-full rounded-xl border-2 border-indigo-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500 mt-1 font-semibold">Slot-specific rate (optional)</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Home Delivery */}
      <section className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 space-y-4">
        <SectionHeader icon={Home} title="Home Delivery" desc="Ghar tak pohnchana" tone="violet" />

        <label className={[
          'flex items-center gap-3 cursor-pointer p-4 rounded-2xl border-2 transition',
          availability.homeDeliveryAvailable ? 'border-violet-500 bg-violet-50 shadow-md' : 'border-slate-200 bg-white hover:border-violet-300',
        ].join(' ')}>
          <input
            type="checkbox"
            checked={availability.homeDeliveryAvailable}
            onChange={(e) => onChange({ homeDeliveryAvailable: e.target.checked })}
            className="h-5 w-5 rounded"
          />
          <div className={[
            'h-12 w-12 rounded-2xl flex items-center justify-center shrink-0',
            availability.homeDeliveryAvailable ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-500',
          ].join(' ')}>
            <Truck className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="font-extrabold text-slate-900 text-base">🏠 Home Delivery Available</div>
            <div className="text-xs text-slate-500 font-semibold">Customer ke ghar tak deliver karo</div>
          </div>
        </label>

        {availability.homeDeliveryAvailable && (
          <div className="pl-4 border-l-4 border-violet-300">
            <label className="text-xs uppercase font-extrabold text-violet-700 mb-1 block flex items-center gap-1">
              <Truck className="h-3 w-3" /> Home Delivery Price (PKR)
            </label>
            <input
              type="number" step="0.01"
              value={availability.homeDeliveryPrice}
              onChange={(e) => onChange({ homeDeliveryPrice: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder={`Default: ${basePrice} (or add delivery charge)`}
              className="h-11 w-full rounded-xl border-2 border-violet-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-violet-500"
            />
            <p className="text-[10px] text-slate-500 mt-1 font-semibold">
              Ye rate customer ke ghar wali delivery pe apply hoga (regular rate se different if needed)
            </p>
          </div>
        )}
      </section>

      {/* Bulk Pricing */}
      <section className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <SectionHeader icon={Warehouse} title="Bulk Order Pricing" desc="B2B / thok rates" tone="emerald" />

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs uppercase font-extrabold text-emerald-700 mb-1 block flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> Bulk Price (PKR)
            </label>
            <input
              type="number" step="0.01"
              value={availability.bulkPrice}
              onChange={(e) => onChange({ bulkPrice: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder={`Below regular: ${basePrice}`}
              className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[10px] text-slate-500 mt-1 font-semibold">Discounted rate for bulk orders</p>
          </div>
          <div>
            <label className="text-xs uppercase font-extrabold text-emerald-700 mb-1 block flex items-center gap-1">
              <Package className="h-3 w-3" /> Min Bulk Qty ({basic.unit})
            </label>
            <input
              type="number" step="0.1"
              value={availability.minBulkQty}
              onChange={(e) => onChange({ minBulkQty: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="e.g. 20"
              className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[10px] text-slate-500 mt-1 font-semibold">Minimum quantity for bulk rate</p>
          </div>
        </div>

        {Number(availability.bulkPrice || 0) > 0 && Number(availability.minBulkQty || 0) > 0 && basePrice > 0 && (
          <div className="rounded-xl bg-emerald-100 border-2 border-emerald-300 p-3">
            <div className="text-xs font-extrabold text-emerald-900">
              💡 Bulk Deal: Order {availability.minBulkQty}+ {basic.unit} @ {formatPKRFull(Number(availability.bulkPrice))} each
              (save {formatPKRFull(basePrice - Number(availability.bulkPrice))}/unit)
            </div>
          </div>
        )}
      </section>

      {/* Initial Stock */}
      <section className="rounded-2xl border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-5 space-y-4">
        <SectionHeader icon={ShoppingBag} title="Initial Stock" desc="Starting inventory + alerts" tone="cyan" />

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs uppercase font-extrabold text-cyan-700 mb-1 block">
              Initial Stock ({basic.unit})
            </label>
            <input
              type="number" step="0.1"
              value={availability.initialStock}
              onChange={(e) => onChange({ initialStock: Number(e.target.value || 0) })}
              placeholder="0"
              className="h-14 w-full rounded-xl border-2 border-cyan-300 bg-white px-3 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="text-xs uppercase font-extrabold text-amber-700 mb-1 block">Low Stock Alert</label>
            <input
              type="number" step="1"
              value={availability.lowStockAlert}
              onChange={(e) => onChange({ lowStockAlert: Number(e.target.value || 0) })}
              placeholder="5"
              className="h-14 w-full rounded-xl border-2 border-amber-300 bg-white px-3 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-amber-500"
            />
            <p className="text-[10px] text-slate-500 mt-1 font-semibold">Warning when stock below this</p>
          </div>
        </div>

        {Number(availability.initialStock) > 0 && basePrice > 0 && (
          <div className="rounded-xl bg-cyan-50 border-2 border-cyan-200 p-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-cyan-700">Stock Value</div>
              <div className="text-2xl font-extrabold text-cyan-900 tabular-nums">
                {formatPKRFull(Number(availability.initialStock) * basePrice)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">Total Units</div>
              <div className="text-2xl font-extrabold text-cyan-700 tabular-nums">
                {availability.initialStock} {basic.unit}
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="text-xs uppercase font-extrabold text-slate-600 mb-1 block">Display Order</label>
          <input
            type="number"
            value={availability.displayOrder}
            onChange={(e) => onChange({ displayOrder: Number(e.target.value || 0) })}
            placeholder="0 (default)"
            className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-slate-500"
          />
          <p className="text-[10px] text-slate-500 mt-1 font-semibold">Lower number = shown first in menu</p>
        </div>
      </section>

      <div className="rounded-2xl bg-fuchsia-50 border-2 border-fuchsia-200 p-4 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-fuchsia-700 shrink-0 mt-0.5" />
        <div className="text-xs text-fuchsia-900 font-semibold leading-relaxed">
          <strong>Ready to save?</strong> Ye product turant POS mein available ho jayega, aur dairy customers subscribe kar sakenge.
          Baad mein bhi price/availability edit ho sakti hai.
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, desc, tone = 'slate' }: any) {
  const tones: Record<string, string> = {
    slate: 'from-slate-500 to-slate-700',
    emerald: 'from-emerald-500 to-emerald-700',
    amber: 'from-amber-500 to-orange-700',
    cyan: 'from-cyan-500 to-blue-700',
    violet: 'from-violet-500 to-purple-700',
  };
  return (
    <div className="flex items-center gap-3 pb-2 border-b-2 border-slate-100">
      <div className={['h-10 w-10 rounded-xl text-white flex items-center justify-center shadow-md bg-gradient-to-br',
        tones[tone] ?? tones.slate].join(' ')}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-extrabold text-slate-900 text-base leading-tight">{title}</h3>
        <p className="text-xs text-slate-500 font-semibold">{desc}</p>
      </div>
    </div>
  );
}
