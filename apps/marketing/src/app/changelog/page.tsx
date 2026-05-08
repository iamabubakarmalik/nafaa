import { Sparkles, Bug, Zap, Plus } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Changelog — What\'s New in Nafaa',
  description: 'See what\'s new in Nafaa. Latest features, improvements, and bug fixes.',
  path: '/changelog',
});

const updates = [
  {
    version: 'v2.5.0',
    date: 'May 5, 2026',
    type: 'major',
    title: 'WhatsApp Receipts & Marketing Site Launch',
    items: [
      { type: 'new', text: 'Beautiful new marketing website at nafaa.pk' },
      { type: 'new', text: 'WhatsApp Receipts — send branded receipts directly to customers' },
      { type: 'new', text: 'Multi-language support: English & Urdu' },
      { type: 'improvement', text: 'POS now 40% faster on slow connections' },
      { type: 'fix', text: 'Fixed issue with discount codes on multi-item bills' },
    ],
  },
  {
    version: 'v2.4.0',
    date: 'April 15, 2026',
    type: 'major',
    title: 'Admin Notifications & Bulk Actions',
    items: [
      { type: 'new', text: 'Real-time admin notification bell with sound alerts' },
      { type: 'new', text: 'Bulk operations — suspend/activate multiple tenants at once' },
      { type: 'new', text: 'Email + SMS integration with Resend & local providers' },
      { type: 'improvement', text: 'Tenant dashboard loads 2x faster' },
    ],
  },
  {
    version: 'v2.3.0',
    date: 'March 20, 2026',
    type: 'major',
    title: 'Subscription Management Suite',
    items: [
      { type: 'new', text: 'Stripe integration for international payments' },
      { type: 'new', text: 'Manual plan assignment by admin' },
      { type: 'new', text: 'Referral system with auto-rewards' },
      { type: 'new', text: 'Plan usage limits with feature gating' },
    ],
  },
];

const typeConfig = {
  new: { icon: Plus, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400', label: 'NEW' },
  improvement: { icon: Zap, color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400', label: 'IMPROVED' },
  fix: { icon: Bug, color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400', label: 'FIXED' },
};

export default function ChangelogPage() {
  return (
    <>
      <Header />
      <main>
        <section className="relative pt-20 pb-12 overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-50 dark:opacity-30 pointer-events-none" />
          <Container className="relative text-center">
            <Badge variant="gradient">🚀 Product Updates</Badge>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
              <span className="gradient-text">Changelog</span>
            </h1>
            <p className="mt-5 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              New features, improvements, and bug fixes — every week
            </p>
          </Container>
        </section>

        <section className="py-12 lg:py-16">
          <Container className="max-w-3xl">
            <div className="space-y-12">
              {updates.map((u) => (
                <div key={u.version} className="relative">
                  <div className="flex items-center gap-3 mb-5">
                    <Badge variant="brand">{u.version}</Badge>
                    <span className="text-sm text-slate-500">{u.date}</span>
                  </div>
                  <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-7">
                    <div className="flex items-center gap-2.5 mb-5">
                      <Sparkles className="h-5 w-5 text-brand-600" />
                      <h2 className="text-xl font-extrabold">{u.title}</h2>
                    </div>
                    <ul className="space-y-3">
                      {u.items.map((it, i) => {
                        const cfg = typeConfig[it.type as keyof typeof typeConfig];
                        const Icon = cfg.icon;
                        return (
                          <li key={i} className="flex items-start gap-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold flex-shrink-0 ${cfg.color}`}>
                              <Icon className="h-3 w-3" />
                              {cfg.label}
                            </span>
                            <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{it.text}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
