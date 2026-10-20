/**
 * offline-sync: sales queue on the counter while the internet is down, then
 * sync to the Nafaa cloud and on to the other branch.
 *
 * Loop (8 s): sales travel into the queue under "Offline", then the queue
 * drains to the cloud and the branch under "Synced". The static state shows
 * both pills, a full queue and every link.
 */
import styles from '../diagrams.module.css';
import { anchor, elbow, line } from '../lib/geometry';
import { sequence } from '../lib/text';
import { FONT_H, FONT_V, type Scene } from '../lib/types';
import { cx } from '../parts/classes';
import { byId, L, node, type BespokeDiagram, type Labels } from './shared';

const QUEUE_ITEMS = [styles.osItem0, styles.osItem1, styles.osItem2];

function horizontal(l: Labels): Scene {
  const nodes = [
    node('device', 40, 200, 184, 68, L(l, 'device'), { icon: 'monitor', reveal: 0 }),
    node('queue', 300, 200, 184, 68, L(l, 'queue'), { icon: 'database', tone: 'warn', reveal: 1 }),
    node('cloud', 556, 64, 200, 68, L(l, 'cloud'), { icon: 'nafaa', tone: 'brand', reveal: 2 }),
    node('branch', 736, 200, 184, 68, L(l, 'branch'), { icon: 'store', reveal: 3 }),
  ];
  const device = byId(nodes, 'device');
  const queue = byId(nodes, 'queue');
  const cloud = byId(nodes, 'cloud');
  const branch = byId(nodes, 'branch');
  const sync = elbow(anchor(queue, 't', 0.5), anchor(cloud, 'l', 0.5), 'v', 18);
  const share = elbow(anchor(cloud, 'r', 0.5), anchor(branch, 't', 0.5), 'h', 18);
  return {
    w: 960,
    h: 340,
    font: FONT_H,
    nodes,
    edges: [
      {
        id: 'sale',
        d: line(anchor(device, 'r'), anchor(queue, 'l')),
        tone: 'warn',
        reveal: 1,
        packets: [1, 3, 5].map((delay) => ({ delay, tone: 'warn' as const })),
      },
      { id: 'sync', d: sync, tone: 'brand', reveal: 2, packets: [11, 13, 15].map((delay) => ({ delay, tone: 'brand' as const })) },
      { id: 'share', d: share, tone: 'brand', reveal: 3, packets: [14, 16, 18].map((delay) => ({ delay, tone: 'brand' as const })) },
    ],
    pills: [
      { id: 'offline', x: 262, y: 166, text: L(l, 'offline'), icon: 'wifi-off', tone: 'warn', reveal: 1, className: styles.osOffline },
      { id: 'synced', x: 392, y: 132, text: L(l, 'synced'), icon: 'refresh-cw', tone: 'brand', reveal: 2, className: styles.osOnline },
    ],
    under: (
      <g aria-hidden="true" className={cx(styles.rise, styles.r2)}>
        {QUEUE_ITEMS.map((cls, i) => (
          <rect key={i} x={queue.x + 20 + i * 8} y={queue.y + queue.h + 14 + i * 13} width={queue.w - 40 - i * 16} height={8} rx={4} className={cx(styles.queueItem, cls)} />
        ))}
      </g>
    ),
  };
}

function vertical(l: Labels): Scene {
  const nodes = [
    node('device', 40, 28, 280, 60, L(l, 'device'), { icon: 'monitor', reveal: 0 }),
    node('queue', 40, 160, 280, 60, L(l, 'queue'), { icon: 'database', tone: 'warn', reveal: 2 }),
    node('cloud', 40, 304, 280, 60, L(l, 'cloud'), { icon: 'nafaa', tone: 'brand', reveal: 4 }),
    node('branch', 40, 436, 280, 60, L(l, 'branch'), { icon: 'store', reveal: 6 }),
  ];
  const device = byId(nodes, 'device');
  const queue = byId(nodes, 'queue');
  const cloud = byId(nodes, 'cloud');
  const branch = byId(nodes, 'branch');
  return {
    w: 360,
    h: 524,
    font: FONT_V,
    nodes,
    edges: [
      { id: 'sale', d: line(anchor(device, 'b'), anchor(queue, 't')), tone: 'warn', reveal: 1, packets: [1, 3, 5].map((delay) => ({ delay, tone: 'warn' as const })) },
      { id: 'sync', d: line(anchor(queue, 'b'), anchor(cloud, 't')), tone: 'brand', reveal: 3, packets: [11, 13, 15].map((delay) => ({ delay, tone: 'brand' as const })) },
      { id: 'share', d: line(anchor(cloud, 'b'), anchor(branch, 't')), tone: 'brand', reveal: 5, packets: [14, 16, 18].map((delay) => ({ delay, tone: 'brand' as const })) },
    ],
    pills: [
      { id: 'offline', x: 180, y: 124, text: L(l, 'offline'), icon: 'wifi-off', tone: 'warn', reveal: 1, className: styles.osOffline },
      { id: 'synced', x: 180, y: 262, text: L(l, 'synced'), icon: 'refresh-cw', tone: 'brand', reveal: 3, className: styles.osOnline },
    ],
    over: (
      <g aria-hidden="true">
        {QUEUE_ITEMS.map((cls, i) => (
          <rect key={i} x={queue.x + queue.w - 22 - i * 9} y={queue.y + 16} width={5} height={28} rx={2.5} className={cx(styles.queueItem, cls)} />
        ))}
      </g>
    ),
  };
}

export const offlineSync: BespokeDiagram = {
  rootClass: styles.os,
  build: (labels, o) => (o === 'h' ? horizontal(labels) : vertical(labels)),
  summary: (l) =>
    `${L(l, 'offline')}: ${sequence([L(l, 'device'), L(l, 'queue')])}. ${L(l, 'synced')}: ${sequence([L(l, 'queue'), L(l, 'cloud'), L(l, 'branch')])}.`,
};
