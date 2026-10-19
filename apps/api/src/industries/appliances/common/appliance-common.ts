/**
 * Small rules every appliance desk shares: job numbers by the shop's year,
 * date filters in shop time, checks that linked records belong to the
 * tenant, and dated notes.
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { endOfDayTz, startOfDayTz, tzParts } from '../../../common/helpers/business-time.helper';

type Db = Prisma.TransactionClient;

export const r2 = (v: unknown) => Math.round((Number(v) || 0) * 100) / 100;

/** Prefix for this year's job numbers, by the shop's calendar (e.g. `SR-2026-`). */
export const yearPrefix = (code: string) => `${code}-${tzParts(new Date()).year}-`;

/** Next number after the highest one already used with this prefix. */
export function nextInSequence(prefix: string, last?: string | null) {
  const seq = last ? Number(last.slice(prefix.length)) || 0 : 0;
  return `${prefix}${String(seq + 1).padStart(4, '0')}`;
}

/** Date filter for `from`/`to` day strings, as whole shop days. */
export function dayRange(from?: string, to?: string): { gte?: Date; lte?: Date } | undefined {
  const a = from ? new Date(from) : null;
  const b = to ? new Date(to) : null;
  if ((a && isNaN(a.getTime())) || (b && isNaN(b.getTime()))) throw new BadRequestException('Tareekh sahi nahi hai');
  if (!a && !b) return undefined;
  return { ...(a && { gte: startOfDayTz(a) }), ...(b && { lte: endOfDayTz(b) }) };
}

/** Parses an optional date from the client; a bad value is an error, not "today". */
export function optDate(v?: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) throw new BadRequestException('Tareekh sahi nahi hai');
  return d;
}

/** Note line stamped with the shop's local time. */
export function stamp(old: string | null | undefined, text: string) {
  const when = new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' });
  return `${old ? `${old}\n` : ''}[${when}] ${text}`;
}

/** Ids sent by the client must point at this tenant's own records. */
export async function checkLinks(db: Db, tenantId: string, ids: {
  customerId?: string | null; productId?: string | null; serialTrackingId?: string | null; saleId?: string | null;
}) {
  const [customer, product, serial, sale] = await Promise.all([
    ids.customerId ? db.customer.findFirst({ where: { id: ids.customerId, tenantId }, select: { id: true } }) : true,
    ids.productId ? db.product.findFirst({ where: { id: ids.productId, tenantId }, select: { id: true } }) : true,
    ids.serialTrackingId ? db.applianceSerialTracking.findFirst({ where: { id: ids.serialTrackingId, tenantId }, select: { id: true } }) : true,
    ids.saleId ? db.sale.findFirst({ where: { id: ids.saleId, tenantId }, select: { id: true } }) : true,
  ]);
  if (!customer) throw new NotFoundException('Customer nahi mila');
  if (!product) throw new NotFoundException('Product nahi mila');
  if (!serial) throw new NotFoundException('Serial nahi mila');
  if (!sale) throw new NotFoundException('Bill nahi mila');
}

/** Active technician of this tenant, with the name and phone copied onto the job. */
export async function activeTechnician(db: Db, tenantId: string, id: string) {
  const tech = await db.applianceTechnician.findFirst({ where: { id, tenantId }, select: { id: true, name: true, phone: true, isActive: true } });
  if (!tech) throw new NotFoundException('Technician nahi mila');
  if (!tech.isActive) throw new BadRequestException(`${tech.name} abhi active nahi hai`);
  return tech;
}
