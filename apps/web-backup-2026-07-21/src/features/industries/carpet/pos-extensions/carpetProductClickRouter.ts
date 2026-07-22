/**
 * Carpet product-click router.
 *
 * When a user clicks a carpet product tile in the POS:
 *   1. If product has variants → open variant picker (core handles it)
 *   2. Else → open carpet roll picker so cashier chooses which roll
 *      to cut from AND enters cut dimensions (width × length)
 *
 * Return true if we handled it, false to let core do the default add.
 */

const CARPET_UNITS = new Set(['sqft', 'sqm', 'sqyd', 'ft', 'm', 'roll']);

export async function carpetProductClickRouter(
  product: any,
  ctx: {
    openVariantPicker: (variants: any[]) => void;
    openCarpetRollPicker: (product: any, variant?: any) => void;
    openImeiPicker: (product: any, variant?: any) => void;
    addToCart: (product: any, variant: any | null) => void;
    toast: (msg: string) => void;
  },
): Promise<boolean> {
  const isCarpetProduct = CARPET_UNITS.has(product?.unit);
  if (!isCarpetProduct) return false;

  // Variant products: let core show variant picker first
  // (VariantPicker will re-fire this router with the chosen variant
  // via addToCart's normal flow, or the picker itself can route to
  // the roll picker — that's handled inside PosPage today.)
  if (product.hasVariants) {
    return false;
  }

  // Non-variant carpet product → straight to roll picker
  ctx.openCarpetRollPicker(product);
  return true;
}
