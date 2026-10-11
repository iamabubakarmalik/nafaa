/**
 * Carpet numbers for the dashboard, derived from the overview's
 * `carpetStats` (rolls, square feet, cut pieces). Shares the overview
 * request with every other widget.
 */

import { useMemo } from 'react';
import { useOverview } from '@modules/dashboard/data/queries';

export function useCarpetOps() {
  const { data, isLoading } = useOverview();
  const c = data?.carpetStats ?? null;

  return useMemo(() => {
    const rolls = c?.totalActiveRolls ?? 0;
    const shortRolls = c?.lowStockRolls ?? [];
    const healthy = Math.max(rolls - shortRolls.length, 0);
    return {
      loading: isLoading,
      enabled: c !== null,
      rolls,
      lengthFt: c?.totalLengthFt ?? 0,
      sqft: c?.totalSqft ?? 0,
      pieces: c?.cutPiecesCount ?? 0,
      piecesSqft: c?.cutPiecesSqft ?? 0,
      piecesValue: c?.cutPiecesValue ?? 0,
      shortRolls,
      healthy,
      /** Share of rolls that still have a sellable length. */
      health: rolls > 0 ? Math.round((healthy / rolls) * 100) : 0,
      recentRolls: c?.recentRolls ?? [],
    };
  }, [c, isLoading]);
}
