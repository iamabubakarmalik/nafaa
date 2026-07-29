import Link from 'next/link';
import { GraduationCap, PlayCircle, Clock, Award, ArrowRight, Users } from 'lucide-react';
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
  title: 'Nafaa Academy — free business courses in Urdu and English',
  description: 'Free online courses for Pakistani business owners: POS basics, digital marketing, growing a kiryana store, and more. Certificates included.',
  path: '/academy',
});

const courses = [
  { emoji: '🚀', title: 'POS Basics in Urdu', duration: '2 hours', students: '3,240', level: 'Beginner', color: '#12b76a' },
  { emoji: '📈', title: 'How to Grow Your Kiryana Store', duration: '3 hours', students: '2,890', level: 'Beginner', color: '#0284c7' },
  { emoji: '📱', title: 'Digital Marketing for Small Shops', duration: '4 hours', students: '4,150', level: 'Intermediate', color: '#8b5cf6' },
  { emoji: '💰', title: 'FBR Compliance Made Simple', duration: '1.5 hours', students: '5,670', level: 'Beginner', color: '#01411c' },
  { emoji: '🍰', title: 'Running a Modern Bakery', duration: '3.5 hours', students: '1,820', level: 'Intermediate', color: '#f59e0b' },
  { emoji: '💊', title: 'Pharmacy Management Essentials', duration: '4 hours', students: '2,340', level: 'Intermediate', color: '#0891b2' },
  { emoji: '🛒', title: 'Selling on Daraz & Foodpanda', duration: '2.5 hours', students: '3,890', level: 'Beginner', color: '#f97316' },
  { emoji: '📊', title: 'Reading Business Reports', duration: '2 hours', students: '1,560', level: 'Advanced', color: '#ec4899' },
];

export default function AcademyPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-14">
          <AuroraBackground variant="aurora" intensity="base" />
          <GridBackground className="mask-fade-bottom" />
          <NoiseTexture />
          <Container className="relative text-center">
            <Badge variant="aurora" size="md" pulse>
              <GraduationCap className="h-3.5 w-3.5" /> 100% free, forever
            </Badge>
            <h1 className="mt-8 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight max-w-4xl mx-auto text-balance">
              <GradientText variant="aurora">Nafaa Academy — learn to run a modern business</GradientText>
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-2xl mx-auto">
              Free courses in Urdu and English, taught by real Pakistani business owners and industry experts. Certificates included.
            </p>
          </Container>
        </section>

        <Section variant="default" spacing="lg">
          <Container>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {courses.map((c, i) => (
                <div key={i} className="group rounded-2xl bg-white dark:bg-ink-800 overflow-hidden ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:-translate-y-1 hover:shadow-card-hover transition-all">
                  <div className="relative aspect-video overflow-hidden" style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}dd)` }}>
                    <div className="absolute inset-0 flex items-center justify-center text-6xl group-hover:scale-110 transition-transform">
                      {c.emoji}
                    </div>
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md bg-black/40 backdrop-blur-md text-white text-[10px] font-bold">
                      <PlayCircle className="h-3 w-3" /> {c.duration}
                    </div>
                    <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-white/25 backdrop-blur-md text-white text-[10px] font-bold">
                      {c.level}
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-display font-bold text-lg leading-tight group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                      {c.title}
                    </h3>
                    <div className="mt-3 flex items-center gap-3 text-xs text-ink-500">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{c.students}</span>
                      <span className="flex items-center gap-1"><Award className="h-3 w-3" />Certificate</span>
                    </div>
                    <Link href="#" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 opacity-0 group-hover:opacity-100 transition-all">
                      Start course <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 max-w-3xl mx-auto text-center rounded-3xl bg-gradient-to-br from-aurora-purple via-aurora-pink to-sunset p-10 text-white shadow-aurora-glow">
              <GraduationCap className="h-12 w-12 mx-auto mb-4" />
              <h2 className="font-display font-extrabold text-2xl lg:text-3xl">Become a certified Nafaa expert</h2>
              <p className="mt-3 text-white/90">Complete 5 courses to earn the Nafaa Business Owner Certificate — recognized by Pakistani employers and business associations.</p>
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
