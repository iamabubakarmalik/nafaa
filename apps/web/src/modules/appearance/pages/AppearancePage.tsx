/**
 * Settings → Appearance.
 *
 * Every user can change their own look ("Just for me"). Owners and managers
 * with settings access can also set the business default that every staff
 * member inherits. Changes apply to the whole app immediately and are saved
 * to the server, so they follow the user to every device.
 *
 * Each block shows where its value comes from (your choice, business default,
 * Nafaa default) and can be reset to the layer below.
 */

import { useState } from 'react';
import {
  Accessibility, Building2, LayoutGrid, Loader2, Monitor, Moon, Palette, PanelLeft, PanelLeftClose,
  PanelLeftOpen, RotateCcw, Sun, Type, User,
} from 'lucide-react';
import {
  CANVAS_TONES, industryIdentity, LATIN_FONTS, TEXT_SCALES, URDU_FONTS,
  type CanvasTone, type Density, type Radius, type SidebarMode, type SidebarStyle, type TextScale, type ThemeMode,
} from '@/design-system';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { cn } from '@core/lib/cn';
import { useAppearanceEditor, type Scope } from '../hooks/useAppearanceEditor';
import { SettingCard } from '../components/SettingCard';
import { ChoiceGrid } from '../components/ChoiceGrid';
import { AccentPicker } from '../components/AccentPicker';
import { FontPicker } from '../components/FontPicker';
import { AppearancePreview } from '../components/AppearancePreview';

/* ─── Small visuals for the option cards ─── */

function ModeVisual({ mode }: { mode: ThemeMode }) {
  const pane = (dark: boolean) => (
    <div className={cn('flex h-full flex-1 flex-col gap-1 p-2', dark ? 'bg-ink-900' : 'bg-ink-50')}>
      <div className={cn('h-2 w-10 rounded', dark ? 'bg-ink-700' : 'bg-ink-200')} />
      <div className={cn('flex-1 rounded-md', dark ? 'bg-ink-800' : 'bg-ink-white')} />
      <div className="h-2 w-8 rounded bg-brand-600" />
    </div>
  );
  return (
    <div className="flex h-20">
      {mode === 'dark' ? pane(true) : mode === 'light' ? pane(false) : <>{pane(false)}{pane(true)}</>}
    </div>
  );
}

function SidebarVisual({ style }: { style: SidebarStyle }) {
  const bg = style === 'dark' ? 'bg-ink-950' : style === 'brand' ? 'bg-brand-950' : 'bg-ink-100';
  const line = style === 'light' ? 'bg-ink-300' : 'bg-ink-white/25';
  return (
    <div className="flex h-20 bg-ink-50">
      <div className={cn('flex w-10 flex-col gap-1.5 p-2', bg)}>
        {[0, 1, 2, 3].map((i) => <div key={i} className={cn('h-1.5 rounded', i === 1 ? 'bg-brand-500' : line)} />)}
      </div>
      <div className="flex-1 p-2"><div className="h-full rounded-md bg-ink-white" /></div>
    </div>
  );
}

function CornerVisual({ radius }: { radius: Radius }) {
  const r = radius === 'sharp' ? '4px' : radius === 'round' ? '16px' : '10px';
  return (
    <div className="flex h-16 items-center justify-center gap-2">
      <span className="h-9 w-14 border-2 border-brand-500 bg-brand-50" style={{ borderRadius: r }} />
      <span className="h-7 w-10 bg-brand-600" style={{ borderRadius: r }} />
    </div>
  );
}

function DensityVisual({ density }: { density: Density }) {
  const gap = density === 'compact' ? 'gap-1' : 'gap-2';
  const h = density === 'compact' ? 'h-2.5' : 'h-3.5';
  return (
    <div className={cn('flex h-16 flex-col justify-center px-4', gap)}>
      {[0, 1, 2].map((i) => <div key={i} className={cn('rounded bg-white ring-1 ring-slate-200', h)} />)}
    </div>
  );
}

/* ─── Page ─── */

