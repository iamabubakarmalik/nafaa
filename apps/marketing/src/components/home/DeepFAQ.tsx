'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { JsonLd } from '@/lib/seo/JsonLdScript';
import { jsonLdFAQ } from '@/lib/seo/jsonld';
import { fadeUp, staggerContainer, viewport } from '@/lib/motion/presets';
import { cn } from '@/lib/cn';

const faqs = [
  {
    qEn: 'What exactly is Nafaa?',
    qUr: 'نفع دراصل کیا ہے؟',
    aEn: 'Nafaa is Pakistan\'s most complete business operating system. It combines a modern point of sale, unified marketplace access, thirty-plus integrations, multi-shop management, digital khata, FBR compliance, and AI-powered insights into one platform designed specifically for Pakistani businesses.',
    aUr: 'نفع پاکستان کا سب سے مکمل بزنس آپریٹنگ سسٹم ہے۔ یہ جدید پوائنٹ آف سیل، متحد بازار رسائی، تیس سے زائد انضمام، متعدد دکانوں کا انتظام، ڈجیٹل کھاتہ، ایف بی آر تعمیل، اور اے آئی سے چلنے والی بصیرت کو ایک پلیٹ فارم میں یکجا کرتا ہے۔',
  },
  {
    qEn: 'Does Nafaa work without internet?',
    qUr: 'کیا نفع انٹرنیٹ کے بغیر کام کرتا ہے؟',
    aEn: 'Yes. Nafaa is offline-first. You can process sales, add products, manage khata, and check inventory without an internet connection. When the connection is restored, all your data syncs automatically and securely to the cloud.',
    aUr: 'جی ہاں۔ نفع آف لائن پہلے کے اصول پر بنایا گیا ہے۔ آپ سیل، پروڈکٹ، کھاتہ، اور انوینٹری بغیر انٹرنیٹ کے استعمال کر سکتے ہیں۔ کنیکشن بحال ہونے پر ڈیٹا خودکار طور پر ہم آہنگ ہو جاتا ہے۔',
  },
  {
    qEn: 'Which industries does Nafaa support?',
    qUr: 'نفع کن صنعتوں کو سپورٹ کرتا ہے؟',
    aEn: 'Nafaa supports eighteen industries with dedicated workflows: kiryana stores, bakeries, restaurants, pharmacies, mobile shops, garments, salons, carpet shops, auto parts, bookstores, hardware stores, meat shops, dairy, jewelry, hotels, gyms, clinics, and service businesses like electricians and plumbers.',
    aUr: 'نفع اٹھارہ صنعتوں کو خصوصی ورک فلو کے ساتھ سپورٹ کرتا ہے: کریانہ اسٹور، بیکری، ریسٹورنٹ، فارمیسی، موبائل شاپ، گارمنٹس، سیلون، قالین کی دکان، آٹو پارٹس، کتاب گھر، ہارڈ ویئر، قصائی، ڈیری، زیورات، ہوٹل، جِم، کلینک، اور سروس کاروبار۔',
  },
  {
    qEn: 'Is Nafaa FBR compliant?',
    qUr: 'کیا نفع ایف بی آر کے مطابق ہے؟',
    aEn: 'Yes. Nafaa is fully FBR compliant with real-time invoice submission, QR code verification on receipts, automatic retry for failed submissions, and both sandbox and production integration. Your business stays compliant automatically.',
    aUr: 'جی ہاں۔ نفع مکمل طور پر ایف بی آر کے مطابق ہے، حقیقی وقت میں انوائس جمع، کیو آر تصدیق، ناکام جمع پر خودکار دوبارہ کوشش، اور سینڈ باکس و پروڈکشن دونوں انضمام کے ساتھ۔',
  },
  {
    qEn: 'What payment methods can I accept?',
    qUr: 'میں کون سی ادائیگیاں قبول کر سکتا ہوں؟',
    aEn: 'Nafaa integrates with every major Pakistani payment method: JazzCash, Easypaisa, Raast, NayaPay, SadaPay, bank transfers, credit and debit cards through Stripe, and cash. Split payments and partial payments are also supported.',
    aUr: 'نفع ہر بڑی پاکستانی ادائیگی طریقے سے منسلک ہے: جاز کیش، ایزی پیسہ، راست، نیا پے، سدا پے، بینک ٹرانسفر، کریڈٹ اور ڈیبٹ کارڈز، اور نقد۔ سپلٹ اور جزوی ادائیگیاں بھی سپورٹ ہیں۔',
  },
  {
    qEn: 'How much does Nafaa cost?',
    qUr: 'نفع کی قیمت کیا ہے؟',
    aEn: 'Nafaa offers plans starting from a free trial with no credit card required. Paid plans scale with your business size and feature needs. All plans include unlimited customer support, regular updates, and secure cloud backup. Visit our pricing page for current rates.',
    aUr: 'نفع مفت آزمائش سے شروع ہونے والے پلانز پیش کرتا ہے جس کے لیے کریڈٹ کارڈ درکار نہیں۔ ادا شدہ پلانز آپ کے کاروبار کے سائز اور ضروریات کے مطابق ہیں۔',
  },
  {
    qEn: 'Can I manage multiple shops from one account?',
    qUr: 'کیا میں ایک اکاؤنٹ سے کئی دکانیں چلا سکتا ہوں؟',
    aEn: 'Absolutely. Nafaa is built for multi-shop businesses. Manage two shops or two hundred from one central dashboard with consolidated reports, shop-to-shop stock transfers, per-shop pricing, and role-based staff access for each location.',
    aUr: 'بالکل۔ نفع متعدد دکانوں کے کاروبار کے لیے بنایا گیا ہے۔ ایک ڈیش بورڈ سے دو دکانیں یا دو سو چلائیں، متحد رپورٹس، ٹرانسفر، اور رول بیسڈ رسائی کے ساتھ۔',
  },
  {
    qEn: 'Is my data safe with Nafaa?',
    qUr: 'کیا میرا ڈیٹا نفع پر محفوظ ہے؟',
    aEn: 'Your data is protected by bank-grade encryption at rest and in transit, ISO 27001 certified infrastructure, PCI DSS compliance for payments, automatic daily backups, and strict role-based access controls. You own your data completely and can export it at any time.',
    aUr: 'آپ کا ڈیٹا بینک گریڈ انکرپشن، آئی ایس او ۲۷۰۰۱ سرٹیفائیڈ انفراسٹرکچر، پی سی آئی ڈی ایس ایس تعمیل، خودکار روزانہ بیک اپ، اور رول بیسڈ رسائی سے محفوظ ہے۔',
  },
];

