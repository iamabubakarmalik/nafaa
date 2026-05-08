import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { CTA } from '@/components/home/CTA';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Integrations — Connect Nafaa with Your Favorite Tools',
  description: 'Integrate Nafaa with WhatsApp, JazzCash, EasyPaisa, Stripe, and more. Built for the Pakistani business ecosystem.',
  path: '/integrations',
});

const categories = [
  {
    name: 'Payment Gateways',
    items: [
      { logo: '💳', name: 'JazzCash', desc: 'Mobile wallet payments', status: 'available' },
      { logo: '💸', name: 'EasyPaisa', desc: 'Telenor mobile wallet', status: 'available' },
      { logo: '🌍', name: 'Stripe', desc: 'International cards', status: 'available' },
      { logo: '🏦', name: 'Bank Transfer', desc: 'Manual bank transfer', status: 'available' },
    ],
  },
  {
    name: 'Communication',
    items: [
      { logo: '💬', name: 'WhatsApp Business', desc: 'Receipts, reminders, notifications', status: 'available' },
      { logo: '📱', name: 'SMS Gateway', desc: 'Pakistan SMS providers', status: 'available' },
      { logo: '📧', name: 'Email (Resend)', desc: 'Transactional emails', status: 'available' },
    ],
  },
  {
    name: 'Hardware',
    items: [
      { logo: '🖨️', name: 'Thermal Printers', desc: 'ESC/POS compatible', status: 'available' },
      { logo: '📊', name: 'Barcode Scanners', desc: 'USB & Bluetooth', status: 'available' },
      { logo: '⚖️', name: 'Weighing Scales', desc: 'Serial & USB scales', status: 'available' },
    ],
  },
  {
    name: 'Coming Soon',
    items: [
      { logo: '🛒', name: 'Daraz', desc: 'Auto-sync products', status: 'soon' },
      { logo: '🚚', name: 'Foodpanda', desc: 'Delivery integration', status: 'soon' },
      { logo: '📈', name: 'QuickBooks', desc: 'Accounting sync', status: 'soon' },
      { logo: '🎫', name: 'Zapier', desc: '5,000+ app integrations', status: 'soon' },
    ],
  },
];

export default function IntegrationsPage() {
  return (
    <>
      <Header />
      <main>
        <section className="relative pt-20 pb-12 overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-50 dark:opacity-30 pointer-events-none" />
          <Container className="relative text-center">
            <Badge variant="gradient">🔌 Integrations</Badge>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
              <span className="gradient-text">Connect Your Favorite Tools</span>
            </h1>
            <p className="mt-5 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Nafaa works seamlessly with the tools you already use — and many more coming soon
            </p>
          </Container>
        </section>

        <section className="py-12 lg:py-20">
          <Container className="space-y-14">
            {categories.map((cat) => (
              <div key={cat.name}>
                <h2 className="text-2xl sm:text-3xl font-extrabold mb-6">{cat.name}</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {cat.items.map((item) => (
                    <div
                      key={item.name}
                      className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-xl transition-all"
                    >
                      <div className="text-5xl mb-3">{item.logo}</div>
                      <h3 className="font-extrabold">{item.name}</h3>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{item.desc}</p>
                      <div className="mt-4">
                        {item.status === 'available' ? (
                          <Badge variant="brand">✓ Available</Badge>
                        ) : (
                          <Badge variant="accent">🔜 Coming Soon</Badge>
                        )}
                      </div>
                    </div>
                  ))}
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
