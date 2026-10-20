/**
 * Links tab: tags and hand-picked related cards (draft relations), the PLAN
 * section 4 required-links checklist for the type, inbound links from the
 * published index and the API's link suggestions.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, CircleCheck, CircleDashed, Lightbulb, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { cmsApi, cmsKeys } from '@/api/marketing/marketing-cms.api';
import { TEXT_LIMITS, type AdminEntry, type CmsEntryType, type DraftRelation } from '../../contract/cms-contract';
import { EntryMultiPicker, TypeTag } from '../../fields/EntryPicker';
import { Section } from '../../fields/ui';
import { useEditor } from '../EditorContext';
import { entryLinkIds } from '../lib';
import type { DraftPatch } from '../useEntryDraft';

interface Rule { label: string; types: CmsEntryType[]; min: number }

const MONEY: CmsEntryType[] = ['PRODUCT', 'INDUSTRY', 'SOLUTION', 'SERVICE', 'PAGE'];

/** PLAN.md section 4 "Required internal links", as countable rules. */
const REQUIRED_LINKS: Partial<Record<CmsEntryType, Rule[]>> = {
  PRODUCT: [
    { label: '6 industries', types: ['INDUSTRY'], min: 6 },
    { label: '2-3 related products', types: ['PRODUCT'], min: 2 },
    { label: '1 glossary term', types: ['GLOSSARY_TERM'], min: 1 },
    { label: '1 guide', types: ['GUIDE'], min: 1 },
    { label: '1 compare page', types: ['COMPARE', 'ALTERNATIVE', 'BEST_OF'], min: 1 },
  ],
  INDUSTRY: [
    { label: '4-6 products', types: ['PRODUCT'], min: 4 },
    { label: '2 related industries', types: ['INDUSTRY'], min: 2 },
    { label: '1 solution', types: ['SOLUTION'], min: 1 },
    { label: '2-3 posts ya guides', types: ['BLOG_POST', 'GUIDE'], min: 2 },
    { label: '1 best-of ya compare page', types: ['BEST_OF', 'COMPARE', 'ALTERNATIVE'], min: 1 },
    { label: 'Mutalliqa compliance page', types: ['COMPLIANCE'], min: 1 },
  ],
  SOLUTION: [
    { label: 'Products', types: ['PRODUCT'], min: 1 },
    { label: 'Mutalliqa industries', types: ['INDUSTRY'], min: 1 },
    { label: 'Services', types: ['SERVICE'], min: 1 },
  ],
  SERVICE: [
    { label: 'Solutions', types: ['SOLUTION'], min: 1 },
    { label: 'API ya integrations', types: ['INTEGRATION', 'DOC'], min: 1 },
  ],
  CITY: [
    { label: 'Province ka compliance page', types: ['COMPLIANCE'], min: 1 },
    { label: '4-6 national industry pages', types: ['INDUSTRY'], min: 4 },
    { label: '3 qareebi shehar', types: ['CITY'], min: 3 },
  ],
  COMPLIANCE: [
    { label: '/product/fbr', types: ['PRODUCT'], min: 1 },
    { label: 'Us province ke shehar', types: ['CITY'], min: 1 },
    { label: 'Mutalliqa industries', types: ['INDUSTRY'], min: 1 },
    { label: 'Tools (Tier-1 checker, GST calculator)', types: ['TOOL'], min: 1 },
  ],
  BEST_OF: [
    { label: 'Compare pages', types: ['COMPARE', 'ALTERNATIVE'], min: 1 },
    { label: 'Industry pages', types: ['INDUSTRY'], min: 1 },
  ],
  COMPARE: [
    { label: 'Best-of page', types: ['BEST_OF'], min: 1 },
    { label: 'Products', types: ['PRODUCT'], min: 1 },
    { label: 'Data-migration service', types: ['SERVICE'], min: 1 },
  ],
  ALTERNATIVE: [
    { label: 'Best-of page', types: ['BEST_OF'], min: 1 },
    { label: 'Products', types: ['PRODUCT'], min: 1 },
    { label: 'Data-migration service', types: ['SERVICE'], min: 1 },
  ],
  BLOG_POST: [
    { label: `1 money page (pehle ${TEXT_LIMITS.articleMoneyLinkWithinWords} alfaaz me)`, types: MONEY, min: 1 },
    { label: '2-3 glossary terms', types: ['GLOSSARY_TERM'], min: 2 },
    { label: '2 related posts', types: ['BLOG_POST', 'GUIDE'], min: 2 },
    { label: 'Category', types: ['BLOG_CATEGORY'], min: 1 },
  ],
  GUIDE: [
    { label: `1 money page (pehle ${TEXT_LIMITS.articleMoneyLinkWithinWords} alfaaz me)`, types: MONEY, min: 1 },
    { label: '2-3 glossary terms', types: ['GLOSSARY_TERM'], min: 2 },
    { label: '2 related posts', types: ['BLOG_POST', 'GUIDE'], min: 2 },
  ],
  GLOSSARY_TERM: [
    { label: '1 product', types: ['PRODUCT'], min: 1 },
    { label: '1 guide', types: ['GUIDE'], min: 1 },
    { label: '2 related terms', types: ['GLOSSARY_TERM'], min: 2 },
  ],
  TOOL: [{ label: 'Mutalliqa compliance ya product page', types: ['COMPLIANCE', 'PRODUCT'], min: 1 }],
};

