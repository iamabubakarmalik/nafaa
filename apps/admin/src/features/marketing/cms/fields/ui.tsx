/**
 * Small form primitives for the CMS editor. They follow the Marketing hub look
 * (neutral surfaces, emerald accent) and stay controlled: every field takes a
 * value and an onChange, so block forms can patch draft JSON directly.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, GripVertical, Plus, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { countWords } from '../contract/cms-contract';

export const inputClass =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:bg-neutral-50 disabled:text-neutral-500';

// ─── Field shell ───

export interface FieldShellProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  /** Right side of the label row (counters, small actions). */
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
  htmlFor?: string;
}

export function Field({ label, hint, error, required, aside, className, children, htmlFor }: FieldShellProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {(label || aside) && (
        <div className="flex items-center justify-between gap-2">
          {label ? (
            <label htmlFor={htmlFor} className="text-xs font-semibold text-neutral-700">
              {label}
              {required && <span className="ml-0.5 text-rose-500">*</span>}
            </label>
          ) : (
            <span />
          )}
          {aside}
        </div>
      )}
      {children}
      {error ? <p className="text-xs text-rose-600">{error}</p> : hint ? <p className="text-xs text-neutral-500">{hint}</p> : null}
    </div>
  );
}

/** "12/60" style counter, amber outside the range. */
export function Counter({ value, min, max, unit = 'chars' }: { value: number; min?: number; max?: number; unit?: 'chars' | 'words' }) {
  const out = (min !== undefined && value > 0 && value < min) || (max !== undefined && value > max);
  return (
    <span className={cn('text-[11px] tabular-nums', out ? 'font-semibold text-amber-600' : 'text-neutral-400')}>
      {value}
      {max !== undefined ? `/${min !== undefined ? `${min}-` : ''}${max}` : ''} {unit === 'words' ? 'alfaaz' : ''}
    </span>
  );
}

// ─── Inputs ───

interface TextFieldProps extends Omit<FieldShellProps, 'children'> {
  value: string | undefined | null;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  /** Show a char counter with this range. */
  chars?: { min?: number; max: number };
  /** Show a word counter with this range. */
  words?: { min?: number; max: number };
  disabled?: boolean;
  mono?: boolean;
  type?: 'text' | 'url' | 'date' | 'datetime-local' | 'email';
  prefix?: ReactNode;
}

export function TextField({ value, onChange, placeholder, maxLength, chars, words, disabled, mono, type = 'text', prefix, ...shell }: TextFieldProps) {
  const id = useId();
  const v = value ?? '';
  const aside = chars ? <Counter value={v.length} min={chars.min} max={chars.max} /> : words ? <Counter value={countWords(v)} min={words.min} max={words.max} unit="words" /> : shell.aside;
  return (
    <Field {...shell} aside={aside} htmlFor={id}>
      <div className="relative flex items-center">
        {prefix && <span className="pointer-events-none absolute left-3 text-sm text-neutral-400">{prefix}</span>}
        <input
          id={id}
          type={type}
          value={v}
          disabled={disabled}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputClass, mono && 'font-mono text-[13px]', shell.error && 'border-rose-300', prefix ? 'pl-8' : '')}
        />
      </div>
    </Field>
  );
}

interface TextAreaProps extends Omit<TextFieldProps, 'type' | 'prefix'> {
  rows?: number;
}

