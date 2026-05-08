import {
  Zap, Package, BookOpen, BarChart3, Building2, Wifi, ScanLine,
  Users, ShieldCheck, Receipt, CreditCard, RotateCcw, Award, Percent,
  Wallet, AlertTriangle, ArrowRightLeft, FileText, Smartphone, Bell,
  Database, Globe, Lock, Sparkles,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CTA } from '@/components/home/CTA';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Features — Complete POS & Retail Management',
  description:
    'Explore all features of Nafaa: POS, inventory, khata, reports, multi-shop, loyalty, discounts, returns, and more. Built for Pakistani businesses.',
  path: '/features',
});

const groups = [
  {
    title: 'Sales & POS',
    color: 'from-amber-400 to-orange-500',
    features: [
      { icon: Zap, title: 'Lightning POS', desc: 'Process sales in under 5 seconds with barcode scan' },
      { icon: ScanLine, title: 'Barcode Scanner', desc: 'Use phone camera or USB scanner — both work' },
      { icon: Receipt, title: 'Smart Receipts', desc: 'Print, WhatsApp, SMS, or email receipts instantly' },
      { icon: CreditCard, title: 'Multi Payment', desc: 'Cash, Card, JazzCash, EasyPaisa, Bank — all supported' },
      { icon: RotateCcw, title: 'Returns & Refunds', desc: 'Process returns easily with full refund tracking' },
      { icon: Percent, title: 'Discounts & Coupons', desc: 'Promo codes, flat discounts, customer-specific deals' },
    ],
  },
  {
    title: 'Inventory Management',
    color: 'from-violet-500 to-purple-600',
    features: [
      { icon: Package, title: 'Real-Time Stock', desc: 'Auto-update stock with every sale and purchase' },
      { icon: AlertTriangle, title: 'Low Stock Alerts', desc: 'Never run out — get notified before stock runs out' },
      { icon: ArrowRightLeft, title: 'Stock Transfer', desc: 'Move stock between branches with full audit trail' },
      { icon: FileText, title: 'Stock Adjustment', desc: 'Handle damages, losses, and corrections smoothly' },
      { icon: Database, title: 'Categories & SKU', desc: 'Organize with categories, SKUs, and custom fields' },
      { icon: Sparkles, title: 'Bulk Import', desc: 'Upload 1000s of products via Excel in seconds' },
    ],
  },
  {
    title: 'Customer & Loyalty',
    color: 'from-blue-500 to-cyan-600',
    features: [
      { icon: BookOpen, title: 'Digital Khata', desc: 'Replace paper khata — track udhaar in seconds' },
      { icon: Users, title: 'Customer Profiles', desc: 'Full purchase history, preferences, contact info' },
      { icon: Award, title: 'Loyalty Points', desc: 'Reward repeat customers with auto-earned points' },
      { icon: Smartphone, title: 'WhatsApp Reminders', desc: 'Auto-send payment reminders to udhaar customers' },
      { icon: Bell, title: 'SMS Notifications', desc: 'Sale receipts, promotions, and alerts via SMS' },
    ],
  },
  {
    title: 'Reports & Analytics',
    color: 'from-emerald-500 to-teal-600',
    features: [
      { icon: BarChart3, title: 'Live Dashboard', desc: 'See sales, profit, and trends in real-time' },
      { icon: FileText, title: 'Profit Reports', desc: 'Per-product profit margins and category breakdowns' },
      { icon: Database, title: 'Excel/PDF Export', desc: 'Download any report in Excel or PDF format' },
      { icon: ShieldCheck, title: 'Audit Trail', desc: 'Every action logged for accountability' },
    ],
  },
  {
    title: 'Multi-Shop & Team',
    color: 'from-rose-500 to-pink-600',
    features: [
      { icon: Building2, title: 'Multi-Shop', desc: 'Manage 1, 5, or 50+ branches from one dashboard' },
      { icon: Users, title: 'Team Roles', desc: 'Owner, Manager, Cashier, Staff — granular permissions' },
      { icon: Lock, title: 'Role-Based Access', desc: 'Control who sees what with detailed permissions' },
      { icon: Wallet, title: 'Cash Register', desc: 'Daily cash open/close with reconciliation' },
    ],
  },
  {
    title: 'Reliability & Speed',
    color: 'from-indigo-500 to-blue-600',
    features: [
      { icon: Wifi, title: 'Offline Mode', desc: 'Works without internet — auto-syncs when online' },
      { icon: Globe, title: 'Cloud Backup', desc: 'Daily auto-backup, never lose data' },
      { icon: ShieldCheck, title: 'Bank-Grade Security', desc: 'SSL encryption, secure passwords, 2FA' },
      { icon: Zap, title: 'Blazing Fast', desc: 'Optimized for slow networks and old devices' },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="relative pt-20 pb-12 overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-50 dark:opacity-30 pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-96 w-[800px] bg-brand-500/20 rounded-full blur-3xl" />
          <Container className="relative text-center">
            <Badge variant="gradient">⚡ All-in-One Platform</Badge>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-balance">
              <span className="gradient-text">Every Feature You Need to Grow</span>
            </h1>
            <p className="mt-5 text-lg lg:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-balance">
              From the cash counter to the boardroom — Nafaa has everything Pakistani retailers need to scale.
            </p>
          </Container>
        </section>

        {/* Feature groups */}
        <section className="py-12 lg:py-20">
          <Container className="space-y-16">
            {groups.map((g, idx) => (
              <div key={g.title}>
                <div className="flex items-center gap-3 mb-8">
                  <div className={`h-1 w-16 rounded-full bg-gradient-to-r ${g.color}`} />
                  <h2 className="text-2xl sm:text-3xl font-extrabold">{g.title}</h2>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {g.features.map((f) => {
                    const Icon = f.icon;
                    return (
                      <div
                        key={f.title}
                        className="group rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-xl hover:-translate-y-1 transition-all"
                      >
                        <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${g.color} flex items-center justify-center shadow-lg`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <h3 className="mt-4 text-base font-bold">{f.title}</h3>
                        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{f.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </Container>
        </section>

        <CTA />
      </main>
      <Footer />
    </>
  );
}
