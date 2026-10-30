/**
 * Branch switcher in the top bar.
 *
 * Owners pick a branch or "All Shops" (combined view; selling and the cash
 * register still need one branch). Other staff see the branch they are locked
 * to. `variant="row"` is the full-width version under the top bar on phones,
 * where the branch name must always be visible.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Check, ChevronDown, Layers, Lock, MapPin, Plus, Store } from 'lucide-react';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { useAuthStore } from '@core/stores/auth.store';
import { ALL_SHOPS } from '@core/lib/shopScope';
import { cn } from '@core/lib/cn';
import { Panel, useDismiss } from '../ui';
import { t } from '@core/i18n';

type Variant = 'bar' | 'row';

const TRIGGER = 'inline-flex h-9 items-center gap-2 rounded-lg border px-2.5 text-[0.8125rem] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';

function Tag({ children, tone = 'brand', className }: { children: React.ReactNode; tone?: 'brand' | 'violet' | 'neutral'; className?: string }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700 ring-brand-200',
    violet: 'bg-violet-50 text-violet-700 ring-violet-200',
    neutral: 'bg-slate-100 text-slate-600 ring-slate-200',
  };
  return <span className={cn('rounded px-1.5 py-px text-[0.625rem] font-bold uppercase tracking-wide ring-1 ring-inset', tones[tone], className)}>{children}</span>;
}

export default function ShopSelector({ variant = 'bar' }: { variant?: Variant }) {
  const nameClass = variant === 'row' ? 'min-w-0 truncate' : 'hidden max-w-[8rem] truncate lg:inline';
  const tagClass = variant === 'row' ? '' : 'hidden 2xl:inline';
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { currentShopId, setCurrentShop, user } = useAuthStore();
  const isOwner = user?.role === 'OWNER' || user?.role === 'SUPER_ADMIN';
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  const { data: shops = [], isLoading } = useQuery({
    queryKey: ['shops-selector'],
    queryFn: shopsApi.list,
    enabled: isOwner,
  });

  // Staff are always locked to their assigned branch.
  useEffect(() => {
    if (!isOwner && user?.shopId && currentShopId !== user.shopId) setCurrentShop(user.shopId);
  }, [isOwner, user?.shopId, currentShopId, setCurrentShop]);

  // Owners start on the main branch.
  useEffect(() => {
    if (isOwner && !currentShopId && shops.length > 0) {
      const main = shops.find((s) => s.isMain && s.isActive) || shops.find((s) => s.isActive);
      if (main) setCurrentShop(main.id);
    }
  }, [isOwner, shops, currentShopId, setCurrentShop]);

  if (!isOwner) {
    const assigned = user?.assignedShop;
    if (!assigned) {
      return (
        <div className={cn(TRIGGER, 'border-amber-200 bg-amber-50 text-amber-800')}>
          <Lock className="h-4 w-4" /> <span>{t('No branch assigned')}</span>
        </div>
      );
    }
    return (
      <div className={cn(TRIGGER, 'cursor-default border-slate-200 bg-white text-slate-800', variant === 'row' && 'w-full')}
        title={t('Only the owner can switch branches')}>
        <Store className="h-4 w-4 shrink-0 text-brand-600" />
        <span className={nameClass}>{assigned.name}</span>
        {assigned.isMain && <Tag className={tagClass}>{t('Main')}</Tag>}
        <Lock className="ms-auto h-3.5 w-3.5 shrink-0 text-slate-400" aria-label={t('Locked')} />
      </div>
    );
  }

  if (isLoading) return <div className={cn('h-9 animate-pulse rounded-lg bg-slate-100', variant === 'row' ? 'w-full' : 'w-24 lg:w-40')} />;

  const activeShops = shops.filter((s) => s.isActive);
  const isAll = currentShopId === ALL_SHOPS;
  const currentShop = shops.find((s) => s.id === currentShopId);

  if (activeShops.length === 0) {
    return (
      <Link to="/shops" className={cn(TRIGGER, 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100')}>
        <Plus className="h-4 w-4" /> {' '}{t('Add branch')}
      </Link>
    );
  }

  const select = (shopId: string, name: string) => {
    setCurrentShop(shopId);
    setOpen(false);
    toast.success(t('Switched to {{name}}', { name }), {
      description: shopId === ALL_SHOPS ? t('Reports and lists now combine every branch.') : t('POS, cash register and reports now use this branch.'),
    });
  };

  return (
    <div ref={ref} className={cn('relative', variant === 'row' && 'w-full')}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={t('Switch branch')}
        className={cn(
          TRIGGER,
          variant === 'row' && 'w-full',
          open ? 'border-brand-300 bg-brand-50 text-slate-900'
            : isAll ? 'border-violet-200 bg-violet-50 text-violet-800 hover:border-violet-300'
              : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300',
        )}
      >
        {isAll ? <Layers className="h-4 w-4 shrink-0 text-violet-600" /> : <Store className="h-4 w-4 shrink-0 text-brand-600" />}
        <span className={nameClass}>{isAll ? t('All Shops') : currentShop?.name || t('Select branch')}</span>
        {isAll && <Tag tone="violet" className={tagClass}>{activeShops.length}</Tag>}
        {!isAll && currentShop?.isMain && <Tag className={tagClass}>{t('Main')}</Tag>}
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform', variant === 'row' && 'ms-auto', open && 'rotate-180')} />
      </button>

      <Panel open={open} onClose={close} widthClass="sm:w-[21rem]" label={t('Switch branch')}>
        <div className="px-4 pb-2 pt-3">
          <h2 className="text-[0.9375rem] font-semibold text-slate-900">{t('Branches')}</h2>
          <p className="text-[0.75rem] text-slate-500">{t('{{count}} active branch{{value}}', { count: activeShops.length, value: activeShops.length !== 1 ? t('es') : '' })}</p>
        </div>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2 pt-0 sm:max-h-[24rem]" role="listbox" aria-label={t('Branches')}>
          {activeShops.length > 1 && (
            <ShopOption
              active={isAll}
              icon={<Layers className="h-[1.125rem] w-[1.125rem]" />}
              iconClass={isAll ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-600'}
              title={t('All Shops')}
              subtitle={t('Combined view of {{count}} branches. Selling still needs one branch.', { count: activeShops.length })}
              onClick={() => select(ALL_SHOPS, t('All Shops'))}
            />
          )}
          {activeShops.map((shop) => {
            const active = shop.id === currentShopId;
            return (
              <ShopOption
                key={shop.id}
                active={active}
                icon={<Store className="h-[1.125rem] w-[1.125rem]" />}
                iconClass={active ? 'bg-brand-600 text-brand-fg' : 'bg-slate-100 text-slate-500'}
                title={shop.name}
                tags={<>{shop.isMain && <Tag>{t('Main')}</Tag>}{shop.type && shop.type !== 'SHOP' && <Tag tone="neutral">{shop.type}</Tag>}</>}
                subtitle={shop.address ? <span className="inline-flex min-w-0 items-center gap-1"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{shop.address}</span></span> : undefined}
                onClick={() => select(shop.id, shop.name)}
              />
            );
          })}
        </div>

        <Link to="/shops" onClick={close}
          className="flex items-center gap-2 border-t border-slate-200 px-4 py-2.5 text-[0.8125rem] font-semibold text-slate-700 transition hover:bg-slate-50">
          <Plus className="h-4 w-4 text-brand-600" /> {' '}{t('Manage branches')}
        </Link>
      </Panel>
    </div>
  );
}

function ShopOption({ active, icon, iconClass, title, tags, subtitle, onClick }: {
  active: boolean; icon: React.ReactNode; iconClass: string; title: string; tags?: React.ReactNode; subtitle?: React.ReactNode; onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onClick}
      className={cn('flex w-full items-center gap-3 rounded-xl p-2.5 text-start transition', active ? 'bg-brand-50 ring-1 ring-inset ring-brand-200' : 'hover:bg-slate-50')}
    >
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', iconClass)}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[0.875rem] font-semibold text-slate-900">{title}</span>
          {tags}
        </span>
        {subtitle && <span className="mt-0.5 block truncate text-[0.75rem] text-slate-500">{subtitle}</span>}
      </span>
      {active && <Check className="h-4 w-4 shrink-0 text-brand-600" aria-label={t('Selected')} />}
    </button>
  );
}
