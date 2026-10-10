/**
 * The square mark at the top of the sidebar: the industry icon on the brand
 * color, or the Nafaa logo in the marketplace workspace.
 */

import { Logo } from '@core/components/brand/Logo';
import { industryIdentity, MARKETPLACE_IDENTITY } from '@/design-system';
import { cn } from '@core/lib/cn';

interface BrandMarkProps {
  industryId?: string;
  marketplace?: boolean;
  size?: 'md' | 'lg';
  className?: string;
}

export function BrandMark({ industryId, marketplace, size = 'md', className }: BrandMarkProps) {
  const identity = marketplace ? MARKETPLACE_IDENTITY : industryIdentity(industryId);
  const Icon = identity.icon;
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-brand-fg shadow-sm ring-1 ring-inset ring-white/15',
        size === 'lg' ? 'h-10 w-10' : 'h-9 w-9',
        className,
      )}
      aria-hidden
    >
      {marketplace || !industryId ? <Logo size={20} /> : <Icon className={size === 'lg' ? 'h-5 w-5' : 'h-[18px] w-[18px]'} strokeWidth={2.2} />}
    </span>
  );
}
