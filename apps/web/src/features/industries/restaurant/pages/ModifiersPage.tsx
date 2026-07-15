import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles, Plus, Edit3, Trash2, X, Save, RefreshCw, Eye, EyeOff,
  Package, ArrowUp, ArrowDown, Layers,
} from 'lucide-react';
import { modifiersApi, type ModifierGroup, type ModifierOption, type ModifierType } from '../api/modifiers.api';
import { formatPKR } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

const MODIFIER_TYPES: { value: ModifierType; label: string; emoji: string; description: string }[] = [
  { value: 'ADDON', label: 'Add-on', emoji: '➕', description: 'Extra cheese, add bacon' },
  { value: 'VARIATION', label: 'Variation', emoji: '📏', description: 'Size: small/medium/large' },
  { value: 'REMOVAL', label: 'Removal', emoji: '❌', description: 'No onion, no garlic' },
  { value: 'SPICE_LEVEL', label: 'Spice Level', emoji: '🌶️', description: 'Mild/medium/hot' },
  { value: 'COOKING_STYLE', label: 'Cooking Style', emoji: '🔥', description: 'Well done, medium rare' },
  { value: 'NOTE', label: 'Note', emoji: '📝', description: 'Free-text customer note' },
];

export default function ModifiersPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ModifierGroup | null>(null);

  const { data: groups = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['modifier-groups'],
    queryFn: () => modifiersApi.list(),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => modifiersApi.toggle(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['modifier-groups'] }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => modifiersApi.remove(id),
    onSuccess: () => {
      toast.success('Modifier group deleted');
      queryClient.invalidateQueries({ queryKey: ['modifier-groups'] });
    },
  });

  return (
    <div className="space-y-6">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-rose-700 text-white p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-pink-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-rose-400/15 blur-3xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-extrabold border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Menu Modifiers
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold leading-tight">
              🎨 Modifiers
            </h1>
            <p className="mt-2 text-sm text-white/80 font-semibold">
              Customization options — Extra cheese, No onion, Size variations
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2.5 text-sm font-bold backdrop-blur border border-white/20"
            >
              <RefreshCw className={'h-4 w-4 ' + (isRefetching ? 'animate-spin' : '')} />
              Refresh
            </button>
            <Button
              className="bg-white text-slate-900 hover:bg-slate-100"
              onClick={() => { setEditing(null); setShowForm(true); }}
            >
              <Plus className="h-4 w-4" />
              Add Group
            </Button>
          </div>
        </div>
      </section>

      {showForm && (
        <ModifierForm
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            queryClient.invalidateQueries({ queryKey: ['modifier-groups'] });
          }}
        />
      )}

      {/* GROUPS LIST */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-neutral-800 animate-pulse" />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-dashed border-slate-200 dark:border-neutral-800 p-12 text-center">
          <div className="h-20 w-20 rounded-3xl bg-pink-100 dark:bg-pink-950/40 mx-auto flex items-center justify-center">
            <Sparkles className="h-10 w-10 text-pink-600" />
          </div>
          <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">No modifier groups</h3>
          <p className="mt-1 text-sm text-slate-500 font-semibold">Add modifiers to customize menu items</p>
          <Button
            className="mt-4 bg-gradient-to-r from-pink-600 to-rose-700"
            onClick={() => { setEditing(null); setShowForm(true); }}
          >
            <Plus className="h-4 w-4" />
            Create First Group
          </Button>
        </div>
      ) : (
        <section className="grid gap-3">
          {groups.map((group) => (
            <ModifierGroupCard
              key={group.id}
              group={group}
              onEdit={() => { setEditing(group); setShowForm(true); }}
              onToggle={() => toggleMutation.mutate(group.id)}
              onDelete={() => {
                if (confirm('Delete modifier group "' + group.name + '"?')) removeMutation.mutate(group.id);
              }}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function ModifierGroupCard({ group, onEdit, onToggle, onDelete }: {
  group: ModifierGroup;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const typeCfg = MODIFIER_TYPES.find((t) => t.value === group.type);

  return (
    <div className={
      'rounded-2xl border-2 shadow-sm hover:shadow-lg transition p-4 ' +
      (group.isActive ? 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800' : 'bg-slate-50 dark:bg-neutral-900/50 border-slate-200 dark:border-neutral-800 opacity-70')
    }>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center shadow-lg shrink-0 text-xl">
            {typeCfg?.emoji || '🎨'}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">{group.name}</h3>
              <span className="px-2 py-0.5 rounded-md bg-pink-100 dark:bg-pink-950/40 text-pink-700 text-[9px] font-extrabold uppercase">
                {typeCfg?.label || group.type}
              </span>
              {group.isRequired && (
                <span className="px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-950/40 text-red-700 text-[9px] font-extrabold uppercase">
                  Required
                </span>
              )}
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-neutral-800 text-slate-600 text-[9px] font-extrabold uppercase">
                Choose {group.minSelections}–{group.maxSelections}
              </span>
              {group._count?.menuItems ? (
                <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/40 text-blue-700 text-[9px] font-extrabold uppercase inline-flex items-center gap-0.5">
                  <Package className="h-2 w-2" />
                  {group._count.menuItems} items
                </span>
              ) : null}
            </div>

            {group.description && (
              <p className="text-xs text-slate-500 font-semibold mt-1">{group.description}</p>
            )}

            {/* Options */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {group.options.map((opt) => (
                <div
                  key={opt.id}
                  className={
                    'px-2.5 py-1 rounded-lg text-xs font-extrabold inline-flex items-center gap-1.5 border-2 ' +
                    (opt.isDefault ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300' : 'border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 text-slate-700 dark:text-slate-300')
                  }
                >
                  {opt.emoji && <span>{opt.emoji}</span>}
                  <span>{opt.name}</span>
                  {(opt.priceAdjustment ?? 0) !== 0 && (
                    <span className={(opt.priceAdjustment ?? 0) > 0 ? 'text-emerald-700' : 'text-rose-700'}>
                      {(opt.priceAdjustment ?? 0) > 0 ? '+' : ''}{formatPKR(opt.priceAdjustment ?? 0)}
                    </span>
                  )}
                  {opt.isDefault && <span className="text-[8px] uppercase text-emerald-600">DEF</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-1 shrink-0">
          <button
            onClick={onToggle}
            className={
              'h-9 w-9 rounded-lg flex items-center justify-center transition ' +
              (group.isActive ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700' : 'bg-slate-100 dark:bg-neutral-800 text-slate-500')
            }
            title={group.isActive ? 'Active' : 'Inactive'}
          >
            {group.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          <button
            onClick={onEdit}
            className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 text-slate-700 flex items-center justify-center"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="h-9 w-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 flex items-center justify-center"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ModifierForm({ editing, onClose, onSaved }: {
  editing: ModifierGroup | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    description: editing?.description ?? '',
    type: editing?.type ?? ('ADDON' as ModifierType),
    isRequired: editing?.isRequired ?? false,
    minSelections: editing?.minSelections ?? 0,
    maxSelections: editing?.maxSelections ?? 1,
    isActive: editing?.isActive ?? true,
  });

  const [options, setOptions] = useState<ModifierOption[]>(
    editing?.options?.length ? editing.options : [{ name: '', priceAdjustment: 0, isDefault: false, isActive: true }],
  );

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        options: options.filter((o) => o.name.trim()).map((o, idx) => ({ ...o, displayOrder: idx })),
      };
      return editing ? modifiersApi.update(editing.id, payload) : modifiersApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Modifier updated' : 'Modifier created');
      onSaved();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  const addOption = () => setOptions([...options, { name: '', priceAdjustment: 0, isDefault: false, isActive: true }]);
  const removeOption = (idx: number) => setOptions(options.filter((_, i) => i !== idx));
  const updateOption = (idx: number, patch: Partial<ModifierOption>) => {
    setOptions(options.map((o, i) => (i === idx ? { ...o, ...patch } : o)));
  };
  const moveOption = (idx: number, dir: 'up' | 'down') => {
    const newIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= options.length) return;
    const copy = [...options];
    [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
    setOptions(copy);
  };

  const validOptions = options.filter((o) => o.name.trim()).length;

  return (
    <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-pink-300 dark:border-pink-800 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-pink-50 dark:bg-pink-950/30 flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900 dark:text-white">
          {editing ? 'Edit Modifier Group' : 'New Modifier Group'}
        </h3>
        <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-neutral-800 flex items-center justify-center">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
        {/* Basic Info */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Group Name *</label>
            <input
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Size, Toppings, Spice Level"
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-pink-500"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as ModifierType })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-pink-500"
            >
              {MODIFIER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.emoji} {t.label} — {t.description}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Description</label>
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional description shown to customer"
            className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-pink-500"
          />
        </div>

        {/* Selection Rules */}
        <div className="rounded-xl border-2 border-slate-200 dark:border-neutral-700 p-4 space-y-3">
          <div className="text-sm font-extrabold text-slate-900 dark:text-white">Selection Rules</div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isRequired} onChange={(e) => setForm({ ...form, isRequired: e.target.checked })} className="h-4 w-4 rounded" />
            <span className="text-sm font-extrabold">Required (customer must select)</span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Min Selections</label>
              <input
                type="number"
                min="0"
                value={form.minSelections}
                onChange={(e) => setForm({ ...form, minSelections: Number(e.target.value) })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-pink-500"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-1 block">Max Selections</label>
              <input
                type="number"
                min="1"
                value={form.maxSelections}
                onChange={(e) => setForm({ ...form, maxSelections: Number(e.target.value) })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500 font-semibold">
            Max = 1 → single choice (radio) • Max &gt; 1 → multi-select (checkbox)
          </p>
        </div>

        {/* Options */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <label className="text-sm font-extrabold text-slate-900 dark:text-white">Options ({validOptions})</label>
              <p className="text-xs text-slate-500 font-semibold">Individual choices for customer</p>
            </div>
            <Button size="sm" onClick={addOption} className="bg-gradient-to-r from-pink-600 to-rose-700">
              <Plus className="h-3.5 w-3.5" />
              Add Option
            </Button>
          </div>

          <div className="space-y-2">
            {options.map((opt, idx) => (
              <div key={idx} className="rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-3 grid grid-cols-12 gap-2 items-center">
                <div className="col-span-1 flex flex-col gap-1">
                  <button
                    onClick={() => moveOption(idx, 'up')}
                    disabled={idx === 0}
                    className="h-6 w-6 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 flex items-center justify-center"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => moveOption(idx, 'down')}
                    disabled={idx === options.length - 1}
                    className="h-6 w-6 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 flex items-center justify-center"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>

                <input
                  value={opt.emoji || ''}
                  onChange={(e) => updateOption(idx, { emoji: e.target.value })}
                  placeholder="🧀"
                  maxLength={4}
                  className="col-span-1 h-10 text-center rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-lg font-bold focus:outline-none focus:border-pink-500"
                />

                <input
                  value={opt.name}
                  onChange={(e) => updateOption(idx, { name: e.target.value })}
                  placeholder="Option name (e.g. Small, Extra Cheese)"
                  className="col-span-5 h-10 rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-bold focus:outline-none focus:border-pink-500"
                />

                <div className="col-span-3 relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-extrabold">Rs</span>
                  <input
                    type="number"
                    step="0.01"
                    value={opt.priceAdjustment ?? 0}
                    onChange={(e) => updateOption(idx, { priceAdjustment: Number(e.target.value) })}
                    placeholder="0"
                    className="h-10 w-full rounded-lg border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-8 pr-2 text-sm font-extrabold tabular-nums focus:outline-none focus:border-pink-500"
                  />
                </div>

                <label className="col-span-1 flex items-center justify-center cursor-pointer" title="Default">
                  <input
                    type="checkbox"
                    checked={opt.isDefault || false}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Only one default in single-select
                        setOptions(options.map((o, i) => ({ ...o, isDefault: i === idx })));
                      } else {
                        updateOption(idx, { isDefault: false });
                      }
                    }}
                    className="h-4 w-4 rounded"
                  />
                </label>

                <button
                  onClick={() => removeOption(idx)}
                  className="col-span-1 h-10 w-10 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 flex items-center justify-center"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] font-bold text-slate-500 px-1">
            <span>Order • Emoji • Name • Price Adjustment • Default? • Delete</span>
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 bg-gradient-to-r from-pink-600 to-rose-700"
            onClick={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
            disabled={!form.name.trim() || validOptions === 0}
          >
            <Save className="h-4 w-4" />
            {editing ? 'Update Group' : 'Create Group'}
          </Button>
        </div>
      </div>
    </section>
  );
}
