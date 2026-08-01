import {
  Pill, ToggleLeft, ToggleRight, Calendar, AlertTriangle,
  FileText, Thermometer, Syringe, Hash, AlertCircle,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import type { PetshopWizardMedicine } from '../../hooks/usePetshopWizard';
import { isMedicineCategory } from '../../hooks/usePetshopWizard';

interface Props {
  medicine: PetshopWizardMedicine;
  onChange: (patch: Partial<PetshopWizardMedicine>) => void;
  categoryType: string;
  errors: string[];
}

const DOSAGE_FORMS = [
  'Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injection', 'Cream',
  'Ointment', 'Drops', 'Powder', 'Chewable', 'Spot-On', 'Spray',
  'Shampoo', 'Gel', 'Paste',
];

const ADMIN_ROUTES = [
  'Oral', 'Topical', 'Injection - IM', 'Injection - SC', 'Injection - IV',
  'Ear Drops', 'Eye Drops', 'Nasal', 'Rectal', 'Skin Patch', 'Chewable',
];

const STORAGE_PRESETS = [
  'Room temperature (15-30°C)',
  'Cool place, below 25°C',
  'Refrigerate (2-8°C)',
  'Do not freeze',
  'Keep away from light',
  'Keep away from children',
  'Store in original container',
];

export function PetshopWizardStep3Medicine({ medicine, onChange, categoryType, errors }: Props) {
  const isMed = isMedicineCategory(categoryType);
  const today = new Date();
  const expiryDate = medicine.expiryDate ? new Date(medicine.expiryDate) : null;
  const daysToExpiry = expiryDate ? Math.ceil((expiryDate.getTime() - today.getTime()) / 86400000) : null;
  const isExpired = daysToExpiry !== null && daysToExpiry < 0;
  const isExpiringSoon = daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry <= 90;

  const addStoragePreset = (preset: string) => {
    const cur = medicine.storageInstructions ?? '';
    if (cur.includes(preset)) return;
    onChange({ storageInstructions: cur ? `${cur}\n${preset}` : preset });
  };

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

      <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-white border-2 border-amber-200 p-4 flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md shrink-0">
          <Pill className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-extrabold text-amber-900">Medicine & Expiry Tracking</h3>
          <p className="text-xs text-amber-800 font-semibold mt-0.5 leading-relaxed">
            {isMed
              ? 'Vet medicine requires expiry date and batch number. Fill in what applies.'
              : 'This category doesn\'t require medicine details. You can skip ahead — but you may still record an expiry date if the product has one (e.g. food, treats).'}
          </p>
        </div>
      </div>

      {/* PRESCRIPTION TOGGLE */}
      <button type="button" onClick={() => onChange({ isPrescriptionOnly: !medicine.isPrescriptionOnly })}
        className={['w-full rounded-2xl border-2 p-4 text-left transition',
          medicine.isPrescriptionOnly ? 'border-rose-500 bg-rose-50 shadow-md' : 'border-slate-200 bg-white hover:border-rose-300'].join(' ')}>
        <div className="flex items-center gap-3">
          <div className={['h-12 w-12 rounded-xl flex items-center justify-center shrink-0',
            medicine.isPrescriptionOnly ? 'bg-rose-600 text-white' : 'bg-rose-100 text-rose-700'].join(' ')}>
            <FileText className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="font-extrabold text-slate-900">Prescription Only (Rx)</div>
            <div className="text-xs text-slate-600 font-semibold">Requires vet's prescription to sell</div>
          </div>
          {medicine.isPrescriptionOnly ? <ToggleRight className="h-7 w-7 text-rose-600" /> : <ToggleLeft className="h-7 w-7 text-slate-400" />}
        </div>
      </button>

      {/* DOSAGE DETAILS */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Syringe} title="Dosage & Composition" tone="violet" />
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Active Ingredient" placeholder="Amoxicillin, Ivermectin..."
            value={medicine.activeIngredient}
            onChange={(e) => onChange({ activeIngredient: e.target.value })} />
          <Input label="Dosage Strength" placeholder="500mg, 10mg/ml..."
            value={medicine.dosageStrength}
            onChange={(e) => onChange({ dosageStrength: e.target.value })} />
        </div>

        <div>
          <Lbl>Dosage Form</Lbl>
          <div className="flex flex-wrap gap-1.5">
            {DOSAGE_FORMS.map((f) => {
              const a = medicine.dosageForm === f;
              return (
                <button key={f} type="button" onClick={() => onChange({ dosageForm: f })}
                  className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition',
                    a ? 'border-violet-500 bg-violet-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300'].join(' ')}>
                  {f}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Lbl>Administration Route</Lbl>
          <div className="flex flex-wrap gap-1.5">
            {ADMIN_ROUTES.map((r) => {
              const a = medicine.administrationRoute === r;
              return (
                <button key={r} type="button" onClick={() => onChange({ administrationRoute: r })}
                  className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition',
                    a ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'].join(' ')}>
                  {r}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* BATCH & EXPIRY */}
      <section className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white p-5 space-y-4">
        <SectionHead icon={Hash} title="Batch & Expiry" desc={isMed ? 'Required for medicine' : 'Optional'} tone="amber" />

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>
              Batch Number {isMed && <span className="text-rose-600">*</span>}
            </Lbl>
            <input value={medicine.batchNumber} onChange={(e) => onChange({ batchNumber: e.target.value })}
              placeholder="BN2026-A1234"
              className="h-12 w-full rounded-xl border-2 border-slate-200 px-3 text-base font-mono font-extrabold focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <Lbl>
              Expiry Date {isMed && <span className="text-rose-600">*</span>}
            </Lbl>
            <input type="date" value={medicine.expiryDate}
              onChange={(e) => onChange({ expiryDate: e.target.value })}
              className={['h-12 w-full rounded-xl border-2 px-3 text-base font-extrabold focus:outline-none focus:ring-4',
                isExpired ? 'border-rose-500 bg-rose-50 text-rose-900 focus:border-rose-600 focus:ring-rose-200'
                  : isExpiringSoon ? 'border-amber-500 bg-amber-50 text-amber-900 focus:border-amber-600 focus:ring-amber-200'
                    : 'border-slate-200 focus:border-amber-500 focus:ring-amber-200'].join(' ')} />
          </div>
        </div>

        {expiryDate && daysToExpiry !== null && (
          <div className={['rounded-2xl border-2 p-3 flex items-center gap-3',
            isExpired ? 'bg-rose-50 border-rose-300' :
            isExpiringSoon ? 'bg-amber-50 border-amber-300' :
            'bg-emerald-50 border-emerald-300'].join(' ')}>
            <div className={['h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
              isExpired ? 'bg-rose-600 text-white' :
              isExpiringSoon ? 'bg-amber-600 text-white' :
              'bg-emerald-600 text-white'].join(' ')}>
              {isExpired || isExpiringSoon ? <AlertTriangle className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
            </div>
            <div className="flex-1">
              <div className={['text-sm font-extrabold',
                isExpired ? 'text-rose-900' : isExpiringSoon ? 'text-amber-900' : 'text-emerald-900'].join(' ')}>
                {isExpired ? '⚠️ EXPIRED' : isExpiringSoon ? `⚠️ Expires in ${daysToExpiry} days` : `✓ Valid for ${daysToExpiry} days`}
              </div>
              <div className={['text-xs font-semibold',
                isExpired ? 'text-rose-800' : isExpiringSoon ? 'text-amber-800' : 'text-emerald-800'].join(' ')}>
                {expiryDate.toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}
                {isExpiringSoon && ' — consider discounting or returning to supplier'}
                {isExpired && ' — DO NOT SELL, mark for disposal'}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* STORAGE */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Thermometer} title="Storage Instructions" tone="sky" />

        <div>
          <Lbl>Quick add — click to append</Lbl>
          <div className="flex flex-wrap gap-1.5">
            {STORAGE_PRESETS.map((p) => (
              <button key={p} type="button" onClick={() => addStoragePreset(p)}
                className="px-3 py-1.5 rounded-full border-2 border-slate-200 bg-white hover:border-sky-400 hover:bg-sky-50 text-xs font-extrabold text-slate-700 transition">
                + {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Lbl>Storage Notes</Lbl>
          <textarea rows={3} value={medicine.storageInstructions}
            onChange={(e) => onChange({ storageInstructions: e.target.value })}
            placeholder="Store in a cool, dry place away from direct sunlight..."
            className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-sky-500" />
        </div>
      </section>
    </div>
  );
}

function SectionHead({ icon: Icon, title, desc, tone }: any) {
  const tones: Record<string, string> = {
    violet: 'from-violet-500 to-purple-700',
    amber: 'from-amber-500 to-orange-700',
    sky: 'from-sky-500 to-blue-700',
  };
  return (
    <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-extrabold text-slate-900">{title}</h3>
        {desc && <p className="text-xs text-slate-500 font-semibold">{desc}</p>}
      </div>
    </div>
  );
}

function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}
