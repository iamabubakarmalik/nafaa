/**
 * flow: 2-8 editor-defined nodes and up to 16 edges, laid out automatically.
 *
 * Wide layout: one row for up to 5 nodes, otherwise two rows read left to
 * right. Neighbours in reading order get a straight edge; other edges route
 * around the row (above the first row, below the second, or through the
 * gap between rows). Phone layout: one column; non-neighbour edges route on
 * the right-hand side, each on its own lane.
 */
import type { FlowDiagramSpec } from '../../../lib/cms/contract/cms-contract';
import { anchor, line, ortho } from '../lib/geometry';
import { sequence, textWidth, wrapText } from '../lib/text';
import { FONT_H, FONT_V, type BuiltDiagram, type Scene, type SceneEdge, type SceneNode, type ScenePill } from '../lib/types';

const MARGIN = 40;

function stackHeight(spec: FlowDiagramSpec, w: number): number {
  const textW = w - 28;
  let lines = 0;
  for (const n of spec.nodes) {
    const label = wrapText(n.label, textW, FONT_H.label, 2).length;
    const note = n.note ? wrapText(n.note, textW, FONT_H.note, 3, 400).length : 0;
    lines = Math.max(lines, label * FONT_H.label * 1.25 + (note ? 4 + note * FONT_H.note * 1.4 : 0));
  }
  const hasIcon = spec.nodes.some((n) => n.icon);
  return Math.ceil((hasIcon ? 16 + 40 + 12 : 14) + lines + 18);
}

function packetsFor(index: number) {
  return [{ delay: (index * 3) % 16 }];
}

function edgeLabelPill(id: string, text: string | undefined, x: number, y: number, reveal: number): ScenePill | null {
  if (!text) return null;
  return { id: `label-${id}`, x, y, text, reveal };
}

function horizontal(spec: FlowDiagramSpec): Scene {
  const n = spec.nodes.length;
  const rows = n <= 5 ? 1 : 2;
  const perRow = Math.ceil(n / rows);
  const labelWidth = Math.max(0, ...spec.edges.map((e) => (e.label ? textWidth(e.label, FONT_H.pill, 500) + 24 : 0)));
  const gap = Math.min(150, Math.max(n <= 3 ? 72 : 44, labelWidth + 16));
  const w = Math.min(232, Math.floor((960 - MARGIN * 2 - gap * (perRow - 1)) / perRow));
  const h = stackHeight(spec, w);
  const rowGap = 96;
  const rowIndex = new Map(spec.nodes.map((item, i) => [item.id, i]));
  const aboveCount = spec.edges.filter((e) => {
    const ai = rowIndex.get(e.from) ?? 0;
    const bi = rowIndex.get(e.to) ?? 0;
    return Math.floor(ai / perRow) === 0 && Math.floor(bi / perRow) === 0 && Math.abs(ai - bi) > 1;
  }).length;
  const top = 64 + aboveCount * 12;
  const rowWidth = perRow * w + (perRow - 1) * gap;
  const left = (960 - rowWidth) / 2;

  const nodes: SceneNode[] = spec.nodes.map((item, i) => {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const inRow = row === rows - 1 ? n - perRow * (rows - 1) : perRow;
    const rowLeft = left + ((perRow - inRow) * (w + gap)) / 2;
    return {
      id: item.id,
      x: rowLeft + col * (w + gap),
      y: top + row * (h + rowGap),
      w,
      h,
      label: item.label,
      note: item.note,
      icon: item.icon,
      layout: 'stack',
      reveal: Math.min(9, i),
    };
  });
  const index = new Map(nodes.map((node, i) => [node.id, i]));
  const rowOf = (i: number) => Math.floor(i / perRow);

  let aboveLane = 0;
  let belowLane = 0;
  const pills: ScenePill[] = [];
  const edges: SceneEdge[] = spec.edges.map((e, k) => {
    const ai = index.get(e.from) ?? 0;
    const bi = index.get(e.to) ?? 0;
    const a = nodes[ai] as SceneNode;
    const b = nodes[bi] as SceneNode;
    const id = `e${k}`;
    let d: string;
    let mid: { x: number; y: number };
    if (rowOf(ai) === rowOf(bi) && Math.abs(ai - bi) === 1) {
      const forward = bi > ai;
      const p1 = anchor(a, forward ? 'r' : 'l', 0.5);
      const p2 = anchor(b, forward ? 'l' : 'r', 0.5);
      d = line(p1, p2);
      mid = { x: (p1.x + p2.x) / 2, y: p1.y };
    } else if (rowOf(ai) === rowOf(bi)) {
      const first = rowOf(ai) === 0;
      const lane = first ? aboveLane++ : belowLane++;
      const side = first ? 't' : 'b';
      const y = first ? a.y - 22 - lane * 12 : a.y + a.h + 22 + lane * 12;
      const p1 = anchor(a, side, bi > ai ? 0.62 : 0.38, 0);
      const p2 = anchor(b, side, bi > ai ? 0.38 : 0.62, 6);
      d = ortho(p1, p2, 'v', y, 12);
      mid = { x: (p1.x + p2.x) / 2, y };
    } else {
      const down = rowOf(bi) > rowOf(ai);
      const p1 = anchor(a, down ? 'b' : 't', 0.5, 0);
      const p2 = anchor(b, down ? 't' : 'b', 0.5, 6);
      const y = (Math.min(a.y, b.y) + Math.min(a.y, b.y) + h + rowGap + h) / 2;
      d = ortho(p1, p2, 'v', y, 14);
      mid = { x: (p1.x + p2.x) / 2, y };
    }
    const pill = edgeLabelPill(id, e.label, mid.x, mid.y, Math.min(9, Math.max(ai, bi)));
    if (pill) pills.push(pill);
    return { id, d, reveal: Math.min(9, Math.max(ai, bi)), packets: packetsFor(k) };
  });

  const bottom = top + rows * h + (rows - 1) * rowGap;
  return {
    w: 960,
    h: bottom + 24 + (belowLane ? 22 + belowLane * 12 : 0) + 16,
    font: FONT_H,
    nodes,
    edges,
    pills,
  };
}

