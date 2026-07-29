'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { cn } from '@/lib/cn';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const { locale } = useLocale();
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const isUr = locale === 'ur';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      const dismissed = localStorage.getItem('nafaa-pwa-dismissed');
      if (!dismissed) {
        setTimeout(() => setVisible(true), 20000);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setVisible(false);
  };

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem('nafaa-pwa-dismissed', '1');
  };

  return (
    <AnimatePresence>
      {visible && prompt && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="fixed bottom-24 right-6 rtl:left-6 rtl:right-auto z-[72] max-w-sm rounded-2xl bg-white dark:bg-ink-800 p-5 shadow-2xl ring-1 ring-inset ring-ink-200 dark:ring-ink-700"
        >
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-brand flex items-center justify-center text-white shrink-0">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className={cn('font-bold text-sm', isUr && 'font-urdu text-base')}>
                {isUr ? 'نفع کو انسٹال کریں' : 'Install Nafaa'}
              </div>
              <p className={cn('mt-1 text-xs text-ink-600 dark:text-ink-300', isUr && 'font-urdu text-sm')}>
                {isUr ? 'ہوم اسکرین پر شامل کریں تیز رسائی کے لیے' : 'Add to home screen for faster access'}
              </p>
              <div className="mt-3 flex gap-2">
                <button onClick={install} className="h-8 px-3 rounded-lg bg-gradient-brand text-white text-xs font-bold flex items-center gap-1.5">
                  <Download className="h-3 w-3" /> {isUr ? 'انسٹال' : 'Install'}
                </button>
                <button onClick={dismiss} className="h-8 px-3 rounded-lg text-xs font-bold text-ink-500">
                  {isUr ? 'بعد میں' : 'Later'}
                </button>
              </div>
            </div>
            <button onClick={dismiss} className="text-ink-400 hover:text-ink-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
