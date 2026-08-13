import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { FloatingWhatsApp } from '@/components/layout/Footer/FloatingWhatsApp';
import { CTA } from '@/components/home/CTA';
import { IndustryHero } from '@/components/industry/IndustryHero';
import { IndustrySignature } from '@/components/industry/IndustrySignature';
import { IndustrySignatureWidget } from '@/components/industry/IndustrySignatureWidget';
import { IndustryPainsSolutions } from '@/components/industry/IndustryPainsSolutions';
import { IndustrySolutions } from '@/components/industry/IndustrySolutions';
import { IndustryWorkflow } from '@/components/industry/IndustryWorkflow';
import { IndustryComparison } from '@/components/industry/IndustryComparison';
import { IndustryCaseStudy } from '@/components/industry/IndustryCaseStudy';
import { IndustryROICalculator } from '@/components/industry/IndustryROICalculator';
import { IndustryMetrics } from '@/components/industry/IndustryMetrics';
import { IndustryIntegrations } from '@/components/industry/IndustryIntegrations';
import { IndustryTestimonials } from '@/components/industry/IndustryTestimonials';
import { IndustryFAQ } from '@/components/industry/IndustryFAQ';
import { IndustryExplorer } from '@/components/industry/IndustryExplorer';
import { JsonLd } from '@/lib/seo/JsonLdScript';
import { IndustrySchemas } from '@/lib/seo/injector';
import { jsonLdProduct, jsonLdBreadcrumb, jsonLdFAQ } from '@/lib/seo/jsonld';
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
    title: `${r.industry.nameEn} software in Pakistan — ${r.industry.tagEn}`,
    description: r.content.heroSubtitleEn,
    path: `/industries/${slug}`,
    keywords: [
      `${r.industry.nameEn.toLowerCase()} software pakistan`,
      `${r.industry.nameEn.toLowerCase()} POS pakistan`,
      `${r.industry.nameEn.toLowerCase()} management software`,
      `best ${r.industry.nameEn.toLowerCase()} software`,
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
      <IndustrySchemas slug={industry.slug} nameEn={industry.nameEn} tagEn={industry.tagEn} />
      <JsonLd id={`product-${slug}`} data={jsonLdProduct({ name: content.heroTitleEn, description: content.directAnswerEn, slug: `/industries/${slug}` })} />
      <JsonLd id={`breadcrumb-${slug}`} data={jsonLdBreadcrumb([
        { name: 'Home', url: '/' },
        { name: 'Industries', url: '/industries' },
        { name: industry.nameEn, url: `/industries/${slug}` },
      ])} />
      {content.faqs && content.faqs.length > 0 && (
        <JsonLd id={`faq-${slug}`} data={jsonLdFAQ(content.faqs.map((f) => ({ q: f.qEn, a: f.aEn })))} />
      )}

      <Header />
      <main className="flex-1">
        <IndustryHero industry={industry} content={content} />
        <IndustrySignature industry={industry} />
        <IndustrySignatureWidget industry={industry} />
        <IndustryPainsSolutions industry={industry} content={content} />
        <IndustrySolutions industry={industry} content={content} />
        <IndustryWorkflow industry={industry} content={content} />
        <IndustryROICalculator industry={industry} />
        <IndustryComparison industry={industry} />
        <IndustryCaseStudy industry={industry} />
        <IndustryMetrics industry={industry} content={content} />
        <IndustryIntegrations industry={industry} content={content} />
        <IndustryTestimonials industry={industry} content={content} />
        <IndustryFAQ industry={industry} content={content} />
        <IndustryExplorer current={industry} />
        <CTA />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
