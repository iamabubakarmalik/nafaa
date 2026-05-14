import { Database, Trash2, Mail, Smartphone, Clock, ArrowRight } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { CTA } from '@/components/home/CTA';
import { buildMetadata } from '@/lib/seo';
import Link from 'next/link';

export const metadata = buildMetadata({
  title: 'Data Deletion — Nafaa',
  description:
    'Delete specific data from your Nafaa account without removing your entire account.',
  path: '/data-deletion',
});

const deletableData = [
  'Individual customer records',
  'Specific product listings',
  'Sales transaction history',
  'Uploaded product images',
  'Shop logo & business profile',
];

const methods = [
  {
    icon: Smartphone,
    title: 'In-App Deletion',
    desc: 'Delete data instantly from within the Nafaa app.',
    steps: [
      'Customers → Select → Delete',
      'Products → Select → Delete',
      'Sales → Void transaction',
      'Settings → Remove files',
    ],
  },
  {
    icon: Mail,
    title: 'Email Request',
    desc: 'Request deletion by contacting our team.',
    steps: [
      'Email privacy@nafaa.pk',
      'Subject: Data Deletion Request',
      'Include registered email',
      'Specify data to delete',
    ],
  },
];

export default function DataDeletionPage() {
  return (
    <>
      <Header />

      <main>
        {/* Hero */}
        <section className="relative pt-20 pb-12 overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-50 dark:opacity-30 pointer-events-none" />

          <Container className="relative text-center">
            <Badge variant="gradient">Data Control</Badge>

            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold">
              <span className="gradient-text">Delete Specific Data</span>
            </h1>

            <p className="mt-5 text-lg lg:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              You don’t have to delete your entire account. Easily remove specific
              data from your Nafaa account anytime.
            </p>
          </Container>
        </section>

        {/* What can be deleted */}
        <section className="py-16">
          <Container>
            <div className="text-center max-w-3xl mx-auto mb-12">
              <Badge variant="brand">Flexible Control</Badge>
              <h2 className="mt-5 text-3xl sm:text-4xl font-extrabold">
                What You Can Delete
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {deletableData.map((item) => (
                <div
                  key={item}
                  className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 hover:shadow-xl transition"
                >
                  <Trash2 className="text-red-500 mb-3" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Methods */}
        <section className="py-16 bg-slate-50 dark:bg-slate-950/50 border-y border-slate-200 dark:border-slate-800">
          <Container>
            <div className="text-center max-w-3xl mx-auto mb-12">
              <Badge variant="accent">Two Ways</Badge>
              <h2 className="mt-5 text-3xl sm:text-4xl font-extrabold">
                How to Delete Data
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {methods.map((m) => {
                const Icon = m.icon;

                return (
                  <div
                    key={m.title}
                    className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 hover:shadow-xl transition"
                  >
                    <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-600 items-center justify-center shadow-lg">
                      <Icon className="h-7 w-7 text-white" />
                    </div>

                    <h3 className="mt-5 text-xl font-extrabold">
                      {m.title}
                    </h3>

                    <p className="mt-2 text-slate-600 dark:text-slate-400">
                      {m.desc}
                    </p>

                    <ul className="mt-5 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                      {m.steps.map((step) => (
                        <li key={step}>• {step}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </Container>
        </section>

        {/* Timeline */}
        <section className="py-16">
          <Container>
            <div className="max-w-3xl mx-auto text-center">
              <Badge variant="brand">Timeline</Badge>

              <h2 className="mt-5 text-3xl sm:text-4xl font-extrabold">
                What Happens Next
              </h2>

              <div className="mt-8 space-y-4 text-slate-600 dark:text-slate-400">
                <p>✔ Request confirmation within 24 hours</p>
                <p>✔ Data deletion completed within 14 days</p>
                <p>✔ Your account stays active</p>
              </div>
            </div>
          </Container>
        </section>

        {/* Switch to account deletion */}
        <section className="py-16 bg-slate-50 dark:bg-slate-950/50">
          <Container>
            <div className="max-w-3xl mx-auto text-center">
              <Badge variant="accent">Need More?</Badge>

              <h2 className="mt-5 text-3xl sm:text-4xl font-extrabold">
                Want to Delete Everything?
              </h2>

              <p className="mt-5 text-slate-600 dark:text-slate-400">
                If you want to completely remove your account and all data,
                visit the full account deletion page.
              </p>

              <Link
                href="/account-deletion"
                className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition"
              >
                Go to Account Deletion <ArrowRight size={18} />
              </Link>
            </div>
          </Container>
        </section>

        <CTA />
      </main>

      <Footer />
    </>
  );
}