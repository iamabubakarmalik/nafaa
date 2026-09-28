import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@core/stores/auth.store';
import { onlineOrdersApi } from '../api/online-orders.api';

export const CHANNELS_KEY = ['sales-channels'] as const;

/**
 * Jore hue bechne ke channels (websites, WooCommerce, Shopify, Daraz…) —
 * sidebar, hub aur Online Orders ka filter sab yahi ek query share karte hain.
 */
export function useSalesChannels() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const shopId = useAuthStore((s) => s.currentShopId);
  return useQuery({
    queryKey: [...CHANNELS_KEY, shopId],
    queryFn: onlineOrdersApi.channels,
    enabled: isAuthenticated,
    refetchInterval: 30_000,
    staleTime: 10_000,
    retry: 1,
  });
}

/** Channel ka safha — website wale apne setup page par, baaqi (Daraz…) orders par */
export function channelPath(c: { id: string; isWebsite: boolean }) {
  return c.isWebsite ? `/online-store/channels/${c.id}` : `/online-orders?channel=${c.id}`;
}

export const CHANNEL_ICON: Record<string, { emoji: string; color: string; label: string }> = {
  WOOCOMMERCE: { emoji: '🟣', color: '#7f54b3', label: 'WooCommerce' },
  SHOPIFY: { emoji: '🟢', color: '#95bf47', label: 'Shopify' },
  CUSTOM_WEBSITE: { emoji: '🌐', color: '#10b981', label: 'Website' },
  DARAZ: { emoji: '🛒', color: '#f57224', label: 'Daraz' },
  FOODPANDA: { emoji: '🍔', color: '#e21b70', label: 'Foodpanda' },
};

export const channelMeta = (type: string) => CHANNEL_ICON[type] ?? { emoji: '🔌', color: '#64748b', label: type };
