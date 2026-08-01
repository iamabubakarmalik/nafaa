import { useState } from 'react';
import { Shield, Package, Plus, X, FileText, Globe } from 'lucide-react';
import { Input } from '@core/ui/Input';
import type { ElectronicsWizardWarranty } from '../../hooks/useElectronicsWizard';

interface Props {
  warranty: ElectronicsWizardWarranty;
  onChange: (patch: Partial<ElectronicsWizardWarranty>) => void;
  errors: string[];
}

const WARRANTY_PRESETS = [
  { label: '3 Months', months: 3 },
  { label: '6 Months', months: 6 },
  { label: '1 Year', months: 12 },
  { label: '2 Years', months: 24 },
  { label: '3 Years', months: 36 },
];

const WARRANTY_TYPES = ['Manufacturer', 'Local Dealer', 'Shop Warranty', 'Extended', 'International', 'No Warranty'];

const COMMON_BOX_ITEMS = [
  'Device', 'Charger', 'USB Cable', 'Type-C Cable', 'Lightning Cable',
  'Earphones', 'Wired Earbuds', 'Adapter', 'Wall Plug',
  'User Manual', 'Quick Start Guide', 'Warranty Card',
  'SIM Ejector', 'Screen Protector', 'Silicon Case', 'Carrying Pouch',
  'HDMI Cable', 'AUX Cable', 'Remote Control', 'Batteries (AA/AAA)',
  'Mounting Kit', 'Cleaning Cloth', 'Stickers',
];

export function ElectronicsWizardStep3Warranty({ warranty, onChange, errors }: Props) {
  const [newItem, setNewItem] = useState('');

  const addBoxItem = (item: string) => {
    const trimmed = item.trim();
    if (!trimmed) return;
    const current = warranty.boxContents ?? [];
    if (current.includes(trimmed)) return;
    onChange({ boxContents: [...current, trimmed] });
    setNewItem('');
  };

  const removeBoxItem = (item: string) => {
    onChange({ boxContents: (warranty.boxContents ?? []).filter((x) => x !== item) });
  };

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-300 p-4 text-sm text-rose-900 font-semibold">
          {errors.join(', ')}
        </div>
      )}

      {/* Warranty */}
      <section className="rounded-2xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-white p-5 space-y-4">
        <SectionHead icon={Shield} title="Warranty Details" desc="Kitne mahine warranty hai" tone="blue" />

        <div>
          <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Warranty Period</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {WARRANTY_PRESETS.map((p) => {
              const a = warranty.warrantyMonths === p.months;
              return (
                <button key={p.months} type="button" onClick={() => onChange({ warrantyMonths: p.months })}
                  className={['px-3 py-2 rounded-xl border-2 text-xs font-extrabold transition',
                    a ? 'border-blue-600 bg-blue-600 text-white shadow-md' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'].join(' ')}>
                  {p.label}
                </button>
              );
            })}
          </div>
          <input type="number" min="0" value={warranty.warrantyMonths}
            onChange={(e) => onChange({ warrantyMonths: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Custom months"
            className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Warranty Type</label>
            <select value={warranty.warrantyType} onChange={(e) => onChange({ warrantyType: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
              <option value="">Select type</option>
              {WARRANTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <Input label="Start Date" type="date" value={warranty.warrantyStartDate}
            onChange={(e) => onChange({ warrantyStartDate: e.target.value })} />
        </div>

        <label className="flex items-center gap-3 p-3 rounded-xl bg-white border-2 border-slate-200 hover:border-blue-300 cursor-pointer">
          <input type="checkbox" checked={warranty.hasInternationalWarranty}
            onChange={(e) => onChange({ hasInternationalWarranty: e.target.checked })}
            className="h-5 w-5 rounded" />
          <Globe className="h-5 w-5 text-blue-600" />
          <div className="flex-1">
            <div className="font-extrabold text-sm text-slate-900">International Warranty</div>
            <div className="text-xs text-slate-500 font-semibold">Duniya bhar mein claim ho sakti hai</div>
          </div>
        </label>
      </section>

      {/* IMEI/Serial */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHead icon={FileText} title="Serial Tracking Settings" tone="violet" />
        <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-violet-300 cursor-pointer">
          <input type="checkbox" checked={warranty.hasImei}
            onChange={(e) => onChange({ hasImei: e.target.checked })}
            className="h-5 w-5 rounded" />
          <div className="flex-1">
            <div className="font-extrabold text-sm text-slate-900">Has IMEI Number</div>
            <div className="text-xs text-slate-500 font-semibold">Phones, tablets, cellular devices ke liye</div>
          </div>
        </label>
      </section>

      {/* Box Contents */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Package} title="Box Contents" desc="Box mein kya kya hai" tone="amber" />

        <div>
          <label className="block text-xs font-extrabold uppercase text-slate-600 mb-2">Quick add — click to add</label>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_BOX_ITEMS.map((item) => {
              const added = warranty.boxContents?.includes(item);
              return (
                <button key={item} type="button" disabled={added} onClick={() => addBoxItem(item)}
                  className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition disabled:opacity-40 disabled:cursor-not-allowed',
                    added ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700 hover:border-amber-400'].join(' ')}>
                  {added ? '✓ ' : '+ '}{item}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Ya custom item likhein</label>
          <div className="flex gap-2">
            <input value={newItem} onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addBoxItem(newItem)}
              placeholder="e.g. Extra Charger Head"
              className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
            <button type="button" onClick={() => addBoxItem(newItem)} disabled={!newItem.trim()}
              className="h-11 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm inline-flex items-center gap-1 disabled:opacity-50">
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
        </div>

        {(warranty.boxContents ?? []).length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-2">
              {warranty.boxContents.length} items in box
            </div>
            <div className="flex flex-wrap gap-1.5">
              {warranty.boxContents.map((item) => (
                <div key={item} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 border-2 border-amber-300 text-xs font-extrabold text-amber-800">
                  {item}
                  <button type="button" onClick={() => removeBoxItem(item)} className="hover:text-rose-700">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
          <label className="flex items-center gap-2 p-2.5 rounded-xl border-2 border-slate-200 hover:border-amber-300 cursor-pointer">
            <input type="checkbox" checked={warranty.hasManual}
              onChange={(e) => onChange({ hasManual: e.target.checked })}
              className="h-4 w-4 rounded" />
            <span className="text-xs font-extrabold text-slate-700">📖 User Manual</span>
          </label>
          <label className="flex items-center gap-2 p-2.5 rounded-xl border-2 border-slate-200 hover:border-amber-300 cursor-pointer">
            <input type="checkbox" checked={warranty.hasWarrantyCard}
              onChange={(e) => onChange({ hasWarrantyCard: e.target.checked })}
              className="h-4 w-4 rounded" />
            <span className="text-xs font-extrabold text-slate-700">📄 Warranty Card</span>
          </label>
        </div>
      </section>
    </div>
  );
}

function SectionHead({ icon: Icon, title, desc, tone }: any) {
  const tones: Record<string, string> = {
    blue: 'from-blue-500 to-cyan-700',
    violet: 'from-violet-500 to-purple-700',
    amber: 'from-amber-500 to-orange-700',
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
