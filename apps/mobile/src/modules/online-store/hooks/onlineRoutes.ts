/**
 * Web link of an online store notification → app route; null when it is not
 * one. The server's link is the web path (/online-orders?order=<id>).
 */
export function onlineRouteFor(link: unknown): string | null {
  if (typeof link !== 'string' || !link) return null;
  let url: URL;
  try { url = new URL(link, 'https://nafaa.pk'); } catch { return null; }
  const path = url.pathname.replace(/\/+$/, '');
  if (path === '/online-orders') {
    const id = url.searchParams.get('order');
    return id ? `/online/orders/${encodeURIComponent(id)}` : '/online';
  }
  const map: Record<string, string> = {
    '/online-orders/cod': '/online/cod', '/online-orders/pack': '/online/pack', '/online-orders/returns-scan': '/online/returns',
    '/online-orders/customers': '/online/customers', '/online-orders/reports': '/online/reports', '/online-store/products': '/online/products',
    '/online-store/couriers': '/online/couriers', '/online-store/channels': '/online/channels', '/online-store/ads': '/online/ads',
  };
  return map[path] ?? null;
}
