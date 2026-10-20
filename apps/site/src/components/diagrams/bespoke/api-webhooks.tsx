/**
 * api-webhooks: your app calls API v1, Nafaa answers, and Nafaa pushes
 * events back to your app through webhooks.
 */
import { anchor, elbow, line, ortho } from '../lib/geometry';
import { FONT_H, FONT_V, type Scene } from '../lib/types';
import { byId, L, node, type BespokeDiagram, type Labels } from './shared';

function horizontal(l: Labels): Scene {
  const nodes = [
    node('app', 40, 96, 200, 72, L(l, 'app'), { icon: 'code-xml', reveal: 0 }),
    node('api', 380, 96, 200, 72, L(l, 'api'), { icon: 'braces', reveal: 1 }),
    node('nafaa', 720, 96, 200, 72, L(l, 'nafaa'), { icon: 'nafaa', tone: 'brand', reveal: 2 }),
    node('webhooks', 380, 236, 200, 60, L(l, 'webhooks'), { icon: 'webhook', tone: 'info', reveal: 3 }),
  ];
  const app = byId(nodes, 'app');
  const api = byId(nodes, 'api');
  const nafaa = byId(nodes, 'nafaa');
  const hooks = byId(nodes, 'webhooks');
  return {
    w: 960,
    h: 328,
    font: FONT_H,
    nodes,
    edges: [
      { id: 'req-1', d: line(anchor(app, 'r', 0.38), anchor(api, 'l', 0.38)), reveal: 1, packets: [{ delay: 0 }] },
      { id: 'req-2', d: line(anchor(api, 'r', 0.38), anchor(nafaa, 'l', 0.38)), reveal: 2, packets: [{ delay: 3 }] },
      { id: 'res-1', d: line(anchor(nafaa, 'l', 0.62), anchor(api, 'r', 0.62)), tone: 'brand', reveal: 2, packets: [{ delay: 6, tone: 'brand' }] },
      { id: 'res-2', d: line(anchor(api, 'l', 0.62), anchor(app, 'r', 0.62)), tone: 'brand', reveal: 1, packets: [{ delay: 9, tone: 'brand' }] },
      { id: 'hook-1', d: elbow(anchor(nafaa, 'b', 0.5, 0), anchor(hooks, 'r'), 'v', 18), tone: 'info', reveal: 3, packets: [{ delay: 8, tone: 'info' }] },
      { id: 'hook-2', d: elbow(anchor(hooks, 'l', 0.5, 0), anchor(app, 'b'), 'h', 18), tone: 'info', reveal: 4, packets: [{ delay: 11, tone: 'info' }] },
    ],
    pings: [
      { node: 'nafaa', delay: 6 },
      { node: 'app', delay: 12 },
    ],
  };
}

function vertical(l: Labels): Scene {
  const nodes = [
    node('app', 40, 24, 232, 64, L(l, 'app'), { icon: 'code-xml', reveal: 0 }),
    node('api', 40, 156, 232, 64, L(l, 'api'), { icon: 'braces', reveal: 2 }),
    node('nafaa', 40, 288, 232, 64, L(l, 'nafaa'), { icon: 'nafaa', tone: 'brand', reveal: 4 }),
    node('webhooks', 40, 420, 232, 58, L(l, 'webhooks'), { icon: 'webhook', tone: 'info', reveal: 6 }),
  ];
  const app = byId(nodes, 'app');
  const api = byId(nodes, 'api');
  const nafaa = byId(nodes, 'nafaa');
  const hooks = byId(nodes, 'webhooks');
  return {
    w: 360,
    h: 504,
    font: FONT_V,
    nodes,
    edges: [
      { id: 'req-1', d: line(anchor(app, 'b', 0.38), anchor(api, 't', 0.38)), reveal: 1, packets: [{ delay: 0 }] },
      { id: 'req-2', d: line(anchor(api, 'b', 0.38), anchor(nafaa, 't', 0.38)), reveal: 3, packets: [{ delay: 3 }] },
      { id: 'res-1', d: line(anchor(nafaa, 't', 0.62), anchor(api, 'b', 0.62)), tone: 'brand', reveal: 3, packets: [{ delay: 6, tone: 'brand' }] },
      { id: 'res-2', d: line(anchor(api, 't', 0.62), anchor(app, 'b', 0.62)), tone: 'brand', reveal: 1, packets: [{ delay: 9, tone: 'brand' }] },
      { id: 'hook-1', d: line(anchor(nafaa, 'b', 0.5, 0), anchor(hooks, 't')), tone: 'info', reveal: 5, packets: [{ delay: 8, tone: 'info' }] },
      { id: 'hook-2', d: ortho(anchor(hooks, 'r', 0.5, 0), anchor(app, 'r'), 'h', 318, 16), tone: 'info', reveal: 7, packets: [{ delay: 11, tone: 'info' }] },
    ],
    pings: [
      { node: 'nafaa', delay: 6 },
      { node: 'app', delay: 12 },
    ],
  };
}

export const apiWebhooks: BespokeDiagram = {
  build: (labels, o) => (o === 'h' ? horizontal(labels) : vertical(labels)),
  summary: (l) =>
    `${L(l, 'app')} ↔ ${L(l, 'api')} ↔ ${L(l, 'nafaa')}. ${L(l, 'webhooks')}: ${L(l, 'nafaa')} → ${L(l, 'app')}.`,
};
