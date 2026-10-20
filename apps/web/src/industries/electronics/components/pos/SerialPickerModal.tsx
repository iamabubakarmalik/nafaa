import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Barcode, Search, CheckCircle2, Shield } from 'lucide-react';
import { Input, Modal } from '@/design-system/components';
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
          <div className="text-center py-12 text-sm text-slate-500 font-semibold">Aa rahe hain…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Barcode className="h-12 w-12 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">Koi serial stock mein nahi</p>
            <p className="text-xs text-slate-500 font-semibold mt-1">Purchase ya product page se serial daalein</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((s: any) => (
              <button key={s.id} type="button" onClick={() => onConfirm(s)}
                className="w-full rounded-2xl border border-slate-200 hover:border-blue-500 hover:shadow-lg p-3 flex items-center gap-3 transition group ">
                <div className="h-11 w-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition">
                  <Barcode className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-mono font-semibold text-slate-900 text-sm truncate">{s.serialNumber}</div>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    {s.imei && (
                      <span className="text-[0.6875rem] font-mono text-slate-600">IMEI: {s.imei}</span>
                    )}
                    {s.macAddress && (
                      <span className="text-[0.6875rem] font-mono text-slate-600">MAC: {s.macAddress}</span>
                    )}
                  </div>
                  {s.warrantyEndDate && (
                    <div className="mt-1 inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-blue-700">
                      <Shield className="h-2.5 w-2.5" /> Warranty {new Date(s.warrantyEndDate).toLocaleDateString('en-PK')} tak
                    </div>
                  )}
                </div>
                <CheckCircle2 className="h-5 w-5 text-blue-500 opacity-0 group-hover:opacity-100 transition shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
