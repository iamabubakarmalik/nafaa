/**
 * FAQ hub (/faq): the PAGE entry's own blocks (hero, intro), then every
 * published FAQ grouped by topic (GET /public/site/faqs, tag `faq:<locale>`)
 * in one section: a sticky topic index at the start and one H2 group per
 * topic beside it. Topic labels are localized by key (lib/i18n/ui). General topics come first, then trade topics. A
 * closing cta block, when it is the entry's last block, follows the
 * questions.
 *
 * Schema: CollectionPage (hub) + one FAQPage that mirrors every question on
 * the page, in the same @graph.
 */
import { Container } from '@/components/ui/Container';
import { Prose } from '@/components/ui/Prose';
import { InlineMarkdown, Markdown } from '@/components/blocks/rich-text/Markdown';
import { scopedSlugger } from '@/components/blocks/rich-text/slug';
import blockStyles from '@/components/blocks/blocks.module.css';
import type { PublicEntry } from '@/lib/cms/contract/cms-contract';
import { uiStrings } from '@/lib/i18n/ui';
import { Blocks } from '../core/Blocks';
import { loadFaqs } from '../core/data';
import { PageFrame, faqPageNode } from '../core/frame';
import { MetaRow } from '../core/parts';

/** Topics people ask about before they start; anything else (trades) follows alphabetically. */
const FIRST = ['getting-started', 'pricing', 'product', 'solutions', 'khata', 'compliance', 'marketplace', 'services'];

function rank(key: string): number {
  const i = FIRST.indexOf(key);
  return i === -1 ? FIRST.length : i;
}

export async function FaqHub({ entry }: { entry: PublicEntry }) {
  const t = uiStrings(entry.locale).faqHub;
  const { topics: loaded } = await loadFaqs(entry.locale);
  const raw = loaded.map((topic) => (t.topicLabels[topic.key] ? { ...topic, label: t.topicLabels[topic.key] as string } : topic));
  const topics = [...raw].sort((a, b) => rank(a.key) - rank(b.key) || a.label.localeCompare(b.label));
  const all = topics.flatMap((t) => t.faqs);
  const node = faqPageNode(entry.url, all);
  const own = entry.blocks.filter((b) => b.type !== 'faq');
  const last = own[own.length - 1];
  const closing = own.length > 1 && last?.type === 'cta' ? last : null;
  const lead = closing ? own.slice(0, -1) : own;

  return (
    <PageFrame entry={entry} nodes={node ? [node] : []}>
      <MetaRow entry={entry} showUpdated={false} />
      <Blocks entry={entry} blocks={lead} />
      {topics.length ? (
        <section aria-label={t.region} className="pb-section">
          <Container>
            <div className="grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
              <nav aria-label={t.nav} className="lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:self-start">
                <p className="text-eyebrow uppercase text-fg-subtle">{t.topics}</p>
                <ul className="mt-3 flex flex-wrap gap-2 lg:flex-col lg:gap-0.5">
                  {topics.map((t) => (
                    <li key={t.key}>
                      <a
                        href={`#topic-${t.key}`}
                        className="flex items-center justify-between gap-3 rounded-full border border-line px-3.5 py-1.5 text-small font-medium text-fg-muted transition-colors duration-fast hover:bg-surface-2 hover:text-fg-strong lg:rounded-lg lg:border-transparent lg:px-3"
                      >
                        {t.label}
                        <span className="text-xs tabular-nums text-fg-subtle">{t.faqs.length}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="space-y-14">
                {topics.map((topic) => (
                  <div key={topic.key} id={`topic-${topic.key}`} className="scroll-mt-[calc(var(--header-h)+1.5rem)]">
                    <h2 className="text-h3 text-fg-strong">{topic.label}</h2>
                    <div className={`${blockStyles.faqList} mt-4`}>
                      {topic.faqs.map((faq) => (
                        <details key={faq.id} className={blockStyles.faqItem} id={`faq-${faq.id}`}>
                          <summary>
                            <span>
                              <InlineMarkdown text={faq.question} opts={{ plainLinks: true }} />
                            </span>
                            <span aria-hidden className={blockStyles.faqIcon} />
                          </summary>
                          <div className={blockStyles.faqAnswer}>
                            <Prose className="text-[0.9875rem] text-fg-muted">
                              <Markdown text={faq.answer} opts={{ media: entry.media, locale: entry.locale, slugger: scopedSlugger(`faq-${faq.id}`), idPrefix: `faq-${faq.id}` }} />
                            </Prose>
                          </div>
                        </details>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Container>
        </section>
      ) : null}
      {closing ? <Blocks entry={entry} blocks={[closing]} /> : null}
    </PageFrame>
  );
}
