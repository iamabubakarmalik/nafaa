import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Smartphone, ShieldCheck, Plus, Package, ExternalLink, AlertCircle,
  CheckCircle2, Clock, Shield, AlertOctagon, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPKRFull } from '@/lib/format';
import type { IndustrySectionProps } from '@/features/industries/_shared/types/section.types';
import { imeiApi, type PtaStatus, PTA_STATUS_LABELS, PTA_STATUS_COLORS } from '@/features/industries/mobile/api/imei.api';
import { BulkImeiAddModal } from '@/features/industries/mobile/components/BulkImeiAddModal';

const PTA_OPTIONS: PtaStatus[] = ['APPROVED', 'NON_PTA', 'PATCH', 'PENDING', 'EXEMPT'];

const PTA_ICONS: Record<PtaStatus, any> = {
  APPROVED: CheckCircle2,
  NON_PTA: AlertOctagon,
  PATCH: AlertTriangle,
  PENDING: Clock,
  EXEMPT: Shield,
};

export function MobileInventorySection({
  productId,
  form,
  setForm,
  isEdit,
  variants,
}: IndustrySectionProps) {
  const [showImeiAdd, setShowImeiAdd] = useState(false);
  const [defaultPtaStatus, setDefaultPtaStatus] = useState<PtaStatus>('APPROVED');

  // Load IMEIs to show count when editing
  const { data: imeis = [], refetch: refetchImeis } = useQuery({
    queryKey: ['product-imeis', productId],
    queryFn: () => imeiApi.listByProduct(productId!),
    enabled: !!productId && isEdit,
  });

  const stats = {
    total: imeis.length,
    inStock: imeis.filter((i) => i.status === 'IN_STOCK').length,
    sold: imeis.filter((i) => i.status === 'SOLD').length,
  };

  // PTA breakdown
  const ptaCounts: Record<PtaStatus, number> = {
    APPROVED: 0, NON_PTA: 0, PATCH: 0, PENDING: 0, EXEMPT: 0,
  };
  imeis.forEach((i: any) => {
    const status = (i.ptaStatus || 'PENDING') as PtaStatus;
    ptaCounts[status] = (ptaCounts[status] || 0) + 1;
  });

  return (
    <div className="space-y-5 max-w-4xl">
      {showImeiAdd && productId && (
        <BulkImeiAddModal
          productId={productId}
          productName={form.name}
          defaultCostPrice={form.costPrice ?? 0}
          onSuccess={() => refetchImeis()}
          onClose={() => setShowImeiAdd(false)}
        />
      )}

      {/* Mobile-specific banner */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 border-2 border-blue-200 p-5">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shrink-0">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wider text-blue-700 font-bold">
              Mobile Industry
            </div>
            <h3 className="font-extrabold text-blue-900 text-lg">IMEI-Based Inventory</h3>
            <p className="text-xs text-blue-800 mt-1">
              Har phone ka unique IMEI track karein. PTA status, warranty, aur cost individually maintain karein.
              Stock count automatically IMEI count se sync hoti hai.
            </p>
          </div>
        </div>
      </div>

      {/* Cost + Warranty Row */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
            Default Cost Price (PKR)
          </label>
          <input
            type="number"
            step="0.01"
            value={form.costPrice ?? 0}
            onChange={(e) => setForm((f) => ({ ...f, costPrice: Number(e.target.value) }))}
            placeholder="50000"
            className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500"
          />
          <div className="text-[10px] text-slate-500 mt-1">
            Auto-applied when adding new IMEIs
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
            Default Warranty (months)
          </label>
          <input
            type="number"
            value={form.stock ?? 0}
            disabled
            className="h-11 w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3 text-sm font-bold cursor-not-allowed"
            placeholder="12"
          />
          <div className="text-[10px] text-slate-500 mt-1">
            Set per-IMEI when adding stock
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
            Low Stock Alert
          </label>
          <input
            type="number"
            value={form.lowStockAlert ?? 5}
            onChange={(e) => setForm((f) => ({ ...f, lowStockAlert: Number(e.target.value) }))}
            placeholder="5"
            className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500"
          />
          <div className="text-[10px] text-slate-500 mt-1">
            Alert when stock falls below
          </div>
        </div>
      </div>

      {/* PTA Default Selector */}
      <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="h-4 w-4 text-emerald-700" />
          <div className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
            Default PTA Status for New IMEIs
          </div>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {PTA_OPTIONS.map((status) => {
            const Icon = PTA_ICONS[status];
            const colors = PTA_STATUS_COLORS[status];
            const active = defaultPtaStatus === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setDefaultPtaStatus(status)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition ${
                  active
                    ? `${colors.bg} ${colors.border} shadow-sm`
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
                title={PTA_STATUS_LABELS[status]}
              >
                <Icon className={`h-4 w-4 ${active ? colors.text : 'text-slate-400'}`} />
                <span className={`text-[9px] font-bold uppercase ${active ? colors.text : 'text-slate-500'}`}>
                  {PTA_STATUS_LABELS[status].split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
        <div className="text-[10px] text-emerald-800 font-bold mt-2">
          💡 Pre-selected hota hai jab bulk IMEI add karein. Har IMEI per individually override kar saktay hain.
        </div>
      </div>

      {/* IMEI Quick Action — only when editing */}
      {isEdit && productId ? (
        <div className="rounded-2xl bg-white border-2 border-blue-200 p-5">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-700" />
              <h3 className="font-bold text-slate-900">IMEI Stock Management</h3>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link
                to={`/products/${productId}/imei`}
                className="inline-flex items-center gap-1 px-3 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Full IMEI Inventory
              </Link>
              <Button
                onClick={() => setShowImeiAdd(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <Plus className="h-4 w-4" /> Add IMEIs
              </Button>
            </div>
          </div>

          {/* Stock Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 p-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-blue-700 font-bold">Total</div>
              <div className="text-2xl font-extrabold text-blue-900">{stats.total}</div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 p-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold">In Stock</div>
              <div className="text-2xl font-extrabold text-emerald-900">{stats.inStock}</div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200 p-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-violet-700 font-bold">Sold</div>
              <div className="text-2xl font-extrabold text-violet-900">{stats.sold}</div>
            </div>
          </div>

          {/* PTA Breakdown — only show if has IMEIs */}
          {stats.total > 0 && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-600 font-bold mb-2">
                PTA Status Breakdown
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {PTA_OPTIONS.map((status) => {
                  const Icon = PTA_ICONS[status];
                  const colors = PTA_STATUS_COLORS[status];
                  const count = ptaCounts[status];
                  return (
                    <div
                      key={status}
                      className={`rounded-lg border p-2 text-center ${
                        count > 0 ? `${colors.bg} ${colors.border}` : 'bg-white border-slate-200 opacity-60'
                      }`}
                    >
                      <Icon className={`h-3 w-3 mx-auto mb-0.5 ${count > 0 ? colors.text : 'text-slate-400'}`} />
                      <div className={`text-base font-extrabold ${count > 0 ? colors.text : 'text-slate-400'}`}>
                        {count}
                      </div>
                      <div className={`text-[8px] font-bold uppercase ${count > 0 ? colors.text : 'text-slate-400'}`}>
                        {PTA_STATUS_LABELS[status].split(' ')[0]}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Variant-level IMEI quick selector */}
          {variants.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="text-[10px] uppercase tracking-wider text-slate-600 font-bold mb-2">
                Quick Add for Variant
              </div>
              <div className="flex flex-wrap gap-1.5">
                {variants.map((v) => {
                  const count = imeis.filter((i: any) => i.variantId === v.id).length;
                  return (
                    <Link
                      key={v.id}
                      to={`/products/${productId}/imei?variant=${v.id}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border-2 border-slate-200 hover:border-blue-400 text-xs font-bold text-slate-700 hover:text-blue-700 transition"
                    >
                      {v.colorHex && (
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-slate-300"
                          style={{ backgroundColor: v.colorHex }}
                        />
                      )}
                      {v.name}
                      {count > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-extrabold">
                          {count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/30 p-8 text-center">
          <Smartphone className="h-10 w-10 text-blue-400 mx-auto mb-2" />
          <div className="font-bold text-slate-700">Save product first to add IMEIs</div>
          <div className="text-xs text-slate-500 mt-1">
            Pehle product ki basic details save karein, phir IMEI add kar saktay hain
          </div>
        </div>
      )}

      {/* Helper Info */}
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900">
          <strong>Mobile Industry Tip:</strong> Aap ke paas separate sidebar links bhi available hain:
          <Link to="/used-phones" className="font-bold underline mx-1">Used Phones</Link>,
          <Link to="/repair-tickets" className="font-bold underline mx-1">Repair Service</Link>,
          <Link to="/emi-plans" className="font-bold underline mx-1">EMI/Installments</Link>,
          aur <Link to="/mobile-reports" className="font-bold underline mx-1">Mobile Reports</Link>.
        </div>
      </div>
    </div>
  );
}
