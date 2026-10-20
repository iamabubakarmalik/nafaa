/**
 * The /_dev/blocks gallery body. DEV ONLY: rendered by app/_dev/blocks,
 * which is noindex and 404s in production builds.
 *
 * Every block type in the contract, in one or more variants, rendered by
 * the real BlockRenderer. Data blocks read the live API first and fall back
 * to fixtures (each sample is labelled with its data origin). The fixture
 * entry and blocks are validated with the contract's zod schemas on every
 * render, so a fixture that drifts from the contract shows up here.
 */
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Container } from '@/components/ui/Container';
import { cx } from '@/components/ui/cx';
import { ThemeChoice } from '@/components/layout/ThemeToggle';
import { BLOCK_TYPES, publicEntrySchema, type BlockType, type PublicEntry } from '@/lib/cms/contract/cms-contract';
import { BlockRenderer } from '../BlockRenderer';
import { FIXTURE_BLOCKS, FIXTURE_CITY, FIXTURE_ENTRY } from './fixtures';
import { probeGallery, type GalleryProbe, type Origin } from './gallery-source';
import styles from './gallery.module.css';

const DATA_KIND: Partial<Record<BlockType, keyof GalleryProbe['origin']>> = {
  pricingTable: 'plans',
  stats: 'stats',
  testimonial: 'testimonials',
  logoCloud: 'customers',
  entryGrid: 'entries',
  leadForm: 'site',
};

function OriginBadge({ origin }: { origin: Origin }) {
  return origin === 'live' ? (
    <Badge tone="brand" dot>
      live API
    </Badge>
  ) : (
    <Badge tone="warning" dot>
      fixture
    </Badge>
  );
}

function validate(entry: PublicEntry): string[] {
  const result = publicEntrySchema.safeParse(entry);
  if (result.success) return [];
  return result.error.issues.slice(0, 12).map((issue) => `${issue.path.join('.')}: ${issue.message}`);
}

export async function BlocksGallery({ locale, livePath, liveEntry }: { locale: string; livePath?: string; liveEntry?: PublicEntry | null }) {
  const probe = await probeGallery(locale);
  const issues = [...validate(FIXTURE_ENTRY), ...validate(FIXTURE_CITY)];
  const covered = new Set(FIXTURE_BLOCKS.map((item) => item.block.type));
  const missing = BLOCK_TYPES.filter((type) => !covered.has(type));
  const entry = { ...FIXTURE_ENTRY, locale };
  const city = { ...FIXTURE_CITY, locale };

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <Container size="wide" className="flex flex-wrap items-center gap-x-6 gap-y-3 py-3">
          <p className="text-small font-semibold text-fg-strong">Blocks gallery</p>
          <ThemeChoice />
          <label className="inline-flex cursor-pointer items-center gap-2 text-small text-fg-muted">
            <input type="checkbox" className={styles.rm} /> Reduced motion
          </label>
          <nav aria-label="Locale" className="inline-flex gap-1 text-small">
            {['en', 'ur'].map((value) => (
              <Link
                key={value}
                href={`/_dev/blocks${value === 'en' ? '' : `?locale=${value}`}`}
                className={cx('rounded px-2 py-1', value === locale ? 'bg-surface-3 font-medium text-fg-strong' : 'text-fg-subtle hover:text-fg-strong')}
              >
                {value}
              </Link>
            ))}
          </nav>
          <span className="ml-auto flex flex-wrap gap-1.5">
            {Object.entries(probe.origin).map(([kind, origin]) => (
              <span key={kind} className="inline-flex items-center gap-1 text-xs text-fg-subtle">
                {kind}: <OriginBadge origin={origin} />
              </span>
            ))}
          </span>
        </Container>
      </div>

      <Container size="wide" className="py-10">
        <h1 className="text-h2 text-fg-strong">Every block, rendered by the real renderer</h1>
        <p className="mt-3 max-w-measure text-body text-fg-muted">
          Internal review page (noindex, 404 in production). Data blocks read the local API first and use fixtures only when it has
          nothing. Fixture text is sample copy for layout review, not checked facts. Add <code className="font-mono text-small">?path=/some/path</code> to
          render a published entry instead.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Badge tone={issues.length ? 'warning' : 'brand'} dot>
            {issues.length ? `${issues.length} contract issues in fixtures` : 'Fixtures match the contract (zod)'}
          </Badge>
          <Badge tone={missing.length ? 'warning' : 'brand'} dot>
            {missing.length ? `Missing: ${missing.join(', ')}` : `All ${BLOCK_TYPES.length} block types covered`}
          </Badge>
        </div>
        {issues.length ? (
          <ul className="mt-4 list-disc pl-5 text-small text-amber-700">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        ) : null}
        <nav aria-label="Samples" className="mt-8 columns-2 gap-6 text-small sm:columns-3 lg:columns-4">
          {FIXTURE_BLOCKS.map((item) => (
            <a key={item.block.id} href={`#s-${item.block.id}`} className="block py-0.5 text-fg-muted hover:text-link">
              {item.label}
            </a>
          ))}
        </nav>
      </Container>

      {livePath ? (
        <section className={styles.sample}>
          <Container size="wide" className="flex flex-wrap items-center gap-3 py-4">
            <span className={cx(styles.label, 'text-fg-subtle')}>published entry · {livePath}</span>
            {liveEntry ? <OriginBadge origin="live" /> : <Badge tone="warning">no published entry at this path</Badge>}
          </Container>
          {liveEntry ? <BlockRenderer blocks={liveEntry.blocks} entry={liveEntry} /> : null}
        </section>
      ) : null}

      {FIXTURE_BLOCKS.map((item) => {
        const kind = DATA_KIND[item.block.type];
        return (
          <section key={item.block.id} id={`s-${item.block.id}`} className={styles.sample} aria-label={item.label}>
            <Container size="wide" className="flex flex-wrap items-center gap-3 py-4">
              <span className={cx(styles.label, 'text-fg-subtle')}>{item.label}</span>
              {kind ? <OriginBadge origin={probe.origin[kind]} /> : null}
              {item.note ? <span className="text-xs text-fg-subtle">{item.note}</span> : null}
            </Container>
            <BlockRenderer
              blocks={[item.block]}
              entry={item.block.type === 'cityFacts' ? city : entry}
              source={probe.source}
              locale={locale}
              renderTool={(toolKey) => (
                <div className="rounded-xl border border-dashed border-line-strong p-10 text-center text-small text-fg-subtle">
                  Tool island stand-in: <code className="font-mono">{toolKey}</code> (the Tool template supplies the real one)
                </div>
              )}
            />
          </section>
        );
      })}
    </div>
  );
}
