'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code2, Play, Copy, Check, ChevronRight, Terminal, Webhook, Key, Zap } from 'lucide-react';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { FloatingWhatsApp } from '@/components/layout/Footer/FloatingWhatsApp';
import { CTA } from '@/components/home/CTA';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Badge } from '@/components/primitives/Badge';
import { Button } from '@/components/primitives/Button';
import { GradientText } from '@/components/primitives/GradientText';
import { AuroraBackground } from '@/components/primitives/AuroraBackground';
import { NoiseTexture } from '@/components/primitives/NoiseTexture';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  title: string;
  desc: string;
  params?: Array<{ name: string; type: string; required: boolean; desc: string }>;
  body?: string;
  response: string;
}

const endpoints: Endpoint[] = [
  {
    method: 'GET', path: '/v1/shops', title: 'List all shops', desc: 'Get all shops for the authenticated user.',
    response: `{
  "shops": [
    { "id": "shop_8f2k1", "name": "Ahmad Bakery", "city": "Lahore", "active": true },
    { "id": "shop_9a3m2", "name": "ZK Pharmacy", "city": "Karachi", "active": true }
  ],
  "total": 2
}`,
  },
  {
    method: 'POST', path: '/v1/sales', title: 'Create a sale', desc: 'Record a new sale in a shop.',
    body: `{
  "shopId": "shop_8f2k1",
  "items": [
    { "productId": "prod_4x91", "quantity": 2, "price": 250 }
  ],
  "paymentMethod": "JAZZCASH",
  "customerId": "cust_77dm"
}`,
    response: `{
  "id": "sale_x7k2p",
  "invoiceNumber": "INV-2026-084521",
  "total": 500,
  "fbrSubmitted": true,
  "fbrQrUrl": "https://fbr.gov.pk/qr/abc123",
  "createdAt": "2026-07-29T14:32:00+05:00"
}`,
  },
  {
    method: 'GET', path: '/v1/products', title: 'List products', desc: 'Get paginated product catalog.',
    params: [
      { name: 'shopId', type: 'string', required: true, desc: 'Shop identifier' },
      { name: 'page', type: 'integer', required: false, desc: 'Page number (default 1)' },
      { name: 'limit', type: 'integer', required: false, desc: 'Items per page (default 50, max 100)' },
    ],
    response: `{
  "products": [
    { "id": "prod_4x91", "name": "Fresh Bread", "sku": "BRD-001", "price": 120, "stock": 45 }
  ],
  "page": 1, "totalPages": 3, "total": 142
}`,
  },
  {
    method: 'POST', path: '/v1/customers', title: 'Create customer', desc: 'Add a new customer with khata support.',
    body: `{
  "shopId": "shop_8f2k1",
  "name": "Ahmad Raza",
  "phone": "+923001234567",
  "creditLimit": 5000,
  "openingBalance": 1200
}`,
    response: `{
  "id": "cust_77dm",
  "name": "Ahmad Raza",
  "phone": "+923001234567",
  "creditLimit": 5000,
  "balance": 1200,
  "createdAt": "2026-07-29T14:35:00+05:00"
}`,
  },
  {
    method: 'GET', path: '/v1/reports/daily', title: 'Daily sales report', desc: 'Get today\'s sales summary.',
    params: [{ name: 'shopId', type: 'string', required: true, desc: 'Shop identifier' }],
    response: `{
  "date": "2026-07-29",
  "totalSales": 142580,
  "transactionCount": 187,
  "avgTransaction": 763,
  "topProducts": [
    { "name": "Fresh Bread", "qty": 45, "revenue": 5400 }
  ],
  "paymentBreakdown": { "cash": 45, "jazzcash": 32, "easypaisa": 18, "raast": 12 }
}`,
  },
];

const methodColors = {
  GET: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  POST: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  PUT: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
};

