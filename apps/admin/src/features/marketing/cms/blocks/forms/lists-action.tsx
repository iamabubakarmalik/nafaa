/** Forms for entryGrid, relatedLinks, cityFacts, cta, leadForm and tool. */
import {
  BLOCK_LIMITS,
  CITY_FACT_SECTIONS,
  CMS_ENTRY_TYPES,
  ENTRY_TYPE_META,
  FEATURE_STATUSES,
  FEATURE_STATUS_TYPES,
  LEAD_CURRENCIES,
  LEAD_FORM_TYPES,
  TOOL_KEYS,
  type CmsEntryType,
  type EntrySort,
  type FeatureStatus,
  type ToolKey,
} from '../../contract/cms-contract';
import { EntryPicker } from '../../fields/EntryPicker';
import { CtaField } from '../../fields/LinkFields';
import { MarkdownEditor } from '../../fields/MarkdownEditor';
import { ChipMultiSelect, Grid, NumberField, Section, Segmented, SelectField, TextField, Toggle } from '../../fields/ui';
import { scoped, type BlockFormProps } from '../types';

const TYPE_OPTIONS = CMS_ENTRY_TYPES.map((t) => ({ value: t, label: ENTRY_TYPE_META[t].labelPlural }));

export function EntryGridForm({ block, set, err }: BlockFormProps<'entryGrid'>) {
  const filter = block.filter ?? {};
  const setFilter = (patch: Partial<typeof filter>) => {
    const next = { ...filter, ...patch };
    const clean = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined && v !== null && v !== ''));
    set({ filter: Object.keys(clean).length ? clean : undefined });
  };
  return (
    <div className="space-y-5">
      <TextField label="Heading" value={block.heading} onChange={(heading) => set({ heading: heading || undefined })} chars={{ max: 120 }} />
      <MarkdownEditor label="Intro" inline rows={2} value={block.intro} onChange={(intro) => set({ intro: intro || undefined })} />
      <Grid>
        <SelectField<CmsEntryType> label="Kis type ki entries" required value={block.entryType} onChange={(entryType) => entryType && set({ entryType })} options={TYPE_OPTIONS} error={err('entryType')} />
        <Segmented
          label="Layout"
          value={block.layout}
          onChange={(layout) => set({ layout })}
          options={[
            { value: 'cards', label: 'Cards' },
            { value: 'list', label: 'List' },
            { value: 'grouped', label: 'Groups' },
          ]}
          hint={block.layout === 'grouped' ? 'Settings → Industry groups ki tarteeb se' : undefined}
          error={err('layout')}
        />
      </Grid>
      <Grid>
        <SelectField<EntrySort>
          label="Tarteeb"
          value={block.sort}
          onChange={(sort) => set({ sort })}
          emptyLabel="Default"
          options={[
            { value: 'order', label: 'Sort order' },
            { value: 'recent', label: 'Naye pehle' },
            { value: 'title', label: 'Title (A-Z)' },
          ]}
        />
        <NumberField label="Limit" value={block.limit} min={1} max={BLOCK_LIMITS.entryGridLimitMax} onChange={(limit) => set({ limit })} placeholder="Sab" error={err('limit')} />
      </Grid>
      <Section title="Filter" description="Sirf woh entries jo in sharton par poori utrein">
        <Grid>
          <EntryPicker label="Tag (is entry se tagged)" value={filter.tagId} onChange={(tagId) => setFilter({ tagId: tagId ?? undefined })} />
          <EntryPicker label="Parent" value={filter.parentId} onChange={(parentId) => setFilter({ parentId: parentId ?? undefined })} />
        </Grid>
        <Grid>
          <TextField label="Group key" mono value={filter.group} onChange={(group) => setFilter({ group: group || undefined })} placeholder="retail" error={err('filter.group')} />
          <div className="pt-6">
            <Toggle checked={filter.featured} onChange={(featured) => setFilter({ featured: featured || undefined })} label="Sirf featured" />
          </div>
        </Grid>
        {block.entryType && (FEATURE_STATUS_TYPES as readonly string[]).includes(block.entryType) && (
          <ChipMultiSelect<FeatureStatus>
            label="Feature status"
            hint="Roadmap page par 'coming' aur 'beta' chunein"
            value={filter.status}
            onChange={(status) => setFilter({ status: status.length ? status : undefined })}
            options={FEATURE_STATUSES.map((s) => ({ value: s, label: s }))}
          />
        )}
      </Section>
    </div>
  );
}

export function RelatedLinksForm({ block, set, err }: BlockFormProps<'relatedLinks'>) {
  return (
    <div className="space-y-5">
      <TextField label="Heading" value={block.heading} onChange={(heading) => set({ heading: heading || undefined })} chars={{ max: 120 }} placeholder="Related" />
      <Segmented
        label="Cards kahan se"
        value={block.source}
        onChange={(source) => set({ source })}
        options={[
          { value: 'related', label: 'Related (Links tab)' },
          { value: 'tags', label: 'Tags' },
        ]}
        error={err('source')}
      />
      <Grid>
        <SelectField<CmsEntryType> label="Sirf is type ke" value={block.tagType} onChange={(tagType) => set({ tagType })} emptyLabel="Sab types" options={TYPE_OPTIONS} />
        <NumberField label="Limit" value={block.limit} min={1} max={BLOCK_LIMITS.relatedLimitMax} onChange={(limit) => set({ limit })} error={err('limit')} />
      </Grid>
    </div>
  );
}

