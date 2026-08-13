/**
 * SEO Schema Injector — ready-to-use JSX components
 * Wrap any page with these to get instant rich-snippet eligibility
 */

import {
  jsonLdFAQ,
  jsonLdBreadcrumb,
  jsonLdSpeakable,
  jsonLdService,
  jsonLdProduct,
  jsonLdArticle,
  jsonLdHowTo,
  jsonLdLocalBusiness,
  jsonLdCourse,
  jsonLdVideo,
  jsonLdReview,
} from './jsonld';
import { JsonLd } from './JsonLdScript';

interface IndustrySchemaProps {
  slug: string;
  nameEn: string;
  nameUr?: string;
  tagEn: string;
  faqs?: Array<{ q: string; a: string }>;
  city?: string;
}

export function IndustrySchemas({ slug, nameEn, tagEn, faqs = [], city }: IndustrySchemaProps) {
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Industries', url: '/industries' },
    { name: nameEn, url: `/industries/${slug}` },
  ];

  const defaultFaqs = faqs.length ? faqs : [
    {
      q: `What is the best ${nameEn} software in Pakistan?`,
      a: `Nafaa is Pakistan's #1 ${nameEn} software with FBR compliance, Urdu support, JazzCash/Easypaisa integration, and offline mode. Trusted by 2,847+ Pakistani businesses.`,
    },
    {
      q: `How much does ${nameEn} POS software cost in Pakistan?`,
      a: `Nafaa ${nameEn} starts free forever. Pro plan is Rs 5,500/month with all features including FBR integration, AI insights, and unlimited transactions.`,
    },
    {
      q: `Does Nafaa work offline for ${nameEn}?`,
      a: `Yes. Nafaa's offline-first architecture means your ${nameEn} runs smoothly even without internet. Data syncs automatically when connection returns.`,
    },
    {
      q: `Is Nafaa FBR compliant for ${nameEn}?`,
      a: `Yes. Nafaa is a certified FBR POS integration partner with real-time invoice submission to IRIS — mandatory for tier-1 retailers in Pakistan.`,
    },
  ];

  return (
    <>
      <JsonLd id={`breadcrumb-${slug}`} data={jsonLdBreadcrumb(breadcrumbs)} />
      <JsonLd id={`faq-${slug}`} data={jsonLdFAQ(defaultFaqs)} />
      <JsonLd id={`speakable-${slug}`} data={jsonLdSpeakable(['h1', 'h2', '.speakable'])} />
      <JsonLd
        id={`service-${slug}`}
        data={jsonLdService({
          name: `Nafaa ${nameEn} Software`,
          description: tagEn,
          slug: `/industries/${slug}`,
          provider: `${nameEn} Business Software`,
        })}
      />
      {city && (
        <JsonLd
          id={`local-${slug}-${city}`}
          data={jsonLdLocalBusiness({ city, region: 'Punjab' })}
        />
      )}
    </>
  );
}

interface IntegrationSchemaProps {
  slug: string;
  name: string;
  description: string;
  category?: string;
}

export function IntegrationSchemas({ slug, name, description, category }: IntegrationSchemaProps) {
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Integrations', url: '/integrations' },
    { name, url: `/integrations/${slug}` },
  ];

  const faqs = [
    { q: `How to integrate ${name} with Nafaa?`, a: `Nafaa integrates with ${name} in under 5 minutes. Go to Integrations, click ${name}, authorize, and you're live. All orders sync in real-time.` },
    { q: `Is ${name} integration free with Nafaa?`, a: `Yes, ${name} integration is included in the Pro plan (Rs 5,500/month) with no extra transaction fees.` },
    { q: `Does Nafaa's ${name} integration work in Pakistan?`, a: `Yes. Nafaa is Pakistan's #1 platform with certified ${name} integration for Pakistani businesses.` },
  ];

  return (
    <>
      <JsonLd id={`breadcrumb-int-${slug}`} data={jsonLdBreadcrumb(breadcrumbs)} />
      <JsonLd id={`faq-int-${slug}`} data={jsonLdFAQ(faqs)} />
      <JsonLd id={`service-int-${slug}`} data={jsonLdService({
        name: `${name} Integration for Nafaa`,
        description,
        slug: `/integrations/${slug}`,
        provider: category || 'Integration',
      })} />
      <JsonLd id={`speakable-int-${slug}`} data={jsonLdSpeakable()} />
    </>
  );
}

