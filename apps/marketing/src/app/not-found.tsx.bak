import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';
import { Container } from '@/components/primitives/Container';
import { Button } from '@/components/primitives/Button';
import { GradientText } from '@/components/primitives/GradientText';
import { AuroraBackground } from '@/components/primitives/AuroraBackground';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex-1 relative min-h-[70vh] flex items-center">
        <AuroraBackground variant="brand" intensity="subtle" />
        <Container className="relative text-center">
          <div className="max-w-2xl mx-auto">
            <div className="font-display font-extrabold text-[8rem] lg:text-[12rem] leading-none">
              <GradientText variant="brand">404</GradientText>
            </div>
            <h1 className="mt-4 text-3xl lg:text-4xl font-display font-extrabold text-ink-900 dark:text-white">
              Page not found
            </h1>
            <p className="mt-4 text-lg text-ink-600 dark:text-ink-300 max-w-md mx-auto">
              The page you are looking for does not exist or has been moved.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <Button href="/" leftIcon={<Home className="h-4 w-4" />} size="lg">
                Back to home
              </Button>
              <Button href="/contact" variant="secondary" leftIcon={<ArrowLeft className="h-4 w-4" />} size="lg">
                Contact support
              </Button>
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
