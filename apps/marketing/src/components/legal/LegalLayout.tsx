import { type ReactNode } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';

interface Props {
  title: string;
  subtitle?: string;
  lastUpdated: string;
  children: ReactNode;
}

export function LegalLayout({ title, subtitle, lastUpdated, children }: Props) {
  return (
    <>
      <Header />
      <main>
        <section className="relative pt-20 pb-12 overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-50 dark:opacity-30 pointer-events-none" />
          <Container className="relative max-w-4xl text-center">
            <Badge variant="slate">⚖️ Legal</Badge>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
              <span className="gradient-text">{title}</span>
            </h1>
            {subtitle && (
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                {subtitle}
              </p>
            )}
            <p className="mt-4 text-sm text-slate-500">Last updated: {lastUpdated}</p>
          </Container>
        </section>

        <section className="py-12">
          <Container className="max-w-3xl">
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 lg:p-12 prose prose-slate dark:prose-invert max-w-none prose-headings:font-extrabold prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-3 prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-2 prose-p:leading-relaxed prose-a:text-brand-600 prose-a:font-semibold prose-strong:text-slate-900 dark:prose-strong:text-white">
              {children}
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
