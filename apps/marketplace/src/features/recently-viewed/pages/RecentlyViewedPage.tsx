import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Clock, Trash2, ShoppingBag, Eye } from 'lucide-react';
import { useRecentlyViewedStore } from '@/stores/recentlyViewed.store';
import { Button, Card, EmptyState } from '@/ui';
import { formatPrice, timeAgo } from '@/lib/format';
import { toast } from 'sonner';

export default function RecentlyViewedPage() {
  const navigate = useNavigate();
  const { items, clear } = useRecentlyViewedStore();

  return (
    <>
      <Helmet><title>Recently Viewed — Nafaa Bazaar</title></Helmet>

      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
              <Eye className="h-7 w-7 text-brand-600" />
              Recently Viewed
            </h1>
            <p className="text-sm text-content-muted mt-0.5">Last 20 products you viewed</p>
          </div>
          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { clear(); toast.success('Cleared'); }}
              leftIcon={<Trash2 className="h-4 w-4" />}
              className="text-danger hover:bg-danger/10"
            >
              Clear
            </Button>
          )}
        </div>

        {!items.length ? (
          <EmptyState
            icon={Clock}
            title="No viewed products yet"
            description="Products you view will appear here for quick access"
            action={<Button variant="gradient" onClick={() => navigate('/')}>Browse products</Button>}
          />
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <Link key={item.productId} to={`/products/${item.productId}`}>
                <Card className="p-3 flex items-center gap-3 hover:shadow-soft-lg transition">
                  <div className="h-16 w-16 rounded-xl bg-surface-muted overflow-hidden shrink-0">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <ShoppingBag className="h-5 w-5 text-content-subtle" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm line-clamp-1">{item.name}</div>
                    <div className="text-brand-600 font-black text-sm mt-1">{formatPrice(item.price)}</div>
                    <div className="text-2xs text-content-subtle mt-0.5">Viewed {timeAgo(new Date(item.viewedAt))}</div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
