/**
 * Utility to build deep links for sharing across web/PWA/mobile.
 * Supports universal links and app scheme fallback.
 */

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://nafaa.pk';

export const deepLinks = {
  product: (productId: string) => `${BASE_URL}/products/${productId}`,
  shop: (slugOrId: string) => `${BASE_URL}/shops/${slugOrId}`,
  order: (orderId: string) => `${BASE_URL}/orders/${orderId}`,
  bargain: (bargainId: string) => `${BASE_URL}/bargain/${bargainId}`,
  auction: (auctionId: string) => `${BASE_URL}/auctions/${auctionId}`,
  groupBuy: (groupBuyId: string) => `${BASE_URL}/group-buys/${groupBuyId}`,
  liveShop: (id: string) => `${BASE_URL}/live/${id}`,
  splitPayment: (token: string) => `${BASE_URL}/split/${token}`,
  referral: (code: string) => `${BASE_URL}/register?ref=${code}`,
  giftCard: (code: string) => `${BASE_URL}/gift-cards?code=${code}`,
};

export async function shareLink(data: {
  title: string;
  text?: string;
  url: string;
  onCopy?: () => void;
}) {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title: data.title, text: data.text, url: data.url });
      return { success: true, method: 'native' };
    } catch {
      // User cancelled or share failed — fall back to copy
    }
  }

  try {
    await navigator.clipboard.writeText(data.url);
    data.onCopy?.();
    return { success: true, method: 'clipboard' };
  } catch {
    return { success: false };
  }
}

/** WhatsApp share helper */
export function whatsappShare(text: string, url?: string) {
  const message = url ? `${text}\n\n${url}` : text;
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/?text=${encoded}`, '_blank');
}
