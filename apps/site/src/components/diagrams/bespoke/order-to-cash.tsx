/**
 * order-to-cash: order booker, warehouse, dispatch, invoice, collection.
 * One packet walks the chain and each step lights up as it arrives.
 */
import { anchor, line } from '../lib/geometry';
import { sequence } from '../lib/text';
import { FONT_H, FONT_V, type Scene, type SceneNode } from '../lib/types';
import { L, node, type BespokeDiagram, type Labels } from './shared';

const STEPS = [
  { key: 'booker', icon: 'clipboard-list' },
  { key: 'warehouse', icon: 'warehouse' },
  { key: 'dispatch', icon: 'truck' },
  { key: 'invoice', icon: 'file-text' },
  { key: 'collection', icon: 'hand-coins' },
] as const;

const badge = (i: number) => String(i + 1).padStart(2, '0');

function chain(nodes: SceneNode[], o: 'h' | 'v'): Scene['edges'] {
  return nodes.slice(1).map((to, i) => {
    const from = nodes[i] as SceneNode;
    return {
      id: `${from.id}-${to.id}`,
      d: o === 'h' ? line(anchor(from, 'r'), anchor(to, 'l')) : line(anchor(from, 'b'), anchor(to, 't')),
      tone: i === nodes.length - 2 ? ('brand' as const) : undefined,
      reveal: Math.min(9, (o === 'h' ? 1 : 2) * (i + 1)),
      packets: [{ delay: i * 3, tone: i === nodes.length - 2 ? ('brand' as const) : undefined }],
    };
  });
}

function horizontal(l: Labels): Scene {
  const w = 152;
  const gap = 30;
  const nodes = STEPS.map((s, i) =>
    node(s.key, 40 + i * (w + gap), 64, w, 116, L(l, s.key), {
      icon: s.icon,
      layout: 'stack',
      badge: badge(i),
      tone: i === STEPS.length - 1 ? 'brand' : undefined,
      reveal: i,
    }),
  );
  return {
    w: 960,
    h: 216,
    font: FONT_H,
    nodes,
    edges: chain(nodes, 'h'),
    pings: nodes.map((n, i) => ({ node: n.id, delay: i * 3 })),
  };
}

function vertical(l: Labels): Scene {
  const nodes = STEPS.map((s, i) =>
    node(s.key, 40, 24 + i * 92, 280, 58, `${badge(i)}\u2002${L(l, s.key)}`, {
      icon: s.icon,
      tone: i === STEPS.length - 1 ? 'brand' : undefined,
      reveal: i * 2,
    }),
  );
  return {
    w: 360,
    h: 24 + 4 * 92 + 58 + 24,
    font: FONT_V,
    nodes,
    edges: chain(nodes, 'v'),
    pings: nodes.map((n, i) => ({ node: n.id, delay: i * 3 })),
  };
}

export const orderToCash: BespokeDiagram = {
  build: (labels, o) => (o === 'h' ? horizontal(labels) : vertical(labels)),
  summary: (l) => `${sequence(STEPS.map((s) => L(l, s.key)))}.`,
};
