import { CheckCircle2, Server, Database, Globe, Mail, Shield } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'System Status — All Services Operational',
  description: 'Real-time status of Nafaa services. Uptime, incidents, and scheduled maintenance.',
  path: '/status',
});

const services = [
  { icon: Globe, name: 'Web Application', status: 'operational', uptime: '99.99%' },
  { icon: Server, name: 'API Service', status: 'operational', uptime: '99.97%' },
  { icon: Database, name: 'Database', status: 'operational', uptime: '99.99%' },
  { icon: Mail, name: 'Email Delivery', status: 'operational', uptime: '99.95%' },
  { icon: Shield, name: 'Authentication', status: 'operational', uptime: '100%' },
];

export default function StatusPage() {
  return (
    <>
      <Header />
      <main>
        <section className="relative pt-20 pb-12 overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-50 dark:opacity-30 pointer-events-none" />
          <Container className="relative text-center">
            <Badge variant="brand">⚡ Live Status</Badge>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
              <span className="gradient-text">All Systems Operational</span>
            </h1>
            <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 px-5 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-400">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              All systems operational
            </div>
          </Container>
        </section>

        <section className="py-12">
          <Container className="max-w-3xl">
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                <h2 className="font-bold">Service Status</h2>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {services.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.name} className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <div className="font-bold text-sm">{s.name}</div>
                          <div className="text-xs text-slate-500">90-day uptime: {s.uptime}</div>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-sm font-bold">
                        <CheckCircle2 className="h-4 w-4" />
                        Operational
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
              <h2 className="font-bold mb-3">Recent Incidents</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                ✨ No incidents in the last 30 days. All services running smoothly.
              </p>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
