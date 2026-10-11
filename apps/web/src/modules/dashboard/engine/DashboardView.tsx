/**
 * Renders a dashboard from an industry config: header, the user's widgets
 * in their chosen order, and the Customize and Guide dialogs.
 *
 * Widgets marked `sensitive` are left out while cost is locked or the user
 * lacks `cost.view`, so a cashier never sees margins.
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, LayoutGrid, RefreshCw } from 'lucide-react';
import { Button, IconButton } from '@/design-system/components';
import { PrivacyToggle, useCostHidden } from '@core/security/HiddenValue';
import { useAuthStore, useIsAllShops } from '@core/stores/auth.store';
import { EmailVerifyBanner } from '@core/components/auth/EmailVerifyBanner';
import { cn } from '@core/lib/cn';
import { SubscriptionBanner } from '../components/SubscriptionBanner';
import AllShopsDashboard from '../components/AllShopsDashboard';
import { CustomizeDialog } from './CustomizeDialog';
import { GuideDialog } from './GuideDialog';
import { useDashboardLayout } from './useDashboardLayout';
import { WidgetBoundary } from './WidgetBoundary';
import type { DashboardConfig, WidgetSize } from './types';

const SPAN: Record<WidgetSize, string> = {
  full: 'md:col-span-2 lg:col-span-12',
  wide: 'md:col-span-2 lg:col-span-8',
  half: 'lg:col-span-6',
  third: 'lg:col-span-4',
};

function greeting(hour: number) {
  if (hour < 5) return 'Raat ki shift';
  if (hour < 12) return 'Subah bakhair';
  if (hour < 17) return 'Dopahar bakhair';
  if (hour < 20) return 'Shaam bakhair';
  return 'Raat bakhair';
}

export function DashboardView({ config }: { config: DashboardConfig }) {
  const isAllShops = useIsAllShops();
  if (isAllShops) return <AllShopsDashboard />;
  return <ShopDashboard config={config} />;
}

function ShopDashboard({ config }: { config: DashboardConfig }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const shopName = useAuthStore((s) => s.user?.assignedShop?.name);
  const costHidden = useCostHidden();
  const layout = useDashboardLayout(config.widgets);
  const [customizing, setCustomizing] = useState(false);
  const [guide, setGuide] = useState(false);
  const fetching = useIsFetching() > 0;

  const refresh = useCallback(() => qc.refetchQueries({ type: 'active' }), [qc]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return;
      if (document.querySelector('[role="dialog"]')) return;
      const k = e.key.toLowerCase();
      if (k === 'r') refresh();
      if (k === 'g' && config.guide) setGuide(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [refresh, config.guide]);

  const now = new Date();
  const firstName = user?.fullName?.split(' ')[0];
  const dateLine = new Intl.DateTimeFormat('en-PK', { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  const visible = layout.items.filter((i) => i.visible && !(i.widget.sensitive && costHidden));
  const Primary = config.primaryAction.icon;

  return (
    <div className="mx-auto w-full max-w-[96rem] space-y-4 pb-10">
      <EmailVerifyBanner />
      <SubscriptionBanner />

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.8125rem] font-medium text-slate-500">
            {config.label}{shopName && <> · {shopName}</>} · {dateLine}
          </p>
          <h1 className="mt-0.5 truncate text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">
            {greeting(now.getHours())}{firstName ? `, ${firstName}` : ''}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PrivacyToggle compact />
          {config.guide && (
            <IconButton label="Ye safha kya batata hai (G)" variant="secondary" onClick={() => setGuide(true)}>
              <GraduationCap className="h-4 w-4" />
            </IconButton>
          )}
          <IconButton label="Taaza karein (R)" variant="secondary" onClick={refresh}>
            <RefreshCw className={cn('h-4 w-4', fetching && 'animate-spin')} />
          </IconButton>
          <Button variant="secondary" leftIcon={<LayoutGrid className="h-4 w-4" />} onClick={() => setCustomizing(true)}>
            <span className="hidden sm:inline">Customize</span>
            <span className="sr-only sm:hidden">Customize</span>
          </Button>
          <Button leftIcon={<Primary className="h-4 w-4" />} onClick={() => navigate(config.primaryAction.to)}>
            {config.primaryAction.label}
          </Button>
        </div>
      </header>

      <div className="grid grid-flow-row-dense grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
        {visible.map(({ widget }) => (
          <div key={widget.id} className={cn('min-w-0', SPAN[widget.size])}>
            <WidgetBoundary title={widget.title}>
              <widget.Component />
            </WidgetBoundary>
          </div>
        ))}
      </div>

      {visible.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-[0.875rem] text-slate-600">Sab hisse chhupe hue hain.</p>
          <Button className="mt-3" variant="secondary" onClick={() => setCustomizing(true)}>Hisse chunein</Button>
        </div>
      )}

      <CustomizeDialog
        open={customizing}
        onClose={() => setCustomizing(false)}
        items={layout.items}
        costHidden={costHidden}
        onVisible={layout.setVisible}
        onMove={layout.move}
        onReset={layout.reset}
        canReset={layout.isCustomized}
      />
      {config.guide && <GuideDialog open={guide} onClose={() => setGuide(false)} items={config.guide} />}
    </div>
  );
}
