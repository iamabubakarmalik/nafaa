import Link from 'next/link';
import { Search, Book, Video, MessageCircle, Mail, ArrowRight } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Help Center — Get Support & Learn',
  description: 'Browse guides, tutorials, and FAQs. Get instant help from our support team via WhatsApp, email, or phone.',
  path: '/help',
});

const categories = [
  {
    icon: '🚀',
    title: 'Getting Started',
    desc: 'Setup, first sale, basics',
    articles: [
      'How to create your account',
      'Adding your first products',
      'Making your first sale',
      'Setting up your shop profile',
    ],
  },
  {
    icon: '🛒',
    title: 'POS & Sales',
    desc: 'Daily counter operations',
    articles: [
      'How to use the POS',
      'Processing returns',
      'Applying discounts',
      'Multi-payment methods',
    ],
  },
  {
    icon: '📦',
    title: 'Inventory',
    desc: 'Stock & products',
    articles: [
      'Bulk import products',
      'Stock adjustments',
      'Low stock alerts',
      'Multi-shop transfers',
    ],
  },
  {
    icon: '👥',
    title: 'Customers & Khata',
    desc: 'Customer management',
    articles: [
      'Adding customers',
      'Digital khata book',
      'WhatsApp reminders',
      'Loyalty points setup',
    ],
  },
  {
    icon: '💰',
    title: 'Billing & Plans',
    desc: 'Subscription & payments',
    articles: [
      'Choosing the right plan',
      'Payment methods',
      'Upgrading/downgrading',
      'Refunds & cancellation',
    ],
  },
  {
    icon: '⚙️',
    title: 'Settings & Team',
    desc: 'Configuration',
    articles: [
      'Adding team members',
      'Role permissions',
      'Tax setup',
      'Receipt customization',
    ],
  },
];

export default function HelpPage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero with search */}
        <section className="relative pt-20 pb-12 overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-50 dark:opacity-30 pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-96 w-[800px] bg-brand-500/20 rounded-full blur-3xl" />
          <Container className="relative text-center">
            <Badge variant="gradient">💬 Help Center</Badge>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
              <span className="gradient-text">How can we help?</span>
            </h1>
            <p className="mt-5 text-lg lg:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Browse guides, watch tutorials, or contact our support team
            </p>

            <div className="mt-8 max-w-2xl mx-auto relative">
              <Search className="h-5 w-5 text-slate-400 absolute left-5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search for guides, tutorials, FAQs..."
                className="h-14 w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 pl-14 pr-5 text-base shadow-lg focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </Container>
        </section>

        {/* Quick contact options */}
        <section className="py-8">
          <Container>
            <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
              <a
                href="https://wa.me/923001234567"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl bg-gradient-to-br from-green-500 to-green-600 text-white p-5 hover:shadow-xl transition-all"
              >
                <MessageCircle className="h-7 w-7 mb-3" />
                <div className="font-bold">WhatsApp</div>
                <div className="text-sm text-white/80">Instant support</div>
              </a>
              <a
                href="mailto:support@nafaa.pk"
                className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white p-5 hover:shadow-xl transition-all"
              >
                <Mail className="h-7 w-7 mb-3" />
                <div className="font-bold">Email</div>
                <div className="text-sm text-white/80">support@nafaa.pk</div>
              </a>
              <Link
                href="/contact"
                className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 text-white p-5 hover:shadow-xl transition-all"
              >
                <Video className="h-7 w-7 mb-3" />
                <div className="font-bold">Book Demo</div>
                <div className="text-sm text-white/80">1-on-1 walkthrough</div>
              </Link>
            </div>
          </Container>
        </section>

        {/* Categories */}
        <section className="py-12 lg:py-16">
          <Container>
            <div className="text-center mb-12">
              <Book className="h-10 w-10 mx-auto text-brand-600 mb-3" />
              <h2 className="text-3xl font-extrabold">Browse by Category</h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((cat) => (
                <div
                  key={cat.title}
                  className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-xl transition-all"
                >
                  <div className="text-4xl mb-3">{cat.icon}</div>
                  <h3 className="font-extrabold text-lg">{cat.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{cat.desc}</p>

                  <ul className="mt-5 space-y-2.5">
                    {cat.articles.map((a) => (
                      <li key={a}>
                        <a
                          href="#"
                          className="text-sm text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 inline-flex items-center gap-1.5 group"
                        >
                          <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          {a}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Still need help */}
        <section className="py-16 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800">
          <Container>
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl lg:text-4xl font-extrabold">Still need help?</h2>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
                Our support team is available 24/7 for Pro and Enterprise customers
              </p>
              <div className="mt-8 flex flex-wrap gap-3 justify-center">
                <Button size="lg" href="/contact">
                  Contact Support
                </Button>
                <Button size="lg" variant="secondary" href="/blog">
                  Read Blog
                </Button>
              </div>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
