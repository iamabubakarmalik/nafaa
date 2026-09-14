import { useEffect, useRef, type ReactNode } from 'react';
import { GraduationCap, X, CheckCircle2, RefreshCw, Printer } from 'lucide-react';
import { Button } from '@core/ui/Button';

/* ═════════════════════════════════════════════════════════════
   HOME APPLIANCES — sanjha UI kit
   ─────────────────────────────────────────────────────────────
   Teros pages ek hi dhaancha istemal karte hain: gradient hero,
   KPI cards, teacher modal, status badge, keyboard shortcuts.
   Har page me dobara likhne ke bajaye yahan se aata hai — is liye
   rang aur spacing har jagah bilkul ek jaise rehte hain.
   ═════════════════════════════════════════════════════════════ */

/** Appliances ka apna gradient — cyan/teal, poori industry me yehi */
export const APPLIANCE_GRADIENT =
  'bg-gradient-to-br from-slate-950 via-cyan-900 to-teal-700 dark:from-slate-950 dark:via-cyan-950 dark:to-teal-900';

/**
 * Keyboard chip.
 *
 * `<span>` hai `<kbd>` nahi — index.css ka global `html.dark kbd {}`
 * rule specificity me utility classes ko hara deta hai aur chip
 * dark mode me ghayab ho jati hai.
 */
