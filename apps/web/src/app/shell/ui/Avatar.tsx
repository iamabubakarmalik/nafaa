/** User avatar: the uploaded photo, or the first initial on the brand color. */

import { cn } from '@core/lib/cn';

interface AvatarProps {
  name?: string;
  url?: string;
  size?: number;
  className?: string;
}

export function Avatar({ name, url, size = 36, className }: AvatarProps) {
  const initial = (name?.trim()?.charAt(0) || 'N').toUpperCase();
  if (url) {
    return <img src={url} alt={name ?? ''} style={{ width: size, height: size }} className={cn('shrink-0 rounded-full object-cover', className)} />;
  }
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-bold text-brand-fg', className)}
      aria-hidden
    >
      {initial}
    </span>
  );
}
