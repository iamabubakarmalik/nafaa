/**
 * Product tour: a run of screenshot blocks becomes one tabbed section. Each
 * panel is server-rendered (real captures in their frame, light and dark);
 * TourTabs only switches the visible panel and auto-advances.
 */
import { Markdown } from '@/components/blocks/rich-text/Markdown';
import { FrameFor } from '@/components/frames';
import type { PublicEntry, ScreenshotBlock } from '@/lib/cms/contract/cms-contract';
import { CmsIcon } from '@/lib/icons';
import { mediaById } from '@/lib/media';
import { ThemedShot } from './sections';
import { TourTabs } from './TourTabs';
import fx from './fx.module.css';

/** Tab icons by the words editors use in screenshot headings. */
const ICONS: [RegExp, string][] = [
  [/dashboard|overview/i, 'layout-dashboard'],
  [/inventory|stock|product/i, 'boxes'],
  [/khata|udhaar|credit/i, 'notebook-pen'],
  [/online|order|store/i, 'shopping-bag'],
  [/restaurant|table|kitchen/i, 'utensils-crossed'],
  [/branch/i, 'building-2'],
  [/profit|report/i, 'chart-line'],
  [/tax|fbr|pra/i, 'shield-check'],
  [/pos|counter|bill/i, 'scan-barcode'],
  [/staff|payroll/i, 'users'],
];

function iconFor(heading: string): string {
  return ICONS.find(([re]) => re.test(heading))?.[1] ?? 'layout-grid';
}

export function Tour({ blocks, entry }: { blocks: ScreenshotBlock[]; entry: PublicEntry }) {
  const shots = blocks
    .map((block) => ({ block, light: mediaById(entry.media, block.mediaId), dark: mediaById(entry.media, block.darkMediaId) }))
    .filter((s) => s.light);
  if (!shots.length) return null;

  const tabs = shots.map(({ block }, i) => ({ id: block.id, label: block.heading?.trim() || `Screen ${i + 1}`, icon: <CmsIcon name={iconFor(block.heading ?? '')} size={16} /> }));
  const panels = shots.map(({ block, light, dark }) => (
    <div key={block.id} className="grid gap-8 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:gap-12">
      <div className="lg:pt-8">
        <h3 className="text-h3 text-fg-strong">{block.heading}</h3>
        {block.body ? (
          <div className="mt-3 text-body-lg text-fg-muted [&_p]:m-0">
            <Markdown text={block.body} />
          </div>
        ) : null}
        {block.caption ? <p className="mt-4 text-small text-fg-subtle">{block.caption}</p> : null}
      </div>
      <div className={fx.tourFrame}>
        <FrameFor frame={block.frame} url={block.url}>
          <ThemedShot light={light!} dark={dark} sizes="(min-width: 1280px) 900px, 100vw" />
        </FrameFor>
      </div>
    </div>
  ));

  return (
    <section aria-labelledby="home-tour" className="relative isolate overflow-hidden pb-section">
      <div className="mx-auto box-content max-w-wide px-gutter">
        <div className="mx-auto max-w-2xl text-center" data-reveal>
          <p className="text-eyebrow uppercase text-link">Product tour</p>
          <h2 id="home-tour" className="mt-3 text-h2 text-fg-strong">
            See the real app, not a mock-up
          </h2>
        </div>
        <TourTabs tabs={tabs} label="Product tour">
          {panels}
        </TourTabs>
      </div>
    </section>
  );
}
