/**
 * Link fields: an href (entry link, CTA keyword, path or URL), a CTA
 * (label + href + variant) and a citation source.
 */
import { useState, type ReactNode } from 'react';
import { FileSearch, Link2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { CTA_HREF_KEYWORDS, isValidHref, parseEntryLink, toEntryLink, type Cta, type Source } from '../contract/cms-contract';
import { useEditor } from '../editor/EditorContext';
import { EntrySearch } from './EntryPicker';
import { Field, Grid, Popover, Segmented, TextField, inputClass, useOutsideClick } from './ui';

const KEYWORD_LABEL: Record<string, string> = { signup: 'Signup', demo: 'Demo', whatsapp: 'WhatsApp' };

export function HrefField({
  value,
  onChange,
  label = 'Link',
  error,
  hint,
  required,
  keywords = true,
}: {
  value: string | undefined;
  onChange: (href: string | undefined) => void;
  label?: ReactNode;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  keywords?: boolean;
}) {
  const { refs } = useEditor();
  const [open, setOpen] = useState(false);
  const ref = useOutsideClick<HTMLDivElement>(open, () => setOpen(false));
  const v = value ?? '';
  const entry = parseEntryLink(v);
  const target = entry ? refs[entry.id] : undefined;
  const invalid = v !== '' && !isValidHref(v);
  return (
    <Field
      label={label}
      required={required}
      error={error ?? (invalid ? 'Link: entry:<id>, /path, #anchor, https://…, signup, demo ya whatsapp' : undefined)}
      hint={entry ? (target ? <span>→ {target.title} <span className="font-mono">{target.path}{entry.anchor ? `#${entry.anchor}` : ''}</span></span> : 'Entry link (save ke baad naam dikhega)') : hint}
    >
      <div ref={ref} className="relative">
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <Link2 className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-400" />
            <input
              value={v}
              onChange={(e) => onChange(e.target.value.trim() === '' ? undefined : e.target.value.trim())}
              placeholder="/pricing, https://…, entry:…"
              className={cn(inputClass, 'pl-8 font-mono text-[13px]', (error || invalid) && 'border-rose-300')}
            />
          </div>
          <button
            type="button"
            title="Kisi page se link karein"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-2.5 text-xs font-medium text-neutral-700 hover:border-emerald-400 hover:text-emerald-700"
          >
            <FileSearch className="h-4 w-4" /> Page
          </button>
        </div>
        {keywords && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {CTA_HREF_KEYWORDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => onChange(k)}
                className={cn(
                  'rounded-md border px-2 py-0.5 text-[11px] font-medium transition',
                  v === k ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:text-neutral-800',
                )}
              >
                {KEYWORD_LABEL[k] ?? k}
              </button>
            ))}
          </div>
        )}
        <Popover open={open} align="right">
          <EntrySearch
            onPick={(r) => {
              onChange(toEntryLink(r.id));
              setOpen(false);
            }}
          />
        </Popover>
      </div>
    </Field>
  );
}

type CtaDraft = Partial<Cta>;

export function CtaField({
  value,
  onChange,
  label,
  errors,
  optional,
}: {
  value: CtaDraft | undefined;
  onChange: (cta: CtaDraft | undefined) => void;
  label: ReactNode;
  /** Error lookup relative to the CTA ("label", "href"). */
  errors?: (path: string) => string | undefined;
  optional?: boolean;
}) {
  const cta = value ?? {};
  const set = (patch: CtaDraft) => onChange({ ...cta, ...patch });
  if (optional && !value) {
    return (
      <Field label={label}>
        <button
          type="button"
          onClick={() => onChange({ label: '', href: '', variant: 'secondary' })}
          className="w-full rounded-lg border border-dashed border-neutral-300 py-2 text-xs font-medium text-neutral-600 hover:border-emerald-400 hover:text-emerald-700"
        >
          + {typeof label === 'string' ? label : 'Button'} shamil karein
        </button>
      </Field>
    );
  }
  return (
    <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50/50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-neutral-700">{label}</span>
        {optional && (
          <button type="button" onClick={() => onChange(undefined)} className="text-xs text-neutral-500 hover:text-rose-600">
            Hatayein
          </button>
        )}
      </div>
      <Grid>
        <TextField label="Button text" value={cta.label} onChange={(label) => set({ label })} chars={{ max: 60 }} error={errors?.('label')} required />
        <Segmented
          label="Style"
          value={cta.variant ?? 'primary'}
          onChange={(variant) => set({ variant })}
          options={[
            { value: 'primary', label: 'Primary' },
            { value: 'secondary', label: 'Secondary' },
            { value: 'ghost', label: 'Ghost' },
          ]}
        />
      </Grid>
      <HrefField value={cta.href} onChange={(href) => set({ href: href ?? '' })} error={errors?.('href')} required />
      <TextField label="Analytics naam (trackAs)" value={cta.trackAs} onChange={(trackAs) => set({ trackAs: trackAs || undefined })} mono placeholder="hero_signup" error={errors?.('trackAs')} />
    </div>
  );
}

export function SourceFields({ value, onChange, errors }: { value: Partial<Source>; onChange: (next: Partial<Source>) => void; errors?: (path: string) => string | undefined }) {
  const set = (patch: Partial<Source>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-3">
      <TextField label="Title" value={value.title} onChange={(title) => set({ title })} error={errors?.('title')} required />
      <TextField label="URL" type="url" value={value.url} onChange={(url) => set({ url })} mono error={errors?.('url')} required />
      <Grid>
        <TextField label="Publisher" value={value.publisher} onChange={(publisher) => set({ publisher })} placeholder="FBR, PRA…" error={errors?.('publisher')} required />
        <TextField label="Check kiya (date)" type="date" value={value.accessedAt?.slice(0, 10)} onChange={(accessedAt) => set({ accessedAt })} error={errors?.('accessedAt')} required />
      </Grid>
    </div>
  );
}

export function emptySource(): Partial<Source> {
  return { title: '', url: '', publisher: '', accessedAt: new Date().toISOString().slice(0, 10) };
}
