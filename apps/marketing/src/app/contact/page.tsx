'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Mail, Phone, MapPin, MessageCircle, Clock, Send, Loader2,
  CheckCircle2, Handshake, HelpCircle, Newspaper, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { FloatingWhatsApp } from '@/components/layout/Footer/FloatingWhatsApp';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Button } from '@/components/primitives/Button';
import { GradientText } from '@/components/primitives/GradientText';
import { AuroraBackground } from '@/components/primitives/AuroraBackground';
import { GridBackground } from '@/components/primitives/GridBackground';
import { NoiseTexture } from '@/components/primitives/NoiseTexture';
import { useLocale } from '@/components/providers/LocaleProvider';
import { fadeUp, staggerContainer, viewport } from '@/lib/motion/presets';
import { cn } from '@/lib/cn';

const channels = [
  { icon: Phone, labelEn: 'Sales line', labelUr: 'سیلز لائن', value: '0324 1772933', href: 'tel:+923241772933', color: '#12b76a' },
  { icon: MessageCircle, labelEn: 'WhatsApp', labelUr: 'واٹس ایپ', value: '+92 324 1772933', href: 'https://wa.me/923241772933', color: '#25d366' },
  { icon: Mail, labelEn: 'General', labelUr: 'عمومی', value: 'info@nafaa.pk', href: 'mailto:info@nafaa.pk', color: '#0284c7' },
  { icon: HelpCircle, labelEn: 'Support', labelUr: 'سپورٹ', value: 'support@nafaa.pk', href: 'mailto:support@nafaa.pk', color: '#8b5cf6' },
  { icon: Handshake, labelEn: 'Partnerships', labelUr: 'شراکت', value: 'partnerships@nafaa.pk', href: 'mailto:partnerships@nafaa.pk', color: '#f97316' },
  { icon: Newspaper, labelEn: 'Press', labelUr: 'پریس', value: 'press@nafaa.pk', href: 'mailto:press@nafaa.pk', color: '#ec4899' },
];

const offices = [
  { cityEn: 'Gujranwala (HQ)', cityUr: 'گوجرانوالہ (مرکزی دفتر)', addressEn: 'Citi Housing Phase 1', addressUr: 'سٹی ہاؤسنگ فیز ۱', status: 'open' },
  { cityEn: 'Lahore', cityUr: 'لاہور', addressEn: 'LDA Avenue', addressUr: 'ایل ڈی اے ایوینیو', status: 'open' },
  { cityEn: 'Islamabad', cityUr: 'اسلام آباد', addressEn: 'Opening soon', addressUr: 'جلد کھل رہا ہے', status: 'soon' },
];

