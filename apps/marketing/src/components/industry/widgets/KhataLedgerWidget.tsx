'use client';

import { motion } from 'framer-motion';
import { BookOpen, MessageCircle, TrendingUp, Users } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { cn } from '@/lib/cn';

const CUSTOMERS = [
  { name: 'Ahmed Bhai', nameUr: 'احمد بھائی', due: 12400, days: 3, phone: '0300' },
  { name: 'Bilal Kirana', nameUr: 'بلال کریانہ', due: 8750, days: 7, phone: '0321' },
  { name: 'Chaudhry Sahib', nameUr: 'چوہدری صاحب', due: 24500, days: 14, phone: '0333' },
  { name: 'Fatima Baji', nameUr: 'فاطمہ باجی', due: 3200, days: 2, phone: '0345' },
];

export function KhataLedgerWidget() {
  const { locale } = useLocale();
  const isUr = locale === 'ur';
  const totalDue = CUSTOMERS.reduce((s, c) => s + c.due, 0);

  return (
    <div className="rounded-3xl bg-white dark:bg-ink-800 shadow-2xl ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 overflow-hidden">
      <div className="relative p-6 text-white overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #059669, #14532d)' }}
      >
        <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className={cn('text-[10px] font-mono uppercase tracking-widest font-bold text-white/90', isUr && 'font-urdu text-xs')}>
              {isUr ? 'ڈیجیٹل کھاتہ' : 'Digital khata'}
            </div>
            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <div className={cn('text-white/80 text-xs mb-1', isUr && 'font-urdu text-sm')}>
            {isUr ? 'کل بقایا ادھار' : 'Total outstanding'}
          </div>
          <div className={cn('font-display font-extrabold text-4xl tabular-nums', isUr && 'font-urdu')}>
            ₨ {totalDue.toLocaleString()}
          </div>
          <div className={cn('flex items-center gap-2 mt-2 text-xs text-white/90', isUr && 'font-urdu text-sm')}>
            <Users className="h-3 w-3" />
            {CUSTOMERS.length} {isUr ? 'گاہک' : 'customers'}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-3">
        {CUSTOMERS.map((c, i) => (
          <motion.div
            key={c.name}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-ink-50 dark:bg-ink-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors group"
          >
            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-bold text-sm">
              {c.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className={cn('font-bold text-sm', isUr && 'font-urdu text-base')}>
                {isUr ? c.nameUr : c.name}
              </div>
              <div className="text-xs text-ink-500">
                {c.days} {isUr ? 'دن پہلے' : 'days ago'}
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                ₨ {c.due.toLocaleString()}
              </div>
              <button className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                <MessageCircle className="h-2.5 w-2.5" />
                WhatsApp
              </button>
            </div>
          </motion.div>
        ))}

        <div className={cn('flex items-center gap-1.5 text-xs text-ink-500 pt-2', isUr && 'font-urdu text-sm')}>
          <TrendingUp className="h-3 w-3" />
          {isUr ? 'نفع خود بخود WhatsApp پر یاد دہانی بھیجتا ہے' : 'Nafaa auto-sends WhatsApp payment reminders'}
        </div>
      </div>
    </div>
  );
}
