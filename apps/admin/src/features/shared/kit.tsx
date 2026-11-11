/**
 * Small pieces shared by the Online store, Mobile apps, Communications and
 * System pages. They are thin wrappers over the design system so every page
 * in these areas uses the same cards, badges, switches and chart colors.
 */

import { type ReactNode } from 'react';
import { Badge, Card, controlClass, Switch, Table, THead, TBody, Tr, Th, Td, type BadgeVariant } from '@/design-system/components';
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

export { useChartColors, SERIES } from '@/ui/chart';

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

export { num } from '@/lib/format';

export { apiError as errMsg } from '@/lib/errors';
