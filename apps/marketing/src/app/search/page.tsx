'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search as SearchIcon, ArrowRight, Loader2 } from 'lucide-react';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { FloatingWhatsApp } from '@/components/layout/Footer/FloatingWhatsApp';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Badge } from '@/components/primitives/Badge';
import { GradientText } from '@/components/primitives/GradientText';
import { AuroraBackground } from '@/components/primitives/AuroraBackground';
import { NoiseTexture } from '@/components/primitives/NoiseTexture';
import { cn } from '@/lib/cn';

interface Result { title: string; subtitle: string; url: string; category: string; score: number; }

const categoryColors: Record<string, string> = {
  Industry: 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300',
  Integration: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  Feature: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  Solution: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  Blog: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  Compare: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  Glossary: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
};

export default function SearchPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState(params.get('q') || '');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const query = params.get('q') || '';
    setQ(query);
    if (query.length >= 2) {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((d) => { setResults(d.results); setCount(d.count); })
        .finally(() => setLoading(false));
    } else {
      setResults([]);
    }
  }, [params]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-10">
          <AuroraBackground variant="brand" intensity="subtle" />
          <NoiseTexture />
          <Container className="relative text-center">
            <h1 className="font-display font-extrabold text-4xl lg:text-5xl">
              <GradientText variant="brand">Search Nafaa</GradientText>
            </h1>
            <form onSubmit={submit} className="mt-8 max-w-xl mx-auto relative">
              <SearchIcon className="h-5 w-5 text-ink-400 absolute left-5 top-1/2 -translate-y-1/2" />
              <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus
                placeholder="Search industries, features, blog, glossary..."
                className="h-14 w-full rounded-2xl bg-white dark:bg-ink-800 pl-14 pr-5 ring-1 ring-inset ring-ink-200 dark:ring-ink-700 focus:ring-2 focus:ring-brand-500 outline-none shadow-lg" />
            </form>
            {count > 0 && (
              <p className="mt-4 text-sm text-ink-500">
                {count} result{count === 1 ? '' : 's'} for "<span className="font-bold">{params.get('q')}</span>"
              </p>
            )}
          </Container>
        </section>

        <Section variant="default" spacing="md">
          <Container size="md">
            {loading && (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-brand-600" />
              </div>
            )}

            {!loading && results.length === 0 && params.get('q') && (
              <div className="text-center py-16 text-ink-500">
                <SearchIcon className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No results found. Try different keywords.</p>
              </div>
            )}

            <div className="space-y-3">
              {results.map((r, i) => (
                <Link key={i} href={r.url}
                  className="group block rounded-2xl bg-white dark:bg-ink-800 p-5 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:-translate-y-0.5 hover:shadow-card-hover hover:ring-brand-400 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest', categoryColors[r.category])}>
                          {r.category}
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-lg group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                        {r.title}
                      </h3>
                      <p className="mt-1 text-sm text-ink-600 dark:text-ink-300 line-clamp-2">{r.subtitle}</p>
                      <div className="mt-2 text-xs text-ink-400 font-mono truncate">{r.url}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-ink-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                  </div>
                </Link>
              ))}
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
