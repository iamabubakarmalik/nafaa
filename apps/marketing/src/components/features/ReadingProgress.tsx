'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen } from 'lucide-react';

interface Props { title?: string; minReadTime?: number; }

export function ReadingProgress({ title, minReadTime = 3 }: Props) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = () => {
      const doc = document.documentElement;
      const total = doc.scrollHeight - doc.clientHeight;
      const scrolled = window.scrollY;
      const pct = total > 0 ? (scrolled / total) * 100 : 0;
      setProgress(pct);
      setVisible(scrolled > 400 && pct < 98);
    };
    window.addEventListener('scroll', handler, { passive: true });
    handler();
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="fixed bottom-24 left-6 rtl:right-6 rtl:left-auto z-[70] hidden lg:flex items-center gap-3 bg-white dark:bg-ink-800 rounded-full pl-3 pr-4 py-2 shadow-xl ring-1 ring-inset ring-ink-200 dark:ring-ink-700"
        >
          <div className="relative h-8 w-8">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-ink-100 dark:text-ink-700" />
              <motion.circle
                cx="16" cy="16" r="13" fill="none" strokeWidth="2.5"
                strokeLinecap="round" strokeDasharray="81.68" strokeDashoffset={81.68 * (1 - progress / 100)}
                stroke="url(#reading-grad)"
              />
              <defs>
                <linearGradient id="reading-grad">
                  <stop offset="0%" stopColor="#12b76a" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
            <BookOpen className="absolute inset-0 m-auto h-3.5 w-3.5 text-brand-600" />
          </div>
          <div className="text-xs">
            <div className="font-bold tabular-nums">{Math.round(progress)}%</div>
            <div className="text-[10px] text-ink-500">read</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
