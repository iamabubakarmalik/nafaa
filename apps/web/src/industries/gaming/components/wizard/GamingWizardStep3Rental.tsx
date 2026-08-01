import {
  Timer, ToggleLeft, ToggleRight, Calendar, ShieldCheck,
  AlertCircle, Clock, CalendarDays, Rocket, Wallet,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import { formatPKRFull } from '@core/lib/format';
import type { GamingWizardRental } from '../../hooks/useGamingWizard';

interface Props {
  rental: GamingWizardRental;
  onChange: (patch: Partial<GamingWizardRental>) => void;
  retailPrice: number;
  errors: string[];
}

const HOUR_PRESETS = [100, 150, 200, 250, 300, 500];
const DAY_PRESETS = [500, 800, 1000, 1500, 2000, 3000];

export function GamingWizardStep3Rental({ rental, onChange, retailPrice, errors }: Props) {
  const perHour = Number(rental.rentalPricePerHour || 0);
  const perDay = Number(rental.rentalPricePerDay || 0);
  const deposit = Number(rental.rentalDeposit || 0);

  const suggestDeposit = () => {
    if (retailPrice <= 0) return;
    onChange({ rentalDeposit: Math.round(retailPrice * 0.5) });
  };
  const suggestDay = () => {
    if (retailPrice <= 0) return;
    onChange({ rentalPricePerDay: Math.max(100, Math.round((retailPrice * 0.03) / 50) * 50) });
  };

  const daysToRecover = perDay > 0 && retailPrice > 0 ? Math.ceil(retailPrice / perDay) : null;

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-300 p-4 flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm text-rose-900">
            <div className="font-extrabold mb-1">Fix before continuing:</div>
            <ul className="list-disc pl-4 space-y-0.5 font-semibold">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-white border-2 border-violet-200 p-4 flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-md shrink-0">
          <Timer className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-extrabold text-violet-900">Rental & Pre-order — both optional</h3>
          <p className="text-xs text-violet-800 font-semibold mt-0.5 leading-relaxed">
            Turn on rental for consoles and games you lend out. Turn on pre-order for unreleased titles.
            Skip this step entirely if neither applies.
          </p>
        </div>
      </div>

      {/* RENTAL TOGGLE */}
      <button type="button" onClick={() => onChange({ isRentable: !rental.isRentable })}
        className={['w-full rounded-2xl border-2 p-4 text-left transition',
          rental.isRentable ? 'border-violet-500 bg-violet-50 shadow-md' : 'border-slate-200 bg-white hover:border-violet-300'].join(' ')}>
        <div className="flex items-center gap-3">
          <div className={['h-12 w-12 rounded-xl flex items-center justify-center shrink-0',
            rental.isRentable ? 'bg-violet-600 text-white' : 'bg-violet-100 text-violet-700'].join(' ')}>
            <Timer className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="font-extrabold text-slate-900">Available for Rental</div>
            <div className="text-xs text-slate-600 font-semibold">Hourly or daily rental with security deposit</div>
          </div>
          {rental.isRentable ? <ToggleRight className="h-7 w-7 text-violet-600" /> : <ToggleLeft className="h-7 w-7 text-slate-400" />}
        </div>
      </button>

      {rental.isRentable && (
        <section className="rounded-2xl border-2 border-violet-300 bg-gradient-to-br from-violet-50 to-white p-5 space-y-5">
          <SectionHead icon={Wallet} title="Rental Rates" desc="At least one rate is required" tone="violet" />

          <div>
            <Lbl><Clock className="h-3 w-3 inline mr-1" /> Price per Hour</Lbl>
            <input type="number" step="1" value={rental.rentalPricePerHour}
              onChange={(e) => onChange({ rentalPricePerHour: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="0"
              className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-violet-500" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {HOUR_PRESETS.map((p) => (
                <button key={p} type="button" onClick={() => onChange({ rentalPricePerHour: p })}
                  className="px-3 py-1.5 rounded-xl bg-white border-2 border-violet-200 hover:border-violet-400 text-violet-800 text-xs font-extrabold">
                  {formatPKRFull(p)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Lbl><CalendarDays className="h-3 w-3 inline mr-1" /> Price per Day</Lbl>
              {retailPrice > 0 && (
                <button type="button" onClick={suggestDay}
                  className="text-[10px] font-extrabold text-violet-700 hover:underline">Suggest (3% of price)</button>
              )}
            </div>
            <input type="number" step="1" value={rental.rentalPricePerDay}
              onChange={(e) => onChange({ rentalPricePerDay: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="0"
              className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-violet-500" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DAY_PRESETS.map((p) => (
                <button key={p} type="button" onClick={() => onChange({ rentalPricePerDay: p })}
                  className="px-3 py-1.5 rounded-xl bg-white border-2 border-violet-200 hover:border-violet-400 text-violet-800 text-xs font-extrabold">
                  {formatPKRFull(p)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Lbl><ShieldCheck className="h-3 w-3 inline mr-1" /> Security Deposit</Lbl>
              {retailPrice > 0 && (
                <button type="button" onClick={suggestDeposit}
                  className="text-[10px] font-extrabold text-violet-700 hover:underline">Suggest (50% of price)</button>
              )}
            </div>
            <input type="number" step="1" value={rental.rentalDeposit}
              onChange={(e) => onChange({ rentalDeposit: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="0"
              className="h-14 w-full rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 text-2xl font-extrabold tabular-nums text-amber-900 focus:outline-none focus:border-amber-500" />
            <p className="mt-1.5 text-[11px] text-slate-500 font-semibold">
              Refundable at return, minus any damage or late fees.
            </p>
          </div>

          {(perHour > 0 || perDay > 0) && (
            <div className="rounded-2xl bg-white border-2 border-emerald-300 p-4">
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700 mb-2">Rental preview</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {perHour > 0 && <Mini label="3 hours" value={formatPKRFull(perHour * 3)} />}
                {perDay > 0 && <Mini label="1 day" value={formatPKRFull(perDay)} />}
                {perDay > 0 && <Mini label="1 week" value={formatPKRFull(perDay * 7)} />}
                {deposit > 0 && <Mini label="Deposit held" value={formatPKRFull(deposit)} tone="amber" />}
              </div>
              {daysToRecover !== null && (
                <div className="mt-3 pt-3 border-t border-slate-100 text-xs font-extrabold text-slate-700">
                  Unit cost recovered after ~<span className="text-emerald-700">{daysToRecover} rental days</span>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* PRE-ORDER TOGGLE */}
      <button type="button" onClick={() => onChange({ isPreOrder: !rental.isPreOrder })}
        className={['w-full rounded-2xl border-2 p-4 text-left transition',
          rental.isPreOrder ? 'border-amber-500 bg-amber-50 shadow-md' : 'border-slate-200 bg-white hover:border-amber-300'].join(' ')}>
        <div className="flex items-center gap-3">
          <div className={['h-12 w-12 rounded-xl flex items-center justify-center shrink-0',
            rental.isPreOrder ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700'].join(' ')}>
            <Rocket className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="font-extrabold text-slate-900">Pre-order Item</div>
            <div className="text-xs text-slate-600 font-semibold">Not released yet — taking advance bookings</div>
          </div>
          {rental.isPreOrder ? <ToggleRight className="h-7 w-7 text-amber-600" /> : <ToggleLeft className="h-7 w-7 text-slate-400" />}
        </div>
      </button>

      {rental.isPreOrder && (
        <section className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white p-5 space-y-4">
          <SectionHead icon={Calendar} title="Release Date" desc="When will it ship to customers?" tone="amber" />
          <Input label="Expected Release Date *" type="date" value={rental.preOrderReleaseDate}
            onChange={(e) => onChange({ preOrderReleaseDate: e.target.value })} />
          {rental.preOrderReleaseDate && (
            <div className="rounded-xl bg-white border-2 border-amber-200 p-3 text-sm font-extrabold text-amber-900">
              🚀 Launching {new Date(rental.preOrderReleaseDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}
              {(() => {
                const days = Math.ceil((new Date(rental.preOrderReleaseDate).getTime() - Date.now()) / 86400000);
                return days > 0 ? ` — ${days} days to go` : ' — release date passed';
              })()}
            </div>
          )}
        </section>
      )}

      {!rental.isRentable && !rental.isPreOrder && (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <Timer className="h-10 w-10 text-slate-400 mx-auto mb-2" />
          <div className="font-extrabold text-slate-700">Nothing to configure here</div>
          <div className="text-xs text-slate-500 font-semibold mt-1">
            This item is sale-only. Continue to stock entry.
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHead({ icon: Icon, title, desc, tone }: any) {
  const tones: Record<string, string> = {
    violet: 'from-violet-500 to-fuchsia-700',
    amber: 'from-amber-500 to-orange-700',
  };
  return (
    <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-extrabold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500 font-semibold">{desc}</p>
      </div>
    </div>
  );
}
function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}
function Mini({ label, value, tone }: any) {
  return (
    <div className={['rounded-xl border-2 p-2.5', tone === 'amber' ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'].join(' ')}>
      <div className="text-[9px] uppercase font-extrabold text-slate-500">{label}</div>
      <div className="text-base font-extrabold text-slate-900 tabular-nums">{value}</div>
    </div>
  );
}
