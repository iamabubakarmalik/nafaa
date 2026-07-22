import { useState } from 'react';
import { Heart, Users, Clock, AlertTriangle, ArrowRight, ArrowLeft, Info, ShieldCheck, Plus, X } from 'lucide-react';
import { Input } from '@core/ui/Input';
import { Button } from '@core/ui/Button';
import type { GymWizardMedical } from '../../hooks/useGymMemberWizard';

const COMMON_ALLERGIES = ['Peanuts', 'Dairy', 'Gluten', 'Shellfish', 'Eggs', 'Soy', 'Latex', 'Sulfa'];
const DIETARY_PREFS = ['Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Keto', 'Low-carb', 'High-protein', 'Sugar-free'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Props {
  medical: GymWizardMedical;
  onChange: (patch: Partial<GymWizardMedical>) => void;
  onToggleAllergy: (a: string) => void;
  onToggleDay: (day: number) => void;
  onToggleDietary: (pref: string) => void;
  onBack: () => void;
  onNext: () => void;
  validation: { valid: boolean; errors: string[] };
}

export function GymWizardStep2Medical({ medical, onChange, onToggleAllergy, onToggleDay, onToggleDietary, onBack, onNext, validation }: Props) {
  const [customAllergy, setCustomAllergy] = useState('');

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-orange-950/30 dark:via-neutral-900 dark:to-red-950/30 border-2 border-orange-200 dark:border-orange-800 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b-2 border-orange-200/60">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white flex items-center justify-center shadow-md">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">Emergency Contact *</h3>
            <p className="text-[11px] text-slate-500 font-semibold">In case of emergency during workout</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Contact Name *" value={medical.emergencyContactName} onChange={(e) => onChange({ emergencyContactName: e.target.value })} placeholder="Full name" />
          <Input label="Contact Phone *" value={medical.emergencyContactPhone} onChange={(e) => onChange({ emergencyContactPhone: e.target.value })} placeholder="03XX-XXXXXXX" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Relation</label>
          <select value={medical.emergencyContactRelation} onChange={(e) => onChange({ emergencyContactRelation: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-orange-500">
            {['FATHER', 'MOTHER', 'SPOUSE', 'SIBLING', 'FAMILY', 'FRIEND', 'OTHER'].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-100 dark:border-neutral-800">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-md">
            <Heart className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">Medical Info</h3>
            <p className="text-[11px] text-slate-500 font-semibold">For trainer safety planning</p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Medical Conditions</label>
          <textarea rows={2} value={medical.medicalConditions} onChange={(e) => onChange({ medicalConditions: e.target.value })} placeholder="Diabetes, hypertension, asthma..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:border-rose-500 resize-none" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Injuries / Physical Limits</label>
          <textarea rows={2} value={medical.injuries} onChange={(e) => onChange({ injuries: e.target.value })} placeholder="Back pain, knee injury, shoulder..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:border-rose-500 resize-none" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Current Medications</label>
          <input value={medical.medications} onChange={(e) => onChange({ medications: e.target.value })} placeholder="Blood pressure meds, insulin..." className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Allergies</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {COMMON_ALLERGIES.map((a) => {
              const active = medical.allergies.includes(a);
              return (
                <button key={a} type="button" onClick={() => onToggleAllergy(a)} className={[
                  'px-2.5 py-1 rounded-lg border-2 text-xs font-extrabold transition',
                  active ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800 shadow-sm' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-700 hover:border-amber-300',
                ].join(' ')}>{a}</button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <input value={customAllergy} onChange={(e) => setCustomAllergy(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (customAllergy.trim()) { onToggleAllergy(customAllergy.trim()); setCustomAllergy(''); } } }} placeholder="Add custom allergy..." className="flex-1 h-10 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-semibold focus:outline-none focus:border-amber-500" />
            <button onClick={() => { if (customAllergy.trim()) { onToggleAllergy(customAllergy.trim()); setCustomAllergy(''); } }} className="h-10 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold inline-flex items-center gap-1"><Plus className="h-3.5 w-3.5" />Add</button>
          </div>
        </div>
        <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 cursor-pointer">
          <input type="checkbox" checked={medical.doctorClearance} onChange={(e) => onChange({ doctorClearance: e.target.checked })} className="h-5 w-5 rounded" />
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <div className="flex-1">
            <div className="text-sm font-extrabold text-emerald-900">Doctor's Clearance Obtained</div>
            <div className="text-[10px] text-emerald-700 font-semibold">Recommended for members over 40 or with medical conditions</div>
          </div>
        </label>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-100 dark:border-neutral-800">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow-md">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">Workout Preferences</h3>
            <p className="text-[11px] text-slate-500 font-semibold">Schedule and diet</p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Preferred Workout Time</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: 'MORNING', label: 'Morning', emoji: '🌅', time: '5-11 AM' },
              { v: 'AFTERNOON', label: 'Afternoon', emoji: '☀️', time: '11 AM-4 PM' },
              { v: 'EVENING', label: 'Evening', emoji: '🌇', time: '4-10 PM' },
            ].map((t) => {
              const active = medical.preferredWorkoutTime === t.v;
              return (
                <button key={t.v} type="button" onClick={() => onChange({ preferredWorkoutTime: t.v })} className={[
                  'p-3 rounded-xl border-2 transition text-center',
                  active ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40 shadow-md ring-2 ring-violet-200' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-violet-300',
                ].join(' ')}>
                  <div className="text-2xl">{t.emoji}</div>
                  <div className={'text-xs font-extrabold ' + (active ? 'text-violet-800' : 'text-slate-800')}>{t.label}</div>
                  <div className="text-[9px] text-slate-500 font-semibold">{t.time}</div>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Workout Days</label>
          <div className="grid grid-cols-7 gap-1">
            {DAYS.map((d, i) => {
              const active = medical.workoutDays.includes(i);
              return (
                <button key={d} type="button" onClick={() => onToggleDay(i)} className={[
                  'py-2.5 rounded-lg text-xs font-extrabold transition',
                  active ? 'bg-violet-600 text-white shadow-md' : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 hover:bg-slate-200',
                ].join(' ')}>{d}</button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Dietary Preferences</label>
          <div className="flex flex-wrap gap-1.5">
            {DIETARY_PREFS.map((p) => {
              const active = medical.dietaryPreferences.includes(p);
              return (
                <button key={p} type="button" onClick={() => onToggleDietary(p)} className={[
                  'px-2.5 py-1 rounded-lg border-2 text-xs font-extrabold transition',
                  active ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 shadow-sm' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-700 hover:border-emerald-300',
                ].join(' ')}>{p}</button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Bio / About</label>
          <textarea rows={2} value={medical.bio} onChange={(e) => onChange({ bio: e.target.value })} placeholder="Something about the member..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:border-violet-500 resize-none" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Internal Notes</label>
          <textarea rows={2} value={medical.notes} onChange={(e) => onChange({ notes: e.target.value })} placeholder="Trainer notes, special requests..." className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:border-violet-500 resize-none" />
        </div>
      </section>

      {!validation.valid && validation.errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-300 dark:border-rose-800 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-700 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-rose-900 dark:text-rose-200">
            <div className="font-extrabold mb-1">Please fix:</div>
            <ul className="list-disc list-inside space-y-0.5 text-xs">{validation.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-4 flex items-center justify-between flex-wrap gap-3">
        <Button variant="secondary" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Back</Button>
        <Button onClick={onNext} disabled={!validation.valid} className="bg-gradient-to-r from-orange-600 to-red-700 shadow-md">
          Next: Photo & Plan <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
