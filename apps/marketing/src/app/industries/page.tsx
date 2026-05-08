import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { CTA } from '@/components/home/CTA';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Industries — Tailored Solutions for Every Business',
  description:
    'Nafaa is built for Pakistani retail businesses: bakeries, kiryana stores, mobile shops, pharmacies, restaurants, garments, and more.',
  path: '/industries',
});

const industries = [
  { slug: 'bakery', emoji: '🍞', title: 'Bakery & Sweets', desc: 'Cake orders, daily production, expiry tracking' },
  { slug: 'kiryana', emoji: '🛒', title: 'Kiryana Store', desc: 'Quick checkout, khata book, daily essentials' },
  { slug: 'mobile-shop', emoji: '📱', title: 'Mobile Shop', desc: 'IMEI tracking, accessories, repairs' },
  { slug: 'pharmacy', emoji: '💊', title: 'Pharmacy', desc: 'Batch tracking, expiry alerts, prescriptions' },
  { slug: 'restaurant', emoji: '🍕', title: 'Restaurant & Cafe', desc: 'Table orders, kitchen display, recipes' },
  { slug: 'garments', emoji: '👕', title: 'Garments & Fashion', desc: 'Variants, seasons, fashion catalogs' },
  { slug: 'meat', emoji: '🥩', title: 'Meat & Poultry', desc: 'Weight pricing, scale integration' },
  { slug: 'vegetables', emoji: '🥬', title: 'Vegetables & Fruits', desc: 'Daily rates, weight pricing, freshness' },
  { slug: 'cosmetics', emoji: '💄', title: 'Cosmetics & Beauty', desc: 'Brand catalogs, customer loyalty' },
  { slug: 'electronics', emoji: '🔌', title: 'Electronics', desc: 'Warranty tracking, serial numbers' },
  { slug: 'hardware', emoji: '🔧', title: 'Hardware Store', desc: 'Bulk sales, contractor accounts' },
  { slug: 'auto-parts', emoji: '🔩', title: 'Auto Parts', desc: 'Vehicle compatibility, technical specs' },
];

export default function IndustriesPage() {
  return (
    <>
      <Header />
      <main>
        <section className="relative pt-20 pb-12 overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-50 dark:opacity-30 pointer-events-none" />
          <Container className="relative text-center">
            <Badge variant="brand">🏢 Industries We Serve</Badge>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-balance">
              <span className="gradient-text">Built for Every Pakistani Business</span>
            </h1>
            <p className="mt-5 text-lg lg:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Specialized features tailored for your industry's unique needs
            </p>
          </Container>
        </section>

        <section className="py-12 lg:py-20">
          <Container>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {industries.map((it) => (
                <Link
                  key={it.slug}
                  href={`/industries/${it.slug}`}
                  className="group rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-xl hover:-translate-y-1 transition-all"
                >
                  <div className="text-5xl mb-4">{it.emoji}</div>
                  <h3 className="font-extrabold text-lg group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {it.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{it.desc}</p>
                  <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 dark:text-brand-400">
                    Explore <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </Container>
        </section>

        <CTA />
      </main>
      <Footer />
    </>
  );
}
