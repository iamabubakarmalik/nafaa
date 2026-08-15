import { Palette, Sun, Moon, Monitor, Sparkles, Layout } from 'lucide-react';
import { ChoiceGroup, Toggle, SectionCard, Field, Alert } from '../components/UI';
import { useAutoSave } from '../hooks/useAutoSave';
import type { TenantSettings } from '../api/settings.api';
import { SaveStatusBar } from './_SaveStatus';

const BRAND_COLORS = [
  { hex: '#10b981', name: 'Emerald' },
  { hex: '#2563eb', name: 'Blue' },
  { hex: '#0ea5e9', name: 'Sky' },
  { hex: '#7c3aed', name: 'Violet' },
  { hex: '#ec4899', name: 'Pink' },
  { hex: '#f59e0b', name: 'Amber' },
  { hex: '#dc2626', name: 'Red' },
  { hex: '#0891b2', name: 'Cyan' },
  { hex: '#ea580c', name: 'Orange' },
  { hex: '#0f172a', name: 'Slate' },
];

export function AppearanceSection({ settings }: { settings: TenantSettings }) {
  const { draft, set, saving, dirty } = useAutoSave(settings);

  return (
    <div className="space-y-4">
      <SaveStatusBar saving={saving} dirty={dirty} />

      {/* Theme */}
      <SectionCard
        title="Theme"
        desc="Dashboard ka overall look"
        icon={Palette}
        color="violet"
      >
        <ChoiceGroup
          value={draft.theme}
          onChange={(v) => set('theme', v)}
          columns={3}
          options={[
            { value: 'light', label: 'Light', desc: 'Din ke waqt best', icon: Sun },
            { value: 'dark', label: 'Dark', desc: 'Raat me aankhon ke liye asaan', icon: Moon },
            { value: 'auto', label: 'Auto', desc: 'System ke saath sync', icon: Monitor },
          ]}
        />
      </SectionCard>

      {/* Brand color */}
      <SectionCard
        title="Brand Color"
        desc="Buttons, links, aur accents ka color"
        icon={Sparkles}
        color="pink"
      >
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {BRAND_COLORS.map((c) => {
            const active = draft.brandColor?.toLowerCase() === c.hex.toLowerCase();
            return (
              <button
                key={c.hex}
                type="button"
                onClick={() => set('brandColor', c.hex)}
                title={c.name}
                className={[
                  'aspect-square rounded-2xl transition-all active:scale-95 relative group',
                  active ? 'ring-4 ring-offset-2 dark:ring-offset-slate-900 ring-slate-900 dark:ring-white scale-110 shadow-xl z-10' : 'ring-2 ring-white dark:ring-slate-700 shadow-md hover:scale-105',
                ].join(' ')}
                style={{ backgroundColor: c.hex }}
              >
                {active && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-6 w-6 rounded-full bg-white/90 flex items-center justify-center">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke={c.hex} strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3">
          <input
            type="color"
            value={draft.brandColor || '#10b981'}
            onChange={(e) => set('brandColor', e.target.value)}
            className="h-12 w-12 rounded-xl cursor-pointer border-2 border-white dark:border-slate-700 shadow"
          />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Custom Color</div>
            <div className="font-mono font-extrabold text-slate-900 dark:text-white text-sm">{draft.brandColor}</div>
          </div>
          <div className="hidden sm:block">
            <button
              className="h-11 px-4 rounded-xl text-white font-extrabold text-sm shadow-md transition active:scale-95"
              style={{ backgroundColor: draft.brandColor }}
            >
              Preview
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Layout density */}
      <SectionCard
        title="Layout"
        desc="Density aur spacing options"
        icon={Layout}
        color="cyan"
      >
        <Toggle
          checked={draft.compactMode}
          onChange={(v) => set('compactMode', v)}
          label="Compact Mode"
          desc="UI chhoti karega — zyada content aik screen pe fit hoga"
          icon={Layout}
        />
      </SectionCard>

      <Alert tone="violet" icon={Sparkles}>
        Theme aur color changes turant apply hote hain — page refresh ki zaroorat nahi.
      </Alert>
    </div>
  );
}