export function DeepFAQ() {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState<number | null>(0);
  const isUr = locale === 'ur';

  const schemaData = jsonLdFAQ(
    faqs.map((f) => ({ q: isUr ? f.qUr : f.qEn, a: isUr ? f.aUr : f.aEn })),
  );

  return (
    <>
      <JsonLd id="faq-jsonld" data={schemaData} />
      <Section variant="default" spacing="lg">
        <Container size="md">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
            variants={staggerContainer(0.06)}
            className="text-center mb-14"
          >
            <motion.div variants={fadeUp}>
              <Eyebrow variant="brand">{t('faq.eyebrow')}</Eyebrow>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              className={cn(
                'mt-4 font-display font-extrabold text-3xl lg:text-5xl tracking-tight',
                isUr && 'font-urdu leading-snug',
              )}
            >
              {t('faq.title')}
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className={cn(
                'mt-4 text-lg text-ink-600 dark:text-ink-300',
                isUr && 'font-urdu text-xl leading-loose',
              )}
            >
              {t('faq.subtitle')}
            </motion.p>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((f, i) => {
              const isOpen = open === i;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.3, delay: i * 0.03 }}
                  className={cn(
                    'rounded-2xl bg-white dark:bg-ink-800 overflow-hidden',
                    'ring-1 ring-inset transition-all duration-300',
                    isOpen
                      ? 'ring-brand-400 dark:ring-brand-600 shadow-lg'
                      : 'ring-ink-100 dark:ring-ink-700/60',
                  )}
                >
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-5 text-left"
                  >
                    <span className={cn(
                      'font-bold text-base lg:text-lg text-ink-900 dark:text-white pr-4',
                      isUr && 'font-urdu text-lg lg:text-xl',
                    )}>
                      {isUr ? f.qUr : f.qEn}
                    </span>
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                        isOpen
                          ? 'bg-brand-500 text-white'
                          : 'bg-ink-100 dark:bg-ink-700 text-ink-600 dark:text-ink-300',
                      )}
                    >
                      <Plus className="h-4 w-4" strokeWidth={3} />
                    </motion.span>
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className={cn(
                          'px-6 pb-6 text-ink-600 dark:text-ink-300 leading-relaxed',
                          isUr ? 'font-urdu text-lg leading-loose' : 'text-base',
                        )}>
                          {isUr ? f.aUr : f.aEn}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </Container>
      </Section>
    </>
  );
}
