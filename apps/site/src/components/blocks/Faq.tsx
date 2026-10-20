/**
 * faq (API-CONTRACT 4.6): the entry's FAQs as native <details>, every
 * question and answer in the server HTML. FAQPage schema (lib/seo/graph.ts)
 * is built from the same `entry.faqs`, so schema and page always match.
 * With no FAQs the block renders nothing.
 */
import { Container } from '@/components/ui/Container';
import { Prose } from '@/components/ui/Prose';
import { InlineMarkdown, Markdown } from './rich-text/Markdown';
import { scopedSlugger } from './rich-text/slug';
import { strings } from './lib/i18n';
import { reveal } from './lib/reveal';
import type { BlockProps } from './types';
import styles from './blocks.module.css';

export function Faq({ block, ctx }: BlockProps<'faq'>) {
  const faqs = ctx.entry.faqs;
  if (!faqs.length) return null;
  const t = strings(ctx.locale);
  const heading = block.heading?.trim() || t.faqHeading;

  return (
    <Container>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-16">
        <div className="lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:self-start" {...reveal(ctx.index)}>
          <h2 id={ctx.headingId} className="text-h2 text-fg-strong">
            {heading}
          </h2>
        </div>
        <div className={styles.faqList}>
          {faqs.map((faq, i) => (
            <details key={faq.id} className={styles.faqItem} open={i === 0} id={`faq-${faq.id}`}>
              <summary>
                <span>
                  <InlineMarkdown text={faq.question} opts={{ plainLinks: true }} />
                </span>
                <span aria-hidden className={styles.faqIcon} />
              </summary>
              <div className={styles.faqAnswer}>
                <Prose className="text-[0.9875rem] text-fg-muted">
                  <Markdown
                    text={faq.answer}
                    opts={{ media: ctx.entry.media, locale: ctx.locale, slugger: scopedSlugger(`faq-${faq.id}`), idPrefix: `faq-${faq.id}` }}
                  />
                </Prose>
              </div>
            </details>
          ))}
        </div>
      </div>
    </Container>
  );
}
