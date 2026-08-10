'use client';

import { motion } from 'framer-motion';
import { Check, X, Minus, Sparkles } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { fadeUp, staggerContainer, viewport } from '@/lib/motion/presets';
import type { Industry } from '@/lib/data/industries';
import { cn } from '@/lib/cn';

// Industry-specific comparison rows
const COMPARISON_ROWS: Record<string, Array<{ en: string; ur: string; excel: 'no' | 'partial' | 'yes'; generic: 'no' | 'partial' | 'yes'; nafaa: 'no' | 'partial' | 'yes' }>> = {
  jewelry: [
    { en: 'Live gold rate integration', ur: 'براہ راست سونے کی شرح', excel: 'no', generic: 'no', nafaa: 'yes' },
    { en: '24k / 22k / 21k / 18k auto-conversion', ur: 'کیریٹ خودکار تبدیلی', excel: 'no', generic: 'no', nafaa: 'yes' },
    { en: 'Making charges + GST auto-calc', ur: 'مزدوری + جی ایس ٹی خودکار', excel: 'partial', generic: 'no', nafaa: 'yes' },
    { en: 'Weight-based inventory', ur: 'وزن کی بنیاد پر اسٹاک', excel: 'partial', generic: 'no', nafaa: 'yes' },
    { en: 'FBR e-invoicing', ur: 'ایف بی آر ای-انوائسنگ', excel: 'no', generic: 'partial', nafaa: 'yes' },
    { en: 'Urdu invoice printing', ur: 'اردو میں بل', excel: 'no', generic: 'no', nafaa: 'yes' },
  ],
  pharmacy: [
    { en: 'Batch & expiry tracking', ur: 'بیچ اور معیاد', excel: 'partial', generic: 'partial', nafaa: 'yes' },
    { en: 'DRAP compliance reports', ur: 'ڈریپ رپورٹنگ', excel: 'no', generic: 'no', nafaa: 'yes' },
    { en: 'Prescription upload & history', ur: 'نسخہ اپلوڈ + ہسٹری', excel: 'no', generic: 'no', nafaa: 'yes' },
    { en: 'Auto expiry alerts (SMS)', ur: 'خودکار انتباہ SMS', excel: 'no', generic: 'no', nafaa: 'yes' },
    { en: 'Salt/generic search', ur: 'نمکیات کی تلاش', excel: 'no', generic: 'partial', nafaa: 'yes' },
    { en: 'Controlled substance log', ur: 'کنٹرول شدہ ادویات لاگ', excel: 'partial', generic: 'no', nafaa: 'yes' },
  ],
  restaurant: [
    { en: 'Kitchen Order Tickets (KOT)', ur: 'کچن آرڈر ٹکٹ', excel: 'no', generic: 'partial', nafaa: 'yes' },
    { en: 'Table-wise billing', ur: 'میز کے حساب سے بل', excel: 'no', generic: 'partial', nafaa: 'yes' },
    { en: 'Modifiers (spicy, no onion)', ur: 'آرڈر میں تبدیلی', excel: 'no', generic: 'no', nafaa: 'yes' },
    { en: 'Foodpanda + Careem integration', ur: 'فوڈ پانڈا + کریم انٹیگریشن', excel: 'no', generic: 'no', nafaa: 'yes' },
    { en: 'Split bills + tips', ur: 'بل تقسیم + ٹپ', excel: 'no', generic: 'partial', nafaa: 'yes' },
    { en: 'Waiter/table performance', ur: 'ویٹر کی کارکردگی', excel: 'no', generic: 'no', nafaa: 'yes' },
  ],
  kiryana: [
    { en: 'Digital khata (udhar ledger)', ur: 'ڈیجیٹل کھاتہ', excel: 'partial', generic: 'no', nafaa: 'yes' },
    { en: 'WhatsApp payment reminders', ur: 'WhatsApp یاد دہانی', excel: 'no', generic: 'no', nafaa: 'yes' },
    { en: 'Loose weight items', ur: 'کھلا وزن آئٹمز', excel: 'partial', generic: 'partial', nafaa: 'yes' },
    { en: 'Urdu barcode labels', ur: 'اردو بارکوڈ لیبلز', excel: 'no', generic: 'no', nafaa: 'yes' },
    { en: 'Multi-shop sync', ur: 'کئی دکانیں سنک', excel: 'no', generic: 'partial', nafaa: 'yes' },
    { en: 'Offline mode', ur: 'آف لائن موڈ', excel: 'yes', generic: 'partial', nafaa: 'yes' },
  ],
  carpet: [
    { en: 'Sell by sq. ft / sq. m', ur: 'مربع فٹ / میٹر', excel: 'partial', generic: 'no', nafaa: 'yes' },
    { en: 'Roll-cut inventory', ur: 'رول کٹنگ اسٹاک', excel: 'no', generic: 'no', nafaa: 'yes' },
    { en: 'Wastage tracking', ur: 'ضیاع کا حساب', excel: 'no', generic: 'no', nafaa: 'yes' },
    { en: 'Design pattern catalog', ur: 'ڈیزائن کیٹلاگ', excel: 'no', generic: 'partial', nafaa: 'yes' },
    { en: 'Origin tracking (Iran, Turkey)', ur: 'اصل ملک ٹریکنگ', excel: 'partial', generic: 'no', nafaa: 'yes' },
    { en: 'Custom size orders', ur: 'کسٹم سائز آرڈر', excel: 'no', generic: 'no', nafaa: 'yes' },
  ],
  garments: [
    { en: 'Size × Color matrix', ur: 'سائز × رنگ میٹرکس', excel: 'partial', generic: 'partial', nafaa: 'yes' },
    { en: 'Barcode per variant', ur: 'ہر ویریئنٹ بارکوڈ', excel: 'no', generic: 'partial', nafaa: 'yes' },
    { en: 'Season & collection tags', ur: 'موسم اور کلیکشن', excel: 'no', generic: 'no', nafaa: 'yes' },
    { en: 'Fitting room tracker', ur: 'فٹنگ روم ٹریکر', excel: 'no', generic: 'no', nafaa: 'yes' },
    { en: 'Fabric supplier ledger', ur: 'کپڑا سپلائر کھاتہ', excel: 'partial', generic: 'no', nafaa: 'yes' },
    { en: 'Return & exchange workflow', ur: 'واپسی اور تبادلہ', excel: 'no', generic: 'partial', nafaa: 'yes' },
  ],
  'mobile-shop': [
    { en: 'IMEI-based inventory', ur: 'IMEI اسٹاک', excel: 'no', generic: 'no', nafaa: 'yes' },
    { en: 'Warranty auto-tracking', ur: 'وارنٹی خودکار', excel: 'no', generic: 'no', nafaa: 'yes' },
    { en: 'Repair job cards', ur: 'ریپیئر جاب کارڈ', excel: 'no', generic: 'no', nafaa: 'yes' },
    { en: 'Trade-in valuation', ur: 'ٹریڈ-ان قدر', excel: 'partial', generic: 'no', nafaa: 'yes' },
    { en: 'PTA compliance check', ur: 'PTA چیک', excel: 'no', generic: 'no', nafaa: 'yes' },
    { en: 'EMI & installment plans', ur: 'قسطیں', excel: 'partial', generic: 'partial', nafaa: 'yes' },
  ],
  salon: [
    { en: 'Appointment scheduling', ur: 'اپائنٹمنٹ شیڈولنگ', excel: 'partial', generic: 'partial', nafaa: 'yes' },
    { en: 'Stylist commission tracker', ur: 'اسٹائلسٹ کمیشن', excel: 'partial', generic: 'no', nafaa: 'yes' },
    { en: 'Package & membership sales', ur: 'پیکج اور ممبرشپ', excel: 'no', generic: 'no', nafaa: 'yes' },
    { en: 'Product retail alongside services', ur: 'مصنوعات + سروسز', excel: 'no', generic: 'partial', nafaa: 'yes' },
    { en: 'WhatsApp appointment reminders', ur: 'WhatsApp یاد دہانی', excel: 'no', generic: 'no', nafaa: 'yes' },
    { en: 'Client history & preferences', ur: 'کلائنٹ ہسٹری', excel: 'no', generic: 'no', nafaa: 'yes' },
  ],
  bakery: [
    { en: 'Recipe-based inventory (BOM)', ur: 'ریسیپی بیسڈ اسٹاک', excel: 'no', generic: 'no', nafaa: 'yes' },
    { en: 'Auto-deduct raw materials', ur: 'خام مال خودکار کم', excel: 'no', generic: 'no', nafaa: 'yes' },
    { en: 'Custom cake order forms', ur: 'کسٹم کیک آرڈر', excel: 'partial', generic: 'no', nafaa: 'yes' },
    { en: 'Daily production planning', ur: 'روزانہ پیداوار پلاننگ', excel: 'partial', generic: 'no', nafaa: 'yes' },
    { en: 'Wastage & shrinkage log', ur: 'ضیاع کا حساب', excel: 'no', generic: 'no', nafaa: 'yes' },
    { en: 'Multi-outlet distribution', ur: 'کئی آؤٹ لیٹ', excel: 'no', generic: 'partial', nafaa: 'yes' },
  ],
  gym: [
    { en: 'Membership expiry tracker', ur: 'ممبرشپ معیاد', excel: 'partial', generic: 'partial', nafaa: 'yes' },
    { en: 'Check-in / attendance', ur: 'حاضری', excel: 'partial', generic: 'no', nafaa: 'yes' },
    { en: 'Trainer commission', ur: 'ٹرینر کمیشن', excel: 'partial', generic: 'no', nafaa: 'yes' },
    { en: 'Auto renewal reminders', ur: 'خودکار یاد دہانی', excel: 'no', generic: 'no', nafaa: 'yes' },
    { en: 'Freeze / pause membership', ur: 'ممبرشپ روکنا', excel: 'no', generic: 'no', nafaa: 'yes' },
    { en: 'Personal training packages', ur: 'ذاتی ٹریننگ', excel: 'no', generic: 'no', nafaa: 'yes' },
  ],
};

