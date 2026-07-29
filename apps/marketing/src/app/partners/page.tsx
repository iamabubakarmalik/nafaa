import { Handshake, TrendingUp, Award, Users, ArrowRight } from 'lucide-react';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { FloatingWhatsApp } from '@/components/layout/Footer/FloatingWhatsApp';
import { CTA } from '@/components/home/CTA';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Badge } from '@/components/primitives/Badge';
import { Button } from '@/components/primitives/Button';
import { GradientText } from '@/components/primitives/GradientText';
import { AuroraBackground } from '@/components/primitives/AuroraBackground';
import { GridBackground } from '@/components/primitives/GridBackground';
import { NoiseTexture } from '@/components/primitives/NoiseTexture';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Partner program — earn 30% recurring commission',
  description: 'Join the Nafaa partner program. Accountants, consultants, and agencies earn 30% recurring commission helping Pakistani businesses go digital.',
  path: '/partners',
});

const benefits = [
  { icon: TrendingUp, title: '30% recurring, forever', desc: 'Earn thirty percent of every payment from every customer you refer — every month, for as long as they stay.' },
  { icon: Award, title: 'Full partner toolkit', desc: 'Marketing materials, demo accounts, co-branded landing pages, and sales training included.' },
  { icon: Users, title: 'Dedicated partner manager', desc: 'A named human who answers your calls, helps close deals, and resolves anything fast.' },
  { icon: Handshake, title: 'Co-marketing', desc: 'Joint webinars, case studies, and events. We promote you while you promote us.' },
];

const ideal = ['Accountants with shop-owner clients', 'Business consultants and advisors', 'IT shops and computer stores', 'Industry associations and trade bodies', 'YouTubers and content creators', 'Banking relationship managers'];

export default function PartnersPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-16">
          <AuroraBackground variant="aurora" intensity="base" />
          <GridBackground className="mask-fade-bottom" />
          <NoiseTexture />
          <Container className="relative text-center">
            <Badge variant="aurora" size="md" pulse>🤝 Partner program</Badge>
            <h1 className="mt-8 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight max-w-4xl mx-auto text-balance">
              <GradientText variant="aurora">Earn 30% forever, helping Pakistan digitize</GradientText>
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-2xl mx-auto">
              You know the shopkeepers. We built the platform. Together we both grow.
            </p>
            <div className="mt-10">
              <Button size="xl" variant="aurora" href="mailto:partnerships@nafaa.pk?subject=Partner%20Application" rightIcon={<ArrowRight className="h-5 w-5" />}>
                Become a partner
              </Button>
            </div>
          </Container>
        </section>

        <Section variant="default" spacing="lg">
          <Container>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {benefits.map((b) => {
                const Icon = b.icon;
                return (
                  <div key={b.title} className="rounded-2xl bg-white dark:bg-ink-800 p-6 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:-translate-y-1 hover:shadow-card-hover transition-all">
                    <div className="h-12 w-12 rounded-xl bg-gradient-aurora flex items-center justify-center text-white shadow-lg">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 font-display font-bold">{b.title}</h3>
                    <p className="mt-2 text-sm text-ink-600 dark:text-ink-300 leading-relaxed">{b.desc}</p>
                  </div>
                );
              })}
            </div>
          </Container>
        </Section>

        <Section variant="subtle" spacing="lg">
          <Container size="md">
            <Eyebrow variant="brand">Who thrives here</Eyebrow>
            <h2 className="mt-4 font-display font-extrabold text-3xl lg:text-4xl mb-8">Perfect partners</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {ideal.map((i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-white dark:bg-ink-800 p-4 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60">
                  <span className="h-2 w-2 rounded-full bg-gradient-aurora shrink-0" />
                  <span className="font-semibold text-sm">{i}</span>
                </div>
              ))}
            </div>
            <div className="mt-10 rounded-3xl bg-gradient-to-br from-aurora-purple to-aurora-pink p-10 text-white text-center shadow-aurora-glow">
              <h3 className="font-display font-extrabold text-2xl lg:text-3xl">Ready to earn together?</h3>
              <p className="mt-3 text-white/90 max-w-xl mx-auto">Email us with a short intro about your network. We respond within one business day with onboarding details.</p>
              <Button className="mt-6 !bg-white !text-aurora-purple hover:!bg-white/95" href="mailto:partnerships@nafaa.pk?subject=Partner%20Application">
                partnerships@nafaa.pk
              </Button>
            </div>
          </Container>
        </Section>

        <CTA />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
