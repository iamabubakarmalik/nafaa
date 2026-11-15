'use client';

/**
 * Product tour player (island). One real screenshot at a time with the part
 * that matters framed and the rest dimmed, a caption, Back/Next, a progress
 * bar of step buttons, and a closing "Start free trial" on the last step.
 *
 * - Server-rendered on step 1, so the first screen and caption are in the
 *   HTML. Only the current step's image is in the DOM; the next one is
 *   fetched in the background once a step is shown.
 * - Keys: ← → (flipped on right-to-left pages), Home and End, while focus is
 *   in the player or on the page body. Swipe on touch screens.
 * - Phones: the capture zooms to the highlighted part (scale and offset come
 *   from the server, templates/tour/zoom.ts); a button shows the full screen.
 * - Deep links: #step-3 opens step 3; the step list under the player uses them.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { buttonClasses } from '@/components/ui/Button';
import { cx } from '@/components/ui/cx';
import { track } from '@/lib/analytics/track';
import styles from './tour.module.css';

export interface TourPlayerStep {
  id: string;
  title: string;
  body: string;
  label: string;
  alt: string;
  src: string;
  srcSet: string;
  width: number;
  height: number;
  address: string;
  box: readonly [number, number, number, number];
  zoom: { s: number; tx: number; ty: number };
  tagAt: 'above' | 'below' | 'inside' | 'end';
}

export interface TourPlayerText {
  carousel: string;
  slide: string;
  stepOf: string;
  back: string;
  next: string;
  restart: string;
  zoomOut: string;
  zoomIn: string;
  keysHint: string;
  goToStep: string;
  startTrial: string;
  bookDemo: string;
  finishNote: string;
}

const SIZES = '(min-width: 1024px) 860px, (min-width: 768px) 92vw, 160vw';

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ''));

function stepFromHash(hash: string, total: number): number | null {
  const match = /^#step-(\d+)$/.exec(hash);
  if (!match) return null;
  const n = Number(match[1]);
  return n >= 1 && n <= total ? n - 1 : null;
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

function Chevron({ back }: { back?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={cx('rtl:-scale-x-100', back && '-scale-x-100 rtl:scale-x-100')}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function TourPlayer({ steps, t, signupUrl, demoHref }: { steps: TourPlayerStep[]; t: TourPlayerText; signupUrl: string; demoHref: string }) {
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const cta = useRef<HTMLAnchorElement>(null);
  const viaNext = useRef(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const current = useRef(0);
  const total = steps.length;
  const step = steps[index]!;
  const last = index === total - 1;

  const go = useCallback(
    (next: number, source: string) => {
      const target = Math.max(0, Math.min(total - 1, next));
      if (target === current.current) return;
      current.current = target;
      setIndex(target);
      track('tour_step', { step: target + 1, id: steps[target]!.id, label: `Tour: ${source}` });
      try {
        window.history.replaceState(window.history.state, '', target === 0 ? window.location.pathname + window.location.search : `#step-${target + 1}`);
      } catch {
        // History can be locked in some embeds; the tour works without it.
      }
    },
    [steps, total],
  );

  // Deep links (#step-n), now and when the step list links are used.
  useEffect(() => {
    const fromHash = () => {
      const n = stepFromHash(window.location.hash, total);
      if (n === null) return false;
      current.current = n;
      setIndex(n);
      return true;
    };
    if (fromHash()) root.current?.scrollIntoView({ block: 'center' });
    const onHash = () => {
      if (fromHash()) root.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [total]);

  // Arrow keys on the page body as well as inside the player.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || isTyping(event.target)) return;
      const inside = root.current?.contains(event.target as Node) ?? false;
      if (!inside && event.target !== document.body) return;
      const rtl = getComputedStyle(root.current ?? document.documentElement).direction === 'rtl';
      const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
      const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
      let next: number | null = null;
      if (event.key === forward) next = index + 1;
      else if (event.key === backward) next = index - 1;
      else if (event.key === 'Home' && inside) next = 0;
      else if (event.key === 'End' && inside) next = total - 1;
      if (next === null) return;
      event.preventDefault();
      go(next, 'key');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [go, index, total]);

  // Fetch the next capture in the background.
  useEffect(() => {
    const next = steps[index + 1];
    if (!next || next.src === step.src) return;
    const img = new Image();
    img.sizes = SIZES;
    img.srcset = next.srcSet;
    img.src = next.src;
  }, [index, step.src, steps]);

  // Keep focus in the player when Next turns into the closing link.
  useEffect(() => {
    if (last && viaNext.current) cta.current?.focus();
    viaNext.current = false;
  }, [last]);

  const [x, y, w, h] = step.box;
  const portrait = step.height > step.width;

  return (
    <div ref={root} className={styles.player} role="region" aria-roledescription="carousel" aria-label={t.carousel} data-track-area="tour">
      <div className={styles.top}>
        <p className={styles.count} aria-hidden="true">
          {fill(t.stepOf, { n: index + 1, total })}
        </p>
        <span className={styles.meter} aria-hidden="true">
          <span style={{ '--p': `${((index + 1) / total) * 100}%` }} />
        </span>
        <ol className={styles.progress}>
          {steps.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                aria-label={`${fill(t.goToStep, { n: i + 1 })}: ${s.title}`}
                aria-current={i === index ? 'step' : undefined}
                data-done={i < index ? '' : undefined}
                onClick={() => go(i, 'progress')}
              />
            </li>
          ))}
        </ol>
      </div>

      <div className={styles.body}>
        <div
          className={styles.stage}
          dir="ltr"
          onPointerDown={(e) => {
            touch.current = e.pointerType === 'touch' ? { x: e.clientX, y: e.clientY } : null;
          }}
          onPointerUp={(e) => {
            const start = touch.current;
            touch.current = null;
            if (!start) return;
            const dx = e.clientX - start.x;
            if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(e.clientY - start.y)) return;
            const rtl = getComputedStyle(root.current ?? document.documentElement).direction === 'rtl';
            go(index + ((dx < 0) !== rtl ? 1 : -1), 'swipe');
          }}
        >
          <div className={styles.bar} aria-hidden="true">
            <span className={styles.lights}>
              <span />
              <span />
              <span />
            </span>
            {step.address ? <span className={styles.address}>{step.address}</span> : null}
          </div>
          <button type="button" className={styles.zoomToggle} aria-pressed={!zoomed} onClick={() => setZoomed((z) => !z)}>
            {zoomed ? t.zoomOut : t.zoomIn}
          </button>
          <div className={styles.viewport} data-zoom={zoomed ? '' : undefined}>
            <div key={step.src} className={styles.shot} data-portrait={portrait ? '' : undefined} style={{ '--ar': `${step.width} / ${step.height}`, '--zs': step.zoom.s, '--zx': `${step.zoom.tx}%`, '--zy': `${step.zoom.ty}%` }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary renditions, sized by srcset */}
              <img
                src={step.src}
                srcSet={step.srcSet}
                sizes={SIZES}
                width={step.width}
                height={step.height}
                alt={step.alt}
                decoding="async"
                fetchPriority={index === 0 ? 'high' : 'auto'}
                draggable={false}
              />
              <span className={styles.spot} style={{ '--x': `${x}%`, '--y': `${y}%`, '--w': `${w}%`, '--h': `${h}%` }} data-at={step.tagAt} aria-hidden="true">
                <span className={styles.tag}>{step.label}</span>
              </span>
            </div>
          </div>
        </div>

        <div className={styles.caption} role="group" aria-roledescription={t.slide} aria-label={fill(t.stepOf, { n: index + 1, total })}>
          <div aria-live="polite" aria-atomic="true">
            <h2 className={styles.title}>{step.title}</h2>
            <p className={styles.text}>{step.body}</p>
            {last ? <p className={styles.finish}>{t.finishNote}</p> : null}
          </div>
          <div className={styles.nav}>
            <button type="button" className={buttonClasses({ variant: 'secondary', size: 'md' })} onClick={() => go(index - 1, 'back')} disabled={index === 0}>
              <Chevron back />
              {t.back}
            </button>
            {last ? (
              <a ref={cta} href={signupUrl} className={buttonClasses({ variant: 'primary', size: 'md' })} data-track-label="Tour: Start free trial">
                {t.startTrial}
                <Chevron />
              </a>
            ) : (
              <button
                type="button"
                className={buttonClasses({ variant: 'primary', size: 'md' })}
                onClick={() => {
                  viaNext.current = index + 1 === total - 1;
                  go(index + 1, 'next');
                }}
              >
                {t.next}
                <Chevron />
              </button>
            )}
          </div>
          {last ? (
            <div className={styles.after}>
              <a href={demoHref} data-track="cta_click" data-track-label="Tour: Book a demo">
                {t.bookDemo}
              </a>
              <button type="button" onClick={() => go(0, 'restart')}>
                {t.restart}
              </button>
            </div>
          ) : (
            <p className={styles.hint}>{t.keysHint}</p>
          )}
        </div>
      </div>
    </div>
  );
}