// Default fallback comparison
const DEFAULT_ROWS = [
  { en: 'Industry-specific workflow', ur: 'صنعت کے مطابق ورک فلو', excel: 'no', generic: 'partial', nafaa: 'yes' },
  { en: 'Urdu language support', ur: 'اردو زبان', excel: 'no', generic: 'no', nafaa: 'yes' },
  { en: 'FBR e-invoicing integration', ur: 'ایف بی آر ای-انوائسنگ', excel: 'no', generic: 'partial', nafaa: 'yes' },
  { en: 'WhatsApp notifications', ur: 'WhatsApp نوٹیفکیشن', excel: 'no', generic: 'no', nafaa: 'yes' },
  { en: 'Multi-shop management', ur: 'کئی دکانیں', excel: 'no', generic: 'partial', nafaa: 'yes' },
  { en: 'Real-time analytics', ur: 'براہ راست اعداد و شمار', excel: 'no', generic: 'partial', nafaa: 'yes' },
] as const;

function Cell({ status }: { status: 'no' | 'partial' | 'yes' }) {
  if (status === 'yes') return (
    <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600">
      <Check className="h-4 w-4" strokeWidth={3} />
    </div>
  );
  if (status === 'partial') return (
    <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600">
      <Minus className="h-4 w-4" strokeWidth={3} />
    </div>
  );
  return (
    <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-red-100 dark:bg-red-950 text-red-600">
      <X className="h-4 w-4" strokeWidth={3} />
    </div>
  );
}

