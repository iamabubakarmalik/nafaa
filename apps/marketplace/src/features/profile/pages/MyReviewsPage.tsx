import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Star, Package, MessageSquare } from 'lucide-react';
import { marketplaceClient, unwrap } from '@/api/client';
import { Card, EmptyState, Button, Badge } from '@/ui';
import { useAuthStore } from '@/stores/auth.store';

export default function MyReviewsPage() {
  const navigate = useNavigate();
  const isAuth = useAuthStore((s) => s.isAuthenticated);

  const { data, isLoading } = useQuery({
    queryKey: ['my-reviews'],
    queryFn: () => marketplaceClient.get('/reviews/mine').then(unwrap<any[]>),
    enabled: isAuth,
    retry: false,
  });

  return (
    <>
      <Helmet><title>My Reviews — Nafaa Bazaar</title></Helmet>

      <div className="max-w-3xl mx-auto space-y-5">
        <button
          onClick={() => navigate('/profile')}
          className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </button>

        <div>
          <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
            <Star className="h-7 w-7 fill-amber-400 text-amber-400" />
            My Reviews
          </h1>
          <p className="text-sm text-content-muted mt-1">Reviews you've posted on products</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-32 rounded-3xl" />
            ))}
          </div>
        ) : !data?.length ? (
          <EmptyState
            icon={MessageSquare}
            title="No reviews yet"
            description="Review products you've bought — help other shoppers make good decisions"
            action={<Button variant="gradient" onClick={() => navigate('/orders')} leftIcon={<Package className="h-4 w-4" />}>Go to orders</Button>}
          />
        ) : (
          <div className="space-y-3">
            {data.map((r: any) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-start gap-3">
                  {r.product?.publicImages?.[0] ? (
                    <Link to={`/products/${r.productId}`} className="shrink-0">
                      <img
                        src={r.product.publicImages[0]}
                        alt=""
                        className="h-16 w-16 rounded-xl object-cover"
                      />
                    </Link>
                  ) : (
                    <div className="h-16 w-16 rounded-xl bg-surface-muted flex items-center justify-center shrink-0">
                      <Package className="h-5 w-5 text-content-subtle" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <Link to={`/products/${r.productId}`}>
                      <h3 className="font-black text-sm line-clamp-1 hover:text-brand-600 transition">
                        {r.product?.publicName || 'Product'}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={s <= r.rating ? 'h-3 w-3 fill-amber-400 text-amber-400' : 'h-3 w-3 text-content-subtle'}
                        />
                      ))}
                      <span className="text-2xs text-content-muted ml-1">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {r.title && <div className="font-bold text-sm mt-2">{r.title}</div>}
                    {r.comment && <p className="text-xs text-content-muted mt-1 line-clamp-3">{r.comment}</p>}
                    {r.replyFromShop && (
                      <div className="mt-2 p-2 rounded-lg bg-brand-50 dark:bg-brand-950/30 border-l-2 border-brand-500">
                        <div className="text-2xs font-black text-brand-700 dark:text-brand-400 uppercase mb-0.5">Shop replied</div>
                        <p className="text-2xs text-content">{r.replyFromShop}</p>
                      </div>
                    )}
                  </div>
                  {r.isVerifiedPurchase && (
                    <Badge variant="brand" size="sm">✓ Verified</Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
