import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/Header/Header';
import { Footer } from '@/components/layout/Footer/Footer';
import { FloatingWhatsApp } from '@/components/layout/Footer/FloatingWhatsApp';
import { CTA } from '@/components/home/CTA';
import { IntegrationHero } from '@/components/integration/IntegrationHero';
import { IntegrationBenefits } from '@/components/integration/IntegrationBenefits';
import { IntegrationSetup } from '@/components/integration/IntegrationSetup';
import { IntegrationCode } from '@/components/integration/IntegrationCode';
import { IntegrationFeatures } from '@/components/integration/IntegrationFeatures';
import { IntegrationUseCases } from '@/components/integration/IntegrationUseCases';
import { IntegrationFAQ } from '@/components/integration/IntegrationFAQ';
import { IntegrationRelated } from '@/components/integration/IntegrationRelated';
import { JsonLd } from '@/lib/seo/JsonLdScript';
import { jsonLdProduct, jsonLdBreadcrumb, jsonLdHowTo } from '@/lib/seo/jsonld';
import { buildMetadata } from '@/lib/seo/metadata';
import { integrations, getIntegration } from '@/lib/data/integrations';
import { getIntegrationContent } from '@/lib/data/integration-content';
import { buildIntegrationContent } from '@/lib/data/content-defaults';

interface Props { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return integrations.map((i) => ({ slug: i.slug }));
}

function resolve(slug: string) {
  const integration = getIntegration(slug);
  if (!integration) return null;
  const content = getIntegrationContent(slug) ?? buildIntegrationContent(integration);
  return { integration, content };
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const r = resolve(slug);
  if (!r) return buildMetadata({ title: 'Integration not found' });
  return buildMetadata({
    title: `${r.integration.name} integration — Nafaa`,
    description: r.content.heroSubtitleEn,
    path: `/integrations/${slug}`,
  });
}

export default async function IntegrationPage({ params }: Props) {
  const { slug } = await params;
  const r = resolve(slug);
  if (!r) notFound();
  const { integration, content } = r;

  return (
    <>
      <JsonLd id={`product-int-${slug}`} data={jsonLdProduct({ name: `${integration.name} integration for Nafaa`, description: content.directAnswerEn, slug: `/integrations/${slug}` })} />
      <JsonLd id={`breadcrumb-int-${slug}`} data={jsonLdBreadcrumb([
        { name: 'Home', url: '/' },
        { name: 'Integrations', url: '/integrations' },
        { name: integration.name, url: `/integrations/${slug}` },
      ])} />
      <JsonLd id={`howto-int-${slug}`} data={jsonLdHowTo({
        name: `How to connect ${integration.name} to Nafaa`,
        description: content.directAnswerEn,
        steps: content.setupSteps.map((s) => ({ name: s.titleEn, text: s.descEn })),
      })} />
      <Header />
      <main className="flex-1">
        <IntegrationHero integration={integration} content={content} />
        <IntegrationBenefits integration={integration} content={content} />
        <IntegrationSetup integration={integration} content={content} />
        <IntegrationCode content={content} />
        <IntegrationFeatures integration={integration} content={content} />
        <IntegrationUseCases content={content} />
        <IntegrationFAQ integration={integration} content={content} />
        <IntegrationRelated current={integration} content={content} />
        <CTA />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
