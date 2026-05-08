import Link from 'next/link';
import { Code, Key, Zap, Book, Terminal } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'API Documentation — Build with Nafaa',
  description: 'Complete API documentation for Nafaa. Build integrations, automate workflows, and extend functionality.',
  path: '/api-docs',
});

export default function ApiDocsPage() {
  return (
    <>
      <Header />
      <main>
        <section className="relative pt-20 pb-12 overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-50 dark:opacity-30 pointer-events-none" />
          <Container className="relative text-center">
            <Badge variant="gradient">🔌 Developer Tools</Badge>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
              <span className="gradient-text">Nafaa API</span>
            </h1>
            <p className="mt-5 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Build powerful integrations and custom workflows with our REST API
            </p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <Button size="lg" href="https://nafaa.pk/docs" target="_blank">
                <Book className="h-4 w-4" /> Read Docs
              </Button>
              <Button size="lg" variant="secondary" href="/contact">
                Get API Access
              </Button>
            </div>
          </Container>
        </section>

        <section className="py-12 lg:py-20">
          <Container>
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {[
                { icon: Key, title: 'Bearer Auth', desc: 'JWT-based authentication' },
                { icon: Zap, title: 'REST API', desc: 'JSON over HTTPS' },
                { icon: Terminal, title: 'Swagger UI', desc: 'Interactive playground' },
              ].map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 text-center">
                    <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-600 items-center justify-center shadow-lg">
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="mt-5 font-extrabold">{f.title}</h3>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{f.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="rounded-3xl bg-slate-950 text-slate-100 p-6 lg:p-8 overflow-hidden">
              <div className="flex items-center gap-2 mb-5">
                <div className="h-3 w-3 rounded-full bg-rose-400" />
                <div className="h-3 w-3 rounded-full bg-amber-400" />
                <div className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="ml-3 text-xs text-slate-500 font-mono">Example: Create a sale</span>
              </div>
              <pre className="text-sm font-mono overflow-x-auto"><code>{`curl -X POST https://api.nafaa.pk/v1/sales \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "items": [
      { "productId": "uuid", "quantity": 2, "price": 250 }
    ],
    "paymentMethod": "CASH",
    "customerId": "uuid"
  }'`}</code></pre>
            </div>

            <div className="mt-12 text-center">
              <p className="text-slate-600 dark:text-slate-400">
                Full documentation available at{' '}
                <a href="https://nafaa.pk/docs" className="text-brand-600 font-bold underline">
                  nafaa.pk/docs
                </a>
              </p>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
