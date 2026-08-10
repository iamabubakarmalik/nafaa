'use client';

import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import type { Industry } from '@/lib/data/industries';
import { cn } from '@/lib/cn';

const GoldRateWidget = dynamic(() => import('./widgets/GoldRateWidget').then((m) => m.GoldRateWidget), { ssr: false });
const CarpetCalculatorWidget = dynamic(() => import('./widgets/CarpetCalculatorWidget').then((m) => m.CarpetCalculatorWidget), { ssr: false });
const PharmacyBatchWidget = dynamic(() => import('./widgets/PharmacyBatchWidget').then((m) => m.PharmacyBatchWidget), { ssr: false });
const RestaurantKOTWidget = dynamic(() => import('./widgets/RestaurantKOTWidget').then((m) => m.RestaurantKOTWidget), { ssr: false });
const KhataLedgerWidget = dynamic(() => import('./widgets/KhataLedgerWidget').then((m) => m.KhataLedgerWidget), { ssr: false });
const GarmentMatrixWidget = dynamic(() => import('./widgets/GarmentMatrixWidget').then((m) => m.GarmentMatrixWidget), { ssr: false });
const MobileImeiWidget = dynamic(() => import('./widgets/MobileImeiWidget').then((m) => m.MobileImeiWidget), { ssr: false });
const SalonAppointmentWidget = dynamic(() => import('./widgets/SalonAppointmentWidget').then((m) => m.SalonAppointmentWidget), { ssr: false });
const BakeryRecipeWidget = dynamic(() => import('./widgets/BakeryRecipeWidget').then((m) => m.BakeryRecipeWidget), { ssr: false });
const GymMembershipWidget = dynamic(() => import('./widgets/GymMembershipWidget').then((m) => m.GymMembershipWidget), { ssr: false });

const WIDGET_MAP: Record<string, { Comp: any; titleEn: string; titleUr: string; descEn: string; descUr: string }> = {
  jewelry: {
    Comp: GoldRateWidget,
    titleEn: 'Live gold rates + auto pricing',
    titleUr: 'براہ راست سونے کی شرح + خودکار قیمت',
    descEn: 'Every jewelry invoice auto-calculates gold value, making charges, and GST — using the current live rate.',
    descUr: 'ہر زیورات کے بل پر سونے کی قیمت، مزدوری، اور جی ایس ٹی کا حساب براہ راست موجودہ شرح سے۔',
  },
  carpet: {
    Comp: CarpetCalculatorWidget,
    titleEn: 'Sell by square foot, meter, or piece',
    titleUr: 'مربع فٹ، میٹر، یا فی پیس فروخت',
    descEn: 'Nafaa converts feet ↔ meters, tracks wastage, and handles cut orders on the POS itself.',
    descUr: 'نفع فٹ اور میٹر کے درمیان تبدیلی، ضیاع کا حساب، اور کٹنگ کے آرڈر POS پر ہی کرتا ہے۔',
  },
  pharmacy: {
    Comp: PharmacyBatchWidget,
    titleEn: 'Batch tracking + DRAP compliance built-in',
    titleUr: 'بیچ ٹریکنگ + ڈریپ کی تعمیل شامل',
    descEn: 'Every medicine tracked by batch, expiry, and manufacturer. Auto-alerts before expiry, one-click DRAP reports.',
    descUr: 'ہر دوا بیچ، معیاد، اور کمپنی کے حساب سے۔ خودکار انتباہ اور ایک کلک میں ڈریپ رپورٹ۔',
  },
  restaurant: {
    Comp: RestaurantKOTWidget,
    titleEn: 'Kitchen order tickets in real-time',
    titleUr: 'کچن آرڈر ٹکٹ براہ راست',
    descEn: 'Waiter takes order → kitchen printer prints instantly. Track cooking times and table revenue on one screen.',
    descUr: 'ویٹر آرڈر لیتا ہے → کچن پرنٹر فوراً پرنٹ کرتا ہے۔ سب ایک اسکرین پر۔',
  },
  kiryana: {
    Comp: KhataLedgerWidget,
    titleEn: 'Digital khata replaces the paper ledger',
    titleUr: 'ڈیجیٹل کھاتہ کاغذی کھاتے کی جگہ',
    descEn: 'Every udhar entry digital. Send WhatsApp reminders with one tap. Never lose a receivable.',
    descUr: 'ہر ادھار انٹری ڈیجیٹل۔ WhatsApp پر ایک ٹیپ سے یاد دہانی۔ کوئی ادھار نہیں بھولے گا۔',
  },
  garments: {
    Comp: GarmentMatrixWidget,
    titleEn: 'Size × color matrix that just works',
    titleUr: 'سائز اور رنگ کا میٹرکس جو کام کرتا ہے',
    descEn: 'Every t-shirt is 6 sizes × 4+ colors = 24+ SKUs. Nafaa tracks every combination automatically.',
    descUr: 'ہر ٹی شرٹ 6 سائز × 4 رنگ = 24 SKUs۔ نفع خود بخود ہر مجموعہ ٹریک کرتا ہے۔',
  },
  'mobile-shop': {
    Comp: MobileImeiWidget,
    titleEn: 'Every phone tracked by IMEI',
    titleUr: 'ہر موبائل IMEI سے ٹریک',
    descEn: 'IMEI scanned at purchase, warranty auto-tracked, resale history preserved. No lost devices, no fraud.',
    descUr: 'خریداری پر IMEI اسکین، وارنٹی خودکار، ری سیل ہسٹری محفوظ۔ کوئی گمشدہ فون نہیں۔',
  },
  salon: {
    Comp: SalonAppointmentWidget,
    titleEn: 'Appointments + stylist commission tracker',
    titleUr: 'اپائنٹمنٹ + اسٹائلسٹ کمیشن ٹریکر',
    descEn: 'Book by stylist, service, and duration. Track staff commission automatically per appointment.',
    descUr: 'اسٹائلسٹ، سروس، اور دورانیے سے بکنگ۔ ہر اپائنٹمنٹ پر کمیشن خودکار۔',
  },
  bakery: {
    Comp: BakeryRecipeWidget,
    titleEn: 'Recipe-driven inventory that self-manages',
    titleUr: 'ریسیپی سے چلنے والا خودکار انوینٹری',
    descEn: 'Define each product\'s BOM once. When a cake sells, Nafaa auto-deducts flour, sugar, and eggs.',
    descUr: 'ہر پروڈکٹ کا مواد ایک بار بتائیں۔ کیک بکنے پر میدہ، چینی، انڈے خود بخود کم ہو جاتے ہیں۔',
  },
  gym: {
    Comp: GymMembershipWidget,
    titleEn: 'Membership expiry + auto-renewals',
    titleUr: 'ممبرشپ کی معیاد + خودکار تجدید',
    descEn: 'Track every member\'s plan, expiry, check-ins, and streak. Auto-send renewal reminders 7 days before.',
    descUr: 'ہر ممبر کا پلان، معیاد، اور چیک-ان ٹریک۔ 7 دن پہلے تجدید کی یاد دہانی۔',
  },
};

