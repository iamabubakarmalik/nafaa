/**
 * Small UI kit for the Website resource screens. It follows the look of the
 * existing marketing pages (slate surfaces, brand accents) and keeps
 * every screen consistent without adding dependencies.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, History, Loader2, Search, XCircle } from 'lucide-react';
import { Card as DsCard, Drawer as DsDrawer, Modal as DsModal, Tabs as DsTabs } from '@/design-system/components';
import { cn } from '../../../../../lib/cn';
import type { CmsStatus, Issue, Paginated } from '../../contract/cms-contract';
import { fetchHistory, formatPkt, lookupEntries, type EntryLookupRow } from './cms-http';

export const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500';
export const selectCls = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none';

const btnBase =
  'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50';
export const btn = {
  primary: cn(btnBase, 'bg-brand-600 text-brand-fg hover:bg-brand-700'),
  secondary: cn(btnBase, 'border border-slate-300 bg-white text-slate-800 hover:border-brand-300'),
  ghost: cn(btnBase, 'text-slate-600 hover:bg-slate-100'),
  danger: cn(btnBase, 'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50'),
  icon: 'inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40',
};

export function Card({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return <DsCard title={title} actions={actions} className={className}>{children}</DsCard>;
}

export function Field({ label, hint, error, required, children, className }: {
  label: ReactNode; hint?: ReactNode; error?: string; required?: boolean; children: ReactNode; className?: string;
}) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-rose-600">*</span>}
      </span>
      {children}
      {error ? <span className="block text-xs text-rose-600">{error}</span> : hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; disabled?: boolean }) {
  return (
    <label className={cn('inline-flex items-center gap-2 text-sm text-slate-700', disabled && 'opacity-50')}>
      <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">{children}</div>;
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative min-w-[220px] flex-1">
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cn(inputCls, 'pl-9')} />
    </div>
  );
}

/** Debounces a fast-changing value (search boxes). */
export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function Pager({ meta, onPage }: { meta?: Paginated<unknown>['meta']; onPage: (p: number) => void }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between text-sm text-slate-600">
      <span>
        {meta.total} in total · page {meta.page} of {meta.totalPages}
      </span>
      <div className="flex gap-2">
        <button className={btn.secondary} disabled={!meta.hasPrev} onClick={() => onPage(meta.page - 1)}>
          <ChevronLeft className="h-4 w-4" /> Previous
        </button>
        <button className={btn.secondary} disabled={!meta.hasNext} onClick={() => onPage(meta.page + 1)}>
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, wide }: {
  open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean;
}) {
  return <DsModal open={open} onClose={onClose} title={title} size={wide ? 'xl' : 'md'} footer={footer}><div className="space-y-4">{children}</div></DsModal>;
}

export function Drawer({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return <DsDrawer open={open} onClose={onClose} title={title} footer={footer}><div className="space-y-4">{children}</div></DsDrawer>;
}

export function Tabs<K extends string>({ tabs, value, onChange }: { tabs: readonly { key: K; label: ReactNode }[]; value: K; onChange: (k: K) => void }) {
  return <DsTabs value={value} onChange={onChange} items={tabs.map((t) => ({ value: t.key, label: t.label }))} />;
}

const CMS_STATUS_STYLE: Record<CmsStatus, { label: string; cls: string }> = {
  DRAFT: { label: 'Draft', cls: 'bg-slate-100 text-slate-600 ring-slate-200' },
  SCHEDULED: { label: 'Scheduled', cls: 'bg-blue-100 text-blue-700 ring-blue-600/20' },
  PUBLISHED: { label: 'Live', cls: 'bg-emerald-100 text-emerald-700 ring-emerald-600/20' },
  ARCHIVED: { label: 'Archived', cls: 'bg-slate-200 text-slate-500 ring-slate-200' },
};

export function CmsStatusBadge({ status, changed }: { status: CmsStatus; changed?: boolean }) {
  const s = CMS_STATUS_STYLE[status];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', s.cls)}>
      {s.label}
      {status === 'PUBLISHED' && changed && <span className="text-amber-700">+ changes</span>}
    </span>
  );
}

export function Chip({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'amber' | 'rose' | 'emerald' | 'blue' }) {
  const tones = {
    neutral: 'bg-slate-100 text-slate-700',
    amber: 'bg-amber-100 text-amber-800',
    rose: 'bg-rose-100 text-rose-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-blue-100 text-blue-700',
  } as const;
  return <span className={cn('inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium', tones[tone])}>{children}</span>;
}

