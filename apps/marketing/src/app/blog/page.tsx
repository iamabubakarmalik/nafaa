'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, TrendingUp } from 'lucide-react';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { FloatingWhatsApp } from '@/components/layout/Footer/FloatingWhatsApp';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { GradientText } from '@/components/primitives/GradientText';
import { AuroraBackground } from '@/components/primitives/AuroraBackground';
import { GridBackground } from '@/components/primitives/GridBackground';
import { NoiseTexture } from '@/components/primitives/NoiseTexture';
import { BlogCard } from '@/components/blog/BlogCard';
import { blogPosts, getFeaturedPosts } from '@/lib/data/blog/posts';
import { blogCategories, type BlogCategory } from '@/lib/data/blog/types';
import { useLocale } from '@/components/providers/LocaleProvider';
import { staggerContainer, fadeUp, viewport } from '@/lib/motion/presets';
import { cn } from '@/lib/cn';

type FilterKey = 'all' | BlogCategory;

export default function BlogPage() {
  const { locale } = useLocale();
  const isUr = locale === 'ur';
  const [filter, setFilter] = useState<FilterKey>('all');
  const [query, setQuery] = useState('');

  const featured = getFeaturedPosts(3);
  const filtered = useMemo(() => {
    let list = blogPosts.filter((p) => !featured.some((f) => f.slug === p.slug));
    if (filter !== 'all') list = list.filter((p) => p.category === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p) =>
        p.titleEn.toLowerCase().includes(q) ||
        p.titleUr.includes(query) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [filter, query, featured]);

  const chips: Array<{ key: FilterKey; labelEn: string; labelUr: string; count: number }> = [
    { key: 'all', labelEn: 'All posts', labelUr: 'تمام مضامین', count: blogPosts.length },
    ...(Object.entries(blogCategories) as [BlogCategory, typeof blogCategories.guides][]).map(([key, cat]) => ({
      key: key as FilterKey,
      labelEn: cat.labelEn,
      labelUr: cat.labelUr,
      count: blogPosts.filter((p) => p.category === key).length,
    })),
  ];

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden pt-16 pb-12">
          <AuroraBackground variant="aurora" intensity="base" />
          <GridBackground className="mask-fade-bottom" />
          <NoiseTexture />
          <Container className="relative">
            <div className="max-w-4xl">
              <Eyebrow variant="aurora" icon={<Sparkles className="h-3 w-3" />}>
                {isUr ? 'نفع بلاگ' : 'Nafaa blog'}
              </Eyebrow>
              <h1 className={cn(
                'mt-6 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight text-balance',
                isUr && 'font-urdu leading-[1.5]',
              )}>
                <span className="block text-ink-900 dark:text-white">
                  {isUr ? 'کاروبار کے سوالات،' : 'Answers for'}
                </span>
                <GradientText variant="aurora">
                  {isUr ? 'حقیقی جوابات' : 'Pakistani businesses'}
                </GradientText>
              </h1>
              <p className={cn(
                'mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-3xl leading-relaxed',
                isUr && 'font-urdu text-xl leading-loose',
              )}>
                {isUr
                  ? 'ایف بی آر کی تعمیل، ڈیجیٹل کھاتہ، اور دکان چلانے کی مہارت — 12 ہزار کاروباروں سے سیکھی گئی حکمت عملی۔'
                  : 'FBR compliance, digital khata, and shopkeeping mastery — battle-tested lessons from 12,000+ Pakistani businesses.'}
              </p>

              {/* Search */}
              <div className="mt-8 max-w-xl relative">
                <Search className="h-5 w-5 text-ink-400 absolute left-5 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={isUr ? 'تلاش کریں — ایف بی آر، کھاتہ، سونا...' : 'Search — FBR, khata, gold rates...'}
                  className={cn(
                    'h-14 w-full rounded-2xl bg-white dark:bg-ink-800 pl-14 pr-5',
                    'ring-1 ring-inset ring-ink-200 dark:ring-ink-700',
                    'focus:ring-2 focus:ring-brand-500 outline-none shadow-lg transition',
                    isUr && 'font-urdu text-lg pr-14 pl-5',
                  )}
                />
              </div>
            </div>
          </Container>
        </section>

        {/* CATEGORY FILTERS */}
        <div className="sticky top-16 z-30 bg-white/85 dark:bg-ink-900/85 backdrop-blur-lg border-b border-ink-100/60 dark:border-ink-800/60">
          <Container>
            <div className="flex items-center gap-2 py-4 overflow-x-auto scrollbar-hide">
              {chips.map((chip) => {
                const active = filter === chip.key;
                return (
                  <button
                    key={chip.key}
                    onClick={() => setFilter(chip.key)}
                    className={cn(
                      'inline-flex items-center gap-2 px-4 h-10 rounded-full text-sm font-bold whitespace-nowrap',
                      'ring-1 ring-inset transition-all',
                      active
                        ? 'bg-ink-900 dark:bg-white text-white dark:text-ink-900 ring-transparent shadow-lg'
                        : 'bg-white dark:bg-ink-800 text-ink-700 dark:text-ink-200 ring-ink-200 dark:ring-ink-700 hover:ring-brand-400',
                      isUr && 'font-urdu text-base',
                    )}
                  >
                    {chip.key !== 'all' && blogCategories[chip.key as BlogCategory] && (
                      <span>{blogCategories[chip.key as BlogCategory].emoji}</span>
                    )}
                    {isUr ? chip.labelUr : chip.labelEn}
                    <span className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded-full font-mono tabular-nums',
                      active ? 'bg-white/25' : 'bg-ink-100 dark:bg-ink-900',
                    )}>
                      {chip.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </Container>
        </div>

        {/* FEATURED */}
        {filter === 'all' && !query && (
          <Section variant="default" spacing="md">
            <Container>
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="h-5 w-5 text-sunset" />
                <Eyebrow variant="gold">{isUr ? 'نمایاں مضامین' : 'Featured this month'}</Eyebrow>
              </div>
              <motion.div
                initial="hidden" whileInView="visible" viewport={viewport}
                variants={staggerContainer(0.06)}
                className="grid lg:grid-cols-3 gap-6"
              >
                {featured.map((post, i) => (
                  <motion.div key={post.slug} variants={fadeUp}>
                    <BlogCard post={post} featured={i === 0} />
                  </motion.div>
                ))}
              </motion.div>
            </Container>
          </Section>
        )}

        {/* ALL POSTS */}
        <Section variant="subtle" spacing="lg">
          <Container>
            <div className="mb-8">
              <Eyebrow variant="brand">
                {filter === 'all' ? (isUr ? 'تمام مضامین' : 'All articles') : (isUr ? blogCategories[filter].labelUr : blogCategories[filter].labelEn)}
              </Eyebrow>
              <div className="mt-2 text-sm text-ink-500">
                <span className="tabular-nums font-bold">{filtered.length}</span> {isUr ? 'مضامین' : 'articles'}
              </div>
            </div>

            <AnimatePresence mode="popLayout">
              <motion.div
                key={filter + query}
                initial="hidden" animate="visible"
                variants={staggerContainer(0.03)}
                className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {filtered.map((post) => (
                  <motion.div key={post.slug} variants={fadeUp} layout>
                    <BlogCard post={post} />
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>

            {filtered.length === 0 && (
              <div className="text-center py-20">
                <Search className="h-12 w-12 mx-auto text-ink-300 mb-4" />
                <p className="text-ink-500">{isUr ? 'کوئی مضمون نہیں ملا' : 'No articles found'}</p>
              </div>
            )}
          </Container>
        </Section>
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
