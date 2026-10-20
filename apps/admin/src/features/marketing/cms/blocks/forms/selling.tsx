/** Forms for featuresGrid, comparisonTable, pricingTable and stats. */
import { useQuery } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import { adminPlansApi } from '@/api/admin-plans.api';
import { cn } from '@/lib/cn';
import { formatPKRFull } from '@/lib/format';
import {
  BLOCK_LIMITS,
  COMPARISON_CELL_MARKS,
  FEATURE_STATUS_BADGES,
  PLAN_FEATURE_KEYS,
  PLATFORM_STAT_METRICS,
  STAT_METRICS,
  type FeatureStatus,
  type PlanFeatureKey,
  type Source,
  type StatMetric,
} from '../../contract/cms-contract';
import { IconPicker } from '../../fields/IconPicker';
import { HrefField, SourceFields, emptySource } from '../../fields/LinkFields';
import { MarkdownEditor } from '../../fields/MarkdownEditor';
import { ChipMultiSelect, Field, Grid, ListEditor, Section, SelectField, TextField, Toggle, inputClass } from '../../fields/ui';
import type { BlockFormProps } from '../types';

interface Feature { icon?: string; title?: string; body?: string; href?: string; status?: FeatureStatus }

export function FeaturesGridForm({ block, set, err }: BlockFormProps<'featuresGrid'>) {
  return (
    <div className="space-y-5">
      <TextField label="Heading" required value={block.heading} onChange={(heading) => set({ heading })} chars={{ max: 120 }} error={err('heading')} />
      <MarkdownEditor label="Intro" inline rows={2} value={block.intro} onChange={(intro) => set({ intro: intro || undefined })} />
      <Field label="Columns" error={err('columns')}>
        <div className="inline-flex gap-1 rounded-lg bg-neutral-100 p-1">
          {([2, 3, 4] as const).map((c) => (
            <button key={c} type="button" onClick={() => set({ columns: c })} className={cn('rounded-md px-3 py-1 text-xs font-medium', block.columns === c ? 'bg-white text-emerald-700 shadow-sm' : 'text-neutral-600')}>
              {c}
            </button>
          ))}
        </div>
      </Field>
      <ListEditor<Feature>
        label="Features"
        items={block.items as Feature[] | undefined}
        onChange={(items) => set({ items: items as typeof block.items })}
        min={BLOCK_LIMITS.featureItems.min}
        max={BLOCK_LIMITS.featureItems.max}
        create={() => ({ icon: 'check', title: '', body: '' })}
        itemTitle={(f, i) => f.title || `Feature ${i + 1}`}
        addLabel="Feature shamil karein"
        error={err('items')}
        render={(f, update, i) => (
          <>
            <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
              <IconPicker label="Icon" required allowClear={false} value={f.icon} onChange={(icon) => update({ ...f, icon })} error={err(`items[${i}].icon`)} />
              <TextField label="Title" required value={f.title} onChange={(title) => update({ ...f, title })} chars={{ max: 80 }} error={err(`items[${i}].title`)} />
            </div>
            <MarkdownEditor label="Text" required inline rows={2} value={f.body} onChange={(body) => update({ ...f, body })} error={err(`items[${i}].body`)} />
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
              <HrefField label="Link (optional)" keywords={false} value={f.href} onChange={(href) => update({ ...f, href })} error={err(`items[${i}].href`)} />
              <FeatureStatusField value={f.status} onChange={(status) => update({ ...f, status })} />
            </div>
          </>
        )}
      />
    </div>
  );
}

interface Column { key?: string; label?: string; highlight?: boolean }
interface Cell { value?: string; note?: string }
interface Row { label?: string; cells?: Record<string, Cell> }

const MARK_LABEL: Record<string, string> = { yes: '✓ yes', no: '✕ no', partial: '◐ partial' };

