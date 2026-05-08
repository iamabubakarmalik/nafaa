import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Clock, ArrowLeft } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { categories, getPostsByCategory } from '@/lib/blog/posts';
import { buildMetadata } from '@/lib/seo';

export async function generateStaticParams() {
  return categories.filter((c) => c.slug !== 'all').map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) return buildMetadata({ title: 'Category Not Found' });
  return buildMetadata({
    title: `${cat.name} — Nafaa Blog`,
    description: `Latest articles in the ${cat.name} category. Tips, insights, and stories for Pakistani retailers.`,
    path: `/blog/category/${slug}`,
  });
}

const formatDate = (d: string) =>
  new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(d));

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) notFound();

  const posts = getPostsByCategory(slug);

  return (
    <>
      <Header />
      <main>
        <section className="relative pt-20 pb-12 overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-50 dark:opacity-30 pointer-events-none" />
          <Container className="relative text-center">
            <Link href="/blog" className="text-sm text-slate-500 hover:text-brand-600 inline-flex items-center gap-1 mb-6">
              <ArrowLeft className="h-4 w-4" /> All Posts
            </Link>
            <div className="text-6xl mb-4">{cat.emoji}</div>
            <Badge variant="brand">Category</Badge>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
              <span className="gradient-text">{cat.name}</span>
            </h1>
            <p className="mt-4 text-slate-600 dark:text-slate-400 text-lg">
              {posts.length} article{posts.length !== 1 ? 's' : ''} in this category
            </p>
          </Container>
        </section>

        <section className="py-12">
          <Container>
            {posts.length === 0 ? (
              <div className="text-center py-20 text-slate-500">
                <p>No posts in this category yet. Check back soon!</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((post) => (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="group rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 hover:border-brand-300 hover:shadow-xl hover:-translate-y-1 transition-all"
                  >
                    <h3 className="font-extrabold text-lg leading-tight group-hover:text-brand-600 transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-3">{post.excerpt}</p>
                    <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(post.publishedAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {post.readTime} min
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
