import { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';

export function Field({ label, hint, required, badge, children }: { label: string; hint?: string; required?: boolean; badge?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <label className="text-sm font-black text-slate-800 mb-1.5 flex items-center gap-1.5">
        {label}
        {required && <span className="text-rose-600">*</span>}
        {badge}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500 mt-1 font-medium">{hint}</p>}
    </div>
  );
}

export function SyncedBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[9px] font-black text-emerald-700 uppercase tracking-wider">
      <Sparkles className="h-2.5 w-2.5" />
      Synced
    </span>
  );
}

export function Toggle({ checked, onChange, label, desc, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string; disabled?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-3 border-b border-slate-100 last:border-0 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-slate-800">{label}</div>
        {desc && <div className="text-xs text-slate-500 mt-0.5 font-medium">{desc}</div>}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`h-7 w-12 rounded-full p-0.5 transition shrink-0 ${
          checked ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-slate-300'
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

export function TextInput({ value, onChange, placeholder, type = 'text', disabled, maxLength }: any) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition disabled:bg-slate-50 disabled:text-slate-400"
    />
  );
}

export function NumberInput({ value, onChange, min, max, step = 1, disabled }: any) {
  return (
    <input
      type="number"
      value={value ?? 0}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-black outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-50"
    />
  );
}

export function Select({ value, onChange, options, disabled }: any) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm font-medium bg-white outline-none focus:border-emerald-500 disabled:bg-slate-50"
    >
      {options.map((o: any) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function ChoiceGroup({ value, onChange, options, columns = 2 }: { value: string | number; onChange: (v: any) => void; options: Array<{ value: any; label: string; desc?: string; emoji?: string }>; columns?: number }) {
  return (
    <div className={`grid sm:grid-cols-${columns} gap-2`}>
      {options.map((o) => {
        const active = String(value) === String(o.value);
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`text-left p-3 rounded-xl border-2 transition ${
              active
                ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-white shadow-md'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
            }`}
          >
            <div className={`font-black text-sm flex items-center gap-1.5 ${active ? 'text-emerald-700' : 'text-slate-900'}`}>
              {o.emoji && <span>{o.emoji}</span>}
              {o.label}
            </div>
            {o.desc && <div className="text-xs text-slate-500 mt-0.5 font-medium">{o.desc}</div>}
          </button>
        );
      })}
    </div>
  );
}

export function SectionCard({ title, desc, icon: Icon, color = 'emerald', action, children }: any) {
  const colorMap: any = {
    emerald: { text: 'text-emerald-700', bg: 'bg-emerald-100' },
    blue: { text: 'text-blue-700', bg: 'bg-blue-100' },
    amber: { text: 'text-amber-700', bg: 'bg-amber-100' },
    violet: { text: 'text-violet-700', bg: 'bg-violet-100' },
    rose: { text: 'text-rose-700', bg: 'bg-rose-100' },
    pink: { text: 'text-pink-700', bg: 'bg-pink-100' },
    cyan: { text: 'text-cyan-700', bg: 'bg-cyan-100' },
  };
  const c = colorMap[color] || colorMap.emerald;
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-4">
        {Icon && (
          <div className={`h-10 w-10 rounded-xl ${c.bg} ${c.text} flex items-center justify-center shrink-0`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-slate-900 text-lg">{title}</h3>
          {desc && <p className="text-xs text-slate-500 mt-0.5 font-medium">{desc}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
