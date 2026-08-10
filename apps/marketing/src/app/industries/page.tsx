'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles, Search, Flame, Star, Filter } from 'lucide-react';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { FloatingWhatsApp } from '@/components/layout/Footer/FloatingWhatsApp';
import { CTA } from '@/components/home/CTA';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Eyebrow } from '@/components/primitives/Eyebrow';
import { Badge } from '@/components/primitives/Badge';
import { GradientText } from '@/components/primitives/GradientText';
import { AuroraBackground } from '@/components/primitives/AuroraBackground';
import { GridBackground } from '@/components/primitives/GridBackground';
import { NoiseTexture } from '@/components/primitives/NoiseTexture';
import { LiveDot } from '@/components/primitives/LiveDot';
import { useLocale } from '@/components/providers/LocaleProvider';
import { industries, industryCategories, type IndustryCategory } from '@/lib/data/industries';
import { fadeUp, staggerContainer, viewport } from '@/lib/motion/presets';
import { cn } from '@/lib/cn';

type FilterKey = 'all' | 'featured' | 'hot' | IndustryCategory;

export default function IndustriesPage() {
  const { locale } = useLocale();
  const isUr = locale === 'ur';
  const [filter, setFilter] = useState<FilterKey>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    let list = industries;
    if (filter === 'featured') list = list.filter((i) => i.featured);
    else if (filter === 'hot') list = list.filter((i) => i.hot);
    else if (filter !== 'all') list = list.filter((i) => i.category === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((i) =>
        i.nameEn.toLowerCase().includes(q) ||
        i.nameUr.includes(query) ||
        i.tagEn.toLowerCase().includes(q) ||
        i.keyFeatures.some((f) => f.toLowerCase().includes(q))
      );
    }
    return list;
  }, [filter, query]);

  const filterChips: Array<{ key: FilterKey; labelEn: string; labelUr: string; icon?: any; count: number }> = [
    { key: 'all', labelEn: 'All industries', labelUr: 'تمام صنعتیں', count: industries.length },
    { key: 'hot', labelEn: 'Hot', labelUr: 'مقبول', icon: Flame, count: industries.filter((i) => i.hot).length },
    { key: 'featured', labelEn: 'Featured', labelUr: 'نمایاں', icon: Star, count: industries.filter((i) => i.featured).length },
    ...(Object.entries(industryCategories) as [IndustryCategory, typeof industryCategories.retail][]).map(([key, cat]) => ({
      key: key as FilterKey,
      labelEn: cat.en,
      labelUr: cat.ur,
      count: industries.filter((i) => i.category === key).length,
    })),
  ];

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden pt-16 pb-16">
          <AuroraBackground variant="aurora" intensity="base" />
          <GridBackground className="mask-fade-bottom" />
          <NoiseTexture />
          <Container className="relative">
            <div className="max-w-4xl">
              <Eyebrow variant="aurora" icon={<Sparkles className="h-3 w-3" />}>
                {isUr ? 'بتیس صنعتیں، ایک پلیٹ فارم' : 'Thirty-two industries, one platform'}
              </Eyebrow>
              <h1 className={cn(
                'mt-6 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight text-balance',
                isUr && 'font-urdu leading-[1.5]',
              )}>
                <span className="block text-ink-900 dark:text-white">
                  {isUr ? 'ہر پاکستانی کاروبار کے لیے' : 'Purpose-built for every'}
                </span>
                <GradientText variant="aurora">
                  {isUr ? 'مخصوص طور پر بنایا گیا' : 'Pakistani business type'}
                </GradientText>
              </h1>
              <p className={cn(
                'mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 leading-relaxed max-w-3xl',
                isUr && 'font-urdu text-xl leading-loose',
              )}>
                {isUr
                  ? 'قالین کی دکان سے فارمیسی، کریانہ سے زیورات — ہر صنعت کی اپنی ضروریات ہیں۔ نفع نے ہر ایک کے لیے مخصوص ورک فلو بنایا ہے۔'
                  : 'From carpet shops selling by the square foot, to pharmacies with DRAP compliance, to jewelry shops tracking live gold rates — every industry has unique workflows. Nafaa built them all.'}
              </p>

              {/* Search bar */}
              <div className="mt-8 max-w-xl relative">
                <Search className="h-5 w-5 text-ink-400 absolute left-5 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={isUr ? 'اپنی صنعت تلاش کریں...' : 'Search your industry — bakery, pharmacy, carpet...'}
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

        {/* CATEGORY FILTER BAR */}
        <div className="sticky top-16 z-30 bg-white/85 dark:bg-ink-900/85 backdrop-blur-lg border-b border-ink-100/60 dark:border-ink-800/60">
          <Container>
            <div className="flex items-center gap-2 py-4 overflow-x-auto scrollbar-hide">
              <Filter className="h-4 w-4 text-ink-400 shrink-0" />
              {filterChips.map((chip) => {
                const Icon = chip.icon;
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
                    {Icon && <Icon className="h-3.5 w-3.5" />}
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

        {/* SIGNATURE HIGHLIGHTS (Hot industries) */}
        {filter === 'all' && !query && (
          <Section variant="default" spacing="md">
            <Container>
              <div className="flex items-center gap-2 mb-6">
                <Flame className="h-5 w-5 text-sunset" />
                <Eyebrow variant="gold">
                  {isUr ? 'سب سے مقبول' : 'Most popular this year'}
                </Eyebrow>
              </div>

              <motion.div
                initial="hidden" whileInView="visible" viewport={viewport}
                variants={staggerContainer(0.06)}
                className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
              >
                {industries.filter((i) => i.hot).slice(0, 6).map((ind) => (
                  <motion.div key={ind.slug} variants={fadeUp}>
                    <Link
                      href={`/industries/${ind.slug}`}
                      className="group relative block rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500"
                    >
                      {/* Aurora bg */}
                      <div className="absolute inset-0" style={{
                        background: `linear-gradient(135deg, ${ind.color}f0, ${ind.colorDark})`,
                      }} />
                      {/* Animated aurora blobs */}
                      <div className="absolute inset-0 overflow-hidden">
                        <motion.div
                          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
                          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                          className="absolute -top-16 -right-16 h-48 w-48 rounded-full blur-3xl opacity-60"
                          style={{ background: ind.auroraColors[1] }}
                        />
                        <motion.div
                          animate={{ x: [0, -20, 0], y: [0, 20, 0] }}
                          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                          className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full blur-3xl opacity-60"
                          style={{ background: ind.auroraColors[2] }}
                        />
                      </div>

                      <div className="relative p-8 text-white min-h-[280px] flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                          <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-4xl shadow-lg">
                            {ind.emoji}
                          </div>
                          <Badge className="!bg-white/20 !text-white !ring-white/30" size="xs">
                            <Flame className="h-3 w-3" /> HOT
                          </Badge>
                        </div>

                        <h3 className={cn('font-display font-extrabold text-2xl mb-2', isUr && 'font-urdu text-3xl')}>
                          {isUr ? ind.nameUr : ind.nameEn}
                        </h3>
                        <p className={cn('text-sm text-white/90 mb-4 flex-1', isUr && 'font-urdu text-base')}>
                          {isUr ? ind.tagUr : ind.tagEn}
                        </p>

                        {/* Signature */}
                        <div className="rounded-xl bg-white/15 backdrop-blur-md p-3 mb-4 ring-1 ring-white/20">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest font-bold text-white/80 mb-1">
                            <Sparkles className="h-3 w-3" />
                            {isUr ? 'صرف نفع میں' : 'Only on Nafaa'}
                          </div>
                          <div className={cn('text-sm font-bold', isUr && 'font-urdu text-base')}>
                            {isUr ? ind.signatureUr : ind.signature}
                          </div>
                        </div>

                        <div className="inline-flex items-center gap-1.5 text-sm font-bold group-hover:gap-2.5 transition-all">
                          {isUr ? 'دیکھیں' : 'Explore'} <ArrowRight className="h-4 w-4" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            </Container>
          </Section>
        )}

        {/* ALL INDUSTRIES GRID */}
        <Section variant="subtle" spacing="lg">
          <Container>
            <div className="flex items-center justify-between mb-8">
              <div>
                <Eyebrow variant="brand">
                  {filter === 'all' ? (isUr ? 'مکمل فہرست' : 'Complete list') :
                    filter === 'hot' ? (isUr ? 'مقبول ترین' : 'Hot industries') :
                    filter === 'featured' ? (isUr ? 'نمایاں' : 'Featured') :
                    isUr ? industryCategories[filter].ur : industryCategories[filter].en}
                </Eyebrow>
                <div className="mt-2 text-sm text-ink-500 flex items-center gap-2">
                  <LiveDot color="emerald" size="sm" />
                  <span className="tabular-nums font-bold">{filtered.length}</span>
                  <span>{isUr ? 'صنعتیں دستیاب' : 'industries available'}</span>
                </div>
              </div>
            </div>

            <AnimatePresence mode="popLayout">
              <motion.div
                key={filter + query}
                initial="hidden" animate="visible"
                variants={staggerContainer(0.03)}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
              >
                {filtered.map((ind) => (
                  <motion.div
                    key={ind.slug}
                    variants={fadeUp}
                    layout
                  >
                    <Link
                      href={`/industries/${ind.slug}`}
                      className="group relative block rounded-2xl overflow-hidden bg-white dark:bg-ink-800 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:-translate-y-1 hover:shadow-card-hover transition-all duration-300"
                    >
                      {/* Colored top strip */}
                      <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${ind.color}, ${ind.colorDark})` }} />

                      {/* Hover gradient overlay */}
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                        style={{ background: `linear-gradient(135deg, ${ind.color}0a, transparent)` }}
                      />

                      <div className="relative p-5">
                        {/* Badges */}
                        <div className="flex items-center justify-between mb-3">
                          <div
                            className="h-12 w-12 rounded-xl flex items-center justify-center text-2xl transition-transform duration-500 group-hover:scale-110 shadow-sm"
                            style={{ background: `linear-gradient(135deg, ${ind.color}25, ${ind.color}10)` }}
                          >
                            {ind.emoji}
                          </div>
                          <div className="flex gap-1">
                            {ind.hot && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-sunset/15 text-sunset flex items-center gap-0.5">
                                <Flame className="h-2.5 w-2.5" /> HOT
                              </span>
                            )}
                            {ind.featured && !ind.hot && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-gold/15 text-amber-600 flex items-center gap-0.5">
                                <Star className="h-2.5 w-2.5" />
                              </span>
                            )}
                          </div>
                        </div>

                        <h3 className={cn(
                          'font-display font-bold text-base leading-tight text-ink-900 dark:text-white mb-1',
                          'group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors',
                          isUr && 'font-urdu text-lg leading-snug',
                        )}>
                          {isUr ? ind.nameUr : ind.nameEn}
                        </h3>
                        <p className={cn(
                          'text-xs text-ink-500 dark:text-ink-400 line-clamp-2 leading-relaxed',
                          isUr && 'font-urdu text-sm',
                        )}>
                          {isUr ? ind.tagUr : ind.tagEn}
                        </p>

                        {/* Key features chips */}
                        <div className="mt-3 flex flex-wrap gap-1">
                          {ind.keyFeatures.slice(0, 2).map((f) => (
                            <span
                              key={f}
                              className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-ink-50 dark:bg-ink-900 text-ink-600 dark:text-ink-400"
                            >
                              {f}
                            </span>
                          ))}
                          {ind.keyFeatures.length > 2 && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-ink-50 dark:bg-ink-900 text-ink-400">
                              +{ind.keyFeatures.length - 2}
                            </span>
                          )}
                        </div>

                        <div className="mt-3 pt-3 border-t border-ink-100 dark:border-ink-800 inline-flex items-center gap-1 text-xs font-bold opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" style={{ color: ind.color }}>
                          {isUr ? 'دیکھیں' : 'Explore'}
                          <ArrowRight className="h-3 w-3" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>

            {filtered.length === 0 && (
              <div className="text-center py-20">
                <Search className="h-12 w-12 mx-auto text-ink-300 dark:text-ink-700 mb-4" />
                <p className="text-ink-500">{isUr ? 'کوئی صنعت نہیں ملی' : 'No industries match your search'}</p>
              </div>
            )}
          </Container>
        </Section>

        {/* CATEGORY OVERVIEW */}
        <Section variant="default" spacing="lg">
          <Container>
            <div className="text-center max-w-3xl mx-auto mb-12">
              <Eyebrow variant="aurora">
                {isUr ? 'چھ اقسام' : 'Six categories'}
              </Eyebrow>
              <h2 className={cn(
                'mt-4 font-display font-extrabold text-3xl lg:text-4xl',
                isUr && 'font-urdu leading-snug',
              )}>
                {isUr ? 'اپنی زمرے کا انتخاب کریں' : 'Find your category'}
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Object.entries(industryCategories) as [IndustryCategory, typeof industryCategories.retail][]).map(([key, cat]) => {
                const count = industries.filter((i) => i.category === key).length;
                return (
                  <button
                    key={key}
                    onClick={() => { setFilter(key); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
                    className="group text-left rounded-2xl bg-white dark:bg-ink-800 p-6 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:ring-brand-400 hover:-translate-y-1 hover:shadow-card-hover transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-4xl">{cat.emoji}</div>
                      <Badge variant="ink" size="xs">{count} industries</Badge>
                    </div>
                    <h3 className={cn('font-display font-bold text-lg group-hover:text-brand-600 transition-colors', isUr && 'font-urdu text-xl')}>
                      {isUr ? cat.ur : cat.en}
                    </h3>
                    <p className={cn('mt-1 text-sm text-ink-600 dark:text-ink-300', isUr && 'font-urdu text-base')}>
                      {isUr ? cat.descUr : cat.descEn}
                    </p>
                  </button>
                );
              })}
            </div>
          </Container>
        </Section>

        <CTA />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
