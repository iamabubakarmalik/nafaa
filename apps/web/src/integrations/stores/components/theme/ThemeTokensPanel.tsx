/**
 * Theme-wide design in the editor: switch to another ready design, and the
 * colours, fonts, corners, spacing and button/card style every section uses.
 */

import { ArrowLeft } from 'lucide-react';
import { Select } from '@/design-system/components';
import { t } from '@core/i18n';
import type { ThemeId, ThemePreset, ThemeTokens } from '../../api/stores.api';
import { ColorInput } from '../SettingsForm';
import { PresetCard } from '../StoreGate';

const COLOR_LABELS: Array<[keyof ThemeTokens['colors'], string]> = [
  ['primary', t('Asal rang (buttons)')],
  ['secondary', t('Doosra rang')],
  ['accent', t('Nishan ka rang')],
  ['sale', t('Sale ka rang')],
  ['background', t('Peeche ka rang')],
  ['surface', t('Card ka rang')],
  ['text', t('Text ka rang')],
  ['muted', t('Halka text')],
  ['border', t('Line ka rang')],
];

export function ThemeTokensPanel({ tokens, themeId, themes, fonts, onChange, onSwitch, onBack }: {
  tokens: ThemeTokens;
  themeId: ThemeId;
  themes: ThemePreset[];
  fonts: string[];
  onChange: (next: ThemeTokens, tag?: string) => void;
  onSwitch: (id: ThemeId) => void;
  onBack: () => void;
}) {
  const fontOptions = fonts.map((f) => ({ value: f, label: f }));
  return (
    <div>
      <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[0.8125rem] font-medium text-slate-600 hover:bg-slate-100">
        <ArrowLeft className="h-4 w-4 rtl-flip" />{t('Sab hisse')}
      </button>

      <h3 className="mb-2 text-[0.9375rem] font-semibold text-slate-900">{t('Tayyar design')}</h3>
      <div className="grid grid-cols-2 gap-2">
        {themes.map((p) => <PresetCard key={p.id} preset={p} active={p.id === themeId} onPick={() => p.id !== themeId && onSwitch(p.id)} />)}
      </div>

      <h3 className="mb-2 mt-5 text-[0.9375rem] font-semibold text-slate-900">{t('Rang')}</h3>
      <div className="space-y-2">
        {COLOR_LABELS.map(([k, label]) => (
          <ColorInput key={k} label={label} value={tokens.colors[k]} onChange={(v) => onChange({ ...tokens, colors: { ...tokens.colors, [k]: v } }, `color:${k}`)} />
        ))}
      </div>

      <h3 className="mb-2 mt-5 text-[0.9375rem] font-semibold text-slate-900">{t('Font')}</h3>
      <div className="space-y-3">
        <Select label={t('Heading ka font')} value={tokens.fonts.heading} options={fontOptions} onChange={(e) => onChange({ ...tokens, fonts: { ...tokens.fonts, heading: e.target.value } })} />
        <Select label={t('Text ka font')} value={tokens.fonts.body} options={fontOptions} onChange={(e) => onChange({ ...tokens, fonts: { ...tokens.fonts, body: e.target.value } })} />
        <p className="rounded-lg bg-slate-50 p-2.5 text-[0.875rem] text-slate-700" style={{ fontFamily: tokens.fonts.body }}>
          <span className="block text-[1.0625rem] font-bold" style={{ fontFamily: tokens.fonts.heading }}>{t('Nayi collection aa gayi')}</span>
          {t('Ghar baithay delivery, Cash on Delivery ke saath.')}
        </p>
      </div>

      <h3 className="mb-2 mt-5 text-[0.9375rem] font-semibold text-slate-900">{t('Shakal')}</h3>
      <div className="space-y-3">
        <Select label={t('Kone')} value={tokens.radius} onChange={(e) => onChange({ ...tokens, radius: e.target.value as ThemeTokens['radius'] })}
          options={[{ value: 'none', label: t('Seedhe') }, { value: 'sm', label: t('Thore gol') }, { value: 'md', label: t('Gol') }, { value: 'lg', label: t('Zyada gol') }, { value: 'full', label: t('Poore gol') }]} />
        <Select label={t('Faasla')} value={tokens.spacing} onChange={(e) => onChange({ ...tokens, spacing: e.target.value as ThemeTokens['spacing'] })}
          options={[{ value: 'compact', label: t('Kam') }, { value: 'normal', label: t('Darmiyana') }, { value: 'roomy', label: t('Khula') }]} />
        <Select label={t('Button')} value={tokens.buttonStyle} onChange={(e) => onChange({ ...tokens, buttonStyle: e.target.value as ThemeTokens['buttonStyle'] })}
          options={[{ value: 'solid', label: t('Bhara hua') }, { value: 'outline', label: t('Sirf line') }, { value: 'pill', label: t('Gol (pill)') }]} />
        <Select label={t('Product card')} value={tokens.cardStyle} onChange={(e) => onChange({ ...tokens, cardStyle: e.target.value as ThemeTokens['cardStyle'] })}
          options={[{ value: 'plain', label: t('Saada') }, { value: 'bordered', label: t('Line ke saath') }, { value: 'shadow', label: t('Saaye ke saath') }]} />
      </div>
    </div>
  );
}
