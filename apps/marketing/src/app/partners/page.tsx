import { Handshake, Award, TrendingUp, Users } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CTA } from '@/components/home/CTA';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Partner Program — Earn 30% Commission',
  description: 'Join Nafaa Partner Program. Earn 30% recurring commission. Help Pakistani shops while building your business.',
  path: '/partners',
});

const benefits = [
  { icon: TrendingUp, title: '30% Recurring', desc: 'Earn 30% commission on every customer, every month — forever' },
  { icon: Award, title: 'Top Tier Tools', desc: 'Marketing materials, dashboards, real-time analytics' },
  { icon: Users, title: 'Dedicated Support', desc: 'Personal partner manager + priority support' },
  { icon: Handshake, title: 'Co-Marketing', desc: 'Joint webinars, case studies, content collaboration' },
];

export default function PartnersPage() {
  return (
    <>
      <Header />
      <main>
        <section className="relative pt-20 pb-12 overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-50 dark:opacity-30 pointer-events-none" />
          <Container className="relative text-center">
            <Badge variant="gradient">🤝 Partner Program</Badge>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
              <span className="gradient-text">Earn 30% Recurring Commission</span>
            </h1>
            <p className="mt-5 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Help Pakistani shopkeepers grow — and grow your own business in the process
            </p>
            <Button size="xl" href="mailto:partners@nafaa.pk" className="mt-8">
              Become a Partner
            </Button>
          </Container>
        </section>

        <section className="py-12 lg:py-20">
          <Container>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((b) => {
                const Icon = b.icon;
                return (
                  <div key={b.title} className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 hover:shadow-xl transition-all">
                    <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-600 items-center justify-center shadow-lg">
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="mt-5 text-lg font-extrabold">{b.title}</h3>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{b.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-16 max-w-3xl mx-auto rounded-3xl bg-gradient-to-br from-brand-600 to-emerald-700 text-white p-10 lg:p-14 text-center">
              <h2 className="text-3xl lg:text-4xl font-extrabold">Ready to Partner with Us?</h2>
              <p className="mt-5 text-lg text-white/90">
                Whether you're a consultant, agency, accountant, or business mentor — we'd love to work with you.
              </p>
              <Button size="lg" className="mt-8 !bg-white !text-brand-700 hover:!bg-slate-100" href="mailto:partners@nafaa.pk">
                Get in Touch
              </Button>
            </div>
          </Container>
        </section>

        <CTA />
      </main>
      <Footer />
    </>
  );
}
