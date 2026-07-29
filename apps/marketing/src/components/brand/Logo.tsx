import { cn } from '@/lib/cn';

interface Props {
  size?: number;
  className?: string;
  variant?: 'default' | 'mono-white' | 'mono-dark' | 'aurora';
}

export function Logo({ size = 40, className, variant = 'default' }: Props) {
  const gradId = `nafaa-grad-${variant}`;
  const glowId = `nafaa-glow-${variant}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      className={cn('shrink-0', className)}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Nafaa"
    >
      <defs>
        {variant === 'default' && (
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#32d583" />
            <stop offset="50%" stopColor="#12b76a" />
            <stop offset="100%" stopColor="#027a48" />
          </linearGradient>
        )}
        {variant === 'aurora' && (
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        )}
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Rounded container */}
      <rect
        x="4" y="4" width="72" height="72" rx="20" ry="20"
        fill={
          variant === 'mono-white' ? '#ffffff'
          : variant === 'mono-dark' ? '#0a0e27'
          : `url(#${gradId})`
        }
      />

      {/* N monogram — geometric, futuristic */}
      <g
        transform="translate(24, 22)"
        stroke={variant === 'mono-dark' ? '#ffffff' : variant === 'mono-white' ? '#0a0e27' : '#ffffff'}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter={`url(#${glowId})`}
      >
        <line x1="0" y1="0" x2="0" y2="36" />
        <line x1="0" y1="0" x2="32" y2="36" />
        <line x1="32" y1="0" x2="32" y2="36" />
      </g>

      {/* Accent dot (Pakistan crescent gold) */}
      <circle
        cx="62" cy="18" r="5"
        fill={variant === 'mono-white' || variant === 'mono-dark' ? 'currentColor' : '#f4c531'}
        opacity="0.95"
      />
    </svg>
  );
}

export function LogoWordmark({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      <Logo size={size} />
      <span className="font-display font-extrabold text-xl tracking-tight text-ink-900 dark:text-white">
        Nafaa
      </span>
    </div>
  );
}
