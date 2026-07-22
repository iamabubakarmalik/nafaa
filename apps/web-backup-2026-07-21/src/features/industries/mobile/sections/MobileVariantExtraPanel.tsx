import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Smartphone, Plus, ShieldCheck, CheckCircle2, AlertOctagon,
  AlertTriangle, Clock, Shield, ExternalLink,
} from 'lucide-react';
import type { IndustrySectionProps } from '@/features/industries/_shared/types/section.types';
import type { ProductVariant } from '@/api/product-variants.api';
import {
  imeiApi,
  type PtaStatus,
  PTA_STATUS_LABELS,
  PTA_STATUS_COLORS,
} from '@/features/industries/mobile/api/imei.api';
import { BulkImeiAddModal } from '@/features/industries/mobile/components/BulkImeiAddModal';

const PTA_ICONS: Record<PtaStatus, any> = {
  APPROVED: CheckCircle2,
  NON_PTA: AlertOctagon,
  PATCH: AlertTriangle,
  PENDING: Clock,
  EXEMPT: Shield,
};

interface Props extends IndustrySectionProps {
  variant: ProductVariant;
}

export function MobileVariantExtraPanel({
  productId,
  variant,
  form,
}: Props) {
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: variantImeis = [], refetch } = useQuery({
    queryKey: ['variant-imeis', variant.id],
    queryFn: () => imeiApi.listByVariant(variant.id),
    enabled: !!variant.id,
  });

  const stats = {
    total: variantImeis.length,
    inStock: variantImeis.filter((i) => i.status === 'IN_STOCK').length,
    sold: variantImeis.filter((i) => i.status === 'SOLD').length,
  };

  // PTA breakdown
  const ptaCounts: Record<PtaStatus, number> = {
    APPROVED: 0, NON_PTA: 0, PATCH: 0, PENDING: 0, EXEMPT: 0,
  };
  variantImeis.forEach((i: any) => {
    const status = (i.ptaStatus || 'PENDING') as PtaStatus;
    ptaCounts[status] = (ptaCounts[status] || 0) + 1;
  });

  if (!productId) return null;

  return (
    <>
      {showAddModal && (
        <BulkImeiAddModal
          productId={productId}
          productName={form.name}
          variantId={variant.id}
          variantName={variant.name}
          defaultCostPrice={variant.costPrice ?? form.costPrice ?? 0}
          onSuccess={() => refetch()}
          onClose={() => setShowAddModal(false)}
        />
      )}

      <div className="mt-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 p-3">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <Smartphone className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider text-blue-700 font-bold">
                IMEI Stock for this variant
              </div>
              <div className="text-xs font-extrabold text-blue-900">
                {variant.name}
                {variant.color && (
                  <span className="text-violet-700 ml-1">· {variant.color}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-1.5">
            <Link
              to={`/products/${productId}/imei?variant=${variant.id}`}
              className="inline-flex items-center gap-1 px-2 h-8 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-bold transition"
            >
              <ExternalLink className="h-3 w-3" />
              View
            </Link>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-extrabold transition"
            >
              <Plus className="h-3 w-3" />
              Add IMEIs
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="rounded-lg bg-white border border-blue-200 p-1.5 text-center">
            <div className="text-[8px] uppercase text-blue-700 font-bold">Total</div>
            <div className="text-sm font-extrabold text-blue-900">{stats.total}</div>
          </div>
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-1.5 text-center">
            <div className="text-[8px] uppercase text-emerald-700 font-bold">In Stock</div>
            <div className="text-sm font-extrabold text-emerald-900">{stats.inStock}</div>
          </div>
          <div className="rounded-lg bg-violet-50 border border-violet-200 p-1.5 text-center">
            <div className="text-[8px] uppercase text-violet-700 font-bold">Sold</div>
            <div className="text-sm font-extrabold text-violet-900">{stats.sold}</div>
          </div>
        </div>

        {/* PTA Breakdown for this variant */}
        {stats.total > 0 && (
          <div className="mt-2 pt-2 border-t border-blue-200">
            <div className="flex items-center gap-1 mb-1">
              <ShieldCheck className="h-2.5 w-2.5 text-emerald-700" />
              <div className="text-[8px] uppercase text-emerald-700 font-bold">PTA Status</div>
            </div>
            <div className="flex gap-0.5">
              {(['APPROVED', 'NON_PTA', 'PATCH', 'PENDING', 'EXEMPT'] as PtaStatus[]).map((status) => {
                const count = ptaCounts[status];
                const colors = PTA_STATUS_COLORS[status];
                const Icon = PTA_ICONS[status];
                return (
                  <div
                    key={status}
                    className={`flex-1 rounded p-1 text-center border ${
                      count > 0 ? `${colors.bg} ${colors.border}` : 'bg-slate-50 border-slate-200 opacity-40'
                    }`}
                    title={`${PTA_STATUS_LABELS[status]}: ${count}`}
                  >
                    <Icon className={`h-2.5 w-2.5 mx-auto ${count > 0 ? colors.text : 'text-slate-400'}`} />
                    <div className={`text-[9px] font-extrabold ${count > 0 ? colors.text : 'text-slate-400'}`}>
                      {count}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {stats.total === 0 && (
          <div className="mt-2 pt-2 border-t border-blue-200 text-center">
            <div className="text-[10px] text-blue-700 italic">
              No IMEIs yet for this variant. Click "Add IMEIs" above to start tracking.
            </div>
          </div>
        )}
      </div>
    </>
  );
}
