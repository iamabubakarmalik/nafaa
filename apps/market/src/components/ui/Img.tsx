/**
 * next/image with a designed fallback: when there is no picture, a soft
 * gradient in the gate colour with an icon or initials, so cards never look
 * broken and keep their size.
 */
import Image from 'next/image';
import type { ReactNode } from 'react';
import { cn } from './cn';

interface Props {
  src: string | null | undefined;
  alt: string;
  color?: string;
  fallback?: ReactNode;
  className?: string;
  sizes?: string;
  priority?: boolean;
  rounded?: string;
}

export function Img({ src, alt, color = '#9333ea', fallback, className, sizes = '(max-width: 768px) 50vw, 25vw', priority, rounded }: Props) {
  return (
    <div className={cn('relative overflow-hidden bg-gray-100', rounded, className)}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <div
          className="absolute inset-0 grid place-items-center"
          style={{ background: `linear-gradient(135deg, ${color}26 0%, ${color}0d 60%, ${color}33 100%)`, color }}
          aria-hidden
        >
          {fallback}
        </div>
      )}
    </div>
  );
}
