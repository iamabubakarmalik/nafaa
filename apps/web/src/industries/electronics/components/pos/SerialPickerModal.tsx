import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Barcode, Search, CheckCircle2, Shield } from 'lucide-react';
import { Badge, EmptyState, Input, Modal, Skeleton } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { serialTrackingApi } from '../../api/serial-tracking.api';
import type { Product } from '@modules/inventory/products/api/products.api';

interface Props {
  product: Product;
  /** Serial ids already on the bill; they are not offered again. */
  taken?: Set<string>;
  onConfirm: (serial: any) => void;
  onClose: () => void;
}

export function SerialPickerModal({ product, taken, onConfirm, onClose }: Props) {
  const [search, setSearch] = useState('');

  const { data: all = [], isLoading } = useQuery({
    queryKey: ['serials-for-pos', product.id],
    // Always refetch at the counter so a sold unit is never offered.
    staleTime: 0,
    queryFn: () => serialTrackingApi.list({ productId: product.id, status: 'IN_STOCK' }),
  });
  const serials = taken?.size ? all.filter((s) => !taken.has(s.id)) : all;

  const filtered = search.trim()
    ? serials.filter((s: any) =>
        s.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
        (s.imei || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.macAddress || '').toLowerCase().includes(search.toLowerCase())
      )
    : serials;

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={product.name}
      description={`Serial / IMEI chunein · Mojood: ${serials.length} pcs · ${formatPKR(product.price)}`}
    >
      <div className="sticky -top-4 z-10 -mx-5 -mt-4 mb-3 border-b border-slate-100 bg-white px-5 py-3">
        <Input
          data-autofocus
          size="lg"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Serial / IMEI / MAC se dhoondein"
          leftIcon={<Search className="h-5 w-5" />}
        />
      </div>

      <div>
        {isLoading ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[4.25rem] rounded-2xl" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Barcode className="h-6 w-6" />} title="Koi serial stock me nahi" description="Purchase ya product page se serial daalein" />
        ) : (
          <div className="space-y-2">
            {filtered.map((s: any) => (
              <button key={s.id} type="button" onClick={() => onConfirm(s)}
                className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 p-3 transition hover:border-brand-500 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition group-hover:bg-brand-600 group-hover:text-brand-fg">
                  <Barcode className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1 text-left">
                  <div className="truncate font-mono text-sm font-semibold text-slate-900">{s.serialNumber}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    {s.imei && <span className="font-mono text-[0.6875rem] text-slate-600">IMEI: {s.imei}</span>}
                    {s.macAddress && <span className="font-mono text-[0.6875rem] text-slate-600">MAC: {s.macAddress}</span>}
                  </div>
                  {s.warrantyEndDate && (
                    <Badge size="xs" variant="success" className="mt-1 gap-1">
                      <Shield className="h-3 w-3" /> Warranty {new Date(s.warrantyEndDate).toLocaleDateString('en-PK')} tak
                    </Badge>
                  )}
                </div>
                <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-500 opacity-0 transition group-hover:opacity-100" />
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
