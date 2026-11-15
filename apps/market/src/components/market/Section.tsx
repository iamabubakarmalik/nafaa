/** Section heading with an optional "See all" link. */
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

export function Section({ title, more, children, className }: { title: string; more?: { href: string; label: string }; children: ReactNode; className?: string }) {
  return (
    <section className={className ?? 'mt-8'}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-900 md:text-xl">{title}</h2>
        {more && (
          <Link href={more.href} className="inline-flex items-center gap-0.5 text-sm font-semibold text-brand-700 hover:underline">
            {more.label}
            <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
