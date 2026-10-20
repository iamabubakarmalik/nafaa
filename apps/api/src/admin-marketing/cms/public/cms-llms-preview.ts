/**
 * Plain renderings of public data for the admin's preview panel
 * (`GET /admin/marketing/cms/settings/preview/llms`): llms.txt in the
 * llmstxt.org layout and the Organization JSON-LD node. The site renders the
 * real files from the same `LlmsPayload`.
 */
import type { LlmsPayload, PublicEntity } from '../contract/cms-contract';

function line(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

export function renderLlmsTxt(payload: LlmsPayload): string {
  const e = payload.entity;
  const out: string[] = [`# ${e.brandName}`, '', `> ${line(e.description)}`, ''];
  if (e.disambiguatingDescription) out.push(line(e.disambiguatingDescription), '');
  const facts: string[] = [];
  for (const [, statement] of Object.entries(e.compliance ?? {})) facts.push(`- ${line(statement.text)}`);
  if (e.plans.length > 0) facts.push(`- Plans: ${e.plans.map((p) => `${p.name} (Rs ${p.priceMonthly.toLocaleString('en-US')}/month)`).join(', ')}`);
  if (facts.length > 0) out.push('## Key facts', '', ...facts, '');
  for (const section of payload.sections) {
    out.push(`## ${section.title}`, '');
    for (const item of section.items) out.push(`- [${line(item.title)}](${item.url})${item.summary ? `: ${line(item.summary)}` : ''}`);
    out.push('');
  }
  if (payload.topFaqs.length > 0) {
    out.push('## FAQ', '');
    for (const f of payload.topFaqs) out.push(`- ${line(f.question)} ${line(f.answer)}`);
    out.push('');
  }
  return `${out.join('\n').trim()}\n`;
}

export function organizationJsonLd(entity: PublicEntity, siteUrl: string, logoUrl: string | null): Record<string, unknown> {
  const hq = entity.offices.find((o) => o.isHq) ?? entity.offices[0];
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteUrl}/#organization`,
    name: entity.brandName,
    ...(entity.legalName ? { legalName: entity.legalName } : {}),
    url: siteUrl,
    description: entity.description,
    disambiguatingDescription: entity.disambiguatingDescription,
    ...(logoUrl ? { logo: logoUrl } : {}),
    ...(entity.foundingDate ? { foundingDate: entity.foundingDate } : {}),
    ...(entity.contact.email ? { email: entity.contact.email } : {}),
    ...(entity.contact.phone ? { telephone: entity.contact.phone } : {}),
    ...(hq
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: hq.street,
            addressLocality: hq.city,
            addressRegion: hq.region,
            ...(hq.postalCode ? { postalCode: hq.postalCode } : {}),
            addressCountry: hq.country,
          },
        }
      : {}),
    ...(entity.sameAs.length > 0 ? { sameAs: entity.sameAs } : {}),
    ...(entity.languages.length > 0 ? { knowsLanguage: entity.languages } : {}),
  };
}
