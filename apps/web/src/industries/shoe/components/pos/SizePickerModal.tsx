import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Ruler, Package, MapPin, CheckCircle2 } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { shoeSizeVariantsApi } from '../../api/size-variants.api';

interface Props {
  product: any;
  onSelect: (variant: any) => void;
  onClose: () => void;
}

export function SizePickerModal({ product, onSelect, onClose }: Props) {
  const { data: variants = [], isLoading } = useQuery({
    queryKey: ['size-variants-picker', product.id],
    queryFn: () => shoeSizeVariantsApi.byProduct(product.id),
  });

  const [widthFilter, setWidthFilter] = useState<string>('all');

  const filtered = widthFilter === 'all' ? variants : variants.filter((v) => v.width === widthFilter);
  const availableWidths = Array.from(new Set(variants.map((v) => v.width)));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        <div className="shrink-0 bg-gradient-to-br from-slate-950 via-orange-900 to-amber-700 text-white px-5 py-4 flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl overflow-hidden bg-white/15 shrink-0 flex items-center justify-center">
            {product.images?.[0]?.url ? (
              <img src={product.images[0].url} className="w-full h-full object-cover" />
            ) : (
              <Ruler className="h-8 w-8" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase font-extrabold text-white/70 tracking-wider">Pick size</div>
            <h3 className="text-xl sm:text-2xl font-extrabold leading-tight truncate">{product.name}</h3>
            <div className="text-lg font-extrabold text-amber-300 mt-1">{formatPKR(product.price)}</div>
          </div>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>

        {availableWidths.length > 1 && (
          <div className="shrink-0 px-4 py-3 border-b-2 border-slate-100 bg-slate-50">
            <div className="text-[10px] uppercase font-extrabold text-slate-600 mb-2">Width</div>
            <div className="flex gap-1.5">
              <button onClick={() => setWidthFilter('all')}
                className={`h-10 px-3 rounded-xl text-xs font-extrabold ${widthFilter === 'all' ? 'bg-orange-600 text-white' : 'bg-white border-2 border-slate-200'}`}>
                All
              </button>
              {availableWidths.map((w) => (
                <button key={w} onClick={() => setWidthFilter(w)}
                  className={`h-10 px-3 rounded-xl text-xs font-extrabold ${widthFilter === w ? 'bg-orange-600 text-white' : 'bg-white border-2 border-slate-200'}`}>
                  {w.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center py-12">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Ruler className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <p className="font-extrabold text-slate-700">No sizes available</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {filtered
                .sort((a, b) => parseFloat(a.size) - parseFloat(b.size))
                .map((v) => {
                  const available = v.stock - v.reservedStock;
                  const isOut = available <= 0;
                  const isLow = !isOut && v.stock <= v.lowStockAlert;
                  return (
                    <button key={v.id} disabled={isOut} onClick={() => onSelect(v)}
                      className={`rounded-2xl border-2 p-3 text-left transition active:scale-95 ${
                        isOut ? 'border-slate-200 bg-slate-100 opacity-50 cursor-not-allowed'
                          : isLow ? 'border-amber-300 bg-amber-50 hover:border-amber-500'
                          : 'border-slate-200 bg-white hover:border-orange-500 hover:shadow-lg'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-700 text-white flex items-center justify-center font-extrabold text-lg shadow">
                          {v.size}
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-extrabold tabular-nums ${isOut ? 'text-rose-700' : isLow ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {available}
                          </div>
                          <div className="text-[9px] font-extrabold text-slate-500">pairs</div>
                        </div>
                      </div>
                      <div className="text-[10px] font-extrabold text-slate-500">{v.sizeSystem} • {v.width.replace(/_/g, ' ')}</div>
                      {v.boxNumber && (
                        <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-mono font-extrabold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                          <Package className="h-2.5 w-2.5" /> {v.boxNumber}
                        </div>
                      )}
                      {v.shelfLocation && (
                        <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-mono font-extrabold text-orange-700">
                          <MapPin className="h-2.5 w-2.5" /> {v.shelfLocation}
                        </div>
                      )}
                      {isOut && <div className="mt-1 text-[10px] font-extrabold text-rose-700 text-center">OUT</div>}
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
