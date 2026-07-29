import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { FloatingWhatsApp } from '@/components/layout/Footer/FloatingWhatsApp';
import { CTA } from '@/components/home/CTA';
import { IndustryHero } from '@/components/industry/IndustryHero';
import { IndustryPainsSolutions } from '@/components/industry/IndustryPainsSolutions';
import { IndustrySolutions } from '@/components/industry/IndustrySolutions';
import { IndustryWorkflow } from '@/components/industry/IndustryWorkflow';
import { IndustryMetrics } from '@/components/industry/IndustryMetrics';
import { IndustryIntegrations } from '@/components/industry/IndustryIntegrations';
import { IndustryTestimonials } from '@/components/industry/IndustryTestimonials';
import { IndustryFAQ } from '@/components/industry/IndustryFAQ';
import { IndustryRelated } from '@/components/industry/IndustryRelated';
import { JsonLd } from '@/lib/seo/JsonLdScript';
import { jsonLdProduct, jsonLdBreadcrumb } from '@/lib/seo/jsonld';
import { buildMetadata } from '@/lib/seo/metadata';
import { industries, getIndustry } from '@/lib/data/industries';
import { getIndustryContent } from '@/lib/data/industry-content';
import { buildIndustryContent } from '@/lib/data/content-defaults';

interface Props { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return industries.map((i) => ({ slug: i.slug }));
}

function resolve(slug: string) {
  const industry = getIndustry(slug);
  if (!industry) return null;
  const content = getIndustryContent(slug) ?? buildIndustryContent(industry);
  return { industry, content };
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const r = resolve(slug);
  if (!r) return buildMetadata({ title: 'Industry not found' });
  return buildMetadata({
    title: `${r.industry.nameEn} software in Pakistan`,
    description: r.content.heroSubtitleEn,
    path: `/industries/${slug}`,
    keywords: [
      `${r.industry.nameEn.toLowerCase()} software pakistan`,
      `${r.industry.nameEn.toLowerCase()} POS pakistan`,
      ...r.industry.keyFeatures,
    ],
  });
}

export default async function IndustryPage({ params }: Props) {
  const { slug } = await params;
  const r = resolve(slug);
  if (!r) notFound();
  const { industry, content } = r;

  return (
    <>
      <JsonLd id={`product-${slug}`} data={jsonLdProduct({ name: content.heroTitleEn, description: content.directAnswerEn, slug: `/industries/${slug}` })} />
      <JsonLd id={`breadcrumb-${slug}`} data={jsonLdBreadcrumb([
        { name: 'Home', url: '/' },
        { name: 'Industries', url: '/industries' },
        { name: industry.nameEn, url: `/industries/${slug}` },
      ])} />
      <Header />
      <main className="flex-1">
        <IndustryHero industry={industry} content={content} />
        <IndustryPainsSolutions content={content} />
        <IndustrySolutions industry={industry} content={content} />
        <IndustryWorkflow industry={industry} content={content} />
        <IndustryMetrics content={content} />
        <IndustryIntegrations industry={industry} content={content} />
        <IndustryTestimonials industry={industry} content={content} />
        <IndustryFAQ industry={industry} content={content} />
        <IndustryRelated current={industry} />
        <CTA />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
