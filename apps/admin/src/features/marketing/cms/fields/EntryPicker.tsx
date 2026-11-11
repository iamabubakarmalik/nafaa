/**
 * Entry search (GET /entries/lookup) as a single picker, a multi picker and a
 * bare search popover that link pickers reuse.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { cmsApi, cmsKeys } from '@/api/marketing/marketing-cms.api';
import { ENTRY_TYPE_META, type AdminEntryRef, type CmsEntryType } from '../contract/cms-contract';
import { useEditor } from '../editor/EditorContext';
import { Field, Popover, useOutsideClick } from './ui';
import { StatusDot } from '../entries/StatusChip';

function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function TypeTag({ type, className }: { type: CmsEntryType; className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500', className)}>
      {ENTRY_TYPE_META[type]?.label ?? type}
    </span>
  );
}

/** Search list used inside pickers. */
export function EntrySearch({
  types,
  onPick,
  excludeIds = [],
  autoFocus = true,
  placeholder = 'Search by title or path…',
}: {
  types?: readonly CmsEntryType[];
  onPick: (ref: AdminEntryRef) => void;
  excludeIds?: readonly string[];
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const { locale, addRefs } = useEditor();
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const typesKey = types?.join(',');
  const { data, isFetching, isError } = useQuery({
    queryKey: cmsKeys.lookup(dq, typesKey),
    queryFn: () => cmsApi.lookup({ q: dq, types: types ? [...types] : undefined, limit: 20, locale }),
    staleTime: 15_000,
  });
  const items = (data ?? []).filter((r) => !excludeIds.includes(r.id));
  return (
    <div className="w-[min(420px,90vw)]">
      <div className="relative border-b border-slate-100 p-2">
        <Search className="absolute left-4 top-4 h-4 w-4 text-slate-400" />
        <input
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg bg-slate-50 py-2 pl-8 pr-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        {types && types.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1 px-0.5">
            {types.map((t) => (
              <TypeTag key={t} type={t} />
            ))}
          </div>
        )}
      </div>
      <div className="max-h-72 overflow-y-auto p-1">
        {isError && <p className="px-3 py-4 text-center text-xs text-rose-600">Search is not available right now</p>}
        {!isError && items.length === 0 && (
          <p className="px-3 py-4 text-center text-xs text-slate-500">{isFetching ? 'Searching…' : 'Nothing found'}</p>
        )}
        {items.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => {
              addRefs([r]);
              onPick(r);
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-brand-50"
          >
            <StatusDot status={r.status} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-slate-900">{r.title}</span>
              <span className="block truncate font-mono text-[11px] text-slate-500">{r.path}</span>
            </span>
            <TypeTag type={r.type} />
          </button>
        ))}
      </div>
    </div>
  );
}

/** Shows a referenced entry by id (label from the editor's refs). */
export function EntryChip({ id, onRemove, trailing }: { id: string; onRemove?: () => void; trailing?: ReactNode }) {
  const { refs } = useEditor();
  const ref = refs[id];
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
      {ref ? <StatusDot status={ref.status} /> : <FileText className="h-3.5 w-3.5 text-slate-400" />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-slate-800">{ref?.title ?? 'Entry'}</span>
        <span className="block truncate font-mono text-[11px] text-slate-500">{ref?.path ?? id}</span>
      </span>
      {ref && <TypeTag type={ref.type} />}
      {trailing}
      {onRemove && (
        <button type="button" onClick={onRemove} className="text-slate-400 hover:text-rose-600" aria-label="Remove">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/** One entry id (author, parent, industry, nearby city…). */
export function EntryPicker({
  value,
  onChange,
  types,
  label,
  hint,
  error,
  required,
  placeholder = 'Choose an entry',
}: {
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  types?: readonly CmsEntryType[];
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClick<HTMLDivElement>(open, () => setOpen(false));
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      <div ref={ref} className="relative">
        {value ? (
          <EntryChip
            id={value}
            onRemove={() => onChange(null)}
            trailing={
              <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs font-medium text-brand-700 hover:underline">
                Badlein
              </button>
            }
          />
        ) : (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-left text-sm text-slate-500 transition hover:border-brand-400 hover:text-brand-700',
              error ? 'border-rose-300' : 'border-slate-300',
            )}
          >
            <Search className="h-4 w-4" /> {placeholder}
          </button>
        )}
        <Popover open={open}>
          <EntrySearch
            types={types}
            onPick={(r) => {
              onChange(r.id);
              setOpen(false);
            }}
          />
        </Popover>
      </div>
    </Field>
  );
}

/** Ordered list of entry ids (picked testimonials' entries, nearby cities, related…). */
export function EntryMultiPicker({
  value,
  onChange,
  types,
  label,
  hint,
  error,
  max,
}: {
  value: readonly string[] | undefined;
  onChange: (ids: string[]) => void;
  types?: readonly CmsEntryType[];
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  max?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClick<HTMLDivElement>(open, () => setOpen(false));
  const list = value ?? [];
  const move = (from: number, to: number) => {
    if (to < 0 || to >= list.length) return;
    const next = [...list];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x as string);
    onChange(next);
  };
  return (
    <Field label={label} hint={hint} error={error}>
      <div ref={ref} className="relative space-y-1.5">
        {list.map((id, i) => (
          <EntryChip
            key={id}
            id={id}
            onRemove={() => onChange(list.filter((x) => x !== id))}
            trailing={
              <span className="flex text-slate-400">
                <button type="button" disabled={i === 0} onClick={() => move(i, i - 1)} className="px-0.5 hover:text-slate-800 disabled:opacity-30" aria-label="Move up">
                  ↑
                </button>
                <button type="button" disabled={i === list.length - 1} onClick={() => move(i, i + 1)} className="px-0.5 hover:text-slate-800 disabled:opacity-30" aria-label="Move down">
                  ↓
                </button>
              </span>
            }
          />
        ))}
        {(max === undefined || list.length < max) && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-1.5 text-xs font-medium text-slate-600 hover:border-brand-400 hover:text-brand-700"
          >
            <Search className="h-3.5 w-3.5" /> Add an entry
          </button>
        )}
        <Popover open={open}>
          <EntrySearch
            types={types}
            excludeIds={list}
            onPick={(r) => {
              onChange([...list, r.id]);
              setOpen(false);
            }}
          />
        </Popover>
      </div>
    </Field>
  );
}