export function ComparisonTableForm({ block, set, err, entryType }: BlockFormProps<'comparisonTable'>) {
  const columns = (block.columns as Column[] | undefined) ?? [];
  const rows = (block.rows as Row[] | undefined) ?? [];
  const setRows = (next: Row[]) => set({ rows: next as typeof block.rows });
  const competitorType = entryType === 'COMPARE' || entryType === 'ALTERNATIVE' || entryType === 'BEST_OF';
  return (
    <div className="space-y-5">
      <Grid>
        <TextField label="Heading" required value={block.heading} onChange={(heading) => set({ heading })} chars={{ max: 120 }} error={err('heading')} />
        <TextField label="Caption" required value={block.caption} onChange={(caption) => set({ caption })} chars={{ max: 300 }} hint="Table ka <caption>" error={err('caption')} />
      </Grid>
      <ListEditor<Column>
        label="Columns"
        items={columns}
        onChange={(next) => set({ columns: next as typeof block.columns })}
        min={BLOCK_LIMITS.comparisonColumns.min}
        max={BLOCK_LIMITS.comparisonColumns.max}
        create={() => ({ key: `col-${columns.length + 1}`, label: '' })}
        itemTitle={(c, i) => c.label || `Column ${i + 1}`}
        addLabel="Column shamil karein"
        error={err('columns')}
        compact
        render={(c, update, i) => (
          <div className="grid items-end gap-3 sm:grid-cols-[2fr_1fr_auto]">
            <TextField label="Label" required value={c.label} onChange={(label) => update({ ...c, label })} chars={{ max: 60 }} error={err(`columns[${i}].label`)} />
            <TextField label="Key" required mono value={c.key} onChange={(key) => update({ ...c, key })} error={err(`columns[${i}].key`)} />
            <div className="pb-2">
              <Toggle checked={c.highlight} onChange={(highlight) => update({ ...c, highlight: highlight || undefined })} label="Highlight" />
            </div>
          </div>
        )}
      />

      <Field label={`Rows (${rows.length})`} error={err('rows')}>
        <div className="overflow-x-auto rounded-xl border border-neutral-200">
          <table className="min-w-full text-xs">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-2 py-2 text-left font-semibold text-neutral-600">Row</th>
                {columns.map((c) => (
                  <th key={c.key} className={cn('px-2 py-2 text-left font-semibold', c.highlight ? 'text-emerald-700' : 'text-neutral-600')}>
                    {c.label || c.key}
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((r, ri) => (
                <tr key={ri} className="align-top">
                  <td className="min-w-[160px] p-1.5">
                    <input value={r.label ?? ''} onChange={(e) => setRows(rows.map((x, j) => (j === ri ? { ...x, label: e.target.value } : x)))} placeholder="Feature" className={cn(inputClass, 'py-1.5 text-xs', err(`rows[${ri}].label`) && 'border-rose-300')} />
                  </td>
                  {columns.map((c) => {
                    const key = c.key ?? '';
                    const cell = r.cells?.[key] ?? {};
                    const setCell = (next: Cell | undefined) => {
                      const cells = { ...(r.cells ?? {}) };
                      if (next && next.value) cells[key] = next;
                      else delete cells[key];
                      setRows(rows.map((x, j) => (j === ri ? { ...x, cells } : x)));
                    };
                    const isMark = (COMPARISON_CELL_MARKS as readonly string[]).includes(cell.value ?? '');
                    return (
                      <td key={key} className="min-w-[150px] space-y-1 p-1.5">
                        <div className="flex gap-1">
                          {COMPARISON_CELL_MARKS.map((m) => (
                            <button key={m} type="button" title={MARK_LABEL[m]} onClick={() => setCell(cell.value === m ? undefined : { ...cell, value: m })} className={cn('h-6 flex-1 rounded border text-[11px]', cell.value === m ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : 'border-neutral-200 text-neutral-500 hover:border-neutral-300')}>
                              {m === 'yes' ? '✓' : m === 'no' ? '✕' : '◐'}
                            </button>
                          ))}
                        </div>
                        <input value={isMark ? '' : cell.value ?? ''} onChange={(e) => setCell({ ...cell, value: e.target.value })} placeholder={isMark ? MARK_LABEL[cell.value ?? ''] : 'ya text'} className={cn(inputClass, 'py-1 text-xs')} />
                        <input value={cell.note ?? ''} onChange={(e) => cell.value && setCell({ ...cell, note: e.target.value || undefined })} placeholder="Note" disabled={!cell.value} className={cn(inputClass, 'py-1 text-[11px]')} />
                      </td>
                    );
                  })}
                  <td className="p-1.5">
                    <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== ri))} className="text-neutral-400 hover:text-rose-600" aria-label="Row hatayein">
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length < BLOCK_LIMITS.comparisonRowsMax && (
          <button type="button" onClick={() => setRows([...rows, { label: '', cells: {} }])} className="mt-2 w-full rounded-xl border border-dashed border-neutral-300 py-2 text-xs font-medium text-neutral-600 hover:border-emerald-400 hover:text-emerald-700">
            + Row shamil karein
          </button>
        )}
      </Field>

      <Section title="Sources aur check date" description={competitorType ? 'Competitor column ho to check date aur kam az kam 1 source zaroori hai' : undefined}>
        <TextField label="Check kiya (date)" type="date" value={block.checkedAt?.slice(0, 10)} onChange={(checkedAt) => set({ checkedAt: checkedAt || undefined })} error={err('checkedAt')} />
        <ListEditor<Partial<Source>>
          items={block.sources as Partial<Source>[] | undefined}
          onChange={(sources) => set({ sources: (sources.length ? sources : undefined) as typeof block.sources })}
          max={BLOCK_LIMITS.sourcesMax}
          create={emptySource}
          itemTitle={(s, i) => s.title || `Source ${i + 1}`}
          addLabel="Source shamil karein"
          compact
          render={(s, update, i) => <SourceFields value={s} onChange={update} errors={(p) => err(`sources[${i}].${p}`)} />}
        />
      </Section>
    </div>
  );
}

/** live | beta | coming; anything not built yet must show a badge (owner rule). */
export function FeatureStatusField({ value, onChange, label = 'Status' }: { value: FeatureStatus | undefined; onChange: (s: FeatureStatus | undefined) => void; label?: string }) {
  return (
    <SelectField<FeatureStatus>
      label={label}
      value={value ?? 'live'}
      onChange={(s) => onChange(s === 'live' ? undefined : s)}
      options={[
        { value: 'live', label: 'Live' },
        { value: 'beta', label: `Beta (badge: ${FEATURE_STATUS_BADGES.beta.en})` },
        { value: 'coming', label: `Coming (badge: ${FEATURE_STATUS_BADGES.coming.en} / ${FEATURE_STATUS_BADGES.coming.ur})` },
      ]}
      hint={value && value !== 'live' ? 'Site par badge ke saath dikhega, live nahi kaha jayega' : undefined}
    />
  );
}

const featureLabel = (k: string) => k.replace(/^feature/, '').replace(/([a-z])([A-Z0-9])/g, '$1 $2');

export function PricingTableForm({ block, set, err }: BlockFormProps<'pricingTable'>) {
  const { data: plans, isError } = useQuery({ queryKey: ['admin-plans'], queryFn: adminPlansApi.list, staleTime: 60_000 });
  const publicPlans = (plans ?? []).filter((p) => p.isActive && p.isPublic).sort((a, b) => a.sortOrder - b.sortOrder);
  const picked = block.planSlugs ?? [];
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2 rounded-xl bg-emerald-50/70 p-3 text-xs text-emerald-900 ring-1 ring-emerald-200">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>Prices yahan nahi likhe jate. Site hamesha Admin → Plans se parhti hai, aur har plan me kya shamil hai woh bhi wahin se aata hai.</p>
      </div>
      <TextField label="Heading" value={block.heading} onChange={(heading) => set({ heading: heading || undefined })} chars={{ max: 120 }} />
      <Field label="Plans" hint="Kuch na chunein to sab active public plans dikhenge" error={err('planSlugs')}>
        {isError && <p className="text-xs text-rose-600">Plans load nahi huay</p>}
        <div className="space-y-1.5">
          {publicPlans.map((p) => {
            const on = picked.includes(p.slug);
            return (
              <label key={p.id} className={cn('flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition', on ? 'border-emerald-300 bg-emerald-50/60' : 'border-neutral-200 hover:border-neutral-300')}>
                <input type="checkbox" checked={on} onChange={() => set({ planSlugs: on ? picked.filter((s) => s !== p.slug) : [...picked, p.slug] })} className="accent-emerald-600" />
                <span className="flex-1 text-sm font-medium text-neutral-800">{p.name}</span>
                <span className="font-mono text-[11px] text-neutral-500">{p.slug}</span>
                <span className="text-xs tabular-nums text-neutral-600">{p.priceMonthly === 0 && p.trialDays > 0 ? `${p.trialDays} din Free Trial` : `${formatPKRFull(p.priceMonthly)}/mo`}</span>
              </label>
            );
          })}
        </div>
      </Field>
      <Grid>
        <SelectField label="Highlight plan" value={block.highlightPlan} onChange={(highlightPlan) => set({ highlightPlan })} emptyLabel="Koi nahi" options={publicPlans.map((p) => ({ value: p.slug, label: p.name }))} error={err('highlightPlan')} />
        <div className="space-y-3 pt-6">
          <Toggle checked={block.showToggle} onChange={(showToggle) => set({ showToggle })} label="Monthly / yearly toggle" />
          <Toggle checked={block.compact} onChange={(compact) => set({ compact: compact || undefined })} label="Compact" />
        </div>
      </Grid>
      <ChipMultiSelect<PlanFeatureKey>
        label="Feature rows"
        hint="Plan table ke feature flags; label Settings → Pricing se aate hain"
        value={block.featureKeys}
        onChange={(featureKeys) => set({ featureKeys: featureKeys.length ? featureKeys : undefined })}
        options={PLAN_FEATURE_KEYS.map((k) => ({ value: k, label: featureLabel(k) }))}
      />
    </div>
  );
}

