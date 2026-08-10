'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  ArrowRight,
  Zap,
  Package,
  BookOpen,
  Building2,
  Sparkles,
  Landmark,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Button } from '@/components/primitives/Button';
import { fadeUp, staggerContainer, viewport } from '@/lib/motion/presets';
import { cn } from '@/lib/cn';

interface Tab {
  id: string;
  icon: typeof Zap;
  labelEn: string;
  labelUr: string;
  color: string;
  bgGradient: string;
  titleEn: string;
  titleUr: string;
  descEn: string;
  descUr: string;
  bullets: { en: string; ur: string }[];
  slug: string;
  liveStat: string;
  liveLabel: string;
  verifiedBadge: string;
  verifiedLabel: string;
  metricValue: string;
  metricLabel: string;
}

const tabs: Tab[] = [
  {
    id: 'pos',
    icon: Zap,
    labelEn: 'Point of Sale',
    labelUr: 'پوائنٹ آف سیل',
    color: '#12b76a',
    bgGradient: 'from-brand-500/20 via-emerald-500/10 to-transparent',
    titleEn: 'Blazing-fast checkout that never stops',
    titleUr: 'برق رفتار چیک آؤٹ جو کبھی نہیں رکتا',
    descEn:
      'Barcode scanning, multiple payment methods, offline mode, and customer displays — all working together at counter speed.',
    descUr:
      'بار کوڈ اسکیننگ، متعدد ادائیگی طریقے، آف لائن موڈ، اور گاہک ڈسپلے — سب کاؤنٹر کی رفتار سے۔',
    bullets: [
      { en: 'Under three seconds per transaction', ur: 'ہر لین دین تین سیکنڈ سے کم میں' },
      { en: 'Works fully offline, syncs when online', ur: 'مکمل آف لائن کام، آن لائن آنے پر ہم آہنگ' },
      { en: 'JazzCash, Easypaisa, Raast, cards', ur: 'جاز کیش، ایزی پیسہ، راست، کارڈز' },
      { en: 'Custom receipts via WhatsApp or print', ur: 'واٹس ایپ یا پرنٹ رسیدیں' },
    ],
    slug: '/product/pos',
    liveStat: '2.4s',
    liveLabel: 'avg checkout',
    verifiedBadge: 'PCI-DSS',
    verifiedLabel: 'Certified',
    metricValue: '99.99%',
    metricLabel: 'uptime',
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
    descEn:
      'Multi-unit pricing, batch and expiry tracking, IMEI serial numbers, and even square-foot inventory for carpets — all in one place.',
    descUr:
      'متعدد یونٹ قیمتیں، بیچ اور ایکسپائری ٹریکنگ، آئی ایم ای آئی، اور قالین کے لیے مربع فٹ انوینٹری۔',
    bullets: [
      { en: 'Bulk import from Excel or CSV', ur: 'ایکسل یا سی ایس وی سے بلک امپورٹ' },
      { en: 'Automatic low-stock alerts', ur: 'خودکار کم اسٹاک الرٹس' },
      { en: 'Batch tracking with expiry dates', ur: 'ایکسپائری تاریخوں کے ساتھ بیچ ٹریکنگ' },
      { en: 'IMEI and serial number registers', ur: 'آئی ایم ای آئی اور سیریل رجسٹر' },
    ],
    slug: '/product/inventory',
    liveStat: '12.8K',
    liveLabel: 'SKUs tracked',
    verifiedBadge: 'ISO 9001',
    verifiedLabel: 'Quality',
    metricValue: '0.02%',
    metricLabel: 'variance',
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
    descEn:
      'Track every udhaar with automated WhatsApp reminders, PDF statements, and instant balance lookup. Recovered rupees, guaranteed.',
    descUr:
      'خودکار واٹس ایپ یاد دہانیوں، پی ڈی ایف اسٹیٹمنٹس، اور فوری بیلنس چیک کے ساتھ ہر ادھار ٹریک کریں۔',
    bullets: [
      { en: 'Automated WhatsApp reminders', ur: 'خودکار واٹس ایپ یاد دہانیاں' },
      { en: 'Customer PDF statements on demand', ur: 'مطلوبہ وقت پر پی ڈی ایف اسٹیٹمنٹ' },
      { en: 'Credit limits and overdue tracking', ur: 'ادھار حد اور بقایاجات ٹریکنگ' },
      { en: 'Bilingual ledger, English and Urdu', ur: 'دو لسانی کھاتہ، انگریزی و اردو' },
    ],
    slug: '/product/khata',
    liveStat: 'Rs 4.2M',
    liveLabel: 'tracked live',
    verifiedBadge: 'Bank-grade',
    verifiedLabel: 'Encrypted',
    metricValue: '+38%',
    metricLabel: 'recovery',
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
    descEn:
      'Manage two shops or two hundred. Consolidated reports, shop-to-shop transfers, role-based staff access, and centralized inventory.',
    descUr:
      'دو دکانیں یا دو سو۔ متحد رپورٹس، شاپ ٹو شاپ ٹرانسفر، اور مرکزی انوینٹری۔',
    bullets: [
      { en: 'Consolidated multi-shop reports', ur: 'متحد ملٹی شاپ رپورٹس' },
      { en: 'Stock transfers between shops', ur: 'دکانوں کے درمیان ٹرانسفر' },
      { en: 'Per-shop pricing and stock levels', ur: 'ہر دکان کی الگ قیمت اور اسٹاک' },
      { en: 'Role-based access for every shop', ur: 'ہر دکان کے لیے علیحدہ رول' },
    ],
    slug: '/product/multi-shop',
    liveStat: '47',
    liveLabel: 'shops linked',
    verifiedBadge: 'SOC 2',
    verifiedLabel: 'Type II',
    metricValue: 'Real-time',
    metricLabel: 'sync',
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
    descEn:
      'Automatic invoice reporting to the Federal Board of Revenue with QR verification, auto-retry, and full audit trail — approved and integrated.',
    descUr:
      'ایف بی آر کو خودکار انوائس رپورٹنگ، کیو آر تصدیق، اور مکمل آڈٹ ٹریل۔',
    bullets: [
      { en: 'Real-time invoice submission', ur: 'حقیقی وقت میں انوائس جمع' },
      { en: 'QR code on every FBR receipt', ur: 'ہر ایف بی آر رسید پر کیو آر' },
      { en: 'Automatic retry on failed submissions', ur: 'ناکام جمع پر خودکار دوبارہ کوشش' },
      { en: 'Sandbox and production modes', ur: 'سینڈ باکس اور پروڈکشن موڈز' },
    ],
    slug: '/product/fbr',
    liveStat: '99.9%',
    liveLabel: 'submission rate',
    verifiedBadge: 'FBR',
    verifiedLabel: 'Approved',
    metricValue: '< 1s',
    metricLabel: 'to FBR',
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
    descEn:
      "Which product is my best-seller? What was last month's profit? Just ask in plain English or Urdu — our AI reads your business live.",
    descUr:
      'میرا سب سے زیادہ بکنے والا آئٹم کیا ہے؟ عام زبان میں پوچھیں — ہماری اے آئی جواب دے گی۔',
    bullets: [
      { en: 'Natural language queries in EN and UR', ur: 'انگریزی و اردو میں سوالات' },
      { en: 'Voice and text input', ur: 'آواز اور متن دونوں' },
      { en: 'Automated business insights', ur: 'خودکار کاروباری بصیرت' },
      { en: 'Personalized recommendations', ur: 'ذاتی سفارشات' },
    ],
    slug: '/product/ai-assistant',
    liveStat: 'GPT-4o',
    liveLabel: 'powered',
    verifiedBadge: 'E2E',
    verifiedLabel: 'Encrypted',
    metricValue: '0.8s',
    metricLabel: 'response',
  },
];

