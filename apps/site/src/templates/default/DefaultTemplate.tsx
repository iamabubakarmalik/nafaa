/**
 * Default PAGE template (about, marketplace and other free pages):
 * hero → blocks in order. Title: the page's `{title}`.
 * Schema: WebPage, or AboutPage on /about (graph.ts).
 *
 * On /about the template adds "Nafaa at a glance": the entity facts from
 * settings `entity` (brand, what it is not, compliance statement, platforms,
 * languages, contact), so the page answers "what is Nafaa" with the same
 * facts the Organization schema and llms.txt carry. Nothing is typed here.
 */
import type { PublicEntity, PublicEntry } from '@/lib/cms/contract/cms-contract';
import { loadEntity } from '../core/data';
import { PageFrame } from '../core/frame';
import { RelatedPages } from '../core/parts';
import { ShowcaseBody } from '../showcase/ShowcaseBody';

function EntityFacts({ entity }: { entity: PublicEntity }) {
  const facts = [
    { label: 'Name', value: entity.legalName ? `${entity.brandName} (${entity.legalName})` : entity.brandName },
    { label: 'What it is', value: entity.disambiguatingDescription },
    ...Object.values(entity.compliance).map((c) => ({ label: 'Tax compliance', value: c.text })),
    entity.platforms.length ? { label: 'Runs on', value: entity.platforms.join(', ') } : null,
    entity.languages.length ? { label: 'Languages', value: entity.languages.join(', ') } : null,
    entity.foundingDate ? { label: 'Founded', value: entity.foundingDate } : null,
    entity.contact.email ? { label: 'Email', value: entity.contact.email } : null,
  ].filter((f): f is { label: string; value: string } => f !== null);
  if (!facts.length) return null;
  return (
    <section aria-labelledby="at-a-glance" className="py-12 md:py-16">
      <div className="mx-auto box-content max-w-container px-gutter">
        <h2 id="at-a-glance" className="text-h2 text-fg-strong">
          {entity.brandName} at a glance
        </h2>
        <dl className="mt-8 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {facts.map((fact, i) => (
            <div key={`${fact.label}-${i}`} className="bg-surface p-5 md:p-6">
              <dt className="text-eyebrow uppercase text-fg-subtle">{fact.label}</dt>
              <dd className="mt-1.5 text-body font-medium text-fg-strong">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export async function DefaultTemplate({ entry }: { entry: PublicEntry }) {
  const entity = entry.path === '/about' ? await loadEntity(entry.locale) : null;
  return (
    <PageFrame entry={entry}>
      <ShowcaseBody entry={entry} showUpdated={false} afterHero={entity ? <EntityFacts entity={entity} /> : undefined} beforeEnd={<RelatedPages entry={entry} />} kickers={{ featuresGrid: 'Features', steps: 'How it works' }} />
    </PageFrame>
  );
}
