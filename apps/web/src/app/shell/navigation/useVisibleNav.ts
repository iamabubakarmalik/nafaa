/**
 * The navigation the current user is allowed to see.
 *
 * Combines the core groups, the active industry's groups and the connected
 * sales channels, then filters by workspace (shop / all shops / marketplace),
 * ownership and permissions. How the business sells (Tenant.businessModels)
 * moves its main group up: Online store for online sellers, Distribution for
 * wholesalers and distributors. The expanded sidebar, the collapsed rail and the
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
import { BrandLogo, brandForChannel, type BrandName } from '@/assets/brands/BrandLogo';
import { useManufacturingEnabled } from '@modules/manufacturing/hooks';
import { useDistributionState } from '@modules/distribution/hooks/useDistribution';
import { useBusinessModels } from '@core/lib/business-models';
import { cn } from '@core/lib/cn';
import { allShopsNavGroups, canSeeSettingsItem, fromIndustryGroup, isSettingsPath, marketplaceNavGroups, posNavGroups, SETTINGS_ITEMS, type NavGroup, type NavItem } from './nav-config';

type Channel = { id: string; type: string; platform?: string | null; displayName: string; isWebsite: boolean; live: boolean; pendingOrders: number };

export function useVisibleNav(role?: unknown, permissions?: string[]) {
  const industry = useCurrentIndustry();
  const { activeWorkspace } = useWorkspaceStore();
  const isMarketplace = activeWorkspace === 'marketplace';
  const isAllShops = useIsAllShops();
  const { data: channels } = useSalesChannels();
  const manufacturing = useManufacturingEnabled();
  const dist = useDistributionState();
  const distribution = dist.state === 'on';
  const fullDistribution = distribution && dist.data?.settings.mode !== 'WHOLESALE';
  const { sellsOnline, sellsToShops } = useBusinessModels();
  // A wholesaler whose plan lacks distribution (or who switched it off) keeps one entry that explains the next step.
  const distributionTeaser = (sellsToShops || industry?.id === 'distribution') && (dist.state === 'plan' || dist.state === 'off');

  const groups = useMemo<NavGroup[]>(() => {
    const pos = posNavGroups.map((g) => {
      const group = g.id === 'online' ? { ...g, items: [...g.items, ...channelItems(channels)] } : g;
      if (g.id === 'online' && sellsOnline) return { ...group, order: 0.6, defaultOpen: true };
      if (g.id === 'distribution' && sellsToShops) return { ...group, order: 0.5, defaultOpen: true };
      return group;
    });
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
          if (it.feature === 'manufacturing' && !manufacturing) return false;
          if (it.feature === 'distribution-full' && !fullDistribution) return false;
          if (it.feature === 'distribution' && !distribution && !(distributionTeaser && it.to === '/distribution')) return false;
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
      .map((g) => (distributionTeaser && g.id === 'distribution'
        ? { ...g, items: g.items.map((it) => (it.to === '/distribution' ? { ...it, badge: dist.state === 'plan' ? 'Plan' : 'Band' } : it)) }
        : g))
      .filter((g) => g.items.length > 0);
  }, [industry, isMarketplace, isAllShops, role, permissions, channels, manufacturing, distribution, fullDistribution, distributionTeaser, dist.state, sellsOnline, sellsToShops]);

  const settingsItems = useMemo(() => SETTINGS_ITEMS.filter((i) => canSeeSettingsItem(i, role, permissions)), [role, permissions]);

  // The gear opens the first page that lives inside Settings, never an everyday page it links to.
  const settingsHome = isMarketplace ? '/marketplace/settings-hub' : settingsItems.find((i) => !i.external)?.to ?? '/profile';

  return { groups, settingsItems, settingsHome, industry, isMarketplace, isAllShops, workspace: WORKSPACES[activeWorkspace], activeWorkspace };
}

/** One nav item per connected sales channel, with its pending-order count. */
function channelItems(channels?: Channel[]): NavItem[] {
  const list: NavItem[] = (channels ?? []).map((c) => ({
    to: channelPath(c),
    label: c.displayName,
    icon: brandIcon(brandForChannel(c.type, { platform: c.platform })),
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

const brandCache = new Map<BrandName, ComponentType<{ className?: string }>>();

/** Wraps a partner logo in an icon-shaped component so nav rows can render it like a Lucide icon. */
function brandIcon(name: BrandName) {
  const cached = brandCache.get(name);
  if (cached) return cached;
  const LogoIcon = ({ className }: { className?: string }) =>
    createElement('span', { className: cn('inline-flex items-center justify-center', className), 'aria-hidden': true }, createElement(BrandLogo, { name, size: 18 }));
  brandCache.set(name, LogoIcon);
  return LogoIcon;
}
