/**
 * service-process: discover, design, build, launch, support, drawn as a
 * milestone rail. The rail draws in on scroll; a packet runs along it and
 * each milestone pulses as it passes.
 */
import type { ReactNode } from 'react';
import styles from '../diagrams.module.css';
import { line } from '../lib/geometry';
import { sequence, wrapText } from '../lib/text';
import { FONT_H, FONT_V, type Scene, type SceneFont } from '../lib/types';
import { SvgIcon } from '../parts/Icon';
import { cx, delayClass, revealClass } from '../parts/classes';
import { L, type BespokeDiagram, type Labels } from './shared';

const STEPS = [
  { key: 'discover', icon: 'search' },
  { key: 'design', icon: 'palette' },
  { key: 'build', icon: 'code' },
  { key: 'launch', icon: 'rocket' },
  { key: 'support', icon: 'life-buoy' },
] as const;

interface Milestone {
  x: number;
  y: number;
  r: number;
  label: string;
  icon: string;
  index: number;
}

function MilestoneView({ m, font, o, last }: { m: Milestone; font: SceneFont; o: 'h' | 'v'; last: boolean }): ReactNode {
  const iconSize = Math.round(m.r * 0.9);
  const lineH = font.label * 1.25;
  const lines = wrapText(m.label, o === 'h' ? 168 : 230, font.label, 2);
  const number = String(m.index + 1).padStart(2, '0');
  return (
    <g className={cx(styles.rise, revealClass(o === 'h' ? m.index : m.index * 2))}>
      <circle cx={m.x} cy={m.y + 2} r={m.r} className={styles.nodeShadow} />
      <circle cx={m.x} cy={m.y} r={m.r} className={last ? styles.railDotBrand : styles.railDot} />
      <SvgIcon name={m.icon} x={m.x - iconSize / 2} y={m.y - iconSize / 2} size={iconSize} className={styles.tileIcon} />
      {o === 'h' ? (
        <>
          <text x={m.x} y={m.y - m.r - 14} textAnchor="middle" fontSize={font.pill - 1} className={styles.badge}>
            {number}
          </text>
          <text x={m.x} y={m.y + m.r + 26} textAnchor="middle" fontSize={font.label} className={styles.label}>
            {lines.map((t, i) => (
              <tspan key={i} x={m.x} dy={i === 0 ? 0 : lineH}>
                {t}
              </tspan>
            ))}
          </text>
        </>
      ) : (
        <>
          <text x={m.x + m.r + 18} y={m.y - 6} fontSize={font.pill - 1} className={styles.badge}>
            {number}
          </text>
          <text x={m.x + m.r + 18} y={m.y + 13} fontSize={font.label} className={styles.label}>
            {lines.map((t, i) => (
              <tspan key={i} x={m.x + m.r + 18} dy={i === 0 ? 0 : lineH}>
                {t}
              </tspan>
            ))}
          </text>
        </>
      )}
    </g>
  );
}

function build(l: Labels, o: 'h' | 'v'): Scene {
  const font = o === 'h' ? FONT_H : FONT_V;
  const r = o === 'h' ? 28 : 24;
  const milestones: Milestone[] = STEPS.map((s, i) => ({
    x: o === 'h' ? 96 + i * 192 : 56,
    y: o === 'h' ? 96 : 52 + i * 96,
    r,
    label: L(l, s.key),
    icon: s.icon,
    index: i,
  }));
  const first = milestones[0] as Milestone;
  const last = milestones[milestones.length - 1] as Milestone;
  const rail = o === 'h' ? line({ x: first.x + r + 4, y: first.y }, { x: last.x - r - 4, y: last.y }) : line({ x: first.x, y: first.y + r + 4 }, { x: last.x, y: last.y - r - 4 });
  return {
    w: o === 'h' ? 960 : 360,
    h: o === 'h' ? 210 : last.y + r + 28,
    font,
    nodes: [],
    edges: [{ id: 'rail', d: rail, tone: 'brand', arrow: false, reveal: 1, packets: [{ delay: 0, tone: 'brand' }] }],
    over: (
      <>
        {milestones.map((m, i) => (
          <MilestoneView key={m.index} m={m} font={font} o={o} last={i === milestones.length - 1} />
        ))}
        <g aria-hidden="true">
          {milestones.map((m, i) => (
            <circle key={m.index} cx={m.x} cy={m.y} r={m.r + 3} className={cx(styles.ping, delayClass(Math.round(i * 0.75)))} />
          ))}
        </g>
      </>
    ),
  };
}

export const serviceProcess: BespokeDiagram = {
  build: (labels, o) => build(labels, o),
  summary: (l) => `${sequence(STEPS.map((s) => L(l, s.key)))}.`,
};
