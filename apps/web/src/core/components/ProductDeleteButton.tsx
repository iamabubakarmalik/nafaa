import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { confirmDialog } from '@/design-system/components';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { forceRefreshProducts } from '@core/lib/offline/offlineProducts';
import { t } from '@core/i18n';

/**
 * Delete button for a product, shared by every products page.
 *
 * Asks once, then deletes. A product that was ever sold or bought is never
 * deleted by the server; it is switched off (inactive) and its sales,
 * purchases and stock records stay.
 */
export function ProductDeleteButton({
  id,
  name,
  onDeleted,
  className,
  size = 'sm',
}: {
  id: string;
  name: string;
  onDeleted?: () => void;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const queryClient = useQueryClient();

  const remove = useMutation({
    mutationFn: () => productsApi.remove(id, false),
    onSuccess: (r: any) => {
      if (r?.softDeleted) toast.info(t('"{{name}}" band kar diya', { name }), { description: t('Is ki sale ya purchase hui hai, is liye record rehta hai.') });
      else toast.success(t('"{{name}}" hata diya', { name }));
      queryClient.invalidateQueries();
      // The POS offline cache too, so the product does not linger at the counter.
      forceRefreshProducts().catch(() => {});
      onDeleted?.();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || t('Hataya nahi ja saka')),
  });

  const ask = async () => {
    const ok = await confirmDialog({
      title: t('"{{name}}" hatayein?', { name }),
      text: t('Jis cheez ki sale ya purchase hui ho wo mitti nahi, sirf band hoti hai — purane bill aur stock record salamat rehte hain.'),
      yes: 'Hatayein',
      danger: true,
    });
    if (ok) remove.mutate();
  };

  const btnSize = size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-10 px-3 rounded-xl gap-1.5 text-xs font-semibold';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void ask();
      }}
      disabled={remove.isPending}
      title={t('Hatayein')}
      className={className ?? `${btnSize} bg-rose-50 hover:bg-rose-100 text-rose-600 inline-flex items-center justify-center transition disabled:opacity-50`}
    >
      <Trash2 className="h-3.5 w-3.5" />
      {size === 'md' && <span>{t('Hatayein')}</span>}
    </button>
  );
}
