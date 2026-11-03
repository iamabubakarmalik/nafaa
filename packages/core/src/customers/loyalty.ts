/** Loyalty levels and what a number of points is worth. */

export type TierId = 'starter' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

/** Levels by points; labels are brand words and stay in English. */
export const LOYALTY_TIERS: ReadonlyArray<{ id: TierId; label: string; min: number; color: string }> = [
  { id: 'starter', label: 'Starter', min: 1, color: '#64748b' },
  { id: 'bronze', label: 'Bronze', min: 100, color: '#b45309' },
  { id: 'silver', label: 'Silver', min: 500, color: '#64748b' },
  { id: 'gold', label: 'Gold', min: 1000, color: '#ca8a04' },
  { id: 'platinum', label: 'Platinum', min: 2000, color: '#0891b2' },
  { id: 'diamond', label: 'Diamond', min: 5000, color: '#7c3aed' },
];

export const loyaltyTier = (points: number) =>
  [...LOYALTY_TIERS].reverse().find((t) => points >= t.min) ?? LOYALTY_TIERS[0];

/** Next level and the points still needed, or null at the top. */
export function nextTier(points: number) {
  const next = LOYALTY_TIERS.find((t) => t.min > points);
  return next ? { tier: next, needed: next.min - points } : null;
}

/** Rupee value of points at the programme's redemption rate. */
export const pointsValue = (points: number, redemptionRate: number) => Math.round(points * redemptionRate * 100) / 100;

/** Spend that earns one point, from the "points per rupee" setting. */
export const spendPerPoint = (pointsPerRupee: number) => Math.round(1 / (pointsPerRupee || 0.01));
