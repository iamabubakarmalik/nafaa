/** Labels, colors and text helpers shared by the staff report's views. */

import type { AlertKind, HoursSource, StaffAlert } from '../api';

// Order checked for colour-blind separation of neighbours; series keep their slot by rank in the period.
export const PALETTE = ['#2563eb', '#d97706', '#7c3aed', '#16a34a', '#db2777', '#0891b2', '#ea580c', '#65a30d', '#64748b', '#9333ea'];
export const OTHERS_COLOR = '#94a3b8';
export const WEEKDAYS = ['Itwar', 'Peer', 'Mangal', 'Budh', 'Jumeraat', 'Juma', 'Hafta'];

export const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Malik', MANAGER: 'Manager', CASHIER: 'Cashier', STAFF: 'Staff',
};

export const HOURS_SOURCE: Record<Exclude<HoursSource, null>, string> = {
  attendance: 'Haziri se',
  shift: 'Galla shift se',
  active: 'Sale wale ghante',
};

export const qtyText = (n: number) => Number(n.toFixed(2)).toLocaleString('en-PK');
export const pct = (n: number) => `${n.toFixed(1)}%`;
export const hoursText = (h: number) => (h >= 1 ? `${Number(h.toFixed(1))} ghante` : `${Math.round(h * 60)} min`);

export const dateText = (v: string) => new Date(v).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
export const when = (v: string) => new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(v));
export const timeText = (v: string) => new Intl.DateTimeFormat('en-PK', { hour: 'numeric', minute: '2-digit' }).format(new Date(v));
export const hourLabel = (h: number) => `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`;

/** "2026-10-04" → "4 Oct", "2026-10" → "Oct 26". */
export const keyLabel = (k: string) =>
  k.length === 7
    ? new Date(`${k}-15T12:00:00`).toLocaleDateString('en-PK', { month: 'short', year: '2-digit' })
    : new Date(`${k}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });

export const ALERT_TITLE: Record<AlertKind, string> = {
  discount: 'Discount zyada',
  void: 'Bill cancel zyada',
  return: 'Return zyada',
  credit: 'Udhaar zyada',
  short: 'Galla kam nikla',
  pin: 'Ghalat PIN',
};

/** One line explaining an alert against the team. */
export function alertText(a: StaffAlert, money: (n: number) => string) {
  switch (a.kind) {
    case 'discount': return `${a.count} bill par ${pct(a.value)} discount di — team ki ausat ${pct(a.team)}`;
    case 'void': return `${a.count} bill cancel hue (${pct(a.value)}) — team ki ausat ${pct(a.team)}`;
    case 'return': return `${a.count} bill par maal wapas aaya, sale ka ${pct(a.value)} — team ${pct(a.team)}`;
    case 'credit': return `${a.count} bill udhaar par, sale ka ${pct(a.value)} — team ${pct(a.team)}`;
    case 'short': return `Galla ${a.count} dafa kam nikla, kul ${money(a.value)} kam`;
    case 'pin': return `${a.count} dafa ghalat PIN dala`;
    default: return '';
  }
}
