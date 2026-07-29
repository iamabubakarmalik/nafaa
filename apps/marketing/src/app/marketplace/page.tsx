'use client';

import { motion } from 'framer-motion';
import {
  ShoppingBag, Users, Zap, Gavel, Radio, Store,
  ArrowRight, TrendingUp, Shield, Wallet, Sparkles,
} from 'lucide-react';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { FloatingWhatsApp } from '@/components/layout/Footer/FloatingWhatsApp';
import { CTA } from '@/components/home/CTA';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Badge } from '@/components/primitives/Badge';
import { Button } from '@/components/primitives/Button';
import { GradientText } from '@/components/primitives/GradientText';
import { AuroraBackground } from '@/components/primitives/AuroraBackground';
import { GridBackground } from '@/components/primitives/GridBackground';
import { NoiseTexture } from '@/components/primitives/NoiseTexture';
import { useLocale } from '@/components/providers/LocaleProvider';
import { fadeUp, staggerContainer, viewport } from '@/lib/motion/presets';
import { cn } from '@/lib/cn';

const BAZAAR_URL = 'https://bazaar.nafaa.pk';

const pillars = [
  {
    icon: ShoppingBag, color: '#8b5cf6',
    titleEn: 'Bargaining', titleUr: 'سودے بازی',
    descEn: 'The soul of Pakistani shopping, digitized. Buyers make offers, sellers counter, deals close in chat. No fixed-price friction.',
    descUr: 'پاکستانی خریداری کی روح، ڈجیٹل۔ خریدار پیشکش کریں، بیچنے والے جواب دیں۔',
  },
  {
    icon: Users, color: '#ec4899',
    titleEn: 'Group Buys', titleUr: 'اجتماعی خریداری',
    descEn: 'Neighbors pool orders to unlock wholesale prices. Fifty people buying rice together pay forty percent less.',
    descUr: 'پڑوسی مل کر آرڈر کریں اور ہول سیل قیمتیں حاصل کریں۔',
  },
  {
    icon: Radio, color: '#f97316',
    titleEn: 'Live Shopping', titleUr: 'لائیو شاپنگ',
    descEn: 'Sellers stream live, show products, answer questions, and close sales in real time. Pakistan\'s first live commerce marketplace.',
    descUr: 'بیچنے والے لائیو دکھائیں، سوالات کے جواب دیں، حقیقی وقت میں سیل۔',
  },
  {
    icon: Gavel, color: '#0284c7',
    titleEn: 'Auctions', titleUr: 'نیلامی',
    descEn: 'Rare carpets, vintage jewelry, collectibles — let the market decide the price with transparent real-time bidding.',
    descUr: 'نایاب قالین، پرانے زیورات — شفاف نیلامی کے ساتھ۔',
  },
  {
    icon: Store, color: '#12b76a',
    titleEn: 'Instant storefront', titleUr: 'فوری دکان',
    descEn: 'If you run Nafaa POS, your products can go live on Bazaar in one tap. Inventory, prices, and photos sync automatically.',
    descUr: 'اگر آپ نفع پی او ایس چلاتے ہیں، ایک ٹیپ سے بازار پر لائیو ہوں۔',
  },
  {
    icon: Shield, color: '#01411c',
    titleEn: 'Escrow protection', titleUr: 'ایسکرو تحفظ',
    descEn: 'Money held safely until the buyer confirms delivery. Fraud is structurally impossible. Trust is built in.',
    descUr: 'خریدار کی تصدیق تک رقم محفوظ۔ فراڈ ممکن نہیں۔',
  },
];

const stats = [
  { valueEn: '12,400+', valueUr: '۱۲٫۴ ہزار+', labelEn: 'Active sellers', labelUr: 'فعال بیچنے والے' },
  { valueEn: '890K', valueUr: '۸٫۹ لاکھ', labelEn: 'Products listed', labelUr: 'پروڈکٹس درج' },
  { valueEn: 'Rs 2.1B', valueUr: '۲٫۱ ارب', labelEn: 'Monthly GMV', labelUr: 'ماہانہ فروخت' },
  { valueEn: '47', valueUr: '۴۷', labelEn: 'Cities with delivery', labelUr: 'شہر ڈیلیوری کے ساتھ' },
];

