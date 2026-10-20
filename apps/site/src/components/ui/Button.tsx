/**
 * Button and LinkButton share one look. Variants: primary (brand fill),
 * secondary (outlined), ghost, and on-ink (white fill for dark bands).
 *
 * The primary fill is brand-700, not brand-600: white on brand-600 is 3.77:1,
 * below the 4.5:1 that body-size button labels need. White on brand-700 is 5.5:1.
 */
import { ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'on-ink';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE =
  'group/btn inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium ' +
  'transition-[background-color,border-color,color,box-shadow,transform] duration-fast ease-out ' +
  'active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-700 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_1px_2px_rgb(2_6_23/0.14)] hover:bg-brand-800',
  secondary:
    'border border-line-strong bg-surface text-fg-strong shadow-e1 hover:border-fg-subtle/50 hover:bg-surface-2 ink:shadow-none',
  ghost: 'text-fg-strong hover:bg-surface-3',
  'on-ink': 'bg-white text-slate-950 shadow-e1 hover:bg-slate-200',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-small',
  md: 'h-11 px-5 text-[0.9375rem]',
  lg: 'h-12 px-6 text-base',
};

const ICON_SIZE: Record<ButtonSize, number> = { sm: 16, md: 18, lg: 18 };

interface SharedProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading icon (lucide component). */
  icon?: LucideIcon;
  /** Trailing arrow that nudges on hover. */
  arrow?: boolean;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
}

export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
}: Pick<SharedProps, 'variant' | 'size' | 'fullWidth' | 'className'> = {}): string {
  return cx(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className);
}

function Content({ icon: Glyph, arrow, size = 'md', children }: Pick<SharedProps, 'icon' | 'arrow' | 'size' | 'children'>) {
  const px = ICON_SIZE[size];
  return (
    <>
      {Glyph ? <Glyph aria-hidden size={px} strokeWidth={1.75} className="-ml-0.5 shrink-0" /> : null}
      <span>{children}</span>
      {arrow ? (
        <ArrowRight
          aria-hidden
          size={px - 2}
          strokeWidth={2}
          className="-mr-1 shrink-0 transition-transform duration-fast ease-out group-hover/btn:translate-x-0.5"
        />
      ) : null}
    </>
  );
}

export type ButtonProps = SharedProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'>;

export function Button({ variant, size, icon, arrow, fullWidth, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={buttonClasses({ variant, size, fullWidth, className })} {...rest}>
      <Content icon={icon} arrow={arrow} size={size}>
        {children}
      </Content>
    </button>
  );
}

export type LinkButtonProps = SharedProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'className' | 'href'> & { href: string };

/** Internal paths use next/link; absolute URLs render a plain anchor. */
export function LinkButton({ href, variant, size, icon, arrow, fullWidth, className, children, ...rest }: LinkButtonProps) {
  const classes = buttonClasses({ variant, size, fullWidth, className });
  const content = (
    <Content icon={icon} arrow={arrow} size={size}>
      {children}
    </Content>
  );
  if (isInternal(href)) {
    return (
      <Link href={href} className={classes} {...rest}>
        {content}
      </Link>
    );
  }
  const rel = rest.target === '_blank' ? cx('noopener', rest.rel) : rest.rel;
  return (
    <a href={href} className={classes} {...rest} rel={rel || undefined}>
      {content}
    </a>
  );
}

export function isInternal(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('//');
}