const CITY_SECTION_LABEL: Record<(typeof CITY_FACT_SECTIONS)[number], string> = {
  tax: 'Tax',
  markets: 'Markets',
  areas: 'Areas',
  support: 'Support',
  nearby: 'Qareebi shehar',
};

export function CityFactsForm({ block, set, err }: BlockFormProps<'cityFacts'>) {
  return (
    <div className="space-y-5">
      <TextField label="Heading" value={block.heading} onChange={(heading) => set({ heading: heading || undefined })} chars={{ max: 120 }} />
      <ChipMultiSelect
        label="Kya dikhayein"
        hint="Data Details tab ke City data se aata hai"
        value={block.show}
        onChange={(show) => set({ show })}
        options={CITY_FACT_SECTIONS.map((s) => ({ value: s, label: CITY_SECTION_LABEL[s] }))}
        error={err('show')}
      />
    </div>
  );
}

export function CtaBandForm({ block, set, err }: BlockFormProps<'cta'>) {
  return (
    <div className="space-y-5">
      <TextField label="Heading" required value={block.heading} onChange={(heading) => set({ heading })} chars={{ max: 120 }} error={err('heading')} />
      <MarkdownEditor label="Text" inline rows={2} value={block.body} onChange={(body) => set({ body: body || undefined })} />
      <CtaField label="Primary button" value={block.primaryCta} onChange={(c) => set({ primaryCta: c as typeof block.primaryCta })} errors={scoped(err, 'primaryCta')} />
      <CtaField label="Secondary button" optional value={block.secondaryCta} onChange={(c) => set({ secondaryCta: c as typeof block.secondaryCta })} errors={scoped(err, 'secondaryCta')} />
    </div>
  );
}

export function LeadFormForm({ block, set, err }: BlockFormProps<'leadForm'>) {
  return (
    <div className="space-y-5">
      <p className="rounded-xl bg-neutral-50 p-3 text-xs text-neutral-600 ring-1 ring-neutral-200">
        Form ki entries Marketing → Contact Forms / Demo Bookings aur Leads me aati hain.
      </p>
      <TextField label="Heading" required value={block.heading} onChange={(heading) => set({ heading })} chars={{ max: 120 }} error={err('heading')} />
      <MarkdownEditor label="Intro" inline rows={2} value={block.intro} onChange={(intro) => set({ intro: intro || undefined })} />
      <Grid>
        <Segmented
          label="Form"
          value={block.form}
          onChange={(form) => set({ form })}
          options={[
            { value: 'contact', label: 'Contact' },
            { value: 'quote', label: 'Quote lein' },
            { value: 'demo', label: 'Demo' },
          ]}
          error={err('form')}
        />
        {block.form === 'contact' && (
          <SelectField label="Form type" value={block.formType} onChange={(formType) => set({ formType })} emptyLabel="General" options={LEAD_FORM_TYPES.map((t) => ({ value: t, label: t }))} />
        )}
      </Grid>
      {block.form === 'quote' && (
        <ChipMultiSelect
          label="Budget currency"
          hint="Khali ho to PKR aur USD dono"
          value={block.currencies}
          onChange={(currencies) => set({ currencies: currencies.length ? currencies : undefined })}
          options={LEAD_CURRENCIES.map((c) => ({ value: c, label: c }))}
          error={err('currencies')}
        />
      )}
      <Toggle checked={block.whatsapp} onChange={(whatsapp) => set({ whatsapp: whatsapp || undefined })} label="WhatsApp button bhi" hint="Site settings ka WhatsApp number" />
      <TextField label="Subject prefix" value={block.subjectPrefix} onChange={(subjectPrefix) => set({ subjectPrefix: subjectPrefix || undefined })} chars={{ max: 80 }} placeholder="[Service: Website]" hint="Lead ke subject ke shuru me lagta hai, taake pata chale kis page se aayi" />
      <TextField label="Kamyabi ka message" required value={block.successMessage} onChange={(successMessage) => set({ successMessage })} chars={{ max: 300 }} error={err('successMessage')} />
    </div>
  );
}

const TOOL_LABEL: Record<ToolKey, string> = {
  'gst-calculator': 'GST calculator',
  'profit-margin-calculator': 'Profit margin calculator',
  'pos-cost-calculator': 'POS cost calculator',
  'invoice-generator': 'Invoice generator',
  'gold-rate-calculator': 'Gold rate calculator',
  'fbr-tier-1-checker': 'FBR Tier-1 checker',
};

export function ToolForm({ block, set, err }: BlockFormProps<'tool'>) {
  return <SelectField<ToolKey> label="Tool" required value={block.toolKey} onChange={(toolKey) => toolKey && set({ toolKey })} options={TOOL_KEYS.map((k) => ({ value: k, label: TOOL_LABEL[k] }))} error={err('toolKey')} />;
}
