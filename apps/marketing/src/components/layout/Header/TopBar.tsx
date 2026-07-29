'use client';

import { Sparkles, Phone } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { LiveDot } from '@/components/primitives/LiveDot';

export function TopBar() {
  const { t, locale } = useLocale();
  const isUr = locale === 'ur';

  return (
    <div className="relative overflow-hidden bg-ink-950 text-white">
      <div className="absolute inset-0 bg-gradient-to-r from-brand-600/20 via-aurora-purple/20 to-brand-600/20 animate-gradient-x bg-[length:200%_100%]" />
      <div className="relative container-page">
        <div className="flex items-center justify-between h-9 text-xs">
          <div className={`flex items-center gap-2 ${isUr ? 'font-urdu text-sm' : ''}`}>
            <LiveDot color="emerald" size="sm" />
            <span className="font-medium text-white/90">
              {isUr
                ? 'پاکستان بھر میں سیکڑوں کاروبار نفع پر ابھی متحرک'
                : 'Hundreds of businesses across Pakistan active on Nafaa right now'}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a
              href="tel:+923241772933"
              className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors"
            >
              <Phone className="h-3 w-3" />
              <span className="tabular-nums">+92 324 1772933</span>
            </a>
            <span className={`flex items-center gap-1.5 text-white/80 ${isUr ? 'font-urdu text-sm' : ''}`}>
              <Sparkles className="h-3 w-3 text-gold" />
              {isUr ? 'کوئی کریڈٹ کارڈ نہیں چاہیے' : 'No credit card required'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
