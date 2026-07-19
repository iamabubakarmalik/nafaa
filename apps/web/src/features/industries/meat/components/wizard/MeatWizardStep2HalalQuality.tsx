import { useState } from 'react';
import {
  ShieldCheck, Award, AlertCircle, Leaf, Snowflake, Sparkles,
  Thermometer, Calendar, Package, Plus, X, Info,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import type { MeatWizardHalalQuality } from '../../hooks/useMeatWizard';
import type { SlaughterMethod, QualityGrade } from '../../api/products.api';

interface Props {
  halalQuality: MeatWizardHalalQuality;
  onChange: (patch: Partial<MeatWizardHalalQuality>) => void;
  onToggleCert: (cert: string) => void;
  errors: string[];
}

const SLAUGHTER_METHODS: { value: SlaughterMethod; label: string; emoji: string; desc: string }[] = [
  { value: 'HALAL_HAND', label: 'Halal (Hand)', emoji: '🕌', desc: 'Traditional hand cut' },
  { value: 'HALAL_MACHINE', label: 'Halal (Machine)', emoji: '⚙️', desc: 'Mechanized halal' },
  { value: 'KOSHER', label: 'Kosher', emoji: '✡️', desc: 'Jewish tradition' },
  { value: 'STANDARD', label: 'Standard', emoji: '📋', desc: 'Regular method' },
  { value: 'ORGANIC', label: 'Organic', emoji: '🌿', desc: 'Certified organic' },
  { value: 'FREE_RANGE', label: 'Free Range', emoji: '🌾', desc: 'Pasture raised' },
];

const QUALITY_GRADES: { value: QualityGrade; label: string; color: string }[] = [
  { value: 'PREMIUM', label: 'Premium', color: 'from-amber-500 to-yellow-600' },
  { value: 'GRADE_A', label: 'Grade A', color: 'from-emerald-500 to-green-600' },
  { value: 'GRADE_B', label: 'Grade B', color: 'from-blue-500 to-cyan-600' },
  { value: 'GRADE_C', label: 'Grade C', color: 'from-slate-500 to-slate-700' },
  { value: 'STANDARD', label: 'Standard', color: 'from-slate-400 to-slate-600' },
  { value: 'ECONOMY', label: 'Economy', color: 'from-orange-400 to-red-500' },
];

const COMMON_CERTS = ['JAKIM', 'ISWA', 'IFANCA', 'HMC', 'MUI', 'SANHA', 'ESMA', 'USDA Organic'];

const PACKAGING_TYPES = ['Vacuum Sealed', 'Tray Pack', 'Butcher Paper', 'Bulk Bag', 'Cryovac', 'MAP (Modified Atmosphere)'];

export function MeatWizardStep2HalalQuality({ halalQuality, onChange, onToggleCert, errors }: Props) {
  const [customCert, setCustomCert] = useState('');

  const addCustomCert = () => {
    const cert = customCert.trim();
    if (!cert) return;
    onToggleCert(cert);
    setCustomCert('');
  };

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

      <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-200 p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-extrabold text-emerald-900 text-sm">Halal Certification & Quality</h3>
          <p className="text-xs text-emerald-800 font-semibold mt-0.5 leading-relaxed">
            Certification, quality grade, storage requirements — customer trust badhega.
          </p>
        </div>
      </div>

      {/* Slaughter Method */}
      <section className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 text-white flex items-center justify-center shadow-md">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-emerald-900 text-base">Slaughter Method</h3>
            <p className="text-xs text-emerald-700 font-semibold">How was the animal slaughtered?</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SLAUGHTER_METHODS.map((m) => {
            const active = halalQuality.slaughterMethod === m.value;
            return (
              <button key={m.value} type="button"
                onClick={() => onChange({ slaughterMethod: m.value, isHalalCertified: m.value.startsWith('HALAL') ? true : halalQuality.isHalalCertified })}
                className={['p-3 rounded-xl border-2 text-center transition',
                  active ? 'border-emerald-600 bg-emerald-600 text-white shadow-md scale-105'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400'].join(' ')}>
                <div className="text-2xl mb-1">{m.emoji}</div>
                <div className="text-[11px] font-extrabold">{m.label}</div>
                <div className={['text-[9px] font-bold mt-0.5', active ? 'text-white/80' : 'text-slate-500'].join(' ')}>{m.desc}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Halal Certification */}
      <section className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md">
            <Award className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-emerald-900 text-base">Halal Certification</h3>
            <p className="text-xs text-emerald-700 font-semibold">Certificate details</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={halalQuality.isHalalCertified}
              onChange={(e) => onChange({ isHalalCertified: e.target.checked })} className="h-5 w-5 rounded" />
            <span className="text-sm font-extrabold text-emerald-900">Halal Certified</span>
          </label>
        </div>

        {halalQuality.isHalalCertified && (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Certificate Number *" value={halalQuality.halalCertNumber}
                onChange={(e) => onChange({ halalCertNumber: e.target.value })}
                placeholder="HAL-2026-001234" hint="Official cert #" />
              <Input label="Certified By" value={halalQuality.halalCertBy}
                onChange={(e) => onChange({ halalCertBy: e.target.value })}
                placeholder="JAKIM, HMC, SANHA..." hint="Certifying authority" />
            </div>
            <Input label="Certificate Expiry Date" type="date" value={halalQuality.halalCertExpiry}
              onChange={(e) => onChange({ halalCertExpiry: e.target.value })}
              leftIcon={<Calendar className="h-4 w-4 text-slate-400" />} />
          </>
        )}

        {/* Other Certifications */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Other Certifications</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {COMMON_CERTS.map((cert) => {
              const active = halalQuality.otherCerts.includes(cert);
              return (
                <button key={cert} type="button" onClick={() => onToggleCert(cert)}
                  className={['px-3 py-1.5 rounded-lg text-xs font-extrabold transition',
                    active ? 'bg-emerald-600 text-white shadow'
                      : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-emerald-300'].join(' ')}>
                  {active ? '✓ ' : '+ '}{cert}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <input value={customCert} onChange={(e) => setCustomCert(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomCert()}
              placeholder="Custom certification..."
              className="h-10 flex-1 rounded-lg border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
            <button type="button" onClick={addCustomCert} disabled={!customCert.trim()}
              className="h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1 disabled:opacity-50">
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
          {halalQuality.otherCerts.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {halalQuality.otherCerts.map((c) => (
                <span key={c} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-300">
                  {c}
                  <button onClick={() => onToggleCert(c)} className="hover:text-rose-600">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Quality Grade */}
      <section className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-amber-900 text-base">Quality Grade</h3>
            <p className="text-xs text-amber-700 font-semibold">Meat quality classification</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {QUALITY_GRADES.map((g) => {
            const active = halalQuality.qualityGrade === g.value;
            return (
              <button key={g.value} type="button" onClick={() => onChange({ qualityGrade: g.value })}
                className={['p-3 rounded-xl border-2 text-center transition font-extrabold text-sm',
                  active ? 'text-white shadow-md scale-105 border-current bg-gradient-to-br ' + g.color
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'].join(' ')}>
                {g.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Production Method */}
      <section className="rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center shadow-md">
            <Leaf className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-green-900 text-base">Production Method</h3>
            <p className="text-xs text-green-700 font-semibold">Farming & preparation attributes</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { key: 'isOrganic', label: 'Organic', icon: Leaf, color: 'green' },
            { key: 'isFreeRange', label: 'Free Range', icon: Award, color: 'blue' },
            { key: 'isGrainFed', label: 'Grain Fed', icon: Package, color: 'amber' },
            { key: 'isGrassFed', label: 'Grass Fed', icon: Leaf, color: 'emerald' },
            { key: 'isFrozen', label: 'Frozen', icon: Snowflake, color: 'blue' },
            { key: 'isMarinated', label: 'Marinated', icon: Sparkles, color: 'orange' },
          ].map((flag) => {
            const active = halalQuality[flag.key as keyof MeatWizardHalalQuality] as boolean;
            const Icon = flag.icon;
            return (
              <label key={flag.key} className={
                'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition ' +
                (active ? 'border-green-500 bg-green-50 shadow' : 'border-slate-200 bg-white hover:border-green-300')
              }>
                <input type="checkbox" checked={active}
                  onChange={(e) => onChange({ [flag.key]: e.target.checked } as any)}
                  className="h-4 w-4 rounded" />
                <Icon className={['h-4 w-4', active ? 'text-green-600' : 'text-slate-400'].join(' ')} />
                <span className={['text-xs font-extrabold', active ? 'text-green-900' : 'text-slate-700'].join(' ')}>{flag.label}</span>
              </label>
            );
          })}
        </div>

        {halalQuality.isMarinated && (
          <Input label="Marination Type" value={halalQuality.marinationType}
            onChange={(e) => onChange({ marinationType: e.target.value })}
            placeholder="Tikka masala, tandoori, BBQ..." />
        )}
      </section>

      {/* Storage & Packaging */}
      <section className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex items-center justify-center shadow-md">
            <Thermometer className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-blue-900 text-base">Storage & Packaging</h3>
            <p className="text-xs text-blue-700 font-semibold">Temperature, shelf life, packaging</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Input label="Min Storage Temp (°C)" type="number" step="0.1" value={halalQuality.storageTempMin}
            onChange={(e) => onChange({ storageTempMin: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0" hint="Refrigeration min" />
          <Input label="Max Storage Temp (°C)" type="number" step="0.1" value={halalQuality.storageTempMax}
            onChange={(e) => onChange({ storageTempMax: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="4" hint="Refrigeration max" />
          <Input label="Shelf Life (days)" type="number" value={halalQuality.shelfLifeDays}
            onChange={(e) => onChange({ shelfLifeDays: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="3" hint="Storage duration" />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Packaging Type</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PACKAGING_TYPES.map((p) => {
              const active = halalQuality.packagingType === p;
              return (
                <button key={p} type="button" onClick={() => onChange({ packagingType: active ? '' : p })}
                  className={['p-2 rounded-lg text-xs font-extrabold transition border-2',
                    active ? 'border-blue-500 bg-blue-50 text-blue-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'].join(' ')}>
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        <Input label="Standard Packaging Weight (kg)" type="number" step="0.01" value={halalQuality.packagingWeight}
          onChange={(e) => onChange({ packagingWeight: e.target.value === '' ? '' : Number(e.target.value) })}
          placeholder="Optional" hint="Default pack size" />
      </section>
    </div>
  );
}
