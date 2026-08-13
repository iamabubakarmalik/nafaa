'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { trackEvent } from '@/lib/analytics/events';
import { cn } from '@/lib/cn';

const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP || '+923241772933';

function handleWhatsAppClick(location: string) {
  trackEvent('whatsapp_click', { location, page: typeof window !== 'undefined' ? window.location.pathname : '/' });
}

export function FloatingWhatsApp() {
  const { t, locale } = useLocale();
  const [visible, setVisible] = useState(false);
  const [popup, setPopup] = useState(false);
  const isUr = locale === 'ur';

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const num = WA_NUMBER.replace(/[^0-9]/g, '');
  const msg = encodeURIComponent(
    isUr ? 'السلام علیکم، مجھے نفع کے بارے میں جاننا ہے' : 'Hi Nafaa team, I would like to learn more.',
  );

  return (
    <>
      {/* Popup card */}
      {popup && visible && (
        <div
          className={cn(
            'fixed bottom-24 right-6 rtl:left-6 rtl:right-auto z-[80] w-80 max-w-[calc(100vw-3rem)]',
            'glass-strong rounded-2xl shadow-card-hover overflow-hidden',
            'animate-in slide-in-from-bottom-4 fade-in duration-300',
          )}
        >
          <div className="bg-[#25d366] text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-white/25 flex items-center justify-center">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <div className="font-bold text-sm">Nafaa Support</div>
                <div className="text-[10px] opacity-90 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  {isUr ? 'اکثر چند منٹوں میں جواب' : 'Typically replies in minutes'}
                </div>
              </div>
            </div>
            <button onClick={() => setPopup(false)} className="p-1 rounded hover:bg-white/20" aria-label={t('common.close')}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4">
            <div className="rounded-xl bg-ink-100 dark:bg-ink-800 p-3">
              <p className={`text-sm text-ink-700 dark:text-ink-200 leading-relaxed ${isUr ? 'font-urdu text-base leading-loose' : ''}`}>
                {isUr
                  ? 'السلام علیکم! نفع میں خوش آمدید۔ آپ کی مدد کے لیے حاضر ہیں۔'
                  : 'Hi there! Welcome to Nafaa. How can we help you today?'}
              </p>
            </div>
            <a
              href={`https://wa.me/${num}?text=${msg}`} onClick={() => handleWhatsAppClick("floating_button")}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 w-full h-11 rounded-xl bg-[#25d366] hover:bg-[#20b358] text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              {isUr ? 'واٹس ایپ پر گفتگو شروع کریں' : 'Start WhatsApp chat'}
            </a>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setPopup((v) => !v)}
        aria-label="WhatsApp"
        className={cn(
          'fixed bottom-6 right-6 rtl:left-6 rtl:right-auto z-[80]',
          'h-14 w-14 rounded-full bg-[#25d366] hover:bg-[#20b358]',
          'shadow-[0_12px_40px_-8px_rgba(37,211,102,0.6)]',
          'flex items-center justify-center text-white',
          'transition-all duration-500 hover:scale-110',
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none',
        )}
      >
        <MessageCircle className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center text-[10px] font-bold ring-2 ring-ink-0 dark:ring-ink-900">
          1
        </span>
        <span className="absolute inset-0 rounded-full bg-[#25d366] animate-ping opacity-25" />
      </button>
    </>
  );
}
