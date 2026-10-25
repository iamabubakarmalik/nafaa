/**
 * comparisonTable (API-CONTRACT 4.7): a real <table> with a <caption>,
 * yes / no / partial marks (with text for screen readers), cell notes, a
 * highlighted column (normally Nafaa), sources and the date it was checked.
 * The first column stays put while the table scrolls sideways on phones.
 */
import { Container } from '@/components/ui/Container';
import { cx } from '@/components/ui/cx';
import { BlockHeading } from './parts/BlockHeading';
import { SourceList } from './parts/Sources';
import { formatDate, isoDate } from './lib/format';
import { strings } from './lib/i18n';
import { reveal } from './lib/reveal';
import type { BlockProps } from './types';
import styles from './blocks.module.css';

/** Table width before it scrolls sideways, by number of value columns. */
const MIN_WIDTH: Record<number, string> = { 1: 'min-w-[20rem]', 2: 'min-w-[26rem]', 3: 'min-w-[34rem]', 4: 'min-w-[42rem]' };

function Mark({ value, label }: { value: 'yes' | 'no' | 'partial'; label: string }) {
  const tone =
    value === 'yes'
      ? 'bg-brand-600 text-white ink:bg-brand-400 ink:text-slate-950'
      : value === 'partial'
        ? 'bg-amber-100 text-amber-800 ink:bg-amber-400/15 ink:text-amber-300'
        : 'bg-surface-3 text-fg-subtle';
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className={cx('inline-flex size-5 items-center justify-center rounded-full', tone)}>
        <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" focusable="false">
          {value === 'yes' ? <path d="M3.5 8.5 6.5 11 12.5 5" /> : value === 'partial' ? <path d="M4 8h8" /> : <path d="M5 5l6 6M11 5l-6 6" />}
        </svg>
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function ComparisonTable({ block, ctx }: BlockProps<'comparisonTable'>) {
  const t = strings(ctx.locale);
  const valueCols = block.columns;
  const marks = { yes: t.yes, no: t.no, partial: t.partial } as const;

  return (
    <Container>
      <BlockHeading id={ctx.headingId} title={block.heading} index={ctx.index} />
      {/* The caption is shown here so it never scrolls away with a wide table; the <caption> stays for screen readers. */}
      <p aria-hidden className="mt-4 max-w-measure text-small text-fg-muted">
        {block.caption}
      </p>
      <div
        role="region"
        aria-labelledby={ctx.headingId}
        tabIndex={0}
        className="mt-8 overflow-x-auto rounded-xl border border-line bg-surface shadow-e1 ink:shadow-none"
        {...reveal(ctx.index)}
      >
        <table className={cx(styles.compare, 'w-full border-collapse text-start text-small', MIN_WIDTH[Math.min(valueCols.length, 4)] ?? 'min-w-[42rem]')}>
          <caption className="sr-only">{block.caption}</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky start-0 z-[1] w-[9.5rem] border-b sm:w-[34%] border-line bg-surface-2 px-5 py-4 font-semibold text-fg-strong">
                <span className="sr-only">{t.compareRow}</span>
              </th>
              {valueCols.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  data-highlight={col.highlight ? '' : undefined}
                  className="border-b border-line bg-surface-2 px-5 py-4 font-semibold text-fg-strong"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r} className="[&:last-child>*]:border-b-0">
                <th scope="row" className="border-b border-line px-4 py-3.5 font-medium text-fg sm:px-5">
                  {row.label}
                </th>
                {valueCols.map((col) => {
                  const cell = row.cells[col.key];
                  const value = cell?.value?.trim() ?? '';
                  const mark = value === 'yes' || value === 'no' || value === 'partial' ? value : null;
                  return (
                    <td key={col.key} data-highlight={col.highlight ? '' : undefined} className="border-b border-line px-5 py-3.5 align-top text-fg">
                      {mark ? <Mark value={mark} label={marks[mark]} /> : value ? <span className="font-medium text-fg-strong">{value}</span> : <span className="text-fg-subtle">–</span>}
                      {cell?.note ? <span className="mt-1 block text-xs text-fg-subtle">{cell.note}</span> : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {block.sources?.length || block.checkedAt ? (
        <div className="mt-6 flex flex-col gap-3 text-small text-fg-muted md:flex-row md:items-start md:justify-between">
          {block.sources?.length ? (
            <div className="min-w-0">
              <p className="mb-2 font-medium text-fg">{t.sources}</p>
              <SourceList items={block.sources} locale={ctx.locale} compact />
            </div>
          ) : null}
          {block.checkedAt ? (
            <p className="shrink-0 text-fg-subtle">
              {t.checkedOn} <time dateTime={isoDate(block.checkedAt)}>{formatDate(block.checkedAt, ctx.locale)}</time>
            </p>
          ) : null}
        </div>
      ) : null}
    </Container>
  );
}
