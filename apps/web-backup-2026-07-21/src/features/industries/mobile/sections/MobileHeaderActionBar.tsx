import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Smartphone, Plus, ExternalLink, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { IndustrySectionProps } from '@/features/industries/_shared/types/section.types';
import { imeiApi } from '@/features/industries/mobile/api/imei.api';
import { BulkImeiAddModal } from '@/features/industries/mobile/components/BulkImeiAddModal';

export function MobileHeaderActionBar({
  productId,
  form,
  isEdit,
}: IndustrySectionProps) {
  const [showImeiAdd, setShowImeiAdd] = useState(false);

  const { data: imeis = [], refetch } = useQuery({
    queryKey: ['product-imeis', productId],
    queryFn: () => imeiApi.listByProduct(productId!),
    enabled: !!productId && isEdit,
  });

  // Only show when editing existing product
  if (!isEdit || !productId) return null;

  const inStock = imeis.filter((i) => i.status === 'IN_STOCK').length;
  const total = imeis.length;
  const ptaApproved = imeis.filter((i: any) => i.ptaStatus === 'APPROVED').length;

  return (
    <>
      {showImeiAdd && (
        <BulkImeiAddModal
          productId={productId}
          productName={form.name}
          defaultCostPrice={form.costPrice ?? 0}
          onSuccess={() => refetch()}
          onClose={() => setShowImeiAdd(false)}
        />
      )}

      <div className="mt-4 pt-4 border-t border-white/15 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur">
            <Smartphone className="h-3.5 w-3.5 text-blue-200" />
            <div>
              <div className="text-[9px] uppercase tracking-wider text-white/70 font-bold">IMEI Stock</div>
              <div className="text-sm font-extrabold text-white">
                {inStock} <span className="text-white/60 text-xs font-bold">/ {total}</span>
              </div>
            </div>
          </div>

          {total > 0 && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 backdrop-blur border border-emerald-400/30">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-200" />
              <div>
                <div className="text-[9px] uppercase tracking-wider text-emerald-200 font-bold">PTA Approved</div>
                <div className="text-sm font-extrabold text-white">
                  {ptaApproved}
                  <span className="text-white/60 text-xs font-bold">
                    {total > 0 && ` (${Math.round((ptaApproved / total) * 100)}%)`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <Link
            to={`/products/${productId}/imei`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur text-white text-xs font-bold transition"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Full IMEI Inventory
          </Link>
          <button
            onClick={() => setShowImeiAdd(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-blue-900 hover:bg-slate-100 text-xs font-extrabold transition shadow-md"
          >
            <Plus className="h-3.5 w-3.5" /> Add IMEIs
          </button>
        </div>
      </div>
    </>
  );
}
