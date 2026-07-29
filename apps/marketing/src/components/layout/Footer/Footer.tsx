'use client';

import Link from 'next/link';
import {
  Mail, Phone, MessageCircle, MapPin,
  Facebook, Instagram, Linkedin, Youtube, Twitter,
  Shield, Award,
} from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { LogoWordmark } from '@/components/brand/Logo';
import { LiveDot } from '@/components/primitives/LiveDot';
import { Container } from '@/components/primitives/Container';
import { Newsletter } from './Newsletter';
import { cn } from '@/lib/cn';

const SUPPORT_EMAIL = 'hello@nafaa.pk';
const SUPPORT_PHONE = '+923241772933';
const WHATSAPP = '+923241772933';

export function Footer() {
  const { t, locale } = useLocale();
  const year = new Date().getFullYear();
  const isUr = locale === 'ur';

  const columns = [
    {
      title: t('footer.product'),
      links: [
        { href: '/product/pos', en: 'Point of Sale', ur: 'پوائنٹ آف سیل' },
        { href: '/product/inventory', en: 'Inventory', ur: 'انوینٹری' },
        { href: '/product/khata', en: 'Digital Khata', ur: 'ڈجیٹل کھاتہ' },
        { href: '/product/multi-shop', en: 'Multi-Shop', ur: 'متعدد دکانیں' },
        { href: '/product/fbr', en: 'FBR Integration', ur: 'ایف بی آر انضمام' },
        { href: '/product/ai-assistant', en: 'AI Assistant', ur: 'اے آئی معاون' },
        { href: '/pricing', en: 'Pricing', ur: 'قیمتیں' },
        { href: '/download', en: 'Download', ur: 'ڈاؤن لوڈ' },
      ],
    },
    {
      title: t('footer.industries'),
      links: [
        { href: '/industries/kiryana', en: 'Kiryana Store', ur: 'کریانہ اسٹور' },
        { href: '/industries/bakery', en: 'Bakery', ur: 'بیکری' },
        { href: '/industries/restaurant', en: 'Restaurant', ur: 'ریسٹورنٹ' },
        { href: '/industries/pharmacy', en: 'Pharmacy', ur: 'فارمیسی' },
        { href: '/industries/mobile-shop', en: 'Mobile Shop', ur: 'موبائل شاپ' },
        { href: '/industries/carpet-shop', en: 'Carpet Shop', ur: 'قالین کی دکان' },
        { href: '/industries/jewelry', en: 'Jewelry', ur: 'زیورات' },
        { href: '/industries', en: 'View all', ur: 'سب دیکھیں' },
      ],
    },
    {
      title: t('footer.integrations'),
      links: [
        { href: '/integrations/foodpanda', en: 'Foodpanda', ur: 'فوڈ پانڈا' },
        { href: '/integrations/daraz', en: 'Daraz', ur: 'دراز' },
        { href: '/integrations/jazzcash', en: 'JazzCash', ur: 'جاز کیش' },
        { href: '/integrations/easypaisa', en: 'Easypaisa', ur: 'ایزی پیسہ' },
        { href: '/integrations/raast', en: 'Raast', ur: 'راست' },
        { href: '/integrations/fbr', en: 'FBR POS', ur: 'ایف بی آر' },
        { href: '/integrations/whatsapp-business', en: 'WhatsApp Business', ur: 'واٹس ایپ بزنس' },
        { href: '/integrations', en: 'View all', ur: 'سب دیکھیں' },
      ],
    },
    {
      title: t('footer.resources'),
      links: [
        { href: '/blog', en: 'Blog', ur: 'بلاگ' },
        { href: '/guides', en: 'Guides', ur: 'گائیڈز' },
        { href: '/help', en: 'Help Center', ur: 'مدد گاہ' },
        { href: '/api-docs', en: 'API Documentation', ur: 'اے پی آئی' },
        { href: '/changelog', en: 'Changelog', ur: 'تبدیلیوں کا ریکارڈ' },
        { href: '/glossary', en: 'Glossary', ur: 'اصطلاحات' },
        { href: '/status', en: 'System Status', ur: 'سسٹم اسٹیٹس' },
      ],
    },
    {
      title: t('footer.company'),
      links: [
        { href: '/about', en: 'About Us', ur: 'ہمارے بارے میں' },
        { href: '/careers', en: 'Careers', ur: 'کیریئر' },
        { href: '/partners', en: 'Partners', ur: 'شراکت دار' },
        { href: '/press', en: 'Press', ur: 'پریس' },
        { href: '/contact', en: 'Contact', ur: 'رابطہ' },
        { href: '/marketplace', en: 'Nafaa Bazaar', ur: 'نفع بازار' },
      ],
    },
  ];

  const legal = [
    { href: '/privacy', en: 'Privacy', ur: 'رازداری' },
    { href: '/terms', en: 'Terms', ur: 'شرائط' },
    { href: '/refund', en: 'Refund', ur: 'رقم واپسی' },
    { href: '/cookies', en: 'Cookies', ur: 'کوکیز' },
    { href: '/security', en: 'Security', ur: 'سیکورٹی' },
    { href: '/data-deletion', en: 'Data Deletion', ur: 'ڈیٹا حذف' },
  ];

  const socials = [
    { icon: Facebook, href: 'https://facebook.com/nafaapk', label: 'Facebook' },
    { icon: Instagram, href: 'https://instagram.com/nafaapk', label: 'Instagram' },
    { icon: Twitter, href: 'https://twitter.com/nafaapk', label: 'Twitter' },
    { icon: Linkedin, href: 'https://linkedin.com/company/nafaapk', label: 'LinkedIn' },
    { icon: Youtube, href: 'https://youtube.com/@nafaapk', label: 'YouTube' },
  ];

  const trustBadges = [
    { icon: Shield, en: 'FBR Compliant', ur: 'ایف بی آر تعمیل' },
    { icon: Award, en: 'ISO 27001', ur: 'آئی ایس او 27001' },
    { icon: Shield, en: 'PCI DSS', ur: 'پی سی آئی' },
  ];

  return (
    <footer className="relative mt-24 bg-ink-950 text-ink-200 overflow-hidden">
      {/* Aurora background */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 left-1/4 h-96 w-96 bg-brand-500/20 rounded-full blur-3xl animate-aurora-drift" />
        <div className="absolute top-1/3 right-1/4 h-96 w-96 bg-aurora-purple/20 rounded-full blur-3xl animate-aurora-float" />
        <div className="absolute bottom-0 left-1/2 h-96 w-96 bg-aurora-pink/15 rounded-full blur-3xl" />
      </div>

      <Container className="relative">
        {/* Newsletter */}
        <div className="pt-16">
          <Newsletter />
        </div>

        {/* Main grid */}
        <div className="pt-16 pb-12 grid lg:grid-cols-[1.4fr_3fr] gap-12">
          {/* Brand column */}
          <div>
            <LogoWordmark size={40} />
            <p className={`mt-5 text-ink-300 leading-relaxed max-w-sm ${isUr ? 'font-urdu text-base leading-loose' : 'text-sm'}`}>
              {t('footer.tagline')}
            </p>

            {/* Contact stack */}
            <div className="mt-6 space-y-3">
              <a href={`mailto:${SUPPORT_EMAIL}`} className="group flex items-center gap-3 text-sm text-ink-300 hover:text-white transition">
                <span className="h-9 w-9 rounded-xl bg-ink-800/70 group-hover:bg-brand-600 flex items-center justify-center transition">
                  <Mail className="h-4 w-4" />
                </span>
                <span className="tabular-nums">{SUPPORT_EMAIL}</span>
              </a>
              <a href={`tel:${SUPPORT_PHONE}`} className="group flex items-center gap-3 text-sm text-ink-300 hover:text-white transition">
                <span className="h-9 w-9 rounded-xl bg-ink-800/70 group-hover:bg-brand-600 flex items-center justify-center transition">
                  <Phone className="h-4 w-4" />
                </span>
                <span className="tabular-nums">{SUPPORT_PHONE}</span>
              </a>
              <a
                href={`https://wa.me/${WHATSAPP.replace(/[^0-9]/g, '')}`}
                target="_blank" rel="noopener noreferrer"
                className="group flex items-center gap-3 text-sm text-ink-300 hover:text-white transition"
              >
                <span className="h-9 w-9 rounded-xl bg-[#25d366]/20 group-hover:bg-[#25d366] flex items-center justify-center transition">
                  <MessageCircle className="h-4 w-4" />
                </span>
                <span>{isUr ? 'واٹس ایپ سپورٹ' : 'WhatsApp support'}</span>
              </a>
              <div className="flex items-start gap-3 text-sm text-ink-300">
                <span className="h-9 w-9 rounded-xl bg-ink-800/70 flex items-center justify-center shrink-0">
                  <MapPin className="h-4 w-4" />
                </span>
                <div className={isUr ? 'font-urdu text-base leading-relaxed' : 'leading-relaxed'}>
                  <div>{isUr ? 'مرکزی دفتر: سٹی ہاؤسنگ فیز ۱، گوجرانوالہ' : 'HQ: Citi Housing Phase 1, Gujranwala'}</div>
                  <div>{isUr ? 'دفاتر: لاہور، اسلام آباد' : 'Offices: Lahore, Islamabad'}</div>
                </div>
              </div>
            </div>

            {/* Social */}
            <div className="mt-6 flex items-center gap-2">
              {socials.map((s) => {
                const Icon = s.icon;
                return (
                  <a
                    key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                    className="h-10 w-10 rounded-xl bg-ink-800/70 hover:bg-brand-600 flex items-center justify-center transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {columns.map((col) => (
              <div key={col.title}>
                <div className={cn(
                  'text-eyebrow font-mono text-white/60 mb-4',
                  isUr && 'font-urdu text-sm',
                )}>
                  {col.title}
                </div>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className={cn(
                          'text-sm text-ink-300 hover:text-white transition-colors',
                          isUr && 'font-urdu text-base',
                        )}
                      >
                        {isUr ? l.ur : l.en}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Trust badges */}
        <div className="py-6 border-t border-ink-800/50 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {trustBadges.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.en} className={cn(
                  'flex items-center gap-2 text-xs text-ink-400',
                  isUr && 'font-urdu text-sm',
                )}>
                  <Icon className="h-4 w-4" />
                  <span>{isUr ? b.ur : b.en}</span>
                </div>
              );
            })}
          </div>
          <Link href="/status" className={cn(
            'flex items-center gap-2 text-xs text-ink-400 hover:text-white transition',
            isUr && 'font-urdu text-sm',
          )}>
            <LiveDot color="emerald" size="sm" />
            {t('footer.status')}
          </Link>
        </div>

        {/* Bottom bar */}
        <div className="py-6 border-t border-ink-800/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className={cn('text-xs text-ink-400 text-center md:text-left', isUr && 'font-urdu text-sm')}>
            {t('footer.copyright', { year })}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {legal.map((l) => (
              <Link key={l.href} href={l.href} className={cn(
                'text-xs text-ink-400 hover:text-white transition-colors',
                isUr && 'font-urdu text-sm',
              )}>
                {isUr ? l.ur : l.en}
              </Link>
            ))}
          </div>
          <div className={cn('text-xs text-ink-400 flex items-center gap-1.5', isUr && 'font-urdu text-sm')}>
            <span>🇵🇰</span>
            <span>{t('footer.madeIn')}</span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
