'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { X, ArrowRight } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { LogoWordmark } from '@/components/brand/Logo';
import { Button } from '@/components/primitives/Button';
import { LangSwitcher } from '@/components/ui/LangSwitcher';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { cn } from '@/lib/cn';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.nafaa.pk';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ open, onClose }: Props) {
  const { t, locale } = useLocale();
  const isUr = locale === 'ur';

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const groups = [
    {
      title: isUr ? 'پروڈکٹ' : 'Product',
      links: [
        { href: '/product/pos', label: isUr ? 'پوائنٹ آف سیل' : 'Point of Sale' },
        { href: '/product/inventory', label: isUr ? 'انوینٹری' : 'Inventory' },
        { href: '/product/khata', label: isUr ? 'ڈجیٹل کھاتہ' : 'Digital Khata' },
        { href: '/product/multi-shop', label: isUr ? 'متعدد دکانیں' : 'Multi-Shop' },
        { href: '/product/fbr', label: isUr ? 'ایف بی آر' : 'FBR' },
        { href: '/product/ai-assistant', label: isUr ? 'اے آئی معاون' : 'AI Assistant' },
      ],
    },
    {
      title: isUr ? 'صنعتیں' : 'Industries',
      links: [
        { href: '/industries', label: isUr ? 'تمام صنعتیں' : 'All industries' },
      ],
    },
    {
      title: isUr ? 'انضمام' : 'Integrations',
      links: [
        { href: '/integrations', label: isUr ? 'تمام انضمام' : 'All integrations' },
        { href: '/integrations/foodpanda', label: 'Foodpanda' },
        { href: '/integrations/fbr', label: 'FBR' },
      ],
    },
    {
      title: isUr ? 'کمپنی' : 'Company',
      links: [
        { href: '/pricing', label: isUr ? 'قیمتیں' : 'Pricing' },
        { href: '/marketplace', label: isUr ? 'بازار' : 'Marketplace' },
        { href: '/blog', label: isUr ? 'بلاگ' : 'Blog' },
        { href: '/contact', label: isUr ? 'رابطہ' : 'Contact' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      {/* Drawer */}
      <aside
        className={cn(
          'absolute inset-y-0 right-0 rtl:left-0 rtl:right-auto w-full max-w-md bg-ink-0 dark:bg-ink-900',
          'shadow-2xl flex flex-col',
          'animate-in slide-in-from-right rtl:slide-in-from-left duration-300',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-ink-100 dark:border-ink-800">
          <LogoWordmark size={32} />
          <button
            onClick={onClose}
            className="h-10 w-10 rounded-xl bg-ink-100 dark:bg-ink-800 flex items-center justify-center"
            aria-label={t('common.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
          {groups.map((g) => (
            <div key={g.title}>
              <div className={`text-eyebrow font-mono text-ink-400 mb-3 ${isUr ? 'font-urdu text-sm' : ''}`}>
                {g.title}
              </div>
              <ul className="space-y-1">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center justify-between rounded-xl px-3 py-3 text-base font-semibold',
                        'hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors',
                        isUr && 'font-urdu text-lg',
                      )}
                    >
                      <span>{l.label}</span>
                      <ArrowRight className="h-4 w-4 text-ink-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-ink-100 dark:border-ink-800 p-5 space-y-3">
          <div className="flex gap-2">
            <LangSwitcher />
            <ThemeToggle />
          </div>
          <Button variant="secondary" size="lg" fullWidth href={`${APP_URL}/login`}>
            {t('nav.login')}
          </Button>
          <Button size="lg" fullWidth href={`${APP_URL}/register`}>
            {t('nav.signup')}
          </Button>
        </div>
      </aside>
    </div>
  );
}