/** Shows API issues exactly as sent (Issue.message comes from the server). */
export function IssueList({ issues }: { issues: Issue[] }) {
  if (!issues.length) return null;
  return (
    <ul className="space-y-1.5">
      {issues.map((i, idx) => {
        const Icon = i.severity === 'error' ? XCircle : i.severity === 'warning' ? AlertTriangle : CheckCircle2;
        const tone = i.severity === 'error' ? 'text-rose-600' : i.severity === 'warning' ? 'text-amber-600' : 'text-emerald-600';
        return (
          <li key={`${i.code}-${idx}`} className="flex items-start gap-2 text-sm text-slate-700">
            <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', tone)} />
            <span>
              {i.message}
              {i.field && <span className="ml-1 text-xs text-slate-400">({i.field})</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

/** Revision list for menus, settings and FAQs (GET /history). */
export function HistoryList({ subject, subjectKey }: { subject: 'MENU' | 'SETTING' | 'FAQ'; subjectKey: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['cms-history', subject, subjectKey],
    queryFn: () => fetchHistory(subject, subjectKey),
  });
  if (isLoading) return <Spinner />;
  if (isError) return <p className="text-sm text-slate-500">Could not load the history.</p>;
  if (!data?.length) return <p className="text-sm text-slate-500">No history yet.</p>;
  return (
    <ul className="divide-y divide-slate-100 text-sm">
      {data.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
          <span className="flex items-center gap-2">
            <History className="h-3.5 w-3.5 text-slate-400" />
            <Chip>{r.action}</Chip>
            <span className="text-slate-700">{r.createdByName ?? 'Admin'}</span>
            {r.note && <span className="text-slate-500">· {r.note}</span>}
          </span>
          <span className="flex items-center gap-2 text-xs text-slate-500">
            {formatPkt(r.createdAt)}
            {r.revalidateError ? <Chip tone="rose">Site update failed</Chip> : r.revalidatedAt ? <Chip tone="emerald">Site updated</Chip> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Picks one CMS entry through GET /entries/lookup. `value` is the entry id;
 * `selected` (optional) shows its title before the first search.
 */
export function EntryRefSelect({ value, onChange, types, placeholder = 'Search for a page…', selected }: {
  value: string | null | undefined;
  onChange: (id: string | null, row?: EntryLookupRow) => void;
  types?: string[];
  placeholder?: string;
  selected?: { title: string; path: string } | null;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<{ title: string; path: string } | null>(selected ?? null);
  const dq = useDebounced(q, 250);
  const { data, isFetching } = useQuery({
    queryKey: ['cms-entry-lookup', dq, types?.join(',')],
    queryFn: () => lookupEntries(dq, types),
    enabled: open,
  });

  useEffect(() => setPicked(selected ?? null), [selected?.title, selected?.path]);

  if (value && !open) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm">
        <span className="truncate">
          {picked ? (
            <>
              <span className="font-medium text-slate-900">{picked.title}</span> <span className="text-slate-500">{picked.path}</span>
            </>
          ) : (
            <span className="text-slate-500">Entry {value}</span>
          )}
        </span>
        <span className="flex gap-1">
          <button type="button" className="text-xs text-brand-700 hover:underline" onClick={() => setOpen(true)}>
            Change
          </button>
          <button type="button" className="text-xs text-rose-600 hover:underline" onClick={() => { setPicked(null); onChange(null); }}>
            Remove
          </button>
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
      <input className={inputCls} value={q} placeholder={placeholder} onFocus={() => setOpen(true)} onChange={(e) => { setQ(e.target.value); setOpen(true); }} />
      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {isFetching && <p className="px-3 py-2 text-xs text-slate-500">Searching…</p>}
          {!isFetching && !data?.length && <p className="px-3 py-2 text-xs text-slate-500">Nothing found</p>}
          {data?.map((row) => (
            <button
              key={row.id}
              type="button"
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-brand-50"
              onClick={() => {
                setPicked({ title: row.title, path: row.path });
                onChange(row.id, row);
                setOpen(false);
                setQ('');
              }}
            >
              <span className="truncate">
                <span className="font-medium">{row.title}</span> <span className="text-xs text-slate-500">{row.path}</span>
              </span>
              <span className="flex shrink-0 gap-1">
                <Chip>{row.type}</Chip>
                {row.status !== 'PUBLISHED' && <Chip tone="amber">{row.status}</Chip>}
              </span>
            </button>
          ))}
          <button type="button" className="w-full border-t border-slate-100 px-3 py-1.5 text-left text-xs text-slate-500 hover:bg-slate-50" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}

/** Cloudinary thumbnail URL (f_auto, q_auto, fill). Non-Cloudinary URLs pass through. */
export function thumbUrl(url: string, w = 320, h = 220): string {
  if (!url.includes('/upload/')) return url;
  return url.replace('/upload/', `/upload/c_fill,g_auto,w_${w},h_${h},f_auto,q_auto/`);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
