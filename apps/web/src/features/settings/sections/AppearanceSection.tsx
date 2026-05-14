import { ChoiceGroup, Field, Toggle } from './_shared';

import { Sun, Moon, Monitor, Check, Languages } from 'lucide-react';
import { useThemeStore, type ThemeMode } from '@/store/theme.store';
import { useLocaleStore, type Locale } from '@/store/locale.store';
import { useTranslation } from '@/i18n/useTranslation';

const BRAND_COLORS = [
  '#16a34a', '#2563eb', '#7c3aed', '#ec4899', '#f59e0b',
  '#dc2626', '#0891b2', '#ea580c', '#0f172a',
];

export default function AppearanceSection({ s, set }: any) {
  return (
    <div className="space-y-5">
      <Field label="Theme">
        <ChoiceGroup
          value={s.theme}
          onChange={(v) => set('theme', v)}
          options={[
            { value: 'light', label: '☀️ Light', desc: 'Always light mode' },
            { value: 'dark', label: '🌙 Dark', desc: 'Always dark mode' },
            { value: 'auto', label: '🔄 Auto', desc: 'System ke saath' },
          ]}
        />
      </Field>

      <Field label="Brand Color">
        <div className="flex flex-wrap gap-2">
          {BRAND_COLORS.map((c) => {
            const active = s.brandColor === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => set('brandColor', c)}
                className={`h-12 w-12 rounded-2xl border-4 transition ${
                  active ? 'border-slate-900 scale-110' : 'border-white shadow'
                }`}
                style={{ backgroundColor: c }}
              />
            );
          })}
        </div>
        <input
          type="color"
          value={s.brandColor}
          onChange={(e) => set('brandColor', e.target.value)}
          className="mt-3 h-10 w-20 rounded cursor-pointer"
        />
      </Field>

      <Toggle checked={s.compactMode} onChange={(v) => set('compactMode', v)} label="Compact mode" desc="UI ko thora chhota karein zyada content fit karne ke liye" />
    </div>
  );
}
