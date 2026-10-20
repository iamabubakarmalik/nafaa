/**
 * store-sync: Nafaa pushes stock to Shopify, the online store and Nafaa
 * Bazaar, and their orders flow back into Nafaa.
 */
import { anchor, curve } from '../lib/geometry';
import { FONT_H, FONT_V, type Scene, type SceneEdge } from '../lib/types';
import { byId, L, node, type BespokeDiagram, type Labels } from './shared';

const STORES = [
  { key: 'shopify', icon: 'shopping-bag' },
  { key: 'website', icon: 'globe' },
  { key: 'bazaar', icon: 'store' },
] as const;

function horizontal(l: Labels): Scene {
  const nodes = [
    node('nafaa', 48, 160, 208, 76, L(l, 'nafaa'), { icon: 'nafaa', tone: 'brand', reveal: 0 }),
    ...STORES.map((s, i) => node(s.key, 704, 36 + i * 128, 208, 68, L(l, s.key), { icon: s.icon, reveal: 2 + i })),
  ];
  const hub = byId(nodes, 'nafaa');
  const edges: SceneEdge[] = [];
  STORES.forEach((s, i) => {
    const store = byId(nodes, s.key);
    edges.push({
      id: `stock-${s.key}`,
      d: curve(anchor(hub, 'r', 0.36), anchor(store, 'l', 0.34)),
      tone: 'brand',
      reveal: 1 + i,
      packets: [{ delay: i, tone: 'brand' }],
    });
    edges.push({
      id: `orders-${s.key}`,
      d: curve(anchor(store, 'l', 0.66, 0), anchor(hub, 'r', 0.64)),
      tone: 'info',
      reveal: 2 + i,
      packets: [{ delay: 6 + i, tone: 'info' }],
    });
  });
  return {
    w: 960,
    h: 400,
    font: FONT_H,
    nodes,
    edges,
    pills: [
      { id: 'stock', x: 476, y: 112, text: L(l, 'stock'), icon: 'package', tone: 'brand', reveal: 2 },
      { id: 'orders', x: 476, y: 292, text: L(l, 'orders'), icon: 'shopping-cart', tone: 'info', reveal: 3 },
    ],
    pings: [{ node: 'nafaa', delay: 9 }],
  };
}

function vertical(l: Labels): Scene {
  const w = 104;
  const nodes = [
    node('nafaa', 64, 24, 232, 68, L(l, 'nafaa'), { icon: 'nafaa', tone: 'brand', reveal: 0 }),
    ...STORES.map((s, i) => node(s.key, 12 + i * (w + 12), 300, w, 112, L(l, s.key), { icon: s.icon, layout: 'stack' as const, reveal: 3 + i })),
  ];
  const hub = byId(nodes, 'nafaa');
  const edges: SceneEdge[] = [];
  STORES.forEach((s, i) => {
    const store = byId(nodes, s.key);
    edges.push({
      id: `stock-${s.key}`,
      d: curve(anchor(hub, 'b', 0.3 + i * 0.12), anchor(store, 't', 0.32), 'v'),
      tone: 'brand',
      reveal: 1 + i,
      packets: [{ delay: i, tone: 'brand' }],
    });
    edges.push({
      id: `orders-${s.key}`,
      d: curve(anchor(store, 't', 0.68, 0), anchor(hub, 'b', 0.46 + i * 0.12), 'v'),
      tone: 'info',
      reveal: 2 + i,
      packets: [{ delay: 6 + i, tone: 'info' }],
    });
  });
  return {
    w: 360,
    h: 436,
    font: FONT_V,
    nodes,
    edges,
    pills: [
      { id: 'stock', x: 96, y: 196, text: L(l, 'stock'), icon: 'package', tone: 'brand', reveal: 2 },
      { id: 'orders', x: 264, y: 196, text: L(l, 'orders'), icon: 'shopping-cart', tone: 'info', reveal: 3 },
    ],
    pings: [{ node: 'nafaa', delay: 9 }],
  };
}

export const storeSync: BespokeDiagram = {
  build: (labels, o) => (o === 'h' ? horizontal(labels) : vertical(labels)),
  summary: (l) => {
    const stores = STORES.map((s) => L(l, s.key)).join(', ');
    return `${L(l, 'stock')}: ${L(l, 'nafaa')} → ${stores}. ${L(l, 'orders')}: ${stores} → ${L(l, 'nafaa')}.`;
  },
};