export function TextArea({ value, onChange, placeholder, maxLength, chars, words, disabled, mono, rows = 3, ...shell }: TextAreaProps) {
  const id = useId();
  const v = value ?? '';
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight + 2, 640)}px`;
  }, [v]);
  const aside = chars ? <Counter value={v.length} min={chars.min} max={chars.max} /> : words ? <Counter value={countWords(v)} min={words.min} max={words.max} unit="words" /> : shell.aside;
  return (
    <Field {...shell} aside={aside} htmlFor={id}>
      <textarea
        id={id}
        ref={ref}
        rows={rows}
        value={v}
        disabled={disabled}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputClass, 'resize-none leading-relaxed', mono && 'font-mono text-[13px]', shell.error && 'border-rose-300')}
      />
    </Field>
  );
}

interface NumberFieldProps extends Omit<FieldShellProps, 'children'> {
  value: number | undefined | null;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

export function NumberField({ value, onChange, min, max, step, placeholder, ...shell }: NumberFieldProps) {
  const id = useId();
  return (
    <Field {...shell} htmlFor={id}>
      <input
        id={id}
        type="number"
        value={value ?? ''}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className={cn(inputClass, shell.error && 'border-rose-300')}
      />
    </Field>
  );
}

export interface Option<T extends string = string> {
  value: T;
  label: string;
}

interface SelectFieldProps<T extends string> extends Omit<FieldShellProps, 'children'> {
  value: T | undefined | null;
  onChange: (value: T | undefined) => void;
  options: readonly Option<T>[];
  /** Adds an empty option with this label. */
  emptyLabel?: string;
}

export function SelectField<T extends string>({ value, onChange, options, emptyLabel, ...shell }: SelectFieldProps<T>) {
  const id = useId();
  return (
    <Field {...shell} htmlFor={id}>
      <div className="relative">
        <select
          id={id}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? undefined : (e.target.value as T))}
          className={cn(inputClass, 'appearance-none pr-8', shell.error && 'border-rose-300')}
        >
          {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-neutral-400" />
      </div>
    </Field>
  );
}

/** Segmented buttons for small enums (layout, tone, columns). */
export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  label,
  error,
  hint,
}: {
  value: T | undefined;
  onChange: (value: T) => void;
  options: readonly { value: T; label: ReactNode }[];
  label?: ReactNode;
  error?: string;
  hint?: ReactNode;
}) {
  return (
    <Field label={label} error={error} hint={hint}>
      <div className="inline-flex flex-wrap gap-1 rounded-lg bg-neutral-100 p-1">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-medium transition',
              value === o.value ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-neutral-200' : 'text-neutral-600 hover:text-neutral-900',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </Field>
  );
}

export function Toggle({ checked, onChange, label, hint, disabled }: { checked: boolean | undefined; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode; disabled?: boolean }) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-3', disabled && 'cursor-not-allowed opacity-60')}>
      <button
        type="button"
        role="switch"
        aria-checked={!!checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn('relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition', checked ? 'bg-emerald-600' : 'bg-neutral-300')}
      >
        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', checked ? 'left-[18px]' : 'left-0.5')} />
      </button>
      <span>
        <span className="block text-sm font-medium text-neutral-800">{label}</span>
        {hint && <span className="block text-xs text-neutral-500">{hint}</span>}
      </span>
    </label>
  );
}

/** Multi-select as chips (enum arrays like cityFacts.show or plan feature keys). */
export function ChipMultiSelect<T extends string>({
  value,
  onChange,
  options,
  label,
  error,
  hint,
}: {
  value: readonly T[] | undefined;
  onChange: (value: T[]) => void;
  options: readonly Option<T>[];
  label?: ReactNode;
  error?: string;
  hint?: ReactNode;
}) {
  const set = new Set(value ?? []);
  return (
    <Field label={label} error={error} hint={hint}>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = set.has(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(on ? (value ?? []).filter((v) => v !== o.value) : [...(value ?? []), o.value])}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs font-medium transition',
                on ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300',
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

/** Free-text list as removable chips ("alsoKnownAs", SRO refs, badges). */
export function StringListField({
  value,
  onChange,
  label,
  placeholder = 'Likh kar Enter dabayein',
  hint,
  error,
  max,
}: {
  value: readonly string[] | undefined;
  onChange: (value: string[]) => void;
  label?: ReactNode;
  placeholder?: string;
  hint?: ReactNode;
  error?: string;
  max?: number;
}) {
  const [text, setText] = useState('');
  const list = value ?? [];
  const add = () => {
    const t = text.trim();
    if (!t || list.includes(t) || (max !== undefined && list.length >= max)) return;
    onChange([...list, t]);
    setText('');
  };
  return (
    <Field label={label} hint={hint} error={error} aside={max !== undefined ? <Counter value={list.length} max={max} unit="chars" /> : undefined}>
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-neutral-300 bg-white p-1.5">
        {list.map((item, i) => (
          <span key={`${item}-${i}`} className="inline-flex max-w-full items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
            <span className="truncate">{item}</span>
            <button type="button" onClick={() => onChange(list.filter((_, j) => j !== i))} className="text-neutral-400 hover:text-rose-600" aria-label="Hatayein">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add();
            }
          }}
          onBlur={add}
          placeholder={list.length === 0 ? placeholder : ''}
          className="min-w-[120px] flex-1 border-0 bg-transparent px-1 py-0.5 text-sm focus:outline-none"
        />
      </div>
    </Field>
  );
}

// ─── Layout ───

export function Section({ title, description, children, actions, className }: { title?: ReactNode; description?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={cn('space-y-4', className)}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>}
            {description && <p className="mt-0.5 text-xs text-neutral-500">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Grid({ cols = 2, children }: { cols?: 2 | 3; children: ReactNode }) {
  return <div className={cn('grid gap-4', cols === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>{children}</div>;
}

// ─── Repeater ───

interface ListEditorProps<T> {
  items: readonly T[] | undefined;
  onChange: (items: T[]) => void;
  create: () => T;
  render: (item: T, update: (next: T) => void, index: number) => ReactNode;
  /** Title shown on each card's header row. */
  itemTitle?: (item: T, index: number) => ReactNode;
  addLabel?: string;
  min?: number;
  max?: number;
  label?: ReactNode;
  hint?: ReactNode;
  error?: string;
  compact?: boolean;
}

/** Ordered list of sub-items with add, remove, move and drag-to-reorder. */
export function ListEditor<T>({ items, onChange, create, render, itemTitle, addLabel = 'Item shamil karein', min, max, label, hint, error, compact }: ListEditorProps<T>) {
  const list = items ?? [];
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= list.length || from === to) return;
    const next = [...list];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it as T);
    onChange(next);
  };
  const canAdd = max === undefined || list.length < max;
  const canRemove = min === undefined || list.length > min;
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      aside={min !== undefined || max !== undefined ? <span className={cn('text-[11px] tabular-nums', (min !== undefined && list.length < min) ? 'font-semibold text-amber-600' : 'text-neutral-400')}>{list.length}{max !== undefined ? ` / ${min !== undefined ? `${min}-` : ''}${max}` : ''}</span> : undefined}
    >
      <div className="space-y-2">
        {list.map((item, i) => (
          <div
            key={i}
            onDragOver={(e) => {
              if (dragFrom === null) return;
              e.preventDefault();
              setDragOver(i);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragFrom !== null) move(dragFrom, i);
              setDragFrom(null);
              setDragOver(null);
            }}
            className={cn(
              'group rounded-xl border bg-white transition',
              dragOver === i && dragFrom !== i ? 'border-emerald-400 ring-2 ring-emerald-500/20' : 'border-neutral-200',
            )}
          >
            <div className="flex items-center gap-2 border-b border-neutral-100 px-2 py-1.5">
              <span
                draggable
                onDragStart={() => setDragFrom(i)}
                onDragEnd={() => {
                  setDragFrom(null);
                  setDragOver(null);
                }}
                className="cursor-grab text-neutral-300 hover:text-neutral-500 active:cursor-grabbing"
                title="Kheench kar tarteeb badlein"
              >
                <GripVertical className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-neutral-600">
                {itemTitle ? itemTitle(item, i) : `#${i + 1}`}
              </span>
              <div className="flex items-center gap-0.5 opacity-60 transition group-hover:opacity-100">
                <IconBtn label="Upar" onClick={() => move(i, i - 1)} disabled={i === 0}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn label="Neeche" onClick={() => move(i, i + 1)} disabled={i === list.length - 1}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn label="Hatayein" onClick={() => onChange(list.filter((_, j) => j !== i))} disabled={!canRemove} danger>
                  <Trash2 className="h-3.5 w-3.5" />
                </IconBtn>
              </div>
            </div>
            <div className={cn(compact ? 'p-2.5' : 'p-3', 'space-y-3')}>
              {render(item, (next) => onChange(list.map((x, j) => (j === i ? next : x))), i)}
            </div>
          </div>
        ))}
        {canAdd && (
          <button
            type="button"
            onClick={() => onChange([...list, create()])}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-neutral-300 py-2 text-xs font-medium text-neutral-600 transition hover:border-emerald-400 hover:bg-emerald-50/50 hover:text-emerald-700"
          >
            <Plus className="h-3.5 w-3.5" /> {addLabel}
          </button>
        )}
      </div>
    </Field>
  );
}

