import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Clock, ArrowLeft, ArrowRight } from 'lucide-react';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { FloatingWhatsApp } from '@/components/layout/Footer/FloatingWhatsApp';
import { CTA } from '@/components/home/CTA';
import { Container } from '@/components/primitives/Container';
import { Section } from '@/components/primitives/Section';
import { Badge } from '@/components/primitives/Badge';
import { JsonLd } from '@/lib/seo/JsonLdScript';
import { jsonLdArticle, jsonLdBreadcrumb } from '@/lib/seo/jsonld';
import { buildMetadata } from '@/lib/seo/metadata';
import { blogPosts, getPost, blogCategories } from '@/lib/data/blog';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nafaa.pk';

interface Props { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return buildMetadata({ title: 'Post not found' });
  return buildMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${slug}`,
    type: 'article',
    keywords: post.tags,
    publishedTime: post.publishedAt,
    authors: [post.author],
  });
}

const fmt = (d: string) => new Intl.DateTimeFormat('en-PK', { dateStyle: 'long' }).format(new Date(d));

// Minimal markdown renderer (headings, bold, links, lists, tables, paragraphs)
function render(md: string): string {
  return md.trim()
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/^\d+\. (.*$)/gim, '<oli>$1</oli>')
    .replace(/(<oli>.*<\/oli>\n?)+/g, (m) => `<ol>${m.replace(/<\/?oli>/g, (t) => t === '<oli>' ? '<li>' : '</li>')}</ol>`)
    .split('\n\n')
    .map((p) => {
      const t = p.trim();
      if (!t || t.startsWith('<h') || t.startsWith('<ul') || t.startsWith('<ol') || t.startsWith('<li') || t.startsWith('<table')) return t;
      if (t.startsWith('|')) {
        const rows = t.split('\n').filter((r) => r.trim() && !r.includes('---'));
        const html = rows.map((r, i) => {
          const cells = r.split('|').map((c) => c.trim()).filter(Boolean);
          const tag = i === 0 ? 'th' : 'td';
          return `<tr>${cells.map((c) => `<${tag}>${c}</${tag}>`).join('')}</tr>`;
        }).join('');
        return `<table>${html}</table>`;
      }
      return `<p>${t.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('\n');
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const related = blogPosts.filter((p) => p.slug !== slug && p.category === post.category).slice(0, 3);
  const cat = blogCategories.find((c) => c.slug === post.category);

  return (
    <>
      <JsonLd id={`article-${slug}`} data={jsonLdArticle({
        title: post.title, description: post.excerpt, author: post.author,
        datePublished: post.publishedAt, url: `${SITE_URL}/blog/${slug}`,
      })} />
      <JsonLd id={`breadcrumb-blog-${slug}`} data={jsonLdBreadcrumb([
        { name: 'Home', url: '/' },
        { name: 'Blog', url: '/blog' },
        { name: post.title, url: `/blog/${slug}` },
      ])} />
      <Header />
      <main className="flex-1">
        <article>
          <Section variant="default" spacing="md">
            <Container size="md">
              <Link href="/blog" className="text-sm text-ink-500 hover:text-brand-600 inline-flex items-center gap-1.5 mb-8 transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to blog
              </Link>
              <Badge variant="brand">{cat?.emoji} {cat?.name}</Badge>
              <h1 className="mt-6 font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-tight text-balance">
                {post.title}
              </h1>
              <p className="mt-5 text-lg lg:text-xl text-ink-600 dark:text-ink-300 leading-relaxed">
                {post.excerpt}
              </p>
              <div className="mt-7 flex items-center justify-between flex-wrap gap-4 pb-7 border-b border-ink-100 dark:border-ink-700/60">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-gradient-brand text-white flex items-center justify-center font-display font-extrabold">
                    {post.author[0]}
                  </div>
                  <div>
                    <div className="font-bold text-sm">{post.author}</div>
                    <div className="text-xs text-ink-500">{post.authorRole}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-ink-500">
                  <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{fmt(post.publishedAt)}</span>
                  <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{post.readTime} min read</span>
                </div>
              </div>
            </Container>
          </Section>

          <Section variant="default" spacing="none" className="pb-16">
            <Container size="md">
              <div className="prose-nafaa" dangerouslySetInnerHTML={{ __html: render(post.content) }} />
              <div className="mt-10 flex flex-wrap gap-2">
                {post.tags.map((t) => (
                  <Badge key={t} variant="ink" size="sm">#{t}</Badge>
                ))}
              </div>
            </Container>
          </Section>
        </article>

        {related.length > 0 && (
          <Section variant="subtle" spacing="lg">
            <Container>
              <h2 className="font-display font-extrabold text-2xl lg:text-3xl mb-8">Keep reading</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {related.map((p) => (
                  <Link key={p.slug} href={`/blog/${p.slug}`}
                    className="group rounded-2xl bg-white dark:bg-ink-800 p-6 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:-translate-y-1 hover:shadow-card-hover transition-all">
                    <h3 className="font-display font-bold group-hover:text-brand-600 transition-colors line-clamp-2">{p.title}</h3>
                    <p className="mt-2 text-sm text-ink-500 line-clamp-2">{p.excerpt}</p>
                    <div className="mt-4 text-xs text-ink-400 flex items-center gap-1.5">
                      Read <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            </Container>
          </Section>
        )}

        <CTA />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
