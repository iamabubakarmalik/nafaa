'use client';

/**
 * Tabs for the home product tour (island). The panels are server-rendered
 * children; this only picks which one is visible.
 *
 * - WAI-ARIA tabs: arrow keys, Home and End move between tabs.
 * - Auto-advance every 7 s while the tour is on screen, until the visitor
 *   picks a tab, hovers or focuses the tour. Never with reduced motion.
 * - Inactive panels keep `hidden`, so their lazy images load only when shown.
 */
import { Children, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cx } from '@/components/ui/cx';
import fx from './fx.module.css';

const STEP_MS = 7000;

export function TourTabs({ tabs, label, children }: { tabs: { id: string; label: string; icon: ReactNode }[]; label: string; children: ReactNode }) {
  const panels = Children.toArray(children);
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(false);
  const [paused, setPaused] = useState(false);
  const base = useId();
  const root = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Start auto-advance only when the tour is visible and motion is allowed.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !root.current) return;
    const io = new IntersectionObserver(([entry]) => setAuto(Boolean(entry?.isIntersecting)), { threshold: 0.35 });
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
    const map: Record<string, number> = { ArrowRight: active === last ? 0 : active + 1, ArrowLeft: active === 0 ? last : active - 1, Home: 0, End: last };
    const next = map[event.key];
    if (next === undefined) return;
    event.preventDefault();
    pick(next, true);
  };

  return (
    <div ref={root} className="mt-10" onPointerEnter={() => setPaused(true)} onFocusCapture={() => setPaused(true)}>
      <div className="-mx-gutter overflow-x-auto px-gutter [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div role="tablist" aria-label={label} onKeyDown={onKey} className="mx-auto flex w-max gap-1 rounded-full border border-line bg-surface-2 p-1">
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
                className={cx(
                  'relative inline-flex h-10 items-center gap-2 overflow-hidden rounded-full px-4 text-small font-medium transition-colors duration-fast',
                  selected ? 'bg-surface text-fg-strong shadow-e1 ink:bg-surface-3' : 'text-fg-muted hover:text-fg-strong',
                )}
              >
                <span className={selected ? 'text-link' : 'text-fg-subtle'}>{tab.icon}</span>
                {tab.label}
                {selected && running ? <span key={`p-${active}`} aria-hidden className={fx.tabProgress} style={{ '--dur': `${STEP_MS}ms` }} /> : null}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-10">
        {panels.map((panel, i) => (
          <div
            key={tabs[i]?.id ?? i}
            role="tabpanel"
            id={`${base}-panel-${i}`}
            aria-labelledby={`${base}-tab-${i}`}
            hidden={i !== active}
            tabIndex={0}
            className={cx('outline-none', i === active && fx.panelIn)}
          >
            {panel}
          </div>
        ))}
      </div>
    </div>
  );
}
