'use client';

import { motion } from 'framer-motion';
import { Container } from '@/components/ui/Container';
import { useLocale } from '@/components/providers/LocaleProvider';

export function Stats() {
  const { t } = useLocale();
  const stats = [
    { value: '5,000+', label: t('stats.shops') },
    { value: '500K+', label: t('stats.transactions') },
    { value: '99.9%', label: t('stats.uptime') },
    { value: '24/7', label: t('stats.support') },
  ];

  return (
    <section className="py-12 border-y border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
      <Container>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="text-center"
            >
              <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold gradient-text">{s.value}</div>
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-400 font-medium">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
