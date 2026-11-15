/**
 * Market orders live in the Online Orders board next to every other sales
 * channel. This route opens that board filtered to the shop's Market
 * channel; before the shop is published there is no channel yet.
 */

import { Link, Navigate } from 'react-router-dom';
import { Rocket, ShoppingBag, Store } from 'lucide-react';
import { Button, EmptyState, PageHero, PageShell, Skeleton } from '@/design-system/components';
import { t } from '@core/i18n';
import { useMarketProfile } from '../hooks/useMarket';

export default function MarketOrdersPage() {
  const profileQ = useMarketProfile();
  const id = profileQ.data?.integrationId;

  if (profileQ.isLoading) return <PageShell><Skeleton className="h-40 rounded-3xl" /></PageShell>;
  if (id) return <Navigate to={`/online-orders?channel=${encodeURIComponent(id)}`} replace />;

  const live = !!profileQ.data?.isListedOnMarketplace;
  return (
    <PageShell>
      <PageHero
        back="/market" backLabel={t('Market')}
        title={t('Market orders')}
        chip={<><ShoppingBag /> {t('Online Orders board me')}</>}
        stats={[
          { label: t('Dukaan'), value: live ? t('Live') : t('Abhi live nahi') },
          { label: t('Orders'), value: profileQ.data?.totalOrders ?? 0 },
          { label: t('Followers'), value: profileQ.data?.followerCount ?? 0 },
        ]}
      />
      <EmptyState
        icon={<Store className="h-6 w-6" />}
        title={t('Pehle dukaan publish karein')}
        description={t('Dukaan publish hote hi Market ke orders Online Orders board me aane lagenge, baqi channels ke saath.')}
        action={<Link to="/market"><Button leftIcon={<Rocket className="h-4 w-4" />}>{t('Market home')}</Button></Link>}
      />
    </PageShell>
  );
}
