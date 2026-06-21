import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Package, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import { repairsApi } from '../api/repairs.api';
import { productsApi } from '@/api/products.api';
import { formatPKR } from '@/lib/format';

interface Props {
  ticketId: string;
  ticketNumber: string;
  onClose: () => void;
}

const SOURCES = [
  { val: 'OWN_STOCK', label: 'From Own Stock', hint: 'Inventory decrement' },
  { val: 'PURCHASED_FOR_REPAIR', label: 'Purchased Externally', hint: 'No stock change' },
  { val: 'CUSTOMER_PROVIDED', label: 'Customer Provided', hint: 'Free part' },
];

export function AddPartModal({ ticketId, ticketNumber, onClose }: Props) {
  const queryClient = useQueryClient();
  const [source, setSource] = useState('OWN_STOCK');
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [partName, setPartName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitCost, setUnitCost] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [notes, setNotes] = useState('');

  const { data: productsData } = useQuery({
    queryKey: ['products-for-repair-part'],
    queryFn: () => productsApi.list({ page: 1, limit: 500 }),
    enabled: source === 'OWN_STOCK',
  });

  const filteredProducts = useMemo(() => {
    const list = productsData?.items ?? [];
    const q = productSearch.toLowerCase().trim();
    if (!q) return list.slice(0, 15);
    return list
      .filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q),
      )
      .slice(0, 15);
  }, [productsData, productSearch]);

  const selectedProduct = productsData?.items.find((p) => p.id === selectedProductId);

  const total = (Number(quantity) || 0) * (Number(unitPrice) || 0);

  const mutation = useMutation({
    mutationFn: () =>
      repairsApi.addPart(ticketId, {
        productId: selectedProductId || undefined,
        partName: partName.trim() || selectedProduct?.name || '',
        partNumber: partNumber.trim() || undefined,
        quantity: Number(quantity),
        unitCost: Number(unitCost) || 0,
        unitPrice: Number(unitPrice),
        source,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Part added');
      queryClient.invalidateQueries({ queryKey: ['repair-ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['repair-tickets'] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 bg-emerald-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold">Add Part</div>
              <h3 className="font-bold text-slate-900">{ticketNumber}</h3>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-xl hover:bg-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Source */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Part Source</label>
            <div className="grid grid-cols-3 gap-2">
              {SOURCES.map((s) => (
                <button
                  key={s.val}
                  type="button"
                  onClick={() => {
                    setSource(s.val);
                    if (s.val !== 'OWN_STOCK') {
                      setSelectedProductId('');
                      setProductSearch('');
                    }
                  }}
                  className={`p-2 rounded-xl border-2 text-xs font-bold transition ${
                    source === s.val
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div>{s.label}</div>
                  <div className="text-[9px] font-normal opacity-70 mt-0.5">{s.hint}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Product link (only for OWN_STOCK) */}
          {source === 'OWN_STOCK' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Link to Inventory Product (optional)
              </label>
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setSelectedProductId('');
                  }}
                  placeholder="Search part in inventory..."
                  className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              {productSearch && !selectedProductId && filteredProducts.length > 0 && (
                <div className="mt-1 max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                  {filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedProductId(p.id);
                        setPartName(p.name);
                        setProductSearch(p.name);
                        setUnitCost(String(p.costPrice || ''));
                        setUnitPrice(String(p.price || ''));
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-emerald-50 text-sm"
                    >
                      <div className="font-bold text-slate-900 text-xs">{p.name}</div>
                      <div className="text-[10px] text-slate-500">
                        Stock: <strong>{p.stock} {p.unit}</strong> · Cost: {formatPKR(p.costPrice || 0)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {selectedProduct && (
                <div className="mt-1 text-[11px] text-emerald-700 font-bold">
                  ✓ Linked: {selectedProduct.name} (Stock: {selectedProduct.stock} {selectedProduct.unit})
                </div>
              )}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <Input
              label="Part Name *"
              value={partName}
              onChange={(e) => setPartName(e.target.value)}
              placeholder="LCD Display, Battery..."
            />
            <Input
              label="Part Number (optional)"
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              placeholder="Brand part ID"
            />
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <Input
              label="Quantity *"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <Input
              label="Unit Cost (PKR)"
              type="number"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
            />
            <Input
              label="Unit Price *"
              type="number"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="Customer rate"
            />
          </div>

          {total > 0 && (
            <div className="rounded-xl bg-emerald-50 border-2 border-emerald-200 p-3 text-center">
              <div className="text-[10px] uppercase font-bold text-emerald-700">Total</div>
              <div className="text-2xl font-extrabold text-emerald-900">{formatPKR(total)}</div>
            </div>
          )}

          <Input
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
          />
        </div>

        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              if (!partName.trim()) return toast.error('Part name required');
              if (Number(quantity) <= 0) return toast.error('Quantity required');
              if (Number(unitPrice) <= 0) return toast.error('Unit price required');
              mutation.mutate();
            }}
            loading={mutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" /> Add Part
          </Button>
        </div>
      </div>
    </div>
  );
}
