/**
 * Product tour: a run of screenshot blocks becomes one tabbed section. Each
 * panel is server-rendered (real captures in their frame, light and dark);
 * TourTabs only switches the visible panel and auto-advances.
 *
 * Screenshot callouts (label and a point in percent, edited in the CMS)
 * become a list beside the capture. Nothing is drawn on the capture at
 * rest: hovering, focusing or tapping a list item, or the slow auto-cycle
 * while the tour is in view, draws a soft frame around that part of the
 * screen and dims the rest (fx.module.css, CSS only). Three layouts take
 * turns across the tabs.
 *
 * Regions: the CMS point marks a spot, but a frame needs a box. Boxes for
 * the current captures live in REGIONS, keyed by the capture's app path and
 * matched to callouts by order; they were measured on the captures (both
 * themes share one layout). A callout without a box gets a modest frame
 * centred on its point. Update REGIONS when a capture is replaced.
 */
import { Markdown } from '@/components/blocks/rich-text/Markdown';
import { FrameFor } from '@/components/frames';
import type { PublicEntry, ScreenshotBlock } from '@/lib/cms/contract/cms-contract';
import { cx } from '@/components/ui/cx';
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

type Box = [x: number, y: number, w: number, h: number];

/** Highlight boxes in percent of the capture, per app path, in callout order. */
const REGIONS: Record<string, Box[]> = {
  'app.nafaa.pk/dashboard': [
    [18.2, 17.8, 80.2, 25.4],
    [18.1, 45.2, 12.9, 16.2],
    [85.6, 45.2, 12.9, 16.2],
    [18.1, 63.4, 80.3, 18.4],
  ],
  'app.nafaa.pk/products': [
    [18.1, 9.2, 80.3, 14.4],
    [18.1, 31.2, 80.3, 4.6],
    [18.1, 52.8, 80.3, 39],
  ],
  'app.nafaa.pk/khata': [
    [18.1, 9.2, 80.3, 14.4],
    [18.1, 25.2, 80.3, 10.4],
    [84.4, 53.4, 13.2, 31.4],
  ],
  'app.nafaa.pk/online-orders': [
    [17.9, 25.1, 15.8, 10.6],
    [50.4, 25.1, 15.7, 10.6],
    [88.3, 52.2, 9.9, 29],
  ],
  'app.nafaa.pk/restaurant/tables': [
    [18.1, 9.2, 80.3, 14.4],
    [17.9, 43, 67, 37.6],
    [66.6, 25.1, 31.8, 10.6],
    [72.2, 9.6, 22.6, 5.4],
  ],
  'app.nafaa.pk/branches': [
    [18.1, 9.2, 80.3, 14.4],
    [34.1, 25.1, 32, 10.6],
    [18.1, 52.4, 80.3, 43],
  ],
  'app.nafaa.pk/reports/profit': [
    [18.1, 9.2, 80.3, 14.4],
    [17.9, 45.9, 52.4, 5.6],
    [81.2, 52.8, 17.4, 46.6],
  ],
};

function boxFor(url: string | undefined, k: number, point: { x: number; y: number }): Box {
  const known = url ? REGIONS[url]?.[k] : undefined;
  if (known) return known;
  const w = 22;
  const h = 14;
  return [Math.max(0, Math.min(100 - w, point.x - w / 2)), Math.max(0, Math.min(100 - h, point.y - h / 2)), w, h];
}

function iconFor(heading: string): string {
  return ICONS.find(([re]) => re.test(heading))?.[1] ?? 'layout-grid';
}

export function Tour({ blocks, entry }: { blocks: ScreenshotBlock[]; entry: PublicEntry }) {
  const shots = blocks
    .map((block) => ({ block, light: mediaById(entry.media, block.mediaId), dark: mediaById(entry.media, block.darkMediaId) }))
    .filter((s) => s.light);
  if (!shots.length) return null;

  const tabs = shots.map(({ block }, i) => ({ id: block.id, label: block.heading?.trim() || `Screen ${i + 1}`, icon: <CmsIcon name={iconFor(block.heading ?? '')} size={16} /> }));
  const panels = shots.map(({ block, light, dark }, i) => {
    const notes = block.callouts ?? [];
    // Three layouts take turns so each screen reads differently.
    const variant = (['left', 'right', 'stage'] as const)[i % 3];
    const text = (
      <div className={cx(fx.tourText, variant === 'stage' && fx.tourTextStage)}>
        <div>
          <p className="text-eyebrow uppercase text-link">
            {String(i + 1).padStart(2, '0')} / {String(shots.length).padStart(2, '0')}
          </p>
          <h3 className="mt-2 text-h3 text-fg-strong">{block.heading}</h3>
          {block.body ? (
            <div className="mt-3 text-body-lg text-fg-muted [&_p]:m-0">
              <Markdown text={block.body} />
            </div>
          ) : null}
        </div>
        {notes.length ? (
          <ol className={cx(fx.notes, variant === 'stage' && fx.notesRow)}>
            {notes.map((n, k) => (
              <li key={k} className={fx.note} data-k={k + 1} style={{ '--i': k }}>
                {/* A button so a tap or a keyboard focus can point at the area too. */}
                <button type="button" className={fx.noteBtn}>
                  <span aria-hidden className={fx.noteNo}>
                    {k + 1}
                  </span>
                  <span>{n.label}</span>
                </button>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    );
    const frame = (
      <div className={cx(fx.tourFrame, variant === 'stage' && fx.tourFrameStage)}>
        <FrameFor frame={block.frame} url={block.url}>
          <div className="relative overflow-hidden">
            <ThemedShot light={light!} dark={dark} sizes="(min-width: 1280px) 900px, 100vw" />
            {notes.map((n, k) => {
              const [x, y, w, h] = boxFor(block.url, k, n);
              return <span key={k} aria-hidden className={fx.spot} data-k={k + 1} style={{ '--x': `${x}%`, '--y': `${y}%`, '--w': `${w}%`, '--h': `${h}%`, '--i': k }} />;
            })}
          </div>
        </FrameFor>
      </div>
    );
    return (
      <div key={block.id} className={cx(fx.tourPanel, fx[`tour_${variant}`], notes.length === 4 ? fx.cycle4 : fx.cycle3)} data-animate="">
        {variant === 'right' ? (
          <>
            {frame}
            {text}
          </>
        ) : (
          <>
            {text}
            {frame}
          </>
        )}
      </div>
    );
  });

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