export default function AppearancePage() {
  const [scope, setScope] = useState<Scope>('personal');
  const ed = useAppearanceEditor(scope);
  const industry = useCurrentIndustry();
  const identity = industryIdentity(industry?.id);
  const a = ed.resolved;
  const resetFor = (key: Parameters<typeof ed.reset>[0]) => (ed.isSet(key) ? () => ed.reset(key) : undefined);

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-16">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.375rem] font-bold tracking-tight text-slate-900">Appearance</h1>
          <p className="mt-1 max-w-xl text-[0.875rem] text-slate-500">
            Rang, font, dark mode, text size aur layout — apni marzi se. Har badlaav foran poori app me lagta hai aur har device par saath chalta hai.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {ed.saving && <span className="inline-flex items-center gap-1.5 text-[0.75rem] text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving</span>}
          <button type="button" onClick={() => { if (confirm(scope === 'personal' ? 'Apni saari pasand hata kar business default par wapas jayein?' : 'Business ka look Nafaa default par wapas karein?')) ed.resetAll(); }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[0.8125rem] font-semibold text-slate-700 transition hover:bg-slate-50">
            <RotateCcw className="h-4 w-4" /> Reset all
          </button>
        </div>
      </header>

      {ed.canEditBusiness && (
        <div role="tablist" aria-label="Who this applies to" className="grid gap-2 sm:grid-cols-2">
          {([
            { value: 'personal', icon: User, title: 'Just for me', text: 'Sirf aap ke account par — baqi staff ko farq nahi parta' },
            { value: 'business', icon: Building2, title: 'Business default', text: 'Sab staff ka default look — har koi phir apna badal sakta hai' },
          ] as const).map(({ value, icon: Icon, title, text }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={scope === value}
              onClick={() => setScope(value)}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-3 text-left transition',
                scope === value ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-slate-200 bg-white hover:border-slate-300',
              )}
            >
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', scope === value ? 'bg-brand-600 text-brand-fg' : 'bg-slate-100 text-slate-600')}>
                <Icon className="h-[1.125rem] w-[1.125rem]" />
              </span>
              <span>
                <span className="block text-[0.875rem] font-semibold text-slate-900">{title}</span>
                <span className="block text-[0.75rem] text-slate-500">{text}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-5">
          <SettingCard title="Mode" description="Light, dark, ya computer ke hisaab se khud" icon={<Sun className="h-[1.125rem] w-[1.125rem]" />}
            source={ed.sourceOf('mode')} onReset={resetFor('mode')}>
            <ChoiceGrid<ThemeMode> label="Mode" value={a.mode} onChange={(v) => ed.set('mode', v)} options={[
              { value: 'light', label: 'Light', icon: <Sun className="h-4 w-4" />, visual: <ModeVisual mode="light" /> },
              { value: 'dark', label: 'Dark', icon: <Moon className="h-4 w-4" />, visual: <ModeVisual mode="dark" /> },
              { value: 'system', label: 'System', description: 'Computer / phone ke saath', icon: <Monitor className="h-4 w-4" />, visual: <ModeVisual mode="system" /> },
            ]} />
          </SettingCard>

          <SettingCard title="Brand color" description="Buttons, links, active menu aur highlights ka rang" icon={<Palette className="h-[1.125rem] w-[1.125rem]" />}
            source={ed.sourceOf('brandColor')} onReset={resetFor('brandColor')}>
            <AccentPicker
              value={ed.layer.brandColor ?? null}
              effectiveHex={a.accentHex}
              industryId={industry?.id}
              onChange={(hex) => ed.set('brandColor', hex)}
            />
          </SettingCard>

          <SettingCard title="Background" description="Page ka peechhe wala rang (cards ke peechhe)" icon={<LayoutGrid className="h-[1.125rem] w-[1.125rem]" />}
            source={ed.sourceOf('canvasTone')} onReset={resetFor('canvasTone')}>
            <ChoiceGrid<CanvasTone> label="Background" columns={5} value={a.canvasTone} onChange={(v) => ed.set('canvasTone', v)}
              options={(Object.entries(CANVAS_TONES) as [CanvasTone, (typeof CANVAS_TONES)[CanvasTone]][]).map(([value, t]) => ({
                value,
                label: t.label,
                description: t.description,
                visual: (
                  <div className="flex h-14 items-center justify-center" style={{ backgroundColor: value === 'tinted' ? 'rgb(var(--brand-50))' : `rgb(${t.light.canvas.join(' ')})` }}>
                    <span className="h-7 w-12 rounded-md bg-white shadow-sm ring-1 ring-black/5" />
                  </div>
                ),
              }))} />
          </SettingCard>

          <SettingCard title="Sidebar" description="Menu ka rang aur chaurai" icon={<PanelLeft className="h-[1.125rem] w-[1.125rem]" />}
            source={ed.sourceOf('sidebarStyle')} onReset={resetFor('sidebarStyle')}>
            <div className="space-y-4">
              <ChoiceGrid<SidebarStyle> label="Sidebar style" value={a.sidebarStyle} onChange={(v) => ed.set('sidebarStyle', v)} options={[
                { value: 'light', label: 'Light', description: 'Page ke saath milta hua', visual: <SidebarVisual style="light" /> },
                { value: 'dark', label: 'Dark', description: 'Gehra menu, roshan page', visual: <SidebarVisual style="dark" /> },
                { value: 'brand', label: 'Brand', description: 'Aap ke rang ka menu', visual: <SidebarVisual style="brand" /> },
              ]} />
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[0.8125rem] font-semibold text-slate-700">Width</span>
                  {ed.isSet('sidebarMode') && <button type="button" onClick={() => ed.reset('sidebarMode')} className="text-[0.75rem] font-semibold text-slate-500 hover:text-slate-900">Reset</button>}
                </div>
                <ChoiceGrid<SidebarMode> label="Sidebar width" value={a.sidebarMode} onChange={(v) => ed.set('sidebarMode', v)} options={[
                  { value: 'auto', label: 'Automatic', description: 'Bari screen par poora, chhoti par icons', icon: <PanelLeft className="h-4 w-4" /> },
                  { value: 'expanded', label: 'Always full', description: 'Hamesha naam ke saath', icon: <PanelLeftOpen className="h-4 w-4" /> },
                  { value: 'collapsed', label: 'Icons only', description: 'Zyada jagah content ko (Ctrl+B)', icon: <PanelLeftClose className="h-4 w-4" /> },
                ]} />
              </div>
            </div>
          </SettingCard>

          <SettingCard title="Font" description="Poori app ka font — har ek apne asal andaaz me dikh raha hai" icon={<Type className="h-[1.125rem] w-[1.125rem]" />}
            source={ed.sourceOf('latinFont')} onReset={resetFor('latinFont')}>
            <FontPicker label="Font" fonts={LATIN_FONTS} value={a.latinFont} sample="Nafaa POS · Rs 12,450" onChange={(v) => ed.set('latinFont', v)} />
          </SettingCard>

          <SettingCard title="Urdu font" description="Urdu likhai ke liye (receipts aur Urdu zabaan)" icon={<span className="text-[0.9375rem] font-bold">ا</span>}
            source={ed.sourceOf('urduFont')} onReset={resetFor('urduFont')}>
            <FontPicker label="Urdu font" fonts={URDU_FONTS} value={a.urduFont} sample="نفع — آپ کا کاروبار" rtl onChange={(v) => ed.set('urduFont', v)} />
          </SettingCard>

          <SettingCard title="Text size" description="Poori app me likhai ka size" icon={<Type className="h-[1.125rem] w-[1.125rem]" />}
            source={ed.sourceOf('textScale')} onReset={resetFor('textScale')}>
            <ChoiceGrid<TextScale> label="Text size" columns={4} value={a.textScale} onChange={(v) => ed.set('textScale', v)}
              options={(Object.entries(TEXT_SCALES) as [TextScale, (typeof TEXT_SCALES)[TextScale]][]).map(([value, t]) => ({
                value,
                label: t.label,
                visual: <div className="flex h-14 items-center justify-center font-semibold text-slate-800" style={{ fontSize: `${(t.rootPercent / 100) * 1.25}rem` }}>Aa</div>,
              }))} />
          </SettingCard>

          <div className="grid gap-5 md:grid-cols-2">
            <SettingCard title="Density" description="Cheezon ke beech jagah" source={ed.sourceOf('density')} onReset={resetFor('density')}>
              <ChoiceGrid<Density> label="Density" columns={2} value={a.density} onChange={(v) => ed.set('density', v)} options={[
                { value: 'comfortable', label: 'Comfortable', visual: <DensityVisual density="comfortable" /> },
                { value: 'compact', label: 'Compact', description: 'Ek screen par zyada', visual: <DensityVisual density="compact" /> },
              ]} />
            </SettingCard>
            <SettingCard title="Corners" description="Buttons aur cards ke kone" source={ed.sourceOf('radius')} onReset={resetFor('radius')}>
              <ChoiceGrid<Radius> label="Corners" columns={3} value={a.radius} onChange={(v) => ed.set('radius', v)} options={[
                { value: 'sharp', label: 'Sharp', visual: <CornerVisual radius="sharp" /> },
                { value: 'default', label: 'Rounded', visual: <CornerVisual radius="default" /> },
                { value: 'round', label: 'Extra', visual: <CornerVisual radius="round" /> },
              ]} />
            </SettingCard>
          </div>

          <SettingCard title="Accessibility" description="Aankhon aur aaram ke liye" icon={<Accessibility className="h-[1.125rem] w-[1.125rem]" />}
            source={ed.sourceOf('reduceMotion')} onReset={resetFor('reduceMotion')}>
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 p-3">
              <span>
                <span className="block text-[0.8125rem] font-semibold text-slate-900">Reduce motion</span>
                <span className="block text-[0.75rem] text-slate-500">Animations aur hilti cheezein band — tez aur pur-sukoon</span>
              </span>
              <input type="checkbox" checked={a.reduceMotion} onChange={(e) => ed.set('reduceMotion', e.target.checked)}
                className="h-5 w-9 cursor-pointer appearance-none rounded-full bg-slate-300 transition before:block before:h-4 before:w-4 before:translate-x-0.5 before:rounded-full before:bg-white before:shadow before:transition checked:bg-brand-600 checked:before:translate-x-[1.125rem]" />
            </label>
          </SettingCard>
        </div>

        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[0.75rem] font-semibold uppercase tracking-wide text-slate-400">Live preview</span>
            <span className="text-[0.75rem] text-slate-500">{scope === 'business' ? 'Business default' : 'Aap ka look'}</span>
          </div>
          <AppearancePreview appearance={a} industryLabel={identity.label} />
          <p className="mt-2 text-[0.75rem] text-slate-500">
            {scope === 'business'
              ? 'Staff jinhon ne apna look nahi badla, unhein yahi dikhega.'
              : 'Ye sirf aap ke liye hai. Business ka default owner Settings se badal sakta hai.'}
          </p>
        </aside>
      </div>
    </div>
  );
}
