import {
  Users, Award, AlertCircle, DollarSign, Percent, Info,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import { formatPKRFull } from '@core/lib/format';
import type { SalonWizardBasic } from '../../hooks/useSalonWizard';

interface Props {
  basic: SalonWizardBasic;
  onChange: (patch: Partial<SalonWizardBasic>) => void;
  errors: string[];
}

export function SalonWizardStep2Targeting({ basic, onChange, errors }: Props) {
  const price = Number(basic.discountPrice || basic.price || 0);
  const commissionPct = Number(basic.commissionPct || 0);
  const commissionFixed = Number(basic.commissionFixed || 0);
  const totalCommission = (price * commissionPct / 100) + commissionFixed;

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900">
            <div className="font-extrabold mb-0.5">Fix before Next:</div>
            <ul className="list-disc pl-4 space-y-0.5">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* AUDIENCE */}
      <section className="rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-pink-50 to-white p-5 space-y-4">
        <SectionHeader icon={Users} title="Target Audience" desc="Ye service kis ke liye hai?" tone="pink" />

        <div className="grid grid-cols-3 gap-3">
          {[
            { key: 'forMen', label: 'Men', emoji: '👨', color: 'blue' },
            { key: 'forWomen', label: 'Women', emoji: '👩', color: 'pink' },
            { key: 'forKids', label: 'Kids', emoji: '🧒', color: 'amber' },
          ].map((g) => {
            const active = (basic as any)[g.key];
            return (
              <button
                key={g.key}
                type="button"
                onClick={() => onChange({ [g.key]: !active } as any)}
                className={[
                  'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition',
                  active
                    ? g.color === 'blue' ? 'border-blue-600 bg-blue-50 shadow-md ring-2 ring-blue-200'
                      : g.color === 'pink' ? 'border-pink-600 bg-pink-50 shadow-md ring-2 ring-pink-200'
                      : 'border-amber-600 bg-amber-50 shadow-md ring-2 ring-amber-200'
                    : 'border-slate-200 bg-white hover:border-slate-300',
                ].join(' ')}
              >
                <span className="text-4xl">{g.emoji}</span>
                <span className={[
                  'text-sm font-extrabold',
                  active ? (g.color === 'blue' ? 'text-blue-900' : g.color === 'pink' ? 'text-pink-900' : 'text-amber-900') : 'text-slate-600',
                ].join(' ')}>
                  {g.label}
                </span>
                {active && (
                  <span className={[
                    'px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase text-white',
                    g.color === 'blue' ? 'bg-blue-600' : g.color === 'pink' ? 'bg-pink-600' : 'bg-amber-600',
                  ].join(' ')}>
                    ✓ Available
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 font-semibold">
            Kam se kam ek audience select karo. Multiple bhi select kar sakte ho —
            e.g. Haircut men + women dono ke liye available ho sakta hai.
          </div>
        </div>
      </section>

      {/* COMMISSION */}
      <section className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 space-y-4">
        <SectionHeader icon={Award} title="Staff Commission" desc="Staff ko kitna milega per service" tone="amber" />

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Commission Percentage (%)"
            type="number"
            step="0.1"
            value={basic.commissionPct}
            onChange={(e) => onChange({ commissionPct: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0"
            hint="e.g. 10% of service price"
            leftIcon={<Percent className="h-4 w-4 text-slate-400" />}
          />
          <Input
            label="Fixed Commission (PKR)"
            type="number"
            step="0.01"
            value={basic.commissionFixed}
            onChange={(e) => onChange({ commissionFixed: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0"
            hint="Additional fixed amount"
            leftIcon={<DollarSign className="h-4 w-4 text-slate-400" />}
          />
        </div>

        {totalCommission > 0 && price > 0 && (
          <div className="rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 border-2 border-amber-300 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-6 w-6 text-amber-700" />
              <div>
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700">
                  Total Commission Per Service
                </div>
                <div className="text-2xl font-extrabold text-amber-900 tabular-nums leading-tight">
                  {formatPKRFull(totalCommission)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase font-extrabold text-slate-500">Net to Salon</div>
              <div className="text-xl font-extrabold text-emerald-700 tabular-nums">
                {formatPKRFull(price - totalCommission)}
              </div>
            </div>
          </div>
        )}

        {totalCommission > 0 && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {commissionPct > 0 && (
              <div className="rounded-lg bg-white border border-amber-200 p-2">
                <div className="text-[9px] uppercase font-extrabold text-amber-700">% Component</div>
                <div className="font-extrabold text-amber-900 tabular-nums">
                  {formatPKRFull(price * commissionPct / 100)}
                </div>
                <div className="text-[9px] text-slate-500 font-bold">{commissionPct}% of {formatPKRFull(price)}</div>
              </div>
            )}
            {commissionFixed > 0 && (
              <div className="rounded-lg bg-white border border-amber-200 p-2">
                <div className="text-[9px] uppercase font-extrabold text-amber-700">Fixed Component</div>
                <div className="font-extrabold text-amber-900 tabular-nums">
                  {formatPKRFull(commissionFixed)}
                </div>
                <div className="text-[9px] text-slate-500 font-bold">Flat rate per service</div>
              </div>
            )}
          </div>
        )}

        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
          <Info className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 font-semibold">
            <strong>Hybrid commission:</strong> Percentage aur fixed dono set kar sakte ho.
            Staff ko dono add ho ke milega. Ek ko 0 rakho agar sirf ek chahiye.
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, desc, tone = 'slate' }: any) {
  const tones: Record<string, string> = {
    slate: 'from-slate-500 to-slate-700',
    pink: 'from-pink-500 to-rose-700',
    amber: 'from-amber-500 to-orange-700',
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
