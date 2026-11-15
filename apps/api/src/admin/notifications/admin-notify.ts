/**
 * notifyAdmins(): the one call business code makes to tell the admin team
 * about an event. It never throws and never waits, so it cannot break or slow
 * down the action that triggered it.
 *
 * AdminNotificationsService registers itself here when the app starts. In unit
 * tests (no Nest app) the call does nothing.
 */

import type { AdminNotificationType } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AdminNotifyCategory, AdminNotifySeverity } from './admin-notify.logic';

export interface AdminEvent {
  category: AdminNotifyCategory;
  /** Short event id kept in metadata, e.g. 'shop.signup', 'billing.payment_failed'. */
  event: string;
  severity?: AdminNotifySeverity;
  title: string;
  message: string;
  /** Admin app path, e.g. /tenants/<id>. */
  link?: string | null;
  tenantId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  /** Older enum kept for icons; defaults from the severity. */
  type?: AdminNotificationType;
  /** Same key inside the window = one notification with a count. */
  dedupeKey?: string;
  windowMinutes?: number;
  /** Only ever one notification for this key. */
  once?: boolean;
  /** A repeat only raises the count: it does not mark the row unread or alert again. */
  quietRepeat?: boolean;
}

export interface AdminNotifier {
  notify(e: AdminEvent): Promise<unknown>;
}

let notifier: AdminNotifier | null = null;

export function registerAdminNotifier(n: AdminNotifier | null) {
  notifier = n;
}

export function notifyAdmins(e: AdminEvent): void {
  try {
    if (!notifier) return;
    void notifier.notify(e).catch(() => undefined);
  } catch {
    // A notification must never break the caller.
  }
}

const rsFmt = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 });
/** "Rs 4,500" for notification text. */
export const rs = (n: number | null | undefined) => `Rs ${rsFmt.format(Math.round(Number(n) || 0))}`;

const CHANNEL_LABEL: Record<string, string> = {
  SHOPIFY: 'Shopify', DARAZ: 'Daraz', WOOCOMMERCE: 'WooCommerce', CUSTOM_WEBSITE: 'Website', FOODPANDA: 'Foodpanda',
  NAFAA_STORE: 'Nafaa Store', NAFAA_MARKET: 'Nafaa Market', META: 'Facebook / Instagram',
};

/**
 * A sales channel of a shop stopped working (disconnected, uninstalled, token
 * lost). Looks up the shop name itself; never throws.
 */
export function notifyChannelDown(
  prisma: Pick<PrismaService, 'tenant'>,
  ch: { id: string; tenantId: string; type: string },
  reason: string,
  opts: { severity?: AdminNotifySeverity; byShop?: boolean } = {},
): void {
  try {
    const name = CHANNEL_LABEL[ch.type] ?? ch.type;
    void prisma.tenant.findUnique({ where: { id: ch.tenantId }, select: { name: true } })
      .then((t) => notifyAdmins({
        category: 'commerce', event: 'commerce.channel_disconnected',
        severity: opts.severity ?? (opts.byShop ? 'info' : 'warning'),
        title: `${name} disconnected: ${t?.name ?? 'Shop'}`,
        message: reason,
        link: `/tenants/${ch.tenantId}`, tenantId: ch.tenantId, entityType: 'integration', entityId: ch.id,
        metadata: { channel: ch.type, byShop: !!opts.byShop },
        dedupeKey: `channel-down:${ch.id}`, windowMinutes: 24 * 60, quietRepeat: true,
      }))
      .catch(() => undefined);
  } catch {
    // never break the caller
  }
}
