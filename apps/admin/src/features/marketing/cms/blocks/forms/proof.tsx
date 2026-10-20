/** Forms for faq, testimonial, logoCloud and sources. */
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import { cmsApi } from '@/api/marketing/marketing-cms.api';
import { BLOCK_LIMITS, type Source } from '../../contract/cms-contract';
import { EntryPicker } from '../../fields/EntryPicker';
import { SourceFields, emptySource } from '../../fields/LinkFields';
import { Field, Grid, ListEditor, NumberField, Segmented, TextField } from '../../fields/ui';
import type { BlockFormProps } from '../types';

export function FaqForm({ block, set }: BlockFormProps<'faq'>) {
  return (
    <div className="space-y-4">
      <TextField label="Heading" value={block.heading} onChange={(heading) => set({ heading: heading || undefined })} chars={{ max: 120 }} placeholder="Aksar pooche jane wale sawal" />
      <p className="rounded-xl bg-neutral-50 p-3 text-xs text-neutral-600 ring-1 ring-neutral-200">
        Sawal aur jawab right panel ke <b>FAQ</b> tab se jorein. Jo FAQs page par dikhte hain wohi FAQPage schema me jate hain.
      </p>
    </div>
  );
}

function ConsentNote() {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-emerald-50/70 p-3 text-xs text-emerald-900 ring-1 ring-emerald-200">
      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <p>Sirf woh customers dikhte hain jin ki likhi hui ijazat (consent) Customers screen me darj hai. Kuch na ho to block khaali rehta hai, koi naqli cheez nahi aati.</p>
    </div>
  );
}

interface PickDraft {
  heading?: string;
  mode?: 'pick' | 'auto';
  ids?: string[];
  filter?: { industryId?: string; cityId?: string };
  limit?: number;
}

function PickOrAuto({ block, set, err, kind }: { block: PickDraft; set: (patch: Partial<PickDraft>) => void; err: (path: string) => string | undefined; kind: 'testimonial' | 'logoCloud' }) {
  const isQuotes = kind === 'testimonial';
  const { data: testimonials } = useQuery({
    queryKey: ['cms', 'testimonials', 'picker'],
    queryFn: () => cmsApi.testimonials({ status: 'PUBLISHED', limit: 200 }),
    enabled: isQuotes && block.mode === 'pick',
  });
  const { data: customers } = useQuery({
    queryKey: ['cms', 'customers', 'picker'],
    queryFn: () => cmsApi.customers({ public: true, limit: 200 }),
    enabled: !isQuotes && block.mode === 'pick',
  });
  const ids = block.ids ?? [];
  const options = isQuotes
    ? (testimonials?.items ?? []).map((t) => ({ id: t.id, title: t.personName, sub: `${t.customer.name} — “${t.quote.slice(0, 70)}…”` }))
    : (customers?.items ?? []).filter((c) => c.consentScope.includes('LOGO')).map((c) => ({ id: c.id, title: c.name, sub: c.website ?? '' }));
  const filter = block.filter ?? {};
  return (
    <div className="space-y-5">
      <ConsentNote />
      <TextField label="Heading" value={block.heading} onChange={(heading) => set({ heading: heading || undefined })} chars={{ max: 120 }} />
      <Segmented
        label="Kaise chunein"
        value={block.mode}
        onChange={(mode) => set({ mode })}
        options={[
          { value: 'auto', label: 'Auto (tag se)' },
          { value: 'pick', label: 'Khud chunein' },
        ]}
        error={err('mode')}
      />
      {block.mode === 'pick' ? (
        <Field label={isQuotes ? 'Quotes' : 'Logos'} error={err('ids')} hint={`${ids.length} chune (zyada se zyada ${BLOCK_LIMITS.pickIdsMax})`}>
          <div className="max-h-72 space-y-1.5 overflow-y-auto">
            {options.length === 0 && <p className="rounded-lg bg-neutral-50 p-3 text-xs text-neutral-500">Abhi koi consented {isQuotes ? 'quote' : 'logo'} nahi hai.</p>}
            {options.map((o) => {
              const on = ids.includes(o.id);
              return (
                <label key={o.id} className={cn('flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2', on ? 'border-emerald-300 bg-emerald-50/60' : 'border-neutral-200')}>
                  <input type="checkbox" className="mt-1 accent-emerald-600" checked={on} onChange={() => set({ ids: on ? ids.filter((x) => x !== o.id) : [...ids, o.id] })} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-neutral-800">{o.title}</span>
                    <span className="block truncate text-xs text-neutral-500">{o.sub}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </Field>
      ) : (
        <Grid>
          <EntryPicker label="Industry filter" types={['INDUSTRY']} value={filter.industryId} onChange={(industryId) => set({ filter: { ...filter, industryId: industryId ?? undefined } })} />
          <EntryPicker label="City filter" types={['CITY']} value={filter.cityId} onChange={(cityId) => set({ filter: { ...filter, cityId: cityId ?? undefined } })} />
        </Grid>
      )}
      <NumberField
        label="Kitne dikhayein"
        value={block.limit}
        min={1}
        max={isQuotes ? BLOCK_LIMITS.testimonialLimitMax : BLOCK_LIMITS.logoLimitMax}
        onChange={(limit) => set({ limit })}
        error={err('limit')}
      />
    </div>
  );
}

export function TestimonialForm({ block, set, err }: BlockFormProps<'testimonial'>) {
  return <PickOrAuto block={block} set={set} err={err} kind="testimonial" />;
}

export function LogoCloudForm({ block, set, err }: BlockFormProps<'logoCloud'>) {
  return <PickOrAuto block={block} set={set} err={err} kind="logoCloud" />;
}

export function SourcesForm({ block, set, err }: BlockFormProps<'sources'>) {
  return (
    <div className="space-y-5">
      <TextField label="Heading" value={block.heading} onChange={(heading) => set({ heading: heading || undefined })} chars={{ max: 120 }} placeholder="Sources" />
      <ListEditor<Partial<Source>>
        label="Sources"
        hint="Official domains (FBR, PRA, SRB…) follow links ke saath dikhte hain"
        items={block.items as Partial<Source>[] | undefined}
        onChange={(items) => set({ items: items as typeof block.items })}
        min={1}
        max={BLOCK_LIMITS.sourcesMax}
        create={emptySource}
        itemTitle={(s, i) => s.title || `Source ${i + 1}`}
        addLabel="Source shamil karein"
        error={err('items')}
        render={(s, update, i) => <SourceFields value={s} onChange={update} errors={(p) => err(`items[${i}].${p}`)} />}
      />
    </div>
  );
}
