/**
 * Shared bits for the transfer screens: status labels, how a line is named
 * (product, variant, roll, IMEI, used phone or serial), short-received value
 * and simple date / duration text.
 */

import { cn } from '@core/lib/cn';
import type { StockTransfer, StockTransferItem, TransferStatus } from '../api/transfers.api';

export const STATUS: Record<TransferStatus, { label: string; tone: string; color: string }> = {
  PENDING: { label: 'Bhejna baqi', tone: 'bg-slate-100 text-slate-600 ring-slate-200', color: '#64748b' },
  IN_TRANSIT: { label: 'Raste me', tone: 'bg-blue-50 text-blue-700 ring-blue-200', color: '#2563eb' },
  RECEIVED: { label: 'Wusool', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200', color: '#16a34a' },
  CANCELLED: { label: 'Cancel', tone: 'bg-slate-100 text-slate-500 ring-slate-200', color: '#94a3b8' },
};

export function StatusBadge({ status, className }: { status: TransferStatus; className?: string }) {
  const s = STATUS[status];
  return <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', s.tone, className)}>{s.label}</span>;
}

export const qty = (n: number) => Number((n ?? 0).toFixed(3)).toLocaleString('en-PK');

export const day = (v?: string | null) => (v ? new Date(v).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export const dayTime = (v?: string | null) =>
  v ? new Date(v).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—';

/** "25 min", "3 ghante", "2 din 4 ghante". */
export function duration(fromIso?: string | null, toIso?: string | null) {
  if (!fromIso) return '';
  const ms = Math.max(0, (toIso ? new Date(toIso) : new Date()).getTime() - new Date(fromIso).getTime());
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${Math.max(mins, 1)} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ghante`;
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest ? `${days} din ${rest} ghante` : `${days} din`;
}

/** A device, roll or used phone arrives whole or not at all. */
export const isUnitLine = (i: StockTransferItem) => !!(i.imeiId || i.serialId || i.usedPhoneId || i.carpetRollId);

export function lineName(i: StockTransferItem) {
  if (i.usedPhone) return `${i.usedPhone.brand} ${i.usedPhone.model}${i.usedPhone.storage ? ` ${i.usedPhone.storage}` : ''}`;
  return i.product?.name ?? 'Cheez';
}

/** Roll number, IMEI, serial or used phone code, when the line is one unit. */
export function lineRef(i: StockTransferItem) {
  if (i.carpetRoll) return `Roll ${i.carpetRoll.rollNumber} · ${i.carpetRoll.widthFt}ft${i.carpetRoll.widthInch ? ` ${i.carpetRoll.widthInch}in` : ''} × ${qty(i.carpetRoll.remainingLengthFt)}ft`;
  if (i.imei) return `IMEI ${i.imei.imei1}${i.imei.color ? ` · ${i.imei.color}` : ''}`;
  if (i.serial) return `Serial ${i.serial.serialNumber}${i.serial.imei ? ` · IMEI ${i.serial.imei}` : ''}`;
  if (i.usedPhone) return `Used ${i.usedPhone.usedPhoneCode}${i.usedPhone.color ? ` · ${i.usedPhone.color}` : ''}`;
  return '';
}

export const lineUnit = (i: StockTransferItem) => (i.usedPhone ? 'pcs' : i.product?.unit ?? 'pcs');

/** Cost value of what did not arrive; zero until received. */
export function shortValue(t: StockTransfer) {
  if (t.status !== 'RECEIVED') return 0;
  return t.items.reduce((s, i) => s + Math.max(0, i.quantity - (i.receivedQty ?? 0)) * (i.unitCost ?? 0), 0);
}

/** Short preview of the lines, e.g. "12 pcs Surf · 2 sqft Carpet +3". */
export function preview(t: StockTransfer, max = 3) {
  const text = t.items.slice(0, max).map((i) => (isUnitLine(i) && !i.carpetRollId ? `${lineName(i)} (${lineRef(i).split(' · ')[0]})` : `${qty(i.quantity)} ${lineUnit(i)} ${lineName(i)}`)).join(' · ');
  return t.items.length > max ? `${text} +${t.items.length - max}` : text;
}