function vertical(spec: FlowDiagramSpec): Scene {
  const x = 32;
  const w = 256;
  const gap = 44;
  const textW = w - 14 - (spec.nodes.some((n) => n.icon) ? 34 + 12 : 0) - 14;
  let y = 24;
  const nodes: SceneNode[] = spec.nodes.map((item, i) => {
    const label = wrapText(item.label, textW, FONT_V.label, item.note ? 1 : 2).length;
    const note = item.note ? wrapText(item.note, textW, FONT_V.note, 2, 400).length : 0;
    const h = Math.max(58, Math.ceil(label * FONT_V.label * 1.25 + (note ? 2 + note * FONT_V.note * 1.4 : 0) + 28));
    const node: SceneNode = { id: item.id, x, y, w, h, label: item.label, note: item.note, icon: item.icon, layout: 'row', reveal: Math.min(9, i * 2) };
    y += h + gap;
    return node;
  });
  const index = new Map(nodes.map((node, i) => [node.id, i]));
  let lane = 0;
  const pills: ScenePill[] = [];
  const edges: SceneEdge[] = spec.edges.map((e, k) => {
    const ai = index.get(e.from) ?? 0;
    const bi = index.get(e.to) ?? 0;
    const a = nodes[ai] as SceneNode;
    const b = nodes[bi] as SceneNode;
    const id = `e${k}`;
    let d: string;
    if (Math.abs(ai - bi) === 1) {
      const forward = bi > ai;
      const p1 = anchor(a, forward ? 'b' : 't', forward ? 0.5 : 0.7);
      const p2 = anchor(b, forward ? 't' : 'b', forward ? 0.5 : 0.7);
      d = line(p1, p2);
      const pill = edgeLabelPill(id, e.label, x + w / 2 + 70, (p1.y + p2.y) / 2, Math.min(9, Math.max(ai, bi) * 2));
      if (pill) pills.push(pill);
    } else {
      const laneX = Math.min(350, 306 + lane++ * 12);
      d = ortho(anchor(a, 'r', 0.5, 0), anchor(b, 'r', 0.5, 6), 'h', laneX, 12);
    }
    return { id, d, reveal: Math.min(9, Math.max(ai, bi) * 2), packets: packetsFor(k) };
  });
  return { w: 360, h: y - gap + 24, font: FONT_V, nodes, edges, pills };
}

export function buildFlow(spec: FlowDiagramSpec): BuiltDiagram {
  const labels = spec.nodes.map((n) => n.label);
  const links = spec.edges
    .filter((e) => {
      const from = spec.nodes.findIndex((n) => n.id === e.from);
      const to = spec.nodes.findIndex((n) => n.id === e.to);
      return to !== from + 1;
    })
    .map((e) => {
      const from = spec.nodes.find((n) => n.id === e.from)?.label ?? e.from;
      const to = spec.nodes.find((n) => n.id === e.to)?.label ?? e.to;
      return `${from} → ${to}${e.label ? ` (${e.label})` : ''}`;
    });
  return {
    h: horizontal(spec),
    v: vertical(spec),
    summary: `${sequence(labels)}.${links.length ? ` ${links.join('; ')}.` : ''}`,
    interactive: false,
  };
}
