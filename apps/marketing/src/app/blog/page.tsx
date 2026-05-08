import Link from 'next/link';
import { Calendar, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { CTA } from '@/components/home/CTA';
import { blogPosts, categories, getFeaturedPosts } from '@/lib/blog/posts';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Blog — Tips, Tutorials & Success Stories',
  description:
    'Pakistan\'s #1 retail blog. Tips for shopkeepers, success stories, product updates, and industry insights.',
  path: '/blog',
});

const formatDate = (d: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(d));

export default function BlogPage() {
  const featured = getFeaturedPosts();
  const recent = blogPosts.filter((p) => !p.featured);

  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="relative pt-20 pb-12 overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-50 dark:opacity-30 pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-96 w-[800px] bg-brand-500/20 rounded-full blur-3xl" />
          <Container className="relative text-center">
            <Badge variant="gradient">📚 Knowledge Hub</Badge>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
              <span className="gradient-text">Nafaa Blog</span>
            </h1>
            <p className="mt-5 text-lg lg:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Pakistani shopkeepers ke liye tips, tutorials, aur kahaniyaan
            </p>
          </Container>
        </section>

        {/* Categories */}
        <section className="py-6 border-y border-slate-200 dark:border-slate-800 sticky top-16 lg:top-18 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
          <Container>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  href={c.slug === 'all' ? '/blog' : `/blog/category/${c.slug}`}
                  className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-900 hover:bg-brand-100 dark:hover:bg-brand-950/40 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
                >
                  {c.emoji} {c.name}
                </Link>
              ))}
            </div>
          </Container>
        </section>

        {/* Featured */}
        {featured.length > 0 && (
          <section className="py-12 lg:py-16">
            <Container>
              <div className="flex items-center gap-2 mb-8">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <h2 className="text-2xl font-extrabold">Featured Posts</h2>
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                {featured.map((post) => (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="group rounded-3xl overflow-hidden bg-gradient-to-br from-brand-600 to-emerald-700 text-white p-8 lg:p-10 hover:shadow-2xl transition-all"
                  >
                    <Badge className="!bg-white/20 !text-white !border-white/30">
                      {categories.find((c) => c.slug === post.category)?.name || post.category}
                    </Badge>
                    <h3 className="mt-5 text-2xl lg:text-3xl font-extrabold leading-tight">{post.title}</h3>
                    <p className="mt-3 text-white/90 leading-relaxed">{post.excerpt}</p>
                    <div className="mt-6 flex items-center gap-4 text-sm text-white/80">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(post.publishedAt)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {post.readTime} min read
                      </span>
                    </div>
                    <div className="mt-5 inline-flex items-center gap-1 text-sm font-bold">
                      Read Article <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            </Container>
          </section>
        )}

        {/* Recent */}
        <section className="py-12 lg:py-16 bg-slate-50 dark:bg-slate-950/50">
          <Container>
            <h2 className="text-2xl font-extrabold mb-8">Latest Articles</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recent.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-xl hover:-translate-y-1 transition-all"
                >
                  <Badge variant="brand">
                    {categories.find((c) => c.slug === post.category)?.emoji}{' '}
                    {categories.find((c) => c.slug === post.category)?.name || post.category}
                  </Badge>
                  <h3 className="mt-4 text-lg font-extrabold leading-tight group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {post.excerpt}
                  </p>
                  <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-100 to-emerald-100 dark:from-brand-900 dark:to-emerald-900 flex items-center justify-center text-base">
                        {post.authorAvatar}
                      </div>
                      <div className="text-xs">
                        <div className="font-bold">{post.author}</div>
                        <div className="text-slate-500">{formatDate(post.publishedAt)}</div>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {post.readTime}m
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </Container>
        </section>

        <CTA />
      </main>
      <Footer />
    </>
  );
}
