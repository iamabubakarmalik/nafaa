/**
 * <Screenshot>: a real app screenshot in the frame the block asks for, with
 * optional numbered callouts and their legend.
 *
 * Server component. `children` is the image (normally <CmsImage> with
 * width, height and sizes). Callouts are drawn in an SVG layer over the
 * screen area using percentage positions, so no inline styles are needed;
 * markers are decorative and the ordered legend below carries the text.
 * Markers pulse while the figure is in view (MotionObserver sets
 * data-inview); reduced motion removes the pulse.
 */
import type { ReactNode } from 'react';
import type { Frame } from '../../lib/cms/contract/cms-contract';
import { BrowserFrame, DesktopFrame, PhoneFrame, PlainFrame, ReceiptFrame, TabletFrame } from './Frames';
import styles from './frames.module.css';

export interface Callout {
  /** 0-100, percent of the screen width. */
  x: number;
  /** 0-100, percent of the screen height. */
  y: number;
  label: string;
}

export interface ScreenshotProps {
  frame: Frame;
  children: ReactNode;
  /** Address bar text for the browser frame, for example "app.nafaa.pk/pos". */
  url?: string;
  /** Window title for the desktop frame. */
  title?: string;
  callouts?: Callout[];
  caption?: string;
  /** Pulse the markers while in view. Hero media passes false (ARCH 4.4 hero rule). */
  animate?: boolean;
  className?: string;
}

const PULSE = [undefined, styles.p1, styles.p2, styles.p3, styles.p4, styles.p5];
const clamp = (n: number) => Math.min(97, Math.max(3, n));

function CalloutLayer({ callouts, animate }: { callouts: Callout[]; animate: boolean }) {
  return (
    <svg className={styles.calloutLayer} aria-hidden="true" focusable="false">
      {callouts.map((c, i) => {
        const cx = `${clamp(c.x)}%`;
        const cy = `${clamp(c.y)}%`;
        return (
          <g key={i}>
            {animate ? <circle cx={cx} cy={cy} r="12" className={[styles.pulse, PULSE[i]].filter(Boolean).join(' ')} /> : null}
            <circle cx={cx} cy={cy} r="12" className={styles.marker} />
            <text x={cx} y={cy} dy="0.36em" textAnchor="middle" className={styles.markerText}>
              {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function FrameFor({ frame, url, title, children, className }: Pick<ScreenshotProps, 'frame' | 'url' | 'title' | 'children' | 'className'>) {
  switch (frame) {
    case 'browser':
      return <BrowserFrame url={url} className={className}>{children}</BrowserFrame>;
    case 'phone':
      return <PhoneFrame className={className}>{children}</PhoneFrame>;
    case 'tablet':
      return <TabletFrame className={className}>{children}</TabletFrame>;
    case 'desktop':
      return <DesktopFrame title={title} className={className}>{children}</DesktopFrame>;
    case 'receipt':
      return <ReceiptFrame className={className}>{children}</ReceiptFrame>;
    case 'none':
    default:
      return <PlainFrame className={className}>{children}</PlainFrame>;
  }
}

export function Screenshot({ frame, children, url, title, callouts, caption, animate = true, className }: ScreenshotProps) {
  const marks = (callouts ?? []).slice(0, 6);
  const pulses = animate && marks.length > 0;
  return (
    <figure className={[styles.root, className].filter(Boolean).join(' ')} data-animate={pulses ? '' : undefined}>
      <FrameFor frame={frame} url={url} title={title} className={styles.media}>
        {children}
        {marks.length ? <CalloutLayer callouts={marks} animate={pulses} /> : null}
      </FrameFor>
      {marks.length ? (
        <ol className={styles.legend}>
          {marks.map((c, i) => (
            <li key={i}>
              <span className={styles.legendNum} aria-hidden="true">
                {i + 1}
              </span>
              <span>{c.label}</span>
            </li>
          ))}
        </ol>
      ) : null}
      {caption ? <figcaption className={styles.caption}>{caption}</figcaption> : null}
    </figure>
  );
}