export default function ApiExplorerPage() {
  const [selected, setSelected] = useState(0);
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const ep = endpoints[selected];

  const tryIt = async () => {
    setLoading(true);
    setResponse(null);
    await new Promise((r) => setTimeout(r, 800));
    setResponse(ep.response);
    setLoading(false);
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 1500);
  };

  const curlCmd = `curl -X ${ep.method} https://api.nafaa.pk${ep.path} \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"${ep.body ? ` \\\n  -d '${ep.body.replace(/\n\s*/g, ' ')}'` : ''}`;

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-10">
          <AuroraBackground variant="aurora" intensity="base" />
          <NoiseTexture />
          <Container className="relative text-center">
            <Badge variant="aurora" size="md" pulse>
              <Code2 className="h-3.5 w-3.5" /> Interactive API Explorer
            </Badge>
            <h1 className="mt-6 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight max-w-4xl mx-auto text-balance">
              <GradientText variant="aurora">Try the Nafaa API right here</GradientText>
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-2xl mx-auto">
              Real endpoints, real responses. Pick one, hit "Try it", see what comes back. Build your integration with confidence.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <Button size="lg" variant="aurora" href="mailto:api@nafaa.pk?subject=API%20Key">Request API key</Button>
              <Button size="lg" variant="secondary" href="/api-docs">Full documentation</Button>
            </div>
          </Container>
        </section>

        <Section variant="default" spacing="lg">
          <Container>
            <div className="grid lg:grid-cols-[280px_1fr] gap-6 max-w-6xl mx-auto">
              {/* Sidebar */}
              <div className="rounded-2xl bg-white dark:bg-ink-800 p-4 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 h-fit">
                <div className="text-xs font-mono uppercase tracking-widest font-bold text-ink-500 mb-3 px-2">Endpoints</div>
                <div className="space-y-1">
                  {endpoints.map((e, i) => (
                    <button key={i} onClick={() => { setSelected(i); setResponse(null); }}
                      className={cn('w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition',
                        i === selected ? 'bg-brand-50 dark:bg-brand-950/40 ring-1 ring-brand-200 dark:ring-brand-800/50' : 'hover:bg-ink-50 dark:hover:bg-ink-900')}>
                      <span className={cn('text-[10px] font-mono font-bold px-1.5 py-0.5 rounded', methodColors[e.method])}>{e.method}</span>
                      <span className="text-xs font-mono truncate flex-1">{e.path}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-5 pt-5 border-t border-ink-100 dark:border-ink-700/60 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-ink-500"><Key className="h-3.5 w-3.5" /> Bearer token auth</div>
                  <div className="flex items-center gap-2 text-xs text-ink-500"><Webhook className="h-3.5 w-3.5" /> Real-time webhooks</div>
                  <div className="flex items-center gap-2 text-xs text-ink-500"><Zap className="h-3.5 w-3.5" /> 99.99% uptime SLA</div>
                </div>
              </div>

              {/* Main panel */}
              <div className="space-y-4">
                {/* Endpoint header */}
                <div className="rounded-2xl bg-white dark:bg-ink-800 p-6 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={cn('text-xs font-mono font-bold px-2.5 py-1 rounded-md', methodColors[ep.method])}>{ep.method}</span>
                    <code className="font-mono text-lg font-bold">{ep.path}</code>
                  </div>
                  <h2 className="font-display font-bold text-xl">{ep.title}</h2>
                  <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">{ep.desc}</p>

                  {ep.params && (
                    <div className="mt-4">
                      <div className="text-xs font-mono uppercase tracking-widest font-bold text-ink-500 mb-2">Parameters</div>
                      <div className="space-y-1.5">
                        {ep.params.map((p) => (
                          <div key={p.name} className="flex items-center gap-2 text-xs font-mono">
                            <span className="font-bold text-brand-600">{p.name}</span>
                            <span className="text-ink-500">{p.type}</span>
                            {p.required && <span className="text-red-500">required</span>}
                            <span className="text-ink-500 flex-1">— {p.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Request body */}
                {ep.body && (
                  <div className="rounded-2xl bg-ink-950 overflow-hidden ring-1 ring-inset ring-ink-800">
                    <div className="flex items-center justify-between px-5 py-3 bg-ink-900 border-b border-ink-800">
                      <span className="text-xs font-mono text-ink-400">Request body</span>
                      <button onClick={() => copy(ep.body!)} className="text-ink-400 hover:text-white"><Copy className="h-3.5 w-3.5" /></button>
                    </div>
                    <pre className="p-5 overflow-x-auto text-sm"><code className="text-ink-100 font-mono whitespace-pre">{ep.body}</code></pre>
                  </div>
                )}

                {/* cURL command */}
                <div className="rounded-2xl bg-ink-950 overflow-hidden ring-1 ring-inset ring-ink-800">
                  <div className="flex items-center justify-between px-5 py-3 bg-ink-900 border-b border-ink-800">
                    <div className="flex items-center gap-2"><Terminal className="h-3.5 w-3.5 text-ink-400" /><span className="text-xs font-mono text-ink-400">cURL</span></div>
                    <button onClick={() => copy(curlCmd)} className="text-ink-400 hover:text-white">{copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}</button>
                  </div>
                  <pre className="p-5 overflow-x-auto text-sm"><code className="text-emerald-300 font-mono whitespace-pre-wrap">{curlCmd}</code></pre>
                </div>

                {/* Try it */}
                <div className="flex items-center gap-3">
                  <Button onClick={tryIt} loading={loading} leftIcon={!loading ? <Play className="h-4 w-4" /> : undefined}>
                    {loading ? 'Calling API...' : 'Try it'}
                  </Button>
                  <span className="text-xs text-ink-500">Sandbox mode — no real data affected</span>
                </div>

                {/* Response */}
                <AnimatePresence>
                  {response && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl bg-ink-950 overflow-hidden ring-1 ring-inset ring-ink-800">
                      <div className="flex items-center justify-between px-5 py-3 bg-ink-900 border-b border-ink-800">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-ink-400">Response</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400">200 OK</span>
                        </div>
                        <button onClick={() => copy(response)} className="text-ink-400 hover:text-white"><Copy className="h-3.5 w-3.5" /></button>
                      </div>
                      <pre className="p-5 overflow-x-auto text-sm"><code className="text-emerald-300 font-mono whitespace-pre">{response}</code></pre>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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
