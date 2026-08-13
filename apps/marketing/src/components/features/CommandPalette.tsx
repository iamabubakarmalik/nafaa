'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Package, Building2, Plug, ShoppingBag, DollarSign,
  BookOpen, HelpCircle, Phone, Sparkles, ArrowRight,
} from 'lucide-react';
import { industries } from '@/lib/data/industries';
import { integrations } from '@/lib/data/integrations';
import { features } from '@/lib/data/features';
import { solutions } from '@/lib/data/solutions';
import { blogPosts } from '@/lib/data/blog';
import { useLocale } from '@/components/providers/LocaleProvider';
import { trackEvent } from '@/lib/analytics/events';
import { cn } from '@/lib/cn';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { locale } = useLocale();
  const isUr = locale === 'ur';

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => { if (!v) trackEvent('command_palette_search', { trigger: 'keyboard' }); return !v; });
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const go = (path: string) => {
    trackEvent('command_palette_search', { selected_path: path });
    router.push(path);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'hidden md:inline-flex items-center gap-2 h-10 px-3 rounded-xl',
          'bg-ink-100/70 dark:bg-ink-800/70 hover:bg-ink-200 dark:hover:bg-ink-700',
          'ring-1 ring-inset ring-ink-200/50 dark:ring-ink-700/50',
          'text-sm text-ink-500 dark:text-ink-400 transition-all',
        )}
      >
        <Search className="h-4 w-4" />
        <span>{isUr ? 'تلاش' : 'Search'}</span>
        <kbd className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-ink-200 dark:bg-ink-900 border border-ink-300 dark:border-ink-700">⌘K</kbd>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-ink-950/80 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -20 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-x-4 top-[10vh] z-[101] max-w-2xl mx-auto"
            >
              <Command className="rounded-2xl bg-white dark:bg-ink-900 shadow-2xl ring-1 ring-inset ring-ink-200 dark:ring-ink-700 overflow-hidden">
                <div className="flex items-center border-b border-ink-100 dark:border-ink-700/60 px-4">
                  <Search className="h-5 w-5 text-ink-400 mr-3" />
                  <Command.Input
                    placeholder={isUr ? 'کچھ بھی تلاش کریں...' : 'Search everything...'}
                    className={cn(
                      'flex-1 h-14 bg-transparent outline-none text-base',
                      isUr && 'font-urdu text-lg',
                    )}
                  />
                  <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-ink-100 dark:bg-ink-800">ESC</kbd>
                </div>

                <Command.List className="max-h-[60vh] overflow-y-auto p-2">
                  <Command.Empty className="py-12 text-center text-sm text-ink-500">
                    {isUr ? 'کچھ نہیں ملا' : 'No results found'}
                  </Command.Empty>

                  {/* Quick actions */}
                  <Command.Group heading={isUr ? 'فوری اقدامات' : 'Quick actions'} className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-400 px-2 py-2">
                    {[
                      { icon: DollarSign, label: isUr ? 'قیمتیں دیکھیں' : 'View pricing', path: '/pricing' },
                      { icon: ShoppingBag, label: isUr ? 'نفع بازار' : 'Nafaa Bazaar', path: '/marketplace' },
                      { icon: Phone, label: isUr ? 'ہم سے رابطہ' : 'Contact us', path: '/contact' },
                      { icon: HelpCircle, label: isUr ? 'مدد گاہ' : 'Help center', path: '/help' },
                      { icon: Sparkles, label: isUr ? 'اے آئی معاون' : 'AI Assistant', path: '/product/ai-assistant' },
                    ].map((a) => {
                      const Icon = a.icon;
                      return (
                        <Command.Item key={a.path} onSelect={() => go(a.path)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-ink-100 dark:hover:bg-ink-800 aria-selected:bg-brand-50 dark:aria-selected:bg-brand-950/40">
                          <Icon className="h-4 w-4 text-brand-600" />
                          <span className={cn('flex-1 text-sm font-medium', isUr && 'font-urdu text-base')}>{a.label}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-ink-400" />
                        </Command.Item>
                      );
                    })}
                  </Command.Group>

                  {/* Industries */}
                  <Command.Group heading={isUr ? 'صنعتیں' : 'Industries'} className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-400 px-2 py-2 mt-3">
                    {industries.slice(0, 8).map((ind) => (
                      <Command.Item key={ind.slug} onSelect={() => go(`/industries/${ind.slug}`)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-ink-100 dark:hover:bg-ink-800 aria-selected:bg-brand-50 dark:aria-selected:bg-brand-950/40">
                        <span className="text-lg">{ind.emoji}</span>
                        <span className={cn('flex-1 text-sm font-medium', isUr && 'font-urdu text-base')}>{isUr ? ind.nameUr : ind.nameEn}</span>
                        <Building2 className="h-3.5 w-3.5 text-ink-400" />
                      </Command.Item>
                    ))}
                  </Command.Group>

                  {/* Features */}
                  <Command.Group heading={isUr ? 'خصوصیات' : 'Features'} className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-400 px-2 py-2 mt-3">
                    {features.slice(0, 6).map((f) => (
                      <Command.Item key={f.slug} onSelect={() => go(`/product/${f.slug}`)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-ink-100 dark:hover:bg-ink-800 aria-selected:bg-brand-50 dark:aria-selected:bg-brand-950/40">
                        <span className="h-2 w-2 rounded-full" style={{ background: f.color }} />
                        <span className={cn('flex-1 text-sm font-medium', isUr && 'font-urdu text-base')}>{isUr ? f.nameUr : f.nameEn}</span>
                        <Package className="h-3.5 w-3.5 text-ink-400" />
                      </Command.Item>
                    ))}
                  </Command.Group>

                  {/* Integrations */}
                  <Command.Group heading={isUr ? 'انضمام' : 'Integrations'} className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-400 px-2 py-2 mt-3">
                    {integrations.slice(0, 6).map((it) => (
                      <Command.Item key={it.slug} onSelect={() => go(`/integrations/${it.slug}`)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-ink-100 dark:hover:bg-ink-800 aria-selected:bg-brand-50 dark:aria-selected:bg-brand-950/40">
                        <span className="text-lg">{it.logo}</span>
                        <span className={cn('flex-1 text-sm font-medium', isUr && 'font-urdu text-base')}>{isUr ? it.nameUr : it.name}</span>
                        <Plug className="h-3.5 w-3.5 text-ink-400" />
                      </Command.Item>
                    ))}
                  </Command.Group>

                  {/* Blog */}
                  <Command.Group heading={isUr ? 'بلاگ' : 'Blog'} className="text-[10px] font-mono uppercase tracking-widest font-bold text-ink-400 px-2 py-2 mt-3">
                    {blogPosts.slice(0, 4).map((p) => (
                      <Command.Item key={p.slug} onSelect={() => go(`/blog/${p.slug}`)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-ink-100 dark:hover:bg-ink-800 aria-selected:bg-brand-50 dark:aria-selected:bg-brand-950/40">
                        <span className="text-lg">{p.categoryEmoji}</span>
                        <span className="flex-1 text-sm font-medium truncate">{p.title}</span>
                        <BookOpen className="h-3.5 w-3.5 text-ink-400" />
                      </Command.Item>
                    ))}
                  </Command.Group>
                </Command.List>
              </Command>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
