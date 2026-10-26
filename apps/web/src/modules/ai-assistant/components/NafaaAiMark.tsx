/**
 * Nafaa AI mark: a robot head built from the Nafaa logo. The visor is the
 * Noon bowl (exact logo geometry, scaled), the antenna is the amber diamond.
 * Standalone copies live in brand/ai/.
 *
 * `state="thinking"` pulses the diamond; the pulse is skipped when the user
 * prefers reduced motion. Colors follow light and dark mode.
 */

import { cn } from '@core/lib/cn';

const SIZES = { xs: 16, sm: 20, md: 28, lg: 44, xl: 64 } as const;

export type NafaaAiMarkSize = keyof typeof SIZES | number;

export function NafaaAiMark({ size = 'md', state = 'idle', className, title }: {
  size?: NafaaAiMarkSize;
  state?: 'idle' | 'thinking';
  className?: string;
  /** Accessible name; the mark is decorative when left out. */
  title?: string;
}) {
  const px = typeof size === 'number' ? size : SIZES[size];
  return (
    <svg
      viewBox="0 0 64 64"
      width={px}
      height={px}
      className={cn('shrink-0', className)}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      data-state={state}
    >
      {title && <title>{title}</title>}
      <style>{`
        @keyframes nafaa-ai-spark { 0%,100% { transform: scale(1); opacity: 1 } 50% { transform: scale(.72); opacity: .55 } }
        @media (prefers-reduced-motion: no-preference) {
          [data-state="thinking"] .nafaa-ai-spark { animation: nafaa-ai-spark 1.1s ease-in-out infinite; }
        }
      `}</style>
      <path
        className="nafaa-ai-spark fill-accent-500 dark:fill-accent-400"
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        d="M32 1L38.5 7.5L32 14L25.5 7.5Z"
      />
      <rect x="30" y="12.5" width="4" height="7" rx="1.5" className="fill-success-700 dark:fill-success-500" />
      <rect x="2" y="32" width="6" height="14" rx="2.5" fill="#15803d" />
      <rect x="56" y="32" width="6" height="14" rx="2.5" fill="#15803d" />
      <rect x="6" y="18" width="52" height="43" rx="13" fill="#16a34a" />
      <circle cx="24" cy="29" r="3.6" fill="#f8fafc" />
      <circle cx="40" cy="29" r="3.6" fill="#f8fafc" />
      <path d="M18 37.4L22.6 34.8V42A9.6 9.6 0 0 0 41.4 42H46A14 14 0 0 1 18 42Z" fill="#f8fafc" />
    </svg>
  );
}
