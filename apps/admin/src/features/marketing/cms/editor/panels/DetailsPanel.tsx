/**
 * Details tab: title, summary, slug and path, parent, the type's `data`
 * form, people, fact-check stamp, card image and listing order.
 */
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BadgeCheck, Globe, Lock } from 'lucide-react';
import { apiErrorMessage, cmsApi } from '@/api/marketing/marketing-cms.api';
import {
  ENTRY_TYPE_META,
  FACT_CHECK_TYPES,
  SLUG_PATTERN,
  TEXT_LIMITS,
  isMoneyType,
  type AdminEntry,
  type PageTemplate,
} from '../../contract/cms-contract';
import { EntryPicker } from '../../fields/EntryPicker';
import { MediaField } from '../../fields/MediaField';
import { Btn, Grid, NumberField, Section, TextArea, TextField, Toggle } from '../../fields/ui';
import { formatPkt, slugify } from '../lib';
import { useEditor } from '../EditorContext';
import type { DraftPatch } from '../useEntryDraft';
import { DataForm } from './DataForm';

export function DetailsPanel({ entry, update, onReplace }: { entry: AdminEntry; update: (p: DraftPatch) => void; onReplace: (e: AdminEntry) => void }) {
  const { config } = useEditor();
  const meta = ENTRY_TYPE_META[entry.type];
  const data = (entry.data ?? {}) as Record<string, unknown>;
  const pageTemplate = entry.type === 'PAGE' ? ((data.template as PageTemplate | undefined) ?? 'default') : undefined;
  const money = isMoneyType(entry.type, pageTemplate);
  const required = config?.types.find((t) => t.type === entry.type)?.requiredData ?? [];
  const isHome = entry.type === 'PAGE' && entry.slug === '';
  const slugInvalid = !isHome && entry.slug !== '' && !SLUG_PATTERN.test(entry.slug);
  const pathChanged = entry.publishedPath && entry.publishedPath !== entry.path;
  const parentTypes = entry.type === 'PAGE' ? (['PAGE'] as const) : meta.parentType ? [meta.parentType] : null;
  const needsFactCheck = (FACT_CHECK_TYPES as readonly string[]).includes(entry.type);

  const factCheck = useMutation({
    mutationFn: () => cmsApi.factCheck(entry.id),
    onSuccess: (r) => {
      onReplace(r.entry);
      toast.success('Fact-check date saved');
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <div className="space-y-7">
      <Section title="Bunyadi">
        <TextField label="Title" required value={entry.title} onChange={(title) => update({ title })} chars={{ max: 200 }} error={entry.title.trim() ? undefined : 'Title is required'} />
        <TextArea
          label="Summary"
          required={money}
          value={entry.summary}
          onChange={(v) => update({ summary: v || null })}
          words={TEXT_LIMITS.summaryWords}
          rows={3}
          hint="The base of the short answer and meta description: a direct answer, 40-60 words"
        />
        <TextField
          label="Slug"
          mono
          value={entry.slug}
          disabled={isHome}
          onChange={(v) => update({ slug: v.toLowerCase() })}
          error={slugInvalid ? 'Only a-z, 0-9 and hyphens inside' : undefined}
          hint={isHome ? 'The home page slug stays empty' : undefined}
          aside={
            !isHome && (
              <button type="button" onClick={() => update({ slug: slugify(entry.title) })} className="text-[11px] font-medium text-brand-700 hover:underline">
                Title se banayein
              </button>
            )
          }
        />
        <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
          <p className="text-[11px] text-slate-500">Path ({meta.pathPattern})</p>
          <p className="font-mono text-sm text-slate-900">{entry.path}</p>
          {pathChanged && <p className="mt-1 text-[11px] text-amber-700">The live path is {entry.publishedPath}. When you publish, a 301 redirect from the old path is created automatically.</p>}
        </div>
        {parentTypes && (
          <EntryPicker label={entry.type === 'CITY_INDUSTRY' ? 'City (parent)' : 'Parent'} required={entry.type === 'CITY_INDUSTRY'} types={parentTypes} value={entry.parentId} onChange={(parentId) => update({ parentId })} />
        )}
      </Section>

      <Section title={`${meta.label} data`} description={required.length ? `Required to publish: ${required.join(', ')}` : undefined}>
        <DataForm type={entry.type} data={data} required={required} onChange={(next) => update({ data: next as AdminEntry['data'] })} />
      </Section>

      <Section title="Log">
        <Grid>
          <EntryPicker label="Author" types={['PERSON']} value={entry.authorId} onChange={(authorId) => update({ authorId })} />
          <EntryPicker label="Reviewer" types={['PERSON']} value={entry.reviewerId} onChange={(reviewerId) => update({ reviewerId })} />
        </Grid>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
          <BadgeCheck className={entry.factCheckedAt ? 'h-5 w-5 text-brand-600' : 'h-5 w-5 text-slate-300'} />
          <div className="flex-1 text-sm">
            <p className="font-medium text-slate-800">{entry.factCheckedAt ? `Fact-check: ${formatPkt(entry.factCheckedAt, false)}` : 'Not fact-checked'}</p>
            <p className="text-xs text-slate-500">{needsFactCheck ? 'Required before publishing this type' : 'Check every claim against its source'}</p>
          </div>
          <Btn size="sm" onClick={() => factCheck.mutate()} loading={factCheck.isPending}>
            Maine aaj check kiya
          </Btn>
        </div>
      </Section>

      <Section title="Listing">
        <MediaField label="Card image" value={entry.imageId} onChange={(id) => update({ imageId: id ?? null })} kinds={['IMAGE', 'SCREENSHOT', 'ILLUSTRATION']} />
        <Grid>
          <NumberField label="Sort order" value={entry.sortOrder} onChange={(v) => update({ sortOrder: v ?? 0 })} />
          <div className="pt-6">
            <Toggle checked={entry.featured} onChange={(featured) => update({ featured })} label="Featured" hint="Shown first in hubs and menus" />
          </div>
        </Grid>
      </Section>

      <Section title="Zaban">
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <Globe className="h-4 w-4 text-slate-400" /> Locale: <b className="uppercase">{entry.locale}</b>
          {entry.translationKey && <span className="font-mono text-xs text-slate-500">· {entry.translationKey}</span>}
        </div>
        {entry.status === 'PUBLISHED' && (
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <Lock className="h-3 w-3" /> Live entry: changes stay in the draft until you publish
          </p>
        )}
      </Section>
    </div>
  );
}
