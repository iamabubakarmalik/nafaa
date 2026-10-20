/**
 * The selected block's typed form plus the settings every block shares
 * (anchor, theme, hidden). Errors come from the contract's block schema and
 * from the API's publish issues for this block.
 */
import { useMemo, type ComponentType } from 'react';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ANCHOR_PATTERN, type BlockType, type CmsEntryType, type DraftBlock, type Issue } from '../contract/cms-contract';
import { blockErrors } from '../editor/lib';
import { Grid, Section, Segmented, TextField, Toggle } from '../fields/ui';
import { BLOCK_META, type DraftOf } from './registry';
import type { BlockFormProps } from './types';
import { AnswerBoxForm, HeroForm } from './forms/opening';
import { CalloutForm, CodeSampleForm, DiagramForm, RichTextForm, ScreenshotForm, StepsForm } from './forms/content';
import { ComparisonTableForm, FeaturesGridForm, PricingTableForm, StatsForm } from './forms/selling';
import { FaqForm, LogoCloudForm, SourcesForm, TestimonialForm } from './forms/proof';
import { CityFactsForm, CtaBandForm, EntryGridForm, LeadFormForm, RelatedLinksForm, ToolForm } from './forms/lists-action';

// One form component per block type (ARCH 13).
const FORMS: { [T in BlockType]: ComponentType<BlockFormProps<T>> } = {
  hero: HeroForm,
  answerBox: AnswerBoxForm,
  featuresGrid: FeaturesGridForm,
  diagram: DiagramForm,
  screenshot: ScreenshotForm,
  faq: FaqForm,
  comparisonTable: ComparisonTableForm,
  cta: CtaBandForm,
  richText: RichTextForm,
  steps: StepsForm,
  stats: StatsForm,
  testimonial: TestimonialForm,
  logoCloud: LogoCloudForm,
  pricingTable: PricingTableForm,
  codeSample: CodeSampleForm,
  cityFacts: CityFactsForm,
  entryGrid: EntryGridForm,
  relatedLinks: RelatedLinksForm,
  sources: SourcesForm,
  callout: CalloutForm,
  leadForm: LeadFormForm,
  tool: ToolForm,
};

export function BlockForm({
  block,
  onChange,
  entryType,
  title,
  summary,
  issues,
  allowed,
}: {
  block: DraftBlock;
  onChange: (next: DraftBlock) => void;
  entryType: CmsEntryType;
  title: string;
  summary: string | null;
  /** API issues whose blockId is this block. */
  issues: Issue[];
  allowed: boolean;
}) {
  const meta = BLOCK_META[block.type as BlockType];
  const errors = useMemo(() => blockErrors(block), [block]);
  const errorCount = Object.keys(errors).length;
  const Form = FORMS[block.type as BlockType] as ComponentType<BlockFormProps<BlockType>> | undefined;
  const set = (patch: Record<string, unknown>) => onChange({ ...block, ...patch } as DraftBlock);
  const err = (path: string) => errors[path];
  const anchorInvalid = !!block.anchor && !ANCHOR_PATTERN.test(block.anchor);
  const theme = (block as { theme?: 'default' | 'muted' | 'ink' }).theme;

  if (!meta || !Form) {
    return <p className="text-sm text-rose-600">Unknown block type "{block.type}"</p>;
  }
  const Icon = meta.icon;
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-neutral-900">{meta.label}</h2>
          <p className="text-xs text-neutral-500">{meta.help}</p>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
            errorCount ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200',
          )}
          title="Contract ke hisaab se check"
        >
          {errorCount ? <CircleAlert className="h-3 w-3" /> : <CircleCheck className="h-3 w-3" />}
          {errorCount ? `${errorCount} cheezein baqi` : 'Mukammal'}
        </span>
      </div>

      {!allowed && (
        <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700 ring-1 ring-rose-200">
          Ye block is entry type par allowed nahi. Publish se pehle hatayein ya chhupa dein.
        </div>
      )}
      {issues.length > 0 && (
        <div className="space-y-1 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
          {issues.map((i, n) => (
            <p key={n} className={cn('text-xs', i.severity === 'error' ? 'text-rose-700' : 'text-amber-800')}>
              • {i.message}
            </p>
          ))}
        </div>
      )}

      <Form block={block as DraftOf<BlockType>} set={set} err={err} entryType={entryType} title={title} summary={summary} />

      <Section title="Block settings" className="border-t border-neutral-100 pt-5">
        <Grid>
          <TextField
            label="Anchor"
            mono
            prefix="#"
            value={block.anchor}
            onChange={(anchor) => set({ anchor: anchor || undefined })}
            placeholder="pricing"
            error={anchorInvalid ? 'a-z, 0-9 aur hyphen' : err('anchor')}
            hint="Is hisse ka link: /page#anchor"
          />
          <Segmented
            label="Background"
            value={theme ?? 'default'}
            onChange={(t) => set({ theme: t === 'default' ? undefined : t })}
            options={[
              { value: 'default', label: 'Default' },
              { value: 'muted', label: 'Muted' },
              { value: 'ink', label: 'Ink (dark)' },
            ]}
          />
        </Grid>
        <Toggle checked={block.hidden} onChange={(hidden) => set({ hidden: hidden || undefined })} label="Chhupa hua" hint="Draft me rehta hai, site par nahi dikhta" />
      </Section>
    </div>
  );
}
