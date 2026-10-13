/** Small building blocks shared by the audit views. */

import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react';
import { Card } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import type { AuditType, Severity } from '../api';
import { SEVERITY_META, TYPE_META, scoreColor } from '../meta';

export function Panel({ icon: Icon, title, hint, actions, className, flush, children }: {
  icon: LucideIcon; title: ReactNode; hint?: ReactNode; actions?: ReactNode; className?: string; flush?: boolean; children: ReactNode;
}) {
  return (
    <Card className={cn('rounded-2xl', className)} flush={flush} actions={actions} description={hint}
      title={<span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{title}</span>}>
      {children}
    </Card>
  );
}

export function Empty({ text, icon: Icon }: { text: string; icon?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center text-[0.8125rem] text-slate-500">
      {Icon && <Icon className="mb-2 h-6 w-6 text-slate-300" />}
      {text}
    </div>
  );
}

/** Change against the previous period. `up="bad"` paints a rise red (more voids is worse). */
export function Delta({ now, before, up = 'bad' }: { now: number; before: number | null | undefined; up?: 'good' | 'bad' }) {
  if (before == null) return null;
  if (Math.abs(before) < 0.005) {
    return now > 0 ? <span className={up === 'bad' ? 'text-rose-600' : 'text-emerald-600'}>naya · pehle 0</span> : <span className="text-slate-400">pehle bhi 0</span>;
  }
  const ch = ((now - before) / Math.abs(before)) * 100;
  if (Math.abs(ch) < 0.5) return <span className="inline-flex items-center gap-0.5 text-slate-500"><Minus className="h-3 w-3" />pehle jitna</span>;
  const rise = ch > 0;
  const bad = (rise && up === 'bad') || (!rise && up === 'good');
  return (
    <span className={cn('inline-flex items-center gap-0.5 font-medium', bad ? 'text-rose-600' : 'text-emerald-600')}>
      {rise ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      {Math.abs(ch).toFixed(0)}% pichli period se
    </span>
  );
}

export function SeverityPill({ s, className }: { s: Severity; className?: string }) {
  const m = SEVERITY_META[s];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ring-1', m.soft, className)}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />{m.label}
    </span>
  );
}

export function TypeIcon({ type, size = 'md' }: { type: AuditType; size?: 'sm' | 'md' }) {
  const m = TYPE_META[type];
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-xl', size === 'sm' ? 'h-7 w-7' : 'h-9 w-9')} style={{ backgroundColor: `${m.color}17`, color: m.color }}>
      <m.icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
    </span>
  );
}

/** Round score badge 0–100. */
export function ScoreRing({ score, size = 44 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const len = 2 * Math.PI * r;
  const color = scoreColor(score);
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} title={`Risk score ${score} / 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={4} className="stroke-slate-100" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={4} stroke={color} strokeLinecap="round" strokeDasharray={`${(score / 100) * len} ${len}`} />
      </svg>
      <span className="absolute text-[0.75rem] font-bold tabular-nums text-slate-900">{score}</span>
    </span>
  );
}

export function Chip({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'rose' | 'amber' }) {
  return (
    <span className={cn('inline-flex items-center rounded-md px-1.5 py-0.5 text-[0.6875rem] font-medium ring-1',
      tone === 'rose' ? 'bg-rose-50 text-rose-700 ring-rose-100' : tone === 'amber' ? 'bg-amber-50 text-amber-800 ring-amber-100' : 'bg-slate-50 text-slate-600 ring-slate-200')}>
      {children}
    </span>
  );
}
