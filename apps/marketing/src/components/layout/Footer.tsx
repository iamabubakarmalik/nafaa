'use client';

import Link from 'next/link';
import { Sparkles, Mail, Phone, MapPin, Facebook, Instagram, Linkedin, Youtube, MessageCircle } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { Container } from '@/components/ui/Container';
import { cn } from '@/lib/cn';

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'hello@nafaa.pk';
const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE || '+923001234567';
const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP || '+923001234567';

export function Footer() {
  const { t, locale } = useLocale();
  const year = new Date().getFullYear();

  const sections = [
    {
      title: t('footer.product'),
      links: [
        { href: '/features', label: t('nav.features') },
        { href: '/pricing', label: t('nav.pricing') },
        { href: '/industries', label: t('nav.industries') },
        { href: '/integrations', label: 'Integrations' },
        { href: '/changelog', label: 'What\'s New' },
      ],
    },
    {
      title: t('footer.company'),
      links: [
        { href: '/about', label: t('nav.about') },
        { href: '/contact', label: t('nav.contact') },
        { href: '/careers', label: 'Careers' },
        { href: '/partners', label: 'Become a Partner' },
        { href: '/press', label: 'Press' },
      ],
    },
    {
      title: t('footer.resources'),
      links: [
        { href: '/blog', label: t('nav.blog') },
        { href: '/help', label: 'Help Center' },
        { href: '/guides', label: 'Guides' },
        { href: '/api-docs', label: 'API Docs' },
        { href: '/status', label: 'System Status' },
      ],
    },
    {
      title: t('footer.legal'),
      links: [
        { href: '/privacy', label: 'Privacy Policy' },
        { href: '/terms', label: 'Terms of Service' },
        { href: '/refund', label: 'Refund Policy' },
        { href: '/cookies', label: 'Cookie Policy' },
        { href: '/security', label: 'Security' },
      ],
    },
  ];

  const socials = [
    { icon: Facebook, href: 'https://facebook.com/nafaapk', label: 'Facebook' },
    { icon: Instagram, href: 'https://instagram.com/nafaapk', label: 'Instagram' },
    { icon: Linkedin, href: 'https://linkedin.com/company/nafaapk', label: 'LinkedIn' },
    { icon: Youtube, href: 'https://youtube.com/@nafaapk', label: 'YouTube' },
  ];

  return (
    <footer className="relative mt-24 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-50 dark:opacity-30 pointer-events-none" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-64 w-[800px] bg-gradient-to-r from-brand-500/10 to-emerald-500/10 blur-3xl pointer-events-none" />

      <Container className="relative">
        {/* Top: brand + sections */}
        <div className="grid lg:grid-cols-[1.5fr_3fr] gap-12 py-16">
          {/* Brand */}
          <div className="space-y-5">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-emerald-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-xl font-extrabold">Nafaa</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 -mt-1">
                  Pakistan's #1 POS
                </div>
              </div>
            </Link>

            <p className={cn('text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm', locale === 'ur' && 'font-urdu text-base')}>
              {t('footer.tagline')}
            </p>

            <div className="space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
              <a href={`mailto:${SUPPORT_EMAIL}`} className="flex items-center gap-2.5 hover:text-brand-600 dark:hover:text-brand-400">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span>{SUPPORT_EMAIL}</span>
              </a>
              <a href={`tel:${SUPPORT_PHONE}`} className="flex items-center gap-2.5 hover:text-brand-600 dark:hover:text-brand-400">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>{SUPPORT_PHONE}</span>
              </a>
              <a
                href={`https://wa.me/${WHATSAPP.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 hover:text-brand-600 dark:hover:text-brand-400"
              >
                <MessageCircle className="h-4 w-4 flex-shrink-0" />
                <span>WhatsApp Support</span>
              </a>
              <div className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span>Lahore, Pakistan 🇵🇰</span>
              </div>
            </div>

            {/* Socials */}
            <div className="flex items-center gap-2 pt-2">
              {socials.map((s) => {
                const Icon = s.icon;
                return (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="h-10 w-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 hover:text-brand-600 flex items-center justify-center transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Sections */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            {sections.map((sec) => (
              <div key={sec.title}>
                <h4 className={cn('font-bold text-slate-900 dark:text-white mb-4 text-sm uppercase tracking-wider', locale === 'ur' && 'font-urdu text-base')}>
                  {sec.title}
                </h4>
                <ul className="space-y-2.5">
                  {sec.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="text-sm text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-slate-200 dark:border-slate-800 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className={cn('text-xs text-slate-500 dark:text-slate-500 text-center sm:text-left', locale === 'ur' && 'font-urdu')}>
            {t('footer.copyright', { year })}
          </p>
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-500">
            <span>🇵🇰 Made in Pakistan</span>
            <span>•</span>
            <span>v1.0</span>
            <span>•</span>
            <Link href="/status" className="hover:text-brand-600">All systems operational</Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}