interface StatItem { metric?: StatMetric; label?: string; suffix?: string }

const METRIC_LABEL: Record<StatMetric, string> = {
  'industries.count': 'Industries (published)',
  'cities.count': 'Cities (published)',
  'integrations.live.count': 'Live integrations',
  'glossary.count': 'Glossary terms',
  'posts.count': 'Blog posts',
  'plans.count': 'Public plans',
  'plans.minPaid.monthly': 'Sab se kam paid price / month',
  'platform.bills30d': 'Bills, pichle 30 din (platform)',
  'platform.activeShops30d': 'Active shops, 30 din (platform)',
};

export function StatsForm({ block, set, err }: BlockFormProps<'stats'>) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-neutral-50 p-3 text-xs text-neutral-600 ring-1 ring-neutral-200">
        Numbers API khud ginta hai. Platform metrics sirf tab dikhte hain jab Settings → Analytics me ijazat ho.
      </div>
      <TextField label="Heading" value={block.heading} onChange={(heading) => set({ heading: heading || undefined })} chars={{ max: 120 }} />
      <ListEditor<StatItem>
        label="Metrics"
        items={block.items as StatItem[] | undefined}
        onChange={(items) => set({ items: items as typeof block.items })}
        min={BLOCK_LIMITS.statsItems.min}
        max={BLOCK_LIMITS.statsItems.max}
        create={() => ({ metric: 'industries.count', label: '' })}
        itemTitle={(s, i) => s.label || (s.metric ? METRIC_LABEL[s.metric] : `Metric ${i + 1}`)}
        addLabel="Metric shamil karein"
        error={err('items')}
        compact
        render={(s, update, i) => (
          <>
            <SelectField<StatMetric>
              label="Metric"
              required
              value={s.metric}
              onChange={(metric) => update({ ...s, metric })}
              options={STAT_METRICS.map((m) => ({ value: m, label: `${METRIC_LABEL[m]}${PLATFORM_STAT_METRICS.includes(m) ? ' — ijazat chahiye' : ''}` }))}
              error={err(`items[${i}].metric`)}
            />
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
              <TextField label="Label" required value={s.label} onChange={(label) => update({ ...s, label })} chars={{ max: 60 }} error={err(`items[${i}].label`)} />
              <TextField label="Suffix" value={s.suffix} onChange={(suffix) => update({ ...s, suffix: suffix || undefined })} placeholder="+" chars={{ max: 16 }} />
            </div>
          </>
        )}
      />
    </div>
  );
}
