'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center py-20">
      <Container className="text-center max-w-2xl">
        <div className="inline-flex h-20 w-20 rounded-3xl bg-rose-100 dark:bg-rose-950/40 items-center justify-center">
          <AlertTriangle className="h-10 w-10 text-rose-600 dark:text-rose-400" />
        </div>
        <h1 className="mt-6 text-3xl lg:text-4xl font-extrabold">Something went wrong</h1>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
          Hum ne ye error log kar liya hai aur jaldi fix kar denge. Aap try kar sakte hain ya home pe wapas ja sakte hain.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Button size="lg" onClick={reset}>
            <RefreshCw className="h-4 w-4" /> Try Again
          </Button>
          <Button size="lg" variant="secondary" href="/">
            <Home className="h-4 w-4" /> Go Home
          </Button>
        </div>
      </Container>
    </main>
  );
}
