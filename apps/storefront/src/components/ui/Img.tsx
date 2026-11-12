/**
 * next/image with the storefront defaults: fills its frame, lazy unless
 * priority, and sizes tuned for the common grids.
 */
import Image from 'next/image';

export function Img({
  src,
  alt,
  sizes = '(min-width: 1024px) 25vw, 50vw',
  priority,
  className = 'object-cover',
}: {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={className} />;
}
