'use client';

import { motion } from 'framer-motion';
import { Scissors, Clock, User, Sparkles } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { LiveDot } from '@/components/primitives/LiveDot';
import { cn } from '@/lib/cn';

const APPOINTMENTS = [
  { time: '10:00', client: 'Ayesha K.', clientUr: 'عائشہ ک.', service: 'Bridal Package', staff: 'Naila', duration: 180, color: 'from-pink-500 to-rose-600', status: 'in-progress' },
  { time: '11:30', client: 'Fatima R.', clientUr: 'فاطمہ ر.', service: 'Hair Color + Cut', staff: 'Sana', duration: 120, color: 'from-purple-500 to-fuchsia-600', status: 'confirmed' },
  { time: '13:00', client: 'Zara M.', clientUr: 'زارا م.', service: 'Facial + Manicure', staff: 'Hina', duration: 90, color: 'from-amber-500 to-orange-600', status: 'confirmed' },
  { time: '15:00', client: 'Sadia H.', clientUr: 'سعدیہ ح.', service: 'Threading', staff: 'Naila', duration: 30, color: 'from-emerald-500 to-teal-600', status: 'pending' },
];

export function SalonAppointmentWidget() {
  const { locale } = useLocale();
  const isUr = locale === 'ur';

  return (
    <div className="rounded-3xl bg-white dark:bg-ink-800 shadow-2xl ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 overflow-hidden">
      <div className="relative p-6 text-white overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #ec4899, #86198f)' }}
      >
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <LiveDot color="emerald" size="sm" />
              <div className={cn('text-[10px] font-mono uppercase tracking-widest font-bold text-white/90', isUr && 'font-urdu text-xs')}>
                {isUr ? 'آج کے اپائنٹمنٹ' : "Today's schedule"}
              </div>
            </div>
            <div className={cn('font-display font-extrabold text-2xl', isUr && 'font-urdu text-3xl')}>
              {APPOINTMENTS.length} {isUr ? 'بکنگز' : 'bookings'}
            </div>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
            <Scissors className="h-7 w-7" />
          </div>
        </div>
      </div>

      <div className="p-6 space-y-3">
        {APPOINTMENTS.map((a, i) => (
          <motion.div
            key={a.time}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="flex gap-3"
          >
            {/* Time column */}
            <div className="w-16 shrink-0 text-right">
              <div className={cn('font-display font-extrabold text-lg tabular-nums', a.status === 'in-progress' && 'text-pink-600')}>
                {a.time}
              </div>
              <div className={cn('text-[10px] text-ink-500 font-bold', isUr && 'font-urdu text-xs')}>
                {a.duration}m
              </div>
            </div>

            {/* Card */}
            <div className={cn(
              'flex-1 rounded-xl p-4 relative overflow-hidden',
              'bg-gradient-to-br shadow-lg text-white',
              a.color,
              a.status === 'pending' && 'opacity-70',
            )}>
              {a.status === 'in-progress' && (
                <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest bg-white/25 backdrop-blur px-1.5 py-0.5 rounded">
                  <LiveDot color="emerald" size="sm" />
                  {isUr ? 'جاری' : 'Live'}
                </div>
              )}
              <div className="flex items-center gap-2 mb-1">
                <User className="h-3.5 w-3.5" />
                <div className={cn('font-bold text-sm', isUr && 'font-urdu text-base')}>
                  {isUr ? a.clientUr : a.client}
                </div>
              </div>
              <div className={cn('flex items-center gap-1.5 text-sm font-bold', isUr && 'font-urdu text-base')}>
                <Sparkles className="h-3.5 w-3.5" />
                {a.service}
              </div>
              <div className={cn('mt-2 text-xs text-white/80 flex items-center gap-1.5', isUr && 'font-urdu text-sm')}>
                <Scissors className="h-3 w-3" />
                {isUr ? 'اسٹائلسٹ:' : 'Stylist:'} {a.staff}
              </div>
            </div>
          </motion.div>
        ))}

        <div className={cn('flex items-center gap-1.5 text-xs text-ink-500 pt-2', isUr && 'font-urdu text-sm')}>
          <Clock className="h-3 w-3" />
          {isUr ? 'اسٹاف، سروسز، اور کمیشن سب ایک جگہ' : 'Staff scheduling, service tracking, and commission — all in one'}
        </div>
      </div>
    </div>
  );
}
