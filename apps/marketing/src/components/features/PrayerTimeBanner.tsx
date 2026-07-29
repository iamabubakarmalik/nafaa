'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, X } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { cn } from '@/lib/cn';

// Approximate prayer times for Pakistan (simplified — production would use actual API)
const prayerTimes = [
  { name: 'Fajr', nameUr: 'فجر', hour: 5, minute: 15 },
  { name: 'Dhuhr', nameUr: 'ظہر', hour: 12, minute: 30 },
  { name: 'Asr', nameUr: 'عصر', hour: 15, minute: 45 },
  { name: 'Maghrib', nameUr: 'مغرب', hour: 18, minute: 30 },
  { name: 'Isha', nameUr: 'عشاء', hour: 20, minute: 0 },
];

export function PrayerTimeBanner() {
  const { locale } = useLocale();
  const [visible, setVisible] = useState(false);
  const [nextPrayer, setNextPrayer] = useState<{ name: string; nameUr: string; minutesUntil: number } | null>(null);
  const isUr = locale === 'ur';

  useEffect(() => {
    const dismissed = sessionStorage.getItem('nafaa-prayer-dismissed');
    if (dismissed) return;

    const check = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      for (const p of prayerTimes) {
        const prayerMinutes = p.hour * 60 + p.minute;
        const diff = prayerMinutes - currentMinutes;
        if (diff > 0 && diff <= 15) {
          setNextPrayer({ name: p.name, nameUr: p.nameUr, minutesUntil: diff });
          setVisible(true);
          return;
        }
      }
      setVisible(false);
    };

    check();
    const t = setInterval(check, 60000);
    return () => clearInterval(t);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem('nafaa-prayer-dismissed', '1');
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && nextPrayer && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          className="relative overflow-hidden bg-gradient-to-r from-emerald-700 via-teal-700 to-ink-900 text-white"
        >
          <div className="container-page py-2.5 flex items-center justify-between gap-4">
            <div className={cn('flex items-center gap-2 text-sm font-bold', isUr && 'font-urdu text-base')}>
              <Moon className="h-4 w-4 text-pk-gold" />
              <span>
                {isUr
                  ? `${nextPrayer.nameUr} کا وقت ${nextPrayer.minutesUntil} منٹ میں — دکان بند کرنے کا ٹائمر لگائیں`
                  : `${nextPrayer.name} in ${nextPrayer.minutesUntil} minutes — set your auto-pause timer`}
              </span>
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
