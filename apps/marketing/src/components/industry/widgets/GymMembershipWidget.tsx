'use client';

import { motion } from 'framer-motion';
import { Dumbbell, Users, CalendarCheck, TrendingUp } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { LiveDot } from '@/components/primitives/LiveDot';
import { cn } from '@/lib/cn';

const MEMBERS = [
  { name: 'Ali H.', plan: 'Platinum', daysLeft: 28, checkIns: 22, streak: 8 },
  { name: 'Sara M.', plan: 'Gold', daysLeft: 14, checkIns: 18, streak: 12 },
  { name: 'Bilal K.', plan: 'Silver', daysLeft: 5, checkIns: 12, streak: 3 },
  { name: 'Zara F.', plan: 'Platinum', daysLeft: 45, checkIns: 26, streak: 15 },
];

const PLAN_COLORS: Record<string, string> = {
  Platinum: 'from-purple-500 to-indigo-700',
  Gold: 'from-amber-500 to-yellow-600',
  Silver: 'from-slate-400 to-slate-600',
};

export function GymMembershipWidget() {
  const { locale } = useLocale();
  const isUr = locale === 'ur';

  return (
    <div className="rounded-3xl bg-white dark:bg-ink-800 shadow-2xl ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 overflow-hidden">
      <div className="relative p-6 text-white overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0891b2, #164e63)' }}
      >
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <LiveDot color="emerald" size="sm" />
              <div className={cn('text-[10px] font-mono uppercase tracking-widest font-bold text-white/90', isUr && 'font-urdu text-xs')}>
                {isUr ? 'فعال ممبرشپس' : 'Active members'}
              </div>
            </div>
            <div className={cn('font-display font-extrabold text-2xl', isUr && 'font-urdu text-3xl')}>
              {isUr ? 'ممبرشپ ٹریکر' : 'Membership tracker'}
            </div>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
            <Dumbbell className="h-7 w-7" />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-3">
        {MEMBERS.map((m, i) => {
          const expiring = m.daysLeft <= 7;
          return (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl',
                expiring ? 'bg-red-50 dark:bg-red-950/30 ring-1 ring-inset ring-red-200 dark:ring-red-800' : 'bg-ink-50 dark:bg-ink-900',
              )}
            >
              <div className={cn(
                'h-11 w-11 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm shrink-0',
                PLAN_COLORS[m.plan]
              )}>
                {m.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className={cn('font-bold text-sm', isUr && 'font-urdu text-base')}>{m.name}</div>
                  <div className={cn(
                    'text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-gradient-to-r text-white',
                    PLAN_COLORS[m.plan]
                  )}>
                    {m.plan}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-ink-500 mt-0.5">
                  <span className="flex items-center gap-1"><CalendarCheck className="h-3 w-3" /> {m.checkIns}</span>
                  <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {m.streak} {isUr ? 'دن' : 'day'}</span>
                </div>
              </div>
              <div className="text-right">
                <div className={cn(
                  'font-display font-extrabold text-2xl tabular-nums',
                  expiring ? 'text-red-600' : 'text-cyan-700',
                )}>
                  {m.daysLeft}
                </div>
                <div className={cn('text-[10px] font-bold uppercase text-ink-500', isUr && 'font-urdu text-xs')}>
                  {isUr ? 'دن' : 'days'}
                </div>
              </div>
            </motion.div>
          );
        })}

        <div className={cn('flex items-center gap-1.5 text-xs text-ink-500 pt-2', isUr && 'font-urdu text-sm')}>
          <Users className="h-3 w-3" />
          {isUr ? 'نفع خود بخود تجدید کی یاد دہانی بھیجتا ہے' : 'Nafaa auto-sends renewal reminders 7 days before expiry'}
        </div>
      </div>
    </div>
  );
}
