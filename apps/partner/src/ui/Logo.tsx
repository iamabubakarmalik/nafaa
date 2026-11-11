/** Nafaa brand mark (same paths as public/favicon.svg). */

export function LogoMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden>
      <rect width="512" height="512" rx="114" fill="#16a34a" />
      <path d="M128 214L170.3 190V256A88 88 0 0 0 341.7 256H384A128 128 0 0 1 128 256Z" fill="#ffffff" />
      <path d="M260 142L300 182L260 222L220 182Z" fill="#fbbf24" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="leading-tight">
        <span className="block text-[0.9375rem] font-extrabold tracking-tight text-slate-900">Nafaa</span>
        <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-brand-700">Partner</span>
      </span>
    </span>
  );
}
