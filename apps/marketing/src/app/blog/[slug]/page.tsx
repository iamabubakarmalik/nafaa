import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Share2, Bookmark } from 'lucide-react';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { FloatingWhatsApp } from '@/components/layout/Footer/FloatingWhatsApp';
import { CTA } from '@/components/home/CTA';
import { Container } from '@/components/primitives/Container';
import { MarkdownRenderer } from '@/components/blog/MarkdownRenderer';
import { BlogAuthorCard } from '@/components/blog/BlogAuthorCard';
import { BlogTOC } from '@/components/blog/BlogTOC';
import { BlogCard } from '@/components/blog/BlogCard';
import { JsonLd } from '@/lib/seo/JsonLdScript';
import { BlogSchemas } from '@/lib/seo/injector';
import { jsonLdArticle, jsonLdBreadcrumb } from '@/lib/seo/jsonld';
import { buildMetadata } from '@/lib/seo/metadata';
import { blogPosts, getBlogPost, getRelatedPosts } from '@/lib/data/blog/posts';
import { blogCategories } from '@/lib/data/blog/types';

interface Props { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return buildMetadata({ title: 'Post not found' });
  return buildMetadata({
    title: post.titleEn,
    description: post.excerptEn,
    path: `/blog/${slug}`,
    keywords: post.tags,
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const cat = blogCategories[post.category];
  const related = getRelatedPosts(post, 3);

  return (
    <>
      <BlogSchemas title={post.titleEn} description={post.excerptEn} author={post.author.name} datePublished={post.publishedAt} dateModified={post.updatedAt} slug={post.slug} image={(post as any).image || (post as any).ogImage} />
      <JsonLd id={`article-${slug}`} data={jsonLdArticle({ title: post.titleEn, description: post.excerptEn, datePublished: post.publishedAt, dateModified: post.updatedAt, author: post.author.name, url: `/blog/${slug}` })} />
      <JsonLd id={`breadcrumb-${slug}`} data={jsonLdBreadcrumb([
        { name: 'Home', url: '/' },
        { name: 'Blog', url: '/blog' },
        { name: post.titleEn, url: `/blog/${slug}` },
      ])} />

      <Header />
      <main className="flex-1">
        {/* HERO */}
        <section
          className="relative overflow-hidden pt-12 pb-16 text-white"
          style={{ background: `linear-gradient(135deg, ${post.hero.gradient[0]}, ${post.hero.gradient[1]})` }}
        >
          <div className="absolute -top-20 -right-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

          <Container className="relative">
            <div className="max-w-4xl">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-sm font-bold text-white/80 hover:text-white mb-6 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to blog
              </Link>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md ring-1 ring-inset ring-white/30 text-xs font-bold mb-6">
                <span>{cat.emoji}</span>
                <span>{cat.labelEn}</span>
              </div>

              <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl leading-[1.1] tracking-tight text-balance mb-6">
                {post.titleEn}
              </h1>

              <p className="text-xl leading-relaxed text-white/90 mb-8">
                {post.excerptEn}
              </p>

              <div className="flex items-center gap-6 pt-6 border-t border-white/20">
                <div className="flex items-center gap-3">
                  <div
                    className="h-11 w-11 rounded-full flex items-center justify-center text-white font-bold text-sm ring-2 ring-white/40"
                    style={{ background: post.author.color }}
                  >
                    {post.author.avatarInitials}
                  </div>
                  <div>
                    <div className="font-bold text-sm">{post.author.name}</div>
                    <div className="text-xs text-white/70">{post.author.role}</div>
                  </div>
                </div>
                <div className="text-xs text-white/70 border-l border-white/20 pl-6">
                  {new Date(post.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  <br />
                  {post.readingTimeMin} min read
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* BODY */}
        <Container className="py-16">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* TOC sidebar */}
            <aside className="lg:col-span-1 order-2 lg:order-1">
              <div className="lg:sticky lg:top-24 space-y-4">
                <BlogTOC toc={post.tocEn} />

                {/* Share actions */}
                <div className="flex gap-2">
                  <button className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-white dark:bg-ink-800 ring-1 ring-inset ring-ink-200 dark:ring-ink-700 text-xs font-bold hover:shadow-md transition-all">
                    <Share2 className="h-3.5 w-3.5" /> Share
                  </button>
                  <button className="flex-1 inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-white dark:bg-ink-800 ring-1 ring-inset ring-ink-200 dark:ring-ink-700 text-xs font-bold hover:shadow-md transition-all">
                    <Bookmark className="h-3.5 w-3.5" /> Save
                  </button>
                </div>
              </div>
            </aside>

            {/* Article */}
            <article className="lg:col-span-3 order-1 lg:order-2">
              <MarkdownRenderer content={post.contentEn} />

              {/* Tags */}
              <div className="mt-12 pt-8 border-t border-ink-100 dark:border-ink-800">
                <div className="text-xs font-mono uppercase tracking-widest font-bold text-ink-500 mb-3">Tags</div>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span key={tag} className="px-3 py-1 rounded-full text-xs font-bold bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-200">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Author card at bottom */}
              <div className="mt-8 rounded-2xl bg-ink-50 dark:bg-ink-900 p-6">
                <BlogAuthorCard author={post.author} publishedAt={post.publishedAt} readingTime={post.readingTimeMin} />
                <p className="mt-3 text-sm text-ink-600 dark:text-ink-300 leading-relaxed">
                  Have questions about this article? Reach out to {post.author.name.split(' ')[0]} on WhatsApp — they'll personally respond.
                </p>
              </div>
            </article>
          </div>
        </Container>

        {/* RELATED */}
        {related.length > 0 && (
          <section className="bg-ink-50 dark:bg-ink-900 py-16">
            <Container>
              <div className="mb-8">
                <div className="text-xs font-mono uppercase tracking-widest font-bold text-brand-600 mb-2">Keep reading</div>
                <h2 className="font-display font-extrabold text-3xl">Related articles</h2>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {related.map((r) => (
                  <BlogCard key={r.slug} post={r} />
                ))}
              </div>
            </Container>
          </section>
        )}

        <CTA />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
