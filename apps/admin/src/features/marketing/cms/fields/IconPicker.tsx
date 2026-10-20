/**
 * Icon picker limited to the contract's ALLOWED_ICONS. Icons load lazily
 * through lucide's DynamicIcon, so the full icon set never enters the main
 * admin bundle.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { DynamicIcon, type IconName as LucideName } from 'lucide-react/dynamic';
import { ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ALLOWED_ICONS, isAllowedIcon } from '../contract/cms-contract';
import { useEditor } from '../editor/EditorContext';
import { Field, Popover, useOutsideClick } from './ui';

export function CmsIcon({ name, className }: { name: string; className?: string }) {
  if (!isAllowedIcon(name)) return <span className={cn('inline-block rounded-full border border-dashed border-rose-300', className)} />;
  return <DynamicIcon name={name as LucideName} className={className} fallback={() => <span className={cn('inline-block', className)} />} />;
}

export function IconPicker({
  value,
  onChange,
  label,
  error,
  hint,
  required,
  allowClear = true,
}: {
  value: string | undefined | null;
  onChange: (name: string | undefined) => void;
  label?: ReactNode;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  allowClear?: boolean;
}) {
  const { config } = useEditor();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useOutsideClick<HTMLDivElement>(open, () => setOpen(false));
  const names = (config?.icons ?? ALLOWED_ICONS) as readonly string[];
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? names.filter((n) => n.includes(s)) : names;
  }, [names, q]);
  const unknown = !!value && !isAllowedIcon(value);
  return (
    <Field label={label} error={error ?? (unknown ? `"${value}" allowed icon nahi` : undefined)} hint={hint} required={required}>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            'flex h-9 w-full items-center gap-2 rounded-lg border bg-white px-3 text-left text-sm transition hover:border-emerald-400',
            error || unknown ? 'border-rose-300' : 'border-neutral-300',
          )}
        >
          {value ? (
            <>
              <span className="grid h-6 w-6 place-items-center rounded-md bg-emerald-50 text-emerald-700">
                <CmsIcon name={value} className="h-4 w-4" />
              </span>
              <span className="flex-1 truncate font-mono text-xs text-neutral-700">{value}</span>
            </>
          ) : (
            <span className="flex-1 text-neutral-400">Icon chunein</span>
          )}
          {value && allowClear ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange(undefined);
              }}
              className="text-neutral-400 hover:text-rose-600"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : (
            <ChevronDown className="h-4 w-4 text-neutral-400" />
          )}
        </button>
        <Popover open={open} className="w-[340px] p-2">
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="store, receipt, pill…"
              className="w-full rounded-lg bg-neutral-50 py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div className="grid max-h-64 grid-cols-8 gap-1 overflow-y-auto">
            {filtered.map((n) => (
              <button
                key={n}
                type="button"
                title={n}
                onClick={() => {
                  onChange(n);
                  setOpen(false);
                }}
                className={cn(
                  'grid h-9 w-9 place-items-center rounded-lg text-neutral-700 transition hover:bg-emerald-50 hover:text-emerald-700',
                  value === n && 'bg-emerald-600 text-white hover:bg-emerald-600 hover:text-white',
                )}
              >
                <CmsIcon name={n} className="h-4 w-4" />
              </button>
            ))}
          </div>
          {filtered.length === 0 && <p className="py-4 text-center text-xs text-neutral-500">Koi icon nahi mila</p>}
        </Popover>
      </div>
    </Field>
  );
}
