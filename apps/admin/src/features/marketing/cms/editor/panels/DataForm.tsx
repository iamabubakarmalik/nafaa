/**
 * Type-specific `data` form (API-CONTRACT 5.1). Required fields carry a star;
 * errors come from the contract's publish schema, so editors see what will
 * block publish while they type.
 */
import { useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cmsApi } from '@/api/marketing/marketing-cms.api';
import { cn } from '@/lib/cn';
import {
  CHANGELOG_KINDS,
  CITY_AUTHORITIES,
  CMS_ENTRY_TYPES,
  ENTRY_TYPE_META,
  HTTP_METHODS,
  INDUSTRY_AUTHORITIES,
  MIN_CONTRAST_WITH_WHITE,
  PAGE_TEMPLATES,
  PLAN_FEATURE_KEYS,
  PROVINCES,
  TEMPLATE_FORMATS,
  TOOL_KEYS,
  contrastRatioWithWhite,
  formatIssuePath,
  parseEntryData,
  type CmsEntryType,
  type FeatureStatus,
  type Source,
} from '../../contract/cms-contract';
import { EntryMultiPicker, EntryPicker } from '../../fields/EntryPicker';
import { IconPicker } from '../../fields/IconPicker';
import { SourceFields, emptySource } from '../../fields/LinkFields';
import { MarkdownEditor } from '../../fields/MarkdownEditor';
import { MediaField } from '../../fields/MediaField';
import { Field, Grid, ListEditor, NumberField, SelectField, StringListField, TextArea, TextField, Toggle } from '../../fields/ui';
import { FeatureStatusField } from '../../blocks/forms/selling';

type Data = Record<string, unknown>;
type Err = (path: string) => string | undefined;

const opts = <T extends string>(list: readonly T[], label?: (v: T) => string) => list.map((v) => ({ value: v, label: label ? label(v) : v }));
const PAGE_TEMPLATE_LABEL: Record<string, string> = {
  home: 'Home',
  pricing: 'Pricing',
  hub: 'Hub (list page)',
  default: 'Default',
  legal: 'Legal',
  contact: 'Contact',
  roadmap: 'Roadmap (coming / beta)',
};