interface FeatureSchemaProps {
  slug: string;
  nameEn: string;
  taglineEn: string;
}

export function FeatureSchemas({ slug, nameEn, taglineEn }: FeatureSchemaProps) {
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Products', url: '/product/pos' },
    { name: nameEn, url: `/product/${slug}` },
  ];

  return (
    <>
      <JsonLd id={`breadcrumb-p-${slug}`} data={jsonLdBreadcrumb(breadcrumbs)} />
      <JsonLd id={`product-${slug}`} data={jsonLdProduct({
        name: `Nafaa ${nameEn}`,
        description: taglineEn,
        slug: `/product/${slug}`,
      })} />
      <JsonLd id={`speakable-p-${slug}`} data={jsonLdSpeakable()} />
    </>
  );
}

interface BlogSchemaProps {
  title: string;
  description: string;
  author: string;
  datePublished: string;
  dateModified?: string;
  slug: string;
  image?: string;
  faqs?: Array<{ q: string; a: string }>;
}

export function BlogSchemas({ title, description, author, datePublished, dateModified, slug, image, faqs }: BlogSchemaProps) {
  const url = `/blog/${slug}`;
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' },
    { name: title, url },
  ];

  return (
    <>
      <JsonLd id={`breadcrumb-b-${slug}`} data={jsonLdBreadcrumb(breadcrumbs)} />
      <JsonLd id={`article-${slug}`} data={jsonLdArticle({ title, description, author, datePublished, dateModified, image, url })} />
      <JsonLd id={`speakable-b-${slug}`} data={jsonLdSpeakable(['h1', 'article p:first-of-type', '.excerpt'])} />
      {faqs && faqs.length > 0 && <JsonLd id={`faq-b-${slug}`} data={jsonLdFAQ(faqs)} />}
    </>
  );
}

interface CitySchemaProps {
  citySlug: string;
  cityName: string;
  industrySlug: string;
  industryName: string;
}

export function CityIndustrySchemas({ citySlug, cityName, industrySlug, industryName }: CitySchemaProps) {
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: cityName, url: `/${citySlug}` },
    { name: industryName, url: `/${citySlug}/${industrySlug}` },
  ];

  const faqs = [
    { q: `Best ${industryName} software in ${cityName}?`, a: `Nafaa is the #1 ${industryName} software in ${cityName} with local support, Urdu interface, and FBR compliance.` },
    { q: `How much does ${industryName} POS cost in ${cityName}?`, a: `Nafaa starts free for ${cityName} ${industryName} businesses. Pro is Rs 5,500/month.` },
    { q: `Is there ${industryName} software support in ${cityName}?`, a: `Yes, Nafaa provides local support in ${cityName} via WhatsApp +92 324 1772933, phone, and in-person setup.` },
  ];

  return (
    <>
      <JsonLd id={`bc-${citySlug}-${industrySlug}`} data={jsonLdBreadcrumb(breadcrumbs)} />
      <JsonLd id={`faq-${citySlug}-${industrySlug}`} data={jsonLdFAQ(faqs)} />
      <JsonLd id={`local-${citySlug}-${industrySlug}`} data={jsonLdLocalBusiness({ city: cityName, region: 'Punjab' })} />
      <JsonLd id={`service-${citySlug}-${industrySlug}`} data={jsonLdService({
        name: `${industryName} Software in ${cityName}`,
        description: `Nafaa's ${industryName} POS software for businesses in ${cityName}, Pakistan.`,
        slug: `/${citySlug}/${industrySlug}`,
      })} />
      <JsonLd id={`speak-${citySlug}-${industrySlug}`} data={jsonLdSpeakable()} />
    </>
  );
}
