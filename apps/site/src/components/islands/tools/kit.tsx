/**
 * Shared building blocks for the calculator islands: the two-panel layout,
 * inputs, a segmented control, result rows and the source note.
 *
 * Imported only by client islands in this folder. No icon library (inline
 * SVG only) and no state library, so each island stays well under 15 KB.
 */
import { useCallback, useId, useRef, type ReactNode } from 'react';
import { track } from '@/lib/analytics/track';
import type { ToolKey } from '@/lib/cms/contract/cms-contract';
import type { FactSource } from './facts';
import { shortDate } from './format';

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/** Records `tool_used` once, on the first real interaction. */
export function useToolUsed(tool: ToolKey): () => void {
  const sent = useRef(false);
  return useCallback(() => {
    if (sent.current) return;
    sent.current = true;
    track('tool_used', { tool });
  }, [tool]);
}

export function ToolFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section
      aria-label={label}
      className="tool-frame grid gap-4 rounded-xl border border-line bg-surface-2 p-3 shadow-e1 sm:p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-5 lg:p-5"
    >
      {children}
    </section>
  );
}

export function InputsPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('rounded-lg border border-line bg-surface p-5 sm:p-6', className)}>{children}</div>;
}

/** The result side. `aria-live` so screen readers hear new totals. */
export function ResultPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      aria-live="polite"
      className={cx(
        'theme-ink relative isolate overflow-hidden rounded-lg bg-canvas p-5 text-fg sm:p-6 lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:self-start',
        className,
      )}
    >
      <div aria-hidden className="bg-glow pointer-events-none absolute inset-0 -z-10" />
      {children}
    </div>
  );
}

interface FieldProps {
  label: string;
  hint?: ReactNode;
  prefix?: string;
  suffix?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: 'decimal' | 'numeric' | 'text';
  type?: 'text' | 'date';
  className?: string;
  /** Visually hide the label (it stays for screen readers). */
  hideLabel?: boolean;
  autoComplete?: string;
}

export function Field({
  label,
  hint,
  prefix,
  suffix,
  value,
  onChange,
  placeholder,
  inputMode = 'decimal',
  type = 'text',
  className,
  hideLabel,
  autoComplete = 'off',
}: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className={cx('mb-1.5 block text-small font-medium text-fg-strong', hideLabel && 'sr-only')}>
        {label}
      </label>
      <div className="flex h-11 items-center rounded-md border border-line-strong bg-surface transition-colors duration-fast focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/20">
        {prefix ? <span className="select-none pl-3 text-small text-fg-subtle">{prefix}</span> : null}
        <input
          id={id}
          type={type}
          inputMode={type === 'date' ? undefined : inputMode}
          autoComplete={autoComplete}
          value={value}
          placeholder={placeholder}
          aria-describedby={hintId}
          onChange={(event) => onChange(event.target.value)}
          className="h-full w-full min-w-0 bg-transparent px-3 text-body tabular-nums text-fg-strong outline-none placeholder:text-fg-subtle/70"
        />
        {suffix ? <span className="select-none pr-3 text-small text-fg-subtle">{suffix}</span> : null}
      </div>
      {hint ? (
        <p id={hintId} className="mt-1.5 text-small text-fg-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

/** A radio group drawn as a segmented control (keyboard: arrow keys move within the group). */
export function Segmented<T extends string>({
  legend,
  options,
  value,
  onChange,
  className,
  hideLegend,
}: {
  legend: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  hideLegend?: boolean;
}) {
  const name = useId();
  return (
    <fieldset className={className}>
      <legend className={cx('mb-1.5 text-small font-medium text-fg-strong', hideLegend && 'sr-only')}>{legend}</legend>
      <div className="inline-flex w-full flex-wrap gap-1 rounded-md border border-line bg-surface-3 p-1">
        {options.map((option) => (
          <label
            key={option.value}
            className={cx(
              'relative flex min-h-9 flex-1 cursor-pointer items-center justify-center whitespace-nowrap rounded px-3 text-small font-medium transition-[background-color,color,box-shadow] duration-fast',
              option.value === value ? 'bg-surface text-fg-strong shadow-e1' : 'text-fg-muted hover:text-fg-strong',
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span className="peer-focus-visible:underline peer-focus-visible:underline-offset-4">{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** The headline number of a result. */
export function BigResult({ label, value, note }: { label: string; value: string; note?: ReactNode }) {
  return (
    <div>
      <p className="text-eyebrow uppercase text-fg-subtle">{label}</p>
      <p className="mt-2 break-words text-h2 font-650 tabular-nums tracking-tight text-fg-strong">{value}</p>
      {note ? <p className="mt-1 text-small text-fg-muted">{note}</p> : null}
    </div>
  );
}

export function Breakdown({ rows, className }: { rows: { label: ReactNode; value: string; strong?: boolean }[]; className?: string }) {
  return (
    <dl className={cx('divide-y divide-line', className)}>
      {rows.map((row, i) => (
        <div key={i} className="flex items-baseline justify-between gap-4 py-2.5">
          <dt className={cx('text-small', row.strong ? 'font-medium text-fg-strong' : 'text-fg-muted')}>{row.label}</dt>
          <dd className={cx('text-right tabular-nums', row.strong ? 'font-semibold text-fg-strong' : 'text-fg')}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Locale picker shared by the islands: 'ur' gives Urdu, anything else English. */
export function pick<T>(strings: { en: T; ur: T }, locale?: string): T {
  return locale === 'ur' ? strings.ur : strings.en;
}

export function SourceNote({ source, children, locale }: { source: FactSource; children?: ReactNode; locale?: string }) {
  if (locale === 'ur') {
    return (
      <p className="mt-5 text-small text-fg-subtle">
        {children ? <>{children} </> : null}
        ماخذ:{' '}
        <a href={source.url} className="underline decoration-current/30 underline-offset-2 hover:decoration-current">
          {source.publisher}, {source.title}
        </a>{' '}
        (چیک کیا: {shortDate(source.checkedAt)})۔
      </p>
    );
  }
  return (
    <p className="mt-5 text-small text-fg-subtle">
      {children ? <>{children} </> : null}
      Source:{' '}
      <a href={source.url} className="underline decoration-current/30 underline-offset-2 hover:decoration-current">
        {source.publisher}, {source.title}
      </a>{' '}
      (checked {shortDate(source.checkedAt)}).
    </p>
  );
}

export function SmallButton({
  children,
  onClick,
  variant = 'secondary',
  type = 'button',
  className,
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  type?: 'button' | 'submit';
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      aria-label={ariaLabel}
      className={cx(
        'inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-3.5 text-small font-medium transition-[background-color,border-color,color] duration-fast active:translate-y-px',
        variant === 'primary' && 'bg-brand-700 text-white hover:bg-brand-800',
        variant === 'secondary' && 'border border-line-strong bg-surface text-fg-strong hover:bg-surface-2',
        variant === 'ghost' && 'text-fg-muted hover:bg-surface-3 hover:text-fg-strong',
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Inline 16 px glyphs (no icon library in islands). */
export const Glyph = {
  plus: (
    <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  x: (
    <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
  check: (
    <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  printer: (
    <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 14h12v8H6z" />
    </svg>
  ),
  reset: (
    <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  ),
  copy: (
    <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
};

/** Copies text and briefly confirms. Returns false when the clipboard is unavailable. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