export function LinksPanel({ entry, update }: { entry: AdminEntry; update: (p: DraftPatch) => void }) {
  const { refs, addRefs } = useEditor();
  const relations = entry.relations ?? [];
  const ids = (kind: DraftRelation['kind']) => relations.filter((r) => r.kind === kind).sort((a, b) => a.sortOrder - b.sortOrder).map((r) => r.entryId);
  const setKind = (kind: DraftRelation['kind'], list: string[]) => {
    const other = relations.filter((r) => r.kind !== kind);
    update({ relations: [...other, ...list.map((entryId, sortOrder) => ({ entryId, kind, sortOrder }))] });
  };

  const inbound = useQuery({ queryKey: cmsKeys.inbound(entry.id), queryFn: () => cmsApi.inbound(entry.id), retry: false });
  const suggestions = useQuery({ queryKey: cmsKeys.suggestions(entry.id), queryFn: () => cmsApi.suggestions(entry.id), retry: false });

  // Every entry this draft points at: relations, entry: links and data ids.
  const linkedTypes = useMemo(() => {
    const all = new Set<string>([...relations.map((r) => r.entryId), ...entryLinkIds(entry.blocks), ...entryLinkIds(entry.data)]);
    const data = (entry.data ?? {}) as Record<string, unknown>;
    for (const v of Object.values(data)) {
      if (Array.isArray(v)) v.forEach((x) => typeof x === 'string' && refs[x] && all.add(x));
      else if (typeof v === 'string' && refs[v]) all.add(v);
    }
    return [...all].map((id) => refs[id]?.type).filter((t): t is CmsEntryType => !!t);
  }, [relations, entry.blocks, entry.data, refs]);

  const rules = REQUIRED_LINKS[entry.type] ?? [];
  const tagIds = ids('TAG');
  const relatedIds = ids('RELATED');
  const inboundList = inbound.data?.from ?? [];

  return (
    <div className="space-y-7">
      <Section title="Tags" description="Ye page kis cheez ke baare me hai (industry, city, product, category). Hubs aur 'posts about X' lists inhi se banti hain.">
        <EntryMultiPicker types={['INDUSTRY', 'CITY', 'PRODUCT', 'SOLUTION', 'SERVICE', 'BLOG_CATEGORY', 'COMPLIANCE', 'INTEGRATION']} value={tagIds} onChange={(l) => setKind('TAG', l)} />
      </Section>

      <Section title="Related cards" description="Hath se chune hue cards, isi tarteeb me (relatedLinks block)">
        <EntryMultiPicker value={relatedIds} onChange={(l) => setKind('RELATED', l)} max={24} />
      </Section>

      {rules.length > 0 && (
        <Section title="Required links" description="PLAN ki checklist: relations, text ke links aur data sab ginte hain">
          <ul className="space-y-1.5">
            {rules.map((r) => {
              const n = linkedTypes.filter((t) => r.types.includes(t)).length;
              const ok = n >= r.min;
              return (
                <li key={r.label} className={cn('flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs', ok ? 'bg-emerald-50 text-emerald-800' : 'bg-neutral-50 text-neutral-600 ring-1 ring-neutral-200')}>
                  {ok ? <CircleCheck className="h-3.5 w-3.5 shrink-0" /> : <CircleDashed className="h-3.5 w-3.5 shrink-0" />}
                  <span className="flex-1">{r.label}</span>
                  <span className="tabular-nums">
                    {n}/{r.min}
                  </span>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      <Section title={`Is page par aane wale links (${inboundList.length})`} description={`Published pages se. ${TEXT_LIMITS.minInboundLinks} se kam ho to page "orphan" hai.`}>
        {inbound.isError ? (
          <p className="text-xs text-neutral-500">Inbound links load nahi huay</p>
        ) : inboundList.length === 0 ? (
          <p className={cn('rounded-lg px-3 py-2 text-xs', entry.status === 'PUBLISHED' ? 'bg-amber-50 text-amber-800' : 'bg-neutral-50 text-neutral-500')}>Abhi kisi live page se link nahi</p>
        ) : (
          <ul className="space-y-1">
            {inboundList.map((l) => (
              <li key={`${l.id}-${l.kind}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-neutral-50">
                <ArrowDownLeft className="h-3.5 w-3.5 text-neutral-400" />
                <span className="min-w-0 flex-1 truncate">
                  <span className="text-neutral-800">{l.title}</span> <span className="font-mono text-neutral-400">{l.path}</span>
                </span>
                <span className="text-[10px] uppercase text-neutral-400">{l.kind}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Suggested links" description="Jo pages same tags share karte hain magar abhi linked nahi">
        {(suggestions.data ?? []).length === 0 ? (
          <p className="text-xs text-neutral-500">{suggestions.isLoading ? 'Load ho raha hai…' : 'Abhi koi suggestion nahi'}</p>
        ) : (
          <ul className="space-y-1.5">
            {(suggestions.data ?? []).map((s) => (
              <li key={s.id} className="flex items-center gap-2 rounded-lg border border-neutral-200 px-2.5 py-2">
                <Lightbulb className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-neutral-800">{s.title}</span>
                  <span className="block truncate text-[11px] text-neutral-500">{s.reason}</span>
                </span>
                <TypeTag type={s.type} />
                <button
                  type="button"
                  disabled={relatedIds.includes(s.id)}
                  onClick={() => {
                    addRefs([{ id: s.id, type: s.type, title: s.title, path: s.path, status: 'PUBLISHED' }]);
                    setKind('RELATED', [...relatedIds, s.id]);
                  }}
                  className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
                  title="Related me daalein"
                >
                  <Plus className="h-3 w-3" /> Related
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <p className="text-[11px] text-neutral-400">Text ke andar link: Markdown toolbar ka link button page chun kar `entry:` link lagata hai, jo slug badalne par bhi nahi toot-ta.</p>
    </div>
  );
}
