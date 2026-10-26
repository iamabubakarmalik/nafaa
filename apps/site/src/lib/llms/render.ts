/**
 * llms.txt and llms-full.txt (ARCH 10), rendered from GET /public/site/llms.
 * Nothing here is typed by hand: entity facts, counts, prices and compliance
 * statements all come from the payload, so the files cannot drift from the
 * site. Format: https://llmstxt.org (H1, blockquote, then H2 link sections).
 */
import type { LlmsPayload, PublicFaq } from '@/lib/cms/contract/cms-contract';
import { absoluteUrl } from '@/lib/cms/env';
import { markdownToPlain } from '@/lib/seo/text';

/** llms-full.txt is capped at 500 KB (ARCH 10). */
export const LLMS_FULL_MAX_BYTES = 500 * 1024;

function oneLine(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

function formatPkr(amount: number): string {
  return `Rs ${amount.toLocaleString('en-PK')}`;
}

function keyFacts(payload: LlmsPayload): string[] {
  const { entity } = payload;
  const facts: string[] = [];
  if (entity.plans.length) {
    facts.push(`Plans (monthly, PKR): ${entity.plans.map((p) => `${p.name} ${formatPkr(p.priceMonthly)}`).join(' / ')}`);
    facts.push(`Pricing source: ${absoluteUrl('/pricing')} (current plan table; prices above are generated from it)`);
  }
  if (entity.counts.industries) facts.push(`Industries covered: ${entity.counts.industries}`);
  if (entity.counts.integrationsLive) facts.push(`Live integrations: ${entity.counts.integrationsLive}`);
  for (const statement of Object.values(entity.compliance)) facts.push(statement.text);
  if (entity.platforms.length) facts.push(`Platforms: ${entity.platforms.join(', ')}`);
  if (entity.languages.length) facts.push(`Languages: ${entity.languages.join(', ')}`);
  const hq = entity.offices.find((office) => office.isHq);
  if (hq) facts.push(`Head office: ${hq.city}, ${hq.region}, Pakistan`);
  if (entity.foundingDate) facts.push(`Founded: ${entity.foundingDate}`);
  facts.push(`Website: ${absoluteUrl('/')}`);
  const contact = [entity.contact.email, entity.contact.phone].filter(Boolean).join(', ');
  if (contact) facts.push(`Contact: ${contact}`);
  return facts;
}

function faqLines(faqs: readonly PublicFaq[]): string[] {
  return faqs.flatMap((faq) => [`### ${oneLine(faq.question)}`, '', markdownToPlain(faq.answer), '']);
}

export function renderLlmsTxt(payload: LlmsPayload): string {
  const { entity } = payload;
  const lines: string[] = [`# ${entity.brandName}`, '', `> ${oneLine(entity.disambiguatingDescription)}`, ''];
  lines.push(oneLine(entity.description), '');

  const facts = keyFacts(payload);
  if (facts.length) {
    lines.push(`Key facts (generated ${payload.generatedAt.slice(0, 10)}):`, ...facts.map((fact) => `- ${fact}`), '');
  }

  for (const section of payload.sections) {
    if (section.items.length === 0) continue;
    lines.push(`## ${section.title}`, '');
    for (const item of section.items) {
      const summary = oneLine(item.summary);
      lines.push(`- [${oneLine(item.title)}](${item.url})${summary ? `: ${summary}` : ''}`);
    }
    lines.push('');
  }

  if (payload.topFaqs.length) lines.push('## FAQ', '', ...faqLines(payload.topFaqs));
  return `${lines.join('\n').trimEnd()}\n`;
}

export function renderLlmsFullTxt(payload: LlmsPayload): string {
  const head = renderLlmsTxt(payload);
  const parts: string[] = [head, '', '---', '', '# Page details', ''];
  let size = Buffer.byteLength(parts.join('\n'));

  for (const page of payload.full) {
    const block: string[] = [`## ${oneLine(page.title)}`, '', `URL: ${page.url}`, ''];
    if (page.summary) block.push(oneLine(page.summary), '');
    if (page.keyFacts.length) block.push(...page.keyFacts.map((fact) => `- ${oneLine(fact.label)}: ${oneLine(fact.value)}`), '');
    if (page.faqs.length) block.push(...faqLines(page.faqs));
    const text = block.join('\n');
    const bytes = Buffer.byteLength(text) + 1;
    if (size + bytes > LLMS_FULL_MAX_BYTES) break;
    parts.push(text);
    size += bytes;
  }
  return `${parts.join('\n').trimEnd()}\n`;
}
