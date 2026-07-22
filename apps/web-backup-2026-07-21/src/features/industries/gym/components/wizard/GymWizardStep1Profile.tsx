import {  User, Ruler, Target, ArrowRight, AlertTriangle, Info, Phone, Mail, MapPin, Calendar, Zap, Activity } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { GymWizardBasic } from '../../hooks/useGymMemberWizard';
import type { Goal } from '../../api/members.api';

const GOALS: { value: Goal; label: string; emoji: string }[] = [
  { value: 'WEIGHT_LOSS', label: 'Weight Loss', emoji: '⬇️' },
  { value: 'MUSCLE_GAIN', label: 'Muscle Gain', emoji: '💪' },
  { value: 'BODY_BUILDING', label: 'Body Building', emoji: '🏆' },
  { value: 'STRENGTH', label: 'Strength', emoji: '⚡' },
  { value: 'ENDURANCE', label: 'Endurance', emoji: '🏃' },
  { value: 'CARDIO', label: 'Cardio', emoji: '❤️' },
  { value: 'FLEXIBILITY', label: 'Flexibility', emoji: '🤸' },
  { value: 'REHABILITATION', label: 'Rehab', emoji: '🩹' },
  { value: 'GENERAL_FITNESS', label: 'General Fit', emoji: '💯' },
  { value: 'COMPETITION_PREP', label: 'Competition', emoji: '🎯' },
  { value: 'WEIGHT_GAIN', label: 'Weight Gain', emoji: '⬆️' },
  { value: 'TONING', label: 'Toning', emoji: '✨' },
];

interface Props {
  basic: GymWizardBasic;
  onChange: (patch: Partial<GymWizardBasic>) => void;
  onToggleGoal: (g: Goal) => void;
  onNext: () => void;
  validation: { valid: boolean; errors: string[] };
}

