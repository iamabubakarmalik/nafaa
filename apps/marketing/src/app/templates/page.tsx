import { Download, FileSpreadsheet, FileText, Receipt, BookOpen, Package, Users } from 'lucide-react';
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
import { NoiseTexture } from '@/components/primitives/NoiseTexture';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Free business templates — Excel, khata, receipts, invoices',
  description: 'Free downloadable templates for Pakistani businesses: Excel product lists, khata formats, receipt designs, invoice templates. Ready to use.',
  path: '/templates',
});

const templates = [
  { icon: FileSpreadsheet, title: 'Product Import Excel', desc: 'Bulk-upload products with SKU, price, and stock — Nafaa-ready format', downloads: '12,400', color: '#059669', category: 'Excel' },
  { icon: BookOpen, title: 'Digital Khata Format', desc: 'Structured customer ledger template — Urdu and English columns', downloads: '8,920', color: '#0284c7', category: 'Excel' },
  { icon: Receipt, title: 'Professional Receipt Template', desc: 'Clean, branded receipt design — customize your logo and colors', downloads: '15,670', color: '#f97316', category: 'Print' },
  { icon: FileText, title: 'Invoice Template (FBR-ready)', desc: 'Sales tax compliant invoice with NTN and STRN fields', downloads: '9,340', color: '#01411c', category: 'FBR' },
  { icon: Package, title: 'Inventory Count Sheet', desc: 'Monthly physical stock count with variance tracking', downloads: '6,120', color: '#8b5cf6', category: 'Excel' },
  { icon: Users, title: 'Staff Attendance Register', desc: 'Track attendance, hours, and salary calculations', downloads: '4,890', color: '#ec4899', category: 'Excel' },
  { icon: FileSpreadsheet, title: 'Daily Sales Report', desc: 'End-of-day summary with cash reconciliation', downloads: '11,230', color: '#12b76a', category: 'Excel' },
  { icon: Receipt, title: 'Purchase Order Template', desc: 'Professional PO for supplier orders with terms', downloads: '3,450', color: '#dc2626', category: 'Print' },
];

export default function TemplatesPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-14">
          <AuroraBackground variant="brand" intensity="base" />
          <NoiseTexture />
          <Container className="relative text-center">
            <Badge variant="brand" size="md">📥 100% free · No signup required</Badge>
            <h1 className="mt-8 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight max-w-4xl mx-auto text-balance">
              <GradientText variant="brand">Free templates that save you hours</GradientText>
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-2xl mx-auto">
              Excel sheets, receipt designs, invoice formats, and more — all ready-to-use for Pakistani businesses. Download and edit freely.
            </p>
          </Container>
        </section>

        <Section variant="default" spacing="lg">
          <Container>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {templates.map((t, i) => {
                const Icon = t.icon;
                return (
                  <div key={i} className="group rounded-2xl bg-white dark:bg-ink-800 p-6 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:-translate-y-1 hover:shadow-card-hover transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${t.color}, ${t.color}dd)` }}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <Badge variant="ink" size="xs">{t.category}</Badge>
                    </div>
                    <h3 className="font-display font-bold text-lg">{t.title}</h3>
                    <p className="mt-2 text-sm text-ink-600 dark:text-ink-300 leading-relaxed line-clamp-2">{t.desc}</p>
                    <div className="mt-4 pt-4 border-t border-ink-100 dark:border-ink-700/60 flex items-center justify-between">
                      <span className="text-xs text-ink-500 flex items-center gap-1">
                        <Download className="h-3 w-3" /> {t.downloads} downloads
                      </span>
                      <button className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-gradient-brand text-white text-sm font-bold hover:-translate-y-0.5 transition-all">
                        <Download className="h-3.5 w-3.5" /> Free
                      </button>
                    </div>
                  </div>
                );
              })}
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