export default function MarketplacePage() {
  const { locale } = useLocale();
  const isUr = locale === 'ur';

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden pt-16 pb-24">
          <AuroraBackground variant="aurora" intensity="intense" />
          <GridBackground className="mask-fade-bottom" />
          <NoiseTexture />
          <Container className="relative">
            <div className="max-w-4xl mx-auto text-center">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <Badge variant="aurora" size="md" pulse>
                  <Sparkles className="h-3 w-3" />
                  {isUr ? 'نفع بازار — پاکستان کی پہلی ذہین مارکیٹ پلیس' : 'Nafaa Bazaar — Pakistan\'s first smart marketplace'}
                </Badge>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className={cn(
                  'mt-8 font-display font-extrabold tracking-tight text-balance',
                  'text-4xl sm:text-5xl lg:text-7xl leading-[1.05]',
                  isUr && 'font-urdu leading-[1.5]',
                )}
              >
                <span className="block text-ink-900 dark:text-white">
                  {isUr ? 'وہاں بیچیں جہاں' : 'Sell where Pakistan'}
                </span>
                <GradientText variant="aurora" as="span" className="block">
                  {isUr ? 'پورا پاکستان خریدتا ہے' : 'actually shops'}
                </GradientText>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className={cn(
                  'mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-2xl mx-auto leading-relaxed',
                  isUr && 'font-urdu text-xl leading-loose',
                )}
              >
                {isUr
                  ? 'نفع بازار صرف ایک مارکیٹ پلیس نہیں — یہ سودے بازی، اجتماعی خریداری، لائیو شاپنگ اور نیلامی والا پاکستان کا پہلا مکمل تجارتی ماحول ہے۔ آپ کی دکان بھی یہاں ہو سکتی ہے۔'
                  : 'Nafaa Bazaar is not just a marketplace — it is Pakistan\'s first complete commerce ecosystem with bargaining, group buys, live shopping, and auctions built in. Your shop belongs here.'}
              </motion.p>

              {/* AEO direct answer */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className={cn(
                  'mt-8 p-5 rounded-2xl bg-white/70 dark:bg-ink-800/70 backdrop-blur-md text-left',
                  'ring-1 ring-inset ring-aurora-purple/30 border-l-4 border-aurora-purple max-w-2xl mx-auto',
                )}
              >
                <div className="text-eyebrow font-mono text-aurora-purple mb-2">
                  {isUr ? 'مختصر جواب' : 'In short'}
                </div>
                <p className={cn('text-ink-700 dark:text-ink-200 leading-relaxed', isUr && 'font-urdu text-lg leading-loose')}>
                  {isUr
                    ? 'نفع بازار پاکستان کی سب سے تیز ترقی پذیر آن لائن مارکیٹ پلیس ہے جہاں خریدار سودے بازی، اجتماعی خرید، لائیو شاپنگ اور نیلامی کے ذریعے خریدتے ہیں۔ نفع پی او ایس والے بیچنے والے ایک ٹیپ میں اپنی پوری انوینٹری بازار پر لائیو کر سکتے ہیں۔'
                    : 'Nafaa Bazaar is Pakistan\'s fastest-growing online marketplace where buyers shop through bargaining, group buys, live shopping, and auctions. Sellers using Nafaa POS can publish their entire inventory to Bazaar with a single tap.'}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mt-10 flex flex-wrap gap-3 justify-center"
              >
                <Button size="xl" variant="aurora" href={BAZAAR_URL} rightIcon={<ArrowRight className="h-5 w-5" />}>
                  {isUr ? 'نفع بازار کھولیں' : 'Open Nafaa Bazaar'}
                </Button>
                <Button size="xl" variant="secondary" href="#sell">
                  {isUr ? 'بیچنا شروع کریں' : 'Start selling'}
                </Button>
              </motion.div>
            </div>
          </Container>
        </section>

        {/* Stats */}
        <Section variant="subtle" spacing="sm">
          <Container>
            <motion.div
              initial="hidden" whileInView="visible" viewport={viewport}
              variants={staggerContainer(0.05)}
              className="grid grid-cols-2 lg:grid-cols-4 gap-5"
            >
              {stats.map((s, i) => (
                <motion.div key={i} variants={fadeUp} className="text-center rounded-2xl bg-white dark:bg-ink-800 p-6 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60">
                  <div className={cn('font-display font-extrabold text-3xl lg:text-4xl text-gradient-aurora', isUr && 'font-urdu')}>
                    {isUr ? s.valueUr : s.valueEn}
                  </div>
                  <div className={cn('mt-2 text-sm font-semibold text-ink-600 dark:text-ink-300', isUr && 'font-urdu text-base')}>
                    {isUr ? s.labelUr : s.labelEn}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </Container>
        </Section>

        {/* Pillars */}
        <Section variant="default" spacing="lg">
          <Container>
            <motion.div
              initial="hidden" whileInView="visible" viewport={viewport}
              variants={staggerContainer(0.06)}
              className="text-center max-w-3xl mx-auto mb-14"
            >
              <motion.div variants={fadeUp}>
                <Eyebrow variant="aurora">
                  {isUr ? 'صرف نفع بازار میں' : 'Only on Nafaa Bazaar'}
                </Eyebrow>
              </motion.div>
              <motion.h2 variants={fadeUp} className={cn('mt-4 font-display font-extrabold text-3xl lg:text-5xl tracking-tight text-balance', isUr && 'font-urdu leading-snug')}>
                {isUr ? 'چھ خصوصیات جو کہیں اور نہیں' : 'Six features nobody else has'}
              </motion.h2>
            </motion.div>

            <motion.div
              initial="hidden" whileInView="visible" viewport={viewport}
              variants={staggerContainer(0.05)}
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {pillars.map((p, i) => {
                const Icon = p.icon;
                return (
                  <motion.div
                    key={i} variants={fadeUp}
                    className="group rounded-2xl bg-white dark:bg-ink-800 p-7 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:shadow-aurora-glow hover:-translate-y-1 transition-all duration-300"
                  >
                    <div
                      className="inline-flex h-12 w-12 rounded-xl items-center justify-center text-white shadow-lg mb-4"
                      style={{ background: `linear-gradient(135deg, ${p.color}, ${p.color}dd)` }}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className={cn('font-display font-bold text-lg mb-2', isUr && 'font-urdu text-xl')}>
                      {isUr ? p.titleUr : p.titleEn}
                    </h3>
                    <p className={cn('text-ink-600 dark:text-ink-300 leading-relaxed', isUr ? 'font-urdu text-lg leading-loose' : 'text-sm')}>
                      {isUr ? p.descUr : p.descEn}
                    </p>
                  </motion.div>
                );
              })}
            </motion.div>
          </Container>
        </Section>

        {/* Seller CTA */}
        <Section variant="default" spacing="lg" id="sell" className="relative">
          <Container>
            <div className="relative rounded-[2rem] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-aurora-purple via-aurora-pink to-sunset" />
              <NoiseTexture opacity={0.06} />
              <div className="relative px-8 py-16 lg:px-20 text-center text-white">
                <h2 className={cn('font-display font-extrabold text-3xl lg:text-5xl tracking-tight text-balance', isUr && 'font-urdu leading-snug')}>
                  {isUr ? 'آپ کی دکان، لاکھوں خریداروں تک' : 'Your shop, in front of millions of buyers'}
                </h2>
                <p className={cn('mt-5 text-lg text-white/90 max-w-2xl mx-auto leading-relaxed', isUr && 'font-urdu text-xl leading-loose')}>
                  {isUr
                    ? 'نفع پی او ایس استعمال کرتے ہیں؟ ایک ٹیپ سے اپنی پوری انوینٹری بازار پر لائیو کریں۔ نہیں کرتے؟ مفت سیلر اکاؤنٹ منٹوں میں بنائیں۔'
                    : 'Using Nafaa POS? Publish your entire inventory to Bazaar in one tap. Not using it yet? Create a free seller account in minutes.'}
                </p>
                <div className="mt-8 flex flex-wrap gap-3 justify-center">
                  <Button size="xl" href={`${BAZAAR_URL}/sell`} className="!bg-white !text-aurora-purple hover:!bg-white/95" rightIcon={<ArrowRight className="h-5 w-5" />}>
                    {isUr ? 'مفت سیلر اکاؤنٹ بنائیں' : 'Create free seller account'}
                  </Button>
                  <Button size="xl" variant="ghost" href="/pricing" className="!text-white hover:!bg-white/10">
                    {isUr ? 'کمیشن دیکھیں' : 'See commission rates'}
                  </Button>
                </div>
              </div>
            </div>
          </Container>
        </Section>

        <CTA />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
