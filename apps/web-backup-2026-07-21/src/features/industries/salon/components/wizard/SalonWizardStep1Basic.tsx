import {
  Scissors, DollarSign, AlertCircle, Clock, Hash, TrendingUp,
  Percent, Zap,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { formatPKRFull } from '@/lib/format';
import type { ServiceCategory } from '../../api/services.api';
import type { SalonWizardBasic } from '../../hooks/useSalonWizard';

interface Props {
  basic: SalonWizardBasic;
  onChange: (patch: Partial<SalonWizardBasic>) => void;
  errors: string[];
}

const CATEGORIES: { value: ServiceCategory; label: string; emoji: string }[] = [
  { value: 'HAIR_CUT', label: 'Hair Cut', emoji: '✂️' },
  { value: 'HAIR_COLOR', label: 'Hair Color', emoji: '🎨' },
  { value: 'HAIR_TREATMENT', label: 'Treatment', emoji: '💆' },
  { value: 'HAIR_STYLING', label: 'Styling', emoji: '💇' },
  { value: 'BEARD_SHAVE', label: 'Beard/Shave', emoji: '🪒' },
  { value: 'FACIAL', label: 'Facial', emoji: '✨' },
  { value: 'MAKEUP', label: 'Makeup', emoji: '💄' },
  { value: 'BRIDAL_MAKEUP', label: 'Bridal', emoji: '👰' },
  { value: 'PARTY_MAKEUP', label: 'Party', emoji: '🎉' },
  { value: 'MANICURE', label: 'Manicure', emoji: '💅' },
  { value: 'PEDICURE', label: 'Pedicure', emoji: '🦶' },
  { value: 'NAIL_ART', label: 'Nail Art', emoji: '💎' },
  { value: 'WAXING', label: 'Waxing', emoji: '🧴' },
  { value: 'THREADING', label: 'Threading', emoji: '🧵' },
  { value: 'MASSAGE', label: 'Massage', emoji: '💆‍♀️' },
  { value: 'BODY_TREATMENT', label: 'Body Treatment', emoji: '🧖' },
  { value: 'SPA_PACKAGE', label: 'Spa Package', emoji: '🌿' },
  { value: 'MEHNDI', label: 'Mehndi', emoji: '🎨' },
  { value: 'HAIR_EXTENSION', label: 'Extensions', emoji: '💇‍♀️' },
  { value: 'KERATIN', label: 'Keratin', emoji: '🔬' },
  { value: 'BOTOX', label: 'Botox', emoji: '💉' },
  { value: 'OTHER', label: 'Other', emoji: '⭐' },
];

export function SalonWizardStep1Basic({ basic, onChange, errors }: Props) {
  const price = Number(basic.price || 0);
  const cost = Number(basic.costPrice || 0);
  const discount = Number(basic.discountPrice || 0);
  const profit = (discount > 0 && discount < price ? discount : price) - cost;
  const margin = (discount > 0 && discount < price ? discount : price) > 0
    ? (profit / (discount > 0 && discount < price ? discount : price)) * 100 : 0;
  const isLoss = cost > 0 && profit < 0;
  const hasDiscount = discount > 0 && discount < price;
  const discountPct = hasDiscount ? ((price - discount) / price) * 100 : 0;

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900">
            <div className="font-extrabold mb-0.5">Fix these before Next:</div>
            <ul className="list-disc pl-4 space-y-0.5">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* IDENTITY */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHeader icon={Scissors} title="Service Identity" desc="Naam, category, code" />

        <Input
          label="Service Name *"
          value={basic.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Classic Haircut, Deep Conditioning Facial, Bridal Makeup"
          hint="POS aur booking par dikhega"
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Service Code"
            value={basic.code}
            onChange={(e) => onChange({ code: e.target.value.toUpperCase() })}
            placeholder="HC-001, FAC-02"
            leftIcon={<Hash className="h-4 w-4 text-slate-400" />}
            hint="Short code for KOT / receipts"
          />
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Display Order</label>
            <input
              type="number"
              value={basic.displayOrder}
              onChange={(e) => onChange({ displayOrder: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="0"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold tabular-nums focus:outline-none focus:border-pink-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Service Category</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {CATEGORIES.map((cat) => {
              const active = basic.category === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => onChange({ category: cat.value })}
                  className={[
                    'h-16 rounded-xl border-2 text-sm font-extrabold transition flex flex-col items-center justify-center gap-0.5',
                    active
                      ? 'border-pink-600 bg-pink-600 text-white shadow-md'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-pink-400',
                  ].join(' ')}
                >
                  <span className="text-xl">{cat.emoji}</span>
                  <span className="text-[10px] leading-tight text-center">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Description</label>
          <textarea
            rows={2}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
            value={basic.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="What's included in this service? Shampoo, styling, etc."
          />
        </div>
      </section>

      {/* PRICING */}
      <section className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <SectionHeader icon={DollarSign} title="Pricing" desc="Regular, discount, cost" tone="emerald" />

        <div className="grid sm:grid-cols-3 gap-4">
          <Input
            label="Regular Price (PKR) *"
            type="number"
            step="0.01"
            value={basic.price}
            onChange={(e) => onChange({ price: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0"
            hint="Standard rate"
          />
          <Input
            label="Discount Price (PKR)"
            type="number"
            step="0.01"
            value={basic.discountPrice}
            onChange={(e) => onChange({ discountPrice: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Optional"
            hint="Special offer rate"
          />
          <Input
            label="Cost Price (PKR)"
            type="number"
            step="0.01"
            value={basic.costPrice}
            onChange={(e) => onChange({ costPrice: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0"
            hint="Products used cost"
          />
        </div>

        {price > 0 && cost > 0 && (
          <div className={[
            'rounded-xl border-2 p-3 flex items-center justify-between',
            isLoss ? 'bg-rose-50 border-rose-300'
              : margin >= 50 ? 'bg-emerald-50 border-emerald-300'
              : 'bg-amber-50 border-amber-300',
          ].join(' ')}>
            <div className="flex items-center gap-2">
              <TrendingUp className={['h-5 w-5',
                isLoss ? 'text-rose-700' : margin >= 50 ? 'text-emerald-700' : 'text-amber-700'].join(' ')} />
              <div>
                <div className={['text-[10px] uppercase tracking-wider font-extrabold',
                  isLoss ? 'text-rose-700' : margin >= 50 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
                  {isLoss ? '⚠️ Loss Alert' : 'Profit per service'}
                </div>
                <div className={['text-lg font-extrabold tabular-nums leading-tight',
                  isLoss ? 'text-rose-900' : 'text-slate-900'].join(' ')}>
                  {formatPKRFull(profit)}
                </div>
              </div>
            </div>
            <div className={['text-2xl font-extrabold tabular-nums',
              isLoss ? 'text-rose-700' : margin >= 50 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
              {margin.toFixed(1)}%
            </div>
          </div>
        )}

        {hasDiscount && (
          <div className="rounded-xl bg-emerald-100 border-2 border-emerald-300 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-700" />
              <div className="text-sm font-extrabold text-emerald-900">
                Customer saves {formatPKRFull(price - discount)}
              </div>
            </div>
            <div className="text-lg font-extrabold text-emerald-700 tabular-nums">
              {discountPct.toFixed(0)}% OFF
            </div>
          </div>
        )}
      </section>

      {/* DURATION */}
      <section className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 space-y-4">
        <SectionHeader icon={Clock} title="Duration & Buffers" desc="Kitna time lagega" tone="blue" />

        <div className="grid sm:grid-cols-3 gap-4">
          <Input
            label="Duration (min) *"
            type="number"
            value={basic.durationMinutes}
            onChange={(e) => onChange({ durationMinutes: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="30"
            hint="Main service time"
            leftIcon={<Clock className="h-4 w-4 text-slate-400" />}
          />
          <Input
            label="Buffer Before (min)"
            type="number"
            value={basic.bufferBefore}
            onChange={(e) => onChange({ bufferBefore: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0"
            hint="Prep / setup time"
          />
          <Input
            label="Buffer After (min)"
            type="number"
            value={basic.bufferAfter}
            onChange={(e) => onChange({ bufferAfter: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0"
            hint="Cleanup time"
          />
        </div>

        {Number(basic.durationMinutes || 0) > 0 && (
          <div className="rounded-xl bg-blue-100 border border-blue-300 p-3 flex items-center justify-between">
            <span className="text-sm font-bold text-blue-900">Total chair time (inc. buffers)</span>
            <span className="text-2xl font-extrabold text-blue-700 tabular-nums">
              {Number(basic.durationMinutes || 0) + Number(basic.bufferBefore || 0) + Number(basic.bufferAfter || 0)} min
            </span>
          </div>
        )}
      </section>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, desc, tone = 'slate' }: any) {
  const tones: Record<string, string> = {
    slate: 'from-slate-500 to-slate-700',
    emerald: 'from-emerald-500 to-emerald-700',
    blue: 'from-blue-500 to-blue-700',
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
