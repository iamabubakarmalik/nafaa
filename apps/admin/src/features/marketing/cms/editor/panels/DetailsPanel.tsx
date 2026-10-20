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
      toast.success('Fact-check ki tareekh lag gayi');
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  return (
    <div className="space-y-7">
      <Section title="Bunyadi">
        <TextField label="Title" required value={entry.title} onChange={(title) => update({ title })} chars={{ max: 200 }} error={entry.title.trim() ? undefined : 'Title zaroori hai'} />
        <TextArea
          label="Summary"
          required={money}
          value={entry.summary}
          onChange={(v) => update({ summary: v || null })}
          words={TEXT_LIMITS.summaryWords}
          rows={3}
          hint="Short answer aur meta description ki bunyad: seedha jawab, 40-60 alfaaz"
        />
        <TextField
          label="Slug"
          mono
          value={entry.slug}
          disabled={isHome}
          onChange={(v) => update({ slug: v.toLowerCase() })}
          error={slugInvalid ? 'Sirf a-z, 0-9 aur beech me hyphen' : undefined}
          hint={isHome ? 'Home page ka slug khali rehta hai' : undefined}
          aside={
            !isHome && (
              <button type="button" onClick={() => update({ slug: slugify(entry.title) })} className="text-[11px] font-medium text-emerald-700 hover:underline">
                Title se banayein
              </button>
            )
          }
        />
        <div className="rounded-lg bg-neutral-50 px-3 py-2 ring-1 ring-neutral-200">
          <p className="text-[11px] text-neutral-500">Path ({meta.pathPattern})</p>
          <p className="font-mono text-sm text-neutral-900">{entry.path}</p>
          {pathChanged && <p className="mt-1 text-[11px] text-amber-700">Live path {entry.publishedPath} hai. Publish par purane path se 301 redirect khud ban jayega.</p>}
        </div>
        {parentTypes && (
          <EntryPicker label={entry.type === 'CITY_INDUSTRY' ? 'Shehar (parent)' : 'Parent'} required={entry.type === 'CITY_INDUSTRY'} types={parentTypes} value={entry.parentId} onChange={(parentId) => update({ parentId })} />
        )}
      </Section>

      <Section title={`${meta.label} data`} description={required.length ? `Publish ke liye zaroori: ${required.join(', ')}` : undefined}>
        <DataForm type={entry.type} data={data} required={required} onChange={(next) => update({ data: next as AdminEntry['data'] })} />
      </Section>

      <Section title="Log">
        <Grid>
          <EntryPicker label="Author" types={['PERSON']} value={entry.authorId} onChange={(authorId) => update({ authorId })} />
          <EntryPicker label="Reviewer" types={['PERSON']} value={entry.reviewerId} onChange={(reviewerId) => update({ reviewerId })} />
        </Grid>
        <div className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3">
          <BadgeCheck className={entry.factCheckedAt ? 'h-5 w-5 text-emerald-600' : 'h-5 w-5 text-neutral-300'} />
          <div className="flex-1 text-sm">
            <p className="font-medium text-neutral-800">{entry.factCheckedAt ? `Fact-check: ${formatPkt(entry.factCheckedAt, false)}` : 'Fact-check nahi hua'}</p>
            <p className="text-xs text-neutral-500">{needsFactCheck ? 'Is type ko publish se pehle zaroori hai' : 'Har dawa source se mila kar'}</p>
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
            <Toggle checked={entry.featured} onChange={(featured) => update({ featured })} label="Featured" hint="Hubs aur menus me upar" />
          </div>
        </Grid>
      </Section>

      <Section title="Zaban">
        <div className="flex items-center gap-2 text-sm text-neutral-700">
          <Globe className="h-4 w-4 text-neutral-400" /> Locale: <b className="uppercase">{entry.locale}</b>
          {entry.translationKey && <span className="font-mono text-xs text-neutral-500">· {entry.translationKey}</span>}
        </div>
        {entry.status === 'PUBLISHED' && (
          <p className="flex items-center gap-1.5 text-xs text-neutral-500">
            <Lock className="h-3 w-3" /> Live entry: tabdeeliyan draft me hain jab tak Publish na karein
          </p>
        )}
      </Section>
    </div>
  );
}
