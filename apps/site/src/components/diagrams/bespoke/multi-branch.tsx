/**
 * multi-branch: head office stock feeds three branches, and branches move
 * stock between each other.
 */
import { anchor, curve, ortho } from '../lib/geometry';
import { FONT_H, FONT_V, type Scene } from '../lib/types';
import { byId, L, node, type BespokeDiagram, type Labels } from './shared';

const BRANCHES = ['branchA', 'branchB', 'branchC'] as const;

function horizontal(l: Labels): Scene {
  const nodes = [
    node('hq', 48, 148, 216, 76, L(l, 'hq'), { icon: 'building-2', tone: 'info', reveal: 0 }),
    ...BRANCHES.map((key, i) => node(key, 648, 36 + i * 116, 216, 64, L(l, key), { icon: 'store', reveal: 2 + i })),
  ];
  const hq = byId(nodes, 'hq');
  const [a, b, c] = BRANCHES.map((key) => byId(nodes, key));
  if (!a || !b || !c) throw new Error('multi-branch: branches missing');
  return {
    w: 960,
    h: 344,
    font: FONT_H,
    nodes,
    edges: [
      ...[a, b, c].map((br, i) => ({
        id: `hq-${br.id}`,
        d: curve(anchor(hq, 'r', 0.3 + i * 0.2), anchor(br, 'l')),
        tone: 'brand' as const,
        reveal: 1 + i,
        packets: [{ delay: i * 2, tone: 'brand' as const }],
      })),
      {
        id: 'a-b',
        d: ortho(anchor(a, 'r', 0.5, 4), anchor(b, 'r', 0.5, 6), 'h', 908, 16),
        reveal: 5,
        packets: [{ delay: 7 }],
      },
      {
        id: 'c-b',
        d: ortho(anchor(c, 'r', 0.5, 4), anchor(b, 'r', 0.5, 6), 'h', 908, 16),
        reveal: 5,
        packets: [{ delay: 10 }],
      },
    ],
    pills: [{ id: 'transfer', x: 456, y: 186, text: L(l, 'transfer'), icon: 'arrow-left-right', tone: 'brand', reveal: 3 }],
    pings: [
      { node: 'branchA', delay: 3 },
      { node: 'branchB', delay: 5 },
      { node: 'branchC', delay: 7 },
    ],
  };
}

function vertical(l: Labels): Scene {
  const nodes = [
    node('hq', 64, 24, 232, 68, L(l, 'hq'), { icon: 'building-2', tone: 'info', reveal: 0 }),
    ...BRANCHES.map((key, i) => node(key, 64, 176 + i * 92, 232, 58, L(l, key), { icon: 'store', reveal: 3 + i * 2 })),
  ];
  const hq = byId(nodes, 'hq');
  const [a, b, c] = BRANCHES.map((key) => byId(nodes, key));
  if (!a || !b || !c) throw new Error('multi-branch: branches missing');
  return {
    w: 360,
    h: 460,
    font: FONT_V,
    nodes,
    edges: [
      ...[a, b, c].map((br, i) => ({
        id: `hq-${br.id}`,
        d: ortho(anchor(hq, 'l', 0.5, 0), anchor(br, 'l'), 'h', 30, 14),
        tone: 'brand' as const,
        reveal: 2 + i * 2,
        packets: [{ delay: i * 2, tone: 'brand' as const }],
      })),
      { id: 'a-b', d: ortho(anchor(a, 'r', 0.5, 4), anchor(b, 'r', 0.5, 6), 'h', 326, 14), reveal: 6, packets: [{ delay: 7 }] },
      { id: 'c-b', d: ortho(anchor(c, 'r', 0.5, 4), anchor(b, 'r', 0.5, 6), 'h', 326, 14), reveal: 7, packets: [{ delay: 10 }] },
    ],
    pills: [{ id: 'transfer', x: 180, y: 134, text: L(l, 'transfer'), icon: 'arrow-left-right', tone: 'brand', reveal: 1 }],
    pings: [
      { node: 'branchA', delay: 3 },
      { node: 'branchB', delay: 5 },
      { node: 'branchC', delay: 7 },
    ],
  };
}

export const multiBranch: BespokeDiagram = {
  build: (labels, o) => (o === 'h' ? horizontal(labels) : vertical(labels)),
  summary: (l) =>
    `${L(l, 'hq')} → ${[L(l, 'branchA'), L(l, 'branchB'), L(l, 'branchC')].join(', ')}. ${L(l, 'transfer')}: ${L(l, 'branchA')} ↔ ${L(l, 'branchB')} ↔ ${L(l, 'branchC')}.`,
};
