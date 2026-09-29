import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@core/lib/cn';

/* ═════════════════════════════════════════════════════════════
   Online store ka design kit — Shopify admin jaisa saaf, halka.
   Sidebar/Settings shell ke saath ek hi zabaan: white cards,
   patle border, semibold, 13–14px text. Bare gradients nahi.
   ═════════════════════════════════════════════════════════════ */

export function Page({ title, subtitle, back, badge, icon, actions, tabs, children, narrow }: {
  title: ReactNode; subtitle?: ReactNode; back?: { to: string; label: string }; badge?: ReactNode; icon?: ReactNode;
  actions?: ReactNode; tabs?: ReactNode; children: ReactNode; narrow?: boolean;
}) {
  return (
    <div className={cn('mx-auto w-full pb-12', narrow ? 'max-w-3xl' : 'max-w-6xl')}>
      {back && (
        <Link to={back.to} className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
          <ArrowLeft className="h-4 w-4" /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {icon}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h1>
              {badge}
            </div>
            {subtitle && <div className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">{subtitle}</div>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {tabs && <div className="mt-4">{tabs}</div>}
      <div className="mt-5 space-y-4">{children}</div>
    </div>
  );
}

export function Card({ title, description, actions, children, footer, flush, className, id }: {
  title?: ReactNode; description?: ReactNode; actions?: ReactNode; children?: ReactNode; footer?: ReactNode;
  flush?: boolean; className?: string; id?: string;
}) {
  return (
    <section id={id} className={cn('scroll-mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-900', className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="text-[14px] font-semibold text-slate-900 dark:text-white">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children !== undefined && <div className={cn(flush ? 'mt-3' : 'px-4 py-4 sm:px-5')}>{children}</div>}
      {footer && <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-[13px] dark:border-slate-800 dark:bg-slate-800/30 sm:px-5">{footer}</div>}
    </section>
  );
}

type Tone = 'success' | 'warning' | 'critical' | 'info' | 'neutral' | 'attention';
const TONE: Record<Tone, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300',
  warning: 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300',
  attention: 'bg-orange-50 text-orange-800 ring-orange-600/20 dark:bg-orange-500/10 dark:text-orange-300',
  critical: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300',
  info: 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-500/15 dark:bg-slate-800 dark:text-slate-300',
};

export function Badge({ tone = 'neutral', dot, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-md px-1.5 text-[11.5px] font-semibold ring-1 ring-inset', TONE[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}

export function Banner({ tone = 'info', title, children, action, icon }: { tone?: Tone; title: ReactNode; children?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  const bar: Record<Tone, string> = {
    success: 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/30 dark:bg-emerald-500/5',
    warning: 'border-amber-200 bg-amber-50/70 dark:border-amber-500/30 dark:bg-amber-500/5',
    attention: 'border-orange-200 bg-orange-50/70 dark:border-orange-500/30 dark:bg-orange-500/5',
    critical: 'border-rose-200 bg-rose-50/70 dark:border-rose-500/30 dark:bg-rose-500/5',
    info: 'border-sky-200 bg-sky-50/70 dark:border-sky-500/30 dark:bg-sky-500/5',
    neutral: 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40',
  };
  return (
    <div className={cn('flex flex-wrap items-start gap-3 rounded-xl border px-4 py-3', bar[tone])}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-[200px] flex-1">
        <div className="text-[13.5px] font-semibold text-slate-900 dark:text-white">{title}</div>
        {children && <div className="mt-0.5 text-[13px] text-slate-600 dark:text-slate-300">{children}</div>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </div>
  );
}

type BtnVariant = 'primary' | 'secondary' | 'plain' | 'critical' | 'success';
export const Btn = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant; size?: 'sm' | 'md'; loading?: boolean; icon?: ReactNode;
}>(function Btn({ variant = 'secondary', size = 'md', loading, icon, children, className, disabled, type = 'button', ...rest }, ref) {
  const v: Record<BtnVariant, string> = {
    primary: 'bg-slate-900 text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100',
    success: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700',
    secondary: 'border border-slate-300 bg-white text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800',
    plain: 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
    critical: 'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 dark:border-rose-500/30 dark:bg-transparent dark:text-rose-300',
  };
  return (
    <button ref={ref} type={type} disabled={disabled || loading}
      className={cn('inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-2.5 text-[12.5px]' : 'h-9 px-3.5 text-[13px]', v[variant], className)}
      {...rest}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});

export function Tabs<T extends string>({ value, onChange, items }: {
  value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode; count?: number; tone?: Tone }[];
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
      {items.map((t) => {
        const on = t.value === value;
        return (
          <button key={t.value} onClick={() => onChange(t.value)}
            className={cn('-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13.5px] font-semibold transition',
              on ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200')}>
            {t.label}
            {t.count !== undefined && t.count > 0 && <Badge tone={t.tone ?? 'neutral'}>{t.count}</Badge>}
          </button>
        );
      })}
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, items }: {
  value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode; count?: number }[];
}) {
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
      {items.map((t) => (
        <button key={t.value} onClick={() => onChange(t.value)}
          className={cn('inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-semibold transition',
            t.value === value ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200')}>
          {t.label}
          {t.count !== undefined && <span className="tabular-nums text-slate-400">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'attention' }) {
  return (
    <div className={cn('rounded-xl border bg-white px-4 py-3 dark:bg-slate-900',
      tone === 'attention' ? 'border-amber-300 dark:border-amber-500/40' : 'border-slate-200 dark:border-slate-800')}>
      <div className="text-[12.5px] font-medium text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums text-slate-900 dark:text-white">{value}</div>
      {hint && <div className="mt-0.5 text-[12px] text-slate-500">{hint}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="px-6 py-10 text-center">
      {icon && <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800">{icon}</div>}
      <div className="text-[14px] font-semibold text-slate-900 dark:text-white">{title}</div>
      {children && <p className="mx-auto mt-1 max-w-md text-[13px] text-slate-500">{children}</p>}
      {action && <div className="mt-4 flex justify-center gap-2">{action}</div>}
    </div>
  );
}

export const inputCls =
  'h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13.5px] text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-slate-300';

export function Field({ label, help, children }: { label: ReactNode; help?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-medium text-slate-700 dark:text-slate-200">{label}</span>
      {children}
      {help && <span className="mt-1 block text-[12px] text-slate-500">{help}</span>}
    </label>
  );
}

/** Toggle wali setting — Shopify settings ki tarah label/help baayein, switch daayein */
export function SettingRow({ title, help, control }: { title: ReactNode; help?: ReactNode; control: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className="text-[13.5px] font-medium text-slate-900 dark:text-white">{title}</div>
        {help && <div className="mt-0.5 text-[12.5px] text-slate-500">{help}</div>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

export function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
      className={cn('relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition disabled:opacity-50',
        checked ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700')}>
      <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow transition', checked ? 'translate-x-[18px]' : 'translate-x-0.5')} />
    </button>
  );
}

export function ChannelAvatar({ emoji, color, size = 40 }: { emoji: string; color: string; size?: number }) {
  return (
    <span style={{ width: size, height: size, backgroundColor: `${color}1a`, fontSize: size * 0.5 }}
      className="inline-flex shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-black/5">
      {emoji}
    </span>
  );
}
