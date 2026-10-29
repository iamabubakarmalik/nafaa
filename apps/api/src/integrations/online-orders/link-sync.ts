import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Per-link sync result: every stock/price push marks the links it covered as
 * SUCCESS or FAILED (with a short reason), so the Online products grid can
 * show which product is stuck on which channel.
 */

/** Channel errors in words a shopkeeper can act on; no vendor or server terms. */
export function friendlySyncError(e: unknown): string {
  const msg = String((e as any)?.message ?? e ?? '').trim();
  const status = Number((e as any)?.status ?? 0);
  if (status === 401 || status === 403 || /permission khatam|ijazat|IllegalAccessToken|InvalidAccessToken|AccessTokenExpired|unauthori[sz]ed|forbidden/i.test(msg)) {
    return 'Channel ki permission khatam — channel par "Dobara jorein" dabayein';
  }
  if (/DARAZ_APP|SHOPIFY_CLIENT|server par nahi lagi/i.test(msg)) return 'Ye channel abhi Nafaa se band hai — support se baat karein';
  if (/waqt par jawab|timeout|abort/i.test(msg)) return 'Channel ne waqt par jawab nahi diya — thori der baad khud dobara hoga';
  if (/nahi pahunch|network|ENOTFOUND|ECONNREFUSED|fetch failed/i.test(msg)) return 'Channel tak nahi pahunch sake — internet ya website band';
  if (/location/i.test(msg)) return 'Channel par stock ki jagah (location) nahi mili — channel par "Webhooks check" dabayein';
  return (msg || 'Sync nahi hua').replace(/\b(api[_ ]?key|access[_ ]?token|token|secret)\b/gi, 'login').slice(0, 300);
}

export async function markLinks(
  prisma: PrismaService,
  integrationId: string,
  where: Prisma.ProductChannelMappingWhereInput,
  ok: boolean,
  error?: unknown,
) {
  try {
    await prisma.productChannelMapping.updateMany({
      where: { ...where, integrationId },
      data: ok
        ? { syncStatus: 'SUCCESS', syncError: null, lastSyncedAt: new Date() }
        : { syncStatus: 'FAILED', syncError: friendlySyncError(error) },
    });
  } catch {
    // The status is a display aid; a failed write must not fail the push.
  }
}

/** Runs a push and records its outcome on the links it covered. Errors still reach the caller. */
export async function trackLinks<T>(
  prisma: PrismaService,
  integrationId: string,
  where: Prisma.ProductChannelMappingWhereInput,
  run: () => Promise<T>,
): Promise<T> {
  try {
    const res = await run();
    await markLinks(prisma, integrationId, where, true);
    return res;
  } catch (e) {
    await markLinks(prisma, integrationId, where, false, e);
    throw e;
  }
}

/** Which links a partial Woo/Shopify stock push touches. */
export function linkScope(opts: { onlySkus?: string[]; onlyLinks?: { externalProductId: string; externalVariantId: string | null }[] }): Prisma.ProductChannelMappingWhereInput {
  const links = opts.onlyLinks ?? [];
  const skus = opts.onlySkus ?? [];
  if (!links.length && !skus.length) return {};
  const variantIds = links.filter((l) => l.externalVariantId).map((l) => String(l.externalVariantId));
  const productIds = links.filter((l) => !l.externalVariantId).map((l) => String(l.externalProductId));
  return {
    OR: [
      ...(variantIds.length ? [{ externalVariantId: { in: variantIds } }] : []),
      ...(productIds.length ? [{ externalProductId: { in: productIds }, externalVariantId: null }] : []),
      ...(skus.length ? [{ externalSku: { in: skus } }] : []),
    ],
  };
}