export default function ContactPage() {
  const { locale } = useLocale();
  const isUr = locale === 'ur';
  const [form, setForm] = useState({ name: '', email: '', phone: '', topic: 'sales', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: wire to /api/contact with Resend
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSent(true);
    toast.success(isUr ? 'پیغام موصول ہو گیا!' : 'Message received!');
  };

  const inputCls = cn(
    'w-full h-12 px-4 rounded-xl bg-white dark:bg-ink-900 text-ink-900 dark:text-white',
    'ring-1 ring-inset ring-ink-200 dark:ring-ink-700 focus:ring-2 focus:ring-brand-500 outline-none transition',
    'placeholder:text-ink-400',
  );

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-16">
          <AuroraBackground variant="brand" intensity="base" />
          <GridBackground className="mask-fade-bottom" />
          <NoiseTexture />
          <Container className="relative text-center">
            <Eyebrow variant="brand">{isUr ? 'ہم سے بات کریں' : 'Talk to us'}</Eyebrow>
            <h1 className={cn(
              'mt-6 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight max-w-4xl mx-auto text-balance',
              isUr && 'font-urdu leading-[1.5]',
            )}>
              <GradientText variant="brand">
                {isUr ? 'ہم سننے کے لیے حاضر ہیں' : 'We\'re here, and we actually reply'}
              </GradientText>
            </h1>
            <p className={cn('mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-2xl mx-auto', isUr && 'font-urdu text-xl leading-loose')}>
              {isUr
                ? 'واٹس ایپ پر چند منٹوں میں جواب، ای میل پر چند گھنٹوں میں۔ سیلز، سپورٹ، شراکت — ہر چینل کھلا ہے۔'
                : 'Minutes on WhatsApp, hours on email. Sales, support, partnerships — every channel is open.'}
            </p>
          </Container>
        </section>

        {/* Channel cards */}
        <Section variant="default" spacing="sm">
          <Container>
            <motion.div
              initial="hidden" whileInView="visible" viewport={viewport}
              variants={staggerContainer(0.05)}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
            >
              {channels.map((c) => {
                const Icon = c.icon;
                return (
                  <motion.a
                    key={c.value} href={c.href}
                    target={c.href.startsWith('http') ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    variants={fadeUp}
                    className="group rounded-2xl bg-white dark:bg-ink-800 p-5 text-center ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:-translate-y-1 hover:shadow-card-hover transition-all duration-300"
                  >
                    <div
                      className="h-11 w-11 mx-auto rounded-xl flex items-center justify-center text-white shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}dd)` }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className={cn('mt-3 text-xs font-mono uppercase tracking-widest font-bold text-ink-500', isUr && 'font-urdu text-sm')}>
                      {isUr ? c.labelUr : c.labelEn}
                    </div>
                    <div className="mt-1 text-sm font-bold text-ink-900 dark:text-white break-all">{c.value}</div>
                  </motion.a>
                );
              })}
            </motion.div>
          </Container>
        </Section>

        {/* Form + side */}
        <Section variant="subtle" spacing="lg">
          <Container>
            <div className="grid lg:grid-cols-[1.2fr_1fr] gap-10 items-start">
              {/* Form */}
              <div>
                <Eyebrow variant="brand">{isUr ? 'پیغام بھیجیں' : 'Send a message'}</Eyebrow>
                <h2 className={cn('mt-4 font-display font-extrabold text-3xl lg:text-4xl', isUr && 'font-urdu')}>
                  {isUr ? '۲۴ گھنٹوں میں جواب کی ضمانت' : 'Guaranteed reply within 24 hours'}
                </h2>

                {sent ? (
                  <div className="mt-8 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 ring-1 ring-inset ring-emerald-200 dark:ring-emerald-800/50 p-10 text-center">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500" />
                    <h3 className={cn('mt-4 font-display font-extrabold text-2xl text-emerald-700 dark:text-emerald-300', isUr && 'font-urdu')}>
                      {isUr ? 'پیغام موصول ہو گیا!' : 'Message received!'}
                    </h3>
                    <p className={cn('mt-2 text-emerald-700/80 dark:text-emerald-400', isUr && 'font-urdu text-lg')}>
                      {isUr ? 'ہماری ٹیم ۲۴ گھنٹوں کے اندر رابطہ کرے گی۔' : 'Our team will reach out within 24 hours.'}
                    </p>
                  </div>
                ) : (
                  <form onSubmit={submit} className="mt-8 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder={isUr ? 'آپ کا نام' : 'Your name'} className={inputCls} />
                      <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder={isUr ? 'ای میل' : 'Email'} className={inputCls} />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder={isUr ? 'فون نمبر' : 'Phone number'} className={inputCls} />
                      <select value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} className={inputCls}>
                        <option value="sales">{isUr ? 'سیلز' : 'Sales'}</option>
                        <option value="support">{isUr ? 'سپورٹ' : 'Support'}</option>
                        <option value="partnership">{isUr ? 'شراکت' : 'Partnership'}</option>
                        <option value="press">{isUr ? 'پریس' : 'Press'}</option>
                        <option value="other">{isUr ? 'دیگر' : 'Other'}</option>
                      </select>
                    </div>
                    <textarea required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder={isUr ? 'اپنا پیغام لکھیں...' : 'Write your message...'}
                      className={cn(inputCls, 'h-auto py-3 resize-none')} />
                    <Button type="submit" size="lg" fullWidth loading={loading}
                      rightIcon={!loading ? <Send className="h-4 w-4" /> : undefined}>
                      {loading ? (isUr ? 'بھیجا جا رہا ہے' : 'Sending') : (isUr ? 'پیغام بھیجیں' : 'Send message')}
                    </Button>
                  </form>
                )}
              </div>

              {/* Side */}
              <div className="space-y-5 lg:sticky lg:top-24">
                {/* WhatsApp card */}
                <a href="https://wa.me/923241772933" target="_blank" rel="noopener noreferrer"
                  className="block rounded-3xl bg-gradient-to-br from-[#25d366] to-[#128c7e] p-7 text-white shadow-lg hover:scale-[1.02] transition-transform">
                  <MessageCircle className="h-9 w-9 mb-3" />
                  <h3 className={cn('font-display font-extrabold text-xl', isUr && 'font-urdu text-2xl')}>
                    {isUr ? 'سب سے تیز راستہ' : 'The fastest way'}
                  </h3>
                  <p className={cn('mt-2 text-white/90 text-sm', isUr && 'font-urdu text-base')}>
                    {isUr ? 'واٹس ایپ پر چند منٹوں میں جواب۔ ابھی چیٹ شروع کریں۔' : 'Replies in minutes on WhatsApp. Start chatting now.'}
                  </p>
                </a>

                {/* Hours */}
                <div className="rounded-3xl bg-white dark:bg-ink-800 p-7 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60">
                  <Clock className="h-8 w-8 text-brand-600 mb-3" />
                  <h3 className={cn('font-display font-extrabold text-lg', isUr && 'font-urdu text-xl')}>
                    {isUr ? 'اوقات کار' : 'Working hours'}
                  </h3>
                  <div className={cn('mt-4 space-y-2 text-sm', isUr && 'font-urdu text-base')}>
                    <div className="flex justify-between"><span>{isUr ? 'پیر — جمعہ' : 'Mon — Fri'}</span><span className="font-bold">9 AM — 9 PM</span></div>
                    <div className="flex justify-between"><span>{isUr ? 'ہفتہ' : 'Saturday'}</span><span className="font-bold">10 AM — 6 PM</span></div>
                    <div className="flex justify-between"><span>{isUr ? 'اتوار' : 'Sunday'}</span><span className="font-bold text-emerald-600">{isUr ? 'ہنگامی سپورٹ' : 'Emergency only'}</span></div>
                  </div>
                </div>

                {/* Offices */}
                <div className="rounded-3xl bg-white dark:bg-ink-800 p-7 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60">
                  <MapPin className="h-8 w-8 text-brand-600 mb-3" />
                  <h3 className={cn('font-display font-extrabold text-lg', isUr && 'font-urdu text-xl')}>
                    {isUr ? 'ہمارے دفاتر' : 'Our offices'}
                  </h3>
                  <div className="mt-4 space-y-3">
                    {offices.map((o) => (
                      <div key={o.cityEn} className="flex items-start gap-3">
                        <span className={cn(
                          'mt-1.5 h-2 w-2 rounded-full shrink-0',
                          o.status === 'open' ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse',
                        )} />
                        <div>
                          <div className={cn('font-bold text-sm', isUr && 'font-urdu text-base')}>
                            {isUr ? o.cityUr : o.cityEn}
                          </div>
                          <div className={cn('text-xs text-ink-500', isUr && 'font-urdu text-sm')}>
                            {isUr ? o.addressUr : o.addressEn}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
