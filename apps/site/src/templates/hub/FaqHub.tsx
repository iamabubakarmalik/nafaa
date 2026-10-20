/**
 * FAQ hub (/faq): the PAGE entry's own blocks (hero, intro), then every
 * published FAQ grouped by topic (GET /public/site/faqs, tag `faq:<locale>`),
 * each topic as an H2 section rendered by S2's faq block, plus a topic index.
 *
 * Schema: CollectionPage (hub) + one FAQPage that mirrors every question on
 * the page, in the same @graph.
 */
import type { Block, PublicEntry } from '@/lib/cms/contract/cms-contract';
import { Blocks } from '../core/Blocks';
import { loadFaqs } from '../core/data';
import { PageFrame, faqPageNode } from '../core/frame';
import { MetaRow } from '../core/parts';

export async function FaqHub({ entry }: { entry: PublicEntry }) {
  const { topics } = await loadFaqs(entry.locale);
  const all = topics.flatMap((t) => t.faqs);
  const node = faqPageNode(entry.url, all);
  const own = entry.blocks.filter((b) => b.type !== 'faq');

  return (
    <PageFrame entry={entry} nodes={node ? [node] : []}>
      <MetaRow entry={entry} showUpdated={false} />
      <Blocks entry={entry} blocks={own} />
      {topics.length > 1 ? (
        <nav aria-label="FAQ topics" className="mx-auto box-content max-w-container px-gutter">
          <ul className="flex flex-wrap gap-2">
            {topics.map((t) => (
              <li key={t.key}>
                <a href={`#topic-${t.key}`} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-small font-medium text-fg-muted transition-colors duration-fast hover:border-line-strong hover:text-fg-strong">
                  {t.label}
                  <span className="text-xs text-fg-subtle">{t.faqs.length}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      {topics.map((topic) => {
        const block: Block = { id: `faq-topic-${topic.key}`.slice(0, 32), type: 'faq', heading: topic.label, anchor: `topic-${topic.key}`.slice(0, 64) };
        return <Blocks key={topic.key} entry={{ ...entry, faqs: topic.faqs }} blocks={[block]} />;
      })}
    </PageFrame>
  );
}
