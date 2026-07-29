import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { FloatingWhatsApp } from '@/components/layout/Footer/FloatingWhatsApp';
import { CTA } from '@/components/home/CTA';
import { FeatureHero } from '@/components/feature/FeatureHero';
import { FeatureCapabilities } from '@/components/feature/FeatureCapabilities';
import { FeatureShowcase } from '@/components/feature/FeatureShowcase';
import { FeatureCompare } from '@/components/feature/FeatureCompare';
import { FeatureMetrics } from '@/components/feature/FeatureMetrics';
import { FeatureFAQ } from '@/components/feature/FeatureFAQ';
import { FeatureRelated } from '@/components/feature/FeatureRelated';
import { JsonLd } from '@/lib/seo/JsonLdScript';
import { jsonLdProduct, jsonLdBreadcrumb } from '@/lib/seo/jsonld';
import { buildMetadata } from '@/lib/seo/metadata';
import { features, getFeature } from '@/lib/data/features';
import { getFeatureContent } from '@/lib/data/feature-content';
import { buildFeatureContent } from '@/lib/data/content-defaults';

interface Props { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return features.map((f) => ({ slug: f.slug }));
}

function resolve(slug: string) {
  const feature = getFeature(slug);
  if (!feature) return null;
  const content = getFeatureContent(slug) ?? buildFeatureContent(feature);
  return { feature, content };
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const r = resolve(slug);
  if (!r) return buildMetadata({ title: 'Feature not found' });
  return buildMetadata({
    title: `${r.feature.nameEn} — Nafaa`,
    description: r.content.heroSubtitleEn,
    path: `/product/${slug}`,
  });
}

export default async function FeaturePage({ params }: Props) {
  const { slug } = await params;
  const r = resolve(slug);
  if (!r) notFound();
  const { feature, content } = r;

  return (
    <>
      <JsonLd id={`product-feat-${slug}`} data={jsonLdProduct({ name: `Nafaa ${feature.nameEn}`, description: content.directAnswerEn, slug: `/product/${slug}` })} />
      <JsonLd id={`breadcrumb-feat-${slug}`} data={jsonLdBreadcrumb([
        { name: 'Home', url: '/' },
        { name: 'Product', url: '/product/pos' },
        { name: feature.nameEn, url: `/product/${slug}` },
      ])} />
      <Header />
      <main className="flex-1">
        <FeatureHero feature={feature} content={content} />
        <FeatureCapabilities feature={feature} content={content} />
        <FeatureShowcase feature={feature} content={content} />
        {content.compareTable && <FeatureCompare content={content} />}
        <FeatureMetrics content={content} />
        <FeatureFAQ feature={feature} content={content} />
        <FeatureRelated content={content} />
        <CTA />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
