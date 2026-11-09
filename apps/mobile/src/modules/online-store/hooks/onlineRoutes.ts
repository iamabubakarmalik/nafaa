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
    const board = url.searchParams.get('board');
    return id ? `/online/orders/${encodeURIComponent(id)}` : board ? `/online/orders?board=${encodeURIComponent(board)}` : '/online/orders';
  }
  if (path === '/online-store/social') {
    const post = url.searchParams.get('post');
    return post ? `/online/social?post=${encodeURIComponent(post)}` : '/online/social';
  }
  const map: Record<string, string> = {
    '/online-orders/cod': '/online/cod', '/online-orders/pack': '/online/pack', '/online-orders/returns-scan': '/online/returns',
    '/online-orders/customers': '/online/customers', '/online-orders/reports': '/online/reports', '/online-store/products': '/online/products',
    '/online-store/couriers': '/online/couriers', '/online-store/channels': '/online/channels', '/online-store/ads': '/online/ads',
    '/online-store': '/online', '/online-orders/new': '/online/orders/new', '/online-orders/dispatch-scan': '/online/dispatch-scan',
    '/online-orders/abandoned': '/online/abandoned', '/online-orders/profit': '/online/profit', '/online-orders/payment-health': '/online/payment-health',
    '/online-store/whatsapp-templates': '/online/whatsapp-templates', '/online-orders/cod/reconcile': '/online/cod-reconcile',
    '/online-store/campaigns': '/online/campaigns', '/online-store/affiliates': '/online/affiliates',
  };
  return map[path] ?? null;
}
