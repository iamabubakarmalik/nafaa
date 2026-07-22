import { useQuery } from '@tanstack/react-query';
import {
  BookOpen, Palette, Sparkles, Package, DollarSign, Star, Eye,
  TrendingUp, Hash, AlertCircle, Percent, Tag, Award,
  Image as ImageIcon,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { brandsApi } from '@modules/inventory/brands/api/brands.api';
import { formatPKRFull } from '@core/lib/format';
import type { BookstoreWizardBasic, ProductType } from '../../hooks/useBookstoreWizard';

interface Props {
  basic: BookstoreWizardBasic;
  onChange: (patch: Partial<BookstoreWizardBasic>) => void;
  onTypeChange: (type: ProductType) => void;
  errors: string[];
}

const PRODUCT_TYPES: { value: ProductType; label: string; emoji: string; desc: string; icon: any; color: string }[] = [
  { value: 'BOOK', label: 'Book', emoji: '📚', desc: 'Textbook, novel, Islamic, dictionary', icon: BookOpen, color: 'amber' },
  { value: 'STATIONERY', label: 'Stationery', emoji: '✏️', desc: 'Pens, notebooks, files, geometry box', icon: Sparkles, color: 'blue' },
  { value: 'ART_SUPPLY', label: 'Art Supply', emoji: '🎨', desc: 'Paints, brushes, canvas, calligraphy', icon: Palette, color: 'pink' },
];

const UNIT_PRESETS = [
  { value: 'pcs', label: 'Piece', hint: '🔢' },
  { value: 'set', label: 'Set', hint: '📦' },
  { value: 'pack', label: 'Pack', hint: '📦' },
  { value: 'box', label: 'Box', hint: '📦' },
  { value: 'dozen', label: 'Dozen', hint: '📦' },
  { value: 'kg', label: 'Kg', hint: '⚖️' },
  { value: 'gram', label: 'Gram', hint: '⚖️' },
  { value: 'ml', label: 'ML', hint: '🥛' },
];

export function BookstoreWizardStep1Basic({ basic, onChange, onTypeChange, errors }: Props) {
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const { data: brands = [] } = useQuery({ queryKey: ['brands'], queryFn: () => brandsApi.list() });

  const cost = Number(basic.costPrice || 0);
  const sale = Number(basic.salePrice || 0);
  const mrp = Number(basic.mrp || 0);
  const profit = sale - cost;
  const margin = sale > 0 ? (profit / sale) * 100 : 0;
  const discount = mrp > 0 && sale > 0 ? ((mrp - sale) / mrp) * 100 : 0;
  const isLoss = cost > 0 && sale > 0 && profit < 0;

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900">
            <div className="font-extrabold mb-0.5">Fix these before Next:</div>
            <ul className="list-disc pl-4 space-y-0.5">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Product Type Selector */}
      <section className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b-2 border-amber-100">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-700 text-white flex items-center justify-center shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-base leading-tight">Product Type</h3>
            <p className="text-xs text-slate-500 font-semibold">Kya banarahe ho — book, stationery, art supply?</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PRODUCT_TYPES.map((t) => {
            const active = basic.productType === t.value;
            const Icon = t.icon;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => onTypeChange(t.value)}
                className={[
                  'p-4 rounded-2xl border-2 text-left transition-all',
                  active
                    ? `border-${t.color}-500 bg-${t.color}-50 shadow-md ring-2 ring-${t.color}-200`
                    : 'border-slate-200 bg-white hover:border-amber-400 hover:shadow-sm',
                ].join(' ')}
              >
                <div className="flex items-start gap-3">
                  <div className={[
                    'h-12 w-12 rounded-xl flex items-center justify-center text-2xl shadow-md shrink-0',
                    active ? `bg-${t.color}-600 text-white` : 'bg-slate-100 text-slate-600',
                  ].join(' ')}>
                    {t.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={[
                      'font-extrabold text-base',
                      active ? `text-${t.color}-900` : 'text-slate-900',
                    ].join(' ')}>
                      {t.label}
                    </div>
                    <div className="text-[11px] text-slate-600 font-semibold mt-0.5 leading-tight">{t.desc}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Identity */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHeader icon={Package} title="Product Identity" desc="Naam, category, brand" />

        <Input
          label="Product Name *"
          value={basic.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder={
            basic.productType === 'BOOK' ? 'e.g. Physics for Class 10 by Sindh Textbook Board' :
            basic.productType === 'STATIONERY' ? 'e.g. Dollar Ballpoint Pen Blue (Pack of 10)' :
            'e.g. Camel Acrylic Paint Set - 12 Colors'
          }
          hint="POS aur catalog par dikhega"
        />

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Description</label>
          <textarea
            rows={2}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            value={basic.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Details customer ke liye..."
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Category</label>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-amber-500"
              value={basic.categoryId}
              onChange={(e) => onChange({ categoryId: e.target.value })}
            >
              <option value="">Select category</option>
              {categories.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Brand</label>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-amber-500"
              value={basic.brandId}
              onChange={(e) => onChange({ brandId: e.target.value })}
            >
              <option value="">Select brand</option>
              {brands.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="SKU / Code"
            value={basic.sku}
            onChange={(e) => onChange({ sku: e.target.value })}
            placeholder="BK-001"
            leftIcon={<Hash className="h-4 w-4 text-slate-400" />}
          />
          <Input
            label="Barcode"
            value={basic.barcode}
            onChange={(e) => onChange({ barcode: e.target.value })}
            placeholder="Scan or type"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Selling Unit</label>
          <div className="grid grid-cols-4 gap-2">
            {UNIT_PRESETS.map((u) => {
              const active = basic.unit === u.value;
              return (
                <button
                  key={u.value} type="button"
                  onClick={() => onChange({ unit: u.value })}
                  className={[
                    'h-16 rounded-xl border-2 text-sm font-extrabold transition flex flex-col items-center justify-center gap-1',
                    active ? 'border-amber-600 bg-amber-600 text-white shadow-md'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-amber-400',
                  ].join(' ')}
                >
                  <span className="text-xl">{u.hint}</span>
                  <span>{u.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <SectionHeader icon={DollarSign} title="Pricing" desc="MRP, sale, cost with discount tracking" tone="emerald" />

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            label="MRP (PKR)"
            type="number" step="0.01"
            value={basic.mrp}
            onChange={(e) => onChange({ mrp: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Printed price"
            hint="Publisher's MRP"
          />
          <Input
            label="Sale Price *"
            type="number" step="0.01"
            value={basic.salePrice}
            onChange={(e) => onChange({ salePrice: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0"
            hint="Customer pays"
          />
          <Input
            label="Cost Price"
            type="number" step="0.01"
            value={basic.costPrice}
            onChange={(e) => onChange({ costPrice: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0"
            hint="From supplier"
          />
          <Input
            label="Wholesale"
            type="number" step="0.01"
            value={basic.wholesalePrice}
            onChange={(e) => onChange({ wholesalePrice: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Optional"
            hint="Bulk rate"
          />
        </div>

        {sale > 0 && (cost > 0 || mrp > 0) && (
          <div className={[
            'rounded-xl border-2 p-3 flex items-center justify-between',
            isLoss ? 'bg-rose-50 border-rose-300' :
            margin >= 20 ? 'bg-emerald-50 border-emerald-300' :
            'bg-amber-50 border-amber-300',
          ].join(' ')}>
            <div className="flex items-center gap-2">
              <TrendingUp className={['h-5 w-5',
                isLoss ? 'text-rose-700' : margin >= 20 ? 'text-emerald-700' : 'text-amber-700'].join(' ')} />
              <div>
                <div className={['text-[10px] uppercase tracking-wider font-extrabold',
                  isLoss ? 'text-rose-700' : margin >= 20 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
                  {isLoss ? '⚠️ Loss Alert' : 'Profit per item'}
                </div>
                <div className={['text-lg font-extrabold tabular-nums leading-tight',
                  isLoss ? 'text-rose-900' : 'text-slate-900'].join(' ')}>
                  {formatPKRFull(profit)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={['text-2xl font-extrabold tabular-nums',
                isLoss ? 'text-rose-700' : margin >= 20 ? 'text-emerald-700' : 'text-amber-700'].join(' ')}>
                {margin.toFixed(1)}%
              </div>
              {discount > 0 && (
                <div className="text-[10px] font-extrabold text-blue-700 mt-0.5">
                  {discount.toFixed(1)}% off MRP
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Discount % (default)"
            type="number" step="0.01"
            value={basic.discountPct}
            onChange={(e) => onChange({ discountPct: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0"
            hint="Applied automatically"
            leftIcon={<Percent className="h-4 w-4 text-slate-400" />}
          />
          <Input
            label="Tax Rate %"
            type="number" step="0.01"
            value={basic.taxRate}
            onChange={(e) => onChange({ taxRate: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0"
            hint="If applicable"
            leftIcon={<Percent className="h-4 w-4 text-slate-400" />}
          />
        </div>
      </section>

      {/* Stock */}
      <section className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 space-y-4">
        <SectionHeader icon={Package} title="Stock Info" desc="Initial stock aur low-stock alert" tone="blue" />

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Current Stock"
            type="number"
            value={basic.stock}
            onChange={(e) => onChange({ stock: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0"
            hint={`in ${basic.unit}`}
          />
          <Input
            label="Low Stock Alert"
            type="number"
            value={basic.lowStockAlert}
            onChange={(e) => onChange({ lowStockAlert: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="5"
            hint="Alert threshold"
            leftIcon={<AlertCircle className="h-4 w-4 text-slate-400" />}
          />
        </div>
      </section>

      {/* Settings */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHeader icon={Star} title="Product Settings" desc="Active status aur featured" />

        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition border-2 border-transparent hover:border-slate-200">
          <input type="checkbox" checked={basic.isActive}
            onChange={(e) => onChange({ isActive: e.target.checked })} className="h-5 w-5 rounded" />
          <Eye className="h-5 w-5 text-slate-600" />
          <div className="flex-1">
            <div className="font-extrabold text-slate-900 text-sm">Active</div>
            <div className="text-xs text-slate-500 font-semibold">POS aur catalog mein visible</div>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition border-2 border-transparent hover:border-slate-200">
          <input type="checkbox" checked={basic.isFeatured}
            onChange={(e) => onChange({ isFeatured: e.target.checked })} className="h-5 w-5 rounded" />
          <Star className={['h-5 w-5', basic.isFeatured ? 'text-amber-500 fill-amber-500' : 'text-amber-400'].join(' ')} />
          <div className="flex-1">
            <div className="font-extrabold text-slate-900 text-sm">Featured</div>
            <div className="text-xs text-slate-500 font-semibold">Highlight in catalog</div>
          </div>
        </label>
      </section>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, desc, tone = 'slate' }: any) {
  const tones: Record<string, string> = {
    slate: 'from-slate-500 to-slate-700',
    emerald: 'from-emerald-500 to-emerald-700',
    amber: 'from-amber-500 to-orange-700',
    blue: 'from-blue-500 to-blue-700',
  };
  return (
    <div className="flex items-center gap-3 pb-2 border-b-2 border-slate-100">
      <div className={['h-10 w-10 rounded-xl text-white flex items-center justify-center shadow-md bg-gradient-to-br',
        tones[tone] ?? tones.slate].join(' ')}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-extrabold text-slate-900 text-base leading-tight">{title}</h3>
        <p className="text-xs text-slate-500 font-semibold">{desc}</p>
      </div>
    </div>
  );
}
