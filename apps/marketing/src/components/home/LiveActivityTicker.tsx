'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ShoppingCart, UserPlus, TrendingUp, Zap } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { LiveDot } from '@/components/primitives/LiveDot';
import { cities } from '@/lib/data/cities';
import { cn } from '@/lib/cn';

type ActivityType = 'signup' | 'sale' | 'milestone' | 'launch';

interface Activity {
  id: number;
  type: ActivityType;
  nameEn: string;
  nameUr: string;
  cityEn: string;
  cityUr: string;
  detailEn: string;
  detailUr: string;
  timeAgo: number;
}

const names = [
  { en: 'Ali Raza', ur: 'علی رضا' },
  { en: 'Fatima Bibi', ur: 'فاطمہ بی بی' },
  { en: 'Ahmad Khan', ur: 'احمد خان' },
  { en: 'Ayesha Malik', ur: 'عائشہ ملک' },
  { en: 'Bilal Ahmed', ur: 'بلال احمد' },
  { en: 'Sana Iqbal', ur: 'ثنا اقبال' },
  { en: 'Kashif Butt', ur: 'کاشف بٹ' },
  { en: 'Zara Sheikh', ur: 'زارا شیخ' },
];

const businesses = [
  { en: 'a bakery', ur: 'ایک بیکری' },
  { en: 'a pharmacy', ur: 'ایک فارمیسی' },
  { en: 'a mobile shop', ur: 'ایک موبائل شاپ' },
  { en: 'a restaurant', ur: 'ایک ریسٹورنٹ' },
  { en: 'a kiryana store', ur: 'ایک کریانہ اسٹور' },
];

const generateActivity = (id: number): Activity => {
  const type: ActivityType = ['signup', 'sale', 'milestone', 'launch'][Math.floor(Math.random() * 4)] as ActivityType;
  const name = names[Math.floor(Math.random() * names.length)];
  const city = cities[Math.floor(Math.random() * cities.length)];
  const biz = businesses[Math.floor(Math.random() * businesses.length)];
  const amt = Math.floor(Math.random() * 8000) + 500;

  const detailsEn: Record<ActivityType, string> = {
    signup: `just joined with ${biz.en}`,
    sale: `made a sale of Rs ${amt.toLocaleString()}`,
    milestone: `crossed 1,000 transactions today`,
    launch: `launched their second branch`,
  };
  const detailsUr: Record<ActivityType, string> = {
    signup: `نے ${biz.ur} کے ساتھ شمولیت اختیار کی`,
    sale: `نے ${amt.toLocaleString()} روپے کی سیل کی`,
    milestone: `نے آج ۱۰۰۰ لین دین مکمل کیے`,
    launch: `نے اپنی دوسری برانچ کھولی`,
  };

  return {
    id,
    type,
    nameEn: name.en,
    nameUr: name.ur,
    cityEn: city.nameEn,
    cityUr: city.nameUr,
    detailEn: detailsEn[type],
    detailUr: detailsUr[type],
    timeAgo: Math.floor(Math.random() * 8) + 1,
  };
};

const typeConfig: Record<ActivityType, { icon: any; color: string; bg: string }> = {
  signup:    { icon: UserPlus,    color: 'text-brand-600 dark:text-brand-400',    bg: 'bg-brand-100 dark:bg-brand-950' },
  sale:      { icon: ShoppingCart, color: 'text-sunset dark:text-orange-400',     bg: 'bg-orange-100 dark:bg-orange-950' },
  milestone: { icon: TrendingUp,  color: 'text-aurora-purple dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-950' },
  launch:    { icon: Sparkles,    color: 'text-gold dark:text-amber-400',         bg: 'bg-amber-100 dark:bg-amber-950' },
};

export function LiveActivityTicker() {
  const { locale } = useLocale();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [nextId, setNextId] = useState(0);
  const isUr = locale === 'ur';

  useEffect(() => {
    // Seed
    const initial: Activity[] = [];
    for (let i = 0; i < 3; i++) initial.push(generateActivity(i));
    setActivities(initial);
    setNextId(3);

    // Rotate every 3s
    const interval = setInterval(() => {
      setActivities((prev) => {
        const newAct = generateActivity(prev.length + Math.random());
        return [newAct, ...prev.slice(0, 2)];
      });
    }, 3200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative py-6 border-y border-ink-100/70 dark:border-ink-800/50 bg-ink-50/40 dark:bg-ink-950/40">
      <Container>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <LiveDot color="emerald" size="lg" />
            <span className={cn('text-xs font-mono font-bold uppercase tracking-widest text-ink-500', isUr && 'font-urdu text-sm')}>
              {isUr ? 'ابھی' : 'Live now'}
            </span>
          </div>

          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="popLayout">
              {activities.slice(0, 1).map((act) => {
                const cfg = typeConfig[act.type];
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={act.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-center gap-3"
                  >
                    <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', cfg.bg, cfg.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className={cn('text-sm text-ink-700 dark:text-ink-200 truncate', isUr && 'font-urdu text-base')}>
                      <span className="font-bold">{isUr ? act.nameUr : act.nameEn}</span>
                      {' '}
                      <span className="text-ink-500 dark:text-ink-400">
                        {isUr ? `${act.cityUr} سے` : `from ${act.cityEn}`}
                      </span>
                      {' '}
                      {isUr ? act.detailUr : act.detailEn}
                    </div>
                    <div className={cn('hidden md:block text-xs text-ink-400 tabular-nums shrink-0', isUr && 'font-urdu')}>
                      {isUr ? `${act.timeAgo} منٹ پہلے` : `${act.timeAgo} min ago`}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </Container>
    </div>
  );
}
