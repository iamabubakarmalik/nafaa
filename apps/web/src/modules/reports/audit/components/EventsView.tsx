/**
 * Timeline of risky events grouped by business day: type chips with counts,
 * severity filter, sort, and a side panel per event.
 */

import { useMemo } from 'react';
import { ListChecks, ShieldCheck } from 'lucide-react';
import { Button, Skeleton } from '@/design-system/components';
import { businessDayKey } from '@core/lib/business-day';
import { cn } from '@core/lib/cn';
import type { AuditEvent, AuditType, EventPage, Severity } from '../api';
import { SEVERITY_META, TYPE_META, TYPE_ORDER, timeOnly } from '../meta';
import { eventValue } from '../print';
import { flagTone } from './EventDrawer';
import { Chip, SeverityPill, TypeIcon } from './parts';

interface Fmt { money: (n: number) => string; cost: (n: number) => string; costHidden: boolean }

export function EventsView({ pages, loading, loadingMore, hasMore, onMore, type, onType, severity, onSeverity, startHour, fmt, onOpen, onStaff, filtered, onClear }: {
  pages: EventPage[] | undefined;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onMore: () => void;
  type: AuditType | '';
  onType: (t: AuditType | '') => void;
  severity: Severity | '';
  onSeverity: (s: Severity | '') => void;
  startHour: number;
  fmt: Fmt;
  onOpen: (e: AuditEvent) => void;
  onStaff: (id: string) => void;
  filtered: boolean;
  onClear: () => void;
}) {
  const first = pages?.[0];
  const items = useMemo(() => pages?.flatMap((p) => p.items) ?? [], [pages]);
  const days = useMemo(() => {
    const map = new Map<string, AuditEvent[]>();
    for (const e of items) {
      const k = businessDayKey(new Date(e.at), startHour);
      map.set(k, [...(map.get(k) ?? []), e]);
    }
    return [...map.entries()];
  }, [items, startHour]);
  const today = businessDayKey(new Date(), startHour);
  const dayTitle = (k: string) => {
    if (k === today) return 'Aaj';
    const y = new Date(); y.setDate(y.getDate() - 1);
    if (k === businessDayKey(y, startHour)) return 'Kal';
    return new Intl.DateTimeFormat('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${k}T12:00:00`));
  };
  const counts = first?.counts ?? {};
  const allCount = Object.values(counts).reduce((s, n) => s + (n ?? 0), 0);

  return (
    <div className="space-y-3">
      {/* Type chips */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        <TypeChip active={!type} onClick={() => onType('')} label="Sab" count={allCount} color="#0f172a" />
        {TYPE_ORDER.filter((t) => counts[t]).map((t) => (
          <TypeChip key={t} active={type === t} onClick={() => onType(type === t ? '' : t)} label={TYPE_META[t].label} count={counts[t] ?? 0} color={TYPE_META[t].color} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[0.75rem] font-medium text-slate-500">Darja:</span>
        {(['', 'high', 'medium', 'low'] as const).map((s) => (
          <button key={s || 'all'} type="button" onClick={() => onSeverity(s)}
            className={cn('inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[0.75rem] font-semibold ring-1 transition',
              severity === s ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>
            {s && <span className="h-1.5 w-1.5 rounded-full" style={{ background: SEVERITY_META[s].color }} />}
            {s ? SEVERITY_META[s].label : 'Sab'}
            {first && <span className="tabular-nums opacity-70">{s ? first.severities[s] : first.severities.high + first.severities.medium + first.severities.low}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : !items.length ? (
        <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-16 text-center ring-1 ring-slate-200/80">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg"><ShieldCheck className="h-7 w-7" /></span>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">{filtered ? 'Is filter me kuch nahi mila' : 'Sab theek — koi shak wali baat nahi'}</h3>
          <p className="mt-1 text-[0.875rem] text-slate-500">{filtered ? 'Filter badal kar dekhein' : 'Is period me koi void, return, bari discount ya drawer farq nahi aaya.'}</p>
          {filtered && <div className="mt-4"><Button variant="secondary" onClick={onClear}>Filter hatayein</Button></div>}
        </div>
      ) : (
        days.map(([k, list]) => (
          <section key={k} className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            <header className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 sm:px-5">
              <h2 className="text-[0.875rem] font-semibold text-slate-900">{dayTitle(k)} <span className="font-normal text-slate-500">· {list.length} waqiye</span></h2>
              {list.some((e) => e.severity === 'high') && <span className="text-[0.75rem] font-semibold text-rose-600">{list.filter((e) => e.severity === 'high').length} zaroori</span>}
            </header>
            <ul className="divide-y divide-slate-100">
              {list.map((e) => <EventRow key={e.id} e={e} fmt={fmt} onOpen={() => onOpen(e)} onStaff={onStaff} />)}
            </ul>
          </section>
        ))
      )}

      {hasMore && (
        <button type="button" onClick={onMore} disabled={loadingMore}
          className="w-full rounded-2xl bg-white py-3 text-[0.875rem] font-semibold text-brand-700 ring-1 ring-slate-200 hover:bg-brand-50 disabled:opacity-60">
          {loadingMore ? 'Aa rahe hain…' : `Aur dikhayein (${items.length} / ${first?.total ?? 0})`}
        </button>
      )}
      {first?.capped && <p className="text-center text-[0.75rem] text-slate-500"><ListChecks className="mr-1 inline h-3.5 w-3.5" />Bohat zyada record — har type ke sab se naye 4,000 dikhaye ja rahe hain. Period chhoti karein.</p>}
    </div>
  );
}

function TypeChip({ active, onClick, label, count, color }: { active: boolean; onClick: () => void; label: string; count: number; color: string }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-semibold ring-1 transition',
        active ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
      <span className="h-2 w-2 rounded-full" style={{ background: active ? '#fff' : color }} />{label}
      <span className={cn('rounded-full px-1.5 text-[0.6875rem] tabular-nums', active ? 'bg-white/20' : 'bg-slate-100 text-slate-600')}>{count}</span>
    </button>
  );
}

function EventRow({ e, fmt, onOpen, onStaff }: { e: AuditEvent; fmt: Fmt; onOpen: () => void; onStaff: (id: string) => void }) {
  const value = eventValue(e, fmt);
  return (
    <li>
      <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={(ev) => { if (ev.key === 'Enter') onOpen(); }}
        className="flex cursor-pointer items-start gap-3 px-4 py-3 transition hover:bg-slate-50 sm:px-5">
        <TypeIcon type={e.type} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate text-[0.875rem] font-semibold text-slate-900">{e.title}</p>
            <SeverityPill s={e.severity} className="sm:hidden" />
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {e.flags.slice(0, 4).map((f) => <Chip key={f} tone={flagTone(f)}>{f}</Chip>)}
            {e.flags.length > 4 && <Chip>+{e.flags.length - 4}</Chip>}
          </div>
          <p className="mt-1 truncate text-[0.75rem] text-slate-500">
            {timeOnly(e.at)}
            {e.userName && <> · <button type="button" onClick={(ev) => { ev.stopPropagation(); if (e.userId) onStaff(e.userId); }} className="font-medium text-slate-700 hover:text-brand-700 hover:underline">{e.userName}</button></>}
            {e.shopName && <> · {e.shopName}</>}
            {e.detail && <> · {e.detail}</>}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {value !== '—' && <span className={cn('text-[0.9375rem] font-bold tabular-nums', e.type === 'drawer' && e.amount < 0 ? 'text-rose-600' : 'text-slate-900')}>{e.type === 'drawer' && e.amount < 0 ? '−' : ''}{value}</span>}
          <SeverityPill s={e.severity} className="hidden sm:inline-flex" />
        </div>
      </div>
    </li>
  );
}
