'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { cn } from '@/lib/cn';

type MomentKey = 'independence' | 'ramzan' | 'eid' | 'newYear';

interface Moment {
  key: MomentKey;
  emoji: string;
  titleEn: string;
  titleUr: string;
  bg: string;
  active: () => boolean;
}

const moments: Moment[] = [
  {
    key: 'independence', emoji: '🇵🇰',
    titleEn: 'Happy Independence Day, Pakistan! 30% off all plans this week',
    titleUr: 'یوم آزادی مبارک! اس ہفتے تمام پلانز پر ۳۰٪ رعایت',
    bg: 'from-pk-green via-emerald-600 to-white',
    active: () => {
      const now = new Date();
      return now.getMonth() === 7 && now.getDate() >= 10 && now.getDate() <= 16;
    },
  },
  {
    key: 'ramzan', emoji: '🌙',
    titleEn: 'Ramzan Mubarak — special features for restaurants and stores',
    titleUr: 'رمضان مبارک — ریسٹورنٹس اور اسٹورز کے لیے خصوصی خصوصیات',
    bg: 'from-emerald-700 via-teal-700 to-ink-900',
    active: () => false,
  },
];

export function CulturalMoment() {
  const { locale } = useLocale();
  const [moment, setMoment] = useState<Moment | null>(null);
  const [visible, setVisible] = useState(false);
  const isUr = locale === 'ur';

  useEffect(() => {
    const active = moments.find((m) => m.active());
    if (active) {
      const dismissed = sessionStorage.getItem(`nafaa-moment-${active.key}`);
      if (!dismissed) {
        setMoment(active);
        setVisible(true);
      }
    }
  }, []);

  const dismiss = () => {
    if (moment) sessionStorage.setItem(`nafaa-moment-${moment.key}`, '1');
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && moment && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          className={cn('relative overflow-hidden bg-gradient-to-r text-white', moment.bg)}
        >
          <div className="container-page py-2.5 flex items-center justify-between gap-4">
            <div className={cn('flex items-center gap-2 text-sm font-bold', isUr && 'font-urdu text-base')}>
              <Sparkles className="h-4 w-4" />
              <span>{moment.emoji}</span>
              <span>{isUr ? moment.titleUr : moment.titleEn}</span>
            </div>
            <button onClick={dismiss} className="p-1 hover:bg-white/20 rounded" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
