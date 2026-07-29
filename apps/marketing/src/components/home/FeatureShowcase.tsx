'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ArrowRight, Zap, Package, BookOpen, Building2, Sparkles, Landmark } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Button } from '@/components/primitives/Button';
import { fadeUp, staggerContainer, viewport } from '@/lib/motion/presets';
import { cn } from '@/lib/cn';

const tabs = [
  {
    id: 'pos',
    icon: Zap,
    labelEn: 'Point of Sale',
    labelUr: 'پوائنٹ آف سیل',
    color: '#12b76a',
    bgGradient: 'from-brand-500/20 via-emerald-500/10 to-transparent',
    titleEn: 'Blazing-fast checkout that never stops',
    titleUr: 'برق رفتار چیک آؤٹ جو کبھی نہیں رکتا',
    descEn: 'Barcode scanning, multiple payment methods, offline mode, and customer displays — all working together at counter speed.',
    descUr: 'بار کوڈ اسکیننگ، متعدد ادائیگی طریقے، آف لائن موڈ، اور گاہک ڈسپلے — سب کاؤنٹر کی رفتار سے۔',
    bullets: [
      { en: 'Under three seconds per transaction', ur: 'ہر لین دین تین سیکنڈ سے کم میں' },
      { en: 'Works fully offline, syncs when online', ur: 'مکمل آف لائن کام، آن لائن آنے پر ہم آہنگ' },
      { en: 'JazzCash, Easypaisa, Raast, cards', ur: 'جاز کیش، ایزی پیسہ، راست، کارڈز' },
      { en: 'Custom receipts via WhatsApp or print', ur: 'واٹس ایپ یا پرنٹ رسیدیں' },
    ],
    slug: '/product/pos',
  },
  {
    id: 'inventory',
    icon: Package,
    labelEn: 'Inventory',
    labelUr: 'انوینٹری',
    color: '#8b5cf6',
    bgGradient: 'from-aurora-purple/20 via-purple-500/10 to-transparent',
    titleEn: 'Every item tracked, every unit unified',
    titleUr: 'ہر آئٹم ٹریک، ہر یونٹ متحد',
    descEn: 'Multi-unit pricing, batch and expiry tracking, IMEI serial numbers, and even square-foot inventory for carpets — all in one place.',
    descUr: 'متعدد یونٹ قیمتیں، بیچ اور ایکسپائری ٹریکنگ، آئی ایم ای آئی، اور قالین کے لیے مربع فٹ انوینٹری۔',
    bullets: [
      { en: 'Bulk import from Excel or CSV', ur: 'ایکسل یا سی ایس وی سے بلک امپورٹ' },
      { en: 'Automatic low-stock alerts', ur: 'خودکار کم اسٹاک الرٹس' },
      { en: 'Batch tracking with expiry dates', ur: 'ایکسپائری تاریخوں کے ساتھ بیچ ٹریکنگ' },
      { en: 'IMEI and serial number registers', ur: 'آئی ایم ای آئی اور سیریل رجسٹر' },
    ],
    slug: '/product/inventory',
  },
  {
    id: 'khata',
    icon: BookOpen,
    labelEn: 'Digital Khata',
    labelUr: 'ڈجیٹل کھاتہ',
    color: '#0284c7',
    bgGradient: 'from-trust/20 via-blue-500/10 to-transparent',
    titleEn: 'The paper register, retired forever',
    titleUr: 'کاغذی رجسٹر، ہمیشہ کے لیے ختم',
    descEn: 'Track every udhaar with automated WhatsApp reminders, PDF statements, and instant balance lookup. Recovered rupees, guaranteed.',
    descUr: 'خودکار واٹس ایپ یاد دہانیوں، پی ڈی ایف اسٹیٹمنٹس، اور فوری بیلنس چیک کے ساتھ ہر ادھار ٹریک کریں۔',
    bullets: [
      { en: 'Automated WhatsApp reminders', ur: 'خودکار واٹس ایپ یاد دہانیاں' },
      { en: 'Customer PDF statements on demand', ur: 'مطلوبہ وقت پر پی ڈی ایف اسٹیٹمنٹ' },
      { en: 'Credit limits and overdue tracking', ur: 'ادھار حد اور بقایاجات ٹریکنگ' },
      { en: 'Bilingual ledger, English and Urdu', ur: 'دو لسانی کھاتہ، انگریزی و اردو' },
    ],
    slug: '/product/khata',
  },
  {
    id: 'multi-shop',
    icon: Building2,
    labelEn: 'Multi-Shop',
    labelUr: 'متعدد دکانیں',
    color: '#f97316',
    bgGradient: 'from-sunset/20 via-orange-500/10 to-transparent',
    titleEn: 'One dashboard, unlimited locations',
    titleUr: 'ایک ڈیش بورڈ، لامحدود مقامات',
    descEn: 'Manage two shops or two hundred. Consolidated reports, shop-to-shop transfers, role-based staff access, and centralized inventory.',
    descUr: 'دو دکانیں یا دو سو۔ متحد رپورٹس، شاپ ٹو شاپ ٹرانسفر، اور مرکزی انوینٹری۔',
    bullets: [
      { en: 'Consolidated multi-shop reports', ur: 'متحد ملٹی شاپ رپورٹس' },
      { en: 'Stock transfers between shops', ur: 'دکانوں کے درمیان ٹرانسفر' },
      { en: 'Per-shop pricing and stock levels', ur: 'ہر دکان کی الگ قیمت اور اسٹاک' },
      { en: 'Role-based access for every shop', ur: 'ہر دکان کے لیے علیحدہ رول' },
    ],
    slug: '/product/multi-shop',
  },
  {
    id: 'fbr',
    icon: Landmark,
    labelEn: 'FBR Integration',
    labelUr: 'ایف بی آر انضمام',
    color: '#01411c',
    bgGradient: 'from-pk-green/20 via-emerald-700/10 to-transparent',
    titleEn: 'Real-time compliance, zero paperwork',
    titleUr: 'حقیقی وقت میں تعمیل، صفر کاغذی کارروائی',
    descEn: 'Automatic invoice reporting to the Federal Board of Revenue with QR verification, auto-retry, and full audit trail — approved and integrated.',
    descUr: 'ایف بی آر کو خودکار انوائس رپورٹنگ، کیو آر تصدیق، اور مکمل آڈٹ ٹریل۔',
    bullets: [
      { en: 'Real-time invoice submission', ur: 'حقیقی وقت میں انوائس جمع' },
      { en: 'QR code on every FBR receipt', ur: 'ہر ایف بی آر رسید پر کیو آر' },
      { en: 'Automatic retry on failed submissions', ur: 'ناکام جمع پر خودکار دوبارہ کوشش' },
      { en: 'Sandbox and production modes', ur: 'سینڈ باکس اور پروڈکشن موڈز' },
    ],
    slug: '/product/fbr',
  },
  {
    id: 'ai',
    icon: Sparkles,
    labelEn: 'AI Assistant',
    labelUr: 'اے آئی معاون',
    color: '#8b5cf6',
    bgGradient: 'from-aurora-purple/20 via-aurora-pink/10 to-transparent',
    titleEn: 'Ask anything, get answers instantly',
    titleUr: 'کچھ بھی پوچھیں، فوری جواب پائیں',
    descEn: 'Which product is my best-seller? What was last month\'s profit? Just ask in plain English or Urdu — our AI reads your business live.',
    descUr: 'میرا سب سے زیادہ بکنے والا آئٹم کیا ہے؟ عام زبان میں پوچھیں — ہماری اے آئی جواب دے گی۔',
    bullets: [
      { en: 'Natural language queries in EN and UR', ur: 'انگریزی و اردو میں سوالات' },
      { en: 'Voice and text input', ur: 'آواز اور متن دونوں' },
      { en: 'Automated business insights', ur: 'خودکار کاروباری بصیرت' },
      { en: 'Personalized recommendations', ur: 'ذاتی سفارشات' },
    ],
    slug: '/product/ai-assistant',
  },
];

