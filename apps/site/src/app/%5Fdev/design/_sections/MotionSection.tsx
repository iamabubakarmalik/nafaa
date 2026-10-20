import { Cloud, Search, Store, WifiOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Animate, Reveal } from '@/components/motion';
import { Badge, Card, cx } from '@/components/ui';
import { motion } from '@/styles/scale';
import { Code, DevSection, Group, Specimen } from './shared';

/* ─── A small code-drawn diagram that exercises every motion class ─────── */

const NODE_W = 168;
const NODE_H = 64;

const ORDER = ['', 'm-i1', 'm-i2', 'm-i3', 'm-i4', 'm-i5'] as const;

function Node({
  x,
  y,
  w = NODE_W,
  icon: Glyph,
  title,
  note,
  order,
}: {
  x: number;
  y: number;
  w?: number;
  icon: LucideIcon;
  title: string;
  note: string;
  order: number;
}) {
  return (
    <g className={cx('m-pop', ORDER[order])}>
      <rect x={x} y={y} width={w} height={NODE_H} rx={14} className="fill-surface stroke-line-strong" strokeWidth={1} />
      <rect x={x + 14} y={y + 16} width={32} height={32} rx={9} className="fill-brand-50" />
      <Glyph x={x + 20} y={y + 22} size={20} strokeWidth={1.75} className="text-brand-700" aria-hidden />
      <text x={x + 58} y={y + 29} className="fill-fg-strong text-[14px] font-semibold">
        {title}
      </text>
      <text x={x + 58} y={y + 47} className="fill-fg-subtle text-[12px]">
        {note}
      </text>
    </g>
  );
}

function Edge({ d, head, order }: { d: string; head: string; order: number }) {
  return (
    <>
      <path
        d={d}
        pathLength={1}
        fill="none"
        strokeWidth={1.5}
        strokeLinecap="round"
        className={cx('m-draw stroke-brand-600', ORDER[order])}
      />
      <path
        d={head}
        fill="none"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cx('m-fade stroke-brand-600', ORDER[order + 1])}
      />
    </>
  );
}

function Packet({ d, order }: { d: string; order: number }) {
  return (
    <circle
      r={4.5}
      strokeWidth={2}
      className={cx('m-packet fill-brand-500 stroke-surface', ORDER[order])}
      style={{ '--path': `path('${d}')` }}
    />
  );
}

const NODES = [
  { icon: Store, title: 'Counter', note: 'Sale saved' },
  { icon: WifiOff, title: 'Offline queue', note: 'Waits for internet' },
  { icon: Cloud, title: 'Cloud', note: 'Synced' },
] as const;

function SyncDemoHorizontal() {
  const a = 'M192 96 L276 96';
  const b = 'M444 96 L528 96';
  const back = 'M612 128 C612 196 108 196 108 128';
  return (
    <svg viewBox="0 44 720 186" role="img" aria-labelledby="sync-h-title sync-h-desc" className="hidden h-auto w-full md:block">
      <title id="sync-h-title">Motion demo: a sale moving from the counter to the cloud</title>
      <desc id="sync-h-desc">
        Three boxes in a row, Counter, Offline queue and Cloud, joined by arrows. A dashed line returns from Cloud
        to Counter, labelled prices and stock.
      </desc>
      <path d={back} fill="none" strokeWidth={1.5} className="m-flow m-fade m-i3 stroke-fg-subtle/50" />
      <text x={360} y={214} textAnchor="middle" className="m-fade m-i4 fill-fg-subtle text-[12px]">
        Prices and stock
      </text>
      <Edge d={a} head="M268 91 L274 96 L268 101" order={1} />
      <Edge d={b} head="M520 91 L526 96 L520 101" order={2} />
      <Packet d={a} order={0} />
      <Packet d={b} order={1} />
      <Packet d={back} order={3} />
      {NODES.map((n, i) => (
        <Node key={n.title} x={24 + i * 252} y={64} {...n} order={i * 2} />
      ))}
      <circle cx={680} cy={80} r={7} strokeWidth={1.5} className="m-pulse fill-none stroke-brand-500" />
      <circle cx={680} cy={80} r={3.5} className="m-pop m-i4 fill-brand-500" />
    </svg>
  );
}

