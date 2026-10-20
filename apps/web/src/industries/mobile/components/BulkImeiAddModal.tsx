import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, ScanLine, Upload, ShieldCheck,
  CheckCircle2, AlertOctagon, AlertTriangle, Clock, Shield, Zap,
} from 'lucide-react';
import {
  imeiApi,
  type BulkImeiItem,
  type PtaStatus,
  PTA_STATUS_LABELS,
  PTA_STATUS_COLORS,
} from '../api/imei.api';
import { Button, Input, Modal } from '@/design-system/components';
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

  const footer = (
    <div className="w-full space-y-2">
      {Object.keys(stats.byPta).length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap text-[0.6875rem]">
          <span className="text-slate-600 font-bold">Kul:</span>
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
          <span className="text-slate-600">Theek:</span>{' '}
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
          >
            <ShieldCheck className="h-4 w-4" />
            {stats.valid} IMEI add karein
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={productName}
      description={variantName ? `${variantName} · IMEI aur PTA status ke saath add karein` : 'IMEI aur PTA status ke saath add karein'}
      footer={footer}
    >
      <div className="space-y-4">
        {/* Defaults applied to new rows */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Cost (har unit)
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
              <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-slate-600 mb-1">
                Warranty (mahine)
              </label>
              <Input
                type="number"
                value={warrantyMonths}
                onChange={(e) => setWarrantyMonths(e.target.value)}
                placeholder="12"
              />
            </div>
            <div>
              <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-slate-600 mb-1">
                PTA Tax pehle se (PKR)
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
            <div className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Sab lines ka PTA status ek saath
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
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[0.6875rem] font-bold border-2 hover:shadow ${colors.bg} ${colors.text} ${colors.border}`}
                  >
                    <Icon className="h-3 w-3" />
                    Sab {PTA_STATUS_LABELS[status]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-2">
          <Button size="sm" variant={mode === 'individual' ? 'primary' : 'secondary'} onClick={() => setMode('individual')}>
            <Plus className="h-3.5 w-3.5" /> Ek ek kar ke
          </Button>
          <Button size="sm" variant={mode === 'bulk' ? 'primary' : 'secondary'} onClick={() => setMode('bulk')}>
            <Upload className="h-3.5 w-3.5" /> List paste karein
          </Button>
        </div>

        {/* Rows */}
        {mode === 'bulk' ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
              <strong>Kaise likhein:</strong>
              <ul className="mt-2 space-y-1">
                <li>• Sirf IMEI: <code className="bg-white px-1 rounded">354895112345678</code></li>
                <li>• PTA ke saath: <code className="bg-white px-1 rounded">354895112345678, APPROVED</code></li>
                <li>• PTA ke naam: APPROVED, NON_PTA, PATCH, PENDING, EXEMPT</li>
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
              {bulkText.split('\n').filter((l) => l.trim()).length} IMEI list me daalein
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
                        data-autofocus={idx === items.length - 1 || undefined}
                        value={item.imei1}
                        onChange={(e) => updateRow(idx, { imei1: e.target.value.replace(/\D/g, '').slice(0, 15) })}
                        placeholder="IMEI 1 (15 hindse)"
                        maxLength={15}
                        className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-mono focus:outline-none focus:border-blue-500"
                      />
                      {item.imei1.length > 0 && item.imei1.length !== 15 && (
                        <div className="text-[0.6875rem] text-rose-600 font-bold mt-0.5">
                          IMEI poore 15 hindse ka hona chahiye ({item.imei1.length}/15)
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
                      <div className="text-[0.625rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
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
                              <span className={`text-[0.625rem] font-bold ${active ? colors.text : 'text-slate-500'}`}>
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
                        placeholder="IMEI 2 (zaroori nahi)"
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
                        placeholder="Rang"
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
                        placeholder="PTA Tax diya (PKR)"
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
              <Plus className="h-4 w-4" /> Aik aur IMEI
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
