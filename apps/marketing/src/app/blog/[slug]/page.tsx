import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Clock, ArrowLeft, Share2, Twitter, Facebook, Linkedin } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { CTA } from '@/components/home/CTA';
import { getPostBySlug, getRelatedPosts, blogPosts, categories } from '@/lib/blog/posts';
import { buildMetadata } from '@/lib/seo';
import Script from 'next/script';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nafaa.pk';

export async function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return buildMetadata({ title: 'Post Not Found' });
  return buildMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${slug}`,
    type: 'article',
    keywords: post.tags,
  });
}

const formatDate = (d: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'long' }).format(new Date(d));

// Simple markdown-to-HTML for the inline content
function renderContent(md: string): string {
  return md
    .trim()
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-extrabold mt-8 mb-3">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl lg:text-3xl font-extrabold mt-10 mb-4 gradient-text">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl lg:text-4xl font-extrabold mt-10 mb-5">$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-brand-600 dark:text-brand-400 font-semibold hover:underline">$1</a>')
    // Blockquotes
    .replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-brand-500 pl-4 my-5 italic text-slate-600 dark:text-slate-400">$1</blockquote>')
    // Tables (simple)
    .replace(/\|(.+)\|\n\|[-\s|]+\|\n((?:\|.+\|\n?)+)/g, (_match, header, rows) => {
      const headers = header.split('|').map((h: string) => h.trim()).filter(Boolean);
      const rowsHtml = rows
        .trim()
        .split('\n')
        .map((row: string) => {
          const cells = row.split('|').map((c: string) => c.trim()).filter(Boolean);
          return `<tr class="border-b border-slate-200 dark:border-slate-800">${cells
            .map((c: string) => `<td class="px-4 py-2.5 text-sm">${c}</td>`)
            .join('')}</tr>`;
        })
        .join('');
      return `<div class="my-6 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800"><table class="min-w-full"><thead class="bg-slate-50 dark:bg-slate-900"><tr>${headers
        .map((h: string) => `<th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">${h}</th>`)
        .join('')}</tr></thead><tbody>${rowsHtml}</tbody></table></div>`;
    })
    // Lists
    .replace(/^- (.*$)/gim, '<li class="ml-5 list-disc text-slate-700 dark:text-slate-300 leading-relaxed mb-1">$1</li>')
    // Paragraphs (lines that aren't HTML)
    .split('\n\n')
    .map((para) => {
      const trimmed = para.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<')) return trimmed;
      return `<p class="text-slate-700 dark:text-slate-300 leading-relaxed text-base lg:text-lg my-4">${trimmed}</p>`;
    })
    .join('\n');
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const related = getRelatedPosts(slug, 3);
  const url = `${SITE_URL}/blog/${slug}`;

  // Article schema
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    author: { '@type': 'Person', name: post.author },
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    publisher: {
      '@type': 'Organization',
      name: 'Nafaa',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  };

  return (
    <>
      <Script
        id="article-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <Header />
      <main>
        <article>
          {/* Hero */}
          <section className="relative pt-20 pb-12 overflow-hidden">
            <div className="absolute inset-0 bg-grid-pattern opacity-50 dark:opacity-30 pointer-events-none" />
            <Container className="relative max-w-4xl">
              <Link
                href="/blog"
                className="text-sm text-slate-500 hover:text-brand-600 inline-flex items-center gap-1 mb-6"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Blog
              </Link>

              <Badge variant="brand">
                {categories.find((c) => c.slug === post.category)?.emoji}{' '}
                {categories.find((c) => c.slug === post.category)?.name || post.category}
              </Badge>

              <h1 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-balance">
                {post.title}
              </h1>

              <p className="mt-5 text-lg lg:text-xl text-slate-600 dark:text-slate-400 leading-relaxed">
                {post.excerpt}
              </p>

              <div className="mt-7 flex items-center justify-between flex-wrap gap-4 pb-7 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-brand-100 to-emerald-100 dark:from-brand-900 dark:to-emerald-900 flex items-center justify-center text-xl">
                    {post.authorAvatar}
                  </div>
                  <div>
                    <div className="font-bold">{post.author}</div>
                    <div className="text-xs text-slate-500">{post.authorRole}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {formatDate(post.publishedAt)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {post.readTime} min read
                  </span>
                </div>
              </div>
            </Container>
          </section>

          {/* Content */}
          <section className="py-8 lg:py-12">
            <Container className="max-w-3xl">
              <div
                className="article-content"
                dangerouslySetInnerHTML={{ __html: renderContent(post.content) }}
              />

              {/* Tags */}
              <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold mr-2">Tags:</span>
                  {post.tags.map((t) => (
                    <Badge key={t} variant="slate">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Share */}
              <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-bold inline-flex items-center gap-2">
                    <Share2 className="h-4 w-4" /> Share this article:
                  </span>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(url)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-brand-100 dark:hover:bg-brand-950 hover:text-brand-600 flex items-center justify-center transition-colors"
                  >
                    <Twitter className="h-4 w-4" />
                  </a>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-brand-100 dark:hover:bg-brand-950 hover:text-brand-600 flex items-center justify-center transition-colors"
                  >
                    <Facebook className="h-4 w-4" />
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-brand-100 dark:hover:bg-brand-950 hover:text-brand-600 flex items-center justify-center transition-colors"
                  >
                    <Linkedin className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </Container>
          </section>
        </article>

        {/* Related */}
        {related.length > 0 && (
          <section className="py-16 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800">
            <Container>
              <h2 className="text-2xl font-extrabold mb-8">Related Articles</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {related.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/blog/${p.slug}`}
                    className="group rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 hover:border-brand-300 hover:shadow-xl transition-all"
                  >
                    <Badge variant="brand">
                      {categories.find((c) => c.slug === p.category)?.name}
                    </Badge>
                    <h3 className="mt-4 font-extrabold group-hover:text-brand-600 transition-colors line-clamp-2">
                      {p.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{p.excerpt}</p>
                    <div className="mt-4 text-xs text-slate-500 flex items-center gap-3">
                      <span>{formatDate(p.publishedAt)}</span>
                      <span>•</span>
                      <span>{p.readTime} min</span>
                    </div>
                  </Link>
                ))}
              </div>
            </Container>
          </section>
        )}

        <CTA />
      </main>
      <Footer />
    </>
  );
}
