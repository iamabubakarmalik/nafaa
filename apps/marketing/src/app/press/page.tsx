import { Newspaper, Download, Mail } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Press & Media — Nafaa News and Resources',
  description: 'Media kit, press releases, and brand assets for journalists and partners covering Nafaa.',
  path: '/press',
});

const news = [
  {
    date: 'April 20, 2026',
    title: 'Nafaa Crosses 5,000 Active Shopkeepers in Pakistan',
    outlet: 'Tech in Asia',
  },
  {
    date: 'March 15, 2026',
    title: 'How a Lahore Startup is Digitizing Pakistan\'s Kiryana Stores',
    outlet: 'Dawn News',
  },
  {
    date: 'February 8, 2026',
    title: 'Nafaa Raises $2M Seed to Empower Pakistani Retailers',
    outlet: 'Profit Pakistan Today',
  },
];

export default function PressPage() {
  return (
    <>
      <Header />
      <main>
        <section className="relative pt-20 pb-12 overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-50 dark:opacity-30 pointer-events-none" />
          <Container className="relative text-center">
            <Badge variant="gradient">📰 Press & Media</Badge>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
              <span className="gradient-text">Nafaa in the News</span>
            </h1>
            <p className="mt-5 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Resources for journalists, partners, and media covering Nafaa
            </p>
          </Container>
        </section>

        <section className="py-12">
          <Container>
            <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* News */}
              <div>
                <h2 className="text-2xl font-extrabold mb-5 flex items-center gap-2">
                  <Newspaper className="h-6 w-6 text-brand-600" />
                  Recent Coverage
                </h2>
                <div className="space-y-3">
                  {news.map((n, i) => (
                    <div
                      key={i}
                      className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 hover:shadow-xl transition-all"
                    >
                      <div className="text-xs text-slate-500">{n.date} • {n.outlet}</div>
                      <h3 className="mt-2 font-bold leading-tight">{n.title}</h3>
                    </div>
                  ))}
                </div>
              </div>

              {/* Media kit */}
              <div className="space-y-4">
                <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-emerald-700 text-white p-8">
                  <Download className="h-10 w-10 mb-4" />
                  <h3 className="text-xl font-extrabold">Download Media Kit</h3>
                  <p className="mt-2 text-white/90 text-sm">
                    Logos, brand colors, screenshots, and founder photos. High-res, ready to use.
                  </p>
                  <Button
                    size="md"
                    className="mt-5 !bg-white !text-brand-700 hover:!bg-slate-100"
                    href="/media-kit.zip"
                  >
                    <Download className="h-4 w-4" /> Download (24 MB)
                  </Button>
                </div>

                <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8">
                  <Mail className="h-10 w-10 text-brand-600 mb-4" />
                  <h3 className="text-xl font-extrabold">Press Inquiries</h3>
                  <p className="mt-2 text-slate-600 dark:text-slate-400 text-sm">
                    For interviews, quotes, and exclusive stories
                  </p>
                  <a
                    href="mailto:press@nafaa.pk"
                    className="mt-4 inline-flex items-center gap-2 text-brand-600 dark:text-brand-400 font-bold hover:underline"
                  >
                    press@nafaa.pk
                  </a>
                </div>

                <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8">
                  <h3 className="font-extrabold mb-3">Quick Facts</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Founded</dt>
                      <dd className="font-bold">2024</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Headquarters</dt>
                      <dd className="font-bold">Lahore, Pakistan</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Active Shops</dt>
                      <dd className="font-bold">5,000+</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Cities Served</dt>
                      <dd className="font-bold">50+</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Sales Processed</dt>
                      <dd className="font-bold">Rs 5B+</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
