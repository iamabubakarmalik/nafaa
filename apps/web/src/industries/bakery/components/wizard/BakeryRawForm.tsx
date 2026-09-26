import { Wheat, Package, Truck, Snowflake, AlertTriangle, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { Input } from '@core/ui/Input';
import { Button } from '@core/ui/Button';
import { UploadDropzone } from '@core/components/uploads';
import { formatPKR } from '@core/lib/format';
import type { BakeryWizardBasic, BakeryRawDetails } from '../../hooks/useBakeryWizard';

interface Props {
  basic: BakeryWizardBasic;
  raw: BakeryRawDetails;
  onChangeBasic: (patch: Partial<BakeryWizardBasic>) => void;
  onChangeRaw: (patch: Partial<BakeryRawDetails>) => void;
  onSubmit: () => void;
  submitting: boolean;
  validation: { valid: boolean; errors: string[] };
}

const RAW_CATEGORIES = [
  { value: 'FLOUR', label: 'Aata / Maida', emoji: '🌾' },
  { value: 'SUGAR', label: 'Cheeni / Sweetener', emoji: '🍬' },
  { value: 'DAIRY', label: 'Doodh / Cream / Makkhan', emoji: '🥛' },
  { value: 'EGG', label: 'Anday', emoji: '🥚' },
  { value: 'FAT', label: 'Ghee / Oil', emoji: '🫒' },
  { value: 'CHOCOLATE', label: 'Chocolate / Cocoa', emoji: '🍫' },
  { value: 'FRUIT', label: 'Phal / Nuts', emoji: '🍓' },
  { value: 'FLAVOR', label: 'Flavour / Essence', emoji: '🧪' },
  { value: 'DECORATION', label: 'Sajawat ka saamaan', emoji: '✨' },
  { value: 'PACKAGING', label: 'Dabba / Packing', emoji: '📦' },
  { value: 'GENERAL', label: 'Aur koi', emoji: '🧺' },
];

const UNITS = ['kg', 'gram', 'litre', 'ml', 'packet', 'dozen', 'piece', 'bag', 'tin', 'bottle'];

/* ═════════════════════════════════════════════════════════════
   BANANE KA SAAMAAN
   ─────────────────────────────────────────────────────────────
   Ye Product nahi banta. Isi liye is ka form bhi chhota hai —
   rate, stock aur supplier. Na koi bechne wala rate, na barcode,
   na cake wale sawal.

   Sab se ahem baat: ye POS aur catalog me kabhi nazar nahi aata.
   Iska kaam sirf do hain — cake ki recipe me lagna, aur khatam
   hone par bata dena.
   ═════════════════════════════════════════════════════════════ */
export function BakeryRawForm({
  basic, raw, onChangeBasic, onChangeRaw, onSubmit, submitting, validation,
}: Props) {
  const stockValue = Number(raw.currentStock || 0) * Number(raw.costPerUnit || 0);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow">
            <Wheat className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white">Saamaan ki tafseel</h3>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Jo cheez cake banane me lagti hai
            </p>
          </div>
        </div>

        <Input
          label="Saamaan ka naam *"
          value={basic.name}
          onChange={(e) => onChangeBasic({ name: e.target.value })}
          placeholder="Maida, Cheeni, Makkhan, Cocoa Powder…"
          autoFocus
        />

        <div>
          <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-2">
            Kis qism ka saamaan
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {RAW_CATEGORIES.map((c) => {
              const active = raw.category === c.value;
              return (
                <button key={c.value} type="button"
                  onClick={() => onChangeRaw({ category: c.value })}
                  className={`h-11 px-2 rounded-xl border-2 text-[11px] font-extrabold inline-flex items-center justify-center gap-1 transition ${
                    active
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300'
                      : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-600 dark:text-slate-300 hover:border-violet-400'
                  }`}>
                  <span>{c.emoji}</span> <span className="truncate">{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
              Kis hisaab se ginte hain *
            </label>
            <select
              value={basic.unit}
              onChange={(e) => onChangeBasic({ unit: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-violet-500"
            >
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <Input
            label={`Ek ${basic.unit || 'unit'} kitne ka aata hai *`}
            type="number"
            value={raw.costPerUnit}
            onChange={(e) => onChangeRaw({ costPerUnit: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0"
          />
        </div>
      </section>

      {/* ── Stock ── */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-slate-500" />
          <h3 className="font-extrabold text-slate-900 dark:text-white">Stock</h3>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Abhi kitna para hua hai"
            type="number"
            value={raw.currentStock}
            onChange={(e) => onChangeRaw({ currentStock: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0"
          />
          <Input
            label="Itna reh jaye to batao"
            type="number"
            value={raw.minStock}
            onChange={(e) => onChangeRaw({ minStock: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0"
          />
        </div>

        {stockValue > 0 && (
          <div className="rounded-2xl bg-violet-50 dark:bg-violet-500/10 border-2 border-violet-200 dark:border-violet-500/30 p-3">
            <span className="text-[12px] font-bold text-violet-900 dark:text-violet-200">
              Is waqt gudaam me <strong>{formatPKR(stockValue)}</strong> ka {basic.name || 'saamaan'} para hai
            </span>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <Toggle
            icon={Snowflake}
            label="Fridge me rakhna parta hai"
            hint="Doodh, cream, makkhan"
            value={raw.requiresRefrigeration}
            onChange={(v: boolean) => onChangeRaw({ requiresRefrigeration: v })}
          />
          <Toggle
            icon={AlertTriangle}
            label="Is ke bagair kaam nahi chalta"
            hint="Khatam ho jaye to bakery band"
            value={raw.isCritical}
            onChange={(v: boolean) => onChangeRaw({ isCritical: v })}
          />
        </div>

        <Input
          label="Kitne din theek rehta hai (optional)"
          type="number"
          value={raw.shelfLifeDays}
          onChange={(e) => onChangeRaw({ shelfLifeDays: e.target.value === '' ? '' : Number(e.target.value) })}
          placeholder="30"
        />
      </section>

      {/* ── Supplier ── */}
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-slate-500" />
          <h3 className="font-extrabold text-slate-900 dark:text-white">Kahan se aata hai</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Supplier ka naam"
            value={raw.supplierName}
            onChange={(e) => onChangeRaw({ supplierName: e.target.value })}
            placeholder="Al-Madina Traders"
          />
          <Input
            label="WhatsApp number"
            value={raw.supplierPhone}
            onChange={(e) => onChangeRaw({ supplierPhone: e.target.value })}
            placeholder="03001234567"
          />
        </div>
        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
          Number likh dein to jab ye saamaan khatam ho raha ho, wahin se WhatsApp ka
          button aa jayega — list khud bani banai chali jayegi.
        </p>

        <Input
          label="Koi baat yaad rakhni ho (optional)"
          value={raw.notes}
          onChange={(e) => onChangeRaw({ notes: e.target.value })}
          placeholder="Subah 10 baje se pehle order karna parta hai"
        />

        <div>
          <label className="block text-sm font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
            Tasveer (optional)
          </label>
          <UploadDropzone
            purpose="product-image"
            maxFiles={1}
            onUploaded={(records) => onChangeBasic({ imageUrls: records.map((r) => r.url) })}
            hint="Saamaan ki tasveer — pehchanne me aasani ho jati hai"
          />
        </div>
      </section>

      {/* ── Kya hoga ── */}
      <div className="rounded-2xl bg-slate-50 dark:bg-neutral-800 border-2 border-slate-200 dark:border-neutral-700 p-4 flex gap-2.5">
        <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
        <div className="text-[12px] font-bold text-slate-600 dark:text-slate-300 space-y-1">
          <p>Save karne ke baad ye saamaan:</p>
          <p>• <strong>Ingredients</strong> ke safhe par aa jayega</p>
          <p>• Cake ki <strong>recipe</strong> me chuna ja sakega</p>
          <p>• Khatam hone lage to <strong>"aaj kya banana hai"</strong> par warning aayegi</p>
          <p>• <strong>POS aur catalog me nazar nahi aayega</strong> — ye bechne ki cheez nahi</p>
        </div>
      </div>

      {/* ── Errors + save ── */}
      {!validation.valid && validation.errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-200 dark:border-rose-500/30 p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <span className="text-sm font-extrabold text-rose-900 dark:text-rose-200">Ye reh gaya hai</span>
          </div>
          <ul className="space-y-0.5">
            {validation.errors.map((e, i) => (
              <li key={i} className="text-[12px] font-bold text-rose-800 dark:text-rose-300">• {e}</li>
            ))}
          </ul>
        </div>
      )}

      <Button
        className="w-full h-14 text-base font-extrabold bg-gradient-to-r from-violet-600 to-purple-700"
        disabled={!validation.valid || submitting}
        onClick={onSubmit}
      >
        {submitting
          ? <><Loader2 className="h-5 w-5 animate-spin" /> Save ho raha hai…</>
          : <><CheckCircle2 className="h-5 w-5" /> Saamaan save karein</>}
      </Button>
    </div>
  );
}

function Toggle({ icon: Icon, label, hint, value, onChange }: any) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`text-left rounded-2xl border-2 p-3 flex items-start gap-2.5 transition ${
        value
          ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10'
          : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-violet-300'
      }`}
    >
      <span className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
        value ? 'bg-violet-600 text-white' : 'bg-slate-100 dark:bg-neutral-700 text-slate-500'
      }`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-extrabold text-slate-900 dark:text-white leading-tight">{label}</span>
        <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">{hint}</span>
      </span>
    </button>
  );
}
