/** Onboarding step 3: first products (samples, a few typed in, or a file later) and categories. */

import { FileSpreadsheet, PenLine, Plus, Sparkles, Trash2 } from 'lucide-react';
import { Alert, Button, IconButton, Input } from '@/design-system/components';
import { Chip, ChoiceCard, StepSection } from '../components/WizardControls';

export type ProductsMode = 'sample' | 'manual' | 'import';

export interface QuickProduct {
  name: string;
  price: string;
  stock: string;
}

export interface ProductsForm {
  mode: ProductsMode | null;
  products: QuickProduct[];
  categories: string[];
}

export interface ProductsErrors {
  rows?: Record<number, string>;
  form?: string;
}

const MAX_ROWS = 15;

const emptyProduct = (): QuickProduct => ({ name: '', price: '', stock: '' });

/** Rows the owner actually filled in. */
export function filledProducts(f: ProductsForm): QuickProduct[] {
  return f.products.filter((p) => p.name.trim() || p.price.trim());
}

export function validateProducts(f: ProductsForm): ProductsErrors {
  if (f.mode !== 'manual') return {};
  const rows: Record<number, string> = {};
  f.products.forEach((p, i) => {
    if (!p.name.trim() && !p.price.trim()) return;
    if (!p.name.trim()) rows[i] = 'Naam likhein';
    else if (!(Number(p.price) > 0)) rows[i] = 'Bechne ki qeemat likhein';
    else if (p.stock && !(Number(p.stock) >= 0)) rows[i] = 'Stock sahi likhein';
  });
  if (Object.keys(rows).length) return { rows };
  if (filledProducts(f).length === 0) return { form: 'Kam se kam ek product likhein, ya koi aur tareeqa chunein.' };
  return {};
}

interface Props {
  value: ProductsForm;
  onChange: (patch: Partial<ProductsForm>) => void;
  errors: ProductsErrors;
  suggestedCategories: string[];
  /** Saved earlier (resume): products already created and categories already made. */
  addedCount: number;
  savedCategories: string[];
}

export function ProductsStep({ value, onChange, errors, suggestedCategories, addedCount, savedCategories }: Props) {
  const allCategories = Array.from(new Set([...suggestedCategories, ...savedCategories]));
  const setRow = (i: number, patch: Partial<QuickProduct>) =>
    onChange({ products: value.products.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) });

  return (
    <div className="space-y-7">
      {addedCount > 0 && (
        <Alert tone="success" title={`${addedCount} products pehle hi add ho chuke`}>
          Aage barhne ke liye kuch aur chunne ki zaroorat nahi. Mazeed chahiye to neeche chunein.
        </Alert>
      )}

      <StepSection title="Products kaise daalein?" hint="Jo aasaan lage. Baad me Products page se kabhi bhi badal sakte hain.">
        <div role="radiogroup" aria-label="Products ka tareeqa" className="grid gap-2 sm:grid-cols-3">
          <ChoiceCard
            selected={value.mode === 'sample'}
            onSelect={() => onChange({ mode: 'sample' })}
            icon={<Sparkles className="h-4 w-4" />}
            title="Misaal wale products"
            description="Aap ke kaam ke hisaab se kuch products — app samajhne ke liye. Baad me mita sakte hain."
          />
          <ChoiceCard
            selected={value.mode === 'manual'}
            onSelect={() => onChange({ mode: 'manual', products: value.products.length ? value.products : [emptyProduct(), emptyProduct()] })}
            icon={<PenLine className="h-4 w-4" />}
            title="Khud likhein"
            description="Apne 5–10 sab se zyada bikne wale products abhi likh dein."
          />
          <ChoiceCard
            selected={value.mode === 'import'}
            onSelect={() => onChange({ mode: 'import' })}
            icon={<FileSpreadsheet className="h-4 w-4" />}
            title="Excel / CSV file se"
            description="Setup khatam hote hi import ka page khulega."
          />
        </div>
        {errors.form && <p className="text-xs font-medium text-rose-600" role="alert">{errors.form}</p>}
      </StepSection>

      {value.mode === 'manual' && (
        <StepSection title="Products likhein" hint="Sirf naam aur qeemat zaroori hai. Stock khaali chhor dein to 0 hoga.">
          <div className="space-y-2">
            <div className="hidden grid-cols-[minmax(0,1fr)_7rem_6rem_2.5rem] gap-2 px-1 text-xs font-medium text-slate-500 sm:grid">
              <span>Naam</span><span>Qeemat (Rs)</span><span>Stock</span><span />
            </div>
            {value.products.map((p, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-2 sm:border-0 sm:p-0">
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.5rem] gap-2 sm:grid-cols-[minmax(0,1fr)_7rem_6rem_2.5rem]">
                  <Input
                    aria-label={`Product ${i + 1} ka naam`}
                    placeholder="Misaal: Surf 1kg"
                    value={p.name}
                    onChange={(e) => setRow(i, { name: e.target.value })}
                    wrapperClassName="col-span-3 sm:col-span-1"
                  />
                  <Input
                    aria-label={`Product ${i + 1} ki qeemat`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    placeholder="Qeemat"
                    value={p.price}
                    onChange={(e) => setRow(i, { price: e.target.value })}
                  />
                  <Input
                    aria-label={`Product ${i + 1} ka stock`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="Stock"
                    value={p.stock}
                    onChange={(e) => setRow(i, { stock: e.target.value })}
                  />
                  <IconButton
                    label="Hatayein"
                    size="lg"
                    onClick={() => onChange({ products: value.products.filter((_, idx) => idx !== i) })}
                    disabled={value.products.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </div>
                {errors.rows?.[i] && <p className="mt-1 text-xs font-medium text-rose-600">{errors.rows[i]}</p>}
              </div>
            ))}
          </div>
          {value.products.length < MAX_ROWS && (
            <Button variant="secondary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => onChange({ products: [...value.products, emptyProduct()] })}>
              Ek aur product
            </Button>
          )}
        </StepSection>
      )}

      {allCategories.length > 0 && (
        <StepSection title="Categories" hint="Products ko groups me rakhne ke liye. Jo chahiye un par tap karein.">
          <div role="group" aria-label="Categories" className="flex flex-wrap gap-2">
            {allCategories.map((c) => {
              const saved = savedCategories.includes(c);
              const on = saved || value.categories.includes(c);
              return (
                <Chip
                  key={c}
                  selected={on}
                  disabled={saved}
                  onToggle={() => onChange({ categories: on ? value.categories.filter((x) => x !== c) : [...value.categories, c] })}
                >
                  {c}
                </Chip>
              );
            })}
          </div>
        </StepSection>
      )}
    </div>
  );
}