export function DataForm({ type, data, onChange, required }: { type: CmsEntryType; data: Data; onChange: (next: Data) => void; required: readonly string[] }) {
  const errors = useMemo(() => {
    const res = parseEntryData(type, data, 'publish');
    const out: Record<string, string> = {};
    if (!res.success) for (const i of res.error.issues) out[formatIssuePath(i.path)] ??= i.message;
    return out;
  }, [type, data]);
  const err: Err = (p) => errors[p];
  const set = (patch: Data) => {
    const next = { ...data, ...patch };
    for (const [k, v] of Object.entries(patch)) if (v === undefined) delete next[k];
    onChange(next);
  };
  const s = (k: string) => (typeof data[k] === 'string' ? (data[k] as string) : undefined);
  const req = (k: string) => required.includes(k);
  const text = (k: string, label: string, extra: { max?: number; placeholder?: string; hint?: ReactNode; mono?: boolean; type?: 'text' | 'url' | 'date' } = {}) => (
    <TextField
      label={label}
      required={req(k)}
      value={s(k)}
      onChange={(v) => set({ [k]: v || undefined })}
      chars={extra.max ? { max: extra.max } : undefined}
      placeholder={extra.placeholder}
      hint={extra.hint}
      mono={extra.mono}
      type={extra.type}
      error={err(k)}
    />
  );
  const icon = (k = 'icon', label = 'Icon') => <IconPicker label={label} required={req(k)} value={s(k)} onChange={(v) => set({ [k]: v })} error={err(k)} />;
  const status = () => <FeatureStatusField value={s('status') as FeatureStatus | undefined} onChange={(v) => set({ status: v ?? 'live' })} />;

  switch (type) {
    case 'PAGE':
      return (
        <Grid>
          <SelectField label="Template" value={s('template') ?? 'default'} onChange={(v) => set({ template: v })} options={opts(PAGE_TEMPLATES, (t) => PAGE_TEMPLATE_LABEL[t] ?? t)} error={err('template')} />
          <SelectField<CmsEntryType> label="Hub kis ka" value={s('hubOf') as CmsEntryType | undefined} onChange={(v) => set({ hubOf: v })} emptyLabel="—" options={CMS_ENTRY_TYPES.map((t) => ({ value: t, label: ENTRY_TYPE_META[t].labelPlural }))} />
        </Grid>
      );
    case 'PRODUCT':
      return (
        <div className="space-y-4">
          <Grid>
            {icon()}
            {status()}
          </Grid>
          <Grid>
            {text('shortName', 'Chhota naam', { max: 40, placeholder: 'Offline POS' })}
            {text('benefit', 'Fayda (title me)', { max: 60 })}
          </Grid>
          <Grid>
            <SelectField label="Plan feature" value={s('planFeature')} onChange={(v) => set({ planFeature: v })} emptyLabel="—" options={opts(PLAN_FEATURE_KEYS)} hint="Kis plan flag se juda hai" />
            {text('appRoute', 'App route', { mono: true, placeholder: '/pos' })}
          </Grid>
        </div>
      );
    case 'INDUSTRY':
      return <IndustryData data={data} set={set} err={err} req={req} icon={icon} text={text} />;
    case 'SOLUTION':
      return (
        <div className="space-y-4">
          <Grid>
            {icon()}
            {status()}
          </Grid>
          <Grid>
            {text('shortName', 'Chhota naam', { max: 40 })}
            {text('outcome', 'Natija (title me)', { max: 60 })}
          </Grid>
          {text('segment', 'Segment', { max: 60, placeholder: 'Multi-branch retail' })}
        </div>
      );
    case 'SERVICE':
      return (
        <div className="space-y-4">
          <Grid>
            {icon()}
            {status()}
          </Grid>
          <Grid>
            {text('shortName', 'Chhota naam', { max: 40 })}
            <SelectField label="Kahan" required value={s('areaServed') as 'PK' | 'worldwide' | undefined} onChange={(v) => set({ areaServed: v })} options={[{ value: 'PK', label: 'Pakistan' }, { value: 'worldwide', label: 'Worldwide' }]} error={err('areaServed')} hint={s('areaServed') === 'worldwide' ? 'Title "for Businesses Worldwide" pattern lega' : undefined} />
          </Grid>
          {text('pricingModel', 'Pricing model', { max: 200, placeholder: 'Fixed quote, PKR ya USD', hint: 'Rate khud na likhein jab tak tay na ho' })}
          {text('timeline', 'Timeline', { max: 200 })}
        </div>
      );
    case 'INTEGRATION':
      return (
        <div className="space-y-4">
          <Grid>
            <FeatureStatusField value={(s('status') as FeatureStatus | undefined) ?? 'coming'} onChange={(v) => set({ status: v ?? 'live' })} />
            {text('category', 'Category', { max: 60, placeholder: 'Payments' })}
          </Grid>
          <Grid>
            {icon()}
            {text('verifiedAt', 'Verify kiya (date)', { type: 'date', hint: 'Live ke liye zaroori' })}
          </Grid>
          {text('vendorUrl', 'Vendor URL', { type: 'url', mono: true })}
          <MediaField label="Logo" kinds={['LOGO', 'IMAGE']} value={s('logoMediaId')} onChange={(v) => set({ logoMediaId: v })} />
        </div>
      );
    case 'COMPLIANCE':
      return (
        <div className="space-y-4">
          <Grid>
            <SelectField label="Authority" required value={s('authority')} onChange={(v) => set({ authority: v })} options={opts(INDUSTRY_AUTHORITIES)} error={err('authority')} />
            {text('effectiveDate', 'Effective date', { type: 'date' })}
          </Grid>
          <StringListField label="SRO references" value={data.sroRefs as string[] | undefined} onChange={(v) => set({ sroRefs: v })} max={30} placeholder="SRO 1006(I)/2021" />
          <TextArea label="Penalty summary" value={s('penaltySummary')} onChange={(v) => set({ penaltySummary: v || undefined })} chars={{ max: 500 }} rows={3} />
        </div>
      );
    case 'CITY':
      return <CityData data={data} set={set} err={err} req={req} text={text} />;
    case 'CITY_INDUSTRY':
      return (
        <div className="space-y-4">
          <EntryPicker label="Industry" required types={['INDUSTRY']} value={s('industryId')} onChange={(v) => set({ industryId: v ?? undefined })} error={err('industryId')} hint="Parent (Details me) CITY hona chahiye" />
          <TextArea label="Saboot (evidence)" required value={s('evidence')} onChange={(v) => set({ evidence: v || undefined })} chars={{ max: 1000 }} rows={3} hint="Case study ya '5+ asal customers' ka note" error={err('evidence')} />
        </div>
      );
    case 'BEST_OF':
      return <BestOfData data={data} set={set} err={err} text={text} />;
    case 'COMPARE':
    case 'ALTERNATIVE':
      return (
        <div className="space-y-4">
          <Grid>
            {text('competitorName', 'Competitor', { max: 80 })}
            {text('competitorUrl', 'Competitor URL', { type: 'url', mono: true })}
          </Grid>
          <MarkdownEditor label="Faisla (verdict)" required inline rows={3} value={s('verdict')} onChange={(v) => set({ verdict: v || undefined })} error={err('verdict')} />
          {text('competitorPrice', 'Competitor price', { max: 120, hint: 'Sirf source ke saath' })}
          <OptionalSource label="Price ka source" value={data.priceSource as Partial<Source> | undefined} onChange={(v) => set({ priceSource: v })} err={(p) => err(`priceSource.${p}`)} />
        </div>
      );
    case 'BLOG_POST':
    case 'GUIDE':
      return (
        <div className="space-y-3">
          <Toggle checked={data.toc !== false} onChange={(toc) => set({ toc })} label="Table of contents" />
          {typeof data.readingMinutes === 'number' && <p className="text-xs text-neutral-500">Parhne ka waqt: {data.readingMinutes} min (API hisaab lagati hai)</p>}
        </div>
      );
    case 'BLOG_CATEGORY':
      return icon();
    case 'GLOSSARY_TERM':
      return (
        <div className="space-y-4">
          {text('term', 'Term', { max: 80 })}
          <TextArea label="Definition (1 jumla)" required value={s('definition')} onChange={(v) => set({ definition: v || undefined })} chars={{ max: 400 }} rows={2} error={err('definition')} />
          <TextArea label="Definition (Roman Urdu)" required value={s('definitionRomanUrdu')} onChange={(v) => set({ definitionRomanUrdu: v || undefined })} chars={{ max: 400 }} rows={2} error={err('definitionRomanUrdu')} />
          <MarkdownEditor label="Misaal" rows={4} value={s('example')} onChange={(v) => set({ example: v || undefined })} />
          <StringListField label="Doosre naam" value={data.alsoKnownAs as string[] | undefined} onChange={(v) => set({ alsoKnownAs: v })} max={12} />
        </div>
      );
    case 'TOOL':
      return (
        <Grid>
          <SelectField label="Tool" required value={s('toolKey')} onChange={(v) => set({ toolKey: v })} options={opts(TOOL_KEYS)} error={err('toolKey')} />
          {text('kind', 'Kism (title me)', { max: 40, placeholder: 'GST' })}
        </Grid>
      );
    case 'TEMPLATE':
      return (
        <div className="space-y-4">
          <MediaField label="File" required kinds={['DOCUMENT']} value={s('fileMediaId')} onChange={(v) => set({ fileMediaId: v })} error={err('fileMediaId')} />
          <SelectField label="Format" required value={s('format')} onChange={(v) => set({ format: v })} options={opts(TEMPLATE_FORMATS)} error={err('format')} />
        </div>
      );
    case 'CASE_STUDY':
      return <CaseStudyData data={data} set={set} err={err} />;
    case 'PERSON':
      return (
        <div className="space-y-4">
          <Grid>
            {text('name', 'Naam', { max: 80 })}
            {text('role', 'Role', { max: 80 })}
          </Grid>
          <MediaField label="Photo" kinds={['IMAGE']} value={s('photoMediaId')} onChange={(v) => set({ photoMediaId: v })} />
          <StringListField label="Profiles (sameAs)" value={data.sameAs as string[] | undefined} onChange={(v) => set({ sameAs: v })} max={12} placeholder="https://linkedin.com/in/…" error={Object.entries(errors).find(([k]) => k.startsWith('sameAs'))?.[1]} />
          <StringListField label="Mahir (knowsAbout)" value={data.knowsAbout as string[] | undefined} onChange={(v) => set({ knowsAbout: v })} max={20} />
        </div>
      );
    case 'DOC': {
      const apiRef = (data.apiRef as { method?: string; path?: string } | undefined) ?? undefined;
      return (
        <div className="space-y-4">
          {text('navTitle', 'Sidebar title', { max: 60 })}
          <Grid>
            <SelectField label="API method" value={apiRef?.method} onChange={(method) => set({ apiRef: method ? { ...apiRef, method } : undefined })} emptyLabel="—" options={opts(HTTP_METHODS)} />
            <TextField label="API path" mono value={apiRef?.path} onChange={(path) => set({ apiRef: { ...apiRef, path } })} placeholder="/v1/products" error={err('apiRef.path')} />
          </Grid>
        </div>
      );
    }
    case 'CHANGELOG':
      return (
        <Grid cols={3}>
          {text('date', 'Date', { type: 'date' })}
          {text('version', 'Version', { max: 40 })}
          <SelectField label="Kism" required value={s('kind')} onChange={(v) => set({ kind: v })} options={opts(CHANGELOG_KINDS)} error={err('kind')} />
        </Grid>
      );
  }
}

