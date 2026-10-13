/**
 * The navigation the current user is allowed to see.
 *
 * Combines the core groups, the active industry's groups and the connected
 * sales channels, then filters by workspace (shop / all shops / marketplace),
 * ownership and permissions. The expanded sidebar, the collapsed rail and the
 * mobile drawer all read from this hook so they never disagree.
 */

import { createElement, useMemo, type ComponentType } from 'react';
import { Plus } from 'lucide-react';
import { permissionForPath } from '@core/lib/route-permissions';
import { hasPermission, isOwner, isOwnerOnlyPath, PERMISSIONS } from '@core/lib/permissions';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { useWorkspaceStore, WORKSPACES } from '@core/stores/workspace.store';
import { useIsAllShops } from '@core/stores/auth.store';
import { channelMeta, channelPath, useSalesChannels } from '@integrations/online-orders/hooks/useSalesChannels';
import { cn } from '@core/lib/cn';
import { allShopsNavGroups, fromIndustryGroup, isSettingsPath, marketplaceNavGroups, posNavGroups, SETTINGS_ITEMS, type NavGroup, type NavItem } from './nav-config';

type Channel = { id: string; type: string; displayName: string; isWebsite: boolean; live: boolean; pendingOrders: number };

export function useVisibleNav(role?: unknown, permissions?: string[]) {
  const industry = useCurrentIndustry();
  const { activeWorkspace } = useWorkspaceStore();
  const isMarketplace = activeWorkspace === 'marketplace';
  const isAllShops = useIsAllShops();
  const { data: channels } = useSalesChannels();

  const groups = useMemo<NavGroup[]>(() => {
    const pos = posNavGroups.map((g) => (g.id === 'online' ? { ...g, items: [...g.items, ...channelItems(channels)] } : g));
    const base = isMarketplace
      ? marketplaceNavGroups
      : isAllShops
        ? allShopsNavGroups
        : [...pos, ...(industry?.navGroups?.map(fromIndustryGroup) ?? [])];
    const owner = isOwner(role as never);
    return [...base]
      .sort((a, b) => (a.order ?? 100) - (b.order ?? 100))
      .map((g) => ({
        ...g,
        items: g.items.filter((it) => {
          if (isAllShops && !isMarketplace && it.needsShop) return false;
          if (!owner && isOwnerOnlyPath(it.to)) return false;
          // Setup screens live in Settings, not in the everyday menu.
          if (!isMarketplace && isSettingsPath(it.to)) return false;
          // Industry packs do not declare permissions on their nav items, so
          // the permission is derived from the route.
          if (it.alsoNeeds && !hasPermission(role as never, permissions, it.alsoNeeds)) return false;
          const needs = it.permission ?? permissionForPath(it.to);
          return needs ? hasPermission(role as never, permissions, needs) : true;
        }),
      }))
      .filter((g) => g.items.length > 0);
  }, [industry, isMarketplace, isAllShops, role, permissions, channels]);

  const settingsItems = useMemo(() => {
    const owner = isOwner(role as never);
    return SETTINGS_ITEMS.filter((i) => (owner || !isOwnerOnlyPath(i.to)) && (!i.permission || hasPermission(role as never, permissions, i.permission)));
  }, [role, permissions]);

  const settingsHome = isMarketplace ? '/marketplace/settings-hub' : settingsItems[0]?.to ?? '/profile';

  return { groups, settingsItems, settingsHome, industry, isMarketplace, isAllShops, workspace: WORKSPACES[activeWorkspace], activeWorkspace };
}

/** One nav item per connected sales channel, with its pending-order count. */
function channelItems(channels?: Channel[]): NavItem[] {
  const list: NavItem[] = (channels ?? []).map((c) => ({
    to: channelPath(c),
    label: c.displayName,
    icon: emojiIcon(channelMeta(c.type).emoji),
    count: c.pendingOrders,
    dim: !c.live,
    keywords: `${channelMeta(c.type).label} channel`,
  }));
  list.push({
    to: '/online-store/connect',
    label: list.length ? 'Add channel' : 'Connect your website',
    icon: Plus,
    permission: PERMISSIONS.SETTINGS_VIEW,
    keywords: 'woocommerce shopify website connect add',
  });
  return list;
}

const emojiCache = new Map<string, ComponentType<{ className?: string }>>();

/** Wraps an emoji in an icon-shaped component so nav rows can render it like a Lucide icon. */
function emojiIcon(emoji: string) {
  const cached = emojiCache.get(emoji);
  if (cached) return cached;
  const EmojiIcon = ({ className }: { className?: string }) =>
    createElement('span', { className: cn('inline-flex items-center justify-center text-[0.8125rem] leading-none', className), 'aria-hidden': true }, emoji);
  emojiCache.set(emoji, EmojiIcon);
  return EmojiIcon;
}
