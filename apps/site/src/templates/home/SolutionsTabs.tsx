'use client';

/**
 * Business-type selector for the home solutions section (island). Panels are
 * server-rendered children; this only picks the visible one.
 *
 * - Wide screens: WAI-ARIA tabs over one stage; arrow keys, Home and End.
 *   It moves on by itself every 7 s while on screen, until the visitor picks,
 *   hovers or focuses; never with reduced motion.
 * - Phones: the tab bar hides and every panel shows as a card in a
 *   swipeable row (CSS overrides `hidden` there), so nothing is out of reach.
 * - Inactive panels keep `hidden`, so their text stays in the HTML.
 */
import { Children, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cx } from '@/components/ui/cx';
import fx from './fx.module.css';

const STEP_MS = 7000;

export interface SolutionTab {
  id: string;
  label: string;
  icon: ReactNode;
  /** RGB channels for --accent. */
  accent?: string;
}

export function SolutionsTabs({ tabs, label, children }: { tabs: SolutionTab[]; label: string; children: ReactNode }) {
  const panels = Children.toArray(children);
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(false);
  const [paused, setPaused] = useState(false);
  const base = useId();
  const root = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.matchMedia('(min-width: 64rem)').matches || !root.current) return;
    const io = new IntersectionObserver(([entry]) => setAuto(Boolean(entry?.isIntersecting)), { threshold: 0.4 });
    io.observe(root.current);
    return () => io.disconnect();
  }, []);

  const running = auto && !paused;
  useEffect(() => {
    if (!running) return;
    const t = window.setTimeout(() => setActive((i) => (i + 1) % tabs.length), STEP_MS);
    return () => window.clearTimeout(t);
  }, [running, active, tabs.length]);

  const pick = (i: number, focus = false) => {
    setActive(i);
    setPaused(true);
    if (focus) tabRefs.current[i]?.focus();
  };

  const onKey = (event: React.KeyboardEvent) => {
    const last = tabs.length - 1;
    const forward = active === last ? 0 : active + 1;
    const back = active === 0 ? last : active - 1;
    // Right-to-left pages (Urdu): the arrow keys follow the visual order.
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const next =
      event.key === 'ArrowRight'
        ? rtl
          ? back
          : forward
        : event.key === 'ArrowLeft'
          ? rtl
            ? forward
            : back
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : undefined;
    if (next === undefined) return;
    event.preventDefault();
    pick(next, true);
  };

  return (
    <div ref={root} className={fx.solGrid} onPointerEnter={() => setPaused(true)} onFocusCapture={() => setPaused(true)}>
      <div className={fx.solListWrap}>
        <div role="tablist" aria-label={label} onKeyDown={onKey} className={fx.solList}>
          {tabs.map((tab, i) => {
            const selected = i === active;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`${base}-tab-${i}`}
                aria-selected={selected}
                aria-controls={`${base}-panel-${i}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => pick(i)}
                className={cx(fx.solTab, selected && fx.solTabOn)}
                style={{ '--accent': tab.accent }}
              >
                <span className={fx.solTabIcon}>{tab.icon}</span>
                <span className="min-w-0 truncate">{tab.label}</span>
                {selected && running ? <span key={`p-${active}`} aria-hidden className={fx.solProgress} style={{ '--dur': `${STEP_MS}ms` }} /> : null}
              </button>
            );
          })}
        </div>
      </div>
      <div className={fx.solPanels}>
        {panels.map((panel, i) => (
          <div
            key={tabs[i]?.id ?? i}
            role="tabpanel"
            id={`${base}-panel-${i}`}
            aria-labelledby={`${base}-tab-${i}`}
            hidden={i !== active}
            tabIndex={0}
            className={cx(fx.solPanelWrap, 'outline-none', i === active && fx.solIn)}
          >
            {panel}
          </div>
        ))}
      </div>
    </div>
  );
}