export function IndustryComparison({ industry }: { industry: Industry }) {
  const { locale } = useLocale();
  const isUr = locale === 'ur';
  const rows = COMPARISON_ROWS[industry.slug] ?? DEFAULT_ROWS;

  return (
    <Section variant="default" spacing="lg" className="relative overflow-hidden">
      <div className="absolute inset-0" style={{
        background: `linear-gradient(135deg, ${industry.color}05, transparent 60%)`,
      }} />

      <Container className="relative">
        <motion.div
          initial="hidden" whileInView="visible" viewport={viewport}
          variants={staggerContainer(0.06)}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <motion.div variants={fadeUp}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-widest font-bold ring-1 ring-inset"
            style={{
              color: industry.color,
              background: `${industry.color}10`,
              boxShadow: `0 0 0 1px ${industry.color}30 inset`,
            }}
          >
            {isUr ? 'موازنہ' : 'Head-to-head'}
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className={cn(
              'mt-4 font-display font-extrabold text-3xl lg:text-5xl tracking-tight text-balance',
              isUr && 'font-urdu leading-snug',
            )}
          >
            {isUr
              ? `کیوں ${industry.nameUr} کے لیے نفع؟`
              : `Why Nafaa for ${industry.nameEn.toLowerCase()}?`}
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className={cn(
              'mt-4 text-lg text-ink-600 dark:text-ink-300',
              isUr && 'font-urdu text-xl leading-loose',
            )}
          >
            {isUr
              ? 'ایکسل، عام پی او ایس، اور نفع کا سائیڈ-بائے-سائیڈ موازنہ'
              : 'Excel, generic POS, and Nafaa — feature-by-feature comparison'}
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ duration: 0.5 }}
          className="rounded-3xl bg-white dark:bg-ink-800 shadow-2xl overflow-hidden ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60"
        >
          {/* Header */}
          <div className="grid grid-cols-4 items-center border-b border-ink-100 dark:border-ink-700">
            <div className={cn('p-4 lg:p-6', isUr && 'font-urdu')} />
            <div className="p-4 lg:p-6 text-center border-l border-ink-100 dark:border-ink-700">
              <div className={cn('text-xs font-bold uppercase tracking-widest text-ink-500 mb-1', isUr && 'font-urdu text-sm')}>
                Excel
              </div>
              <div className={cn('font-display font-bold text-sm text-ink-700 dark:text-ink-300', isUr && 'font-urdu text-base')}>
                {isUr ? 'ایکسل' : 'Spreadsheets'}
              </div>
            </div>
            <div className="p-4 lg:p-6 text-center border-l border-ink-100 dark:border-ink-700">
              <div className={cn('text-xs font-bold uppercase tracking-widest text-ink-500 mb-1', isUr && 'font-urdu text-sm')}>
                Generic
              </div>
              <div className={cn('font-display font-bold text-sm text-ink-700 dark:text-ink-300', isUr && 'font-urdu text-base')}>
                {isUr ? 'عام پی او ایس' : 'Generic POS'}
              </div>
            </div>
            <div
              className="p-4 lg:p-6 text-center border-l relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${industry.color}, ${industry.colorDark})`,
                borderColor: 'transparent',
              }}
            >
              <div className="absolute top-1 right-1">
                <Sparkles className="h-3 w-3 text-white/70" />
              </div>
              <div className={cn('text-xs font-bold uppercase tracking-widest text-white/80 mb-1', isUr && 'font-urdu text-sm')}>
                {isUr ? 'تجویز کردہ' : 'Recommended'}
              </div>
              <div className={cn('font-display font-extrabold text-lg text-white', isUr && 'font-urdu text-xl')}>
                Nafaa
              </div>
            </div>
          </div>

          {/* Rows */}
          {rows.map((row, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={viewport}
              transition={{ delay: i * 0.03 }}
              className={cn(
                'grid grid-cols-4 items-center border-b border-ink-100 dark:border-ink-700 last:border-b-0',
                i % 2 === 1 && 'bg-ink-50/50 dark:bg-ink-900/30',
              )}
            >
              <div className={cn('p-4 lg:p-6 text-sm font-bold text-ink-800 dark:text-ink-100', isUr && 'font-urdu text-base')}>
                {isUr ? row.ur : row.en}
              </div>
              <div className="p-3 text-center border-l border-ink-100 dark:border-ink-700">
                <Cell status={row.excel} />
              </div>
              <div className="p-3 text-center border-l border-ink-100 dark:border-ink-700">
                <Cell status={row.generic} />
              </div>
              <div
                className="p-3 text-center border-l"
                style={{
                  background: `${industry.color}08`,
                  borderColor: `${industry.color}20`,
                }}
              >
                <Cell status={row.nafaa} />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-ink-500">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-3 w-3" strokeWidth={3} />
            </div>
            <span className={cn(isUr && 'font-urdu text-sm')}>{isUr ? 'مکمل' : 'Full support'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-100 text-amber-600">
              <Minus className="h-3 w-3" strokeWidth={3} />
            </div>
            <span className={cn(isUr && 'font-urdu text-sm')}>{isUr ? 'جزوی' : 'Partial / manual'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-100 text-red-600">
              <X className="h-3 w-3" strokeWidth={3} />
            </div>
            <span className={cn(isUr && 'font-urdu text-sm')}>{isUr ? 'دستیاب نہیں' : 'Not available'}</span>
          </div>
        </div>
      </Container>
    </Section>
  );
}
