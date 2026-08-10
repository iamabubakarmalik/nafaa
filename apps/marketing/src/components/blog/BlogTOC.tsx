'use client';

import { useEffect, useState } from 'react';
import { List } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { cn } from '@/lib/cn';

interface Props {
  toc: Array<{ id: string; label: string }>;
}

export function BlogTOC({ toc }: Props) {
  const { locale } = useLocale();
  const isUr = locale === 'ur';
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: '-100px 0px -70% 0px' }
    );

    toc.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [toc]);

  return (
    <nav className="rounded-2xl bg-white dark:bg-ink-800 p-6 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60">
      <div className={cn('flex items-center gap-2 text-xs font-mono uppercase tracking-widest font-bold text-ink-500 mb-4', isUr && 'font-urdu text-sm')}>
        <List className="h-3.5 w-3.5" />
        {isUr ? 'اس مضمون میں' : 'In this article'}
      </div>
      <ul className="space-y-2">
        {toc.map((item, i) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={cn(
                'block text-sm py-1 pl-3 -ml-3 border-l-2 transition-all',
                activeId === item.id
                  ? 'border-brand-500 text-brand-600 dark:text-brand-400 font-bold'
                  : 'border-transparent text-ink-600 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white',
                isUr && 'font-urdu text-base',
              )}
            >
              <span className="opacity-50 mr-1.5 font-mono">{String(i + 1).padStart(2, '0')}</span>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}