import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, Plus, Trash2, ScanLine, Upload, Smartphone, ShieldCheck,
  CheckCircle2, AlertOctagon, AlertTriangle, Clock, Shield, Zap,
} from 'lucide-react';
import {
  imeiApi,
  type BulkImeiItem,
  type PtaStatus,
  PTA_STATUS_LABELS,
  PTA_STATUS_COLORS,
} from '../api/imei.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

interface Props {
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  defaultCostPrice?: number;
  onSuccess?: () => void;
  onClose: () => void;
}

const PTA_ICONS: Record<PtaStatus, any> = {
  APPROVED: CheckCircle2,
  NON_PTA: AlertOctagon,
  PATCH: AlertTriangle,
  PENDING: Clock,
  EXEMPT: Shield,
};

const PTA_OPTIONS: PtaStatus[] = ['APPROVED', 'NON_PTA', 'PATCH', 'PENDING', 'EXEMPT'];

export function BulkImeiAddModal({
  productId, productName, variantId, variantName,
  defaultCostPrice = 0, onSuccess, onClose,
}: Props) {
  const queryClient = useQueryClient();
  const [costPrice, setCostPrice] = useState(String(defaultCostPrice));
  const [warrantyMonths, setWarrantyMonths] = useState('12');
  const [defaultPtaStatus, setDefaultPtaStatus] = useState<PtaStatus>('APPROVED');
  const [defaultPtaTax, setDefaultPtaTax] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [items, setItems] = useState<BulkImeiItem[]>([{ imei1: '', ptaStatus: 'APPROVED' }]);
  const [mode, setMode] = useState<'individual' | 'bulk'>('individual');

  const addRow = () =>
    setItems((arr) => [...arr, { imei1: '', ptaStatus: defaultPtaStatus }]);

  const removeRow = (idx: number) =>
    setItems((arr) => arr.filter((_, i) => i !== idx));

  const updateRow = (idx: number, patch: Partial<BulkImeiItem>) =>
    setItems((arr) => arr.map((item, i) => (i === idx ? { ...item, ...patch } : item)));

  // Apply default PTA to all rows (quick action)
  const applyPtaToAll = (status: PtaStatus) => {
    setItems((arr) => arr.map((item) => ({
      ...item,
      ptaStatus: status,
      ptaTaxPaid: status === 'APPROVED' || status === 'PATCH'
        ? (item.ptaTaxPaid ?? (Number(defaultPtaTax) || 0))
        : 0,
    })));
    toast.success(`Sab ko ${PTA_STATUS_LABELS[status]} set kar diya`);
  };

  // Parse bulk text — IMEI per line, optional ",PTA_STATUS" suffix
  const parseBulkText = () => {
    const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      toast.error('Koi IMEI nahi mila');
      return;
    }
    const parsed = lines.map((line): BulkImeiItem => {
      const parts = line.split(',').map((p) => p.trim());
      const imei = parts[0];
      const ptaCandidate = (parts[1] || '').toUpperCase();
      const validPta = PTA_OPTIONS.includes(ptaCandidate as PtaStatus)
        ? (ptaCandidate as PtaStatus)
        : defaultPtaStatus;
      return {
        imei1: imei,
        ptaStatus: validPta,
        ptaTaxPaid: Number(defaultPtaTax) || 0,
      };
    });
    setItems(parsed);
    setMode('individual');
    toast.success(`${parsed.length} IMEIs ready`);
  };

  const createMutation = useMutation({
    mutationFn: () => {
      const valid = items.filter((i) => i.imei1.trim().length === 15);
      if (valid.length === 0) {
        throw new Error('Kam se kam 1 valid 15-digit IMEI add karein');
      }
      // Check for duplicates within current batch
      const seen = new Set<string>();
      for (const i of valid) {
        if (seen.has(i.imei1)) {
          throw new Error(`Duplicate IMEI in list: ${i.imei1}`);
        }
        seen.add(i.imei1);
      }
      return imeiApi.bulkCreate({
        productId,
        variantId,
        costPrice: Number(costPrice) || 0,
        warrantyMonths: Number(warrantyMonths) || 12,
        imeis: valid,
      });
    },
    onSuccess: (result) => {
      toast.success(result.message);
      queryClient.invalidateQueries({ queryKey: ['imei-available'] });
      queryClient.invalidateQueries({ queryKey: ['imei-product-list'] });
      queryClient.invalidateQueries({ queryKey: ['imei-stats'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onSuccess?.();
      onClose();
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to add IMEIs');
    },
  });

  const stats = useMemo(() => {
    const valid = items.filter((i) => i.imei1.trim().length === 15);
    const byPta: Record<string, number> = {};
    valid.forEach((i) => {
      const key = i.ptaStatus || defaultPtaStatus;
      byPta[key] = (byPta[key] || 0) + 1;
    });
    return { valid: valid.length, total: items.length, byPta };
  }, [items, defaultPtaStatus]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-4xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Smartphone className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-blue-700 font-bold">
                Add IMEIs with PTA Status
              </div>
              <h3 className="font-bold text-slate-900 truncate">{productName}</h3>
              {variantName && (
                <p className="text-xs text-violet-700 font-semibold truncate">{variantName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center"
          >
            <X className="h-4 w-4 text-slate-600" />
          </button>
        </div>

        {/* Defaults bar */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Cost Price (per unit)
              </label>
              <Input
                type="number"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Warranty (months)
              </label>
              <Input
                type="number"
                value={warrantyMonths}
                onChange={(e) => setWarrantyMonths(e.target.value)}
                placeholder="12"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Default PTA Tax (PKR)
              </label>
              <Input
                type="number"
                step="0.01"
                value={defaultPtaTax}
                onChange={(e) => setDefaultPtaTax(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {/* PTA quick-set buttons */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Quick Set PTA Status for All Rows
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {PTA_OPTIONS.map((status) => {
                const Icon = PTA_ICONS[status];
                const colors = PTA_STATUS_COLORS[status];
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => applyPtaToAll(status)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border-2 hover:shadow ${colors.bg} ${colors.text} ${colors.border}`}
                  >
                    <Icon className="h-3 w-3" />
                    Set All {PTA_STATUS_LABELS[status]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
          <button
            onClick={() => setMode('individual')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              mode === 'individual'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Plus className="h-3 w-3 inline mr-1" /> Individual Add
          </button>
          <button
            onClick={() => setMode('bulk')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              mode === 'bulk'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Upload className="h-3 w-3 inline mr-1" /> Bulk Paste
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {mode === 'bulk' ? (
            <div className="space-y-3">
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                <strong>💡 Format Tips:</strong>
                <ul className="mt-2 space-y-1">
                  <li>• Simple: <code className="bg-white px-1 rounded">354895112345678</code></li>
                  <li>• With PTA: <code className="bg-white px-1 rounded">354895112345678, APPROVED</code></li>
                  <li>• Valid PTA: APPROVED, NON_PTA, PATCH, PENDING, EXEMPT</li>
                </ul>
              </div>
              <textarea
                rows={10}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={`354895112345678, APPROVED\n354895112345679, NON_PTA\n354895112345680`}
                className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
              />
              <Button onClick={parseBulkText} className="w-full">
                <ScanLine className="h-4 w-4" />
                Parse {bulkText.split('\n').filter((l) => l.trim()).length} IMEIs
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item, idx) => {
                const itemPta = item.ptaStatus || defaultPtaStatus;
                const ptaColors = PTA_STATUS_COLORS[itemPta];
                const showTaxField = itemPta === 'APPROVED' || itemPta === 'PATCH';
                const isValid = item.imei1.trim().length === 15;

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border-2 ${
                      isValid ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <div className="h-7 w-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-extrabold shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <input
                          autoFocus={idx === items.length - 1}
                          value={item.imei1}
                          onChange={(e) => updateRow(idx, { imei1: e.target.value.replace(/\D/g, '').slice(0, 15) })}
                          placeholder="IMEI 1 (15 digits)"
                          maxLength={15}
                          className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-mono focus:outline-none focus:border-blue-500"
                        />
                        {item.imei1.length > 0 && item.imei1.length !== 15 && (
                          <div className="text-[10px] text-rose-600 font-bold mt-0.5">
                            ⚠️ IMEI exactly 15 digits hone chahiye ({item.imei1.length}/15)
                          </div>
                        )}
                      </div>
                      {items.length > 1 && (
                        <button
                          onClick={() => removeRow(idx)}
                          className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {/* PTA selector + secondary fields */}
                    <div className="space-y-2 pl-9">
                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                          PTA Status
                        </div>
                        <div className="grid grid-cols-5 gap-1">
                          {PTA_OPTIONS.map((status) => {
                            const Icon = PTA_ICONS[status];
                            const colors = PTA_STATUS_COLORS[status];
                            const active = itemPta === status;
                            return (
                              <button
                                key={status}
                                type="button"
                                onClick={() => updateRow(idx, { ptaStatus: status })}
                                className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg border transition ${
                                  active
                                    ? `${colors.bg} ${colors.border} shadow-sm`
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <Icon className={`h-3 w-3 ${active ? colors.text : 'text-slate-400'}`} />
                                <span className={`text-[8px] font-bold ${active ? colors.text : 'text-slate-500'}`}>
                                  {PTA_STATUS_LABELS[status].split(' ')[0]}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <input
                          value={item.imei2 || ''}
                          onChange={(e) => updateRow(idx, { imei2: e.target.value.replace(/\D/g, '').slice(0, 15) })}
                          placeholder="IMEI 2 (optional)"
                          maxLength={15}
                          className="h-9 rounded-lg border border-slate-200 px-2 text-xs font-mono focus:outline-none focus:border-blue-500"
                        />
                        <input
                          value={item.serialNumber || ''}
                          onChange={(e) => updateRow(idx, { serialNumber: e.target.value })}
                          placeholder="Serial #"
                          className="h-9 rounded-lg border border-slate-200 px-2 text-xs font-mono focus:outline-none focus:border-blue-500"
                        />
                        <input
                          value={item.color || ''}
                          onChange={(e) => updateRow(idx, { color: e.target.value })}
                          placeholder="Color"
                          className="h-9 rounded-lg border border-slate-200 px-2 text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {showTaxField && (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.ptaTaxPaid ?? ''}
                          onChange={(e) => updateRow(idx, { ptaTaxPaid: Number(e.target.value) || 0 })}
                          placeholder="PTA Tax Paid (PKR)"
                          className={`h-9 w-full rounded-lg border px-2 text-xs font-bold focus:outline-none ${ptaColors.border} ${ptaColors.bg}`}
                        />
                      )}
                    </div>
                  </div>
                );
              })}

              <button
                onClick={addRow}
                className="w-full p-3 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-sm inline-flex items-center justify-center gap-2 transition"
              >
                <Plus className="h-4 w-4" /> Add Another IMEI
              </button>
            </div>
          )}
        </div>

        {/* Footer with PTA summary */}
        <div className="px-5 py-3 border-t border-slate-200 bg-gradient-to-br from-blue-50 to-indigo-50 space-y-2">
          {Object.keys(stats.byPta).length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
              <span className="text-slate-600 font-bold">Summary:</span>
              {Object.entries(stats.byPta).map(([status, count]) => {
                const colors = PTA_STATUS_COLORS[status as PtaStatus];
                return (
                  <span
                    key={status}
                    className={`px-2 py-0.5 rounded-full font-bold ${colors.bg} ${colors.text}`}
                  >
                    {count} {PTA_STATUS_LABELS[status as PtaStatus]}
                  </span>
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm">
              <span className="text-slate-600">Valid:</span>{' '}
              <strong className="text-emerald-700">{stats.valid}</strong>
              <span className="text-slate-400 mx-1">/</span>
              <span className="text-slate-600">{stats.total}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button
                onClick={() => createMutation.mutate()}
                loading={createMutation.isPending}
                disabled={stats.valid === 0}
                className="bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                <ShieldCheck className="h-4 w-4" />
                Add {stats.valid} IMEI{stats.valid !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
