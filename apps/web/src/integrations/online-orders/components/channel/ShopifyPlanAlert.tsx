/**
 * Shown on a Shopify channel that was installed from the Shopify App Store
 * and has no Shopify plan yet. Those stores pay for the connection through
 * Shopify App Pricing, so orders and stock wait until a plan is picked.
 */

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { Alert, Button } from '@/design-system/components';
import { apiErrorMessage, onlineOrdersApi, type WebsiteOverview } from '../../api/online-orders.api';

export function ShopifyPlanAlert({ id, onChange }: { id: string; onChange: (d: WebsiteOverview) => void }) {
  const open = useMutation({
    mutationFn: () => onlineOrdersApi.shopifyPlan(id),
    onSuccess: (r) => {
      if (r.plan?.active) {
        toast.success('Shopify plan chal raha hai');
        onlineOrdersApi.channel(id).then(onChange).catch(() => null);
        return;
      }
      if (r.pricingUrl) window.open(r.pricingUrl, '_blank', 'noopener');
      else toast.error('Shopify store ka pata nahi mila. Setup se dobara jorein.');
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const check = useMutation({
    mutationFn: () => onlineOrdersApi.shopifyPlan(id),
    onSuccess: (r) => {
      if (r.plan?.active) toast.success('Shopify plan mil gaya. Orders aur stock ab chalenge.');
      else toast.message('Abhi plan nahi mila. Shopify me plan chunne ke baad dobara check karein.');
      onlineOrdersApi.channel(id).then(onChange).catch(() => null);
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <Alert tone="warning" title="Shopify me Nafaa ka plan chunein"
      action={(
        <div className="flex flex-wrap gap-2">
          <Button size="xs" loading={open.isPending} rightIcon={<ExternalLink className="h-3.5 w-3.5" />} onClick={() => open.mutate()}>
            Plan chunein
          </Button>
          <Button size="xs" variant="outline" loading={check.isPending} leftIcon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => check.mutate()}>
            Dobara check karein
          </Button>
        </div>
      )}>
      Ye store Shopify App Store se jura hai, is liye is ka plan Shopify ke bill me lagta hai. Plan chunne tak orders aur stock Nafaa me nahi aayenge.
    </Alert>
  );
}
