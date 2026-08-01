import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Barcode, Search, CheckCircle2, Shield, Package } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { serialTrackingApi } from '../../api/serial-tracking.api';
import type { Product } from '@modules/inventory/products/api/products.api';

interface Props {
  product: Product;
  profile?: any;
  onConfirm: (serial: any) => void;
  onClose: () => void;
}

export function SerialPickerModal({ product, profile, onConfirm, onClose }: Props) {
  const [search, setSearch] = useState('');

  const { data: serials = [], isLoading } = useQuery({
    queryKey: ['serials-for-pos', product.id],
    queryFn: () => serialTrackingApi.list({ productId: product.id, status: 'IN_STOCK' }),
  });

  const filtered = search.trim()
    ? serials.filter((s: any) =>
        s.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
        (s.imei || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.macAddress || '').toLowerCase().includes(search.toLowerCase())
      )
    : serials;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in duration-200">

        <div className="shrink-0 bg-gradient-to-br from-slate-950 via-blue-900 to-cyan-700 text-white px-5 py-4 flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-white/15 overflow-hidden shrink-0 flex items-center justify-center">
            {product.images?.[0]?.url ? (
              <img src={product.images[0].url} alt="" className="w-full h-full object-cover" />
            ) : (
              <Package className="h-8 w-8 text-white/70" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase font-extrabold text-white/70 tracking-wider inline-flex items-center gap-1">
              <Barcode className="h-3 w-3" /> Select Serial / IMEI
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold leading-tight truncate">{product.name}</h3>
            <div className="text-sm font-bold text-cyan-200">
              Available: {serials.length} pcs • {formatPKR(product.price)}
            </div>
          </div>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="shrink-0 p-4 border-b-2 border-slate-100">
          <div className="relative">
            <Search className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by serial / IMEI / MAC..."
              className="h-12 w-full rounded-xl border-2 border-slate-200 bg-white pl-10 pr-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {isLoading ? (
            <div className="text-center py-12 text-sm text-slate-500 font-semibold">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Barcode className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <p className="font-extrabold text-slate-700">No serials available</p>
              <p className="text-xs text-slate-500 font-semibold mt-1">Add serials from product page</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((s: any) => (
                <button key={s.id} onClick={() => onConfirm(s)}
                  className="w-full rounded-2xl border-2 border-slate-200 hover:border-blue-500 hover:shadow-lg p-3 flex items-center gap-3 transition group active:scale-[0.98]">
                  <div className="h-11 w-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition">
                    <Barcode className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="font-mono font-extrabold text-slate-900 text-sm truncate">{s.serialNumber}</div>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      {s.imei && (
                        <span className="text-[10px] font-mono text-slate-600">IMEI: {s.imei}</span>
                      )}
                      {s.macAddress && (
                        <span className="text-[10px] font-mono text-slate-600">MAC: {s.macAddress}</span>
                      )}
                    </div>
                    {s.warrantyEndDate && (
                      <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-700">
                        <Shield className="h-2.5 w-2.5" /> Warranty until {new Date(s.warrantyEndDate).toLocaleDateString('en-PK')}
                      </div>
                    )}
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-blue-500 opacity-0 group-hover:opacity-100 transition shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
