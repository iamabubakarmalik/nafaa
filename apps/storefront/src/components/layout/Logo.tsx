import Image from 'next/image';
import Link from 'next/link';

export function Logo({ name, logoUrl, width, homeHref, className = '' }: { name: string; logoUrl: string | null; width: number; homeHref: string; className?: string }) {
  return (
    <Link href={homeHref} className={`inline-flex shrink-0 items-center ${className}`} aria-label={name}>
      {logoUrl ? (
        <Image src={logoUrl} alt={name} width={Math.max(60, Math.min(300, width || 140))} height={48} className="h-auto max-h-12 w-auto object-contain" style={{ maxWidth: Math.max(60, Math.min(300, width || 140)) }} priority />
      ) : (
        <span className="h-display font-heading text-[22px] font-semibold leading-none tracking-tight md:text-[26px]">{name}</span>
      )}
    </Link>
  );
}
