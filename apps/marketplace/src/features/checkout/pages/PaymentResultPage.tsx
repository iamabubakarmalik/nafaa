import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2, XCircle, Clock, ShoppingBag, Home, RefreshCw,
  Package, Star, MessageCircle,
} from 'lucide-react';
import { ordersApi } from '@/features/orders/api/orders.api';
import { Button, Card } from '@/ui';
import { formatPrice } from '@/lib/format';

export default function PaymentResultPage() {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const [params] = useSearchParams();

  const status = params.get('status'); // success | failed | pending
  const paymentRef = params.get('ref');

  const { data: order } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.detail(orderId!),
    enabled: !!orderId,
    refetchInterval: status === 'pending' ? 3000 : false,
  });

  const isSuccess = status === 'success' || order?.paymentStatus === 'PAID';
  const isFailed = status === 'failed' || order?.paymentStatus === 'FAILED';
  const isPending = !isSuccess && !isFailed;

  return (
    <>
      <Helmet>
        <title>
          {isSuccess ? 'Payment Success' : isFailed ? 'Payment Failed' : 'Payment Processing'} — Nafaa Bazaar
        </title>
      </Helmet>

      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Card className={`p-6 md:p-8 text-center space-y-4 border-2 ${
            isSuccess ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30' :
            isFailed ? 'border-danger bg-danger/5' :
            'border-warning bg-warning/5'
          }`}>
            {isSuccess ? (
              <>
                <div className="h-20 w-20 mx-auto rounded-full bg-brand-500 flex items-center justify-center animate-scale-in shadow-brand">
                  <CheckCircle2 className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-black">Payment successful!</h1>
                  <p className="text-sm text-content-muted mt-2">
                    Your order has been confirmed and is being processed
                  </p>
                </div>
              </>
            ) : isFailed ? (
              <>
                <div className="h-20 w-20 mx-auto rounded-full bg-danger flex items-center justify-center animate-scale-in">
                  <XCircle className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-black">Payment failed</h1>
                  <p className="text-sm text-content-muted mt-2">
                    Something went wrong with your payment. Please try again.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="h-20 w-20 mx-auto rounded-full bg-warning flex items-center justify-center animate-pulse-soft">
                  <Clock className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-black">Payment processing</h1>
                  <p className="text-sm text-content-muted mt-2">
                    We're waiting for payment confirmation. This usually takes a few seconds.
                  </p>
                </div>
              </>
            )}

            {order && (
              <div className="pt-4 border-t border-border space-y-2 text-sm text-left">
                <div className="flex justify-between">
                  <span className="text-content-muted">Order #</span>
                  <span className="font-bold">{order.orderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-content-muted">Amount</span>
                  <span className="font-black text-brand-600">{formatPrice(order.total)}</span>
                </div>
                {paymentRef && (
                  <div className="flex justify-between text-xs">
                    <span className="text-content-muted">Transaction</span>
                    <span className="font-mono">{paymentRef}</span>
                  </div>
                )}
              </div>
            )}
          </Card>

          <div className="grid grid-cols-2 gap-3">
            {isSuccess && order && (
              <>
                <Button
                  variant="gradient"
                  size="lg"
                  fullWidth
                  onClick={() => navigate(`/orders/${order.id}`)}
                  leftIcon={<Package className="h-4 w-4" />}
                >
                  Track order
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onClick={() => navigate('/')}
                  leftIcon={<Home className="h-4 w-4" />}
                >
                  Home
                </Button>
              </>
            )}
            {isFailed && (
              <>
                <Button
                  variant="danger"
                  size="lg"
                  fullWidth
                  onClick={() => navigate('/checkout')}
                  leftIcon={<RefreshCw className="h-4 w-4" />}
                >
                  Try again
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onClick={() => navigate('/support')}
                  leftIcon={<MessageCircle className="h-4 w-4" />}
                >
                  Get help
                </Button>
              </>
            )}
            {isPending && (
              <>
                <Button
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onClick={() => window.location.reload()}
                  leftIcon={<RefreshCw className="h-4 w-4" />}
                >
                  Check again
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  fullWidth
                  onClick={() => navigate('/orders')}
                >
                  My orders
                </Button>
              </>
            )}
          </div>

          {isSuccess && (
            <Card className="p-4 text-center">
              <Star className="h-6 w-6 text-accent-500 mx-auto mb-1" />
              <p className="text-xs text-content-muted">
                <strong>Thank you for shopping with Nafaa!</strong>
                <br />
                You earned <span className="text-accent-600 font-black">
                  {Math.floor(Number(order?.total || 0) * 0.02)} loyalty points
                </span> on this order.
              </p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
