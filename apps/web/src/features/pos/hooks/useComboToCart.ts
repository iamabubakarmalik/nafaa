import { toast } from 'sonner';
import type { ProductCombo } from '@/features/industries/retail/api/combos.api';

/**
 * Converts a combo into a set of cart items with the combo discount distributed
 * proportionally across component products.
 *
 * Returns items ready to push into your existing cart state.
 */
export function useComboToCart() {
  const expandCombo = (combo: ProductCombo, cartLineIdGen: () => string) => {
    if (!combo.items || combo.items.length === 0) {
      toast.error('Combo has no items');
      return [];
    }

    // Warn if any component is out of stock
    const outOfStock = combo.items.filter((item) => {
      const stock = item.product?.stock ?? 0;
      return stock < item.quantity;
    });
    if (outOfStock.length > 0) {
      const names = outOfStock.map((i) => i.product?.name || 'item').join(', ');
      toast.error('Stock nahi hai: ' + names, {
        description: 'Combo ke components ka stock check karo',
        duration: 4000,
      });
      return [];
    }

    const totalOriginal = combo.items.reduce((sum, item) => {
      const price = item.originalPrice ?? item.product?.price ?? 0;
      return sum + price * item.quantity;
    }, 0);

    const savings = Math.max(totalOriginal - combo.comboPrice, 0);
    const discountRatio = totalOriginal > 0 ? savings / totalOriginal : 0;

    const cartItems = combo.items.map((item) => {
      const unitPrice = item.originalPrice ?? item.product?.price ?? 0;
      const discountedUnitPrice = unitPrice * (1 - discountRatio);

      return {
        cartLineId: cartLineIdGen(),
        productId: item.productId,
        variantId: item.variantId,
        name: item.product?.name || 'Combo item',
        variantName: item.variant?.name,
        variantColorHex: item.variant?.colorHex,
        variantImage: item.variant?.imageUrl || item.product?.images?.[0]?.url,
        basePrice: unitPrice,
        wholesalePrice: null,
        stock: item.product?.stock ?? 999,
        quantity: item.quantity,
        unit: item.unitName || item.product?.unit || 'piece',
        category: item.product?.category,
        useWholesale: false,
        priceOverride: Number(discountedUnitPrice.toFixed(2)),
        lineDiscount: 0,
        note: 'From combo: ' + combo.name,
        comboId: combo.id,
        comboName: combo.name,
      };
    });

    toast.success('Combo added: ' + combo.name, {
      description: cartItems.length + ' items • Save ' + savings.toFixed(0),
    });

    return cartItems;
  };

  return { expandCombo };
}
