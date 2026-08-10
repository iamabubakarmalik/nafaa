'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Clock, ArrowRight } from 'lucide-react';
import { useLocale } from '@/components/providers/LocaleProvider';
import { blogCategories, type BlogPost } from '@/lib/data/blog/types';
import { cn } from '@/lib/cn';

export function BlogCard({ post, featured = false }: { post: BlogPost; featured?: boolean }) {
  const { locale } = useLocale();
  const isUr = locale === 'ur';
  const cat = blogCategories[post.category];

  const date = new Date(post.publishedAt);
  const dateStr = date.toLocaleDateString(isUr ? 'ur-PK' : 'en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <Link
      href={`/blog/${post.slug}`}
      className={cn(
        'group relative block rounded-3xl overflow-hidden bg-white dark:bg-ink-800',
        'ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60',
        'hover:-translate-y-1 hover:shadow-card-hover transition-all duration-300',
        featured && 'lg:col-span-2',
      )}
    >
      {/* Hero visual */}
      <div
        className={cn('relative overflow-hidden', featured ? 'aspect-[16/8]' : 'aspect-[16/9]')}
        style={{ background: `linear-gradient(135deg, ${post.hero.gradient[0]}, ${post.hero.gradient[1]})` }}
      >
        <motion.div
          animate={{ y: [0, -8, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className={cn(
            'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            featured ? 'text-9xl' : 'text-8xl',
          )}
        >
          {post.hero.emoji}
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

        {/* Category chip */}
        <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md ring-1 ring-inset ring-white/30 text-white text-xs font-bold">
          <span>{cat.emoji}</span>
          <span className={cn(isUr && 'font-urdu')}>{isUr ? cat.labelUr : cat.labelEn}</span>
        </div>

        {post.featured && (
          <div className="absolute top-4 right-4 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gold text-ink-900 text-[10px] font-bold uppercase tracking-widest">
            {isUr ? 'نمایاں' : 'Featured'}
          </div>
        )}
      </div>

      {/* Body */}
      <div className={cn('p-6', featured && 'lg:p-8')}>
        <h3 className={cn(
          'font-display font-extrabold leading-tight mb-3 text-ink-900 dark:text-white',
          'group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors',
          featured ? 'text-2xl lg:text-3xl' : 'text-xl',
          isUr && 'font-urdu leading-snug',
        )}>
          {isUr ? post.titleUr : post.titleEn}
        </h3>
        <p className={cn(
          'text-ink-600 dark:text-ink-300 line-clamp-3 mb-4',
          isUr ? 'font-urdu text-base leading-loose' : 'text-sm leading-relaxed',
        )}>
          {isUr ? post.excerptUr : post.excerptEn}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
              style={{ background: post.author.color }}
            >
              {post.author.avatarInitials}
            </div>
            <div className="text-xs">
              <div className={cn('font-bold text-ink-800 dark:text-ink-100', isUr && 'font-urdu text-sm')}>
                {post.author.name}
              </div>
              <div className="text-ink-500 flex items-center gap-1.5">
                <span>{dateStr}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {post.readingTimeMin}m</span>
              </div>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-ink-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </Link>
  );
}
