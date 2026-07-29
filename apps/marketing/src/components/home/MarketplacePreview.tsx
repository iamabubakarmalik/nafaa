'use client';

import { motion } from 'framer-motion';
import { ArrowRight, ShoppingBag, Users, Zap, TrendingUp } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Button } from '@/components/primitives/Button';
import { GradientText } from '@/components/primitives/GradientText';
import { AuroraBackground } from '@/components/primitives/AuroraBackground';
import { fadeUp, staggerContainer, viewport } from '@/lib/motion/presets';
import { cn } from '@/lib/cn';

const sampleProducts = [
  { emoji: '👗', nameEn: 'Embroidered Kurta', nameUr: 'کڑھائی والا کرتا', price: 4500, city: 'Lahore', cityUr: 'لاہور' },
  { emoji: '📱', nameEn: 'iPhone 15 Pro', nameUr: 'آئی فون ۱۵ پرو', price: 385000, city: 'Karachi', cityUr: 'کراچی' },
  { emoji: '🧶', nameEn: 'Handmade Carpet', nameUr: 'ہاتھ سے بنا قالین', price: 32000, city: 'Multan', cityUr: 'ملتان' },
  { emoji: '💎', nameEn: 'Gold Necklace 22K', nameUr: 'سونے کا ہار ۲۲ قیراط', price: 285000, city: 'Islamabad', cityUr: 'اسلام آباد' },
];

const features = [
  { icon: ShoppingBag, en: 'Bargaining', ur: 'سودے بازی' },
  { icon: Users, en: 'Group Buys', ur: 'اجتماعی خریداری' },
  { icon: Zap, en: 'Live Shopping', ur: 'لائیو شاپنگ' },
  { icon: TrendingUp, en: 'Auctions', ur: 'نیلامی' },
];

export function MarketplacePreview() {
  const { t, locale } = useLocale();
  const isUr = locale === 'ur';

  return (
    <Section variant="default" spacing="lg" className="relative overflow-hidden">
      <AuroraBackground variant="aurora" intensity="subtle" />

      <Container className="relative">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-16 items-center">
          {/* Left copy */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={staggerContainer(0.06)}
          >
            <motion.div variants={fadeUp}>
              <Eyebrow variant="aurora">{t('marketplace.eyebrow')}</Eyebrow>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className={cn(
                'mt-4 font-display font-extrabold text-3xl lg:text-5xl tracking-tight text-balance',
                isUr && 'font-urdu leading-snug',
              )}
            >
              <span className="block text-ink-900 dark:text-white">
                {isUr ? 'اپنی دکان کو پہنچائیں' : 'Reach millions from'}
              </span>
              <GradientText variant="aurora" as="span" className="block">
                {isUr ? 'پاکستان کے تیز ترین بازار پر' : 'Pakistan\'s fastest marketplace'}
              </GradientText>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className={cn(
                'mt-5 text-lg text-ink-600 dark:text-ink-300 leading-relaxed',
                isUr && 'font-urdu text-xl leading-loose',
              )}
            >
              {t('marketplace.subtitle')}
            </motion.p>

            <motion.div variants={fadeUp} className="mt-6 grid grid-cols-2 gap-3">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.en}
                    className="flex items-center gap-2.5 rounded-xl bg-white dark:bg-ink-800 p-3 ring-1 ring-inset ring-ink-100 dark:ring-ink-700"
                  >
                    <div className="h-9 w-9 rounded-lg bg-aurora-purple/10 flex items-center justify-center text-aurora-purple">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className={cn('text-sm font-bold', isUr && 'font-urdu text-base')}>
                      {isUr ? f.ur : f.en}
                    </span>
                  </div>
                );
              })}
            </motion.div>

            <motion.div variants={fadeUp} className="mt-8">
              <Button
                href="https://bazaar.nafaa.pk"
                variant="aurora"
                size="xl"
                rightIcon={<ArrowRight className="h-5 w-5" />}
              >
                {t('marketplace.cta')}
              </Button>
            </motion.div>
          </motion.div>

          {/* Right — product grid preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={viewport}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="absolute -inset-8 bg-gradient-to-r from-aurora-purple/20 via-aurora-pink/20 to-brand-500/20 rounded-3xl blur-3xl" />

            <div className="relative rounded-3xl bg-white dark:bg-ink-800 ring-1 ring-inset ring-ink-100 dark:ring-ink-700 p-4 shadow-2xl">
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-gradient-aurora flex items-center justify-center">
                    <ShoppingBag className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-display font-extrabold text-sm">
                      {isUr ? 'نفع بازار' : 'Nafaa Bazaar'}
                    </div>
                    <div className="text-[10px] text-ink-500">bazaar.nafaa.pk</div>
                  </div>
                </div>
                <div className="text-[10px] font-mono uppercase tracking-widest font-bold text-emerald-600 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {sampleProducts.map((p, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="group rounded-xl bg-ink-50 dark:bg-ink-900 p-3 hover:ring-2 hover:ring-aurora-purple/40 transition-all cursor-pointer"
                  >
                    <div className="aspect-square rounded-lg bg-gradient-to-br from-white to-ink-100 dark:from-ink-800 dark:to-ink-950 flex items-center justify-center text-5xl group-hover:scale-110 transition-transform">
                      {p.emoji}
                    </div>
                    <div className={cn('mt-2 font-bold text-xs line-clamp-1', isUr && 'font-urdu text-sm')}>
                      {isUr ? p.nameUr : p.nameEn}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="text-sm font-extrabold tabular-nums text-gradient-aurora">
                        Rs {p.price.toLocaleString()}
                      </div>
                      <div className={cn('text-[10px] text-ink-500', isUr && 'font-urdu text-xs')}>
                        📍 {isUr ? p.cityUr : p.city}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </Container>
    </Section>
  );
}
