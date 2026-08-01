import {
  Award, Heart, Leaf, Shield, Check, X, AlertCircle,
  Calendar, Package, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import type { CosmeticsWizardBatch, CosmeticsWizardCertifications } from '../../hooks/useCosmeticsWizard';

interface Props {
  certifications: CosmeticsWizardCertifications;
  onChangeCert: (patch: Partial<CosmeticsWizardCertifications>) => void;
  batch: CosmeticsWizardBatch;
  onChangeBatch: (patch: Partial<CosmeticsWizardBatch>) => void;
  errors: string[];
}

const CERT_LIST = [
  { key: 'isHalalCertified' as const, label: 'Halal Certified', icon: '🕌', color: 'emerald', desc: 'Certified halal for Muslim consumers' },
  { key: 'isCrueltyFree' as const, label: 'Cruelty-Free', icon: '🐰', color: 'pink', desc: 'Not tested on animals' },
  { key: 'isVegan' as const, label: 'Vegan', icon: '🌱', color: 'green', desc: 'No animal-derived ingredients' },
  { key: 'isOrganic' as const, label: 'Organic', icon: '🌿', color: 'emerald', desc: 'Certified organic ingredients' },
  { key: 'isHypoallergenic' as const, label: 'Hypoallergenic', icon: '🛡️', color: 'blue', desc: 'Minimal allergy risk' },
  { key: 'isFragranceFree' as const, label: 'Fragrance-Free', icon: '🚫', color: 'slate', desc: 'No added fragrance' },
  { key: 'isSulfateFree' as const, label: 'Sulfate-Free', icon: '💧', color: 'sky', desc: 'No SLS/SLES' },
  { key: 'isParabenFree' as const, label: 'Paraben-Free', icon: '✅', color: 'violet', desc: 'No parabens' },
  { key: 'isNoncomedogenic' as const, label: 'Non-Comedogenic', icon: '💠', color: 'sky', desc: "Won't clog pores" },
  { key: 'isDermatologistTested' as const, label: 'Dermatologist Tested', icon: '👨‍⚕️', color: 'rose', desc: 'Skin doctor approved' },
];

export function CosmeticsWizardStep4Certifications({
  certifications, onChangeCert, batch, onChangeBatch, errors,
}: Props) {
  const certCount = Object.values(certifications).filter(Boolean).length;

  const calcExpiry = () => {
    const months = Number(batch.shelfLifeMonths || 0);
    if (!months || !batch.manufactureDate) return;
    const mfg = new Date(batch.manufactureDate);
    mfg.setMonth(mfg.getMonth() + months);
    onChangeBatch({ expiryDate: mfg.toISOString().slice(0, 10) });
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

      {/* CERTIFICATIONS */}
      <section className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-emerald-900">Certifications & Product Claims</h3>
              <p className="text-xs text-emerald-700 font-semibold">Boost trust & filter matching</p>
            </div>
          </div>
          {certCount > 0 && (
            <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-extrabold">
              {certCount} selected
            </span>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-2">
          {CERT_LIST.map((c) => {
            const a = certifications[c.key];
            const tones: Record<string, string> = {
              emerald: 'border-emerald-500 bg-emerald-50 text-emerald-800',
              pink: 'border-pink-500 bg-pink-50 text-pink-800',
              green: 'border-green-500 bg-green-50 text-green-800',
              blue: 'border-blue-500 bg-blue-50 text-blue-800',
              slate: 'border-slate-500 bg-slate-50 text-slate-800',
              sky: 'border-sky-500 bg-sky-50 text-sky-800',
              violet: 'border-violet-500 bg-violet-50 text-violet-800',
              rose: 'border-rose-500 bg-rose-50 text-rose-800',
            };
            return (
              <button key={c.key} type="button"
                onClick={() => onChangeCert({ [c.key]: !a } as any)}
                className={['w-full text-left p-3 rounded-xl border-2 transition flex items-center gap-3',
                  a ? tones[c.color] + ' shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'].join(' ')}>
                <span className="text-2xl shrink-0">{c.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-sm">{c.label}</div>
                  <div className="text-[10px] font-bold opacity-75">{c.desc}</div>
                </div>
                <div className={['h-6 w-6 rounded-lg flex items-center justify-center shrink-0',
                  a ? 'bg-current text-white' : 'bg-slate-100 text-slate-400'].join(' ')}>
                  {a ? <Check className="h-3.5 w-3.5 text-white" /> : null}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* BATCH TRACKING TOGGLE */}
      <button type="button" onClick={() => onChangeBatch({ requiresBatchTracking: !batch.requiresBatchTracking })}
        className={['w-full rounded-2xl border-2 p-4 text-left transition',
          batch.requiresBatchTracking ? 'border-amber-500 bg-amber-50 shadow-md' : 'border-slate-200 bg-white hover:border-amber-300'].join(' ')}>
        <div className="flex items-center gap-3">
          <div className={['h-12 w-12 rounded-xl flex items-center justify-center shrink-0',
            batch.requiresBatchTracking ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700'].join(' ')}>
            <Package className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="font-extrabold text-slate-900">Batch & Expiry Tracking</div>
            <div className="text-xs text-slate-600 font-semibold">
              Critical for cosmetics — track manufacturing date, expiry, batch number
            </div>
          </div>
          {batch.requiresBatchTracking ? <ToggleRight className="h-7 w-7 text-amber-600" /> : <ToggleLeft className="h-7 w-7 text-slate-400" />}
        </div>
      </button>

      {batch.requiresBatchTracking && (
        <section className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-amber-900">Batch Details</h3>
              <p className="text-xs text-amber-700 font-semibold">This info will create the initial batch on save</p>
            </div>
          </div>

          <div>
            <Lbl>Shelf Life (months)</Lbl>
            <div className="flex gap-1.5 flex-wrap mb-2">
              {[12, 18, 24, 30, 36, 48].map((m) => (
                <button key={m} type="button" onClick={() => onChangeBatch({ shelfLifeMonths: m })}
                  className={['px-3 py-2 rounded-xl border-2 text-xs font-extrabold transition',
                    batch.shelfLifeMonths === m ? 'border-amber-600 bg-amber-600 text-white shadow-md'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-amber-400'].join(' ')}>
                  {m} months
                </button>
              ))}
            </div>
            <input type="number" value={batch.shelfLifeMonths}
              onChange={(e) => onChangeBatch({ shelfLifeMonths: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="Custom months"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-amber-500" />
          </div>

          <div className="rounded-2xl bg-white border-2 border-amber-200 p-4 space-y-3">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-amber-700">
              Initial batch (optional — fill if adding stock now)
            </div>

            <Input label="Batch Number" value={batch.initialBatchNumber}
              onChange={(e) => onChangeBatch({ initialBatchNumber: e.target.value })}
              placeholder="B2026-001, LOT-A1234" />

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Lbl>Manufacture Date</Lbl>
                <input type="date" value={batch.manufactureDate}
                  onChange={(e) => onChangeBatch({ manufactureDate: e.target.value })}
                  onBlur={calcExpiry}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Lbl>Expiry Date {batch.initialBatchNumber?.trim() && '*'}</Lbl>
                  {batch.manufactureDate && batch.shelfLifeMonths && (
                    <button type="button" onClick={calcExpiry}
                      className="text-[10px] font-extrabold text-amber-700 hover:underline">
                      Auto-calculate
                    </button>
                  )}
                </div>
                <input type="date" value={batch.expiryDate}
                  onChange={(e) => onChangeBatch({ expiryDate: e.target.value })}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
              </div>
            </div>

            <Input label="Supplier Ref (optional)" value={batch.supplierRef}
              onChange={(e) => onChangeBatch({ supplierRef: e.target.value })}
              placeholder="Invoice # / PO #" />

            {batch.expiryDate && (
              <div className="rounded-xl bg-amber-100 border-2 border-amber-300 p-3 text-xs font-extrabold text-amber-900">
                📅 Batch will expire on{' '}
                {new Date(batch.expiryDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}
                {(() => {
                  const days = Math.ceil((new Date(batch.expiryDate).getTime() - Date.now()) / 86400000);
                  return days > 0 ? ` — ${days} days from today` : ' — ⚠️ already expired';
                })()}
              </div>
            )}
          </div>
        </section>
      )}

      {!batch.requiresBatchTracking && (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <Shield className="h-10 w-10 text-slate-400 mx-auto mb-2" />
          <div className="font-extrabold text-slate-700">Batch tracking is off</div>
          <div className="text-xs text-slate-500 font-semibold mt-1">
            Recommended for cosmetics — expired products can't be sold safely.
          </div>
        </div>
      )}
    </div>
  );
}

function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}
