import {
  DollarSign, Zap, ArrowRight, ArrowLeft, AlertTriangle, Info,
  FileText, Wallet, TrendingUp, Home, Truck, Moon, Sun, CalendarClock,
} from 'lucide-react';
import { Button } from '@core/ui/Button';
import type { ServicesBizPricing } from '../../hooks/useServicesBizWizard';

const CHARGE_TYPES = [
  { value: 'FIXED', label: 'Fixed Price', emoji: '💵', desc: 'Same price every time' },
  { value: 'HOURLY', label: 'Hourly', emoji: '⏱️', desc: 'Charge per hour worked' },
  { value: 'PER_VISIT', label: 'Per Visit', emoji: '🚗', desc: 'One-off visit charge' },
  { value: 'DISTANCE_BASED', label: 'Distance', emoji: '📏', desc: 'Based on km traveled' },
  { value: 'COMPLEXITY_BASED', label: 'Complexity', emoji: '🧩', desc: 'Depends on complexity' },
  { value: 'QUOTE_BASED', label: 'Quote', emoji: '📝', desc: 'Custom quote per job' },
];

interface Props {
  pricing: ServicesBizPricing;
  onChange: (patch: Partial<ServicesBizPricing>) => void;
  onBack: () => void;
  onNext: () => void;
  validation: { valid: boolean; errors: string[] };
}

