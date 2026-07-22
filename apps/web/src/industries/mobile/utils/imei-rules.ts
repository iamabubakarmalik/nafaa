export function requiresImeiTracking(product: any, variant?: any): boolean {
  const blob = [
    product?.name,
    product?.sku,
    product?.barcode,
    product?.category?.name,
    variant?.name,
    variant?.sku,
    variant?.barcode,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // Sirf yahin future keywords edit karne hon to kar lena
  const keywords = [
    'mobile',
    'phone',
    'iphone',
    'samsung',
    'android',
    'tablet',
    'ipad',
    'watch',
    'smartwatch',
    'laptop',
    'macbook',
    'imei',
    'device',
  ];

  return keywords.some((k) => blob.includes(k));
}