export function IconBtn({ children, onClick, label, disabled, danger, active, className }: { children: ReactNode; onClick?: () => void; label: string; disabled?: boolean; danger?: boolean; active?: boolean; className?: string }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'grid h-7 w-7 place-items-center rounded-md transition disabled:cursor-not-allowed disabled:opacity-30',
        danger ? 'text-neutral-500 hover:bg-rose-50 hover:text-rose-600' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900',
        active && 'bg-emerald-50 text-emerald-700',
        className,
      )}
    >
      {children}
    </button>
  );
}

// ─── Buttons and overlays ───

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';

export function Btn({
  children,
  onClick,
  variant = 'secondary',
  size = 'md',
  disabled,
  loading,
  type = 'button',
  className,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  size?: 'sm' | 'md';
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit';
  className?: string;
  title?: string;
}) {
  const v: Record<BtnVariant, string> = {
    primary: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700',
    secondary: 'border border-neutral-300 bg-white text-neutral-800 hover:border-emerald-300 hover:text-emerald-800',
    ghost: 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    dark: 'bg-neutral-900 text-white hover:bg-neutral-800',
  };
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3.5 text-sm',
        v[variant],
        className,
      )}
    >
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const w = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-3xl', xl: 'max-w-6xl' }[width];
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-neutral-900/40 p-4 backdrop-blur-[2px] sm:p-8" onMouseDown={onClose}>
      <div className={cn('w-full rounded-2xl bg-white shadow-2xl ring-1 ring-neutral-200', w)} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-neutral-500">{description}</p>}
          </div>
          <IconBtn label="Band karein" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconBtn>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-neutral-100 bg-neutral-50/60 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/** Closes when clicking outside; used by pickers and menus. */
export function useOutsideClick<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);
  return ref;
}

/**
 * Absolutely positioned panel. The caller wraps trigger and panel in a
 * `relative` container that carries `useOutsideClick`, so clicking the
 * trigger again toggles instead of closing and reopening.
 */
export function Popover({ open, children, className, align = 'left' }: { open: boolean; children: ReactNode; className?: string; align?: 'left' | 'right' }) {
  if (!open) return null;
  return (
    <div
      className={cn(
        'absolute z-40 mt-1 rounded-xl border border-neutral-200 bg-white shadow-xl ring-1 ring-black/5',
        align === 'right' ? 'right-0' : 'left-0',
        className,
      )}
    >
      {children}
    </div>
  );
}
