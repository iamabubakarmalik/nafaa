import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X, Plus, Trash2, ScanLine, Upload, Smartphone, ShieldCheck, Sparkles,
} from 'lucide-react';
import { imeiApi, type BulkImeiItem } from '../api/imei.api';
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

export function BulkImeiAddModal({
  productId, productName, variantId, variantName,
  defaultCostPrice = 0, onSuccess, onClose,
}: Props) {
  const queryClient = useQueryClient();
  const [costPrice, setCostPrice] = useState(String(defaultCostPrice));
  const [warrantyMonths, setWarrantyMonths] = useState('12');
  const [bulkText, setBulkText] = useState('');
  const [items, setItems] = useState<BulkImeiItem[]>([{ imei1: '' }]);
  const [mode, setMode] = useState<'individual' | 'bulk'>('individual');

  const addRow = () => setItems((arr) => [...arr, { imei1: '' }]);
  const removeRow = (idx: number) =>
    setItems((arr) => arr.filter((_, i) => i !== idx));
  const updateRow = (idx: number, patch: Partial<BulkImeiItem>) =>
    setItems((arr) => arr.map((item, i) => (i === idx ? { ...item, ...patch } : item)));

  // Parse bulk text (one IMEI per line)
  const parseBulkText = () => {
    const lines = bulkText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      toast.error('Koi IMEI nahi mila');
      return;
    }
    setItems(lines.map((imei) => ({ imei1: imei })));
    setMode('individual');
    toast.success(`${lines.length} IMEIs ready`);
  };

  const createMutation = useMutation({
    mutationFn: () => {
      const valid = items.filter((i) => i.imei1.trim().length >= 8);
      if (valid.length === 0) {
        throw new Error('Kam se kam 1 valid IMEI add karein');
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
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onSuccess?.();
      onClose();
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to add IMEIs');
    },
  });

  const validCount = items.filter((i) => i.imei1.trim().length >= 8).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-3xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Smartphone className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-blue-700 font-bold">
                Add IMEIs
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

        {/* Common settings */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 grid sm:grid-cols-2 gap-3">
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
            <Plus className="h-3 w-3 inline mr-1" /> Add Individual
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
                <strong>💡 Tip:</strong> Har line par ek IMEI paste karein. Format:
                <code className="block mt-1 bg-white px-2 py-1 rounded font-mono text-[11px]">
                  354895112345678<br />
                  354895112345679<br />
                  354895112345680
                </code>
              </div>
              <textarea
                rows={10}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="354895112345678&#10;354895112345679&#10;354895112345680..."
                className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
              />
              <Button onClick={parseBulkText} className="w-full">
                <ScanLine className="h-4 w-4" /> Parse {bulkText.split('\n').filter((l) => l.trim()).length} IMEIs
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 p-3 rounded-xl border border-slate-200 bg-white">
                  <div className="h-7 w-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-extrabold shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      autoFocus={idx === items.length - 1}
                      value={item.imei1}
                      onChange={(e) => updateRow(idx, { imei1: e.target.value })}
                      placeholder="IMEI 1 (15 digits)"
                      className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-mono focus:outline-none focus:border-blue-500"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        value={item.imei2 || ''}
                        onChange={(e) => updateRow(idx, { imei2: e.target.value })}
                        placeholder="IMEI 2 (optional)"
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
                  </div>
                  {items.length > 1 && (
                    <button
                      onClick={() => removeRow(idx)}
                      className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={addRow}
                className="w-full p-3 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-sm inline-flex items-center justify-center gap-2 transition"
              >
                <Plus className="h-4 w-4" /> Add Another IMEI
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200 bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-between gap-3">
          <div className="text-sm">
            <span className="text-slate-600">Valid:</span>{' '}
            <strong className="text-emerald-700">{validCount}</strong>
            <span className="text-slate-400 mx-1">/</span>
            <span className="text-slate-600">{items.length}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              loading={createMutation.isPending}
              disabled={validCount === 0}
              className="bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              <ShieldCheck className="h-4 w-4" /> Add {validCount} IMEI{validCount !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
