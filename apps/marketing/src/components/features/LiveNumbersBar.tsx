'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, ShoppingBag, Zap } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { LiveDot } from '@/components/primitives/LiveDot';
import { cn } from '@/lib/cn';

export function LiveNumbersBar() {
  const { locale } = useLocale();
  const [salesToday, setSalesToday] = useState(284593);
  const [ordersMinute, setOrdersMinute] = useState(47);
  const [activeUsers, setActiveUsers] = useState(1284);
  const [revenue, setRevenue] = useState(41200000);
  const isUr = locale === 'ur';

  useEffect(() => {
    const t = setInterval(() => {
      setSalesToday((s) => s + Math.floor(Math.random() * 5) + 1);
      setOrdersMinute(45 + Math.floor(Math.random() * 8));
      setActiveUsers(1200 + Math.floor(Math.random() * 200));
      setRevenue((r) => r + Math.floor(Math.random() * 3000) + 500);
    }, 2500);
    return () => clearInterval(t);
  }, []);

  const stats = [
    { icon: Zap, val: salesToday.toLocaleString(), labelEn: 'transactions today', labelUr: 'آج کے لین دین', color: 'text-brand-600' },
    { icon: ShoppingBag, val: ordersMinute.toString(), labelEn: 'orders this minute', labelUr: 'اس منٹ کے آرڈرز', color: 'text-aurora-purple' },
    { icon: Users, val: activeUsers.toLocaleString(), labelEn: 'users online now', labelUr: 'اب فعال صارفین', color: 'text-sunset' },
    { icon: TrendingUp, val: 'Rs ' + (revenue / 1000000).toFixed(1) + 'B', labelEn: 'total revenue processed', labelUr: 'کل آمدنی', color: 'text-emerald-600' },
  ];

  return (
    <Section variant="default" spacing="sm" className="relative">
      <Container>
        <div className="rounded-3xl bg-gradient-to-br from-ink-950 via-ink-900 to-ink-950 p-8 relative overflow-hidden">
          {/* Aurora glow */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-1/4 h-64 w-64 bg-brand-500/40 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 h-64 w-64 bg-aurora-purple/40 rounded-full blur-3xl" />
          </div>

          <div className="relative">
            <div className="flex items-center gap-2 mb-6">
              <LiveDot color="emerald" size="md" />
              <span className={cn('text-xs font-mono uppercase tracking-widest font-bold text-emerald-400', isUr && 'font-urdu text-sm')}>
                {isUr ? 'حقیقی وقت میں ابھی' : 'Live right now'}
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((s, i) => {
                const Icon = s.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Icon className={cn('h-5 w-5 mb-2', s.color)} />
                    <motion.div
                      key={s.val}
                      initial={{ opacity: 0.5, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="font-display font-extrabold text-3xl lg:text-4xl text-white tabular-nums"
                    >
                      {s.val}
                    </motion.div>
                    <div className={cn('mt-1 text-xs font-semibold text-ink-400', isUr && 'font-urdu text-sm')}>
                      {isUr ? s.labelUr : s.labelEn}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
