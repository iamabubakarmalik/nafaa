/**
 * khata-cycle: udhaar sale, WhatsApp reminder, payment, balance updated,
 * and round again. The ledger card in the middle shows the balance bar
 * dropping when the payment lands.
 */
import styles from '../diagrams.module.css';
import { anchor, line, ortho, swing } from '../lib/geometry';
import { sequence } from '../lib/text';
import { FONT_H, FONT_V, type Scene } from '../lib/types';
import { cx } from '../parts/classes';
import { byId, L, node, type BespokeDiagram, type Labels } from './shared';

/** Ledger card: header, three entry rows, the balance bar and a check. */
function Ledger({ x, y }: { x: number; y: number }) {
  const w = 168;
  const h = 124;
  return (
    <g aria-hidden="true" className={cx(styles.rise, styles.r4)}>
      <rect x={x} y={y + 2} width={w} height={h} rx={14} className={styles.nodeShadow} />
      <rect x={x} y={y} width={w} height={h} rx={14} className={styles.paper} />
      <rect x={x + 16} y={y + 16} width={64} height={7} rx={3.5} className={styles.inkLineStrong} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <circle cx={x + 21} cy={y + 42 + i * 15} r={4} className={styles.inkLine} />
          <rect x={x + 32} y={y + 40 + i * 15} width={64 - i * 10} height={4} rx={2} className={styles.inkLine} />
          <rect x={x + w - 44} y={y + 40 + i * 15} width={28} height={4} rx={2} className={styles.inkLine} />
        </g>
      ))}
      <rect x={x + 16} y={y + h - 26} width={w - 56} height={8} rx={4} className={styles.barTrack} />
      <rect x={x + 16} y={y + h - 26} width={w - 56} height={8} rx={4} className={cx(styles.barFill, styles.khBar)} />
      <path d={`M${x + w - 32} ${y + h - 22}l5 5l9 -10`} className={cx(styles.check, styles.khCheck)} />
    </g>
  );
}

function horizontal(l: Labels): Scene {
  const w = 208;
  const h = 64;
  const nodes = [
    node('sale', 480 - w / 2, 28, w, h, L(l, 'sale'), { icon: 'shopping-bag', reveal: 0 }),
    node('reminder', 712, 176, w, h, L(l, 'reminder'), { icon: 'message-circle', reveal: 1 }),
    node('payment', 480 - w / 2, 324, w, h, L(l, 'payment'), { icon: 'hand-coins', tone: 'brand', reveal: 2 }),
    node('balance', 40, 176, w, h, L(l, 'balance'), { icon: 'notebook-pen', reveal: 3 }),
  ];
  const sale = byId(nodes, 'sale');
  const reminder = byId(nodes, 'reminder');
  const payment = byId(nodes, 'payment');
  const balance = byId(nodes, 'balance');
  return {
    w: 960,
    h: 416,
    font: FONT_H,
    nodes,
    edges: [
      { id: 'remind', d: swing(anchor(sale, 'r'), anchor(reminder, 't'), 'h'), reveal: 1, packets: [{ delay: 0 }] },
      { id: 'pay', d: swing(anchor(reminder, 'b'), anchor(payment, 'r'), 'v'), reveal: 2, packets: [{ delay: 3 }] },
      { id: 'record', d: swing(anchor(payment, 'l'), anchor(balance, 'b'), 'h'), tone: 'brand', reveal: 3, packets: [{ delay: 6, tone: 'brand' }] },
      { id: 'next', d: swing(anchor(balance, 't'), anchor(sale, 'l'), 'v'), reveal: 4, packets: [{ delay: 9 }] },
    ],
    pings: [
      { node: 'reminder', delay: 3 },
      { node: 'payment', delay: 6 },
      { node: 'balance', delay: 9 },
      { node: 'sale', delay: 12 },
    ],
    over: <Ledger x={480 - 84} y={146} />,
  };
}

function vertical(l: Labels): Scene {
  const x = 40;
  const w = 256;
  const h = 58;
  const nodes = [
    node('sale', x, 28, w, h, L(l, 'sale'), { icon: 'shopping-bag', reveal: 0 }),
    node('reminder', x, 138, w, h, L(l, 'reminder'), { icon: 'message-circle', reveal: 2 }),
    node('payment', x, 248, w, h, L(l, 'payment'), { icon: 'hand-coins', tone: 'brand', reveal: 4 }),
    node('balance', x, 358, w, h, L(l, 'balance'), { icon: 'notebook-pen', reveal: 6 }),
  ];
  const sale = byId(nodes, 'sale');
  const reminder = byId(nodes, 'reminder');
  const payment = byId(nodes, 'payment');
  const balance = byId(nodes, 'balance');
  return {
    w: 360,
    h: 444,
    font: FONT_V,
    nodes,
    edges: [
      { id: 'remind', d: line(anchor(sale, 'b'), anchor(reminder, 't')), reveal: 1, packets: [{ delay: 0 }] },
      { id: 'pay', d: line(anchor(reminder, 'b'), anchor(payment, 't')), reveal: 3, packets: [{ delay: 3 }] },
      { id: 'record', d: line(anchor(payment, 'b'), anchor(balance, 't')), tone: 'brand', reveal: 5, packets: [{ delay: 6, tone: 'brand' }] },
      { id: 'next', d: ortho(anchor(balance, 'r', 0.5, 4), anchor(sale, 'r', 0.5, 6), 'h', 330), reveal: 7, packets: [{ delay: 9 }] },
    ],
    pings: [
      { node: 'reminder', delay: 3 },
      { node: 'payment', delay: 6 },
      { node: 'balance', delay: 9 },
      { node: 'sale', delay: 12 },
    ],
  };
}

export const khataCycle: BespokeDiagram = {
  build: (labels, o) => (o === 'h' ? horizontal(labels) : vertical(labels)),
  summary: (l) => `${sequence([L(l, 'sale'), L(l, 'reminder'), L(l, 'payment'), L(l, 'balance')])}, and the cycle repeats.`,
};
