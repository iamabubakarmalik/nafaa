/**
 * Shared plumbing for the trade network services: the one place that loads a
 * link for a caller (every cross-business read and write starts here), the
 * acting user used for automatic work in the other business, and notices.
 *
 * Isolation rule: a service reads or writes the other business's rows only
 * with ids taken from a link the caller is a party to (customerId,
 * supplierId, salesOrderId, purchaseId), and always also filters by that
 * business's tenantId.
 */

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma, TradeLink, UserRole } from '@prisma/client';
import { PERMISSIONS, hasPermission, type PermissionKey } from '../../common/constants/permissions.constants';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';

type Db = Prisma.TransactionClient;

export type Side = 'BUYER' | 'SELLER';

/** The link with the caller's side, or 404 when the caller is not a party to it. */
export async function linkFor(db: Db, tenantId: string, linkId: string, side?: Side): Promise<TradeLink & { side: Side }> {
  const link = await db.tradeLink.findFirst({
    where: { id: linkId, OR: [{ sellerTenantId: tenantId }, { buyerTenantId: tenantId }] },
  });
  if (!link) throw new NotFoundException('Link nahi mila');
  const mine: Side = link.sellerTenantId === tenantId ? 'SELLER' : 'BUYER';
  if (side && side !== mine) throw new NotFoundException('Link nahi mila');
  return { ...link, side: mine };
}

export function requirePerm(user: AuthenticatedUser, ...keys: PermissionKey[]) {
  if (keys.some((k) => hasPermission(user.role, user.permissions, k))) return;
  throw new ForbiddenException('Is kaam ki permission nahi');
}

export function can(user: AuthenticatedUser, key: PermissionKey) {
  return hasPermission(user.role, user.permissions, key);
}

/** The side-specific read permission for statements and order views. */
export function requireSideRead(user: AuthenticatedUser, side: Side) {
  if (side === 'BUYER') requirePerm(user, PERMISSIONS.TRADE_BUY, PERMISSIONS.TRADE_PAYMENTS_MANAGE, PERMISSIONS.TRADE_LINKS_MANAGE);
  else requirePerm(user, PERMISSIONS.TRADE_SELL, PERMISSIONS.TRADE_PAYMENTS_MANAGE, PERMISSIONS.TRADE_LINKS_MANAGE);
}

/**
 * A user of `tenantId` to act as for automatic work there (an order booked
 * in the seller's books, a purchase drafted in the buyer's books). The first
 * active user among `prefer`, else the business owner.
 */
export async function actorFor(db: Db, tenantId: string, prefer: Array<string | null | undefined> = []): Promise<AuthenticatedUser> {
  const select = { id: true, email: true, role: true, permissions: true } as const;
  const ids = prefer.filter((x): x is string => !!x);
  let u = ids.length ? await db.user.findFirst({ where: { tenantId, isActive: true, id: { in: ids } }, select }) : null;
  if (!u) u = await db.user.findFirst({ where: { tenantId, isActive: true, role: UserRole.OWNER }, orderBy: { createdAt: 'asc' }, select });
  if (!u) u = await db.user.findFirst({ where: { tenantId, isActive: true }, orderBy: { createdAt: 'asc' }, select });
  if (!u) throw new NotFoundException('Is business ka koi active user nahi');
  return { id: u.id, sub: u.id, tenantId, email: u.email ?? '', role: u.role, shopId: null, permissions: u.permissions ?? [] };
}

/** Business card of a tenant as the other side sees it: name, city, phone. */
export async function businessCards(db: Db, tenantIds: string[]) {
  const ids = [...new Set(tenantIds.filter(Boolean))];
  if (!ids.length) return new Map<string, BusinessCard>();
  const [tenants, profiles, settings] = await Promise.all([
    db.tenant.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, phone: true, address: true, businessType: true } }),
    db.tradeProfile.findMany({ where: { tenantId: { in: ids } }, select: { tenantId: true, displayName: true, phone: true, city: true, area: true } }),
    db.tenantSettings.findMany({ where: { tenantId: { in: ids } }, select: { tenantId: true, shopName: true, shopPhone: true, shopAddress: true, logoUrl: true } }),
  ]);
  const p = new Map(profiles.map((x) => [x.tenantId, x]));
  const s = new Map((settings as Array<{ tenantId: string; shopName: string | null; shopPhone: string | null; shopAddress: string | null; logoUrl: string | null }>).map((x) => [x.tenantId, x]));
  return new Map(tenants.map((t) => {
    const pr = p.get(t.id);
    const st = s.get(t.id);
    return [t.id, {
      tenantId: t.id,
      name: pr?.displayName || st?.shopName || t.name,
      phone: pr?.phone || st?.shopPhone || t.phone || null,
      city: pr?.city ?? null,
      area: pr?.area ?? null,
      address: st?.shopAddress || t.address || null,
      logoUrl: st?.logoUrl ?? null,
      businessType: t.businessType ?? null,
    } satisfies BusinessCard];
  }));
}

export interface BusinessCard {
  tenantId: string;
  name: string;
  phone: string | null;
  city: string | null;
  area: string | null;
  address: string | null;
  logoUrl: string | null;
  businessType: string | null;
}

export interface Notice {
  tenantId: string;
  title: string;
  message: string;
  link: string;
  type?: NotificationType;
  kind: string;
  refId?: string;
}

/** Notifications never block the work that raised them. */
export interface Notifier {
  create(p: { tenantId: string; type: NotificationType; title: string; message: string; link?: string; metadata?: unknown }): Promise<unknown>;
}

export function notify(n: Notifier, x: Notice) {
  return n.create({
    tenantId: x.tenantId, type: x.type ?? 'INFO', title: x.title, message: x.message, link: x.link,
    metadata: { kind: 'TRADE', event: x.kind, ...(x.refId && { refId: x.refId }) },
  }).catch(() => undefined);
}
