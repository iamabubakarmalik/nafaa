'use client';

import { motion } from 'framer-motion';
import { Zap, Package, BookOpen, BarChart3, Building2, Wifi, ScanLine, Users, ShieldCheck } from 'lucide-react';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { useLocale } from '@/components/providers/LocaleProvider';

export function Features() {
  const { t } = useLocale();

  const features = [
    {
      icon: Zap,
      title: t('features.items.pos.title'),
      desc: t('features.items.pos.desc'),
      color: 'from-amber-400 to-orange-500',
    },
    {
      icon: Package,
      title: t('features.items.inventory.title'),
      desc: t('features.items.inventory.desc'),
      color: 'from-violet-500 to-purple-600',
    },
    {
      icon: BookOpen,
      title: t('features.items.khata.title'),
      desc: t('features.items.khata.desc'),
      color: 'from-blue-500 to-cyan-600',
    },
    {
      icon: BarChart3,
      title: t('features.items.reports.title'),
      desc: t('features.items.reports.desc'),
      color: 'from-emerald-500 to-teal-600',
    },
    {
      icon: Building2,
      title: t('features.items.multishop.title'),
      desc: t('features.items.multishop.desc'),
      color: 'from-rose-500 to-pink-600',
    },
    {
      icon: Wifi,
      title: t('features.items.offline.title'),
      desc: t('features.items.offline.desc'),
      color: 'from-indigo-500 to-blue-600',
    },
  ];

  return (
    <section id="features" className="section-padding">
      <Container>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="brand">⚡ Powerful Features</Badge>
          <h2 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-balance">
            {t('features.title')}
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 text-balance">
            {t('features.subtitle')}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="group relative rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center shadow-lg`}>
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="mt-5 text-lg font-bold">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