export function FeatureShowcase() {
  const { t, locale } = useLocale();
  const [active, setActive] = useState(tabs[0].id);
  const isUr = locale === 'ur';
  const current = tabs.find((t) => t.id === active)!;

  return (
    <Section variant="default" spacing="lg">
      <Container>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          variants={staggerContainer(0.06)}
          className="text-center max-w-3xl mx-auto mb-14"
        >
          <motion.div variants={fadeUp}>
            <Eyebrow variant="brand">{isUr ? 'مکمل ٹول کٹ' : 'The complete toolkit'}</Eyebrow>
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className={cn(
              'mt-4 font-display font-extrabold text-3xl lg:text-5xl tracking-tight text-balance',
              isUr && 'font-urdu leading-snug',
            )}
          >
            {t('features.title')}
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className={cn(
              'mt-4 text-lg lg:text-xl text-ink-600 dark:text-ink-300',
              isUr && 'font-urdu text-xl leading-loose',
            )}
          >
            {t('features.subtitle')}
          </motion.p>
        </motion.div>

        {/* Tab pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === active;
            return (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className={cn(
                  'inline-flex items-center gap-2 px-4 h-11 rounded-full font-semibold text-sm',
                  'transition-all duration-300 ease-out-expo',
                  'ring-1 ring-inset',
                  isActive
                    ? 'bg-ink-900 dark:bg-white text-white dark:text-ink-900 ring-ink-900 dark:ring-white shadow-lg'
                    : 'bg-white dark:bg-ink-800 text-ink-700 dark:text-ink-200 ring-ink-200 dark:ring-ink-700 hover:ring-ink-300 dark:hover:ring-ink-600',
                  isUr && 'font-urdu text-base',
                )}
              >
                <Icon className="h-4 w-4" style={{ color: isActive ? undefined : tab.color }} />
                {isUr ? tab.labelUr : tab.labelEn}
              </button>
            );
          })}
        </div>

        {/* Active panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative rounded-3xl overflow-hidden ring-1 ring-inset ring-ink-100 dark:ring-ink-800 bg-white dark:bg-ink-800"
          >
            <div className={cn('absolute inset-0 bg-gradient-to-br opacity-70', current.bgGradient)} />
            <div className="relative grid lg:grid-cols-2 gap-8 p-8 lg:p-12">
              {/* Left copy */}
              <div>
                <div
                  className="inline-flex h-14 w-14 rounded-2xl items-center justify-center shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${current.color}, ${current.color}dd)` }}
                >
                  <current.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className={cn(
                  'mt-6 font-display font-extrabold text-2xl lg:text-4xl tracking-tight text-ink-900 dark:text-white text-balance',
                  isUr && 'font-urdu leading-snug',
                )}>
                  {isUr ? current.titleUr : current.titleEn}
                </h3>
                <p className={cn(
                  'mt-4 text-lg text-ink-600 dark:text-ink-300 leading-relaxed',
                  isUr && 'font-urdu text-xl leading-loose',
                )}>
                  {isUr ? current.descUr : current.descEn}
                </p>
                <ul className="mt-6 space-y-3">
                  {current.bullets.map((b, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-start gap-3"
                    >
                      <span
                        className="mt-1 h-5 w-5 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: current.color + '25', color: current.color }}
                      >
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      <span className={cn('text-ink-700 dark:text-ink-200', isUr && 'font-urdu text-lg')}>
                        {isUr ? b.ur : b.en}
                      </span>
                    </motion.li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Button
                    href={current.slug}
                    variant="secondary"
                    rightIcon={<ArrowRight className="h-4 w-4" />}
                  >
                    {isUr ? 'مزید جانیں' : 'Explore this feature'}
                  </Button>
                </div>
              </div>

              {/* Right visual — abstract animated */}
              <div className="relative min-h-[320px] lg:min-h-[480px] rounded-2xl overflow-hidden">
                <div
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${current.color}30 0%, transparent 60%), radial-gradient(circle at 70% 70%, ${current.color}20 0%, transparent 60%)`,
                  }}
                />
                <div className="relative h-full flex items-center justify-center p-8">
                  {/* Animated icon composition */}
                  <div className="relative">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-0 rounded-full border-2 border-dashed opacity-30"
                      style={{ borderColor: current.color, width: 320, height: 320, marginLeft: -160, marginTop: -160 }}
                    />
                    <motion.div
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="relative rounded-3xl flex items-center justify-center shadow-2xl"
                      style={{
                        width: 200,
                        height: 200,
                        background: `linear-gradient(135deg, ${current.color}, ${current.color}dd)`,
                      }}
                    >
                      <current.icon className="h-20 w-20 text-white" strokeWidth={1.2} />
                    </motion.div>
                    {/* Orbiting dots */}
                    {[0, 90, 180, 270].map((angle, i) => (
                      <motion.div
                        key={i}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: 'linear', delay: i * 0.2 }}
                        className="absolute top-1/2 left-1/2"
                      >
                        <div
                          className="h-4 w-4 rounded-full shadow-lg"
                          style={{
                            background: current.color,
                            transform: `rotate(${angle}deg) translateX(180px) translateY(-8px)`,
                          }}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </Container>
    </Section>
  );
}
