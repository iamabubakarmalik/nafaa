'use client';

import { useLocale } from '@/components/providers/LocaleProvider';
import { cn } from '@/lib/cn';
import type { BlogPost } from '@/lib/data/blog/types';

export function BlogAuthorCard({ author, publishedAt, readingTime }: {
  author: BlogPost['author'];
  publishedAt: string;
  readingTime: number;
}) {
  const { locale } = useLocale();
  const isUr = locale === 'ur';

  const date = new Date(publishedAt);
  const dateStr = date.toLocaleDateString(isUr ? 'ur-PK' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="flex items-center gap-3">
      <div
        className="h-11 w-11 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0"
        style={{ background: `linear-gradient(135deg, ${author.color}, ${author.color}dd)` }}
      >
        {author.avatarInitials}
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn('font-bold text-sm text-ink-900 dark:text-white', isUr && 'font-urdu text-base')}>
          {author.name}
        </div>
        <div className={cn('text-xs text-ink-500 flex items-center gap-2', isUr && 'font-urdu text-sm')}>
          <span>{author.role}</span>
          <span>·</span>
          <span>{dateStr}</span>
          <span>·</span>
          <span>{readingTime} {isUr ? 'منٹ' : 'min read'}</span>
        </div>
      </div>
    </div>
  );
}
