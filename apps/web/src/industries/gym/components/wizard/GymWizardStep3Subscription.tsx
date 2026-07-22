import { useQuery } from '@tanstack/react-query';
import { CreditCard, Camera, Target, Save, ArrowLeft, Info, AlertTriangle, Star, Sparkles, X, DollarSign } from 'lucide-react';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';
import { formatPKR, formatPKRFull } from '@core/lib/format';
import { membershipPlansApi } from '../../api/membership-plans.api';
import type { GymWizardSubscription } from '../../hooks/useGymMemberWizard';

interface Props {
  subscription: GymWizardSubscription;
  onChange: (patch: Partial<GymWizardSubscription>) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  validation: { valid: boolean; errors: string[] };
  allValid: boolean;
  isEdit?: boolean;
}

export function GymWizardStep3Subscription({ subscription, onChange, onBack, onSubmit, submitting, validation, allValid, isEdit }: Props) {
  const { data: plans = [] } = useQuery({
    queryKey: ['gym-plans-for-wizard'],
    queryFn: () => membershipPlansApi.list({ active: true }),
  });

  const selectedPlan = plans.find((p: any) => p.id === subscription.planId);
  const balance = Number(subscription.totalPrice || 0) - Number(subscription.paidAmount || 0);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-100 dark:border-neutral-800">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex items-center justify-center shadow-md">
            <Camera className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">Member Photo</h3>
            <p className="text-[11px] text-slate-500 font-semibold">For membership card & identification</p>
          </div>
        </div>
        {subscription.photoUrl ? (
          <div className="relative max-w-xs mx-auto">
            <img src={subscription.photoUrl} alt="Member" className="w-full aspect-square rounded-2xl object-cover border-4 border-red-200 shadow-lg" />
            <button onClick={() => onChange({ photoUrl: '' })} className="absolute top-2 right-2 h-8 w-8 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <UploadDropzone onUploaded={(records: any) => {
            const first = Array.isArray(records) ? records[0] : records;
            const url = typeof first === 'string' ? first : first?.url;
            if (url) onChange({ photoUrl: url });
          }} hint="Clear face photo — will appear on member card" />
        )}
      </section>

      {!isEdit && (
        <section className="rounded-3xl bg-gradient-to-br from-fuchsia-50 via-white to-pink-50 dark:from-fuchsia-950/30 dark:via-neutral-900 dark:to-pink-950/30 border-2 border-fuchsia-200 dark:border-fuchsia-800 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b-2 border-fuchsia-200/60">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white flex items-center justify-center shadow-md">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">Choose Membership Plan</h3>
              <p className="text-[11px] text-slate-500 font-semibold">Optional — can be added later</p>
            </div>
          </div>
          {plans.length === 0 ? (
            <div className="rounded-2xl bg-white border-2 border-dashed border-fuchsia-300 p-8 text-center">
              <Target className="h-12 w-12 text-fuchsia-300 mx-auto mb-2" />
              <p className="font-extrabold text-slate-700">No plans available</p>
              <p className="text-xs text-slate-500 font-semibold mt-1">Create membership plans first from Plans page</p>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <button type="button" onClick={() => onChange({ planId: '', totalPrice: '', paidAmount: '' })} className={[
                  'p-4 rounded-2xl border-2 text-left transition',
                  !subscription.planId ? 'border-slate-800 bg-slate-100 shadow-md ring-2 ring-slate-300' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-slate-400',
                ].join(' ')}>
                  <div className="text-2xl mb-1">⏭️</div>
                  <div className="font-extrabold text-sm">Skip for now</div>
                  <div className="text-[10px] text-slate-500 font-semibold mt-1">Add subscription later</div>
                </button>
                {plans.map((plan: any) => {
                  const active = subscription.planId === plan.id;
                  return (
                    <button key={plan.id} type="button" onClick={() => onChange({ planId: plan.id, totalPrice: plan.price, paidAmount: plan.price })} className={[
                      'p-4 rounded-2xl border-2 text-left transition relative',
                      active ? 'border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/40 shadow-md ring-2 ring-fuchsia-200' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-fuchsia-300',
                    ].join(' ')}>
                      {plan.isFeatured && (
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
                          <Star className="h-2 w-2 fill-white" /> FT
                        </div>
                      )}
                      <div className="font-extrabold text-sm">{plan.name}</div>
                      <div className="text-[10px] uppercase font-extrabold text-fuchsia-600 mt-0.5">{plan.planType.replace('_', ' ')}</div>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className={'text-2xl font-extrabold tabular-nums ' + (active ? 'text-fuchsia-700' : 'text-emerald-700')}>{formatPKR(plan.price)}</span>
                        <span className="text-[10px] font-bold text-slate-500">/ {plan.durationDays}d</span>
                      </div>
                      {plan.registrationFee > 0 && <div className="text-[10px] font-bold text-amber-700 mt-0.5">+ {formatPKR(plan.registrationFee)} reg</div>}
                    </button>
                  );
                })}
              </div>

              {selectedPlan && (
                <div className="rounded-2xl border-2 border-fuchsia-300 bg-fuchsia-50 dark:bg-fuchsia-950/30 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-fuchsia-900">
                    <DollarSign className="h-4 w-4" />
                    Payment Details
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-extrabold text-fuchsia-700 mb-1">Total Price</label>
                      <input type="number" value={subscription.totalPrice} onChange={(e) => onChange({ totalPrice: e.target.value === '' ? '' : Number(e.target.value) })} className="h-11 w-full rounded-xl border-2 border-fuchsia-300 bg-white px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-fuchsia-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-extrabold text-emerald-700 mb-1">Paid Amount</label>
                      <input type="number" value={subscription.paidAmount} onChange={(e) => onChange({ paidAmount: e.target.value === '' ? '' : Number(e.target.value) })} className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-extrabold text-amber-700 mb-1">Balance</label>
                      <div className="h-11 rounded-xl border-2 border-amber-300 bg-amber-50 px-3 flex items-center text-sm font-extrabold tabular-nums text-amber-900">
                        {formatPKR(balance)}
                      </div>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-extrabold text-slate-600 mb-1">Start Date</label>
                      <input type="date" value={subscription.startDate} onChange={(e) => onChange({ startDate: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500" />
                    </div>
                    <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 cursor-pointer">
                      <input type="checkbox" checked={subscription.autoRenew} onChange={(e) => onChange({ autoRenew: e.target.checked })} className="h-4 w-4 rounded" />
                      <div className="text-sm font-extrabold text-emerald-900">Auto-renew when expires</div>
                    </label>
                  </div>
                </div>
              )}
            </>
          )}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Referral Code (optional)</label>
            <input value={subscription.referralCode} onChange={(e) => onChange({ referralCode: e.target.value })} placeholder="Who referred them?" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500" />
          </div>
        </section>
      )}

      <div className="rounded-2xl bg-gradient-to-r from-red-600 via-orange-600 to-red-700 text-white shadow-xl p-5 flex items-center justify-between flex-wrap gap-3">
        <Button variant="secondary" onClick={onBack} className="bg-white/15 text-white hover:bg-white/25 border-white/20"><ArrowLeft className="h-4 w-4" /> Back</Button>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-xs font-bold text-red-100">Ready to {isEdit ? 'update' : 'enroll'} member?</div>
          <Button onClick={onSubmit} disabled={!allValid || submitting} loading={submitting} className="bg-white text-red-800 hover:bg-red-50 shadow-lg">
            <Save className="h-4 w-4" /> {isEdit ? 'Update' : 'Enroll Member'}
          </Button>
        </div>
      </div>
    </div>
  );
}
