'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Calculator, Clock, DollarSign, Zap, ArrowRight, Sparkles } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { fadeUp, staggerContainer, viewport } from '@/lib/motion/presets';
import type { Industry } from '@/lib/data/industries';
import { cn } from '@/lib/cn';

// Industry-specific ROI multipliers
const ROI_CONFIG: Record<string, {
  avgTicketPkr: number;
  timeSavedPerTxnMin: number;
  errorReductionPct: number;
  inventoryLossReductionPct: number;
  udharRecoveryPct: number;
}> = {
  kiryana: { avgTicketPkr: 450, timeSavedPerTxnMin: 2, errorReductionPct: 8, inventoryLossReductionPct: 12, udharRecoveryPct: 35 },
  pharmacy: { avgTicketPkr: 850, timeSavedPerTxnMin: 3, errorReductionPct: 15, inventoryLossReductionPct: 18, udharRecoveryPct: 20 },
  restaurant: { avgTicketPkr: 1200, timeSavedPerTxnMin: 4, errorReductionPct: 12, inventoryLossReductionPct: 15, udharRecoveryPct: 10 },
  jewelry: { avgTicketPkr: 45000, timeSavedPerTxnMin: 8, errorReductionPct: 20, inventoryLossReductionPct: 25, udharRecoveryPct: 15 },
  carpet: { avgTicketPkr: 22000, timeSavedPerTxnMin: 6, errorReductionPct: 18, inventoryLossReductionPct: 20, udharRecoveryPct: 25 },
  garments: { avgTicketPkr: 3500, timeSavedPerTxnMin: 3, errorReductionPct: 10, inventoryLossReductionPct: 22, udharRecoveryPct: 15 },
  'mobile-shop': { avgTicketPkr: 35000, timeSavedPerTxnMin: 5, errorReductionPct: 15, inventoryLossReductionPct: 30, udharRecoveryPct: 20 },
  salon: { avgTicketPkr: 2800, timeSavedPerTxnMin: 4, errorReductionPct: 12, inventoryLossReductionPct: 15, udharRecoveryPct: 18 },
  bakery: { avgTicketPkr: 850, timeSavedPerTxnMin: 2, errorReductionPct: 10, inventoryLossReductionPct: 20, udharRecoveryPct: 12 },
  gym: { avgTicketPkr: 5500, timeSavedPerTxnMin: 3, errorReductionPct: 8, inventoryLossReductionPct: 10, udharRecoveryPct: 30 },
};

const DEFAULT_CONFIG = { avgTicketPkr: 1500, timeSavedPerTxnMin: 3, errorReductionPct: 12, inventoryLossReductionPct: 15, udharRecoveryPct: 18 };

const NAFAA_MONTHLY_COST = 4999; // PKR

