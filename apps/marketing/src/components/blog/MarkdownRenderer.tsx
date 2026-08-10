'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { useLocale } from '@/components/providers/LocaleProvider';
import { cn } from '@/lib/cn';

export function MarkdownRenderer({ content }: { content: string }) {
  const { locale } = useLocale();
  const isUr = locale === 'ur';

  return (
    <div className={cn(
      'prose prose-lg dark:prose-invert max-w-none',
      'prose-headings:font-display prose-headings:font-extrabold prose-headings:tracking-tight',
      'prose-h2:text-3xl prose-h2:mt-16 prose-h2:mb-6 prose-h2:pb-3 prose-h2:border-b prose-h2:border-ink-100 dark:prose-h2:border-ink-800',
      'prose-h3:text-2xl prose-h3:mt-10 prose-h3:mb-4',
      'prose-p:leading-relaxed prose-p:text-ink-700 dark:prose-p:text-ink-200',
      'prose-a:text-brand-600 prose-a:font-bold prose-a:no-underline hover:prose-a:underline',
      'prose-strong:text-ink-900 dark:prose-strong:text-white prose-strong:font-bold',
      'prose-code:before:content-none prose-code:after:content-none',
      'prose-code:bg-ink-100 dark:prose-code:bg-ink-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono',
      'prose-pre:bg-ink-900 prose-pre:text-ink-100 prose-pre:rounded-2xl prose-pre:p-6',
      'prose-blockquote:border-l-4 prose-blockquote:border-brand-500 prose-blockquote:bg-brand-50 dark:prose-blockquote:bg-brand-950/30 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:not-italic prose-blockquote:rounded-r-2xl',
      'prose-blockquote:text-ink-800 dark:prose-blockquote:text-ink-200',
      'prose-table:my-8 prose-th:bg-ink-50 dark:prose-th:bg-ink-800 prose-th:p-3 prose-th:font-bold prose-th:text-left',
      'prose-td:p-3 prose-td:border-t prose-td:border-ink-100 dark:prose-td:border-ink-700',
      'prose-ul:my-6 prose-ol:my-6 prose-li:my-2',
      isUr && 'font-urdu prose-p:text-lg prose-p:leading-loose prose-li:leading-loose',
    )}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
