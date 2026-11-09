/**
 * Who may use the live Facebook & Instagram features.
 *
 * The Meta app works only for people with a role on it until App Review is
 * passed, so the connect button is shown live only to shops on the admin's
 * "Meta beta shops" list. After review the server sets META_APP_LIVE=1 and
 * every shop gets it, unless the admin keeps the "meta" Coming soon tile on.
 * The admin kill switch (META) pauses all calls.
 */

import { PrismaService } from '../../prisma/prisma.service';
import { CommerceControls, commerceControls } from '../online-orders/commerce-controls';
import { metaAppConfig } from './meta-graph';

export type MetaAccessReason = 'paused' | 'not_configured' | 'soon' | null;

export interface MetaAccess {
  live: boolean;
  reason: MetaAccessReason;
  /** True while the Meta app is unreviewed and this shop is on the beta list. */
  beta: boolean;
}

/** Pure rule, unit-tested. */
export function decideMetaAccess(
  tenantId: string,
  c: Pick<CommerceControls, 'killSwitch' | 'comingSoon' | 'metaBetaShops'>,
  env: NodeJS.ProcessEnv = process.env,
): MetaAccess {
  const beta = (c.metaBetaShops ?? []).includes(tenantId);
  if (c.killSwitch?.META) return { live: false, reason: 'paused', beta };
  if (!metaAppConfig(env)) return { live: false, reason: 'not_configured', beta };
  if (beta) return { live: true, reason: null, beta: env.META_APP_LIVE !== '1' };
  if (env.META_APP_LIVE === '1' && !c.comingSoon?.meta) return { live: true, reason: null, beta: false };
  return { live: false, reason: 'soon', beta: false };
}

export async function metaAccess(prisma: PrismaService, tenantId: string): Promise<MetaAccess> {
  return decideMetaAccess(tenantId, await commerceControls(prisma));
}
