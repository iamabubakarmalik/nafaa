import { useState } from 'react';
import {
  Shield, Package, Plus, X, HardHat, Wrench, Truck,
  Droplets, Flame, Zap, CheckCircle2,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import type { ApplianceWizardWarranty, ApplianceWizardInstallation } from '../../hooks/useApplianceWizard';

interface Props {
  warranty: ApplianceWizardWarranty;
  installation: ApplianceWizardInstallation;
  onChangeWarranty: (patch: Partial<ApplianceWizardWarranty>) => void;
  onChangeInstallation: (patch: Partial<ApplianceWizardInstallation>) => void;
  errors: string[];
}

const WARRANTY_PRESETS = [
  { label: '6 Months', months: 6 },
  { label: '1 Year', months: 12 },
  { label: '2 Years', months: 24 },
  { label: '3 Years', months: 36 },
  { label: '5 Years', months: 60 },
];

const COMPRESSOR_WARRANTIES = [
  { label: '5 Years', months: 60 },
  { label: '10 Years', months: 120 },
  { label: '12 Years', months: 144 },
  { label: '15 Years', months: 180 },
  { label: 'Lifetime', months: 999 },
];

const WARRANTY_TYPES = ['Manufacturer', 'Authorized Dealer', 'Shop Warranty', 'Extended', 'International'];

const COMMON_BOX_ITEMS = [
  'Main Unit', 'Power Cable', 'Remote Control', 'Batteries (AA/AAA)',
  'User Manual', 'Warranty Card', 'Quick Start Guide',
  'Installation Kit', 'Screws & Brackets', 'Wall Mount',
  'Drain Hose', 'Water Inlet Pipe', 'Gas Regulator',
  'Filter', 'Cleaning Cloth', 'Trays', 'Shelves',
  'Ice Tray', 'Egg Tray', 'Bottle Rack',
];

export function ApplianceWizardStep3Warranty({
  warranty, installation, onChangeWarranty, onChangeInstallation, errors,
}: Props) {
  const [newItem, setNewItem] = useState('');

  const addBoxItem = (item: string) => {
    const trimmed = item.trim();
    if (!trimmed) return;
    const current = warranty.boxContents ?? [];
    if (current.includes(trimmed)) return;
    onChangeWarranty({ boxContents: [...current, trimmed] });
    setNewItem('');
  };

  const removeBoxItem = (item: string) => {
    onChangeWarranty({ boxContents: (warranty.boxContents ?? []).filter((x) => x !== item) });
  };

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-300 p-4 text-sm text-rose-900 font-semibold">
          {errors.join(', ')}
        </div>
      )}

      {/* MAIN WARRANTY */}
      <section className="rounded-2xl border-2 border-cyan-300 bg-gradient-to-br from-cyan-50 to-white p-5 space-y-4">
        <SectionHead icon={Shield} title="Warranty Details" desc="Kitne mahine warranty hai" tone="cyan" />

        <div>
          <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Warranty Period</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {WARRANTY_PRESETS.map((p) => {
              const a = warranty.warrantyMonths === p.months;
              return (
                <button key={p.months} type="button" onClick={() => onChangeWarranty({ warrantyMonths: p.months })}
                  className={['px-3 py-2 rounded-xl border-2 text-xs font-extrabold transition',
                    a ? 'border-cyan-600 bg-cyan-600 text-white shadow-md' : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-300'].join(' ')}>
                  {p.label}
                </button>
              );
            })}
          </div>
          <input type="number" min="0" value={warranty.warrantyMonths}
            onChange={(e) => onChangeWarranty({ warrantyMonths: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Custom months"
            className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-cyan-500" />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Warranty Type</label>
            <select value={warranty.warrantyType} onChange={(e) => onChangeWarranty({ warrantyType: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-cyan-500">
              <option value="">Select type</option>
              {WARRANTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <Input label="Warranty Start Date" type="date" value={warranty.warrantyStartDate}
            onChange={(e) => onChangeWarranty({ warrantyStartDate: e.target.value })} />
        </div>

        {/* Extended warranties for major components */}
        <div className="rounded-xl bg-white border-2 border-cyan-200 p-4 space-y-3">
          <div className="text-xs font-extrabold uppercase text-cyan-800">🔧 Extended Component Warranty</div>

          <div>
            <label className="block text-[10px] uppercase font-extrabold text-slate-600 mb-1">Compressor Warranty (Fridge/AC)</label>
            <div className="flex flex-wrap gap-1.5">
              {COMPRESSOR_WARRANTIES.map((p) => {
                const a = warranty.compressorWarrantyMonths === p.months;
                return (
                  <button key={p.months} type="button" onClick={() => onChangeWarranty({ compressorWarrantyMonths: p.months })}
                    className={['px-2.5 py-1.5 rounded-lg border-2 text-xs font-extrabold transition',
                      a ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'].join(' ')}>
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-extrabold text-slate-600 mb-1">Motor Warranty (Washing Machine)</label>
            <input type="number" min="0" value={warranty.motorWarrantyMonths}
              onChange={(e) => onChangeWarranty({ motorWarrantyMonths: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="Months"
              className="h-10 w-full rounded-lg border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-cyan-500" />
          </div>
        </div>
      </section>

      {/* INSTALLATION */}
      <section className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white p-5 space-y-4">
        <SectionHead icon={HardHat} title="Installation Requirements" desc="Kya installation zaroori hai?" tone="amber" />

        <label className="flex items-center gap-3 p-4 rounded-xl bg-white border-2 border-amber-200 hover:border-amber-400 cursor-pointer">
          <input type="checkbox" checked={installation.requiresInstallation}
            onChange={(e) => onChangeInstallation({ requiresInstallation: e.target.checked })}
            className="h-5 w-5 rounded" />
          <HardHat className="h-5 w-5 text-amber-700" />
          <div className="flex-1">
            <div className="font-extrabold text-sm text-slate-900">Requires Professional Installation</div>
            <div className="text-xs text-slate-500 font-semibold">AC, Fridge, Washing Machine etc.</div>
          </div>
        </label>

        {installation.requiresInstallation && (
          <>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Installation Charge (Rs)" type="number" value={installation.installationCharge}
                onChange={(e) => onChangeInstallation({ installationCharge: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="2000" />
              <Input label="Installation Time (hours)" type="number" step="0.5" value={installation.installationTimeHours}
                onChange={(e) => onChangeInstallation({ installationTimeHours: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="2" />
            </div>

            <label className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border-2 border-emerald-200 cursor-pointer">
              <input type="checkbox" checked={installation.installationCovered}
                onChange={(e) => onChangeInstallation({ installationCovered: e.target.checked })}
                className="h-5 w-5 rounded" />
              <CheckCircle2 className="h-5 w-5 text-emerald-700" />
              <div className="flex-1">
                <div className="font-extrabold text-sm text-emerald-900">🎁 Free Installation Included</div>
                <div className="text-xs text-emerald-700 font-semibold">Price mein shamil hai</div>
              </div>
            </label>

            <div>
              <div className="text-xs font-extrabold uppercase text-slate-600 mb-2">🔧 Required Connections</div>
              <div className="grid grid-cols-3 gap-2">
                <Tog checked={installation.requiresElectrician} onChange={(v: boolean) => onChangeInstallation({ requiresElectrician: v })}
                  icon={Zap} label="Electrician" color="amber" />
                <Tog checked={installation.requiresPlumbing} onChange={(v: boolean) => onChangeInstallation({ requiresPlumbing: v })}
                  icon={Droplets} label="Plumbing" color="blue" />
                <Tog checked={installation.requiresGasConnection} onChange={(v: boolean) => onChangeInstallation({ requiresGasConnection: v })}
                  icon={Flame} label="Gas Line" color="orange" />
              </div>
            </div>
          </>
        )}
      </section>

      {/* DELIVERY */}
      <section className="rounded-2xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-white p-5 space-y-4">
        <SectionHead icon={Truck} title="Delivery Requirements" desc="Bhaari saman ki delivery" tone="blue" />

        <div className="grid grid-cols-2 gap-2">
          <Tog checked={installation.requiresLargeVehicle} onChange={(v: boolean) => onChangeInstallation({ requiresLargeVehicle: v })}
            icon={Truck} label="Large Vehicle (Suzuki/Truck)" color="violet" />
          <Tog checked={installation.freeDelivery} onChange={(v: boolean) => onChangeInstallation({ freeDelivery: v })}
            icon={CheckCircle2} label="Free Delivery" color="emerald" />
        </div>

        {!installation.freeDelivery && (
          <Input label="Delivery Charge (per km)" type="number" step="0.01" value={installation.deliveryChargePerKm}
            onChange={(e) => onChangeInstallation({ deliveryChargePerKm: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="30" />
        )}
      </section>

      {/* BOX CONTENTS */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Package} title="Box Contents" desc="Box mein kya kya hai" tone="slate" />

        <div>
          <label className="block text-xs font-extrabold uppercase text-slate-600 mb-2">Quick add — click to add</label>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_BOX_ITEMS.map((item) => {
              const added = warranty.boxContents?.includes(item);
              return (
                <button key={item} type="button" disabled={added} onClick={() => addBoxItem(item)}
                  className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition disabled:opacity-40 disabled:cursor-not-allowed',
                    added ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'].join(' ')}>
                  {added ? '✓ ' : '+ '}{item}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Custom item</label>
          <div className="flex gap-2">
            <input value={newItem} onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addBoxItem(newItem)}
              placeholder="e.g. Extra Filter"
              className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-slate-500" />
            <button type="button" onClick={() => addBoxItem(newItem)} disabled={!newItem.trim()}
              className="h-11 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-sm inline-flex items-center gap-1 disabled:opacity-50">
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
                <div key={item} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 border-2 border-slate-300 text-xs font-extrabold text-slate-800">
                  {item}
                  <button type="button" onClick={() => removeBoxItem(item)} className="hover:text-rose-700">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function SectionHead({ icon: Icon, title, desc, tone }: any) {
  const tones: Record<string, string> = {
    cyan: 'from-cyan-500 to-teal-700',
    amber: 'from-amber-500 to-orange-700',
    blue: 'from-blue-500 to-cyan-700',
    slate: 'from-slate-500 to-slate-700',
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

function Tog({ checked, onChange, icon: Icon, label, color }: any) {
  const colors: Record<string, string> = {
    amber: 'border-amber-500 bg-amber-50 text-amber-800',
    blue: 'border-blue-500 bg-blue-50 text-blue-800',
    orange: 'border-orange-500 bg-orange-50 text-orange-800',
    violet: 'border-violet-500 bg-violet-50 text-violet-800',
    emerald: 'border-emerald-500 bg-emerald-50 text-emerald-800',
  };
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={['flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition',
        checked ? colors[color] : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'].join(' ')}>
      <Icon className="h-5 w-5" />
      <span className="text-[11px] font-extrabold text-center leading-tight">{label}</span>
    </button>
  );
}
