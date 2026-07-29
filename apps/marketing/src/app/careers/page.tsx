import { Heart, Zap, GraduationCap, MapPin, Briefcase, ArrowRight, Globe } from 'lucide-react';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { FloatingWhatsApp } from '@/components/layout/Footer/FloatingWhatsApp';
import { CTA } from '@/components/home/CTA';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Badge } from '@/components/primitives/Badge';
import { GradientText } from '@/components/primitives/GradientText';
import { AuroraBackground } from '@/components/primitives/AuroraBackground';
import { GridBackground } from '@/components/primitives/GridBackground';
import { NoiseTexture } from '@/components/primitives/NoiseTexture';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Careers — build Pakistan\'s business OS with us',
  description: 'Join the team building the platform that powers Pakistani commerce. Engineering, design, sales, and support roles in Gujranwala, Lahore, and remote.',
  path: '/careers',
});

const perks = [
  { icon: Heart, title: 'Health coverage', desc: 'Full medical for you and your family' },
  { icon: Zap, title: 'Top equipment', desc: 'MacBook, monitor, and ergonomic setup' },
  { icon: GraduationCap, title: 'Learning budget', desc: 'Rs 100K yearly for courses and books' },
  { icon: Globe, title: 'Hybrid work', desc: 'Office, remote, or both — your choice' },
];

const jobs = [
  { title: 'Senior Full-Stack Engineer', team: 'Engineering', location: 'Gujranwala / Remote', type: 'Full-time' },
  { title: 'React Native Developer', team: 'Engineering', location: 'Lahore / Remote', type: 'Full-time' },
  { title: 'Product Designer', team: 'Design', location: 'Lahore', type: 'Full-time' },
  { title: 'Urdu Content Writer', team: 'Marketing', location: 'Remote', type: 'Part-time' },
  { title: 'Customer Success (Urdu)', team: 'Support', location: 'Gujranwala', type: 'Full-time' },
  { title: 'Sales Executive', team: 'Sales', location: 'Karachi / Lahore', type: 'Full-time' },
];

export default function CareersPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-16">
          <AuroraBackground variant="aurora" intensity="base" />
          <GridBackground className="mask-fade-bottom" />
          <NoiseTexture />
          <Container className="relative text-center">
            <Badge variant="aurora" size="md" pulse>💼 We\'re hiring</Badge>
            <h1 className="mt-8 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight max-w-4xl mx-auto text-balance">
              <GradientText variant="aurora">Build the platform Pakistan runs on</GradientText>
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-2xl mx-auto">
              Small team, massive impact. Your code will run in thousands of shops across 47 cities — and you\'ll meet the people whose lives it changes.
            </p>
          </Container>
        </section>

        <Section variant="default" spacing="md">
          <Container>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {perks.map((p) => {
                const Icon = p.icon;
                return (
                  <div key={p.title} className="rounded-2xl bg-white dark:bg-ink-800 p-6 text-center ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:-translate-y-1 hover:shadow-card-hover transition-all">
                    <div className="h-12 w-12 mx-auto rounded-xl bg-gradient-brand flex items-center justify-center text-white shadow-lg">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 font-display font-bold">{p.title}</h3>
                    <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">{p.desc}</p>
                  </div>
                );
              })}
            </div>
          </Container>
        </Section>

        <Section variant="subtle" spacing="lg">
          <Container size="md">
            <Eyebrow variant="brand">Open roles</Eyebrow>
            <h2 className="mt-4 font-display font-extrabold text-3xl lg:text-4xl mb-8">{jobs.length} positions open</h2>
            <div className="space-y-3">
              {jobs.map((j) => (
                <div key={j.title} className="flex items-center justify-between gap-4 flex-wrap rounded-2xl bg-white dark:bg-ink-800 p-6 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:ring-brand-400 transition-all">
                  <div>
                    <h3 className="font-display font-bold text-lg">{j.title}</h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                      <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{j.team}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{j.location}</span>
                      <Badge variant="brand" size="xs">{j.type}</Badge>
                    </div>
                  </div>
                  <a href={`mailto:careers@nafaa.pk?subject=Application: ${encodeURIComponent(j.title)}`}
                    className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-gradient-brand text-white font-bold text-sm shadow-brand-glow hover:-translate-y-0.5 transition-all">
                    Apply <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-sm text-ink-500">
              No role fits? Email <a href="mailto:careers@nafaa.pk" className="text-brand-600 font-bold hover:underline">careers@nafaa.pk</a> — exceptional people always get a reply.
            </p>
          </Container>
        </Section>

        <CTA />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
