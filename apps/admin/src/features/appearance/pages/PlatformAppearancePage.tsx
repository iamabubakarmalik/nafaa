/**
 * Platform design defaults.
 *
 * The starting look for every business on Nafaa. Each business owner can
 * override it for their staff, and each user for themselves (Settings →
 * Appearance in the web app). "Use built-in default" clears a field.
 *
 * Note: the accent color here applies only to businesses whose industry has
 * no identity color; industry colors take priority so each industry keeps
 * its own look.
 */

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Palette, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { adminAppearanceApi, type PlatformAppearance } from '@/api/admin-appearance.api';
import { Button } from '@/components/ui/Button';

type Field = Exclude<keyof PlatformAppearance, 'brandColor' | 'reduceMotion'>;

const OPTIONS: { key: Field; label: string; help: string; values: [string, string][] }[] = [
  { key: 'mode', label: 'Mode', help: 'Light, dark, or follow each device', values: [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']] },
  { key: 'canvasTone', label: 'Background', help: 'Page background behind cards', values: [['soft', 'Soft grey'], ['white', 'Clean white'], ['warm', 'Warm'], ['cool', 'Cool'], ['tinted', 'Brand tint']] },
  { key: 'sidebarStyle', label: 'Sidebar', help: 'Menu color', values: [['light', 'Light'], ['dark', 'Dark'], ['brand', 'Brand']] },
  { key: 'latinFont', label: 'Font', help: 'Default UI font', values: [['inter', 'Inter'], ['jakarta', 'Plus Jakarta Sans'], ['manrope', 'Manrope'], ['poppins', 'Poppins'], ['nunito', 'Nunito'], ['ibm-plex', 'IBM Plex Sans'], ['system', 'System font']] },
  { key: 'urduFont', label: 'Urdu font', help: 'Default Urdu script font', values: [['naskh', 'Noto Naskh'], ['nastaliq', 'Noto Nastaliq'], ['gulzar', 'Gulzar'], ['noto-sans-arabic', 'Noto Sans Arabic']] },
  { key: 'textScale', label: 'Text size', help: 'Default text size', values: [['sm', 'Small'], ['md', 'Normal'], ['lg', 'Large'], ['xl', 'Extra large']] },
  { key: 'density', label: 'Density', help: 'Spacing between elements', values: [['comfortable', 'Comfortable'], ['compact', 'Compact']] },
  { key: 'radius', label: 'Corners', help: 'Button and card corners', values: [['default', 'Rounded'], ['sharp', 'Sharp'], ['round', 'Extra round']] },
  { key: 'contrast', label: 'Contrast', help: 'High darkens secondary text and lines', values: [['normal', 'Normal'], ['high', 'High']] },
];

/** Any Google Font is stored as "gf:<Family Name>" (same format as the web app). */
const GOOGLE_FONT_PREFIX = 'gf:';

export default function PlatformAppearancePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-appearance'], queryFn: adminAppearanceApi.get });
  const [draft, setDraft] = useState<PlatformAppearance>({});
  useEffect(() => { if (data !== undefined) setDraft(data ?? {}); }, [data]);

  const save = useMutation({
    mutationFn: () => adminAppearanceApi.save(draft),
    onSuccess: (saved) => {
      qc.setQueryData(['admin-appearance'], saved);
      toast.success('Platform design saved — applies on next page load');
    },
    onError: () => toast.error('Could not save'),
  });

  const set = <K extends keyof PlatformAppearance>(key: K, value: PlatformAppearance[K] | undefined) =>
    setDraft((d) => {
      const next = { ...d };
      if (value === undefined || value === '') delete next[key];
      else next[key] = value;
      return next;
    });

  const dirty = JSON.stringify(draft) !== JSON.stringify(data ?? {});

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-700 p-6 text-white shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Palette className="h-3.5 w-3.5" /> Platform design
            </div>
            <h2 className="mt-3 text-3xl font-bold">Default look for every business</h2>
            <p className="mt-2 max-w-2xl text-sm text-white/80">
              Owners can override this for their business and each user for themselves. Industry colors stay unless a business picks its own.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setDraft({})} disabled={!Object.keys(draft).length}>
              <RotateCcw className="h-4 w-4" /> Built-in defaults
            </Button>
            <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!dirty}>
              <Save className="h-4 w-4" /> Save
            </Button>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-3xl bg-slate-100" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {OPTIONS.map((o) => (
            <label key={o.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="block text-sm font-semibold text-slate-900">{o.label}</span>
              <span className="block text-xs text-slate-500">{o.help}</span>
              <select
                value={(draft[o.key] as string | undefined) ?? ''}
                onChange={(e) => set(o.key, (e.target.value || undefined) as PlatformAppearance[Field])}
                className="mt-3 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              >
                <option value="">Built-in default</option>
                {o.values.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          ))}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="block text-sm font-semibold text-slate-900">Fallback accent color</span>
            <span className="block text-xs text-slate-500">Used only where no industry or business color applies</span>
            <div className="mt-3 flex items-center gap-2">
              <input type="color" value={draft.brandColor ?? '#059669'} onChange={(e) => set('brandColor', e.target.value.toLowerCase())}
                className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200" aria-label="Accent color" />
              <code className="text-sm text-slate-700">{draft.brandColor ?? 'Built-in (#059669)'}</code>
              {draft.brandColor && <button type="button" onClick={() => set('brandColor', undefined)} className="text-xs font-semibold text-slate-500 hover:text-slate-900">Clear</button>}
            </div>
          </div>

          <label className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="block text-sm font-semibold text-slate-900">Any Google Font</span>
            <span className="block text-xs text-slate-500">Overrides the font above, e.g. Montserrat (exact name from fonts.google.com)</span>
            <input
              value={draft.latinFont?.startsWith(GOOGLE_FONT_PREFIX) ? draft.latinFont.slice(GOOGLE_FONT_PREFIX.length) : ''}
              onChange={(e) => {
                const name = e.target.value.replace(/[^A-Za-z0-9 ]/g, '');
                set('latinFont', name.trim() ? `${GOOGLE_FONT_PREFIX}${name}` : undefined);
              }}
              placeholder="Font name"
              className="mt-3 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
            />
          </label>

          <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span>
              <span className="block text-sm font-semibold text-slate-900">Reduce motion</span>
              <span className="block text-xs text-slate-500">Turn animations off by default</span>
            </span>
            <input type="checkbox" checked={!!draft.reduceMotion} onChange={(e) => set('reduceMotion', e.target.checked || undefined)} className="h-5 w-5" />
          </label>
        </div>
      )}
    </div>
  );
}
