import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Printer, ArrowLeft, MessageCircle, X as XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { salesApi } from '@/api/sales.api';
import { formatPKR } from '@/lib/format';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export default function ReceiptPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['sale-receipt', id],
    queryFn: () => salesApi.getOne(id!),
    enabled: !!id,
  });

  const voidMutation = useMutation({
    mutationFn: (reason: string) => salesApi.voidSale(id!, reason),
    onSuccess: () => {
      toast.success('Sale voided successfully');
      queryClient.invalidateQueries({ queryKey: ['sale-receipt', id] });
      queryClient.invalidateQueries({ queryKey: ['sales-list'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to void sale');
    },
  });

  const handleWhatsAppShare = () => {
    if (!data?.customer?.phone) {
      toast.error('Customer phone not available');
      return;
    }
    const phone = data.customer.phone.replace(/[^0-9]/g, '');
    const items = data.items
      .map((it) => `• ${it.product.name} × ${it.quantity} = Rs ${it.total}`)
      .join('\n');
    const message = `*${data.tenant?.name || 'Receipt'}*\n\nReceipt: ${data.saleNumber}\nDate: ${formatDate(data.soldAt)}\n\n${items}\n\n*Total: Rs ${data.total}*\nPaid: Rs ${data.paidAmount}\n\nShukriya! 🙏`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (isLoading) {
    return <div className="min-h-screen bg-slate-100 p-8 text-slate-600">Loading receipt...</div>;
  }

  if (!data) {
    return <div className="min-h-screen bg-slate-100 p-8 text-slate-600">Receipt not found.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap print:hidden">
          <button
            onClick={() => history.back()}
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleWhatsAppShare}
              disabled={!data.customer?.phone}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </button>

            {data.status !== 'VOIDED' && (
              <button
                onClick={() => {
                  const reason = prompt('Reason for voiding this sale?');
                  if (reason !== null) voidMutation.mutate(reason);
                }}
                disabled={voidMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                <XIcon className="h-4 w-4" /> Void Sale
              </button>
            )}

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              <Printer className="h-4 w-4" />
              Print Receipt
            </button>
          </div>
        </div>

        {data.status === 'VOIDED' && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-700 print:hidden">
            ⚠️ This sale has been <span className="font-bold">VOIDED</span>. Stock and customer credit have been reversed.
          </div>
        )}

        <div className="bg-white shadow-soft rounded-3xl border border-slate-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">
          <div className="px-8 py-8 border-b border-slate-100">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold text-slate-900">{data.tenant?.name || 'Nafaa Shop'}</h1>
                <p className="text-sm text-slate-500 mt-1">
                  {data.tenant?.country || 'Pakistan'} • {data.tenant?.phone || 'No phone'}
                </p>
              </div>

              <div className="text-right">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Receipt</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{data.saleNumber}</div>
                {data.status === 'VOIDED' && (
                  <div className="mt-2 inline-block rounded-full bg-rose-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-700">
                    Voided
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="px-8 py-6 grid sm:grid-cols-2 gap-6 border-b border-slate-100">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Customer</div>
              <div className="mt-2 font-medium text-slate-900">
                {data.customer?.name || 'Walk-in Customer'}
              </div>
            </div>

            <div className="sm:text-right">
              <div className="text-xs uppercase tracking-wide text-slate-400">Date & Payment</div>
              <div className="mt-2 font-medium text-slate-900">{formatDate(data.soldAt)}</div>
              <div className="text-sm text-slate-500 mt-1">{data.paymentMethod}</div>
            </div>
          </div>

          <div className="px-8 py-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="py-3 font-medium">Item</th>
                  <th className="py-3 font-medium">Qty</th>
                  <th className="py-3 font-medium">Price</th>
                  <th className="py-3 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-50">
                    <td className="py-4">
                      <div className="font-medium text-slate-900">{item.product.name}</div>
                      <div className="text-xs text-slate-500">
                        {item.product.sku || item.product.barcode || item.product.unit}
                      </div>
                    </td>
                    <td className="py-4 text-slate-700">{item.quantity}</td>
                    <td className="py-4 text-slate-700">{formatPKR(item.price)}</td>
                    <td className="py-4 text-right font-medium text-slate-900">
                      {formatPKR(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-8 py-6 border-t border-slate-100 bg-slate-50">
            <div className="ml-auto max-w-sm space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium text-slate-900">{formatPKR(data.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Discount</span>
                <span className="font-medium text-slate-900">{formatPKR(data.discount)}</span>
              </div>
              <div className="flex items-center justify-between text-base pt-2 border-t border-slate-200">
                <span className="font-semibold text-slate-900">Total</span>
                <span className="font-bold text-slate-900">{formatPKR(data.total)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Paid</span>
                <span className="font-medium text-slate-900">{formatPKR(data.paidAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Change</span>
                <span className="font-medium text-emerald-700">{formatPKR(data.changeAmount)}</span>
              </div>
            </div>
          </div>

          <div className="px-8 py-5 text-center text-xs text-slate-500 border-t border-slate-100">
            Shukriya! Nafaa POS استعمال karne ka.
          </div>
        </div>
      </div>
    </div>
  );
}
