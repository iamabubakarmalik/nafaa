import { Heart, Zap, Users, GraduationCap, MapPin, Briefcase } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CTA } from '@/components/home/CTA';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Careers — Join Pakistan\'s Fastest Growing Retail Tech',
  description: 'Build the future of Pakistani retail with us. Open positions for engineers, designers, sales, and support roles.',
  path: '/careers',
});

const benefits = [
  { icon: Heart, title: 'Health Insurance', desc: 'Full medical coverage for you and family' },
  { icon: Zap, title: 'Latest Equipment', desc: 'MacBook Pro, monitor, and ergonomic setup' },
  { icon: GraduationCap, title: 'Learning Budget', desc: 'Rs 50,000/year for courses and conferences' },
  { icon: Users, title: 'Flexible Hours', desc: 'Hybrid work — office or remote, your choice' },
];

const jobs = [
  { title: 'Senior Backend Engineer', team: 'Engineering', location: 'Lahore / Remote', type: 'Full-time' },
  { title: 'Mobile Developer (React Native)', team: 'Engineering', location: 'Lahore / Remote', type: 'Full-time' },
  { title: 'Product Designer', team: 'Design', location: 'Lahore', type: 'Full-time' },
  { title: 'Customer Success Manager', team: 'Customer Success', location: 'Karachi', type: 'Full-time' },
  { title: 'Sales Executive', team: 'Sales', location: 'Multiple Cities', type: 'Full-time' },
  { title: 'Content Writer (Urdu/English)', team: 'Marketing', location: 'Remote', type: 'Part-time' },
];

export default function CareersPage() {
  return (
    <>
      <Header />
      <main>
        <section className="relative pt-20 pb-12 overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-50 dark:opacity-30 pointer-events-none" />
          <Container className="relative text-center">
            <Badge variant="gradient">💼 We're Hiring</Badge>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
              <span className="gradient-text">Build the Future of Pakistani Retail</span>
            </h1>
            <p className="mt-5 text-lg lg:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Join a team that's empowering 5,000+ shops across Pakistan with world-class technology
            </p>
          </Container>
        </section>

        {/* Benefits */}
        <section className="py-12 lg:py-20">
          <Container>
            <div className="text-center mb-12">
              <Badge variant="brand">✨ Perks & Benefits</Badge>
              <h2 className="mt-5 text-3xl sm:text-4xl font-extrabold">Why Work at Nafaa?</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((b) => {
                const Icon = b.icon;
                return (
                  <div
                    key={b.title}
                    className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-center hover:shadow-xl transition-all"
                  >
                    <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-600 items-center justify-center shadow-lg">
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="mt-5 font-extrabold">{b.title}</h3>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{b.desc}</p>
                  </div>
                );
              })}
            </div>
          </Container>
        </section>

        {/* Open positions */}
        <section className="py-12 lg:py-20 bg-slate-50 dark:bg-slate-950/50">
          <Container>
            <div className="text-center mb-12">
              <Badge variant="accent">📢 Open Positions</Badge>
              <h2 className="mt-5 text-3xl sm:text-4xl font-extrabold">Available Roles</h2>
              <p className="mt-3 text-slate-600 dark:text-slate-400">{jobs.length} positions open</p>
            </div>
            <div className="max-w-3xl mx-auto space-y-3">
              {jobs.map((j) => (
                <div
                  key={j.title}
                  className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 hover:border-brand-300 dark:hover:border-brand-700 transition-all"
                >
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <h3 className="font-extrabold text-lg">{j.title}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {j.team}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {j.location}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-bold">
                          {j.type}
                        </span>
                      </div>
                    </div>
                    <Button size="sm" href="mailto:careers@nafaa.pk">
                      Apply Now
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center text-sm text-slate-500">
              Don't see a role that fits? Email us at{' '}
              <a href="mailto:careers@nafaa.pk" className="text-brand-600 font-bold">careers@nafaa.pk</a>
            </div>
          </Container>
        </section>

        <CTA />
      </main>
      <Footer />
    </>
  );
}
