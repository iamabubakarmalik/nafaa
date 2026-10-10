/**
 * Accent color picker: the industry color, curated presets, or any custom
 * color (native color picker plus a hex field). Shows a live button sample
 * and warns when the color is too light for white button text.
 */

import { useEffect, useState } from 'react';
import { Check, Pipette } from 'lucide-react';
import { BRAND_PRESETS, contrastRatio, industryIdentity, isHexColor, readableOn } from '@/design-system';
import { cn } from '@core/lib/cn';

interface AccentPickerProps {
  /** The chosen hex, or null when following the industry color. */
  value: string | null;
  /** The color actually in use (after fallbacks). */
  effectiveHex: string;
  industryId?: string;
  onChange: (hex: string | null) => void;
}

const normalize = (hex: string) => (hex.startsWith('#') ? hex : `#${hex}`).toLowerCase();

export function AccentPicker({ value, effectiveHex, industryId, onChange }: AccentPickerProps) {
  const identity = industryIdentity(industryId);
  const IndustryIcon = identity.icon;
  const [hex, setHex] = useState(effectiveHex);
  useEffect(() => { setHex(effectiveHex); }, [effectiveHex]);

  const current = value ? normalize(value) : null;
  const isPreset = !!current && BRAND_PRESETS.some((p) => p.hex === current);
  const lowContrast = contrastRatio(effectiveHex, '#ffffff') < 3;

  const commitHex = (raw: string) => {
    const candidate = normalize(raw.trim());
    if (isHexColor(candidate) && candidate.length === 7) onChange(candidate);
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={!current}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition',
          !current ? 'border-brand-500 ring-1 ring-brand-500' : 'border-slate-200 hover:border-slate-300',
        )}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: identity.color }}>
          <IndustryIcon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.8125rem] font-semibold text-slate-900">Industry color — {identity.label}</span>
          <span className="block text-[0.75rem] text-slate-500">Aap ki industry ki pehchan wala rang</span>
        </span>
        {!current && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
      </button>

      <div>
        <div className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-400">Presets</div>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {BRAND_PRESETS.map((p) => {
            const active = current === p.hex;
            return (
              <button
                key={p.id}
                type="button"
                title={p.label}
                aria-label={p.label}
                aria-pressed={active}
                onClick={() => onChange(p.hex)}
                className={cn(
                  'relative aspect-square rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                  active ? 'ring-2 ring-slate-900 ring-offset-2' : 'hover:scale-105',
                )}
                style={{ backgroundColor: p.hex }}
              >
                {active && <Check className="absolute inset-0 m-auto h-4 w-4" style={{ color: readableOn(p.hex) }} strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className={cn(
          'relative flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-[0.8125rem] font-semibold transition',
          current && !isPreset ? 'border-brand-500 ring-1 ring-brand-500' : 'border-slate-200 hover:border-slate-300',
        )}>
          <Pipette className="h-4 w-4 text-slate-500" />
          Custom
          <input type="color" value={effectiveHex} onChange={(e) => onChange(e.target.value.toLowerCase())}
            className="absolute inset-0 cursor-pointer opacity-0" aria-label="Pick a custom color" />
        </label>
        <div className="flex h-10 items-center rounded-lg border border-slate-200 bg-white pl-2 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
          <span className="h-6 w-6 rounded-md ring-1 ring-inset ring-black/10" style={{ backgroundColor: effectiveHex }} />
          <input
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            onBlur={(e) => commitHex(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitHex((e.target as HTMLInputElement).value); }}
            spellCheck={false}
            aria-label="Hex color"
            className="h-full w-24 bg-transparent px-2 font-mono text-[0.8125rem] uppercase text-slate-900 outline-none"
          />
        </div>
        <span className="inline-flex h-10 items-center rounded-lg bg-brand-600 px-4 text-[0.8125rem] font-semibold text-brand-fg shadow-sm">
          Button
        </span>
        <span className="text-[0.8125rem] font-semibold text-brand-700 underline underline-offset-2">Link</span>
      </div>

      {lowContrast && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-800 ring-1 ring-inset ring-amber-200">
          Ye rang halka hai — buttons par text khud gehra (dark) kar diya gaya hai taake parhne me aasan rahe.
        </p>
      )}
    </div>
  );
}
