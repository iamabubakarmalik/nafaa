import { Trash2, Mail, ShieldCheck, Clock, AlertTriangle } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { CTA } from '@/components/home/CTA';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Account Deletion — Nafaa',
  description:
    'Request deletion of your Nafaa account and all associated data securely and easily.',
  path: '/account-deletion',
});

const steps = [
  {
    icon: Mail,
    title: 'Send Email Request',
    desc: 'Email us at privacy@nafaa.pk with subject "Account Deletion Request".',
  },
  {
    icon: ShieldCheck,
    title: 'Verify Identity',
    desc: 'We may confirm your identity to protect your data.',
  },
  {
    icon: Clock,
    title: 'Processing',
    desc: 'Your request is processed within 30 days.',
  },
];

const deletedData = [
  'Account information (name, email, phone)',
  'Shop data, products, customers',
  'Sales records, reports, analytics',
  'Uploaded images and files',
  'Login & authentication data',
];

const retainedData = [
  'Aggregated anonymous analytics',
  'Financial records (kept for 7 years as per law)',
];

export default function AccountDeletionPage() {
  return (
    <>
      <Header />

      <main>
        {/* Hero */}
        <section className="relative pt-20 pb-12 overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-50 dark:opacity-30 pointer-events-none" />
          <Container className="relative text-center">
            <Badge variant="gradient">Account Control</Badge>

            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
              <span className="gradient-text">Delete Your Account</span>
            </h1>

            <p className="mt-5 text-lg lg:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              You’re always in control. Request deletion of your Nafaa account and
              all associated data anytime — securely and transparently.
            </p>
          </Container>
        </section>

        {/* Steps */}
        <section className="py-16">
          <Container>
            <div className="text-center max-w-3xl mx-auto mb-12">
              <Badge variant="brand">Simple Process</Badge>
              <h2 className="mt-5 text-3xl sm:text-4xl font-extrabold">
                How It Works
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {steps.map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.title}
                    className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-center hover:shadow-xl transition"
                  >
                    <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 items-center justify-center shadow-lg">
                      <Icon className="h-7 w-7 text-white" />
                    </div>

                    <h3 className="mt-5 text-lg font-extrabold">
                      {s.title}
                    </h3>

                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                      {s.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </Container>
        </section>

        {/* What gets deleted */}
        <section className="py-16 bg-slate-50 dark:bg-slate-950/50 border-y border-slate-200 dark:border-slate-800">
          <Container>
            <div className="grid lg:grid-cols-2 gap-10">
              {/* Deleted */}
              <div className="rounded-3xl bg-white dark:bg-slate-900 p-8 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <Trash2 className="text-red-500" />
                  <h3 className="text-xl font-extrabold">
                    What Gets Deleted
                  </h3>
                </div>

                <ul className="mt-6 space-y-3 text-slate-600 dark:text-slate-400">
                  {deletedData.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>

              {/* Retained */}
              <div className="rounded-3xl bg-white dark:bg-slate-900 p-8 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="text-amber-500" />
                  <h3 className="text-xl font-extrabold">
                    What We Retain
                  </h3>
                </div>

                <ul className="mt-6 space-y-3 text-slate-600 dark:text-slate-400">
                  {retainedData.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Container>
        </section>

        {/* Contact */}
        <section className="py-16">
          <Container>
            <div className="max-w-3xl mx-auto text-center">
              <Badge variant="accent">Need Help?</Badge>

              <h2 className="mt-5 text-3xl sm:text-4xl font-extrabold">
                Contact Us
              </h2>

              <p className="mt-5 text-slate-600 dark:text-slate-400">
                If you have any questions or want to request deletion, reach out to us anytime.
              </p>

              <div className="mt-6 space-y-2 text-lg">
                <p>
                  📧{' '}
                  <a
                    href="mailto:privacy@nafaa.pk"
                    className="text-brand-600 font-semibold"
                  >
                    privacy@nafaa.pk
                  </a>
                </p>

                <p>
                  🛠 Support:{' '}
                  <a
                    href="mailto:support@nafaa.pk"
                    className="text-brand-600 font-semibold"
                  >
                    support@nafaa.pk
                  </a>
                </p>
              </div>
            </div>
          </Container>
        </section>

        {/* CTA */}
        <CTA />
      </main>

      <Footer />
    </>
  );
}