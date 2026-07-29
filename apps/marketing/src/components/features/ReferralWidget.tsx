'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, X, Share2, Copy, Check, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useLocale } from '@/components/providers/LocaleProvider';
import { cn } from '@/lib/cn';

const SITE_URL = 'https://nafaa.pk';

export function ReferralWidget() {
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const isUr = locale === 'ur';

  useEffect(() => {
    const dismissed = localStorage.getItem('nafaa-referral-dismissed');
    if (dismissed) return;
    const t = setTimeout(() => setVisible(true), 30000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem('nafaa-referral-dismissed', '1');
  };

  const referralLink = `${SITE_URL}?ref=friend`;
  const message = isUr
    ? `السلام علیکم! میں نفع استعمال کر رہا ہوں — پاکستان کا نمبر ۱ بزنس پلیٹ فارم۔ آپ بھی آزمائیں: ${referralLink}`
    : `I'm using Nafaa — Pakistan's #1 business platform. Try it: ${referralLink}`;

  const copy = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success(isUr ? 'لنک کاپی ہو گیا!' : 'Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWa = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <>
      <AnimatePresence>
        {visible && !open && (
          <motion.button
            initial={{ opacity: 0, x: -80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -80 }}
            onClick={() => setOpen(true)}
            className={cn(
              'fixed bottom-6 left-6 rtl:right-6 rtl:left-auto z-[74]',
              'hidden md:flex items-center gap-2.5 px-4 h-12 rounded-full',
              'bg-gradient-to-r from-gold via-sunset to-aurora-pink text-white font-bold text-sm',
              'shadow-2xl hover:scale-105 transition-transform',
            )}
          >
            <Gift className="h-4 w-4" />
            {isUr ? 'دوست کو دعوت دیں' : 'Invite a friend'}
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/25 font-mono">
              {isUr ? '۳ ماہ مفت' : '3 mo free'}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[95] bg-ink-950/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto z-[96] rounded-3xl bg-white dark:bg-ink-900 shadow-2xl overflow-hidden"
            >
              <div className="p-8 bg-gradient-to-br from-gold via-sunset to-aurora-pink text-white text-center relative">
                <button onClick={() => setOpen(false)} className="absolute top-4 right-4 h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <X className="h-4 w-4" />
                </button>
                <Gift className="h-14 w-14 mx-auto mb-4" />
                <h2 className={cn('font-display font-extrabold text-2xl', isUr && 'font-urdu text-3xl')}>
                  {isUr ? 'دوست کو ریفر کریں — دونوں کو ۳ ماہ مفت' : 'Refer a friend — both get 3 months free'}
                </h2>
                <p className={cn('mt-2 text-white/90 text-sm', isUr && 'font-urdu text-base')}>
                  {isUr ? 'کوئی حد نہیں۔ جتنے چاہیں دوست دعوت دیں۔' : 'No limit. Invite as many friends as you like.'}
                </p>
              </div>

              <div className="p-6 space-y-3">
                <div className="rounded-xl bg-ink-100 dark:bg-ink-800 p-3 flex items-center gap-2">
                  <input readOnly value={referralLink} className="flex-1 bg-transparent text-sm font-mono truncate outline-none" />
                  <button onClick={copy} className="h-9 w-9 rounded-lg bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600 transition">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>

                <button onClick={shareWa}
                  className="w-full h-12 rounded-xl bg-[#25d366] hover:bg-[#20b358] text-white font-bold flex items-center justify-center gap-2 transition">
                  <MessageCircle className="h-4 w-4" />
                  {isUr ? 'واٹس ایپ پر بھیجیں' : 'Share on WhatsApp'}
                </button>

                <button onClick={dismiss} className="w-full text-xs text-ink-500 hover:text-ink-700 dark:hover:text-ink-300">
                  {isUr ? 'دوبارہ مت دکھائیں' : 'Don\'t show again'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
