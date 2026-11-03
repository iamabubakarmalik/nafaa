/**
 * Small helpers every inventory and purchasing screen uses: query keys and
 * the refresh after a stock change, cost masking, quantity text, reason and
 * effect labels, and whether the phone is online.
 */

import { useCallback } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { REASONS, type ProfitEffect, type ReasonCode, type AdjustmentType, TYPE_TEXT } from '@nafaa/core/inventory';
import { formatPKR } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { syncNow } from '@/core/offline';
import { useOnlineStatus } from '@/core/net';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import type { StatusTone } from '@/design';

/** Every inventory query key starts with this, so one invalidate refreshes all of them. */
export const INV = 'inv';
/** Purchasing queries (purchases, suppliers, supplier khata). */
export const PUR = 'pur';

/** After stock, prices or products change: refetch every inventory screen and pull the change into the phone. */
export async function refreshInventory(qc: QueryClient, opts: { purchasing?: boolean; sync?: boolean } = {}) {
  await Promise.all([
    qc.invalidateQueries({ queryKey: [INV] }),
    opts.purchasing ? qc.invalidateQueries({ queryKey: [PUR] }) : Promise.resolve(),
    qc.invalidateQueries({ queryKey: ['dashboard'] }),
  ]);
  if (opts.sync !== false) void syncNow().catch(() => undefined);
}

export function useRefreshInventory() {
  const qc = useQueryClient();
  return useCallback((opts?: { purchasing?: boolean; sync?: boolean }) => refreshInventory(qc, opts), [qc]);
}

/** True while the phone can reach the server. */
export const useOnline = (): boolean => useOnlineStatus();

/** Cost, profit and margins are shown only with `cost.view` (same rule as the web). */
export function useCostMask() {
  const can = usePermission();
  const costHidden = !can(P.COST_VIEW);
  const cost = useCallback((n: number | null | undefined) => (costHidden ? '••••' : formatPKR(n ?? 0)), [costHidden]);
  return { costHidden, cost };
}

/** Up to three decimals, without trailing zeros, Latin digits ("12.5"). */
export const qty = (n: number | null | undefined) => String(Number(Number(n ?? 0).toFixed(3)));

/** "12.5 kg" */
export const qtyUnit = (n: number | null | undefined, unit?: string | null) => `${qty(n)} ${unit ?? ''}`.trim();

/* ───────────── reasons and profit effect (labels are raw source text) ───────────── */

msg('Damage'); msg('Expiry'); msg('Chori / shortage'); msg('Dukaan mein istemal'); msg('Audit mein zyada nikla');
msg('Free / bonus maal mila'); msg('Galti theek karna (data correction)'); msg('Pehla stock'); msg('Dukaan me banaya'); msg('Ginti ki — asal stock');
msg('Stock barhaya'); msg('Stock kam kiya'); msg('Kharab maal'); msg('Gum gaya'); msg('Opening stock');
msg('Toota ya kharab maal'); msg('Expire ho gaya, bik nahi sakta'); msg('Chori, gum ya ginti me kam'); msg('Apne kaam me liya, sample ya free diya');
msg('Ginti me system se zyada maal'); msg('Company ya supplier se muft maal'); msg('Sirf ghalat entry theek karni hai');

export const reasonLabel = (code: ReasonCode) => t(REASONS[code].label);
export const reasonHint = (code: ReasonCode) => t(REASONS[code].hint);
export const typeLabel = (type: AdjustmentType) => t(TYPE_TEXT[type]);

export const EFFECT_META: Record<ProfitEffect, { label: string; note: string; tone: StatusTone }> = {
  LOSS: { label: msg('Stock nuksan'), note: msg('Profit se minus'), tone: 'danger' },
  GAIN: { label: msg('Stock faida'), note: msg('Profit mein plus'), tone: 'success' },
  NONE: { label: msg('Profit par asar nahi'), note: msg('Sirf stock badla'), tone: 'neutral' },
};

export const CORRECTION_WARNING = msg('Sirf data ki galti theek karne ke liye — is se profit nahi badlega. Asal nuksan/faida ke liye upar wali reason chunein.');

/** Pack preset names shown in the editor (translated at render). */
msg('Aadha darjan'); msg('Darjan'); msg('Pack (10)'); msg('Dabba (24)'); msg('Carton'); msg('Bori (50)');
