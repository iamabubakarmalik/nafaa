'use client';

/**
 * Error boundary for page content. The header and footer stay in place; the
 * visitor can retry without a full reload.
 */
import Link from 'next/link';
import { useEffect } from 'react';
import { buttonClasses } from '@/components/ui/Button';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto box-content max-w-measure px-gutter py-section text-center">
      <h1 className="text-h2 text-fg-strong">Something went wrong</h1>
      <p className="mt-4 text-fg-muted">This page could not load. Please try again in a moment.</p>
      <div className="mt-8 flex justify-center gap-3">
        <button type="button" onClick={reset} className={buttonClasses({ variant: 'primary' })}>
          Try again
        </button>
        <Link href="/" className={buttonClasses({ variant: 'secondary' })}>
          Home page
        </Link>
      </div>
    </div>
  );
}
