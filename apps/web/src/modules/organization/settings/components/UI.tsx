import { ReactNode } from 'react';
import { Sparkles, ChevronRight } from 'lucide-react';

/* ═════════════════════════════════════════════════════════════
   NAFAA SETTINGS — Shared UI Kit (Billion-$ Grade)
   ─────────────────────────────────────────────────────────────
   • Fully typed props — no implicit `any`
   • Complete dark mode
   • Consistent focus rings, transitions, tokens
   • Icons in toggles, prefix/suffix in inputs, error states
   ═════════════════════════════════════════════════════════════ */

/* ─── FIELD ─── */
export function Field({
  label,
  hint,
  required,
  badge,
  error,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  badge?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[13px] font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
        <span>{label}</span>
        {required && <span className="text-rose-600 dark:text-rose-400">*</span>}
        {badge}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-snug">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* ─── SYNCED BADGE ─── */
export function SyncedBadge({ label = 'Synced' }: { label?: string }) {
  return (
    <span
      title="Ye field aap ke onboarding setup se aaya hai"
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/40 text-[9px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider"
    >
      <Sparkles className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

/* ─── TOGGLE ─── */
interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  desc?: string;
  disabled?: boolean;
  icon?: any;
}
export function Toggle({ checked, onChange, label, desc, disabled, icon: Icon }: ToggleProps) {
  return (
    <div
      className={[
        'flex items-center justify-between gap-4 py-3.5 border-b border-slate-100 dark:border-slate-800 last:border-0 transition',
        disabled
          ? 'opacity-50'
          : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40 -mx-2 px-2 rounded-lg',
      ].join(' ')}
    >
      <div className="flex-1 min-w-0 flex items-start gap-2.5">
        {Icon && (
          <div
            className={[
              'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition',
              checked
                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
            ].join(' ')}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
            {label}
          </div>
          {desc && (
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-semibold leading-snug">
              {desc}
            </div>
          )}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          'relative h-7 w-12 rounded-full p-0.5 transition-all shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-2 dark:focus:ring-offset-slate-900',
          checked
            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-md shadow-emerald-500/30'
            : 'bg-slate-300 dark:bg-slate-700',
        ].join(' ')}
      >
        <div
          className="h-6 w-6 bg-white rounded-full shadow-md transition-transform"
          style={{ transform: `translateX(${checked ? 20 : 0}px)` }}
        />
      </button>
    </div>
  );
}

/* ─── TEXT INPUT (typed) ─── */
interface TextInputProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  maxLength?: number;
  prefix?: ReactNode;
  suffix?: ReactNode;
  error?: string;
  autoFocus?: boolean;
  onBlur?: () => void;
}
export function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled,
  maxLength,
  prefix,
  suffix,
  error,
  autoFocus,
  onBlur,
}: TextInputProps) {
  return (
    <div
      className={[
        'relative flex items-center rounded-xl border-2 bg-white dark:bg-slate-800 transition',
        error
          ? 'border-rose-400 dark:border-rose-500/60 focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20'
          : 'border-slate-200 dark:border-slate-700 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20',
        disabled ? 'bg-slate-50 dark:bg-slate-900/50' : '',
      ].join(' ')}
    >
      {prefix && (
        <span className="pl-3 text-sm font-extrabold text-slate-500 dark:text-slate-400 select-none">
          {prefix}
        </span>
      )}
      <input
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        autoFocus={autoFocus}
        className="w-full h-11 px-3 bg-transparent text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none disabled:text-slate-400 dark:disabled:text-slate-500"
      />
      {suffix && (
        <span className="pr-3 text-sm font-extrabold text-slate-500 dark:text-slate-400 select-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

/* ─── NUMBER INPUT (typed) ─── */
interface NumberInputProps {
  value: number | null | undefined;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
}
export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled,
  prefix,
  suffix,
}: NumberInputProps) {
  return (
    <div
      className={[
        'relative flex items-center rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800',
        'focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition',
        disabled ? 'bg-slate-50 dark:bg-slate-900/50 opacity-60' : '',
      ].join(' ')}
    >
      {prefix && (
        <span className="pl-3 text-sm font-extrabold text-slate-500 dark:text-slate-400 select-none">
          {prefix}
        </span>
      )}
      <input
        type="number"
        value={value ?? 0}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="w-full h-11 px-3 bg-transparent text-sm font-extrabold tabular-nums text-slate-900 dark:text-white outline-none"
      />
      {suffix && (
        <span className="pr-3 text-sm font-extrabold text-slate-500 dark:text-slate-400 select-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

/* ─── SELECT (typed) ─── */
interface SelectOption {
  value: string;
  label: string;
}
interface SelectProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  placeholder?: string;
}
export function Select({ value, onChange, options, disabled, placeholder }: SelectProps) {
  return (
    <div className="relative">
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={[
          'w-full h-11 pl-3 pr-9 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800',
          'text-sm font-semibold text-slate-900 dark:text-white outline-none appearance-none',
          'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition',
          'disabled:bg-slate-50 dark:disabled:bg-slate-900/50 disabled:opacity-60',
        ].join(' ')}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronRight className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
    </div>
  );
}

/* ─── TEXTAREA (typed) ─── */
interface TextAreaProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  disabled?: boolean;
}
export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
  maxLength,
  disabled,
}: TextAreaProps) {
  return (
    <textarea
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      maxLength={maxLength}
      disabled={disabled}
      className={[
        'w-full px-3 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800',
        'text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500',
        'outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition resize-y',
        'disabled:bg-slate-50 dark:disabled:bg-slate-900/50 disabled:opacity-60',
      ].join(' ')}
    />
  );
}

/* ─── CHOICE GROUP (typed) ─── */
interface ChoiceOption {
  value: string | number;
  label: string;
  desc?: string;
  emoji?: string;
  icon?: any;
}
interface ChoiceGroupProps {
  value: string | number;
  onChange: (value: any) => void;
  options: ChoiceOption[];
  columns?: 1 | 2 | 3 | 4;
}
export function ChoiceGroup({ value, onChange, options, columns = 2 }: ChoiceGroupProps) {
  const gridCls: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
  };
  return (
    <div className={`grid gap-2 ${gridCls[columns]}`}>
      {options.map((o) => {
        const active = String(value) === String(o.value);
        const Icon = o.icon;
        return (
          <button
            key={String(o.value)}
            type="button"
            onClick={() => onChange(o.value)}
            className={[
              'text-left p-3 rounded-xl border-2 transition-all active:scale-[0.98]',
              active
                ? 'border-emerald-500 dark:border-emerald-500/60 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-500/15 dark:to-slate-800/60 shadow-md ring-2 ring-emerald-200 dark:ring-emerald-500/20'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm',
            ].join(' ')}
          >
            <div
              className={[
                'font-extrabold text-sm flex items-center gap-1.5',
                active
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-slate-900 dark:text-white',
              ].join(' ')}
            >
              {o.emoji && <span className="text-base">{o.emoji}</span>}
              {Icon && <Icon className="h-4 w-4" />}
              <span>{o.label}</span>
            </div>
            {o.desc && (
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-semibold leading-snug">
                {o.desc}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ─── SECTION CARD ─── */
type SectionColor =
  | 'emerald' | 'blue' | 'amber' | 'violet' | 'rose' | 'pink'
  | 'cyan' | 'sky' | 'slate' | 'orange' | 'indigo';

interface SectionCardProps {
  title: string;
  desc?: string;
  icon?: any;
  color?: SectionColor;
  action?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  id?: string;
}
export function SectionCard({
  title,
  desc,
  icon: Icon,
  color = 'emerald',
  action,
  badge,
  children,
  id,
}: SectionCardProps) {
  const colorMap: Record<SectionColor, { text: string; bg: string; ring: string; grad: string }> = {
    emerald: { text: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-500/20', ring: 'ring-emerald-200 dark:ring-emerald-500/30', grad: 'from-emerald-500 to-emerald-700' },
    blue:    { text: 'text-blue-700 dark:text-blue-300',       bg: 'bg-blue-100 dark:bg-blue-500/20',       ring: 'ring-blue-200 dark:ring-blue-500/30',       grad: 'from-blue-500 to-blue-700' },
    sky:     { text: 'text-sky-700 dark:text-sky-300',         bg: 'bg-sky-100 dark:bg-sky-500/20',         ring: 'ring-sky-200 dark:ring-sky-500/30',         grad: 'from-sky-500 to-cyan-700' },
    amber:   { text: 'text-amber-700 dark:text-amber-300',     bg: 'bg-amber-100 dark:bg-amber-500/20',     ring: 'ring-amber-200 dark:ring-amber-500/30',     grad: 'from-amber-500 to-orange-600' },
    orange:  { text: 'text-orange-700 dark:text-orange-300',   bg: 'bg-orange-100 dark:bg-orange-500/20',   ring: 'ring-orange-200 dark:ring-orange-500/30',   grad: 'from-orange-500 to-red-600' },
    violet:  { text: 'text-violet-700 dark:text-violet-300',   bg: 'bg-violet-100 dark:bg-violet-500/20',   ring: 'ring-violet-200 dark:ring-violet-500/30',   grad: 'from-violet-500 to-purple-700' },
    indigo:  { text: 'text-indigo-700 dark:text-indigo-300',   bg: 'bg-indigo-100 dark:bg-indigo-500/20',   ring: 'ring-indigo-200 dark:ring-indigo-500/30',   grad: 'from-indigo-500 to-indigo-700' },
    rose:    { text: 'text-rose-700 dark:text-rose-300',       bg: 'bg-rose-100 dark:bg-rose-500/20',       ring: 'ring-rose-200 dark:ring-rose-500/30',       grad: 'from-rose-500 to-red-600' },
    pink:    { text: 'text-pink-700 dark:text-pink-300',       bg: 'bg-pink-100 dark:bg-pink-500/20',       ring: 'ring-pink-200 dark:ring-pink-500/30',       grad: 'from-pink-500 to-fuchsia-600' },
    cyan:    { text: 'text-cyan-700 dark:text-cyan-300',       bg: 'bg-cyan-100 dark:bg-cyan-500/20',       ring: 'ring-cyan-200 dark:ring-cyan-500/30',       grad: 'from-cyan-500 to-teal-600' },
    slate:   { text: 'text-slate-700 dark:text-slate-300',     bg: 'bg-slate-100 dark:bg-slate-800',        ring: 'ring-slate-200 dark:ring-slate-700',        grad: 'from-slate-500 to-slate-700' },
  };
  const c = colorMap[color] || colorMap.emerald;

  return (
    <section
      id={id}
      className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-black/20 overflow-hidden scroll-mt-24"
    >
      <header className="px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800 bg-gradient-to-br from-slate-50/60 to-white dark:from-slate-900/60 dark:to-slate-900/30 flex items-center gap-3 flex-wrap">
        {Icon && (
          <div
            className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${c.grad} text-white flex items-center justify-center shrink-0 shadow-md ring-4 ${c.ring}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg leading-tight">
              {title}
            </h3>
            {badge}
          </div>
          {desc && (
            <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-0.5 font-semibold leading-snug">
              {desc}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

/* ─── STAT PILL ─── */
type PillTone = 'emerald' | 'blue' | 'amber' | 'rose' | 'slate';
interface StatPillProps {
  label: string;
  value: string | number;
  tone?: PillTone;
  icon?: any;
}
export function StatPill({ label, value, tone = 'emerald', icon: Icon }: StatPillProps) {
  const tones: Record<PillTone, string> = {
    emerald: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/40',
    blue: 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/40',
    amber: 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/40',
    rose: 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/40',
    slate: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  };
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border-2 text-[11px] font-extrabold ${tones[tone]}`}
    >
      {Icon && <Icon className="h-3 w-3" />}
      <span className="opacity-70">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

/* ─── DIVIDER ─── */
export function Divider({ label }: { label?: string }) {
  if (!label) return <div className="h-px bg-slate-200 dark:bg-slate-800 my-4" />;
  return (
    <div className="my-4 flex items-center gap-3">
      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
      <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

/* ─── INLINE ALERT ─── */
type AlertTone = 'blue' | 'emerald' | 'amber' | 'rose' | 'violet';
interface AlertProps {
  tone?: AlertTone;
  title?: string;
  children: ReactNode;
  icon?: any;
}
export function Alert({ tone = 'blue', title, children, icon: Icon }: AlertProps) {
  const tones: Record<AlertTone, string> = {
    blue: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-900 dark:text-blue-200',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200',
    amber: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200',
    rose: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200',
    violet: 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/30 text-violet-900 dark:text-violet-200',
  };
  return (
    <div className={`rounded-xl border-2 p-3 flex items-start gap-2.5 ${tones[tone]}`}>
      {Icon && <Icon className="h-4 w-4 shrink-0 mt-0.5" />}
      <div className="flex-1 min-w-0 text-xs font-semibold leading-relaxed">
        {title && <div className="font-extrabold mb-0.5">{title}</div>}
        {children}
      </div>
    </div>
  );
}