export function IndustrySignatureWidget({ industry }: { industry: Industry }) {
  const { locale } = useLocale();
  const isUr = locale === 'ur';
  const config = WIDGET_MAP[industry.slug];

  if (!config) return null;
  const { Comp } = config;

  return (
    <Section variant="subtle" spacing="lg" className="relative overflow-hidden">
      <motion.div
        animate={{ x: [0, 40, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-20 -right-20 h-96 w-96 rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{ background: industry.color }}
      />

      <Container className="relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Copy */}
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-widest font-bold ring-1 ring-inset mb-6"
              style={{
                color: industry.color,
                background: `${industry.color}10`,
                boxShadow: `0 0 0 1px ${industry.color}30 inset`,
              }}
            >
              <Sparkles className="h-3 w-3" />
              {isUr ? 'یہ صرف ہمارے پاس ہے' : 'Nowhere else — only Nafaa'}
            </div>

            <h2 className={cn(
              'font-display font-extrabold text-3xl lg:text-5xl tracking-tight text-balance mb-6',
              isUr && 'font-urdu leading-snug',
            )}>
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: `linear-gradient(135deg, ${industry.color}, ${industry.colorDark})` }}
              >
                {isUr ? config.titleUr : config.titleEn}
              </span>
            </h2>

            <p className={cn(
              'text-lg text-ink-600 dark:text-ink-300 leading-relaxed mb-6',
              isUr && 'font-urdu text-xl leading-loose',
            )}>
              {isUr ? config.descUr : config.descEn}
            </p>

            <div className={cn(
              'inline-flex items-center gap-2 text-sm font-bold',
              isUr && 'font-urdu text-base',
            )} style={{ color: industry.color }}>
              <div className="h-6 w-6 rounded-full flex items-center justify-center" style={{ background: `${industry.color}20` }}>
                <span>👉</span>
              </div>
              {isUr ? 'دائیں طرف انٹرایکٹو ڈیمو' : 'Interactive demo →'}
            </div>
          </div>

          {/* Widget */}
          <div>
            <Comp />
          </div>
        </div>
      </Container>
    </Section>
  );
}