export function GymWizardStep1Profile({ basic, onChange, onToggleGoal, onNext, validation }: Props) {
  const h = Number(basic.heightCm || 0) / 100;
  const w = Number(basic.currentWeightKg || 0);
  const bmi = h > 0 && w > 0 ? w / (h * h) : 0;
  const bmiCategory = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
  const bmiColor = bmi < 18.5 ? 'text-blue-700' : bmi < 25 ? 'text-emerald-700' : bmi < 30 ? 'text-amber-700' : 'text-red-700';

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
        <SectionHeader icon={User} title="Personal Info" desc="Member basic details" />
        <Input label="Full Name *" value={basic.customerName} onChange={(e) => onChange({ customerName: e.target.value })} placeholder="e.g. Ahmed Khan" autoFocus />
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5"><Phone className="h-3.5 w-3.5 inline mr-1" />Phone *</label>
            <input value={basic.customerPhone} onChange={(e) => onChange({ customerPhone: e.target.value })} placeholder="03XX-XXXXXXX" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-red-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5"><Mail className="h-3.5 w-3.5 inline mr-1" />Email</label>
            <input value={basic.customerEmail} onChange={(e) => onChange({ customerEmail: e.target.value })} placeholder="member@example.com" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-red-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5"><MapPin className="h-3.5 w-3.5 inline mr-1" />Address</label>
          <input value={basic.customerAddress} onChange={(e) => onChange({ customerAddress: e.target.value })} placeholder="Complete address" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-red-500" />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Member Number</label>
            <input value={basic.memberNumber} onChange={(e) => onChange({ memberNumber: e.target.value })} placeholder="Auto if blank" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-red-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">RFID Card</label>
            <input value={basic.rfidCard} onChange={(e) => onChange({ rfidCard: e.target.value })} placeholder="Scan or type" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-red-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">QR Code</label>
            <input value={basic.qrCode} onChange={(e) => onChange({ qrCode: e.target.value })} placeholder="Auto-generate" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-mono font-bold focus:outline-none focus:border-red-500" />
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5"><Calendar className="h-3.5 w-3.5 inline mr-1" />Date of Birth</label>
            <input type="date" value={basic.dateOfBirth} onChange={(e) => onChange({ dateOfBirth: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-red-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Gender</label>
            <select value={basic.gender} onChange={(e) => onChange({ gender: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-red-500">
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Blood Group</label>
            <select value={basic.bloodGroup} onChange={(e) => onChange({ bloodGroup: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-red-500">
              <option value="">--</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-red-950/30 dark:via-neutral-900 dark:to-orange-950/30 border-2 border-red-200 dark:border-red-800 shadow-sm p-5 space-y-4">
        <SectionHeader icon={Ruler} title="Body Composition" desc="Measurements for tracking progress" />
        <div className="grid sm:grid-cols-3 gap-3">
          <MetricInput label="Height (cm)" emoji="📏" value={basic.heightCm} onChange={(v: any) => onChange({ heightCm: v })} />
          <MetricInput label="Current Weight (kg)" emoji="⚖️" value={basic.currentWeightKg} onChange={(v: any) => onChange({ currentWeightKg: v })} />
          <MetricInput label="Target Weight (kg)" emoji="🎯" value={basic.targetWeightKg} onChange={(v: any) => onChange({ targetWeightKg: v })} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <MetricInput label="Body Fat %" emoji="📊" value={basic.bodyFatPct} onChange={(v: any) => onChange({ bodyFatPct: v })} />
          <MetricInput label="Muscle Mass %" emoji="💪" value={basic.muscleMassPct} onChange={(v: any) => onChange({ muscleMassPct: v })} />
        </div>
        {bmi > 0 && (
          <div className="rounded-2xl bg-white border-2 border-red-200 p-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-red-700">BMI Calculator</div>
              <div className={'text-3xl font-extrabold tabular-nums mt-1 ' + bmiColor}>{bmi.toFixed(1)}</div>
              <div className={'text-xs font-extrabold ' + bmiColor}>{bmiCategory}</div>
            </div>
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
              <Activity className="h-8 w-8 text-white" />
            </div>
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
        <SectionHeader icon={Target} title="Fitness Goals" desc="Primary + secondary goals to focus on" />
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Primary Goal *</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {GOALS.map((g) => {
              const active = basic.primaryGoal === g.value;
              return (
                <button key={g.value} type="button" onClick={() => onChange({ primaryGoal: g.value })} className={[
                  'p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1',
                  active ? 'border-red-500 bg-red-50 dark:bg-red-950/40 shadow-md ring-2 ring-red-200' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-red-300',
                ].join(' ')}>
                  <span className="text-xl">{g.emoji}</span>
                  <span className={'text-[9px] font-extrabold text-center leading-tight ' + (active ? 'text-red-800' : 'text-slate-700 dark:text-slate-300')}>
                    {g.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Secondary Goals (optional)</label>
          <div className="flex flex-wrap gap-1.5">
            {GOALS.filter((g) => g.value !== basic.primaryGoal).map((g) => {
              const active = basic.secondaryGoals.includes(g.value);
              return (
                <button key={g.value} type="button" onClick={() => onToggleGoal(g.value)} className={[
                  'inline-flex items-center px-2.5 py-1 rounded-lg border-2 text-xs font-extrabold transition',
                  active ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-800 shadow-sm' : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-700 hover:border-orange-300',
                ].join(' ')}>
                  {g.emoji} {g.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fitness Level</label>
            <select value={basic.fitnessLevel} onChange={(e) => onChange({ fitnessLevel: e.target.value })} className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-red-500">
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
              <option value="ATHLETE">Athlete</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5"><Zap className="h-3.5 w-3.5 inline mr-1" />Experience (years)</label>
            <input type="number" step="0.5" value={basic.experienceYears} onChange={(e) => onChange({ experienceYears: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="0" className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-red-500" />
          </div>
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

      <div className="rounded-2xl bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-2 border-red-200 dark:border-red-800 p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Info className="h-5 w-5 text-red-700 shrink-0" />
          <div className="text-sm text-red-900 dark:text-red-200">
            <div className="font-extrabold">Step 1 ready?</div>
            <div className="text-[11px] text-red-700 font-semibold">Next: medical info + emergency contact + preferences</div>
          </div>
        </div>
        <Button onClick={onNext} disabled={!validation.valid} className="bg-gradient-to-r from-red-600 to-orange-600 shadow-md">
          Next: Medical & Prefs <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, desc }: any) {
  return (
    <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-100 dark:border-neutral-800">
      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 text-white flex items-center justify-center shadow-md">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">{title}</h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">{desc}</p>
      </div>
    </div>
  );
}

function MetricInput({ label, emoji, value, onChange }: any) {
  return (
    <div>
      <label className="block text-[11px] font-extrabold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">{emoji} {label}</label>
      <input type="number" step="0.1" value={value} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0" className="h-11 w-full rounded-xl border-2 border-red-300 bg-red-50/50 dark:bg-red-950/30 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-red-500" />
    </div>
  );
}
