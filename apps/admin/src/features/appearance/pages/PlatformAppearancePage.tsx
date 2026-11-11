/**
 * Platform design defaults.
 *
 * The starting look for every business on Nafaa. Each business owner can
 * override it for their staff, and each user for themselves (Settings →
 * Appearance in the web app). "Built-in default" clears a field.
 *
 * Note: the accent color here applies only to businesses whose industry has
 * no identity color; industry colors take priority so each industry keeps
 * its own look.
 */

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Layers, Lightbulb, Palette, RotateCcw, Save, Type } from 'lucide-react';
import { toast } from 'sonner';
import { Card, Input, PageHero, PageShell, Select, Skeleton, Switch, heroButton, heroPrimaryButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminAppearanceApi, type PlatformAppearance } from '@/api/admin-appearance.api';
import { num } from '@/features/shared/kit';

type Field = Exclude<keyof PlatformAppearance, 'brandColor' | 'reduceMotion' | `mobile${string}`>;
type Option = { key: Field; label: string; help: string; values: [string, string][] };

const COLORS: Option[] = [
  { key: 'mode', label: 'Mode', help: 'Light, dark, or follow each device', values: [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']] },
  { key: 'canvasTone', label: 'Background', help: 'Page background behind cards', values: [['soft', 'Soft grey'], ['white', 'Clean white'], ['warm', 'Warm'], ['cool', 'Cool'], ['tinted', 'Brand tint']] },
  { key: 'sidebarStyle', label: 'Sidebar', help: 'Menu color', values: [['light', 'Light'], ['dark', 'Dark'], ['brand', 'Brand']] },
  { key: 'contrast', label: 'Contrast', help: 'High darkens secondary text and lines', values: [['normal', 'Normal'], ['high', 'High']] },
];
const TEXT: Option[] = [
  { key: 'latinFont', label: 'Font', help: 'Default UI font', values: [['inter', 'Inter'], ['jakarta', 'Plus Jakarta Sans'], ['manrope', 'Manrope'], ['poppins', 'Poppins'], ['nunito', 'Nunito'], ['ibm-plex', 'IBM Plex Sans'], ['system', 'System font']] },
  { key: 'urduFont', label: 'Urdu font', help: 'Default Urdu script font', values: [['naskh', 'Noto Naskh'], ['nastaliq', 'Noto Nastaliq'], ['gulzar', 'Gulzar'], ['noto-sans-arabic', 'Noto Sans Arabic']] },
  { key: 'textScale', label: 'Text size', help: 'Default text size', values: [['sm', 'Small'], ['md', 'Normal'], ['lg', 'Large'], ['xl', 'Extra large']] },
];
const LAYOUT: Option[] = [
  { key: 'density', label: 'Density', help: 'Spacing between elements', values: [['comfortable', 'Comfortable'], ['compact', 'Compact']] },
  { key: 'radius', label: 'Corners', help: 'Button and card corners', values: [['default', 'Rounded'], ['sharp', 'Sharp'], ['round', 'Extra round']] },
];
const HEADER: Option[] = [
  { key: 'heroStyle', label: 'Header style', help: 'The colored box at the top of every page', values: [['modern', 'Modern (gradient, glow)'], ['simple', 'Simple (flat accent)'], ['soft', 'Soft (light tint, dark text)'], ['dark', 'Dark (ink with accent glow)'], ['aurora', 'Aurora (accent mesh)'], ['outline', 'Outline (border only)']] },
  { key: 'heroPattern', label: 'Header pattern', help: 'Background texture of the page header', values: [['dots', 'Dots'], ['grid', 'Grid'], ['lines', 'Lines'], ['none', 'None']] },
  { key: 'heroSize', label: 'Header size', help: 'Compact uses less padding and a smaller first number', values: [['comfortable', 'Comfortable'], ['compact', 'Compact']] },
  { key: 'heroStats', label: 'Header numbers', help: 'Numbers in one row, or each in its own tile', values: [['inline', 'Inline'], ['cards', 'Cards']] },
];

/** Any Google Font is stored as "gf:<Family Name>" (same format as the web app). */
const GOOGLE_FONT_PREFIX = 'gf:';

export default function PlatformAppearancePage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const { data, isLoading } = useQuery({ queryKey: ['admin-appearance'], queryFn: adminAppearanceApi.get });
  const [draft, setDraft] = useState<PlatformAppearance>({});
  useEffect(() => { if (data !== undefined) setDraft(data ?? {}); }, [data]);

  const save = useMutation({
    mutationFn: () => adminAppearanceApi.save(draft),
    onSuccess: (saved) => { qc.setQueryData(['admin-appearance'], saved); toast.success('Platform design saved. It applies on the next page load.'); },
    onError: () => toast.error('Could not save'),
  });

  const set = <K extends keyof PlatformAppearance>(key: K, value: PlatformAppearance[K] | undefined) =>
    setDraft((d) => {
      const next = { ...d };
      if (value === undefined || value === '') delete next[key]; else next[key] = value;
      return next;
    });

  // Mobile-only fields have their own page; they are kept as they are when saving here.
  const dirty = JSON.stringify(draft) !== JSON.stringify(data ?? {});
  const chosen = Object.keys(draft).filter((k) => !k.startsWith('mobile')).length;
  const group = (options: Option[]) => options.map((o) => (
    <Select key={o.key} label={o.label} hint={o.help} value={(draft[o.key] as string | undefined) ?? ''}
      onChange={(e) => set(o.key, (e.target.value || undefined) as PlatformAppearance[Field])}
      options={[{ value: '', label: 'Built-in default' }, ...o.values.map(([value, label]) => ({ value, label }))]} />
  ));

  return (
    <PageShell>
      <PageHero
        title="Platform design"
        chip={dirty ? 'Unsaved changes' : undefined}
        busy={save.isPending}
        loading={isLoading}
        actions={
          <>
            <button type="button" className={heroButton} onClick={() => setDraft((d) => Object.fromEntries(Object.entries(d).filter(([k]) => k.startsWith('mobile'))))} disabled={!chosen}><RotateCcw className="h-4 w-4" /> Built-in defaults</button>
            <button type="button" className={heroPrimaryButton} onClick={() => save.mutate()} disabled={!dirty || save.isPending}><Save className="h-4 w-4" /> Save</button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={[
          { label: 'Mode', value: ({ system: 'System', light: 'Light', dark: 'Dark' } as const)[draft.mode ?? 'system'] },
          { label: 'Font', value: draft.latinFont?.startsWith(GOOGLE_FONT_PREFIX) ? draft.latinFont.slice(GOOGLE_FONT_PREFIX.length) : (TEXT[0].values.find(([v]) => v === draft.latinFont)?.[1] ?? 'Built-in') },
          { label: 'Header style', value: HEADER[0].values.find(([v]) => v === draft.heroStyle)?.[1].split(' (')[0] ?? 'Built-in' },
          { label: 'Fields set', value: num(chosen), hint: 'Others use built-in' },
        ]}
      />

      {isLoading ? <Skeleton className="h-64 rounded-3xl" /> : (
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <Card title="Preview" description="The page header with your choices. Colors follow your own appearance settings here.">
              <PageHero title="Sales today" chip="Preview" look={{ style: draft.heroStyle ?? undefined, pattern: draft.heroPattern ?? undefined, size: draft.heroSize ?? undefined, stats: draft.heroStats ?? undefined }}
                stats={[{ label: 'Sales', value: 'Rs 128,400', hint: '42 bills' }, { label: 'Profit', value: 'Rs 31,250' }, { label: 'Customers', value: '36' }]} />
            </Card>
            <Card title="Page header" description="The colored box at the top of every page" actions={<Layers className="h-4 w-4 text-slate-400" />}>
              <div className="grid gap-4 sm:grid-cols-2">{group(HEADER)}</div>
            </Card>
            <Card title="Colors and mode" actions={<Palette className="h-4 w-4 text-slate-400" />}>
              <div className="grid gap-4 sm:grid-cols-2">
                {group(COLORS)}
                <div>
                  <span className="mb-1.5 block text-[0.75rem] font-medium text-slate-700">Fallback accent color</span>
                  <div className="flex items-center gap-2">
                    <input type="color" value={draft.brandColor ?? '#059669'} onChange={(e) => set('brandColor', e.target.value.toLowerCase())} className="h-10 w-14 cursor-pointer rounded-lg border border-slate-300" aria-label="Accent color" />
                    <code className="text-[0.8125rem] text-slate-700">{draft.brandColor ?? 'Built-in (#059669)'}</code>
                    {draft.brandColor && <button type="button" onClick={() => set('brandColor', undefined)} className="text-[0.75rem] font-semibold text-slate-500 hover:text-slate-900">Clear</button>}
                  </div>
                  <p className="mt-1 text-[0.75rem] text-slate-500">Used only where no industry or business color applies.</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card title="Text" actions={<Type className="h-4 w-4 text-slate-400" />}>
              <div className="space-y-4">
                {group(TEXT)}
                <Input label="Any Google Font" hint="Overrides the font above, for example Montserrat (the exact name from fonts.google.com)" placeholder="Font name"
                  value={draft.latinFont?.startsWith(GOOGLE_FONT_PREFIX) ? draft.latinFont.slice(GOOGLE_FONT_PREFIX.length) : ''}
                  onChange={(e) => { const name = e.target.value.replace(/[^A-Za-z0-9 ]/g, ''); set('latinFont', name.trim() ? `${GOOGLE_FONT_PREFIX}${name}` : undefined); }} />
              </div>
            </Card>
            <Card title="Layout">
              <div className="space-y-4">
                {group(LAYOUT)}
                <Switch label="Reduce motion" description="Turn animations off by default" checked={!!draft.reduceMotion} onChange={(e) => set('reduceMotion', e.target.checked || undefined)} />
              </div>
            </Card>
          </div>
        </div>
      )}

      {guide.isOpen && (
        <PageGuide
          title="Platform design"
          description="The default look for every shop. Owners can change it for their staff, and each person for themselves."
          flowTitle="Whose look wins"
          flow={[
            { label: 'Built-in', hint: 'Nafaa default', icon: Palette, color: '#64748b' },
            { label: 'Platform design', hint: 'Set here', icon: Layers, color: '#4f46e5' },
            { label: 'Shop owner', hint: 'For their staff', icon: Type, color: '#0284c7' },
            { label: 'Person', hint: 'Final say', icon: Save, color: '#059669' },
          ]}
          steps={[
            { icon: Layers, color: '#4f46e5', title: 'Choose', text: 'Each option can stay on "Built-in default". Only the fields you set are stored.' },
            { icon: Palette, color: '#d97706', title: 'Check the preview', text: 'The header preview shows style, pattern, size and numbers. Colors follow your own settings here.' },
            { icon: Save, color: '#059669', title: 'Save', text: 'Changes apply to shops on their next page load. Mobile defaults are on Mobile apps → Appearance.' },
          ]}
          tips={['Industry colors stay unless a shop picks its own.', 'Built-in defaults clears every field on this page.']}
          shortcuts={[['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
