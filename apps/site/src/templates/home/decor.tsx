/**
 * Quiet background pieces for home sections: a masked dot or line grid, soft
 * glows, faint Noon motifs (the bowl and the diamond of the logo) and a
 * section divider. All decorative (aria-hidden), CSS only, and placed
 * behind the content of a `relative isolate` section.
 */
import { cx } from '@/components/ui/cx';
import { LOGO_BOWL, LOGO_DOT } from '@/lib/brand/logo';
import d from './decor.module.css';

type Glow = 'brand' | 'teal' | 'amber';

export function Backdrop({
  pattern,
  glows = [],
  noon,
  tint,
  className,
}: {
  /** Masked pattern behind the section. */
  pattern?: 'dots' | 'grid';
  /** Up to three soft glows, placed by index. */
  glows?: Glow[];
  /** A faint Noon motif on one side. */
  noon?: 'left' | 'right';
  /** A soft tinted band (light mode only; dark mode keeps the page canvas). */
  tint?: 'brand' | 'slate';
  className?: string;
}) {
  return (
    <div aria-hidden className={cx(d.backdrop, tint === 'brand' && d.tintBrand, tint === 'slate' && d.tintSlate, className)}>
      {pattern ? <span className={pattern === 'dots' ? d.dots : d.grid} /> : null}
      {glows.map((g, i) => (
        <span key={i} className={cx(d.glow, d[`glow${i}`], d[g])} />
      ))}
      {noon ? <NoonMotif className={noon === 'left' ? d.noonLeft : d.noonRight} /> : null}
    </div>
  );
}

/** The logo's bowl and diamond as a thin outline, very faint. */
export function NoonMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="112 112 288 288" className={cx(d.noon, className)} fill="none">
      <path d={LOGO_BOWL} />
      <path d={LOGO_DOT} />
    </svg>
  );
}

/** Hairline between sections with the Noon diamond in the middle. */
export function Divider({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cx(d.divider, className)}>
      <span className={d.dividerLine} />
      <svg viewBox="0 0 16 16" className={d.dividerMark}>
        <path d="M8 1.5L14.5 8L8 14.5L1.5 8Z" />
      </svg>
      <span className={d.dividerLine} />
    </div>
  );
}
