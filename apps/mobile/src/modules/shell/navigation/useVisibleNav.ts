/**
 * The navigation this user may see: mobile screens only, filtered by
 * permission, owner-only pages, industry, the "All shops" view and the
 * admin module switches. The More menu, the tablet rail, search and the
 * Create sheet all read from here so they never disagree.
 */

import { useMemo } from 'react';
import { useAuthStore } from '@/core/auth/store';
import { isAllShops } from '@/core/auth/shopScope';
import { hasPermission, isOwner } from '@/core/permissions';
import { t } from '@/core/i18n';
import { useModuleFlags } from '../appControl';
import { useIndustry } from '../hooks/useIndustry';
import { NAV_GROUPS, SETTINGS_GROUPS, type NavGroup, type NavItem, type SettingsGroup, type SettingsItem } from './nav-config';

export function useNavFilter() {
  const role = useAuthStore((s) => s.user?.role);
  const permissions = useAuthStore((s) => s.user?.permissions);
  const allShops = useAuthStore((s) => isAllShops(s.currentShopId));
  const { id: industryId } = useIndustry();
  const moduleOn = useModuleFlags();
  return useMemo(() => {
    const owner = isOwner(role);
    return (it: NavItem) => {
      if (!it.href) return false;
      if (it.module && !moduleOn(it.module)) return false;
      if (it.ownerOnly && !owner) return false;
      if (allShops && it.needsShop) return false;
      if (it.industries && !(industryId && it.industries.includes(industryId))) return false;
      if (it.permission && !hasPermission(role, permissions, it.permission)) return false;
      if (it.alsoNeeds && !hasPermission(role, permissions, it.alsoNeeds)) return false;
      return true;
    };
  }, [role, permissions, allShops, industryId, moduleOn]);
}

export function useVisibleNav() {
  const allowed = useNavFilter();
  const groups = useMemo<NavGroup[]>(
    () => NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter(allowed) })).filter((g) => g.items.length > 0).sort((a, b) => a.order - b.order),
    [allowed],
  );
  const settings = useMemo<SettingsGroup[]>(
    () => SETTINGS_GROUPS.map((g) => ({ ...g, items: g.items.filter(allowed) as SettingsItem[] })).filter((g) => g.items.length > 0),
    [allowed],
  );
  const items = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  const byTo = useMemo(() => new Map([...items, ...settings.flatMap((g) => g.items)].map((i) => [i.to, i])), [items, settings]);
  return { groups, settings, items, byTo };
}

export interface NavHit {
  item: NavItem;
  section: string;
}

/** Search pages and settings by label, keywords and group name (in the user's language and the source words). */
export function searchNav(query: string, groups: NavGroup[], settings: SettingsGroup[]): NavHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: NavHit[] = [];
  for (const g of groups) {
    for (const it of g.items) {
      const hay = `${t(it.label)} ${it.label} ${it.keywords ?? ''} ${t(g.label)}`.toLowerCase();
      if (hay.includes(q)) hits.push({ item: it, section: t(g.label) });
    }
  }
  for (const g of settings) {
    for (const it of g.items) {
      const hay = `${t(it.label)} ${it.label} ${t(it.desc)} ${it.keywords ?? ''} ${t(g.title)}`.toLowerCase();
      if (hay.includes(q) && !hits.some((h) => h.item.to === it.to)) hits.push({ item: it, section: t('Settings') });
    }
  }
  return hits.slice(0, 30);
}
