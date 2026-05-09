import { cn } from '@/lib/cn';

interface Props {
  size?: number;
  className?: string;
  variant?: 'default' | 'mono-white' | 'mono-black';
}

export function Logo({ size = 40, className, variant = 'default' }: Props) {
  const fillIcon = variant === 'mono-white' ? '#ffffff' : variant === 'mono-black' ? '#0f172a' : 'url(#brandG)';
  const strokeColor = variant === 'mono-white' ? '#0f172a' : variant === 'mono-black' ? '#ffffff' : '#ffffff';
  const accent = variant === 'default' ? '#f59e0b' : strokeColor;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      className={cn(className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="brandG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="50%" stopColor="#16a34a" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="72" height="72" rx="18" ry="18" fill={fillIcon} />
      <g
        transform="translate(40, 42)"
        stroke={strokeColor}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <line x1="-16" y1="-16" x2="-16" y2="16" />
        <line x1="-16" y1="16" x2="16" y2="-16" />
        <line x1="16" y1="-16" x2="16" y2="16" />
        <polyline points="7,-16 16,-16 16,-7" />
      </g>
      <circle cx="62" cy="18" r="5" fill={accent} />
    </svg>
  );
}

export function LogoFull({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 80" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="brandGF" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="50%" stopColor="#16a34a" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
      </defs>
      <rect x="4" y="8" width="64" height="64" rx="16" ry="16" fill="url(#brandGF)" />
      <g transform="translate(36, 40)" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <line x1="-14" y1="-14" x2="-14" y2="14" />
        <line x1="-14" y1="14" x2="14" y2="-14" />
        <line x1="14" y1="-14" x2="14" y2="14" />
        <polyline points="6,-14 14,-14 14,-6" />
      </g>
      <circle cx="58" cy="20" r="4" fill="#f59e0b" />
      <text x="86" y="50" fontFamily="Inter, system-ui" fontSize="36" fontWeight="800" fill="currentColor" letterSpacing="-1.5">
        Nafaa
      </text>
    </svg>
  );
}