export function FeatureShowcase() {
  const { t, locale } = useLocale();
  const [active, setActive] = useState(tabs[0].id);
  const isUr = locale === 'ur';
  const current = tabs.find((tb) => tb.id === active)!;

  return (
    <Section variant="default" spacing="lg">
      <Container>
        {/* Header */}
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
              {/* ═══════════════ LEFT: COPY ═══════════════ */}
              <div>
                <div
                  className="inline-flex h-14 w-14 rounded-2xl items-center justify-center shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${current.color}, ${current.color}dd)` }}
                >
                  <current.icon className="h-7 w-7 text-white" />
                </div>
                <h3
                  className={cn(
                    'mt-6 font-display font-extrabold text-2xl lg:text-4xl tracking-tight text-ink-900 dark:text-white text-balance',
                    isUr && 'font-urdu leading-snug',
                  )}
                >
                  {isUr ? current.titleUr : current.titleEn}
                </h3>
                <p
                  className={cn(
                    'mt-4 text-lg text-ink-600 dark:text-ink-300 leading-relaxed',
                    isUr && 'font-urdu text-xl leading-loose',
                  )}
                >
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
                      <span
                        className={cn(
                          'text-ink-700 dark:text-ink-200',
                          isUr && 'font-urdu text-lg',
                        )}
                      >
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

              {/* ═══════════════ RIGHT: PREMIUM CINEMATIC VISUAL ═══════════════ */}
              <div className="relative min-h-[380px] lg:min-h-[540px] rounded-2xl overflow-hidden bg-gradient-to-br from-ink-50/50 to-white dark:from-ink-900/50 dark:to-ink-800/80">
                {/* Grid pattern with radial fade */}
                <div
                  className="absolute inset-0 opacity-[0.15] dark:opacity-[0.08]"
                  style={{
                    backgroundImage: `linear-gradient(${current.color}30 1px, transparent 1px), linear-gradient(90deg, ${current.color}30 1px, transparent 1px)`,
                    backgroundSize: '32px 32px',
                    maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 75%)',
                    WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 75%)',
                  }}
                />

                {/* Layered radial glows */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: `
                      radial-gradient(circle at 50% 50%, ${current.color}22 0%, transparent 55%),
                      radial-gradient(circle at 20% 20%, ${current.color}15 0%, transparent 45%),
                      radial-gradient(circle at 80% 80%, ${current.color}10 0%, transparent 50%)
                    `,
                  }}
                />

                {/* Main composition */}
                <div className="relative h-full flex items-center justify-center p-6">
                  <div className="relative" style={{ width: 360, height: 360 }}>
                    {/* Outer ring — dashed, slow rotate */}
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
                      className="absolute rounded-full border border-dashed"
                      style={{ borderColor: current.color + '55', inset: 0 }}
                    />

                    {/* Middle ring — solid faint, counter-rotate */}
                    <motion.div
                      animate={{ rotate: -360 }}
                      transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                      className="absolute rounded-full border-2"
                      style={{ borderColor: current.color + '30', inset: 40 }}
                    />

                    {/* Inner ring — conic gradient border (masked) */}
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                      className="absolute rounded-full"
                      style={{
                        inset: 80,
                        background: `conic-gradient(from 0deg, ${current.color}00, ${current.color}aa 25%, ${current.color}00 50%, ${current.color}aa 75%, ${current.color}00 100%)`,
                        padding: 2,
                        WebkitMask:
                          'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                        WebkitMaskComposite: 'xor',
                        maskComposite: 'exclude',
                      }}
                    />

                    {/* Pulsing blur glow behind icon */}
                    <motion.div
                      animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.7, 0.4] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute rounded-full blur-3xl"
                      style={{ background: current.color, inset: 110 }}
                    />

                    {/* Center icon card */}
                    <motion.div
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute rounded-3xl flex items-center justify-center shadow-2xl overflow-hidden"
                      style={{
                        inset: 128,
                        background: `linear-gradient(135deg, ${current.color} 0%, ${current.color}dd 60%, ${current.color}bb 100%)`,
                        boxShadow: `0 25px 60px -15px ${current.color}80, inset 0 0 0 1px ${current.color}40, inset 0 2px 4px rgba(255,255,255,0.2)`,
                      }}
                    >
                      {/* Shine sweep */}
                      <motion.div
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          repeatDelay: 2,
                          ease: 'easeInOut',
                        }}
                        className="absolute inset-y-0 w-1/2"
                        style={{
                          background:
                            'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)',
                        }}
                      />
                      <current.icon
                        className="relative h-14 w-14 text-white drop-shadow-lg"
                        strokeWidth={1.5}
                      />
                    </motion.div>

                    {/* 8 orbiting dots on outer ring */}
                    {Array.from({ length: 8 }).map((_, i) => {
                      const angle = (i * 360) / 8;
                      const size = i % 2 === 0 ? 10 : 6;
                      return (
                        <motion.div
                          key={`orbit-${i}`}
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 40,
                            repeat: Infinity,
                            ease: 'linear',
                          }}
                          className="absolute top-1/2 left-1/2"
                          style={{ width: 0, height: 0 }}
                        >
                          <div
                            className="absolute rounded-full"
                            style={{
                              width: size,
                              height: size,
                              background: current.color,
                              transform: `rotate(${angle}deg) translateX(180px) translate(-50%, -50%)`,
                              boxShadow: `0 0 12px ${current.color}aa, 0 0 24px ${current.color}55`,
                            }}
                          />
                        </motion.div>
                      );
                    })}

                    {/* 4 counter-rotating dots on middle ring */}
                    {Array.from({ length: 4 }).map((_, i) => {
                      const angle = (i * 360) / 4 + 45;
                      return (
                        <motion.div
                          key={`inner-${i}`}
                          animate={{ rotate: -360 }}
                          transition={{
                            duration: 30,
                            repeat: Infinity,
                            ease: 'linear',
                          }}
                          className="absolute top-1/2 left-1/2"
                          style={{ width: 0, height: 0 }}
                        >
                          <div
                            className="absolute h-2.5 w-2.5 rounded-full bg-white"
                            style={{
                              border: `2px solid ${current.color}`,
                              transform: `rotate(${angle}deg) translateX(140px) translate(-50%, -50%)`,
                              boxShadow: `0 0 10px ${current.color}66`,
                            }}
                          />
                        </motion.div>
                      );
                    })}

                    {/* Floating stat card — TOP LEFT */}
                    <motion.div
                      initial={{ opacity: 0, y: 12, x: -12 }}
                      animate={{ opacity: 1, y: 0, x: 0 }}
                      transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute -top-1 -left-6 bg-white dark:bg-ink-900 rounded-xl shadow-xl ring-1 ring-ink-100 dark:ring-ink-700 px-3 py-2 flex items-center gap-2 backdrop-blur-sm"
                      style={{ transform: 'rotate(-4deg)' }}
                    >
                      <span
                        className="h-2 w-2 rounded-full animate-pulse"
                        style={{ background: current.color, boxShadow: `0 0 8px ${current.color}` }}
                      />
                      <div>
                        <div className="text-[9px] font-mono uppercase tracking-wider text-ink-500 leading-none">
                          {isUr ? 'لائیو' : 'Live'}
                        </div>
                        <div className="text-xs font-bold text-ink-900 dark:text-white leading-tight mt-0.5">
                          {current.liveStat}
                          <span className="text-ink-500 font-normal ml-1">{current.liveLabel}</span>
                        </div>
                      </div>
                    </motion.div>

                    {/* Floating verified card — BOTTOM RIGHT */}
                    <motion.div
                      initial={{ opacity: 0, y: -12, x: 12 }}
                      animate={{ opacity: 1, y: 0, x: 0 }}
                      transition={{ delay: 0.4, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute -bottom-1 -right-4 bg-white dark:bg-ink-900 rounded-xl shadow-xl ring-1 ring-ink-100 dark:ring-ink-700 px-3 py-2 backdrop-blur-sm"
                      style={{ transform: 'rotate(3deg)' }}
                    >
                      <div className="flex items-center gap-1.5">
                        <div
                          className="h-4 w-4 rounded-full flex items-center justify-center"
                          style={{ background: current.color + '20' }}
                        >
                          <Shield className="h-2.5 w-2.5" style={{ color: current.color }} strokeWidth={3} />
                        </div>
                        <div>
                          <div className="text-[9px] font-mono uppercase tracking-wider text-ink-500 leading-none">
                            {current.verifiedLabel}
                          </div>
                          <div className="text-xs font-bold text-ink-900 dark:text-white leading-tight mt-0.5">
                            {current.verifiedBadge}
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* Floating metric card — MIDDLE RIGHT */}
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.55, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute top-1/2 -right-2 -translate-y-1/2 bg-white dark:bg-ink-900 rounded-lg shadow-lg ring-1 ring-ink-100 dark:ring-ink-700 px-2.5 py-1.5 flex items-center gap-1.5"
                    >
                      <TrendingUp className="h-3 w-3" style={{ color: current.color }} strokeWidth={2.5} />
                      <div className="text-[10px] font-bold text-ink-900 dark:text-white leading-none">
                        {current.metricValue}
                        <span className="block text-[8px] font-mono uppercase tracking-wider text-ink-500 mt-0.5">
                          {current.metricLabel}
                        </span>
                      </div>
                    </motion.div>

                    {/* Sparkle particles */}
                    {[
                      { top: '12%', left: '8%', delay: 0 },
                      { top: '22%', right: '6%', delay: 0.4 },
                      { bottom: '18%', left: '10%', delay: 0.8 },
                      { bottom: '28%', right: '12%', delay: 1.2 },
                      { top: '48%', left: '2%', delay: 1.6 },
                    ].map((pos, i) => (
                      <motion.div
                        key={`sparkle-${i}`}
                        animate={{
                          opacity: [0, 1, 0],
                          scale: [0, 1, 0],
                        }}
                        transition={{
                          duration: 2.2,
                          repeat: Infinity,
                          delay: pos.delay,
                          ease: 'easeInOut',
                        }}
                        className="absolute h-1 w-1 rounded-full pointer-events-none"
                        style={{
                          ...pos,
                          background: current.color,
                          boxShadow: `0 0 8px ${current.color}, 0 0 16px ${current.color}66`,
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Corner brand mark */}
                <div className="absolute bottom-3 right-3 text-[10px] font-mono uppercase tracking-widest text-ink-400 dark:text-ink-600 flex items-center gap-1.5">
                  <span
                    className="h-1 w-1 rounded-full animate-pulse"
                    style={{ background: current.color }}
                  />
                  Nafaa · {current.labelEn}
                </div>

                {/* Top-left status indicator */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/80 dark:bg-ink-900/80 backdrop-blur-md rounded-full px-2 py-1 ring-1 ring-ink-100 dark:ring-ink-700">
                  <span className="relative flex h-1.5 w-1.5">
                    <span
                      className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                      style={{ background: current.color }}
                    />
                    <span
                      className="relative inline-flex h-1.5 w-1.5 rounded-full"
                      style={{ background: current.color }}
                    />
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-widest font-bold text-ink-700 dark:text-ink-300">
                    {isUr ? 'فعال' : 'Active'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </Container>
    </Section>
  );
}
