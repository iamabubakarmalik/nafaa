import { Lock, Shield, Database, Eye, Server, FileCheck } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { CTA } from '@/components/home/CTA';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Security — Bank-Grade Protection',
  description: 'Learn how Nafaa protects your business data with bank-grade encryption, secure infrastructure, and best practices.',
  path: '/security',
});

const features = [
  {
    icon: Lock,
    title: 'SSL/TLS Encryption',
    desc: 'All data transmitted between your device and our servers is encrypted using industry-standard 256-bit SSL/TLS.',
  },
  {
    icon: Database,
    title: 'Encrypted Database',
    desc: 'Your data is encrypted at rest using AES-256 encryption. Even if accessed, the data is unreadable.',
  },
  {
    icon: Shield,
    title: 'Secure Authentication',
    desc: 'JWT tokens, bcrypt password hashing, optional 2FA, session management, and brute-force protection.',
  },
  {
    icon: Server,
    title: 'Reliable Infrastructure',
    desc: 'Hosted on enterprise-grade cloud infrastructure with 99.9% uptime SLA, redundancy, and DDoS protection.',
  },
  {
    icon: Eye,
    title: 'Audit Logs',
    desc: 'Every action is logged with user, timestamp, and IP. Full audit trail for accountability.',
  },
  {
    icon: FileCheck,
    title: 'Daily Backups',
    desc: 'Automated daily backups with point-in-time recovery. Manual export available anytime.',
  },
];

export default function SecurityPage() {
  return (
    <>
      <Header />
      <main>
        <section className="relative pt-20 pb-12 overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-50 dark:opacity-30 pointer-events-none" />
          <Container className="relative text-center">
            <Badge variant="brand">🔒 Security First</Badge>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
              <span className="gradient-text">Your Data, Fortified</span>
            </h1>
            <p className="mt-5 text-lg lg:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Bank-grade security. Built from the ground up to protect Pakistani businesses.
            </p>
          </Container>
        </section>

        <section className="py-12 lg:py-20">
          <Container>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6"
                  >
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-600 flex items-center justify-center shadow-lg">
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="mt-5 text-lg font-extrabold">{f.title}</h3>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{f.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-16 max-w-3xl mx-auto rounded-3xl bg-gradient-to-br from-slate-900 to-slate-950 text-white p-10 lg:p-14">
              <h2 className="text-2xl lg:text-3xl font-extrabold">Report a Security Issue</h2>
              <p className="mt-4 text-slate-300 leading-relaxed">
                Found a vulnerability? We appreciate responsible disclosure. Please email{' '}
                <a href="mailto:security@nafaa.pk" className="text-brand-400 font-bold underline">
                  security@nafaa.pk
                </a>{' '}
                with details. We respond within 24 hours and reward valid reports.
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
