'use client';

import { useEffect } from 'react';
import { RefreshCw, Home } from 'lucide-react';
import { Container } from '@/components/primitives/Container';
import { Button } from '@/components/primitives/Button';
import { GradientText } from '@/components/primitives/GradientText';
import { reportError } from '@/lib/monitoring/errorReporter';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error, { digest: error.digest });
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <Container className="text-center max-w-2xl">
        <div className="font-display font-extrabold text-6xl lg:text-7xl">
          <GradientText variant="aurora">Oops</GradientText>
        </div>
        <h1 className="mt-4 text-3xl lg:text-4xl font-display font-extrabold">Something went wrong</h1>
        <p className="mt-4 text-lg text-ink-600 dark:text-ink-300">
          We've been notified about this error. Please try again in a moment.
        </p>
        {error.digest && (
          <div className="mt-4 inline-block px-3 py-1 rounded-md bg-ink-100 dark:bg-ink-800 text-xs font-mono text-ink-500">
            Reference: {error.digest}
          </div>
        )}
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Button onClick={reset} leftIcon={<RefreshCw className="h-4 w-4" />} size="lg">Try again</Button>
          <Button href="/" variant="secondary" leftIcon={<Home className="h-4 w-4" />} size="lg">Back to home</Button>
        </div>
      </Container>
    </main>
  );
}