export function IndustryROICalculator({ industry }: { industry: Industry }) {
  const { locale } = useLocale();
  const isUr = locale === 'ur';
  const cfg = ROI_CONFIG[industry.slug] ?? DEFAULT_CONFIG;

  // Interactive inputs
  const [dailyTxns, setDailyTxns] = useState(80);
  const [monthlyRevenue, setMonthlyRevenue] = useState(dailyTxns * cfg.avgTicketPkr * 30);
  const [staffCount, setStaffCount] = useState(3);
  const [udharPct, setUdharPct] = useState(15);

  // Sync revenue when txns change
  const handleTxnChange = (v: number) => {
    setDailyTxns(v);
    setMonthlyRevenue(v * cfg.avgTicketPkr * 30);
  };

  const roi = useMemo(() => {
    // Time saved: staff × min saved × txns/day × 30 days × hourly rate (₨150/hr)
    const minutesSavedMonthly = cfg.timeSavedPerTxnMin * dailyTxns * 30;
    const timeSavingsPkr = Math.round((minutesSavedMonthly / 60) * 150);

    // Error reduction: revenue × error % saved
    const errorSavings = Math.round(monthlyRevenue * (cfg.errorReductionPct / 100) * 0.02); // 2% of errored revenue recovered

    // Inventory loss reduction: revenue × 8% typical loss × reduction pct
    const inventorySavings = Math.round(monthlyRevenue * 0.08 * (cfg.inventoryLossReductionPct / 100));

    // Udhar recovery: udhar amount × recovery %
    const udharAmount = monthlyRevenue * (udharPct / 100);
    const udharRecovery = Math.round(udharAmount * (cfg.udharRecoveryPct / 100));

    const totalMonthly = timeSavingsPkr + errorSavings + inventorySavings + udharRecovery;
    const netMonthly = totalMonthly - NAFAA_MONTHLY_COST;
    const yearly = netMonthly * 12;
    const roiMultiple = totalMonthly / NAFAA_MONTHLY_COST;
    const paybackDays = Math.ceil((NAFAA_MONTHLY_COST / totalMonthly) * 30);

    return { timeSavingsPkr, errorSavings, inventorySavings, udharRecovery, totalMonthly, netMonthly, yearly, roiMultiple, paybackDays, minutesSavedMonthly };
  }, [dailyTxns, monthlyRevenue, staffCount, udharPct, cfg]);

  return (
    <Section variant="default" spacing="lg" className="relative overflow-hidden">
      {/* Industry aurora */}
      <motion.div
        animate={{ x: [0, 40, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/4 -right-32 h-96 w-96 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: industry.color }}
      />
      <motion.div
        animate={{ x: [0, -30, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        className="absolute bottom-1/4 -left-32 h-96 w-96 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: industry.colorDark }}
      />

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
            <Calculator className="h-3.5 w-3.5" />
            {isUr ? 'آر او آئی کیلکولیٹر' : 'ROI calculator'}
          </motion.div>
          <motion.h2
            variants={fadeUp}
            className={cn(
              'mt-4 font-display font-extrabold text-3xl lg:text-5xl tracking-tight text-balance',
              isUr && 'font-urdu leading-snug',
            )}
          >
            {isUr ? 'ماہانہ کتنی بچت ہوگی؟' : 'How much will you save monthly?'}
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className={cn(
              'mt-4 text-lg text-ink-600 dark:text-ink-300',
              isUr && 'font-urdu text-xl leading-loose',
            )}
          >
            {isUr
              ? 'اپنے کاروبار کی معلومات درج کریں اور دیکھیں نفع کتنے پیسے بچائے گا'
              : `Enter your ${industry.nameEn.toLowerCase()} details and see exact savings — no email required`}
          </motion.p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-6 max-w-6xl mx-auto">
          {/* Inputs — 2 cols */}
          <div className="lg:col-span-2 rounded-3xl bg-white dark:bg-ink-800 shadow-xl ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 p-6 lg:p-8 space-y-6">
            <div className="flex items-center gap-2">
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center text-white"
                style={{ background: `linear-gradient(135deg, ${industry.color}, ${industry.colorDark})` }}
              >
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <div className={cn('font-display font-bold text-lg', isUr && 'font-urdu text-xl')}>
                  {isUr ? 'آپ کا کاروبار' : 'Your business'}
                </div>
                <div className="text-xs text-ink-500">{isUr ? 'اقدار کو ایڈجسٹ کریں' : 'Adjust the values'}</div>
              </div>
            </div>

            {/* Daily transactions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={cn('text-sm font-bold text-ink-700 dark:text-ink-200', isUr && 'font-urdu text-base')}>
                  {isUr ? 'روزانہ فروخت' : 'Daily transactions'}
                </label>
                <div className="font-display font-extrabold text-lg tabular-nums" style={{ color: industry.color }}>
                  {dailyTxns}
                </div>
              </div>
              <input
                type="range"
                min="10"
                max="500"
                step="5"
                value={dailyTxns}
                onChange={(e) => handleTxnChange(parseInt(e.target.value))}
                className="w-full"
                style={{ accentColor: industry.color }}
              />
              <div className="flex justify-between text-[10px] text-ink-400 mt-1">
                <span>10</span>
                <span>500+</span>
              </div>
            </div>

            {/* Monthly revenue */}
            <div>
              <label className={cn('block text-sm font-bold mb-2 text-ink-700 dark:text-ink-200', isUr && 'font-urdu text-base')}>
                {isUr ? 'ماہانہ آمدنی (PKR)' : 'Monthly revenue (PKR)'}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-ink-500">₨</span>
                <input
                  type="number"
                  value={monthlyRevenue}
                  onChange={(e) => setMonthlyRevenue(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full h-12 rounded-xl bg-ink-50 dark:bg-ink-900 ring-1 ring-inset ring-ink-200 dark:ring-ink-700 pl-10 pr-4 font-bold text-lg tabular-nums focus:ring-2 outline-none transition"
                  style={{ ['--tw-ring-color' as any]: industry.color }}
                />
              </div>
              <div className={cn('mt-1 text-xs text-ink-500', isUr && 'font-urdu text-sm')}>
                = ₨ {Math.round(monthlyRevenue / 30).toLocaleString()} / {isUr ? 'دن' : 'day'}
              </div>
            </div>

            {/* Staff */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={cn('text-sm font-bold text-ink-700 dark:text-ink-200', isUr && 'font-urdu text-base')}>
                  {isUr ? 'اسٹاف' : 'Staff members'}
                </label>
                <div className="font-display font-extrabold text-lg tabular-nums" style={{ color: industry.color }}>
                  {staffCount}
                </div>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                value={staffCount}
                onChange={(e) => setStaffCount(parseInt(e.target.value))}
                className="w-full"
                style={{ accentColor: industry.color }}
              />
            </div>

            {/* Udhar % */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={cn('text-sm font-bold text-ink-700 dark:text-ink-200', isUr && 'font-urdu text-base')}>
                  {isUr ? 'ادھار (فروخت کا %)' : 'Udhar (% of sales)'}
                </label>
                <div className="font-display font-extrabold text-lg tabular-nums" style={{ color: industry.color }}>
                  {udharPct}%
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                value={udharPct}
                onChange={(e) => setUdharPct(parseInt(e.target.value))}
                className="w-full"
                style={{ accentColor: industry.color }}
              />
            </div>
          </div>

          {/* Results — 3 cols */}
          <div className="lg:col-span-3 space-y-4">
            {/* Big number */}
            <motion.div
              key={roi.totalMonthly}
              initial={{ scale: 0.98, opacity: 0.9 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative rounded-3xl overflow-hidden shadow-2xl text-white p-8"
              style={{ background: `linear-gradient(135deg, ${industry.color}, ${industry.colorDark})` }}
            >
              <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/15 blur-3xl" />
              <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />

              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4" />
                  <div className={cn('text-[10px] font-mono uppercase tracking-widest font-bold text-white/90', isUr && 'font-urdu text-xs')}>
                    {isUr ? 'ماہانہ بچت' : 'Monthly savings with Nafaa'}
                  </div>
                </div>
                <div className={cn('font-display font-extrabold text-5xl lg:text-6xl tabular-nums', isUr && 'font-urdu')}>
                  ₨ {roi.totalMonthly.toLocaleString()}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t border-white/20">
                  <div>
                    <div className={cn('text-[10px] uppercase tracking-widest font-bold text-white/80 mb-1', isUr && 'font-urdu text-xs')}>
                      {isUr ? 'سالانہ' : 'Yearly net'}
                    </div>
                    <div className="font-display font-extrabold text-xl tabular-nums">₨ {(roi.yearly / 1000).toFixed(0)}K</div>
                  </div>
                  <div>
                    <div className={cn('text-[10px] uppercase tracking-widest font-bold text-white/80 mb-1', isUr && 'font-urdu text-xs')}>
                      {isUr ? 'آر او آئی' : 'ROI'}
                    </div>
                    <div className="font-display font-extrabold text-xl tabular-nums">{roi.roiMultiple.toFixed(1)}x</div>
                  </div>
                  <div>
                    <div className={cn('text-[10px] uppercase tracking-widest font-bold text-white/80 mb-1', isUr && 'font-urdu text-xs')}>
                      {isUr ? 'پے بیک' : 'Payback'}
                    </div>
                    <div className="font-display font-extrabold text-xl tabular-nums">{roi.paybackDays}d</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Breakdown cards */}
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                {
                  icon: Clock,
                  labelEn: 'Time saved (₨150/hr staff)',
                  labelUr: 'وقت کی بچت',
                  value: roi.timeSavingsPkr,
                  detail: `${Math.round(roi.minutesSavedMonthly / 60)} ${isUr ? 'گھنٹے' : 'hrs'}/${isUr ? 'مہینہ' : 'mo'}`,
                  color: 'from-blue-500 to-blue-700',
                },
                {
                  icon: Zap,
                  labelEn: 'Error reduction',
                  labelUr: 'غلطیوں میں کمی',
                  value: roi.errorSavings,
                  detail: `${cfg.errorReductionPct}% ${isUr ? 'کم' : 'less'}`,
                  color: 'from-purple-500 to-purple-700',
                },
                {
                  icon: TrendingUp,
                  labelEn: 'Inventory shrinkage',
                  labelUr: 'اسٹاک کا نقصان',
                  value: roi.inventorySavings,
                  detail: `${cfg.inventoryLossReductionPct}% ${isUr ? 'کم' : 'less loss'}`,
                  color: 'from-emerald-500 to-emerald-700',
                },
                {
                  icon: DollarSign,
                  labelEn: 'Udhar recovery',
                  labelUr: 'ادھار وصولی',
                  value: roi.udharRecovery,
                  detail: `${cfg.udharRecoveryPct}% ${isUr ? 'زیادہ' : 'more'}`,
                  color: 'from-amber-500 to-amber-700',
                },
              ].map((row) => {
                const Icon = row.icon;
                return (
                  <motion.div
                    key={row.labelEn}
                    layout
                    className="rounded-2xl bg-white dark:bg-ink-800 p-4 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className={cn('h-9 w-9 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-sm', row.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-400">
                        {row.detail}
                      </div>
                    </div>
                    <div className={cn('text-xs text-ink-500 font-semibold mb-1', isUr && 'font-urdu text-sm')}>
                      {isUr ? row.labelUr : row.labelEn}
                    </div>
                    <motion.div
                      key={row.value}
                      initial={{ scale: 0.95 }}
                      animate={{ scale: 1 }}
                      className="font-display font-extrabold text-2xl tabular-nums"
                    >
                      ₨ {row.value.toLocaleString()}
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>

            {/* Cost bar + CTA */}
            <div className="rounded-2xl bg-ink-50 dark:bg-ink-900 p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className={cn('text-xs text-ink-500 mb-0.5', isUr && 'font-urdu text-sm')}>
                  {isUr ? 'نفع کی قیمت' : 'Nafaa cost'}
                </div>
                <div className="font-display font-bold text-lg tabular-nums">₨ {NAFAA_MONTHLY_COST.toLocaleString()}/{isUr ? 'مہینہ' : 'mo'}</div>
              </div>
              <ArrowRight className="h-5 w-5 text-ink-400" />
              <div className="flex-1 min-w-0 text-right">
                <div className={cn('text-xs mb-0.5', isUr && 'font-urdu text-sm')} style={{ color: industry.color }}>
                  {isUr ? 'خالص فائدہ' : 'Net gain'}
                </div>
                <div className="font-display font-extrabold text-xl tabular-nums" style={{ color: industry.color }}>
                  ₨ {roi.netMonthly.toLocaleString()}
                </div>
              </div>
            </div>

            <a
              href={`${process.env.NEXT_PUBLIC_APP_URL || 'https://app.nafaa.pk'}/register?industry=${industry.slug}`}
              className="w-full inline-flex items-center justify-center gap-2 h-14 rounded-2xl font-bold text-white shadow-2xl hover:-translate-y-0.5 transition-transform text-base"
              style={{ background: `linear-gradient(135deg, ${industry.color}, ${industry.colorDark})` }}
            >
              {isUr ? 'مفت ٹرائل شروع کریں — ₨' : 'Start free — save ₨'} {roi.totalMonthly.toLocaleString()} / {isUr ? 'مہینہ' : 'mo'}
              <ArrowRight className="h-5 w-5" />
            </a>

            <p className={cn('text-[10px] text-center text-ink-400', isUr && 'font-urdu text-xs')}>
              {isUr
                ? '* اعداد و شمار پاکستان میں 12,000+ کاروباروں کے اصل ڈیٹا پر مبنی ہیں'
                : '* Numbers based on real data from 12,000+ Pakistani businesses on Nafaa'}
            </p>
          </div>
        </div>
      </Container>
    </Section>
  );
}