export function Kbd({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded font-mono font-bold shadow-sm text-[10px] ${
        dark
          ? 'bg-slate-700 text-slate-100 border border-slate-600'
          : 'bg-white/15 border border-white/25 text-white'
      }`}
    >
      {children}
    </span>
  );
}

export interface HeroAction {
  key: string;
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  onClick?: () => void;
  href?: string;
  /** 'ghost' = shishe jaisa, 'solid' = safed, 'accent' = rangeen */
  variant?: 'ghost' | 'solid' | 'accent' | 'warn';
  disabled?: boolean;
  spinning?: boolean;
  hideLabelOnMobile?: boolean;
}

export interface HeroShortcut { keys: string; label: string }

/** Har appliances page ka upar wala gradient header. */
export function ApplianceHero({
  badge, badgeIcon, title, subtitle, actions = [], shortcuts = [], children,
}: {
  badge: string;
  badgeIcon?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  actions?: HeroAction[];
  shortcuts?: HeroShortcut[];
  children?: ReactNode;
}) {
  return (
    <section className={`relative overflow-hidden rounded-2xl sm:rounded-3xl ${APPLIANCE_GRADIENT} text-white p-4 sm:p-6 shadow-2xl`}>
      <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-400/25 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl pointer-events-none" />

      <div className="relative flex items-start justify-between flex-wrap gap-4">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold border border-white/25 uppercase tracking-widest shadow-lg">
            {badgeIcon}
            {badge}
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight">{title}</h1>
          {subtitle && (
            <div className="mt-1.5 text-xs sm:text-sm text-white/90 font-semibold">{subtitle}</div>
          )}
        </div>

        {actions.length > 0 && (
          <div className="flex gap-2 flex-wrap items-center shrink-0">
            {actions.map((a) => {
              const cls =
                a.variant === 'solid'
                  ? 'bg-[#ffffff] text-slate-900 hover:bg-slate-100 shadow-2xl'
                  : a.variant === 'accent'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/40'
                    : a.variant === 'warn'
                      ? 'bg-amber-400/90 hover:bg-amber-400 text-slate-900 shadow-lg'
                      : 'bg-white/15 hover:bg-white/25 border border-white/25 backdrop-blur-md';
              const inner = (
                <>
                  {a.spinning ? <RefreshCw className="h-4 w-4 animate-spin" /> : a.icon}
                  <span className={a.hideLabelOnMobile ? 'hidden sm:inline' : ''}>{a.label}</span>
                  {a.shortcut && <Kbd>{a.shortcut}</Kbd>}
                </>
              );
              const common = `h-11 px-3 sm:px-4 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50 ${cls}`;
              return a.href ? (
                <a key={a.key} href={a.href} className={common}>{inner}</a>
              ) : (
                <button key={a.key} onClick={a.onClick} disabled={a.disabled} className={common} title={a.label}>
                  {inner}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {shortcuts.length > 0 && (
        <div className="relative mt-3 hidden sm:flex flex-wrap gap-1.5 text-[10px] font-bold items-center">
          {shortcuts.map((s, i) => (
            <span key={s.keys} className="inline-flex items-center gap-1.5">
              {i > 0 && <span className="text-white/30 mx-1">•</span>}
              <Kbd>{s.keys}</Kbd>
              <span className="text-white/60">{s.label}</span>
            </span>
          ))}
        </div>
      )}

      {children && <div className="relative mt-4">{children}</div>}
    </section>
  );
}

/* ═════════════ KPI CARD ═════════════ */
export type KpiTone = 'cyan' | 'blue' | 'emerald' | 'amber' | 'rose' | 'violet' | 'slate' | 'teal' | 'orange';

const KPI_TONES: Record<KpiTone, string> = {
  cyan:    'from-cyan-500 to-teal-600 shadow-cyan-500/40',
  teal:    'from-teal-500 to-emerald-600 shadow-teal-500/40',
  blue:    'from-blue-500 to-indigo-700 shadow-blue-500/40',
  emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/40',
  amber:   'from-amber-500 to-orange-600 shadow-amber-500/40',
  orange:  'from-orange-500 to-red-600 shadow-orange-500/40',
  rose:    'from-rose-500 to-red-600 shadow-rose-500/40',
  violet:  'from-violet-500 to-purple-700 shadow-violet-500/40',
  slate:   'from-slate-500 to-slate-700 shadow-slate-500/40',
};

export function Kpi({
  icon: Icon, label, value, sub, tone = 'cyan', onClick, active, alert,
}: {
  icon: any;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: KpiTone;
  onClick?: () => void;
  active?: boolean;
  /** Laal halqa — tawajjo chahiye */
  alert?: boolean;
}) {
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={[
        'group rounded-2xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 p-3 sm:p-4 shadow-sm text-left w-full transition-all',
        onClick ? 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer' : '',
        active
          ? 'border-cyan-500 dark:border-cyan-400 ring-2 ring-cyan-200 dark:ring-cyan-500/20'
          : alert
            ? 'border-rose-300 dark:border-rose-500/40'
            : 'border-slate-200 dark:border-slate-800',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-extrabold">{label}</div>
          <div className="mt-1.5 text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums truncate">{value}</div>
          {sub && <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 truncate">{sub}</div>}
        </div>
        <div className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${KPI_TONES[tone]} text-white flex items-center justify-center shadow-lg shrink-0 group-hover:scale-110 transition`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Comp>
  );
}

/* ═════════════ STATUS BADGE ═════════════ */
export function StatusBadge({
  meta, size = 'sm',
}: {
  meta: { label: string; emoji: string; cls: string };
  size?: 'xs' | 'sm' | 'md';
}) {
  const pad = size === 'xs' ? 'px-1.5 py-0.5 text-[9px]' : size === 'md' ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[10px]';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-extrabold whitespace-nowrap ${pad} ${meta.cls}`}>
      <span>{meta.emoji}</span>{meta.label}
    </span>
  );
}

