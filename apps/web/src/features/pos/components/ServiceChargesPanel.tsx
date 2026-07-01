import { useState } from 'react';
import {
  Wrench, Plus, Trash2, X, Sparkles, Droplet, Hammer,
  Scissors, Truck, Layers, Package, ChevronDown, ChevronUp,
} from 'lucide-react';
import { formatPKR } from '@/lib/format';
import type { ServiceChargeItem } from '@/api/sales.api';

const PRESETS: Array<{ type: string; label: string; icon: any; color: string; suggested?: number }> = [
  { type: 'GLUE',         label: 'Adhesive / Glue',     icon: Droplet,  color: 'blue',    suggested: 2000 },
  { type: 'INSTALLATION', label: 'Installation Labor',  icon: Hammer,   color: 'amber',   suggested: 3000 },
  { type: 'CUTTING',      label: 'Cutting / Fitting',   icon: Scissors, color: 'violet',  suggested: 1500 },
  { type: 'DELIVERY',     label: 'Delivery',            icon: Truck,    color: 'emerald', suggested: 1000 },
  { type: 'UNDERLAY',     label: 'Underlay / Foam',     icon: Layers,   color: 'rose',    suggested: 5000 },
  { type: 'OTHER',        label: 'Other / Custom',      icon: Package,  color: 'slate' },
];

const COLOR_MAP: Record<string, { bg: string; border: string; icon: string; text: string }> = {
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-300',    icon: 'text-blue-600',    text: 'text-blue-900'    },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-300',   icon: 'text-amber-600',   text: 'text-amber-900'   },
  violet:  { bg: 'bg-violet-50',  border: 'border-violet-300',  icon: 'text-violet-600',  text: 'text-violet-900'  },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-300', icon: 'text-emerald-600', text: 'text-emerald-900' },
  rose:    { bg: 'bg-rose-50',    border: 'border-rose-300',    icon: 'text-rose-600',    text: 'text-rose-900'    },
  slate:   { bg: 'bg-slate-50',   border: 'border-slate-300',   icon: 'text-slate-600',   text: 'text-slate-900'   },
};

interface Props {
  charges: ServiceChargeItem[];
  onChange: (charges: ServiceChargeItem[]) => void;
}

export function ServiceChargesPanel({ charges, onChange }: Props) {
  const [expanded, setExpanded] = useState(charges.length > 0);
  const [customLabel, setCustomLabel] = useState('');
  const [customAmount, setCustomAmount] = useState('');

  const total = charges.reduce((sum, c) => sum + Number(c.amount || 0), 0);

  const addPreset = (preset: typeof PRESETS[number]) => {
    const existing = charges.findIndex((c) => c.type === preset.type);
    if (existing >= 0) {
      onChange(charges.filter((_, i) => i !== existing));
      return;
    }
    onChange([
      ...charges,
      {
        type: preset.type,
        label: preset.label,
        amount: preset.suggested ?? 0,
      },
    ]);
  };

  const updateCharge = (idx: number, patch: Partial<ServiceChargeItem>) => {
    onChange(charges.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const removeCharge = (idx: number) => {
    onChange(charges.filter((_, i) => i !== idx));
  };

  const addCustom = () => {
    const label = customLabel.trim();
    const amount = Number(customAmount);
    if (!label || !(amount > 0)) return;
    onChange([...charges, { type: 'CUSTOM', label, amount }]);
    setCustomLabel('');
    setCustomAmount('');
  };

  return (
    <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50/60 to-orange-50/40 overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-amber-100/50 transition"
      >
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md">
            <Wrench className="h-4 w-4" />
          </div>
          <div className="text-left">
            <div className="text-xs font-extrabold text-amber-900 flex items-center gap-1">
              Service Charges
              {charges.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-600 text-white text-[9px] font-extrabold">
                  {charges.length}
                </span>
              )}
            </div>
            <div className="text-[10px] text-amber-700 font-semibold">
              {total > 0 ? `+${formatPKR(total)}` : 'Glue, installation, delivery...'}
            </div>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-amber-700" /> : <ChevronDown className="h-4 w-4 text-amber-700" />}
      </button>

      {expanded && (
        <div className="border-t-2 border-amber-200 p-3 space-y-3 bg-white/60">
          {/* Preset buttons */}
          <div>
            <div className="text-[9px] uppercase tracking-wider font-extrabold text-slate-600 mb-1.5 flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5 text-amber-500" />
              Quick Add
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {PRESETS.map((p) => {
                const Icon = p.icon;
                const active = charges.some((c) => c.type === p.type);
                const c = COLOR_MAP[p.color];
                return (
                  <button
                    key={p.type}
                    type="button"
                    onClick={() => addPreset(p)}
                    className={`p-2 rounded-xl border-2 transition text-left ${
                      active
                        ? `${c.bg} ${c.border} ring-2 ring-offset-1 ring-${p.color}-300 shadow-sm`
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 mb-0.5 ${active ? c.icon : 'text-slate-400'}`} />
                    <div className={`text-[9px] font-extrabold leading-tight ${active ? c.text : 'text-slate-600'}`}>
                      {p.label}
                    </div>
                    {p.suggested && !active && (
                      <div className="text-[8px] text-slate-500 font-bold mt-0.5">
                        ~{formatPKR(p.suggested)}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active charges list */}
          {charges.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[9px] uppercase tracking-wider font-extrabold text-slate-600">
                Applied Charges
              </div>
              {charges.map((charge, idx) => {
                const preset = PRESETS.find((p) => p.type === charge.type);
                const Icon = preset?.icon ?? Package;
                const c = COLOR_MAP[preset?.color ?? 'slate'];
                return (
                  <div
                    key={`${charge.type}-${idx}`}
                    className={`rounded-lg border-2 ${c.border} ${c.bg} p-2 flex items-center gap-2`}
                  >
                    <Icon className={`h-4 w-4 ${c.icon} shrink-0`} />
                    <input
                      type="text"
                      value={charge.label}
                      onChange={(e) => updateCharge(idx, { label: e.target.value })}
                      className={`flex-1 h-7 rounded-md bg-white border border-slate-200 px-2 text-[11px] font-bold ${c.text} focus:outline-none focus:border-amber-500`}
                    />
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-slate-500">Rs</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={charge.amount}
                        onChange={(e) => updateCharge(idx, { amount: Number(e.target.value) || 0 })}
                        className="h-7 w-24 rounded-md border border-slate-200 pl-7 pr-1.5 text-[11px] font-extrabold text-right tabular-nums focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <button
                      onClick={() => removeCharge(idx)}
                      className="h-6 w-6 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}

              {/* Total */}
              <div className="rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 text-white p-2 flex items-center justify-between shadow-md">
                <span className="text-[10px] font-extrabold uppercase tracking-wider">Service Total</span>
                <span className="text-sm font-extrabold tabular-nums">{formatPKR(total)}</span>
              </div>
            </div>
          )}

          {/* Custom add */}
          <div className="pt-2 border-t border-amber-200">
            <div className="text-[9px] uppercase tracking-wider font-extrabold text-slate-600 mb-1.5">
              Custom Charge
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="Label (e.g. Extra padding)"
                className="flex-1 h-8 rounded-md border-2 border-slate-200 px-2 text-[11px] font-bold focus:outline-none focus:border-amber-500"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Amount"
                className="h-8 w-24 rounded-md border-2 border-slate-200 px-2 text-[11px] font-extrabold text-right focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={addCustom}
                disabled={!customLabel.trim() || !(Number(customAmount) > 0)}
                className="h-8 px-2.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-extrabold inline-flex items-center gap-1 disabled:opacity-50 transition"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
