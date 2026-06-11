import { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { Check, ChevronDown, Plus, Search, X, Star, Trash2, Edit2 } from 'lucide-react';

const UNIT_CATEGORIES = [
  {
    label: 'Pieces & Quantity',
    icon: '📦',
    units: [
      { value: 'pcs', label: 'Piece', short: 'pcs', desc: 'Single item' },
      { value: 'dozen', label: 'Dozen', short: 'dozen', desc: '12 pieces' },
      { value: 'pair', label: 'Pair', short: 'pair', desc: '2 pieces' },
      { value: 'set', label: 'Set', short: 'set', desc: 'Multiple items as one' },
      { value: 'pack', label: 'Pack', short: 'pack', desc: 'Packed bundle' },
      { value: 'box', label: 'Box', short: 'box', desc: 'Boxed package' },
      { value: 'carton', label: 'Carton', short: 'carton', desc: 'Large box' },
    ],
  },
  {
    label: 'Length & Area',
    icon: '📏',
    desc: 'Carpets, Cloth, Hardware',
    units: [
      { value: 'sqft', label: 'Square Feet', short: 'sqft', desc: 'Area — carpets, tiles' },
      { value: 'sqm', label: 'Square Meter', short: 'sqm', desc: 'Area — metric' },
      { value: 'ft', label: 'Foot', short: 'ft', desc: 'Length' },
      { value: 'meter', label: 'Meter', short: 'meter', desc: 'Length — metric' },
      { value: 'yard', label: 'Yard', short: 'yard', desc: 'Length — fabric' },
      { value: 'gaj', label: 'Gaj', short: 'gaj', desc: 'Pakistani fabric unit' },
      { value: 'inch', label: 'Inch', short: 'inch', desc: 'Small length' },
      { value: 'cm', label: 'Centimeter', short: 'cm', desc: 'Small length metric' },
      { value: 'roll', label: 'Roll', short: 'roll', desc: 'Rolled material' },
      { value: 'thaan', label: 'Thaan', short: 'thaan', desc: 'Full fabric roll' },
    ],
  },
  {
    label: 'Weight',
    icon: '⚖️',
    desc: 'Grocery, Bakery, Meat',
    units: [
      { value: 'kg', label: 'Kilogram', short: 'kg', desc: 'Standard weight' },
      { value: 'gram', label: 'Gram', short: 'gram', desc: 'Small weight' },
      { value: 'mg', label: 'Milligram', short: 'mg', desc: 'Very small — medicine' },
      { value: 'ton', label: 'Ton', short: 'ton', desc: 'Heavy bulk' },
      { value: 'pao', label: 'Pao', short: 'pao', desc: '250 grams (Pakistani)' },
      { value: 'seer', label: 'Seer', short: 'seer', desc: 'Traditional Pakistani' },
      { value: 'maund', label: 'Maund', short: 'maund', desc: '~40 kg (Pakistani)' },
      { value: 'lb', label: 'Pound', short: 'lb', desc: 'Imperial weight' },
      { value: 'oz', label: 'Ounce', short: 'oz', desc: 'Small imperial' },
    ],
  },
  {
    label: 'Volume',
    icon: '💧',
    desc: 'Drinks, Oil, Liquid',
    units: [
      { value: 'liter', label: 'Liter', short: 'liter', desc: 'Standard liquid' },
      { value: 'ml', label: 'Milliliter', short: 'ml', desc: 'Small liquid' },
      { value: 'gallon', label: 'Gallon', short: 'gallon', desc: 'Large liquid' },
      { value: 'bottle', label: 'Bottle', short: 'bottle', desc: 'Packaged liquid' },
      { value: 'can', label: 'Can', short: 'can', desc: 'Canned drink' },
    ],
  },
  {
    label: 'Pharmacy',
    icon: '💊',
    desc: 'Medicine & Healthcare',
    units: [
      { value: 'tablet', label: 'Tablet', short: 'tablet', desc: 'Single tablet' },
      { value: 'capsule', label: 'Capsule', short: 'capsule', desc: 'Single capsule' },
      { value: 'strip', label: 'Strip', short: 'strip', desc: 'Tablet strip' },
      { value: 'sachet', label: 'Sachet', short: 'sachet', desc: 'Powder packet' },
      { value: 'vial', label: 'Vial', short: 'vial', desc: 'Injection vial' },
      { value: 'syrup', label: 'Syrup', short: 'syrup', desc: 'Liquid medicine' },
    ],
  },
  {
    label: 'Food & Restaurant',
    icon: '🍽️',
    units: [
      { value: 'plate', label: 'Plate', short: 'plate', desc: 'Served plate' },
      { value: 'cup', label: 'Cup', short: 'cup', desc: 'Tea/coffee cup' },
      { value: 'glass', label: 'Glass', short: 'glass', desc: 'Drink glass' },
      { value: 'slice', label: 'Slice', short: 'slice', desc: 'Cake/bread slice' },
      { value: 'loaf', label: 'Loaf', short: 'loaf', desc: 'Bread loaf' },
    ],
  },
  {
    label: 'Stationery',
    icon: '📝',
    desc: 'Office & School',
    units: [
      { value: 'ream', label: 'Ream', short: 'ream', desc: '500 sheets' },
      { value: 'sheet', label: 'Sheet', short: 'sheet', desc: 'Single paper' },
      { value: 'book', label: 'Book', short: 'book', desc: 'Bound book' },
      { value: 'notebook', label: 'Notebook', short: 'notebook', desc: 'Single notebook' },
    ],
  },
];

const POPULAR_UNITS = ['pcs', 'sqft', 'kg', 'meter', 'liter', 'dozen', 'pack', 'box'];
const LOCAL_KEY = 'nafaa.unit.recent';
const CUSTOM_KEY = 'nafaa.unit.custom';

interface CustomUnit {
  value: string;
  label: string;
  desc: string;
  createdAt: number;
}

const loadRecent = (): string[] => {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
};

const saveRecent = (value: string) => {
  try {
    const current = loadRecent();
    const next = [value, ...current.filter((v) => v !== value)].slice(0, 5);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
  } catch {}
};

const loadCustom = (): CustomUnit[] => {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
};

const saveCustom = (units: CustomUnit[]) => {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(units));
  } catch {}
};

