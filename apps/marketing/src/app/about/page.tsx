import { Heart, Target, Users, Award, Sparkles, Globe } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { CTA } from '@/components/home/CTA';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'About Us — Built in Pakistan, For Pakistan',
  description:
    'Nafaa is built in Lahore by Pakistanis, for Pakistani shopkeepers. Learn our mission, values, and story of empowering local businesses with world-class software.',
  path: '/about',
});

const values = [
  { icon: Heart, title: 'Made with Love', desc: 'Built by Pakistanis who understand Pakistani business challenges.' },
  { icon: Target, title: 'Customer First', desc: 'Every feature is shaped by real shopkeeper feedback.' },
  { icon: Users, title: 'Community', desc: 'We\'re building Pakistan\'s largest retail tech community.' },
  { icon: Award, title: 'Excellence', desc: 'World-class quality at Pakistani prices.' },
];

const stats = [
  { value: '5,000+', label: 'Active Shops' },
  { value: '50+', label: 'Cities in Pakistan' },
  { value: 'Rs 5B+', label: 'Sales Processed' },
  { value: '24/7', label: 'Customer Support' },
];

export default function AboutPage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="relative pt-20 pb-12 overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-50 dark:opacity-30 pointer-events-none" />
          <Container className="relative text-center">
            <Badge variant="gradient">🇵🇰 Made in Pakistan</Badge>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-balance">
              <span className="gradient-text">Empowering Pakistan's Shopkeepers</span>
            </h1>
            <p className="mt-5 text-lg lg:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              We're on a mission to bring world-class technology to every shop in Pakistan — from Karachi to Khyber.
            </p>
          </Container>
        </section>

        {/* Story */}
        <section className="py-16 lg:py-20">
          <Container>
            <div className="max-w-3xl mx-auto">
              <Badge variant="accent">Our Story</Badge>
              <h2 className="mt-5 text-3xl sm:text-4xl font-extrabold">From a Lahori Bakery to All Pakistan</h2>
              <div className="mt-6 prose prose-lg dark:prose-invert text-slate-700 dark:text-slate-300 space-y-5">
                <p>
                  In 2024, our founder Abubakar visited his cousin's bakery in Lahore and saw something heartbreaking:
                  the owner spent 4 hours every night doing manual hisaab in a paper register. Stock was missing, khata
                  was lost, and profits were unclear.
                </p>
                <p>
                  "There must be a better way," he thought. He looked at existing solutions — they were either too
                  expensive (designed for big chains) or too complicated (built abroad, not in Urdu, no JazzCash support).
                </p>
                <p>
                  So he built <strong>Nafaa</strong> — a POS designed by Pakistanis, for Pakistanis. With Urdu support,
                  JazzCash/EasyPaisa integration, offline mode for unstable internet, and prices that make sense for
                  small shops.
                </p>
                <p>
                  Today, Nafaa powers <strong>5,000+ shops across Pakistan</strong> — bakeries, kiryana stores, mobile
                  shops, pharmacies, and more. We're just getting started.
                </p>
              </div>
            </div>
          </Container>
        </section>

        {/* Stats */}
        <section className="py-16 bg-slate-50 dark:bg-slate-950/50 border-y border-slate-200 dark:border-slate-800">
          <Container>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-4xl lg:text-5xl font-extrabold gradient-text">{s.value}</div>
                  <div className="mt-2 text-sm text-slate-600 dark:text-slate-400 font-semibold">{s.label}</div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Values */}
        <section className="py-16 lg:py-20">
          <Container>
            <div className="text-center max-w-3xl mx-auto mb-14">
              <Badge variant="brand">Our Values</Badge>
              <h2 className="mt-5 text-3xl sm:text-4xl font-extrabold">What We Believe In</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((v) => {
                const Icon = v.icon;
                return (
                  <div
                    key={v.title}
                    className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-center hover:shadow-xl transition-shadow"
                  >
                    <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-600 items-center justify-center shadow-lg">
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="mt-5 text-lg font-extrabold">{v.title}</h3>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{v.desc}</p>
                  </div>
                );
              })}
            </div>
          </Container>
        </section>

        {/* Mission */}
        <section className="py-16 lg:py-20 bg-slate-50 dark:bg-slate-950/50">
          <Container>
            <div className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-br from-brand-600 to-emerald-700 p-10 lg:p-16 text-white text-center">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-amber-300" />
              <h2 className="text-3xl lg:text-4xl font-extrabold">Our Mission</h2>
              <p className="mt-5 text-xl lg:text-2xl leading-relaxed">
                To empower every Pakistani shopkeeper with world-class retail technology that helps them save time,
                reduce errors, and grow their business — at a price they can afford.
              </p>
            </div>
          </Container>
        </section>

        <CTA />
      </main>
      <Footer />
    </>
  );
}
