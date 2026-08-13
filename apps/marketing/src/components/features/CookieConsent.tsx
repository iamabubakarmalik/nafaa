'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from '@/components/providers/LocaleProvider';
import { grantConsent, denyConsent, dataLayerPush } from '@/lib/analytics/gtag';
import { cn } from '@/lib/cn';

export function CookieConsent() {
  const { locale } = useLocale();
  const [visible, setVisible] = useState(false);
  const isUr = locale === 'ur';

  useEffect(() => {
    const accepted = localStorage.getItem('nafaa-cookies');
    if (!accepted) {
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('nafaa-cookies', 'all');
    grantConsent();
    dataLayerPush({ event: 'cookie_consent', consent: 'all' });
    setVisible(false);
  };

  const essential = () => {
    localStorage.setItem('nafaa-cookies', 'essential');
    denyConsent();
    dataLayerPush({ event: 'cookie_consent', consent: 'essential' });
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className={cn(
            'fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-[85]',
            'rounded-2xl bg-white dark:bg-ink-800 p-5 shadow-2xl ring-1 ring-inset ring-ink-200 dark:ring-ink-700',
          )}
        >
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-brand flex items-center justify-center text-white shrink-0">
              <Cookie className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className={cn('font-bold text-sm', isUr && 'font-urdu text-base')}>
                {isUr ? 'ہم کوکیز استعمال کرتے ہیں' : 'We use cookies'}
              </div>
              <p className={cn('mt-1 text-xs text-ink-600 dark:text-ink-300 leading-relaxed', isUr && 'font-urdu text-sm')}>
                {isUr
                  ? 'ضروری کوکیز سائٹ کے لیے چاہیے۔ اختیاری کوکیز تجزیہ کے لیے ہیں۔'
                  : 'Essential cookies are required. Optional cookies help us improve.'}{' '}
                <Link href="/cookies" className="text-brand-600 font-bold hover:underline">
                  {isUr ? 'مزید' : 'Learn more'}
                </Link>
              </p>
              <div className="mt-3 flex gap-2">
                <button onClick={accept} className="flex-1 h-9 rounded-lg bg-gradient-brand text-white text-xs font-bold hover:shadow-brand-glow transition">
                  {isUr ? 'قبول کریں' : 'Accept all'}
                </button>
                <button onClick={essential} className="h-9 px-3 rounded-lg bg-ink-100 dark:bg-ink-700 text-xs font-bold hover:bg-ink-200 dark:hover:bg-ink-600 transition">
                  {isUr ? 'ضروری' : 'Essential only'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
