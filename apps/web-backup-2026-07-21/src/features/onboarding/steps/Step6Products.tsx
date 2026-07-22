import { Plus, Trash2, Package } from 'lucide-react';
import { SampleDataBanner } from '../components/SampleDataBanner';
import { STEP_CONFIG } from '../constants/step-config';

interface Product {
  name: string;
  price: string;
  stock: string;
  category?: string;
  unit?: string;
}

interface Props {
  data: { products: Product[]; useSampleData: boolean };
  onChange: (data: any) => void;
  businessType: string;
  businessEmoji: string;
  onUseSamples: () => void;
  isSubmitting: boolean;
}

export function Step6Products({ data, onChange, businessType, businessEmoji, onUseSamples, isSubmitting }: Props) {
  const cfg = STEP_CONFIG[6];

  const addProduct = () => onChange({ products: [...data.products, { name: '', price: '', stock: '' }] });
  const removeProduct = (idx: number) => onChange({ products: data.products.filter((_, i) => i !== idx) });
  const updateProduct = (idx: number, patch: Partial<Product>) => {
    const next = [...data.products];
    next[idx] = { ...next[idx], ...patch };
    onChange({ products: next });
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Sample data banner */}
      <SampleDataBanner
        businessType={businessType}
        businessEmoji={businessEmoji}
        onUse={onUseSamples}
        isLoading={isSubmitting && data.useSampleData}
      />

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">OR add manually</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {/* Custom products */}
      {data.products.length === 0 ? (
        <button
          onClick={addProduct}
          className={`w-full rounded-3xl border-2 border-dashed border-slate-300 bg-white p-8 flex flex-col items-center gap-2 font-black text-slate-500 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50/50 transition`}
        >
          <div className="h-12 w-12 rounded-2xl bg-amber-100 flex items-center justify-center">
            <Package className="h-6 w-6 text-amber-600" />
          </div>
          <div>Add your first product</div>
          <div className="text-xs font-medium text-slate-400">Manually enter products</div>
        </button>
      ) : (
        <>
          {data.products.map((p, idx) => (
            <div key={idx} className="rounded-3xl border-2 border-slate-200 p-4 space-y-2 bg-gradient-to-br from-white to-amber-50/30">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-amber-100 flex items-center justify-center text-xs font-black text-amber-700">
                  #{idx + 1}
                </div>
                <span className="flex-1 font-black text-slate-700">Product {idx + 1}</span>
                <button
                  onClick={() => removeProduct(idx)}
                  className="h-8 w-8 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center hover:bg-rose-100 transition"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                </button>
              </div>
              <input
                value={p.name}
                onChange={(e) => updateProduct(idx, { name: e.target.value })}
                placeholder="Product name (e.g. Sugar 1kg)"
                className="w-full rounded-xl border-2 border-slate-200 px-3 h-11 text-sm font-medium outline-none focus:border-amber-500 bg-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={p.price}
                  onChange={(e) => updateProduct(idx, { price: e.target.value })}
                  placeholder="Price (Rs)"
                  className="rounded-xl border-2 border-slate-200 px-3 h-11 text-sm font-bold outline-none focus:border-amber-500 bg-white"
                />
                <input
                  type="number"
                  value={p.stock}
                  onChange={(e) => updateProduct(idx, { stock: e.target.value })}
                  placeholder="Stock qty"
                  className="rounded-xl border-2 border-slate-200 px-3 h-11 text-sm font-bold outline-none focus:border-amber-500 bg-white"
                />
              </div>
            </div>
          ))}

          <button
            onClick={addProduct}
            className="w-full rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-4 flex items-center justify-center gap-2 font-black text-amber-700 hover:bg-amber-100 transition"
          >
            <Plus className="h-4 w-4" /> Add another product
          </button>
        </>
      )}
    </div>
  );
}