interface Props {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  hint?: string;
}

function findUnit(value: string, customUnits: CustomUnit[] = []) {
  for (const cat of UNIT_CATEGORIES) {
    const found = cat.units.find((u) => u.value === value);
    if (found) return { ...found, category: cat.label, isCustom: false };
  }
  const custom = customUnits.find((u) => u.value === value);
  if (custom) {
    return {
      value: custom.value,
      label: custom.label,
      short: custom.value,
      desc: custom.desc,
      category: 'Custom',
      isCustom: true,
    };
  }
  return null;
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-amber-200 text-slate-900 rounded px-0.5 font-bold">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function UnitSelect({ value, onChange, label = 'Unit', hint }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [dropUp, setDropUp] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [customUnits, setCustomUnits] = useState<CustomUnit[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedUnit = useMemo(() => {
    const found = findUnit(value, customUnits);
    if (found) return found;
    return value
      ? { value, label: value, short: value, desc: 'Custom unit', category: 'Custom', isCustom: true }
      : null;
  }, [value, customUnits]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return UNIT_CATEGORIES;
    const q = search.toLowerCase();
    return UNIT_CATEGORIES.map((cat) => ({
      ...cat,
      units: cat.units.filter(
        (u) =>
          u.value.toLowerCase().includes(q) ||
          u.label.toLowerCase().includes(q) ||
          u.short.toLowerCase().includes(q) ||
          u.desc.toLowerCase().includes(q),
      ),
    })).filter((cat) => cat.units.length > 0);
  }, [search]);

  const filteredCustom = useMemo(() => {
    if (!search.trim()) return customUnits;
    const q = search.toLowerCase();
    return customUnits.filter(
      (u) =>
        u.value.toLowerCase().includes(q) ||
        u.label.toLowerCase().includes(q) ||
        u.desc.toLowerCase().includes(q),
    );
  }, [search, customUnits]);

  const totalResults = useMemo(
    () =>
      filteredCategories.reduce((sum, c) => sum + c.units.length, 0) +
      filteredCustom.length,
    [filteredCategories, filteredCustom],
  );

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    if (spaceBelow < 480 && spaceAbove > spaceBelow) {
      setDropUp(true);
    } else {
      setDropUp(false);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setRecent(loadRecent());
      setCustomUnits(loadCustom());
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCustomInput(false);
        setSearch('');
        setEditingValue(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setShowCustomInput(false);
        setSearch('');
        setEditingValue(null);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleSelect = (unitValue: string) => {
    onChange(unitValue);
    saveRecent(unitValue);
    setOpen(false);
    setSearch('');
    setShowCustomInput(false);
    setEditingValue(null);
  };

  const handleCustomSave = () => {
    const trimmed = customValue.trim().toLowerCase();
    if (!trimmed) return;

    if (editingValue) {
      // Update existing custom unit
      const next = customUnits.map((u) =>
        u.value === editingValue
          ? { ...u, value: trimmed, label: customValue.trim(), desc: customDesc.trim() || 'Custom unit' }
          : u,
      );
      saveCustom(next);
      setCustomUnits(next);
      if (value === editingValue) onChange(trimmed);
    } else {
      // Add new custom unit
      const existing = customUnits.find((u) => u.value === trimmed);
      if (!existing) {
        const next = [
          {
            value: trimmed,
            label: customValue.trim(),
            desc: customDesc.trim() || 'Custom unit',
            createdAt: Date.now(),
          },
          ...customUnits,
        ];
        saveCustom(next);
        setCustomUnits(next);
      }
      handleSelect(trimmed);
      return;
    }

    setCustomValue('');
    setCustomDesc('');
    setEditingValue(null);
    setShowCustomInput(false);
  };

  const handleCustomEdit = (unit: CustomUnit) => {
    setCustomValue(unit.label);
    setCustomDesc(unit.desc);
    setEditingValue(unit.value);
    setShowCustomInput(true);
  };

  const handleCustomDelete = (unitValue: string) => {
    if (!confirm(`Delete custom unit "${unitValue}"?`)) return;
    const next = customUnits.filter((u) => u.value !== unitValue);
    saveCustom(next);
    setCustomUnits(next);
    if (value === unitValue) onChange('pcs');
  };

  const quickUnits = useMemo(() => {
    const combined = [...recent, ...POPULAR_UNITS];
    const seen = new Set<string>();
    const result: Array<{ value: string; label: string; short: string }> = [];
    for (const v of combined) {
      if (seen.has(v)) continue;
      seen.add(v);
      const found = findUnit(v, customUnits);
      if (found) {
        result.push({ value: found.value, label: found.label, short: found.short });
      } else {
        result.push({ value: v, label: v, short: v });
      }
      if (result.length >= 8) break;
    }
    return result;
  }, [recent, customUnits]);

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
          {label}
        </label>
      )}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`h-11 w-full rounded-xl border-2 bg-white px-3.5 text-sm text-left flex items-center justify-between transition-all ${
          open
            ? 'border-brand-500 ring-2 ring-brand-200 shadow-md'
            : 'border-slate-200 hover:border-brand-300 hover:shadow-sm'
        }`}
      >
        {selectedUnit ? (
          <div className="flex-1 min-w-0">
            <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
              {selectedUnit.label}
              <span className="text-xs font-mono font-normal text-slate-500">
                ({selectedUnit.short})
              </span>
              {selectedUnit.isCustom && (
                <span className="px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[9px] font-bold">
                  CUSTOM
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 truncate">
              {selectedUnit.desc}
            </div>
          </div>
        ) : (
          <span className="text-slate-400">Select unit...</span>
        )}
        <ChevronDown
          className={`h-4 w-4 text-slate-400 shrink-0 ml-2 transition-transform duration-200 ${
            open ? 'rotate-180 text-brand-600' : ''
          }`}
        />
      </button>

      {hint && !open && <p className="text-xs text-slate-500 mt-1">{hint}</p>}

      {open && (
        <div
          className={`absolute z-50 left-0 right-0 rounded-2xl bg-white border border-slate-200 shadow-2xl max-h-[480px] flex flex-col overflow-hidden ${
            dropUp ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
          style={{
            boxShadow:
              '0 20px 50px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          }}
        >
          {/* Search header */}
          <div className="p-3 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search unit (e.g. kg, sqft, dozen)..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full hover:bg-slate-200 flex items-center justify-center"
                >
                  <X className="h-3.5 w-3.5 text-slate-500" />
                </button>
              )}
            </div>

            {!search && quickUnits.length > 0 && (
              <div className="mt-3">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                  Quick Access
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {quickUnits.map((u) => {
                    const isSelected = value === u.value;
                    return (
                      <button
                        key={u.value}
                        type="button"
                        onClick={() => handleSelect(u.value)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-brand-600 text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-700 hover:border-brand-400 hover:text-brand-700'
                        }`}
                      >
                        {u.short}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {search && (
              <div className="mt-2 text-[11px] text-slate-500">
                {totalResults === 0
                  ? 'No matches'
                  : `${totalResults} unit${totalResults > 1 ? 's' : ''} found`}
              </div>
            )}
          </div>

          {/* Units list */}
          <div className="flex-1 overflow-auto">
            {/* Custom units section */}
            {filteredCustom.length > 0 && (
              <div>
                <div className="sticky top-0 z-10 bg-gradient-to-r from-violet-50 to-white px-3 py-2 border-b border-slate-100">
                  <div className="text-[11px] font-bold text-violet-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="text-base leading-none">⭐</span>
                    Your Custom Units
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Click edit/delete on hover
                  </div>
                </div>
                <div>
                  {filteredCustom.map((unit) => {
                    const isSelected = value === unit.value;
                    return (
                      <div
                        key={unit.value}
                        className={`group flex items-center justify-between hover:bg-violet-50 transition-colors ${
                          isSelected ? 'bg-violet-50' : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelect(unit.value)}
                          className="flex-1 px-3 py-2.5 text-left flex items-center gap-3 min-w-0"
                        >
                          <div className={`h-9 w-12 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSelected
                              ? 'bg-violet-600 text-white'
                              : 'bg-violet-100 text-violet-700'
                          }`}>
                            {unit.value}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-semibold truncate ${
                              isSelected ? 'text-violet-700' : 'text-slate-900'
                            }`}>
                              <HighlightText text={unit.label} query={search} />
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              <HighlightText text={unit.desc} query={search} />
                            </div>
                          </div>
                          {isSelected && (
                            <div className="h-6 w-6 rounded-full bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                              <Check className="h-3.5 w-3.5" />
                            </div>
                          )}
                        </button>
                        <div className="flex items-center gap-1 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCustomEdit(unit);
                            }}
                            className="h-7 w-7 rounded-lg hover:bg-violet-200 flex items-center justify-center"
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-violet-700" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCustomDelete(unit.value);
                            }}
                            className="h-7 w-7 rounded-lg hover:bg-rose-200 flex items-center justify-center"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredCategories.length === 0 && filteredCustom.length === 0 ? (
              <div className="p-8 text-center">
                <div className="inline-flex h-12 w-12 rounded-full bg-slate-100 items-center justify-center mb-3">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <div className="text-sm font-bold text-slate-700">
                  No units found for "{search}"
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Try custom unit below ↓
                </div>
              </div>
            ) : (
              filteredCategories.map((cat) => (
                <div key={cat.label}>
                  <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-50 to-white px-3 py-2 border-b border-slate-100">
                    <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="text-base leading-none">{cat.icon}</span>
                      {cat.label}
                    </div>
                    {cat.desc && (
                      <div className="text-[10px] text-slate-500 mt-0.5">{cat.desc}</div>
                    )}
                  </div>
                  <div>
                    {cat.units.map((unit) => {
                      const isSelected = value === unit.value;
                      return (
                        <button
                          key={unit.value}
                          type="button"
                          onClick={() => handleSelect(unit.value)}
                          className={`w-full px-3 py-2.5 text-left flex items-center justify-between hover:bg-brand-50 transition-colors group ${
                            isSelected ? 'bg-brand-50' : ''
                          }`}
                        >
                          <div className="flex-1 min-w-0 flex items-center gap-3">
                            <div className={`h-9 w-12 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-brand-600 text-white'
                                : 'bg-slate-100 text-slate-700 group-hover:bg-brand-100 group-hover:text-brand-700'
                            }`}>
                              {unit.short}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm font-semibold truncate ${
                                isSelected ? 'text-brand-700' : 'text-slate-900'
                              }`}>
                                <HighlightText text={unit.label} query={search} />
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">
                                <HighlightText text={unit.desc} query={search} />
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="h-6 w-6 rounded-full bg-brand-600 text-white flex items-center justify-center shrink-0 ml-2 shadow-sm">
                              <Check className="h-3.5 w-3.5" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Custom unit footer */}
          <div className="border-t border-slate-100 bg-gradient-to-br from-slate-50 to-white p-3">
            {!showCustomInput ? (
              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-white border-2 border-dashed border-slate-300 hover:border-brand-400 hover:bg-brand-50 text-sm font-bold text-slate-700 hover:text-brand-700 transition-all"
              >
                <Plus className="h-4 w-4" />
                Add Custom Unit
              </button>
            ) : (
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  {editingValue ? 'Edit Custom Unit' : 'New Custom Unit'}
                </div>
                <input
                  autoFocus
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  placeholder="Unit name (e.g. bundle, drum)"
                  className="h-10 w-full rounded-lg border-2 border-slate-200 px-3 text-sm focus:outline-none focus:border-brand-500"
                />
                <input
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="h-10 w-full rounded-lg border-2 border-slate-200 px-3 text-sm focus:outline-none focus:border-brand-500"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCustomSave}
                    disabled={!customValue.trim()}
                    className="flex-1 h-10 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold disabled:opacity-50"
                  >
                    {editingValue ? 'Update' : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomInput(false);
                      setCustomValue('');
                      setCustomDesc('');
                      setEditingValue(null);
                    }}
                    className="h-10 px-3 rounded-lg bg-slate-200 hover:bg-slate-300 text-sm font-bold text-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
