/**
 * Returns service charges automatically added to a Restaurant cart.
 *
 * These are read at checkout time and posted to the sale so the
 * receipt / reports show them explicitly.
 *
 * Defaults (safe & non-intrusive):
 *   • Service charge: 10 % of subtotal (if configured)
 *   • Delivery fee : from restaurant mode state
 *
 * Real percentages / toggles will be wired to TenantSettings in a
 * follow-up — for now the pack ships sensible defaults.
 */
export function restaurantAutoServiceCharges(cart: any): Array<{ label: string; amount: number }> {
  if (!Array.isArray(cart?.items) || cart.items.length === 0) return [];

  const charges: Array<{ label: string; amount: number }> = [];

  const subtotal = cart.items.reduce((sum: number, it: any) => {
    const unitPrice = it.priceOverride ?? (it.useWholesale ? (it.wholesalePrice ?? it.basePrice) : it.basePrice);
    return sum + unitPrice * it.quantity;
  }, 0);

  // Only add service charge when tenant has explicitly enabled it
  // (checked here rather than via TenantSettings so we don\'t surprise
  // existing restaurants). Toggle key: businessFeatures.restaurantAutoService.
  try {
    const raw = localStorage.getItem('nafaa-auth');
    if (raw) {
      const state = JSON.parse(raw);
      const features = state?.state?.tenant?.businessFeatures ?? {};
      if (features.restaurantAutoService === true) {
        const pct = Number(features.restaurantServicePct ?? 10);
        if (pct > 0 && subtotal > 0) {
          charges.push({
            label: `Service Charge (${pct}%)`,
            amount: Math.round(subtotal * (pct / 100)),
          });
        }
      }
    }
  } catch {
    // silently ignore — auth store may not be ready
  }

  return charges;
}
