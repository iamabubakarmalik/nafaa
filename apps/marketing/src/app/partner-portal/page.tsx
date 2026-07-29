'use client';

import { motion } from 'framer-motion';
import { TrendingUp, Users, DollarSign, Award, Download, ArrowRight, BarChart3, Star } from 'lucide-react';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { FloatingWhatsApp } from '@/components/layout/Footer/FloatingWhatsApp';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Badge } from '@/components/primitives/Badge';
import { Button } from '@/components/primitives/Button';
import { GradientText } from '@/components/primitives/GradientText';
import { AuroraBackground } from '@/components/primitives/AuroraBackground';
import { GridBackground } from '@/components/primitives/GridBackground';
import { NoiseTexture } from '@/components/primitives/NoiseTexture';
import { Counter } from '@/components/primitives/Counter';
import { cn } from '@/lib/cn';

const stats = [
  { icon: DollarSign, label: 'Monthly commission', value: 84500, prefix: 'Rs ', color: 'text-emerald-600' },
  { icon: Users, label: 'Active referrals', value: 34, color: 'text-brand-600' },
  { icon: TrendingUp, label: 'Lifetime earnings', value: 1240000, prefix: 'Rs ', color: 'text-aurora-purple' },
  { icon: Award, label: 'Partner tier', value: 'Gold', color: 'text-gold' },
];

const referrals = [
  { name: 'Chaudhry Sweets', city: 'Lahore', plan: 'Pro', commission: 1650, status: 'active', date: 'Jul 28' },
  { name: 'Bilal Mobile', city: 'Karachi', plan: 'Growth', commission: 750, status: 'active', date: 'Jul 25' },
  { name: 'ZK Pharmacy', city: 'Islamabad', plan: 'Pro', commission: 1650, status: 'active', date: 'Jul 20' },
  { name: 'Sara Boutique', city: 'Faisalabad', plan: 'Growth', commission: 750, status: 'trial', date: 'Jul 18' },
  { name: 'Imran Kiryana', city: 'Multan', plan: 'Starter', commission: 0, status: 'trial', date: 'Jul 15' },
];

export default function PartnerPortalPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-10">
          <AuroraBackground variant="aurora" intensity="base" />
          <GridBackground className="mask-fade-bottom" />
          <NoiseTexture />
          <Container className="relative text-center">
            <Badge variant="aurora" size="md" pulse><Award className="h-3.5 w-3.5" /> Partner Portal Preview</Badge>
            <h1 className="mt-6 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight max-w-4xl mx-auto text-balance">
              <GradientText variant="aurora">Your partner dashboard, at a glance</GradientText>
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-2xl mx-auto">
              This is what partners see when they log in. Track referrals, watch commissions grow, download marketing materials — all in one place.
            </p>
          </Container>
        </section>

        <Section variant="default" spacing="md">
          <Container>
            {/* Stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {stats.map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                    className="rounded-2xl bg-white dark:bg-ink-800 p-5 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60">
                    <Icon className={cn('h-5 w-5 mb-2', s.color)} />
                    <div className="font-display font-extrabold text-2xl tabular-nums">
                      {typeof s.value === 'number' ? <>{s.prefix}<Counter value={s.value} /></> : s.value}
                    </div>
                    <div className="text-xs font-semibold text-ink-500 mt-1">{s.label}</div>
                  </motion.div>
                );
              })}
            </div>

            {/* Main dashboard */}
            <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
              {/* Referrals table */}
              <div className="rounded-3xl bg-white dark:bg-ink-800 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 overflow-hidden">
                <div className="p-5 border-b border-ink-100 dark:border-ink-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-brand-600" /><span className="font-display font-bold">Recent referrals</span></div>
                  <Badge variant="brand" size="xs">{referrals.length} total</Badge>
                </div>
                <div className="divide-y divide-ink-100 dark:divide-ink-700/60">
                  {referrals.map((r, i) => (
                    <div key={i} className="px-5 py-4 flex items-center justify-between gap-3 hover:bg-ink-50 dark:hover:bg-ink-900 transition">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-brand text-white flex items-center justify-center font-bold text-sm">
                          {r.name[0]}
                        </div>
                        <div>
                          <div className="font-bold text-sm">{r.name}</div>
                          <div className="text-xs text-ink-500">{r.city} · joined {r.date}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={r.status === 'active' ? 'live' : 'gold'} size="xs">{r.status === 'active' ? r.plan : 'Trial'}</Badge>
                        <div className={cn('text-sm font-bold tabular-nums mt-1', r.commission > 0 ? 'text-emerald-600' : 'text-ink-400')}>
                          {r.commission > 0 ? `+Rs ${r.commission.toLocaleString()}/mo` : 'Pending'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Side panel */}
              <div className="space-y-4">
                {/* Commission chart placeholder */}
                <div className="rounded-3xl bg-gradient-to-br from-aurora-purple to-aurora-pink p-6 text-white">
                  <div className="text-eyebrow font-mono text-white/70">This month</div>
                  <div className="font-display font-extrabold text-4xl tabular-nums mt-1">Rs 84,500</div>
                  <div className="mt-2 text-sm text-white/90 flex items-center gap-1"><TrendingUp className="h-4 w-4" /> +24% from last month</div>
                  {/* Mini bar chart */}
                  <div className="mt-4 flex items-end gap-1.5 h-16">
                    {[40, 55, 45, 70, 60, 85, 100].map((h, i) => (
                      <motion.div key={i} initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                        className="flex-1 rounded-t bg-white/30" />
                    ))}
                  </div>
                </div>

                {/* Marketing materials */}
                <div className="rounded-3xl bg-white dark:bg-ink-800 p-6 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60">
                  <div className="flex items-center gap-2 mb-4"><Download className="h-5 w-5 text-brand-600" /><span className="font-display font-bold">Marketing toolkit</span></div>
                  <div className="space-y-2">
                    {['Partner branding kit', 'Co-branded landing page', 'Sales presentation', 'Demo account access', 'WhatsApp share cards'].map((m) => (
                      <button key={m} className="w-full flex items-center justify-between p-3 rounded-xl bg-ink-50 dark:bg-ink-900 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition text-left">
                        <span className="text-sm font-semibold">{m}</span>
                        <Download className="h-4 w-4 text-ink-400" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating */}
                <div className="rounded-3xl bg-white dark:bg-ink-800 p-6 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 text-center">
                  <div className="flex justify-center gap-1 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-5 w-5 fill-gold text-gold" />)}
                  </div>
                  <div className="font-display font-bold">Top 5% Partner</div>
                  <div className="text-xs text-ink-500 mt-1">Based on referral activity and customer satisfaction</div>
                </div>
              </div>
            </div>

            <div className="mt-10 text-center">
              <Button size="xl" variant="aurora" href="mailto:partnerships@nafaa.pk?subject=Partner%20Application" rightIcon={<ArrowRight className="h-5 w-5" />}>
                Become a partner — start earning
              </Button>
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
