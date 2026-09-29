import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { apiErrorMessage, onlineOrdersApi } from '../api/online-orders.api';
import { Btn, Card, EmptyState, Page } from '../components/ui/kit';

/**
 * Shopify admin → Apps → "Nafaa" yahan khulta hai (App URL: /shopify?shop=…).
 * Store pehle se jura ho → seedha us ke channel page par (sab controls).
 * Na jura ho → wahi store bhar kar connect page.
 */
export default function ShopifyAppPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const shop = params.get('shop') ?? '';

  const { data, error, isLoading } = useQuery({
    queryKey: ['shopify-lookup', shop],
    queryFn: () => onlineOrdersApi.shopifyLookup(shop),
    enabled: !!shop,
    retry: false,
  });

  useEffect(() => {
    if (!data) return;
    if (data.channelId) navigate(`/online-store/channels/${data.channelId}${data.connected ? '' : '?tab=overview'}`, { replace: true });
    else navigate(`/online-store/connect?platform=shopify&shop=${encodeURIComponent(data.shop)}`, { replace: true });
  }, [data, navigate]);

  if (!shop) {
    return (
      <Page title="Shopify" narrow>
        <Card>
          <EmptyState title="Store ka naam nahi mila" action={<Link to="/online-store/connect?platform=shopify"><Btn variant="primary">Shopify jorein</Btn></Link>}>
            Shopify admin se "Nafaa" app kholein, ya yahan se store jorein.
          </EmptyState>
        </Card>
      </Page>
    );
  }

  return (
    <Page title="Shopify" narrow>
      <Card>
        {isLoading || data ? (
          <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> {shop} ka Nafaa channel dhoond rahe hain…
          </div>
        ) : (
          <EmptyState title="Store nahi khula" action={<Link to="/online-store/connect?platform=shopify"><Btn variant="primary">Shopify jorein</Btn></Link>}>
            {apiErrorMessage(error)}
          </EmptyState>
        )}
      </Card>
    </Page>
  );
}
