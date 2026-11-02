/** Labels, colors and text helpers shared by the staff report's views. */

import type { AlertKind, HoursSource, StaffAlert } from '../api';
import { t } from '@core/i18n';

// Order checked for colour-blind separation of neighbours; series keep their slot by rank in the period.
export const PALETTE = ['#2563eb', '#d97706', '#7c3aed', '#16a34a', '#db2777', '#0891b2', '#ea580c', '#65a30d', '#64748b', '#9333ea'];
export const OTHERS_COLOR = '#94a3b8';
export const WEEKDAYS = [t('Itwar'), t('Peer'), t('Mangal'), t('Budh'), t('Jumeraat'), t('Juma'), t('Hafta')];

export const ROLE_LABEL: Record<string, string> = {
  OWNER: t('Malik'), MANAGER: t('Manager'), CASHIER: t('Cashier'), STAFF: t('Staff'),
};

export const HOURS_SOURCE: Record<Exclude<HoursSource, null>, string> = {
  attendance: t('Haziri se'),
  shift: t('Galla shift se'),
  active: t('Sale wale ghante'),
};

export const qtyText = (n: number) => Number(n.toFixed(2)).toLocaleString('en-PK');
export const pct = (n: number) => `${n.toFixed(1)}%`;
export const hoursText = (h: number) => (h >= 1 ? t('{{value}} ghante', { value: Number(h.toFixed(1)) }) : t('{{value}} min', { value: Math.round(h * 60) }));

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
  discount: t('Discount zyada'),
  void: t('Bill cancel zyada'),
  return: t('Return zyada'),
  credit: t('Udhaar zyada'),
  short: t('Galla kam nikla'),
  pin: t('Ghalat PIN'),
};

/** One line explaining an alert against the team. */
export function alertText(a: StaffAlert, money: (n: number) => string) {
  switch (a.kind) {
    case 'discount': return t('{{count}} bill par {{pct}} discount di — team ki ausat {{team}}', { count: a.count, pct: pct(a.value), team: pct(a.team) });
    case 'void': return t('{{count}} bill cancel hue ({{pct}}) — team ki ausat {{team}}', { count: a.count, pct: pct(a.value), team: pct(a.team) });
    case 'return': return t('{{count}} bill par maal wapas aaya, sale ka {{pct}} — team {{team}}', { count: a.count, pct: pct(a.value), team: pct(a.team) });
    case 'credit': return t('{{count}} bill udhaar par, sale ka {{pct}} — team {{team}}', { count: a.count, pct: pct(a.value), team: pct(a.team) });
    case 'short': return t('Galla {{count}} dafa kam nikla, kul {{value}} kam', { count: a.count, value: money(a.value) });
    case 'pin': return t('{{count}} dafa ghalat PIN dala', { count: a.count });
    default: return '';
  }
}