function SyncDemoVertical() {
  const a = 'M160 88 L160 156';
  const b = 'M160 220 L160 288';
  const back = 'M272 320 C316 320 316 56 272 56';
  return (
    <svg viewBox="0 0 320 376" role="img" aria-labelledby="sync-v-title sync-v-desc" className="mx-auto h-auto w-full max-w-sm md:hidden">
      <title id="sync-v-title">Motion demo: a sale moving from the counter to the cloud</title>
      <desc id="sync-v-desc">
        Three boxes stacked, Counter, Offline queue and Cloud, joined by arrows. A dashed line returns from Cloud to
        Counter.
      </desc>
      <path d={back} fill="none" strokeWidth={1.5} className="m-flow m-fade m-i3 stroke-fg-subtle/50" />
      <Edge d={a} head="M155 148 L160 154 L165 148" order={1} />
      <Edge d={b} head="M155 280 L160 286 L165 280" order={2} />
      <Packet d={a} order={0} />
      <Packet d={b} order={1} />
      <Packet d={back} order={3} />
      {NODES.map((n, i) => (
        <Node key={n.title} x={48} y={24 + i * 132} w={224} {...n} order={i * 2} />
      ))}
      <circle cx={256} cy={304} r={7} strokeWidth={1.5} className="m-pulse fill-none stroke-brand-500" />
      <circle cx={256} cy={304} r={3.5} className="m-pop m-i4 fill-brand-500" />
    </svg>
  );
}

/* ─── Easing curves plotted from the tokens ─────────────────────────────── */

function curvePath(bezier: string): string {
  const [x1 = 0, y1 = 0, x2 = 1, y2 = 1] = bezier.match(/-?[\d.]+/g)?.map(Number) ?? [];
  const p = (x: number, y: number) => `${(x * 100).toFixed(1)} ${(100 - y * 100).toFixed(1)}`;
  return `M${p(0, 0)} C${p(x1, y1)} ${p(x2, y2)} ${p(1, 1)}`;
}

function EasingCard({ name, value, ease }: { name: string; value: string; ease: string }) {
  return (
    <Card padding="sm" className="group">
      <Animate loops={false}>
        <svg viewBox="-6 -6 112 112" className="h-28 w-28" aria-hidden>
          <rect x={0} y={0} width={100} height={100} rx={4} className="fill-surface-2 stroke-line" strokeWidth={1} />
          <path d={curvePath(value)} pathLength={1} fill="none" strokeWidth={2.5} strokeLinecap="round" className="m-draw stroke-brand-600" />
        </svg>
      </Animate>
      <div className="mt-4 font-mono text-xs font-medium text-fg-strong">--ease-{name}</div>
      <div className="mt-1 font-mono text-xs text-fg-subtle">{value}</div>
      <div aria-hidden className="relative mt-5 h-3 rounded-full bg-surface-3">
        <div
          className={cx(
            'absolute inset-y-0 left-0 w-full transition-transform duration-[900ms] group-hover:translate-x-[calc(100%-12px)]',
            ease,
          )}
        >
          <span className="block size-3 rounded-full bg-brand-600" />
        </div>
      </div>
      <p className="mt-2 text-xs text-fg-subtle">Hover to run</p>
    </Card>
  );
}

