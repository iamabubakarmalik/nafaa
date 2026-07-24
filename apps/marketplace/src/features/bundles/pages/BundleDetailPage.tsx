import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowLeft, Package, ShoppingBag, Sparkles, CheckCircle2,
  Store, Tag, Gift,
} from 'lucide-react';
import { bundlesApi } from '../api/bundles.api';
import { Button, Card, Badge, EmptyState } from '@/ui';
import { formatPrice } from '@/lib/format';
import { toast } from 'sonner';

export default function BundleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: bundle, isLoading } = useQuery({
    queryKey: ['bundle', id],
    queryFn: () => bundlesApi.detail(id!),
    enabled: !!id,
  });

  const addBundleMutation = useMutation({
    mutationFn: () => bundlesApi.addToCart(id!),
    onSuccess: () => {
      toast.success('Bundle added to cart! 🎁');
      navigate('/cart');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  if (isLoading) return <div className="skeleton h-96 rounded-3xl" />;
  if (!bundle) return <EmptyState icon={Package} title="Bundle not found" />;

  const savings = Number(bundle.regularTotal) - Number(bundle.bundlePrice);
  const savingsPct = Math.round((savings / Number(bundle.regularTotal)) * 100);

  return (
    <>
      <Helmet><title>{bundle.title} — Bundle | Nafaa Bazaar</title></Helmet>

      <div className="max-w-4xl mx-auto space-y-5">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-content-muted hover:text-content font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Hero */}
        <Card className="p-6 bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 text-white border-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-white/10 blur-3xl -translate-y-1/4 translate-x-1/4" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur border border-white/20 px-3 py-1 text-xs font-black mb-3">
              <Package className="h-3.5 w-3.5" />
              Bundle deal
            </div>
            <h1 className="text-2xl md:text-3xl font-black">{bundle.title}</h1>
            {bundle.description && (
              <p className="text-white/90 text-sm md:text-base mt-1">{bundle.description}</p>
            )}
          </div>
        </Card>

        {/* Price summary */}
        <Card className="p-5">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-2xs font-black text-content-muted uppercase">Regular total</div>
              <div className="text-lg line-through text-content-subtle mt-1">{formatPrice(bundle.regularTotal)}</div>
            </div>
            <div>
              <div className="text-2xs font-black text-content-muted uppercase">Bundle price</div>
              <div className="text-2xl font-black text-brand-600 mt-1">{formatPrice(bundle.bundlePrice)}</div>
            </div>
            <div>
              <div className="text-2xs font-black text-content-muted uppercase">You save</div>
              <div className="text-lg font-black text-danger mt-1">{formatPrice(savings)}</div>
              <div className="text-2xs text-content-muted">({savingsPct}%)</div>
            </div>
          </div>
        </Card>

        {/* Items */}
        <Card className="p-5">
          <h3 className="font-black text-lg mb-3 flex items-center gap-2">
            <Gift className="h-5 w-5 text-purple-600" />
            What's included ({bundle.items?.length})
          </h3>
          <div className="divide-y divide-border">
            {bundle.items?.map((item: any) => (
              <Link
                key={item.id}
                to={`/products/${item.productId}`}
                className="flex gap-3 py-3 first:pt-0 last:pb-0 group"
              >
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
                  <div className="font-bold text-sm line-clamp-2 group-hover:text-brand-600 transition">
                    {item.productName}
                  </div>
                  <div className="text-2xs text-content-muted mt-0.5">Qty: {item.quantity}</div>
                </div>
                <div className="font-black text-sm text-content shrink-0">
                  {formatPrice(item.regularPrice)}
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Button
          variant="gradient"
          size="lg"
          fullWidth
          loading={addBundleMutation.isPending}
          onClick={() => addBundleMutation.mutate()}
          leftIcon={<ShoppingBag className="h-5 w-5" />}
        >
          Add bundle to cart · {formatPrice(bundle.bundlePrice)}
        </Button>

        <Card className="p-3 bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
          <div className="text-xs text-content">
            <strong>Bundle benefits:</strong> All items ship together, single checkout, guaranteed compatibility.
          </div>
        </Card>
      </div>
    </>
  );
}
