/**
 * Font picker: curated fonts rendered in their own typeface, plus any font
 * from Google Fonts by name. A custom name is loaded and verified before it
 * is applied, so a typo shows "not found" instead of silently falling back.
 */

import { useEffect, useState } from 'react';
import { Check, ExternalLink, Loader2, Plus } from 'lucide-react';
import {
  customFontId, ensureFont, findLatinFont, findUrduFont, isCustomFontId, isValidFontFamily, verifyFont, type FontOption,
} from '@/design-system';
import { cn } from '@core/lib/cn';

type Kind = 'latin' | 'urdu';

const SUGGESTIONS: Record<Kind, string[]> = {
  latin: ['Lato', 'Roboto', 'Open Sans', 'Montserrat', 'Raleway', 'DM Sans', 'Work Sans', 'Outfit', 'Urbanist', 'Source Sans 3'],
  urdu: ['Amiri', 'Lateef', 'Mirza', 'Harmattan', 'Scheherazade New', 'Noto Kufi Arabic', 'Reem Kufi'],
};

interface FontPickerProps {
  kind: Kind;
  label: string;
  fonts: readonly FontOption[];
  value: string;
  sample: string;
  onChange: (id: string) => void;
}

export function FontPicker({ kind, label, fonts, value, sample, onChange }: FontPickerProps) {
  const rtl = kind === 'urdu';
  const find = kind === 'urdu' ? findUrduFont : findLatinFont;
  const custom = isCustomFontId(value) ? find(value) : null;
  const [name, setName] = useState('');
  const [status, setStatus] = useState<{ state: 'idle' | 'checking' | 'missing' | 'invalid'; family?: string }>({ state: 'idle' });

  useEffect(() => {
    fonts.forEach((f) => ensureFont(f));
    if (custom) ensureFont(custom);
  }, [fonts, custom]);

  const tryFont = async (family: string) => {
    const clean = family.trim().replace(/\s+/g, ' ');
    if (!isValidFontFamily(clean)) { setStatus({ state: 'invalid', family: clean }); return; }
    setStatus({ state: 'checking', family: clean });
    const option = find(customFontId(clean));
    if (await verifyFont(option)) {
      onChange(option.id);
      setName('');
      setStatus({ state: 'idle' });
    } else {
      setStatus({ state: 'missing', family: clean });
    }
  };

  const card = (f: FontOption) => {
    const active = f.id === value;
    return (
      <button
        key={f.id}
        type="button"
        role="radio"
        aria-checked={active}
        onClick={() => onChange(f.id)}
        className={cn(
          'flex items-center gap-3 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
          active ? 'border-brand-500 ring-1 ring-brand-500' : 'border-slate-200 hover:border-slate-300',
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[0.75rem] font-medium text-slate-500">{f.label}{isCustomFontId(f.id) ? ' · Google Fonts' : ''}</span>
          <span dir={rtl ? 'rtl' : undefined} className={cn('mt-0.5 block truncate text-[1.0625rem] text-slate-900', rtl && 'leading-loose')} style={{ fontFamily: f.stack }}>
            {sample}
          </span>
        </span>
        {active && (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-brand-fg">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label={label} className="grid gap-2 sm:grid-cols-2">
        {custom && card(custom)}
        {fonts.map(card)}
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[0.8125rem] font-semibold text-slate-900">Any Google Font</span>
          <a href="https://fonts.google.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-brand-700 hover:underline">
            Browse fonts.google.com <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <p className="mt-0.5 text-[0.75rem] text-slate-500">Font ka naam bilkul waisa likhein jaisa Google Fonts par hai.</p>
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => { e.preventDefault(); if (name.trim()) tryFont(name); }}
        >
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); if (status.state !== 'idle') setStatus({ state: 'idle' }); }}
            placeholder={kind === 'urdu' ? 'e.g. Amiri' : 'e.g. Montserrat'}
            aria-label="Google Font name"
            className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-[0.8125rem] text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
          <button type="submit" disabled={!name.trim() || status.state === 'checking'}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-[0.8125rem] font-semibold text-brand-fg transition hover:bg-brand-700 disabled:opacity-50">
            {status.state === 'checking' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Use
          </button>
        </form>
        {status.state === 'missing' && (
          <p className="mt-2 text-[0.75rem] text-rose-700">“{status.family}” Google Fonts par nahi mila — spelling check karein.</p>
        )}
        {status.state === 'invalid' && (
          <p className="mt-2 text-[0.75rem] text-rose-700">Sirf harf, number aur space — jaise “Open Sans”.</p>
        )}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {SUGGESTIONS[kind].map((family) => (
            <button key={family} type="button" onClick={() => tryFont(family)}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[0.75rem] font-medium text-slate-700 transition hover:border-brand-300 hover:text-brand-700">
              {family}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