export function MotionSection() {
  return (
    <DevSection
      id="motion"
      title="Motion"
      intro={
        <>
          No animation library. Reveals are CSS scroll-driven animations (zero JS); diagram loops are CSS keyframes
          that run only while visible, switched by one small island (<Code>MotionObserver</Code>). Only{' '}
          <Code>transform</Code>, <Code>opacity</Code> and <Code>stroke-dashoffset</Code> animate.
        </>
      }
    >
      <div className="motion-lab space-y-12">
        <label className="flex w-fit cursor-pointer items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-small text-fg">
          <input type="checkbox" className="rm-toggle peer sr-only" />
          <span
            aria-hidden
            className="relative h-5 w-9 shrink-0 rounded-full bg-slate-300 transition-colors duration-fast after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-white after:shadow-e1 after:transition-transform after:duration-fast peer-checked:bg-brand-700 peer-checked:after:translate-x-4 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-600"
          />
          Preview reduced motion
        </label>

        <Group title="Easing" note={`Durations: fast ${motion.duration.fast}, base ${motion.duration.base}, slow ${motion.duration.slow}, draw ${motion.duration.draw}`}>
          <div className="grid gap-4 sm:grid-cols-2">
            <EasingCard name="out" value={motion.easing.out} ease="ease-out" />
            <EasingCard name="in-out" value={motion.easing['in-out']} ease="ease-in-out" />
          </div>
        </Group>

        <Group
          title="Reveal on scroll"
          note={
            <>
              <Code>data-reveal</Code>: fade-up, fade, scale, stagger
            </>
          }
        >
          <div className="grid gap-4 md:grid-cols-3">
            {(['fade-up', 'fade', 'scale'] as const).map((variant) => (
              <Reveal key={variant} variant={variant}>
                <Card className="h-full">
                  <Badge tone="brand">{variant}</Badge>
                  <p className="mt-3 text-small text-fg-muted">
                    Runs across the first 60% of the element&apos;s entry into view. Already-visible content is
                    never hidden.
                  </p>
                </Card>
              </Reveal>
            ))}
          </div>
          <Reveal variant="stagger" as="ul" className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {['Sale', 'Profit', 'Expense', 'Stock', 'Khata', 'Reports'].map((label) => (
              <li
                key={label}
                className="rounded-md border border-line bg-surface px-4 py-3 text-center text-small font-medium text-fg-strong"
              >
                {label}
              </li>
            ))}
          </Reveal>
        </Group>

        <Group
          title="Diagram motion"
          note={
            <>
              <Code>.m-draw</Code> <Code>.m-pop</Code> <Code>.m-packet</Code> <Code>.m-flow</Code>{' '}
              <Code>.m-pulse</Code>
            </>
          }
        >
          <Specimen className="bg-surface-2">
            <figure>
              <Animate>
                <SyncDemoHorizontal />
                <SyncDemoVertical />
              </Animate>
              <figcaption className="mt-6 max-w-measure text-small text-fg-subtle">
                Lines draw once when the figure first scrolls into view; packets, the dashed return line and the
                status pulse loop only while it is visible, and pause when the tab is hidden. The layout switches to
                a vertical SVG below 768px so labels stay readable. With reduced motion, everything shows its final
                state.
              </figcaption>
            </figure>
          </Specimen>
        </Group>

        <div className="grid gap-4 md:grid-cols-2">
          <Group title="Loop: caret" note={<Code>.m-blink</Code>}>
            <Specimen>
              <Animate>
                <div className="flex h-11 items-center gap-2.5 rounded-md border border-line-strong bg-surface px-3 text-small shadow-e1">
                  <Search aria-hidden size={16} strokeWidth={1.75} className="text-fg-subtle" />
                  <span className="text-fg-strong">Sugar 1kg</span>
                  <span aria-hidden className="m-blink -ml-1.5 h-5 w-px bg-fg-strong" />
                </div>
              </Animate>
            </Specimen>
          </Group>
          <Group title="One-shot" note={<Code>data-animate=&quot;once&quot;</Code>}>
            <Specimen className="flex items-center gap-4">
              <Animate loops={false}>
                <svg viewBox="0 0 48 48" className="size-12" aria-hidden>
                  <circle cx={24} cy={24} r={21} pathLength={1} fill="none" strokeWidth={2} className="m-draw stroke-brand-600" />
                  <path d="M15 24.5 L21.5 31 L33 18" pathLength={1} fill="none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="m-draw m-i3 stroke-brand-700" />
                </svg>
              </Animate>
              <p className="text-small text-fg-muted">Draws once, then stays. Does not count towards the three-loop limit.</p>
            </Specimen>
          </Group>
        </div>

        <Group title="Rules">
          <ul className="grid gap-3 text-small text-fg-muted md:grid-cols-2">
            {[
              'The H1, the hero answer and the hero screenshot never animate.',
              'At most three looping elements run at once; the rest wait, paused.',
              'Nothing in the server HTML starts hidden. Without JavaScript, diagrams render fully drawn.',
              'prefers-reduced-motion turns every animation and transition off.',
              'No scroll-jacking, parallax or cursor effects. Hover feedback is CSS transitions only.',
              'Looping motion stops when the tab is hidden.',
            ].map((rule) => (
              <li key={rule} className="flex gap-3 rounded-md border border-line bg-surface px-4 py-3">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-600" />
                {rule}
              </li>
            ))}
          </ul>
        </Group>
      </div>
    </DevSection>
  );
}