type TextFn = (k: string, label: string, extra?: { max?: number; placeholder?: string; hint?: ReactNode; mono?: boolean; type?: 'text' | 'url' | 'date' }) => ReactNode;

function IndustryData({ data, set, err, req, icon, text }: { data: Data; set: (p: Data) => void; err: Err; req: (k: string) => boolean; icon: () => ReactNode; text: TextFn }) {
  const { data: settings } = useQuery({ queryKey: ['cms', 'settings'], queryFn: () => cmsApi.settings(), staleTime: 60_000, retry: false });
  const groups = [...(settings?.industryGroups ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const color = typeof data.color === 'string' ? data.color : '';
  const valid = /^#[0-9a-fA-F]{6}$/.test(color);
  const ratio = valid ? contrastRatioWithWhite(color) : null;
  return (
    <div className="space-y-4">
      <Grid>
        {icon()}
        <Field label="Rang" required={req('color')} error={err('color')} hint={ratio !== null ? `Safed text ke saath contrast ${ratio.toFixed(2)}:1 (kam az kam ${MIN_CONTRAST_WITH_WHITE})` : undefined}>
          <div className="flex items-center gap-2">
            <input type="color" value={valid ? color : '#047857'} onChange={(e) => set({ color: e.target.value })} className="h-9 w-12 cursor-pointer rounded-lg border border-neutral-300 bg-white p-1" />
            <input value={color} onChange={(e) => set({ color: e.target.value || undefined })} placeholder="#047857" className="h-9 w-28 rounded-lg border border-neutral-300 px-2 font-mono text-xs" />
            {valid && (
              <span className={cn('rounded-md px-2 py-1 text-xs font-semibold text-white', ratio !== null && ratio < MIN_CONTRAST_WITH_WHITE && 'ring-2 ring-rose-400')} style={{ backgroundColor: color }}>
                Aa
              </span>
            )}
          </div>
        </Field>
      </Grid>
      <Grid>
        {groups.length ? (
          <SelectField label="Group" required value={data.group as string | undefined} onChange={(v) => set({ group: v })} options={groups.map((g) => ({ value: g.key, label: g.label }))} error={err('group')} />
        ) : (
          text('group', 'Group key', { mono: true, hint: 'Settings → Industry groups ka key' })
        )}
        {text('shortName', 'Chhota naam', { max: 40, placeholder: 'Pharmacy' })}
      </Grid>
      <Grid>
        {text('shopNoun', 'Dukanon ka naam (plural)', { max: 40, placeholder: 'pharmacies' })}
        {text('romanUrduName', 'Roman Urdu naam', { max: 60, placeholder: 'Dawakhana' })}
      </Grid>
      <Grid>
        {text('appIndustryKey', 'App industry key', { mono: true })}
        {text('signupParam', 'Signup param', { mono: true })}
      </Grid>
    </div>
  );
}

interface Market { name?: string; area?: string; note?: string }
interface Area { name?: string; note?: string }

function CityData({ data, set, err, req, text }: { data: Data; set: (p: Data) => void; err: Err; req: (k: string) => boolean; text: TextFn }) {
  const geo = data.geo as { lat?: number; lng?: number } | undefined;
  const tax = data.servicesTax as { rate?: string; appliesTo?: string; source?: Partial<Source> } | undefined;
  const support = (data.support as { onsite?: boolean; note?: string } | undefined) ?? {};
  return (
    <div className="space-y-5">
      <Grid>
        {text('name', 'Shehar', { max: 60 })}
        {text('wikidataId', 'Wikidata id', { mono: true, placeholder: 'Q11739' })}
      </Grid>
      <Grid>
        <SelectField label="Province" required={req('province')} value={data.province as string | undefined} onChange={(v) => set({ province: v })} options={opts(PROVINCES)} error={err('province')} />
        <SelectField label="Tax authority" required={req('authority')} value={data.authority as string | undefined} onChange={(v) => set({ authority: v })} options={opts(CITY_AUTHORITIES)} error={err('authority')} />
      </Grid>
      <Grid>
        <NumberField label="Latitude" value={geo?.lat} step={0.0001} onChange={(lat) => set({ geo: lat === undefined && geo?.lng === undefined ? undefined : { ...geo, lat } })} error={err('geo.lat')} />
        <NumberField label="Longitude" value={geo?.lng} step={0.0001} onChange={(lng) => set({ geo: lng === undefined && geo?.lat === undefined ? undefined : { ...geo, lng } })} error={err('geo.lng')} />
      </Grid>
      <Field label="Services tax" hint="Sirf official source ke saath">
        {tax ? (
          <div className="space-y-3 rounded-xl border border-neutral-200 p-3">
            <Grid>
              <TextField label="Rate" value={tax.rate} onChange={(rate) => set({ servicesTax: { ...tax, rate } })} chars={{ max: 40 }} error={err('servicesTax.rate')} />
              <TextField label="Kis par" value={tax.appliesTo} onChange={(appliesTo) => set({ servicesTax: { ...tax, appliesTo } })} chars={{ max: 300 }} error={err('servicesTax.appliesTo')} />
            </Grid>
            <SourceFields value={tax.source ?? emptySource()} onChange={(source) => set({ servicesTax: { ...tax, source } })} errors={(p) => err(`servicesTax.source.${p}`)} />
            <button type="button" onClick={() => set({ servicesTax: undefined })} className="text-xs text-neutral-500 hover:text-rose-600">
              Hatayein
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => set({ servicesTax: { rate: '', appliesTo: '', source: emptySource() } })} className="w-full rounded-lg border border-dashed border-neutral-300 py-2 text-xs text-neutral-600 hover:border-emerald-400">
            + Services tax shamil karein
          </button>
        )}
      </Field>
      <TextArea label="Tier-1 note" value={data.tier1Note as string | undefined} onChange={(v) => set({ tier1Note: v || undefined })} chars={{ max: 600 }} rows={2} />
      <ListEditor<Market>
        label="Markets"
        items={data.markets as Market[] | undefined}
        onChange={(markets) => set({ markets })}
        max={30}
        create={() => ({ name: '', note: '' })}
        itemTitle={(m, i) => m.name || `Market ${i + 1}`}
        compact
        render={(m, update, i) => (
          <>
            <Grid>
              <TextField label="Naam" required value={m.name} onChange={(name) => update({ ...m, name })} chars={{ max: 80 }} error={err(`markets[${i}].name`)} />
              <TextField label="Area" value={m.area} onChange={(area) => update({ ...m, area: area || undefined })} chars={{ max: 80 }} />
            </Grid>
            <TextArea label="Note" value={m.note} onChange={(note) => update({ ...m, note })} chars={{ max: 600 }} rows={2} />
          </>
        )}
      />
      <ListEditor<Area>
        label="Areas (H3, URL nahi)"
        items={data.areas as Area[] | undefined}
        onChange={(areas) => set({ areas })}
        max={40}
        create={() => ({ name: '', note: '' })}
        itemTitle={(a, i) => a.name || `Area ${i + 1}`}
        compact
        render={(a, update, i) => (
          <>
            <TextField label="Naam" required value={a.name} onChange={(name) => update({ ...a, name })} chars={{ max: 80 }} error={err(`areas[${i}].name`)} />
            <TextArea label="Note" value={a.note} onChange={(note) => update({ ...a, note })} chars={{ max: 600 }} rows={2} />
          </>
        )}
      />
      <Field label="Support">
        <div className="space-y-3 rounded-xl border border-neutral-200 p-3">
          <Toggle checked={support.onsite} onChange={(onsite) => set({ support: { ...support, onsite, note: support.note ?? '' } })} label="Onsite support milta hai" />
          <TextArea value={support.note} onChange={(note) => set({ support: { onsite: support.onsite ?? false, note } })} chars={{ max: 600 }} rows={2} placeholder="Setup aur training kaise hoti hai" />
        </div>
      </Field>
      <EntryMultiPicker label="Qareebi shehar" hint="3 behtar hain" types={['CITY']} value={data.nearbyCityIds as string[] | undefined} onChange={(nearbyCityIds) => set({ nearbyCityIds })} max={8} />
      <MediaField label="Static map" kinds={['IMAGE', 'ILLUSTRATION']} value={data.staticMapMediaId as string | undefined} onChange={(v) => set({ staticMapMediaId: v })} />
    </div>
  );
}

interface BestItem { name?: string; isNafaa?: boolean; url?: string; price?: string; priceSource?: Partial<Source>; strengths?: string[]; weaknesses?: string[]; bestFor?: string }

function BestOfData({ data, set, err, text }: { data: Data; set: (p: Data) => void; err: Err; text: TextFn }) {
  return (
    <div className="space-y-5">
      {text('category', 'Category', { max: 80, placeholder: 'POS' })}
      <MarkdownEditor label="Methodology" required rows={6} value={data.methodology as string | undefined} onChange={(v) => set({ methodology: v || undefined })} error={err('methodology')} />
      <ListEditor<BestItem>
        label="Products"
        items={data.items as BestItem[] | undefined}
        onChange={(items) => set({ items })}
        min={2}
        max={20}
        create={() => ({ name: '', isNafaa: false, strengths: [], weaknesses: [], bestFor: '' })}
        itemTitle={(it, i) => `${i + 1}. ${it.name || 'Product'}${it.isNafaa ? ' (Nafaa)' : ''}`}
        error={err('items')}
        render={(it, update, i) => (
          <>
            <Grid>
              <TextField label="Naam" required value={it.name} onChange={(name) => update({ ...it, name })} chars={{ max: 80 }} error={err(`items[${i}].name`)} />
              <TextField label="URL" type="url" mono value={it.url} onChange={(url) => update({ ...it, url: url || undefined })} error={err(`items[${i}].url`)} />
            </Grid>
            <Toggle checked={it.isNafaa} onChange={(isNafaa) => update({ ...it, isNafaa })} label="Ye Nafaa hai" />
            <TextField label="Behtar kis ke liye" required value={it.bestFor} onChange={(bestFor) => update({ ...it, bestFor })} chars={{ max: 200 }} error={err(`items[${i}].bestFor`)} />
            <StringListField label="Khoobiyan" value={it.strengths} onChange={(strengths) => update({ ...it, strengths })} max={12} />
            <StringListField label="Kamzoriyan" value={it.weaknesses} onChange={(weaknesses) => update({ ...it, weaknesses })} max={12} />
            <TextField label="Price" value={it.price} onChange={(price) => update({ ...it, price: price || undefined })} chars={{ max: 120 }} hint={it.isNafaa ? 'Nafaa ki price token se: {{price:…}}' : 'Competitor price ke saath source zaroori'} />
            {!it.isNafaa && <OptionalSource label="Price ka source" value={it.priceSource} onChange={(priceSource) => update({ ...it, priceSource })} err={(p) => err(`items[${i}].priceSource.${p}`)} />}
          </>
        )}
      />
    </div>
  );
}

interface Result { label?: string; value?: string; sourceNote?: string }

function CaseStudyData({ data, set, err }: { data: Data; set: (p: Data) => void; err: Err }) {
  const { data: customers } = useQuery({ queryKey: ['cms', 'customers', 'picker'], queryFn: () => cmsApi.customers({ limit: 200 }), staleTime: 60_000 });
  const list = customers?.items ?? [];
  const picked = list.find((c) => c.id === data.customerId);
  return (
    <div className="space-y-4">
      <SelectField
        label="Customer"
        required
        value={data.customerId as string | undefined}
        onChange={(v) => set({ customerId: v })}
        emptyLabel="Chunein"
        options={list.map((c) => ({ value: c.id, label: `${c.name}${c.consentScope.includes('CASE_STUDY') ? '' : ' (CASE_STUDY consent nahi)'}` }))}
        error={err('customerId') ?? (picked && !picked.consentScope.includes('CASE_STUDY') ? 'Is customer ki case study consent nahi; publish nahi hoga' : undefined)}
      />
      <ListEditor<Result>
        label="Natije"
        hint="Har number ke saath batayein kahan se aaya"
        items={data.results as Result[] | undefined}
        onChange={(results) => set({ results })}
        max={12}
        create={() => ({ label: '', value: '', sourceNote: '' })}
        itemTitle={(r, i) => r.label || `Natija ${i + 1}`}
        compact
        render={(r, update, i) => (
          <>
            <Grid>
              <TextField label="Label" required value={r.label} onChange={(label) => update({ ...r, label })} chars={{ max: 80 }} error={err(`results[${i}].label`)} />
              <TextField label="Value" required value={r.value} onChange={(value) => update({ ...r, value })} chars={{ max: 80 }} error={err(`results[${i}].value`)} />
            </Grid>
            <TextField label="Source note" required value={r.sourceNote} onChange={(sourceNote) => update({ ...r, sourceNote })} chars={{ max: 300 }} error={err(`results[${i}].sourceNote`)} />
          </>
        )}
      />
    </div>
  );
}

function OptionalSource({ label, value, onChange, err }: { label: string; value: Partial<Source> | undefined; onChange: (v: Partial<Source> | undefined) => void; err: Err }) {
  if (!value) {
    return (
      <button type="button" onClick={() => onChange(emptySource())} className="w-full rounded-lg border border-dashed border-neutral-300 py-2 text-xs text-neutral-600 hover:border-emerald-400">
        + {label}
      </button>
    );
  }
  return (
    <Field label={label} aside={<button type="button" onClick={() => onChange(undefined)} className="text-xs text-neutral-500 hover:text-rose-600">Hatayein</button>}>
      <div className="rounded-xl border border-neutral-200 p-3">
        <SourceFields value={value} onChange={onChange} errors={err} />
      </div>
    </Field>
  );
}
