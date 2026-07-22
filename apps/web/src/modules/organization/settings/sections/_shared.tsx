import { ReactNode } from 'react';

export function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <label className="text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1">
        {label}
        {required && <span className="text-rose-600">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

export function Toggle({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-slate-800">{label}</div>
        {desc && <div className="text-xs text-slate-500 mt-0.5">{desc}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`h-7 w-12 rounded-full p-0.5 transition shrink-0 ${
          checked ? 'bg-emerald-600' : 'bg-slate-300'
        }`}
      >
        <div
          className="h-6 w-6 bg-white rounded-full shadow transition"
          style={{ transform: `translateX(${checked ? 20 : 0}px)` }}
        />
      </button>
    </div>
  );
}

export function TextInput({ value, onChange, placeholder, type = 'text' }: any) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
    />
  );
}

export function NumberInput({ value, onChange, min, max, step = 1 }: any) {
  return (
    <input
      type="number"
      value={value ?? 0}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
      step={step}
      className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm font-bold outline-none focus:border-emerald-500"
    />
  );
}

export function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm bg-white outline-none focus:border-emerald-500"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function ChoiceGroup({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string; desc?: string }> }) {
  return (
    <div className="grid sm:grid-cols-2 gap-2">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`text-left p-3 rounded-xl border-2 transition ${
              active ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className={`font-extrabold text-sm ${active ? 'text-emerald-700' : 'text-slate-900'}`}>{o.label}</div>
            {o.desc && <div className="text-xs text-slate-500 mt-0.5">{o.desc}</div>}
          </button>
        );
      })}
    </div>
  );
}
