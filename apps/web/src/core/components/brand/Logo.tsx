/**
 * The Nafaa app icon (brand/logo/svg/nafaa-icon.svg): the noon bowl and the
 * amber diamond on the green tile. The viewBox keeps the tile at 90% of
 * `size`, so it lines up with the layouts built around the previous icon.
 */

interface Props {
  size?: number;
  className?: string;
}

export function Logo({ size = 40, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="-28.4 -28.4 568.8 568.8" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" rx="114" fill="#16a34a" />
      <path d="M128 214L170.3 190V256A88 88 0 0 0 341.7 256H384A128 128 0 0 1 128 256Z" fill="#ffffff" />
      <path d="M260 142L300 182L260 222L220 182Z" fill="#fbbf24" />
    </svg>
  );
}
