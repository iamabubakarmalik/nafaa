/**
 * <Diagram>: the one entry point for every code-drawn diagram.
 *
 * Server component. Renders a <figure> holding two inline SVGs (wide and
 * phone layouts, swapped by a CSS media query at 56rem) and an optional
 * caption. Each SVG has role="img" (or "group" when it holds links), a
 * <title> and a <desc> with the caption and a plain-text reading of the
 * diagram, and real <text> labels.
 *
 * Motion: the figure carries data-animate, so MotionObserver (F2) can set
 * data-inview to run the loops. Pass `spec.animate === false` for a fully
 * static diagram.
 *
 * Industry accent: set `--accent` (any CSS colour) on an ancestor to tint
 * the moving packets and pings; it is never used for text.
 *
 * The two SVGs have no state or handlers, so they are written as one HTML
 * string (lib/static-html): the same markup in the page, a single string in
 * the RSC payload instead of a few hundred JSON elements, and nothing for
 * React to hydrate. A diagram that cannot be written that way (an icon that
 * is a client component) renders as elements.
 */
import { useId, type ReactNode } from 'react';
import { staticHtml } from '@/lib/static-html';
import type { DiagramSpec } from '../../lib/cms/contract/cms-contract';
import styles from './diagrams.module.css';
import { SceneSvg } from './parts/SceneSvg';
import { cx } from './parts/classes';
import { buildDiagram } from './registry';

export interface DiagramProps {
  spec: DiagramSpec;
  /** Block caption (required on the diagram block). Feeds <figcaption> and <desc>. */
  caption?: string;
  /** Show the caption under the diagram. Hidden captions still feed <desc>. */
  showCaption?: boolean;
  /** Section theme the diagram sits on. */
  tone?: 'default' | 'muted' | 'ink';
  /** No panel border, canvas or dot grid (for hero media). */
  bare?: boolean;
  className?: string;
}

export function Diagram({ spec, caption, showCaption = true, tone = 'default', bare = false, className }: DiagramProps) {
  const uid = `dg${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const built = buildDiagram(spec);
  const animate = spec.animate !== false;
  const title = caption?.trim() || built.summary;
  const desc = caption?.trim() ? `${caption.trim()} ${built.summary}` : built.summary;
  const shared = { title, desc, interactive: built.interactive, animate };

  return (
    <figure
      className={cx(styles.root, tone === 'ink' && styles.ink, bare && styles.bare, !animate && styles.still, built.rootClass, className)}
      data-animate={animate ? '' : undefined}
      data-diagram={spec.kind}
    >
      <Panel>
        <SceneSvg scene={built.h} uid={`${uid}h`} className={styles.svgH} {...shared} />
        <SceneSvg scene={built.v} uid={`${uid}v`} className={styles.svgV} {...shared} />
      </Panel>
      {caption && showCaption ? <figcaption className={styles.caption}>{caption}</figcaption> : null}
    </figure>
  );
}

/** The panel around the two SVGs, its content as static HTML when possible. */
function Panel({ children }: { children: ReactNode }) {
  let html: string | null = null;
  try {
    html = staticHtml(children);
  } catch {
    // Not writable as a string (StaticHtmlError) or failed: render the elements, which surfaces any real error.
  }
  return html !== null ? (
    <div dir="ltr" className={styles.panel} dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <div dir="ltr" className={styles.panel}>
      {children}
    </div>
  );
}