export function ServicesBizWizardStep2Pricing({ pricing, onChange, onBack, onNext, validation }: Props) {
  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-100 dark:border-neutral-800">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center shadow-md">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">Charge Type *</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">How do you charge for this service?</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CHARGE_TYPES.map((t) => {
            const active = pricing.chargeType === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => onChange({ chargeType: t.value })}
                className={[
                  'p-4 rounded-2xl border-2 transition-all text-left',
                  active
                    ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40 shadow-md ring-2 ring-emerald-200'
                    : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-emerald-300',
                ].join(' ')}
              >
                <div className="text-3xl mb-1">{t.emoji}</div>
                <div className={'font-extrabold text-sm ' + (active ? 'text-emerald-800' : 'text-slate-900 dark:text-white')}>
                  {t.label}
                </div>
                <div className="text-[10px] font-semibold text-slate-500 mt-0.5">{t.desc}</div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-emerald-950/30 dark:via-neutral-900 dark:to-green-950/30 border-2 border-emerald-200 dark:border-emerald-800 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b-2 border-emerald-200/60 dark:border-emerald-800/60">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center shadow-md">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">Base Charges</h3>
            <p className="text-[11px] text-slate-500 font-semibold">Fill any that apply — at least one required</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <PriceInput
            label="Base / Fixed Charge"
            emoji="💵"
            value={pricing.baseCharge}
            onChange={(v: any) => onChange({ baseCharge: v })}
            tone="emerald"
          />
          <PriceInput
            label="Hourly Rate"
            emoji="⏱️"
            value={pricing.hourlyRate}
            onChange={(v: any) => onChange({ hourlyRate: v })}
            tone="cyan"
          />
          <PriceInput
            label="Visit Charge"
            emoji="🚗"
            value={pricing.visitCharge}
            onChange={(v: any) => onChange({ visitCharge: v })}
            tone="blue"
          />
          <PriceInput
            label="Minimum Charge"
            emoji="🔻"
            value={pricing.minCharge}
            onChange={(v: any) => onChange({ minCharge: v })}
            tone="amber"
          />
          <PriceInput
            label="Maximum Charge (cap)"
            emoji="🔺"
            value={pricing.maxCharge}
            onChange={(v: any) => onChange({ maxCharge: v })}
            tone="violet"
          />
        </div>
      </section>

      <section className="rounded-3xl bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-amber-950/30 dark:via-neutral-900 dark:to-orange-950/30 border-2 border-amber-200 dark:border-amber-800 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b-2 border-amber-200/60 dark:border-amber-800/60">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">Surcharges (optional)</h3>
            <p className="text-[11px] text-slate-500 font-semibold">Extra charges for special conditions</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <PriceInput
            label="Emergency"
            emoji="🚨"
            value={pricing.emergencyCharge}
            onChange={(v: any) => onChange({ emergencyCharge: v })}
            tone="red"
          />
          <PriceInput
            label="Weekend"
            emoji="📅"
            value={pricing.weekendCharge}
            onChange={(v: any) => onChange({ weekendCharge: v })}
            tone="amber"
          />
          <PriceInput
            label="Night Hours"
            emoji="🌙"
            value={pricing.nightCharge}
            onChange={(v: any) => onChange({ nightCharge: v })}
            tone="violet"
          />
          <PriceInput
            label="Out of City"
            emoji="🚚"
            value={pricing.outOfCityCharge}
            onChange={(v: any) => onChange({ outOfCityCharge: v })}
            tone="blue"
          />
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-100 dark:border-neutral-800">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow-md">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">Advanced Options</h3>
            <p className="text-[11px] text-slate-500 font-semibold">Quote and advance payment rules</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className={[
            'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition',
            pricing.requiresQuote
              ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30'
              : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-violet-300',
          ].join(' ')}>
            <input
              type="checkbox"
              checked={pricing.requiresQuote}
              onChange={(e) => onChange({ requiresQuote: e.target.checked })}
              className="h-5 w-5 rounded"
            />
            <FileText className="h-5 w-5 text-violet-600" />
            <div>
              <div className="font-extrabold text-sm">Requires Quote</div>
              <div className="text-[10px] text-slate-500 font-semibold">Custom quote every time</div>
            </div>
          </label>

          <label className={[
            'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition',
            pricing.requiresAdvance
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
              : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-emerald-300',
          ].join(' ')}>
            <input
              type="checkbox"
              checked={pricing.requiresAdvance}
              onChange={(e) => onChange({ requiresAdvance: e.target.checked })}
              className="h-5 w-5 rounded"
            />
            <Wallet className="h-5 w-5 text-emerald-600" />
            <div>
              <div className="font-extrabold text-sm">Requires Advance</div>
              <div className="text-[10px] text-slate-500 font-semibold">Book with advance payment</div>
            </div>
          </label>
        </div>

        {pricing.requiresAdvance && (
          <div>
            <label className="block text-xs font-extrabold text-emerald-700 mb-2 uppercase tracking-wider">
              Advance Percentage *
            </label>
            <div className="relative">
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                value={pricing.advancePct}
                onChange={(e) => onChange({ advancePct: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="e.g. 50"
                className="h-12 w-full max-w-xs rounded-xl border-2 border-emerald-300 bg-white dark:bg-emerald-950/30 pl-3 pr-12 text-lg font-extrabold tabular-nums focus:outline-none focus:border-emerald-500"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-500 uppercase">
                %
              </span>
            </div>
            <p className="text-[10px] text-emerald-700 font-bold mt-1">
              Customer will need to pay {pricing.advancePct || 0}% upfront to confirm booking
            </p>
          </div>
        )}
      </section>

      {!validation.valid && validation.errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-300 dark:border-rose-800 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-700 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-rose-900 dark:text-rose-200">
            <div className="font-extrabold mb-1">Fix these:</div>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              {validation.errors.map((e, i) => (<li key={i}>{e}</li>))}
            </ul>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-4 flex items-center justify-between flex-wrap gap-3">
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!validation.valid}
          className="bg-gradient-to-r from-emerald-600 to-green-700 shadow-md"
        >
          Next: Skills & Warranty <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function PriceInput({ label, emoji, value, onChange, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 focus:border-emerald-500',
    cyan: 'border-cyan-300 bg-cyan-50 dark:bg-cyan-950/30 text-cyan-900 focus:border-cyan-500',
    blue: 'border-blue-300 bg-blue-50 dark:bg-blue-950/30 text-blue-900 focus:border-blue-500',
    amber: 'border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-amber-900 focus:border-amber-500',
    violet: 'border-violet-300 bg-violet-50 dark:bg-violet-950/30 text-violet-900 focus:border-violet-500',
    red: 'border-red-300 bg-red-50 dark:bg-red-950/30 text-red-900 focus:border-red-500',
  };
  return (
    <div>
      <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
        {emoji} {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-500">Rs</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder="0"
          className={'h-11 w-full rounded-xl border-2 pl-8 pr-3 text-sm font-extrabold tabular-nums focus:outline-none ' + tones[tone]}
        />
      </div>
    </div>
  );
}
