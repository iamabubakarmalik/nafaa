/** Channel link ki pehchan: ek Nafaa product (ya us ka variant) ek channel par ek hi dafa */
export const mappingKey = (productId: string, variantId?: string | null) => `${productId}:${variantId || '-'}`;
