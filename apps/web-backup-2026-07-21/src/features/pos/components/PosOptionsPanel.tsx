import { useState, useEffect } from 'react';
import { Settings, X, Eye, EyeOff, Sparkles } from 'lucide-react';

export interface PosPreferences {
  showCategories: boolean;
  showBarcodeInput: boolean;
  showHeldCartsButton: boolean;
  showQuickCutPieces: boolean;
  showCustomerCredit: boolean;
  showWholesaleBadge: boolean;
  showFeaturedBadge: boolean;
  showLowStockBadge: boolean;
  showProductImages: boolean;
  showStockCount: boolean;
  compactCartLines: boolean;
  autoFocusBarcode: boolean;
}

const DEFAULTS: PosPreferences = {
  showCategories: true,
  showBarcodeInput: true,
  showHeldCartsButton: true,
  showQuickCutPieces: true,
  showCustomerCredit: true,
  showWholesaleBadge: true,
  showFeaturedBadge: true,
  showLowStockBadge: true,
  showProductImages: true,
  showStockCount: true,
  compactCartLines: false,
  autoFocusBarcode: true,
};

const STORAGE_KEY = 'nafaa.pos.preferences';

export function loadPosPreferences(): PosPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULTS, ...parsed };
    }
  } catch {}
  return DEFAULTS;
}

export function savePosPreferences(prefs: PosPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
}

interface Props {
  onClose: () => void;
  onChange: (prefs: PosPreferences) => void;
}

const OPTIONS: Array<{ key: keyof PosPreferences; label: string; description: string; group: string }> = [
  { key: 'showCategories',       label: 'Category chips',       description: 'Filter chips upar category ka',       group: 'Layout' },
  { key: 'showBarcodeInput',     label: 'Barcode input box',    description: 'Search bar ke saath barcode field',    group: 'Layout' },
  { key: 'showHeldCartsButton',  label: 'Held carts button',    description: 'Hold/resume feature',                  group: 'Layout' },
  { key: 'showQuickCutPieces',   label: 'Quick cut pieces btn', description: 'Direct cut piece selector',            group: 'Layout' },
  { key: 'showProductImages',    label: 'Product images',       description: 'Product cards par image thumbnails',    group: 'Product Cards' },
  { key: 'showStockCount',       label: 'Stock count',          description: 'Card par remaining stock',              group: 'Product Cards' },
  { key: 'showWholesaleBadge',   label: 'Wholesale price',      description: 'W/S price line under retail',           group: 'Product Cards' },
  { key: 'showFeaturedBadge',    label: 'Featured star badge',  description: 'Star badge featured products par',      group: 'Product Cards' },
  { key: 'showLowStockBadge',    label: 'Low/Out badges',       description: 'LOW / OUT stock indicators',            group: 'Product Cards' },
  { key: 'showCustomerCredit',   label: 'Customer credit card', description: 'Selected customer ka credit summary',   group: 'Cart' },
  { key: 'compactCartLines',     label: 'Compact cart lines',   description: 'Smaller cart lines (fit more items)',   group: 'Cart' },
  { key: 'autoFocusBarcode',     label: 'Auto-focus barcode',   description: 'Barcode input auto-focused on open',    group: 'Behavior' },
];

export function PosOptionsPanel({ onClose, onChange }: Props) {
  const [prefs, setPrefs] = useState<PosPreferences>(loadPosPreferences());

  useEffect(() => {
    savePosPreferences(prefs);
    onChange(prefs);
  }, [prefs, onChange]);

  const groups = Array.from(new Set(OPTIONS.map((o) => o.group)));

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-800 to-slate-700 text-white shrink-0">
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-slate-400/20 blur-2xl" />
          <div className="relative px-5 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-lg ring-2 ring-white/20">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border border-white/20">
                  <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                  POS Preferences
                </div>
                <h3 className="font-extrabold text-xl leading-tight mt-1">Customize POS</h3>
                <p className="text-sm text-white/80 font-semibold mt-0.5">
                  Jo cheez nahi chahiye, off kar do
                </p>
              </div>
            </div>
            <button onClick={onClose} className="h-10 w-10 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur border border-white/20 flex items-center justify-center transition">
              <X className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30 space-y-4">
          {groups.map((group) => (
            <div key={group} className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
              <div className="px-4 py-2 bg-slate-100 border-b border-slate-200">
                <div className="text-xs uppercase font-extrabold text-slate-700 tracking-wider">{group}</div>
              </div>
              <div className="divide-y divide-slate-100">
                {OPTIONS.filter((o) => o.group === group).map((opt) => {
                  const value = prefs[opt.key];
                  return (
                    <label key={opt.key} className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${value ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {value ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-extrabold text-slate-900">{opt.label}</div>
                          <div className="text-xs text-slate-500 font-semibold">{opt.description}</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => setPrefs((p) => ({ ...p, [opt.key]: e.target.checked }))}
                        className="h-5 w-5 rounded shrink-0"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          <button
            onClick={() => setPrefs(DEFAULTS)}
            className="w-full h-11 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 text-sm font-extrabold text-slate-700 transition"
          >
            Reset to defaults
          </button>
        </div>

        <div className="border-t-2 border-slate-200 bg-white px-5 py-3 shrink-0">
          <button
            onClick={onClose}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-extrabold text-sm shadow-lg transition"
          >
            Done — Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
