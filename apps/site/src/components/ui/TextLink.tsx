/** TextLink: an inline link with a quiet underline that firms up on hover. */
import Link from 'next/link';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { isInternal } from './Button';
import { cx } from './cx';

export type TextLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string;
  children: ReactNode;
};

export const textLinkClasses =
  'font-medium text-link underline decoration-link/35 decoration-1 underline-offset-[3px] ' +
  'transition-[text-decoration-color] duration-fast hover:decoration-current';

export function TextLink({ href, className, children, ...rest }: TextLinkProps) {
  const classes = cx(textLinkClasses, className);
  return isInternal(href) ? (
    <Link href={href} className={classes} {...rest}>
      {children}
    </Link>
  ) : (
    <a href={href} className={classes} {...rest}>
      {children}
    </a>
  );
}
