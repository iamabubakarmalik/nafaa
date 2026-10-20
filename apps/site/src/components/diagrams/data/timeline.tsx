/**
 * timeline: 2-6 dated steps on an axis. The axis draws in on scroll, a
 * packet runs along it, and each dot pulses as the packet passes.
 * Wide layout: horizontal axis, date above and text below each dot.
 * Phone layout: vertical axis on the left, text on the right.
 */
import styles from '../diagrams.module.css';
import type { TimelineDiagramSpec } from '../../../lib/cms/contract/cms-contract';
import { line } from '../lib/geometry';
import { wrapText } from '../lib/text';
import { FONT_H, FONT_V, type BuiltDiagram, type Scene } from '../lib/types';
import { cx, delayClass, revealClass } from '../parts/classes';

interface Laid {
  x: number;
  y: number;
  date: string;
  label: string[];
  note: string[];
  last: boolean;
}

function Items({ items, o, font }: { items: Laid[]; o: 'h' | 'v'; font: Scene['font'] }) {
  const lineH = font.label * 1.25;
  const noteH = font.note * 1.45;
  return (
    <>
      {items.map((it, i) => {
        const anchorAttr = o === 'h' ? 'middle' : 'start';
        const tx = o === 'h' ? it.x : it.x + 28;
        const dateY = o === 'h' ? it.y - 22 : it.y + 4;
        const labelY = o === 'h' ? it.y + 36 : it.y + 4 + font.label * 1.45;
        const noteY = labelY + (it.label.length - 1) * lineH + noteH + 2;
        return (
          <g key={i} className={cx(styles.rise, revealClass(o === 'h' ? i + 1 : i * 2 + 1))}>
            <circle cx={it.x} cy={it.y} r={8} className={it.last ? styles.railDotBrand : styles.railDot} />
            <circle cx={it.x} cy={it.y} r={3} className={styles.markBox} />
            <text x={tx} y={dateY} textAnchor={anchorAttr} fontSize={font.pill} className={styles.date}>
              {it.date}
            </text>
            <text x={tx} y={labelY} textAnchor={anchorAttr} fontSize={font.label} className={styles.label}>
              {it.label.map((t, k) => (
                <tspan key={k} x={tx} dy={k === 0 ? 0 : lineH}>
                  {t}
                </tspan>
              ))}
            </text>
            {it.note.length ? (
              <text x={tx} y={noteY} textAnchor={anchorAttr} fontSize={font.note} className={styles.note}>
                {it.note.map((t, k) => (
                  <tspan key={k} x={tx} dy={k === 0 ? 0 : noteH}>
                    {t}
                  </tspan>
                ))}
              </text>
            ) : null}
          </g>
        );
      })}
      <g aria-hidden="true">
        {items.map((it, i) => (
          <circle key={i} cx={it.x} cy={it.y} r={12} className={cx(styles.ping, delayClass(Math.round((i * 3) / Math.max(1, items.length - 1))))} />
        ))}
      </g>
    </>
  );
}

function horizontal(spec: TimelineDiagramSpec): Scene {
  const n = spec.items.length;
  const span = 960 - 80;
  const step = span / n;
  const textW = Math.min(240, step - 24);
  const axisY = 72;
  const items: Laid[] = spec.items.map((item, i) => ({
    x: 40 + step * (i + 0.5),
    y: axisY,
    date: item.date,
    label: wrapText(item.label, textW, FONT_H.label, 2),
    note: item.note ? wrapText(item.note, textW, FONT_H.note, 4, 400) : [],
    last: i === n - 1,
  }));
  const tallest = Math.max(...items.map((it) => it.label.length * FONT_H.label * 1.25 + it.note.length * FONT_H.note * 1.45));
  const first = items[0] as Laid;
  const last = items[n - 1] as Laid;
  return {
    w: 960,
    h: Math.ceil(axisY + 36 + tallest + 28),
    font: FONT_H,
    nodes: [],
    edges: [
      { id: 'base', d: line({ x: 40, y: axisY }, { x: 920, y: axisY }), arrow: false, dashed: true, reveal: 0 },
      { id: 'axis', d: line({ x: first.x, y: axisY }, { x: last.x, y: axisY }), tone: 'brand', arrow: false, reveal: 1, packets: [{ delay: 0, tone: 'brand' }] },
    ],
    over: <Items items={items} o="h" font={FONT_H} />,
  };
}

function vertical(spec: TimelineDiagramSpec): Scene {
  const x = 40;
  let y = 32;
  const n = spec.items.length;
  const items: Laid[] = spec.items.map((item, i) => {
    const label = wrapText(item.label, 270, FONT_V.label, 2);
    const note = item.note ? wrapText(item.note, 270, FONT_V.note, 4, 400) : [];
    const laid: Laid = { x, y, date: item.date, label, note, last: i === n - 1 };
    y += FONT_V.label * 1.45 + label.length * FONT_V.label * 1.25 + note.length * FONT_V.note * 1.45 + 36;
    return laid;
  });
  const first = items[0] as Laid;
  const last = items[n - 1] as Laid;
  return {
    w: 360,
    h: Math.ceil(y - 12),
    font: FONT_V,
    nodes: [],
    edges: [{ id: 'axis', d: line({ x, y: first.y }, { x, y: last.y }), tone: 'brand', arrow: false, reveal: 1, packets: [{ delay: 0, tone: 'brand' }] }],
    over: <Items items={items} o="v" font={FONT_V} />,
  };
}

export function buildTimeline(spec: TimelineDiagramSpec): BuiltDiagram {
  return {
    h: horizontal(spec),
    v: vertical(spec),
    summary: spec.items.map((it) => `${it.date}: ${it.label}${it.note ? ` (${it.note})` : ''}`).join('; ') + '.',
    interactive: false,
  };
}
