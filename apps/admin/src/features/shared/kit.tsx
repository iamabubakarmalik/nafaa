/**
 * Small pieces shared by the Online store, Mobile apps, Communications and
 * System pages. They are thin wrappers over the design system so every page
 * in these areas uses the same cards, badges, switches and chart colors.
 */

import { useMemo, type ReactNode } from 'react';
import { Badge, Card, controlClass, Switch, Table, THead, TBody, Tr, Th, Td, type BadgeVariant } from '@/design-system/components';
import { useAppearanceStore } from '@/design-system';
import { cn } from '@/lib/cn';

/** A card with a title row. `subtitle` and `action` are the names older panels use. */
export function Panel({ title, subtitle, action, children, className, flush }: {
  title?: ReactNode; subtitle?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; flush?: boolean;
}) {
  return <Card title={title} description={subtitle} actions={action} className={className} flush={flush}>{children}</Card>;
}

export type PillTone = 'slate' | 'teal' | 'amber' | 'rose' | 'indigo' | 'emerald';
const PILL: Record<PillTone, BadgeVariant> = { slate: 'default', teal: 'brand', amber: 'warning', rose: 'danger', indigo: 'brand', emerald: 'success' };

export function Pill({ children, tone = 'slate' }: { children: ReactNode; tone?: PillTone }) {
  return <Badge variant={PILL[tone]}>{children}</Badge>;
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return <Switch checked={checked} disabled={disabled} aria-label={label} onChange={(e) => onChange(e.target.checked)} />;
}

export const inputCls = cn(controlClass(), 'h-10 px-3 text-sm');
export const labelCls = 'mb-1 block text-[0.75rem] font-medium text-slate-600';

export function Empty({ children }: { children: ReactNode }) {
  return <div className="px-6 py-10 text-center text-[0.8125rem] text-slate-500">{children}</div>;
}

/** Chart colors read from the theme, so charts follow the accent color and dark mode. */
function cssColor(name: string, fallback: string) {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `rgb(${v.split(/[\s,]+/).join(' ')})` : fallback;
}

export function useChartColors() {
  const theme = useAppearanceStore((s) => `${s.resolved.accentHex}|${s.resolved.mode}|${s.systemPrefersDark}`);
  return useMemo(() => ({
    line: cssColor('--brand-500', '#6366f1'),
    second: '#0d9488',
    grid: cssColor('--bd-slate-200', '#e2e8f0'),
    text: cssColor('--tx-slate-500', '#64748b'),
  }), [theme]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Chart and split colors that stay apart for color-blind readers. */
export const SERIES = ['#4f46e5', '#0d9488', '#d97706', '#db2777', '#0284c7'];

/** Compact table for a card: first column left, the rest right-aligned numbers. */
export function MiniTable({ head, rows, empty, minWidth }: { head: string[]; rows: Array<Array<ReactNode>>; empty: string; minWidth?: string }) {
  if (!rows.length) return <Empty>{empty}</Empty>;
  return (
    <Table minWidth={minWidth}>
      <THead><Tr>{head.map((h, i) => <Th key={h} align={i ? 'right' : undefined}>{h}</Th>)}</Tr></THead>
      <TBody>{rows.map((r, i) => <Tr key={i}>{r.map((c, j) => <Td key={j} align={j ? 'right' : undefined} className={j ? 'tabular-nums' : undefined}>{c}</Td>)}</Tr>)}</TBody>
    </Table>
  );
}

export const num = (n: number | null | undefined) => (n ?? 0).toLocaleString('en-PK');
export const errMsg = (e: unknown) => {
  const x = e as { response?: { data?: { message?: string | string[] } }; message?: string };
  const m = x?.response?.data?.message;
  return (Array.isArray(m) ? m.join(', ') : m) ?? x?.message ?? 'Action failed';
};
