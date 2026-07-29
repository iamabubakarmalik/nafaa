import Link from 'next/link';
import { Calendar, Clock, ArrowRight, BookOpen } from 'lucide-react';
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
import { blogPosts, blogCategories, featuredPosts } from '@/lib/data/blog';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Blog — guides, tutorials & stories for Pakistani businesses',
  description: 'Pakistan\'s best business blog: FBR compliance guides, digital khata tutorials, industry insights, and real success stories from Pakistani shopkeepers.',
  path: '/blog',
});

const fmt = (d: string) => new Intl.DateTimeFormat('en-PK', { dateStyle: 'long' }).format(new Date(d));

export default function BlogPage() {
  const featured = featuredPosts[0];
  const rest = blogPosts.filter((p) => p.slug !== featured?.slug);

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-16">
          <AuroraBackground variant="aurora" intensity="base" />
          <GridBackground className="mask-fade-bottom" />
          <NoiseTexture />
          <Container className="relative text-center">
            <Eyebrow variant="aurora" icon={<BookOpen className="h-3.5 w-3.5" />}>
              Knowledge hub
            </Eyebrow>
            <h1 className="mt-6 font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.05] tracking-tight">
              <GradientText variant="aurora">Learn. Grow. Dominate.</GradientText>
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-ink-600 dark:text-ink-300 max-w-2xl mx-auto">
              Guides, tutorials, compliance explainers, and real stories — everything a Pakistani business needs to win in 2026.
            </p>
          </Container>
        </section>

        {/* Featured */}
        {featured && (
          <Section variant="default" spacing="sm">
            <Container>
              <Link
                href={`/blog/${featured.slug}`}
                className="group block relative rounded-3xl overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-emerald-800 p-10 lg:p-14 text-white shadow-brand-glow hover:shadow-[0_24px_64px_-8px_rgba(18,183,106,0.5)] transition-shadow"
              >
                <Badge className="!bg-white/20 !text-white !ring-white/30">⭐ Featured · {blogCategories.find((c) => c.slug === featured.category)?.name}</Badge>
                <h2 className="mt-6 font-display font-extrabold text-3xl lg:text-5xl leading-tight text-balance max-w-3xl">
                  {featured.title}
                </h2>
                <p className="mt-4 text-lg text-white/90 max-w-2xl leading-relaxed">{featured.excerpt}</p>
                <div className="mt-6 flex items-center gap-5 text-sm text-white/80">
                  <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{fmt(featured.publishedAt)}</span>
                  <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{featured.readTime} min read</span>
                  <span className="hidden sm:block">{featured.author}</span>
                </div>
                <div className="mt-6 inline-flex items-center gap-2 font-bold">
                  Read the guide <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </Container>
          </Section>
        )}

        {/* All posts */}
        <Section variant="subtle" spacing="lg">
          <Container>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rest.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group rounded-3xl bg-white dark:bg-ink-800 p-6 ring-1 ring-inset ring-ink-100 dark:ring-ink-700/60 hover:-translate-y-1 hover:shadow-card-hover transition-all duration-300 flex flex-col"
                >
                  <Badge variant="brand" size="xs">
                    {post.categoryEmoji} {blogCategories.find((c) => c.slug === post.category)?.name}
                  </Badge>
                  <h3 className="mt-4 font-display font-extrabold text-xl leading-tight group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-3">
                    {post.title}
                  </h3>
                  <p className="mt-3 text-sm text-ink-600 dark:text-ink-300 leading-relaxed line-clamp-3 flex-1">
                    {post.excerpt}
                  </p>
                  <div className="mt-5 pt-5 border-t border-ink-100 dark:border-ink-700/60 flex items-center justify-between text-xs text-ink-500">
                    <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{fmt(post.publishedAt)}</span>
                    <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{post.readTime} min</span>
                  </div>
                </Link>
              ))}
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
