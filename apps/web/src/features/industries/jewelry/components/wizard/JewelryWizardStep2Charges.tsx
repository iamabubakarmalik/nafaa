import { useState } from 'react';
import {
  Sparkles, Plus, Trash2, AlertCircle, Diamond, ShieldCheck,
  Percent, DollarSign, Calendar, Hash, Award, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { UploadDropzone } from '@/components/uploads';
import { formatPKR } from '@/lib/format';
import type { JewelryWizardCharges } from '../../hooks/useJewelryWizard';
import type { GemstoneType, Gemstone } from '../../api/products.api';

interface Props {
  charges: JewelryWizardCharges;
  onChange: (patch: Partial<JewelryWizardCharges>) => void;
  onAddGemstone: (g: Omit<Gemstone, 'id'>) => void;
  onUpdateGemstone: (tempId: string, patch: Partial<Gemstone>) => void;
  onRemoveGemstone: (tempId: string) => void;
  errors: string[];
}

const GEMSTONE_TYPES: { value: GemstoneType; label: string; emoji: string }[] = [
  { value: 'DIAMOND', label: 'Diamond', emoji: '💎' },
  { value: 'RUBY', label: 'Ruby', emoji: '❤️' },
  { value: 'EMERALD', label: 'Emerald', emoji: '💚' },
  { value: 'SAPPHIRE', label: 'Sapphire', emoji: '💙' },
  { value: 'PEARL', label: 'Pearl', emoji: '⚪' },
  { value: 'OPAL', label: 'Opal', emoji: '🌈' },
  { value: 'TOPAZ', label: 'Topaz', emoji: '🟡' },
  { value: 'AMETHYST', label: 'Amethyst', emoji: '💜' },
  { value: 'AQUAMARINE', label: 'Aquamarine', emoji: '🩵' },
  { value: 'GARNET', label: 'Garnet', emoji: '❤️' },
  { value: 'TURQUOISE', label: 'Turquoise', emoji: '🩵' },
  { value: 'CORAL', label: 'Coral', emoji: '🪸' },
  { value: 'ONYX', label: 'Onyx', emoji: '⚫' },
  { value: 'JADE', label: 'Jade', emoji: '💚' },
  { value: 'CITRINE', label: 'Citrine', emoji: '🟡' },
  { value: 'ZIRCON', label: 'Zircon', emoji: '💠' },
  { value: 'CZ', label: 'CZ', emoji: '✨' },
  { value: 'KUNDAN_STONE', label: 'Kundan', emoji: '👑' },
  { value: 'OTHER', label: 'Other', emoji: '💎' },
];

const CUT_OPTIONS = ['Round', 'Princess', 'Emerald Cut', 'Cushion', 'Oval', 'Pear', 'Marquise', 'Heart', 'Radiant', 'Asscher', 'Baguette', 'Trillion'];
const CLARITY_OPTIONS = ['FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'I1', 'I2', 'I3'];
const COLOR_OPTIONS = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];

export function JewelryWizardStep2Charges({
  charges, onChange, onAddGemstone, onUpdateGemstone, onRemoveGemstone, errors,
}: Props) {
  const [newGemType, setNewGemType] = useState<GemstoneType>('DIAMOND');

  const addNew = () => {
    onAddGemstone({
      type: newGemType,
      count: 1,
      caret: 0,
      isCertified: false,
    });
  };

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900">
            <div className="font-extrabold mb-0.5">Fix before Next:</div>
            <ul className="list-disc pl-4 space-y-0.5">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Making Charges */}
      <section className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-700 text-white flex items-center justify-center shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-purple-900 text-base">Making Charges</h3>
            <p className="text-xs text-purple-700 font-semibold">Labor charges — flat, per gram, or %</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <Input
            label="Making % (of metal)"
            type="number" step="0.1"
            value={charges.makingChargePct}
            onChange={(e) => onChange({ makingChargePct: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="e.g. 15"
            leftIcon={<Percent className="h-4 w-4 text-slate-400" />}
          />
          <Input
            label="Making Per Gram (Rs)"
            type="number" step="1"
            value={charges.makingChargePerGram}
            onChange={(e) => onChange({ makingChargePerGram: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="e.g. 500"
            leftIcon={<DollarSign className="h-4 w-4 text-slate-400" />}
          />
          <Input
            label="Making Fixed (Rs)"
            type="number" step="1"
            value={charges.makingChargeFixed}
            onChange={(e) => onChange({ makingChargeFixed: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Flat charge"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Input
            label="Wastage % (metal)"
            type="number" step="0.1"
            value={charges.wastagePct}
            onChange={(e) => onChange({ wastagePct: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="e.g. 5"
            leftIcon={<Percent className="h-4 w-4 text-slate-400" />}
            hint="Metal loss during making"
          />
          <Input
            label="Wastage (grams)"
            type="number" step="0.001"
            value={charges.wastageGrams}
            onChange={(e) => onChange({ wastageGrams: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Fixed wastage"
          />
        </div>

        <div className="grid sm:grid-cols-4 gap-3">
          <Input
            label="Designer Charge"
            type="number"
            value={charges.designerCharge}
            onChange={(e) => onChange({ designerCharge: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0"
          />
          <Input
            label="Polish Charge"
            type="number"
            value={charges.polishCharge}
            onChange={(e) => onChange({ polishCharge: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0"
          />
          <Input
            label="Hallmark Charge"
            type="number"
            value={charges.hallmarkCharge}
            onChange={(e) => onChange({ hallmarkCharge: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0"
          />
          <Input
            label="Other Charges"
            type="number"
            value={charges.otherCharges}
            onChange={(e) => onChange({ otherCharges: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="0"
          />
        </div>
      </section>

      {/* Stones Toggle */}
      <section className="rounded-2xl border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-5">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 text-white flex items-center justify-center shadow-md shrink-0">
            <Diamond className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-cyan-900 text-lg leading-tight">Stones & Gemstones</h3>
            <p className="text-sm text-cyan-700 font-semibold mt-0.5">Diamond, ruby, emerald, pearl details</p>
          </div>
          <button type="button" onClick={() => onChange({ hasStones: !charges.hasStones })}
            className={['inline-flex items-center gap-2 px-4 py-2 rounded-xl font-extrabold text-sm transition shrink-0',
              charges.hasStones ? 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'].join(' ')}>
            {charges.hasStones ? (<><ToggleRight className="h-5 w-5" /> Yes, has stones</>)
              : (<><ToggleLeft className="h-5 w-5" /> No stones</>)}
          </button>
        </div>

        {charges.hasStones && (
          <div className="mt-4 space-y-4">
            {/* Stone type flags */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { key: 'hasDiamond', label: '💎 Diamond', color: 'cyan' },
                { key: 'hasGemstone', label: '💚 Gemstone', color: 'emerald' },
                { key: 'hasPearl', label: '⚪ Pearl', color: 'purple' },
              ].map((opt) => {
                const active = (charges as any)[opt.key];
                return (
                  <label key={opt.key} className={[
                    'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition',
                    active ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 bg-white hover:border-cyan-300',
                  ].join(' ')}>
                    <input type="checkbox" checked={active}
                      onChange={(e) => onChange({ [opt.key]: e.target.checked } as any)}
                      className="h-4 w-4 rounded" />
                    <span className="text-sm font-extrabold">{opt.label}</span>
                  </label>
                );
              })}
            </div>

            {/* Quick stone specs */}
            <div className="grid sm:grid-cols-2 gap-3">
              <Input
                label="Total Stone Count"
                type="number"
                value={charges.stoneCount}
                onChange={(e) => onChange({ stoneCount: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="0"
                leftIcon={<Hash className="h-4 w-4 text-slate-400" />}
              />
              <Input
                label="Total Carat"
                type="number" step="0.01"
                value={charges.stoneCaret}
                onChange={(e) => onChange({ stoneCaret: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="0.00"
                hint="Sum of all stones"
              />
            </div>

            <div className="grid sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Quality</label>
                <input
                  value={charges.stoneQuality}
                  onChange={(e) => onChange({ stoneQuality: e.target.value })}
                  placeholder="VS1, VVS"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Color</label>
                <select value={charges.stoneColor} onChange={(e) => onChange({ stoneColor: e.target.value })}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-cyan-500">
                  <option value="">-- Color --</option>
                  {COLOR_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Clarity</label>
                <select value={charges.stoneClarity} onChange={(e) => onChange({ stoneClarity: e.target.value })}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-cyan-500">
                  <option value="">-- Clarity --</option>
                  {CLARITY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cut</label>
                <select value={charges.stoneCut} onChange={(e) => onChange({ stoneCut: e.target.value })}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-cyan-500">
                  <option value="">-- Cut --</option>
                  {CUT_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Individual gemstones */}
            <div className="rounded-xl border-2 border-cyan-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-extrabold text-slate-900 text-sm">Individual Gemstones (Detailed)</div>
                  <div className="text-[10px] text-slate-500 font-bold">Add each stone separately for certification</div>
                </div>
                <div className="flex gap-2">
                  <select value={newGemType} onChange={(e) => setNewGemType(e.target.value as GemstoneType)}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold focus:outline-none focus:border-cyan-500">
                    {GEMSTONE_TYPES.map((g) => <option key={g.value} value={g.value}>{g.emoji} {g.label}</option>)}
                  </select>
                  <button type="button" onClick={addNew}
                    className="h-9 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-extrabold inline-flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Add Stone
                  </button>
                </div>
              </div>

              {charges.gemstones.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-cyan-300 bg-cyan-50/50 p-6 text-center">
                  <Diamond className="h-10 w-10 text-cyan-400 mx-auto mb-2" />
                  <div className="text-sm font-extrabold text-slate-700">No stones added yet</div>
                  <div className="text-xs text-slate-500 font-semibold mt-1">Optional — quick specs above are enough for most items</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {charges.gemstones.map((g: any, idx) => {
                    const gt = GEMSTONE_TYPES.find((x) => x.value === g.type);
                    return (
                      <div key={g.tempId} className="rounded-xl border-2 border-slate-200 bg-slate-50/50 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-extrabold text-slate-700">
                            {gt?.emoji} Gemstone #{idx + 1} — {gt?.label}
                          </div>
                          <button onClick={() => onRemoveGemstone(g.tempId)} className="h-7 w-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <input type="number" value={g.count} onChange={(e) => onUpdateGemstone(g.tempId, { count: Number(e.target.value) })} placeholder="Count" className="h-9 rounded-lg border-2 border-slate-200 bg-white px-2 text-xs font-extrabold tabular-nums text-center focus:outline-none focus:border-cyan-500" />
                          <input type="number" step="0.001" value={g.caret} onChange={(e) => onUpdateGemstone(g.tempId, { caret: Number(e.target.value) })} placeholder="Carat" className="h-9 rounded-lg border-2 border-cyan-200 bg-cyan-50 px-2 text-xs font-extrabold tabular-nums text-center focus:outline-none focus:border-cyan-500" />
                          <input type="number" value={g.ratePerCaret ?? ''} onChange={(e) => onUpdateGemstone(g.tempId, { ratePerCaret: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="Rate/ct" className="h-9 rounded-lg border-2 border-slate-200 bg-white px-2 text-xs font-extrabold tabular-nums text-center focus:outline-none focus:border-cyan-500" />
                          <input type="number" value={g.totalValue ?? ''} onChange={(e) => onUpdateGemstone(g.tempId, { totalValue: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="Value" className="h-9 rounded-lg border-2 border-emerald-200 bg-emerald-50 px-2 text-xs font-extrabold tabular-nums text-center focus:outline-none focus:border-emerald-500" />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <input value={g.color ?? ''} onChange={(e) => onUpdateGemstone(g.tempId, { color: e.target.value })} placeholder="Color" className="h-9 rounded-lg border-2 border-slate-200 bg-white px-2 text-xs font-bold focus:outline-none focus:border-cyan-500" />
                          <input value={g.clarity ?? ''} onChange={(e) => onUpdateGemstone(g.tempId, { clarity: e.target.value })} placeholder="Clarity" className="h-9 rounded-lg border-2 border-slate-200 bg-white px-2 text-xs font-bold focus:outline-none focus:border-cyan-500" />
                          <input value={g.cut ?? ''} onChange={(e) => onUpdateGemstone(g.tempId, { cut: e.target.value })} placeholder="Cut" className="h-9 rounded-lg border-2 border-slate-200 bg-white px-2 text-xs font-bold focus:outline-none focus:border-cyan-500" />
                          <input value={g.shape ?? ''} onChange={(e) => onUpdateGemstone(g.tempId, { shape: e.target.value })} placeholder="Shape" className="h-9 rounded-lg border-2 border-slate-200 bg-white px-2 text-xs font-bold focus:outline-none focus:border-cyan-500" />
                        </div>

                        <div className="grid sm:grid-cols-3 gap-2 items-center">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={g.isCertified ?? false} onChange={(e) => onUpdateGemstone(g.tempId, { isCertified: e.target.checked })} className="h-4 w-4 rounded" />
                            <span className="text-xs font-extrabold">Certified</span>
                          </label>
                          <input value={g.certificateNumber ?? ''} onChange={(e) => onUpdateGemstone(g.tempId, { certificateNumber: e.target.value })} placeholder="Cert #" disabled={!g.isCertified} className="h-9 rounded-lg border-2 border-slate-200 bg-white px-2 text-xs font-mono font-bold disabled:opacity-50 focus:outline-none focus:border-cyan-500" />
                          <input value={g.origin ?? ''} onChange={(e) => onUpdateGemstone(g.tempId, { origin: e.target.value })} placeholder="Origin" className="h-9 rounded-lg border-2 border-slate-200 bg-white px-2 text-xs font-bold focus:outline-none focus:border-cyan-500" />
                        </div>

                        {g.totalValue > 0 && (
                          <div className="text-[10px] font-extrabold text-emerald-700 text-right">
                            Stone value: {formatPKR(g.totalValue)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Hallmark */}
      <section className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 text-white flex items-center justify-center shadow-md">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-emerald-900 text-base">Hallmark Details</h3>
            <p className="text-xs text-emerald-700 font-semibold">BIS / PGJDC hallmark information</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Input
            label="Hallmark Number"
            value={charges.hallmarkNumber}
            onChange={(e) => onChange({ hallmarkNumber: e.target.value })}
            placeholder="HUID e.g. UP-XXX-XXXXX"
            leftIcon={<ShieldCheck className="h-4 w-4 text-slate-400" />}
          />
          <Input
            label="Hallmark Authority"
            value={charges.hallmarkAuthority}
            onChange={(e) => onChange({ hallmarkAuthority: e.target.value })}
            placeholder="BIS / PGJDC / SGS"
          />
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Hallmark Date</label>
            <input
              type="date"
              value={charges.hallmarkDate}
              onChange={(e) => onChange({ hallmarkDate: e.target.value })}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>
          <Input
            label="BIS Number"
            value={charges.bisNumber}
            onChange={(e) => onChange({ bisNumber: e.target.value })}
            placeholder="BIS registration"
          />
          <Input
            label="Jeweller Code"
            value={charges.jewellerCode}
            onChange={(e) => onChange({ jewellerCode: e.target.value })}
            placeholder="Your jeweller code"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Hallmark Photo</label>
          {charges.hallmarkPhotoUrl ? (
            <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-emerald-200">
              <img src={charges.hallmarkPhotoUrl} alt="" className="w-full h-full object-cover" />
              <button onClick={() => onChange({ hallmarkPhotoUrl: '' })}
                className="absolute top-1 right-1 h-6 w-6 rounded bg-rose-600 text-white flex items-center justify-center">×</button>
            </div>
          ) : (
            <UploadDropzone
              onUploaded={(records) => {
                const first = Array.isArray(records) ? records[0] : records;
                const url = typeof first === 'string' ? first : (first as any)?.url;
                if (url) onChange({ hallmarkPhotoUrl: url });
              }}
              hint="Close-up of hallmark stamp"
            />
          )}
        </div>
      </section>
    </div>
  );
}
