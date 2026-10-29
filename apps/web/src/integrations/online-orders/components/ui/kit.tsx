/**
 * Compatibility layer, frozen with the Shopify App Store review.
 *
 * Only two screens still import this file: ShopifyAppPage and
 * ConnectChannelPage. They carry the Shopify install flow, which must not
 * change while the review is pending. Every other online-store screen now
 * imports '@/design-system/components' directly.
 *
 * After approval: move those two screens to the design system and delete
 * this file. Do not add new importers.
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  Alert, Badge as DsBadge, Button, Card as DsCard, controlClass, EmptyState as DsEmptyState,
  PageHero, PageShell, Tabs as DsTabs, type BadgeVariant,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';

/** Online-store page: the standard PageShell and PageHero, with an optional back link and tabs. */
export function Page({ title, subtitle, back, badge, icon, actions, tabs, children, narrow }: {
  title: ReactNode; subtitle?: ReactNode; back?: { to: string; label: string }; badge?: ReactNode; icon?: ReactNode;
  actions?: ReactNode; tabs?: ReactNode; children: ReactNode; narrow?: boolean;
}) {
  return (
    <PageShell className={cn(narrow && 'max-w-3xl')}>
      {back && (
        <Link to={back.to} className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> {back.label}
        </Link>
      )}
      <PageHero
        title={<span className="inline-flex flex-wrap items-center gap-2">{icon}{title}{badge}</span>}
        meta={subtitle}
        actions={actions}
      />
      {subtitle && <p className="text-[0.8125rem] text-slate-500 md:hidden">{subtitle}</p>}
      {tabs}
      {children}
    </PageShell>
  );
}

export function Card(props: {
  title?: ReactNode; description?: ReactNode; actions?: ReactNode; children?: ReactNode; footer?: ReactNode;
  flush?: boolean; className?: string; id?: string;
}) {
  return <DsCard {...props} />;
}

type Tone = 'success' | 'warning' | 'critical' | 'info' | 'neutral' | 'attention';
const BADGE_VARIANT: Record<Tone, BadgeVariant> = {
  success: 'success', warning: 'warning', critical: 'danger', info: 'info', neutral: 'default', attention: 'warning',
};
const TAB_TONE = { success: 'success', warning: 'warning', critical: 'danger', info: 'default', neutral: 'default', attention: 'warning' } as const;

export function Badge({ tone = 'neutral', dot, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return <DsBadge variant={BADGE_VARIANT[tone]} size="xs" dot={dot} className={className}>{children}</DsBadge>;
}

export function Banner({ tone = 'info', title, children, action, icon }: { tone?: Tone; title: ReactNode; children?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  const alertTone = tone === 'critical' ? 'danger' : tone === 'warning' || tone === 'attention' ? 'warning' : tone === 'success' ? 'success' : 'info';
  return <Alert tone={alertTone} title={title} action={action} icon={icon}>{children}</Alert>;
}

type BtnVariant = 'primary' | 'secondary' | 'plain' | 'critical' | 'success';
const BTN_VARIANT = { primary: 'primary', secondary: 'secondary', plain: 'ghost', critical: 'critical', success: 'success' } as const;

export const Btn = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant; size?: 'sm' | 'md'; loading?: boolean; icon?: ReactNode;
}>(function Btn({ variant = 'secondary', size = 'md', icon, ...rest }, ref) {
  return <Button ref={ref} variant={BTN_VARIANT[variant]} size={size === 'sm' ? 'xs' : 'sm'} leftIcon={icon} {...rest} />;
});

export function Tabs<T extends string>({ value, onChange, items }: {
  value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode; count?: number; tone?: Tone }[];
}) {
  return (
    <DsTabs
      value={value}
      onChange={onChange}
      items={items.map((t) => ({ value: t.value, label: t.label, count: t.count ? t.count : undefined, tone: TAB_TONE[t.tone ?? 'neutral'] }))}
    />
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: 'attention' }) {
  return (
    <div className={cn('rounded-xl border bg-white px-4 py-3 shadow-sm', tone === 'attention' ? 'border-amber-300' : 'border-slate-200')}>
      <div className="text-[0.78125rem] font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums text-slate-900">{value}</div>
      {hint && <div className="mt-0.5 text-[0.75rem] text-slate-500">{hint}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return <DsEmptyState icon={icon} title={title} description={children} action={action} />;
}

export const inputCls = cn(controlClass(), 'h-9 px-3 text-[0.84375rem]');

export function Field({ label, help, children }: { label: ReactNode; help?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{label}</span>
      {children}
      {help && <span className="mt-1.5 block text-xs text-slate-500">{help}</span>}
    </label>
  );
}

/** Setting with label and help on the left and its control on the right. */
export function SettingRow({ title, help, control }: { title: ReactNode; help?: ReactNode; control: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className="text-[0.84375rem] font-medium text-slate-900">{title}</div>
        {help && <div className="mt-0.5 text-[0.78125rem] text-slate-500">{help}</div>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

export function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50',
        checked ? 'bg-brand-600' : 'bg-slate-300',
      )}>
      <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow transition', checked ? 'translate-x-[1.125rem]' : 'translate-x-0.5')} />
    </button>
  );
}

export { ChannelAvatar } from '../ChannelAvatar';
