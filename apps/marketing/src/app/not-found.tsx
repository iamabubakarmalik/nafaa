import Link from 'next/link';
import { Home, Search, ArrowLeft } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <>
      <Header />
      <main>
        <section className="min-h-[60vh] flex items-center py-20">
          <Container className="text-center max-w-2xl">
            <div className="text-9xl font-extrabold gradient-text mb-4">404</div>
            <h1 className="text-3xl lg:text-4xl font-extrabold">Page Not Found</h1>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
              Yeh page maujood nahi hai ya remove kar diya gaya hai. Apni shop ka dashboard dekhna chahte hain?
            </p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <Button size="lg" href="/">
                <Home className="h-4 w-4" /> Back to Home
              </Button>
              <Button size="lg" variant="secondary" href="/help">
                <Search className="h-4 w-4" /> Help Center
              </Button>
            </div>

            <div className="mt-12 pt-12 border-t border-slate-200 dark:border-slate-800">
              <h3 className="font-bold mb-4">Popular Pages</h3>
              <div className="flex flex-wrap gap-2 justify-center">
                {['Pricing', 'Features', 'Industries', 'Blog', 'About', 'Contact'].map((p) => (
                  <Link
                    key={p}
                    href={`/${p.toLowerCase()}`}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm font-semibold hover:bg-brand-100 hover:text-brand-700 dark:hover:bg-brand-950 dark:hover:text-brand-300 transition-colors"
                  >
                    {p}
                  </Link>
                ))}
              </div>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
