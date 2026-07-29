'use client';

import { WifiOff, RefreshCw } from 'lucide-react';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { Container } from '@/components/primitives/Container';
import { Button } from '@/components/primitives/Button';
import { GradientText } from '@/components/primitives/GradientText';

export default function OfflinePage() {
  return (
    <>
      <Header />
      <main className="flex-1 flex items-center min-h-[70vh]">
        <Container className="text-center">
          <div className="inline-flex h-24 w-24 rounded-full bg-gradient-brand items-center justify-center shadow-brand-glow mb-8">
            <WifiOff className="h-12 w-12 text-white" />
          </div>
          <h1 className="font-display font-extrabold text-4xl lg:text-5xl leading-tight">
            <GradientText variant="brand">You're offline</GradientText>
          </h1>
          <p className="mt-5 text-lg text-ink-600 dark:text-ink-300 max-w-lg mx-auto">
            No internet? No problem. The Nafaa app itself works fully offline — this marketing site needs a connection to load new pages.
          </p>
          <div className="mt-8">
            <Button size="lg" onClick={() => location.reload()} leftIcon={<RefreshCw className="h-4 w-4" />}>
              Try again
            </Button>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
