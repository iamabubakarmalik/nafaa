interface Props {
  size?: number;
  className?: string;
}

export function Logo({ size = 40, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="brandWeb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="50%" stopColor="#16a34a" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="72" height="72" rx="18" ry="18" fill="url(#brandWeb)" />
      <g transform="translate(40, 42)" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <line x1="-16" y1="-16" x2="-16" y2="16" />
        <line x1="-16" y1="16" x2="16" y2="-16" />
        <line x1="16" y1="-16" x2="16" y2="16" />
        <polyline points="7,-16 16,-16 16,-7" />
      </g>
      <circle cx="62" cy="18" r="5" fill="#f59e0b" />
    </svg>
  );
}
