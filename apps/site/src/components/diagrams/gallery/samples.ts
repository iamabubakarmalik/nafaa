/**
 * Sample specs for the _dev gallery. Dev-only data: none of it is published
 * and none of it is a claim about Nafaa. Labels marked "Roman Urdu" test
 * longer editor text and wrapping.
 */
import { BESPOKE_DIAGRAM_KINDS, type DiagramSpec } from '../../../lib/cms/contract/cms-contract';

export interface DiagramSample {
  id: string;
  title: string;
  caption: string;
  spec: DiagramSpec;
  tone?: 'default' | 'muted' | 'ink';
}

const bespoke: DiagramSample[] = BESPOKE_DIAGRAM_KINDS.map((kind) => ({
  id: kind,
  title: kind,
  caption: `The ${kind} diagram with its default labels.`,
  spec: { kind },
}));

export const DIAGRAM_SAMPLES: DiagramSample[] = [
  ...bespoke,
  {
    id: 'khata-cycle-ur',
    title: 'khata-cycle (Roman Urdu labels)',
    caption: 'Udhaar se wapsi tak: har qadam khud hota hai.',
    spec: {
      kind: 'khata-cycle',
      labels: { sale: 'Udhaar par sauda', reminder: 'WhatsApp par yaad-dihani', payment: 'Raqam wapas mili', balance: 'Khata khud update' },
    },
  },
  {
    id: 'offline-sync-ink',
    title: 'offline-sync on an ink band',
    caption: 'The same diagram on a dark section.',
    spec: { kind: 'offline-sync' },
    tone: 'ink',
  },
  {
    id: 'store-sync-static',
    title: 'store-sync with animate: false',
    caption: 'A static diagram: no draw-in, no loops.',
    spec: { kind: 'store-sync', animate: false },
  },
  {
    id: 'flow-4',
    title: 'flow, 4 nodes',
    caption: 'A data-driven flow in one row.',
    spec: {
      kind: 'flow',
      nodes: [
        { id: 'scan', label: 'Scan item', icon: 'scan-barcode', note: 'Barcode or product search' },
        { id: 'cart', label: 'Cart', icon: 'shopping-cart' },
        { id: 'pay', label: 'Payment', icon: 'wallet', note: 'Cash, card or wallet' },
        { id: 'print', label: 'Print receipt', icon: 'printer' },
      ],
      edges: [
        { from: 'scan', to: 'cart' },
        { from: 'cart', to: 'pay', label: 'checkout' },
        { from: 'pay', to: 'print' },
      ],
    },
  },
  {
    id: 'flow-7',
    title: 'flow, 7 nodes with a skip edge',
    caption: 'Two rows; one edge skips a step.',
    spec: {
      kind: 'flow',
      nodes: [
        { id: 'a', label: 'Supplier', icon: 'truck' },
        { id: 'b', label: 'Purchase order', icon: 'clipboard-list' },
        { id: 'c', label: 'Goods received', icon: 'package-check' },
        { id: 'd', label: 'Stock', icon: 'boxes' },
        { id: 'e', label: 'Sale', icon: 'shopping-bag' },
        { id: 'f', label: 'Reorder alert', icon: 'bell-ring' },
        { id: 'g', label: 'Reports', icon: 'chart-column' },
      ],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
        { from: 'c', to: 'd' },
        { from: 'd', to: 'e' },
        { from: 'e', to: 'f' },
        { from: 'f', to: 'g' },
        { from: 'a', to: 'c', label: 'direct delivery' },
      ],
    },
  },
  {
    id: 'hub-6',
    title: 'hub, 6 spokes with links',
    caption: 'Spokes with links become focusable.',
    spec: {
      kind: 'hub',
      center: { label: 'Nafaa POS', icon: 'store' },
      spokes: [
        { label: 'Billing', icon: 'receipt', href: '/product/billing' },
        { label: 'Inventory', icon: 'boxes', href: '/product/inventory' },
        { label: 'Khata', icon: 'notebook-pen', href: '/product/khata' },
        { label: 'Reports', icon: 'chart-column' },
        { label: 'Staff', icon: 'users' },
        { label: 'Branches', icon: 'building-2' },
      ],
    },
  },
  {
    id: 'hub-5',
    title: 'hub, 5 spokes',
    caption: 'Odd spoke count.',
    spec: {
      kind: 'hub',
      center: { label: 'Your shop' },
      spokes: [
        { label: 'Counter', icon: 'monitor' },
        { label: 'Mobile app', icon: 'smartphone' },
        { label: 'Printer', icon: 'printer' },
        { label: 'Barcode scanner', icon: 'scan-barcode' },
        { label: 'Cash drawer', icon: 'banknote' },
      ],
    },
  },
  {
    id: 'timeline-4',
    title: 'timeline, 4 items',
    caption: 'Dates are sample text.',
    spec: {
      kind: 'timeline',
      items: [
        { date: 'Day 1', label: 'Sign up', note: 'Create the shop and pick the industry.' },
        { date: 'Day 1', label: 'Add products', note: 'Import a sheet or scan barcodes.' },
        { date: 'Day 2', label: 'First sale', note: 'Bill at the counter, online or offline.' },
        { date: 'Week 1', label: 'Read the reports' },
      ],
    },
  },
];
