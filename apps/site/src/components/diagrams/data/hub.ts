/**
 * hub: a centre node with 3-8 spokes.
 *
 * Wide layout: spokes on an ellipse around the centre, edges radiate out.
 * Phone layout: the centre on top and the spokes in a two-column grid.
 * Spokes with `href` become links (the SVG is then a group, not an image).
 */
import type { HubDiagramSpec } from '../../../lib/cms/contract/cms-contract';
import { anchor, boxExit, center, elbow, line } from '../lib/geometry';
import { FONT_H, FONT_V, type BuiltDiagram, type Scene, type SceneNode } from '../lib/types';

function horizontal(spec: HubDiagramSpec): Scene {
  const n = spec.spokes.length;
  const cx = 480;
  const cy = 210;
  const hub: SceneNode = {
    id: 'center',
    x: cx - 110,
    y: cy - 36,
    w: 220,
    h: 72,
    label: spec.center.label,
    icon: spec.center.icon,
    tone: 'brand',
    reveal: 0,
  };
  const rx = 330;
  const ry = 150;
  const start = -90 + (n % 2 === 0 ? 180 / n : 0);
  const sw = 188;
  const sh = 60;
  const spokes: SceneNode[] = spec.spokes.map((s, i) => {
    const angle = ((start + (i * 360) / n) * Math.PI) / 180;
    const x = cx + rx * Math.cos(angle);
    const y = cy + ry * Math.sin(angle);
    return { id: `s${i}`, x: x - sw / 2, y: y - sh / 2, w: sw, h: sh, label: s.label, icon: s.icon, href: s.href, reveal: Math.min(9, 1 + i) };
  });
  return {
    w: 960,
    h: 420,
    font: FONT_H,
    nodes: [hub, ...spokes],
    edges: spokes.map((s, i) => {
      const from = boxExit(hub, center(s), 2);
      const to = boxExit(s, center(hub), 6);
      return { id: `e${i}`, d: line(from, to), tone: 'brand', reveal: Math.min(9, 1 + i), packets: [{ delay: (i * 2) % 12, tone: 'brand' }] };
    }),
    pings: spokes.map((s, i) => ({ node: s.id, delay: ((i * 2) % 12) + 3 })),
  };
}

function vertical(spec: HubDiagramSpec): Scene {
  const hub: SceneNode = {
    id: 'center',
    x: 64,
    y: 24,
    w: 232,
    h: 68,
    label: spec.center.label,
    icon: spec.center.icon,
    tone: 'brand',
    reveal: 0,
  };
  const w = 142;
  const h = 104;
  const top = 132;
  const trunkX = 180;
  const spokes: SceneNode[] = spec.spokes.map((s, i) => {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const alone = i === spec.spokes.length - 1 && spec.spokes.length % 2 === 1;
    return {
      id: `s${i}`,
      x: alone ? trunkX - w / 2 : col === 0 ? 16 : 360 - 16 - w,
      y: top + row * (h + 20) + (alone ? 20 : 0),
      w,
      h,
      label: s.label,
      icon: s.icon,
      href: s.href,
      layout: 'stack',
      reveal: Math.min(9, 2 + row * 2),
    };
  });
  const last = spokes[spokes.length - 1];
  const bottom = last ? last.y + last.h : top;
  const from = anchor(hub, 'b', 0.5, 0);
  return {
    w: 360,
    h: bottom + 24,
    font: FONT_V,
    nodes: [hub, ...spokes],
    edges: spokes.map((s, i) => {
      const alone = s.x === trunkX - w / 2;
      const to = alone ? anchor(s, 't', 0.5) : anchor(s, s.x < trunkX ? 'r' : 'l', 0.5, 4);
      return {
        id: `e${i}`,
        d: alone ? line(from, to) : elbow(from, to, 'v', 10),
        tone: 'brand' as const,
        reveal: Math.min(9, 1 + Math.floor(i / 2) * 2),
        packets: [{ delay: (i * 2) % 12, tone: 'brand' as const }],
      };
    }),
    pings: spokes.map((s, i) => ({ node: s.id, delay: ((i * 2) % 12) + 3 })),
  };
}

export function buildHub(spec: HubDiagramSpec): BuiltDiagram {
  return {
    h: horizontal(spec),
    v: vertical(spec),
    summary: `${spec.center.label}: ${spec.spokes.map((s) => s.label).join(', ')}.`,
    interactive: spec.spokes.some((s) => Boolean(s.href)),
  };
}
