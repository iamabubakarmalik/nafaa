/** Nafaa mark (brand/logo) with the "Market" word in the Market accent. */
import Image from 'next/image';
import Link from 'next/link';

export function Logo({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} aria-label={label} className="flex shrink-0 items-center gap-1.5">
      <Image src="/brand/nafaa-mark.svg" alt="" width={30} height={30} priority unoptimized />
      <span className="whitespace-nowrap text-base font-extrabold tracking-tight text-gray-900 sm:text-lg">
        nafaa<span className="text-brand-600"> market</span>
      </span>
    </Link>
  );
}
