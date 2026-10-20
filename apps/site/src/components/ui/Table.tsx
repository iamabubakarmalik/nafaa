/**
 * Table: an HTML table with a caption inside a keyboard-scrollable region, so
 * wide tables scroll on phones without scrolling the page.
 */
import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cx } from './cx';

export interface TableProps {
  caption: ReactNode;
  /** Accessible name for the scroll region; defaults to the caption text. */
  label?: string;
  /** Show the caption visually (it is always read by screen readers). */
  showCaption?: boolean;
  minWidth?: 'sm' | 'md' | 'lg';
  className?: string;
  children: ReactNode;
}

const MIN_WIDTH = { sm: 'min-w-[28rem]', md: 'min-w-[36rem]', lg: 'min-w-[48rem]' } as const;

export function Table({ caption, label, showCaption = false, minWidth = 'md', className, children }: TableProps) {
  return (
    <div
      role="region"
      aria-label={label ?? (typeof caption === 'string' ? caption : undefined)}
      tabIndex={0}
      className={cx('overflow-x-auto rounded-lg border border-line bg-surface shadow-e1 ink:shadow-none', className)}
    >
      <table className={cx('w-full border-collapse text-left text-small', MIN_WIDTH[minWidth])}>
        <caption
          className={cx(
            showCaption ? 'border-b border-line px-4 py-3 text-left font-medium text-fg-strong' : 'sr-only',
          )}
        >
          {caption}
        </caption>
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="bg-surface-2 text-fg-strong">{children}</thead>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="[&>tr:last-child>*]:border-b-0">{children}</tbody>;
}

export function Tr({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={className}>{children}</tr>;
}

export function Th({ className, scope = 'col', ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope={scope}
      className={cx('border-b border-line px-4 py-3 font-semibold text-fg-strong', className)}
      {...rest}
    />
  );
}

export type TdProps = Omit<TdHTMLAttributes<HTMLTableCellElement>, 'align'> & {
  /** Vertical alignment; top by default so multi-line cells line up. */
  align?: 'top' | 'middle';
};

export function Td({ className, align = 'top', ...rest }: TdProps) {
  return (
    <td
      className={cx('border-b border-line px-4 py-3 text-fg', align === 'top' ? 'align-top' : 'align-middle', className)}
      {...rest}
    />
  );
}
