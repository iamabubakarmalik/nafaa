import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Pill, Calendar, FileCheck } from 'lucide-react';
import { batchesApi } from '../api/batches.api';
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

export function AddBatchModal({
  productId, productName, variantId, variantName,
  defaultCostPrice = 0, onSuccess, onClose,
}: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    batchNumber: '',
    quantity: '',
    costPrice: String(defaultCostPrice),
    manufactureDate: '',
    expiryDate: '',
    notes: '',
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!form.batchNumber.trim()) throw new Error('Batch number required');
      if (!form.quantity || Number(form.quantity) <= 0) throw new Error('Valid quantity required');

      return batchesApi.create({
        productId,
        variantId,
        batchNumber: form.batchNumber.trim(),
        quantity: Number(form.quantity),
        costPrice: Number(form.costPrice) || 0,
        manufactureDate: form.manufactureDate || undefined,
        expiryDate: form.expiryDate || undefined,
        notes: form.notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Batch added successfully');
      queryClient.invalidateQueries({ queryKey: ['batches-available'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onSuccess?.();
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || e?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg">
              <Pill className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-rose-700 font-bold">Add Batch</div>
              <h3 className="font-bold text-slate-900">{productName}</h3>
              {variantName && <p className="text-xs text-violet-700 font-semibold">{variantName}</p>}
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Batch Number *</label>
            <input
              autoFocus
              value={form.batchNumber}
              onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
              placeholder="AB-2024-001"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-mono focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Quantity *"
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              placeholder="100"
            />
            <Input
              label="Cost Price"
              type="number"
              value={form.costPrice}
              onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
              placeholder="0"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Manufacture Date</label>
              <input
                type="date"
                value={form.manufactureDate}
                onChange={(e) => setForm({ ...form, manufactureDate: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm focus:outline-none focus:border-rose-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Expiry Date *</label>
              <input
                type="date"
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional notes..."
              className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => createMutation.mutate()}
            loading={createMutation.isPending}
            className="bg-gradient-to-r from-rose-600 to-pink-600"
          >
            <FileCheck className="h-4 w-4" /> Add Batch
          </Button>
        </div>
      </div>
    </div>
  );
}