/* ═════════════ SECTION CARD ═════════════ */
export function Panel({
  icon: Icon, title, hint, right, children, tone = 'cyan', className = '',
}: {
  icon?: any;
  title?: ReactNode;
  hint?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  tone?: KpiTone;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 dark:backdrop-blur-sm border-2 border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 ${className}`}>
      {(title || right) && (
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-start gap-2 min-w-0">
            {Icon && (
              <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${KPI_TONES[tone]} text-white flex items-center justify-center shadow shrink-0`}>
                <Icon className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0">
              {title && <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">{title}</h3>}
              {hint && <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{hint}</p>}
            </div>
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/* ═════════════ TEACHER MODAL ═════════════ */
export interface TeacherBlock {
  title: string;
  tone?: 'cyan' | 'emerald' | 'amber' | 'violet' | 'rose' | 'blue';
  tips: ReactNode[];
}

const BLOCK_TONES: Record<string, string> = {
  cyan:    'border-cyan-200 dark:border-cyan-500/30 bg-cyan-50/60 dark:bg-cyan-500/5 text-cyan-800 dark:text-cyan-200',
  emerald: 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/5 text-emerald-800 dark:text-emerald-200',
  amber:   'border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/5 text-amber-800 dark:text-amber-200',
  violet:  'border-violet-200 dark:border-violet-500/30 bg-violet-50/60 dark:bg-violet-500/5 text-violet-800 dark:text-violet-200',
  rose:    'border-rose-200 dark:border-rose-500/30 bg-rose-50/60 dark:bg-rose-500/5 text-rose-800 dark:text-rose-200',
  blue:    'border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/5 text-blue-800 dark:text-blue-200',
};

export function TipRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

/**
 * Har page ka "Guide" — dukaan-daar ko samjhaata hai ke page
 * kis kaam ka hai aur kis tarteeb se chalana hai.
 */
export function Teacher({
  title, intro, blocks, shortcuts, golden, onClose,
}: {
  title: string;
  intro: ReactNode;
  blocks: TeacherBlock[];
  shortcuts?: { keys: string; label: string }[];
  golden?: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-cyan-300 dark:border-cyan-500/40 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b-2 border-cyan-200 dark:border-cyan-500/30 bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-cyan-500/15 dark:to-teal-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-cyan-900 dark:text-cyan-200 flex items-center gap-2 text-sm sm:text-base">
            <GraduationCap className="h-5 w-5 shrink-0" /> {title}
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition shrink-0">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">{intro}</p>

          {blocks.map((b) => (
            <div key={b.title} className={`rounded-2xl border-2 p-4 space-y-2 text-xs font-semibold ${BLOCK_TONES[b.tone ?? 'cyan']}`}>
              <div className="text-[10px] uppercase tracking-widest font-black mb-1">{b.title}</div>
              <div className="space-y-2 text-slate-700 dark:text-slate-200">
                {b.tips.map((t, i) => <TipRow key={i}>{t}</TipRow>)}
              </div>
            </div>
          ))}

          {shortcuts && shortcuts.length > 0 && (
            <div className="rounded-xl bg-slate-900 dark:bg-slate-950 border border-slate-700 p-3 text-xs font-semibold text-slate-200">
              <div className="text-[10px] uppercase tracking-widest font-black text-cyan-300 mb-2">⌨️ Shortcuts</div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                {shortcuts.map((s) => (
                  <div key={s.keys}><Kbd dark>{s.keys}</Kbd> {s.label}</div>
                ))}
              </div>
            </div>
          )}

          {golden && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border-2 border-amber-200 dark:border-amber-500/30 p-3 text-xs font-semibold text-amber-900 dark:text-amber-200 flex gap-2">
              <span className="text-base leading-none shrink-0">💡</span>
              <span>{golden}</span>
            </div>
          )}

          <Button
            className="w-full bg-gradient-to-r from-cyan-600 to-teal-700 hover:from-cyan-700 hover:to-teal-800 font-extrabold shadow-lg shadow-cyan-500/40 h-12"
            onClick={onClose}
          >
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya!
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════ EMPTY STATE ═════════════ */
export function Empty({
  icon: Icon, title, hint, action,
}: {
  icon: any;
  title: string;
  hint?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900/80 border-2 border-dashed border-slate-300 dark:border-slate-700 p-10 sm:p-16 text-center">
      <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-lg shadow-cyan-500/40">
        <Icon className="h-9 w-9 text-white" />
      </div>
      <h3 className="mt-5 text-xl font-extrabold text-slate-900 dark:text-white">{title}</h3>
      {hint && <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mt-2 max-w-md mx-auto">{hint}</p>}
      {action && <div className="mt-5 flex gap-2 justify-center flex-wrap">{action}</div>}
    </div>
  );
}

/* ═════════════ MODAL SHELL ═════════════ */
export function Sheet({
  title, subtitle, badge, icon, onClose, children, footer, wide,
}: {
  title: string;
  subtitle?: ReactNode;
  badge?: string;
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className={`w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 relative bg-gradient-to-br from-cyan-700 via-teal-600 to-emerald-700 text-white px-5 py-4 overflow-hidden">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-cyan-400/25 blur-2xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              {badge && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-black border border-white/30">
                  {icon} {badge}
                </div>
              )}
              <h3 className="text-lg sm:text-xl font-black mt-2 truncate">{title}</h3>
              {subtitle && <div className="text-xs text-white/85 font-bold mt-0.5">{subtitle}</div>}
            </div>
            <button onClick={onClose} className="h-10 w-10 rounded-2xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition shrink-0">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">{children}</div>

        {footer && (
          <div className="shrink-0 border-t-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═════════════ FORM BITS ═════════════ */
export function Field({
  label, required, hint, error, children,
}: {
  label: string; required?: boolean; hint?: string; error?: string; children: ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
        {hint && <span className="text-slate-400 dark:text-slate-500 normal-case font-bold ml-1">({hint})</span>}
      </label>
      {children}
      {error && <div className="mt-1 text-[11px] font-extrabold text-rose-600 dark:text-rose-400">{error}</div>}
    </div>
  );
}

export const inputCls = (extra = '', error = false) =>
  [
    'w-full rounded-xl border-2 px-3',
    'bg-white dark:bg-slate-800 text-slate-900 dark:text-white',
    'placeholder:text-slate-400 dark:placeholder:text-slate-500',
    error
      ? 'border-rose-400 dark:border-rose-500/60 focus:border-rose-500 focus:ring-rose-200 dark:focus:ring-rose-500/30'
      : 'border-slate-200 dark:border-slate-700 focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-cyan-200 dark:focus:ring-cyan-500/30',
    'focus:outline-none focus:ring-2 transition',
    extra,
  ].join(' ');

/** Chips ka row — filter, preset, ya quick-pick ke liye */
export function ChipRow<T extends string>({
  options, value, onChange, allLabel = 'Sab',
}: {
  options: { value: T; label: string; emoji?: string; count?: number }[];
  value: T | null;
  onChange: (v: T | null) => void;
  allLabel?: string;
}) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      <button
        onClick={() => onChange(null)}
        className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold border-2 transition ${
          value === null
            ? 'bg-cyan-600 border-cyan-600 text-white shadow'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-cyan-400'
        }`}
      >
        {allLabel}
      </button>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(value === o.value ? null : o.value)}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold border-2 transition inline-flex items-center gap-1 ${
            value === o.value
              ? 'bg-cyan-600 border-cyan-600 text-white shadow'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-cyan-400'
          }`}
        >
          {o.emoji && <span>{o.emoji}</span>}
          {o.label}
          {o.count !== undefined && (
            <span className={`ml-0.5 tabular-nums ${value === o.value ? 'text-white/70' : 'text-slate-400'}`}>
              {o.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ═════════════ KEYBOARD SHORTCUTS ═════════════ */
/**
 * Page ke shortcuts.
 *
 * Input/textarea/select me type karte waqt khud ba khud band ho
 * jate hain, aur Ctrl/Cmd wale combos ko haath nahi lagate.
 */
export function useShortcuts(
  map: Record<string, () => void>,
  deps: unknown[] = [],
) {
  const ref = useRef(map);
  ref.current = map;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
        || (document.activeElement as HTMLElement | null)?.isContentEditable;

      // Escape har haal me chalta hai — modal band karne ke liye
      if (e.key === 'Escape' && ref.current.Escape) {
        ref.current.Escape();
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

      const fn = ref.current[e.key] ?? ref.current[e.key.toLowerCase()];
      if (fn) { e.preventDefault(); fn(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/* ═════════════ PRINT / CSV HELPERS ═════════════ */
export const escapeHtml = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const toDateInput = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Nayi window me HTML chaap deta hai — popup block hone par false. */
export function printHtml(html: string, opts: { width?: number; height?: number } = {}) {
  const w = window.open('', '_blank', `width=${opts.width ?? 1000},height=${opts.height ?? 800}`);
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}

/** CSV file download — BOM ke sath taake Excel me Urdu/emoji sahi khulein. */
export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const csv = rows
    .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** A4 report ka sanjha CSS + header — har appliances print isi par banti hai. */
export function a4Shell({
  title, heading, shopName, shopPhone, badge, kpis = [], body,
}: {
  title: string;
  heading: string;
  shopName: string;
  shopPhone?: string;
  badge: string;
  kpis?: { label: string; value: string; sub?: string; tone?: 'blue' | 'amber' | 'rose' | 'green' }[];
  body: string;
}) {
  const kpiHtml = kpis.length
    ? `<div class="kpis">${kpis
        .map((k) => `<div class="kpi ${k.tone ?? ''}"><div class="l">${escapeHtml(k.label)}</div><div class="v">${k.value}</div>${k.sub ? `<div class="s">${escapeHtml(k.sub)}</div>` : ''}</div>`)
        .join('')}</div>`
    : '';

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 12mm 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; font-size: 10.5px; line-height: 1.45; background: #fff;
    -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .header { background: linear-gradient(135deg, #0f172a 0%, #155e75 50%, #0d9488 100%); color: #fff; padding: 18px 20px;
    border-radius: 10px; margin-bottom: 14px; position: relative; overflow: hidden; }
  .header::before { content:''; position:absolute; top:-30px; right:-30px; width:140px; height:140px; background:rgba(255,255,255,0.08); border-radius:50%; }
  .header-inner { position: relative; display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
  .header h1 { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin: 6px 0 4px; }
  .header .shop { font-size: 12px; font-weight: 600; opacity: 0.95; }
  .header .badge { background: rgba(255,255,255,0.2); border: 1.5px solid rgba(255,255,255,0.4); padding: 4px 10px;
    border-radius: 20px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; }
  .header .print-info { text-align: right; font-size: 9.5px; opacity: 0.85; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
  .kpi { border: 2px solid #e2e8f0; border-radius: 9px; padding: 10px 12px; background: linear-gradient(180deg, #f8fafc, #fff); }
  .kpi.blue { background: linear-gradient(135deg,#ecfeff,#cffafe); border-color:#67e8f9; }
  .kpi.amber { background: linear-gradient(135deg,#fffbeb,#fef3c7); border-color:#fcd34d; }
  .kpi.rose { background: linear-gradient(135deg,#fef2f2,#fee2e2); border-color:#fca5a5; }
  .kpi.green { background: linear-gradient(135deg,#ecfdf5,#d1fae5); border-color:#6ee7b7; }
  .kpi .l { font-size: 8.5px; color: #64748b; text-transform: uppercase; letter-spacing: 1.3px; font-weight: 800; margin-bottom: 4px; }
  .kpi .v { font-size: 15px; font-weight: 800; color: #0f172a; }
  .kpi .s { font-size: 9px; color: #94a3b8; font-weight: 600; margin-top: 2px; }
  h2.sec { font-size: 12px; font-weight: 800; margin: 14px 0 6px; padding-bottom: 4px; border-bottom: 2px solid #0f172a; text-transform: uppercase; letter-spacing: 1px; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5px; margin-bottom: 10px; }
  thead th { background: #0f172a; color: #fff; padding: 7px 6px; text-align: left; font-size: 9px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 1px; white-space: nowrap; }
  thead th.r { text-align: right; } thead th.c { text-align: center; }
  tbody td { padding: 6px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
  tbody tr:nth-child(even) td { background: #f8fafc; }
  td.num { width: 3%; color: #94a3b8; font-weight: 700; text-align: center; }
  td.r { text-align: right; font-weight: 800; white-space: nowrap; }
  td.c { text-align: center; }
  td.main { font-weight: 700; color: #0f172a; }
  td .sub { font-size: 8.5px; color: #64748b; font-weight: 600; }
  tr.grand td { background: linear-gradient(135deg,#0f172a,#155e75) !important; color: #fff !important; font-weight: 800; font-size: 11.5px; padding: 9px 6px; }
  .pill { display:inline-block; padding:2px 7px; border-radius:10px; font-size:8.5px; font-weight:800; border:1px solid #cbd5e1; }
  .footer { margin-top: 16px; padding-top: 10px; border-top: 2px solid #0f172a; font-size: 8.5px; color: #64748b; text-align: center; }
  @media print { .header, .kpis { break-inside: avoid; } tr, td, th { break-inside: avoid; } }
</style></head><body>
  <div class="header">
    <div class="header-inner">
      <div>
        <div class="badge">${escapeHtml(badge)}</div>
        <h1>${heading}</h1>
        <div class="shop">🏪 ${escapeHtml(shopName)}</div>
      </div>
      <div class="print-info"><div><strong>Generated:</strong></div><div>${new Date().toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</div></div>
    </div>
  </div>
  ${kpiHtml}
  ${body}
  <div class="footer"><strong>${escapeHtml(shopName)}</strong>${shopPhone ? ` • ${escapeHtml(shopPhone)}` : ''}<br/>Powered by <strong>Nafaa POS</strong> — ${new Date().getFullYear()}</div>
  <script>window.onload=function(){setTimeout(function(){window.print();},400);};</script>
</body></html>`;
}

/** 80mm thermal parchi ka sanjha CSS. */
export const THERMAL_CSS = `
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 80mm; }
  body { font-family: 'Courier New', monospace; padding: 5mm 4mm; color: #000; font-size: 11px; line-height: 1.4; }
  .center { text-align: center; } .bold { font-weight: 700; } .right { text-align: right; }
  .xl { font-size: 15px; font-weight: 800; letter-spacing: 1px; } .huge { font-size: 18px; font-weight: 800; }
  .divider { border-top: 1px dashed #000; margin: 8px 0; } .double { border-top: 2px solid #000; margin: 8px 0; }
  .row { display: flex; justify-content: space-between; gap: 6px; margin: 2px 0; }
  .row .k { font-weight: 600; word-break: break-word; } .row .v { font-weight: 700; white-space: nowrap; }
  .badge { display: inline-block; border: 1.5px solid #000; padding: 3px 10px; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; margin: 6px 0; }
  .amount-box { border: 2.5px solid #000; padding: 8px; margin: 8px 0; text-align: center; }
  .sign { margin-top: 18px; border-top: 1px solid #000; padding-top: 3px; font-size: 9px; text-align: center; }
`;

/* ═════════════ NUMBER / DATE HELPERS ═════════════ */
export const fmtDate = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';

export const fmtDateTime = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

/** "3 ghantay" / "2 din" — resolution time ke liye */
export const fmtDuration = (hours: number) => {
  if (!hours || hours < 0) return '—';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${hours.toFixed(1)} ghantay`;
  return `${(hours / 24).toFixed(1)} din`;
};

/** Print button jo har page ke hero me lagta hai */
export const printAction = (onClick: () => void, disabled?: boolean): HeroAction => ({
  key: 'print',
  label: 'Print',
  icon: <Printer className="h-4 w-4" />,
  shortcut: 'P',
  onClick,
  disabled,
  hideLabelOnMobile: true,
});

export const guideAction = (onClick: () => void): HeroAction => ({
  key: 'guide',
  label: 'Guide',
  icon: <GraduationCap className="h-4 w-4" />,
  onClick,
  variant: 'warn',
  hideLabelOnMobile: true,
});
