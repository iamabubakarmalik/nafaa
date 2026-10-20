/**
 * Publish checks and the SEO report (ARCH 5.3-5.6, 8; API-CONTRACT 8).
 *
 * One pass produces every issue for an entry draft: hard errors (block
 * publish), warnings (lower the score; the gate and similarity force
 * noindex) and a few passes. Save, Validate, Publish, Schedule and preview
 * all call `run`; Publish refuses when any error is present.
 *
 * It also returns `prepared`: the parsed blocks and data, the final title and
 * description (still holding tokens), robots, quality and the ids the
 * snapshot needs, so publishing never re-derives them.
 */
import { Injectable } from '@nestjs/common';
import { Prisma, type CmsEntry } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  BLOCK_SCHEMAS,
  COMPETITOR_TYPES,
  DEFAULT_OFFICIAL_DOMAINS,
  DEFAULT_QUALITY_GATES,
  ENTRY_TYPE_META,
  FACT_CHECK_TYPES,
  MONEY_TYPES,
  PLATFORM_STAT_METRICS,
  TEXT_LIMITS,
  blockStructureIssues,
  countWords,
  featureStatusOf,
  isMoneyType,
  parseEntryData,
  seoSettingsSchema,
  templateFor,
  titlePatternFor,
  titlePatternVariant,
  visibleBlocks,
  zodErrorToIssues,
  type Block,
  type BlockType,
  type CmsEntryType,
  type DraftBlock,
  type DraftSnapshot,
  type FeatureStatus,
  type Issue,
  type PageTemplate,
  type PublicRobots,
  type QualityGate,
  type SeoReport,
  type SiteTemplate,
  type StatMetric,
} from '../contract/cms-contract';
import { CmsContentService } from '../content/cms-content.service';
import { CmsTokenService } from '../content/cms-token.service';
import { collectReferencedEntryIds } from '../content/entry-links';
import { markdownToPlainText } from '../content/markdown';
import { resolveTokensInText, type TokenContext } from '../content/tokens';
import { extractMainText } from '../content/word-count';
import type { PathProblem } from '../paths/cms-paths';
import { readPublished } from '../publishing/snapshot';
import {
  REQUIRED_LINKS,
  TYPED_PRICE_REGEX,
  brandCount,
  collectMediaRefs,
  fillTitlePattern,
  hostMatches,
  maxSimilarity,
  scoreFromIssues,
  truncateDescription,
} from './seo-rules';

type Db = PrismaService | Prisma.TransactionClient;
type Rec = Record<string, unknown>;

export type CheckMode = 'save' | 'publish' | 'preview';

export interface CheckInput {
  entry: Pick<CmsEntry, 'id' | 'type' | 'locale' | 'publishedPath' | 'factCheckedAt' | 'contentUpdatedAt'>;
  draft: DraftSnapshot;
  /** Path the entry gets when published. */
  path: string;
  /** Problems found while computing `path` (they become DUPLICATE_PATH / INVALID_DATA). */
  pathProblems?: readonly PathProblem[];
  /** Attached draft FAQs will be published with the page. */
  publishFaqs?: boolean;
  /** `preview` skips the cross-entry checks (duplicate titles, similarity, orphans). */
  mode: CheckMode;
}

export interface PreparedEntry {
  template: SiteTemplate;
  /** Visible blocks that pass their schema. */
  blocks: Block[];
  /** Publish-shape data when valid, else the draft data. */
  data: Rec;
  dataValid: boolean;
  /** Final title, may hold tokens. */
  seoTitle: string;
  titleIncludesBrand: boolean;
  /** Final description, may hold tokens. */
  description: string;
  robots: PublicRobots;
  quality: { wordCount: number; gate: number | null; passed: boolean; similarity?: number };
  mediaIds: string[];
  referencedIds: string[];
  featureStatus: FeatureStatus | null;
}

export interface CheckResult {
  issues: Issue[];
  report: SeoReport;
  canPublish: boolean;
  prepared: PreparedEntry;
}

interface CheckSettings {
  titlePatterns: Record<string, string>;
  qualityGates: Partial<Record<CmsEntryType, QualityGate>>;
  officialDomains: string[];
  brand: string;
  allowPlatformStats: boolean;
}

const LIVE_REQUIRED_REF = 'abhi live nahi';

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}
function issue(code: Issue['code'], severity: Issue['severity'], message: string, field?: string, blockId?: string): Issue {
  return { code, severity, message, ...(field ? { field } : {}), ...(blockId ? { blockId } : {}) };
}

@Injectable()
export class CmsChecksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly content: CmsContentService,
    private readonly tokens: CmsTokenService,
  ) {}

  async settings(locale: string, ctx: TokenContext, db: Db = this.prisma): Promise<CheckSettings> {
    const [seoRaw, analyticsRaw] = await Promise.all([
      this.tokens.settingValue('seo', locale, db),
      this.tokens.settingValue('analytics', locale, db),
    ]);
    const seo = seoSettingsSchema.safeParse(seoRaw ?? {});
    const entity = (ctx.entity ?? {}) as Rec;
    return {
      titlePatterns: seo.success ? (seo.data.titlePatterns as Record<string, string>) : {},
      qualityGates: seo.success ? seo.data.qualityGates : {},
      officialDomains: seo.success && seo.data.officialDomains.length > 0 ? seo.data.officialDomains : [...DEFAULT_OFFICIAL_DOMAINS],
      brand: str(entity.brandName) || 'Nafaa',
      allowPlatformStats: (analyticsRaw as { allowPlatformStats?: unknown } | null)?.allowPlatformStats === true,
    };
  }

  async run(input: CheckInput, db: Db = this.prisma): Promise<CheckResult> {
    const { entry, draft } = input;
    const type = entry.type as CmsEntryType;
    const locale = entry.locale;
    const issues: Issue[] = [];
    const ctx = await this.tokens.loadContext(locale, db);
    const settings = await this.settings(locale, ctx, db);
    const data = { ...(draft.data ?? {}), type } as Rec;
    const pageTemplate = type === 'PAGE' ? ((str(data.template) || 'default') as PageTemplate) : undefined;
    const template = templateFor(type, pageTemplate);
    const money = isMoneyType(type, pageTemplate);
    const featureStatus = featureStatusOf(type, data);

    // ─── Path ───
    for (const p of input.pathProblems ?? []) {
      issues.push(issue(p.code === 'PATH_TAKEN' ? 'DUPLICATE_PATH' : 'INVALID_DATA', 'error', p.message, p.field));
    }

    // ─── Title and summary ───
    if (!draft.title.trim()) issues.push(issue('MISSING_TITLE', 'error', 'Title zaroori hai', 'title'));
    const summary = (draft.summary ?? '').trim();
    if (money && !summary) issues.push(issue('MISSING_SUMMARY', 'error', 'Is page ke liye summary (seedha jawab, 40-60 words) zaroori hai', 'summary'));
    if (summary && money) {
      const words = countWords(markdownToPlainText(summary));
      if (words < TEXT_LIMITS.summaryWords.min || words > TEXT_LIMITS.summaryWords.max) {
        issues.push(issue('SUMMARY_LENGTH', 'warning', `Summary ${words} words hai; ${TEXT_LIMITS.summaryWords.min}-${TEXT_LIMITS.summaryWords.max} behtar hai`, 'summary'));
      }
    }

    // ─── Blocks: structure and shapes ───
    const blocks = draft.blocks as DraftBlock[];
    issues.push(...blockStructureIssues(type, blocks));
    const parsedBlocks: Block[] = [];
    blocks.forEach((block, i) => {
      if (block.hidden) return;
      const schema = (BLOCK_SCHEMAS as Record<string, (typeof BLOCK_SCHEMAS)[BlockType]>)[block.type];
      if (!schema) {
        issues.push(issue('INVALID_BLOCK', 'error', `Block type "${block.type}" maloom nahi`, `blocks[${i}]`, block.id));
        return;
      }
      const result = schema.safeParse(block);
      if (result.success) {
        parsedBlocks.push(result.data as Block);
        return;
      }
      for (const zi of zodErrorToIssues(result.error, 'blocks')) {
        issues.push({ ...zi, field: (zi.field ?? 'blocks').replace(/^blocks/, `blocks[${i}]`), blockId: block.id, message: zi.message.replace(/\(blocks/, `(blocks[${i}]`) });
      }
    });
    const visible = visibleBlocks(blocks);

    // ─── Data ───
    const dataResult = parseEntryData(type, data, 'publish');
    if (!dataResult.success) issues.push(...zodErrorToIssues(dataResult.error, 'data', undefined, data));
    const publishData: Rec = dataResult.success ? (dataResult.data as Rec) : data;

    // ─── Tokens, entry links, headings (A0 content service) ───
    const blocksForContent = blocks.map((b) => (b.hidden ? { id: b.id, type: b.type } : b));
    issues.push(
      ...(await this.content.check(
        { fields: { summary: draft.summary ?? '', blocks: blocksForContent, data, seoTitle: draft.seoTitle ?? '', seoDescription: draft.seoDescription ?? '' }, locale, blocks: blocksForContent, tokens: ctx },
        db,
      )),
    );

    // ─── Media ───
    const mediaRefs = [
      ...collectMediaRefs(blocksForContent, 'blocks'),
      ...collectMediaRefs(data, 'data'),
      ...(draft.imageId ? [{ id: draft.imageId, field: 'imageId', key: 'imageId' }] : []),
      ...(draft.ogImageId ? [{ id: draft.ogImageId, field: 'ogImageId', key: 'ogImageId' }] : []),
    ];
    const mediaIds = [...new Set(mediaRefs.map((m) => m.id))];
    const mediaRows = mediaIds.length
      ? await db.cmsMedia.findMany({ where: { id: { in: mediaIds }, deletedAt: null }, select: { id: true, kind: true, altTranslations: true } })
      : [];
    const mediaById = new Map(mediaRows.map((m) => [m.id, m]));
    for (const ref of mediaRefs) {
      const media = mediaById.get(ref.id);
      const blockId = this.blockIdOf(ref.field, blocks);
      if (!media) {
        issues.push(issue('MEDIA_MISSING', 'error', `Media file mojood nahi (${ref.id})`, ref.field, blockId));
        continue;
      }
      if ((ref.key === 'mediaId' || ref.key === 'darkMediaId') && /^blocks\[\d+\]$/.test(ref.field.replace(/\.(dark)?[mM]ediaId$/, '')) && !['IMAGE', 'SCREENSHOT'].includes(media.kind)) {
        issues.push(issue('INVALID_BLOCK', 'error', 'Screenshot block me sirf image ya screenshot media chal sakta hai', ref.field, blockId));
      }
      if (ref.key === 'fileMediaId' && media.kind !== 'DOCUMENT') {
        issues.push(issue('INVALID_DATA', 'error', 'Template file DOCUMENT media honi chahiye', ref.field));
      }
      if (locale !== 'en') {
        const alts = (media.altTranslations ?? {}) as Rec;
        if (!str(alts[locale])) issues.push(issue('MEDIA_ALT', 'warning', `Media ka ${locale} alt text nahi hai`, ref.field, blockId));
      }
    }

    // ─── Referenced entries ───
    const referencedIds = collectReferencedEntryIds(type, blocksForContent, data);
    const relationIds = draft.relations.map((r) => r.entryId);
    const refIds = [...new Set([...referencedIds, ...relationIds, draft.authorId, draft.reviewerId, draft.parentId].filter((v): v is string => !!v))];
    const refRows = refIds.length
      ? await db.cmsEntry.findMany({ where: { id: { in: refIds } }, select: { id: true, type: true, title: true, path: true, publishedPath: true, data: true, published: true } })
      : [];
    const refs = new Map(refRows.map((r) => [r.id, r]));
    const live = (id: string | null | undefined) => {
      const r = id ? refs.get(id) : undefined;
      return r && r.publishedPath !== null ? r : null;
    };
    for (const [field, id] of [['authorId', draft.authorId], ['reviewerId', draft.reviewerId]] as const) {
      if (!id) continue;
      const r = refs.get(id);
      if (!r || r.type !== 'PERSON') issues.push(issue('BROKEN_LINK', 'error', 'Author/reviewer sirf Team (Person) entry ho sakta hai', field));
      else if (!r.publishedPath) issues.push(issue('BROKEN_LINK', 'error', `"${r.title}" (Person) ${LIVE_REQUIRED_REF}`, field));
    }
    if (draft.parentId) {
      const parent = refs.get(draft.parentId);
      if (parent && !parent.publishedPath) {
        const severity = type === 'CITY_INDUSTRY' ? 'error' : 'warning';
        issues.push(issue('BROKEN_LINK', severity, `Parent "${parent.title}" ${LIVE_REQUIRED_REF}`, 'parentId'));
      } else if (parent && parent.publishedPath !== parent.path) {
        issues.push(issue('BROKEN_LINK', 'warning', `Parent "${parent.title}" ka naya path abhi publish nahi hua`, 'parentId'));
      }
    }
    if (type === 'CITY_INDUSTRY' && str(data.industryId)) {
      const ind = refs.get(str(data.industryId));
      if (!ind || ind.type !== 'INDUSTRY' || !ind.publishedPath) issues.push(issue('BROKEN_LINK', 'error', 'Industry live INDUSTRY entry honi chahiye', 'data.industryId'));
    }
    if (type === 'CITY' && Array.isArray(data.nearbyCityIds)) {
      (data.nearbyCityIds as unknown[]).forEach((id, i) => {
        const r = refs.get(str(id));
        if (!r || r.type !== 'CITY' || !r.publishedPath) issues.push(issue('BROKEN_LINK', 'error', `Nearby city ${LIVE_REQUIRED_REF} ya City nahi`, `data.nearbyCityIds[${i}]`));
      });
    }
    draft.relations.forEach((rel, i) => {
      const r = refs.get(rel.entryId);
      if (!r) issues.push(issue('BROKEN_LINK', 'warning', 'Related/tag entry mojood nahi', `relations[${i}]`));
      else if (!r.publishedPath) issues.push(issue('BROKEN_LINK', 'warning', `"${r.title}" ${LIVE_REQUIRED_REF}, site par card nahi dikhega`, `relations[${i}]`));
    });

    // ─── Block-specific rules ───
    const planSlugs = new Set(ctx.plans.map((p) => p.slug));
    blocks.forEach((b, i) => {
      if (b.hidden) return;
      const block = b as unknown as Rec;
      if (b.type === 'pricingTable') {
        const slugs = [...(Array.isArray(block.planSlugs) ? (block.planSlugs as string[]) : []), ...(block.highlightPlan ? [str(block.highlightPlan)] : [])];
        for (const slug of slugs) {
          if (!planSlugs.has(slug)) issues.push(issue('INVALID_BLOCK', 'error', `Plan "${slug}" active/public nahi (Admin → Plans)`, `blocks[${i}]`, b.id));
        }
      }
      if (b.type === 'stats' && !settings.allowPlatformStats && Array.isArray(block.items)) {
        for (const item of block.items as Rec[]) {
          if ((PLATFORM_STAT_METRICS as readonly string[]).includes(str(item.metric) as StatMetric)) {
            issues.push(issue('INVALID_BLOCK', 'warning', 'Platform numbers ki ijazat settings me band hai; yeh item nahi dikhega', `blocks[${i}]`, b.id));
          }
        }
      }
      if (b.type === 'hero') {
        const words = countWords(markdownToPlainText(str(block.sub)));
        if (words > 0 && (words < TEXT_LIMITS.heroSubWords.min || words > TEXT_LIMITS.heroSubWords.max)) {
          issues.push(issue('SUMMARY_LENGTH', 'warning', `Hero sub ${words} words; ${TEXT_LIMITS.heroSubWords.min}-${TEXT_LIMITS.heroSubWords.max} behtar hai`, `blocks[${i}].sub`, b.id));
        }
      }
      if (b.type === 'answerBox' && str(block.romanUrdu) && countWords(str(block.romanUrdu)) > TEXT_LIMITS.romanUrduMaxWords) {
        issues.push(issue('SUMMARY_LENGTH', 'warning', `Roman Urdu summary ${TEXT_LIMITS.romanUrduMaxWords} words se zyada hai`, `blocks[${i}].romanUrdu`, b.id));
      }
      if (b.type === 'featuresGrid' && featureStatus !== 'coming' && Array.isArray(block.items) && (block.items as Rec[]).some((it) => it.status === 'coming')) {
        issues.push(issue('INVALID_BLOCK', 'pass', 'Jo features abhi bane nahi, un par "Coming soon" badge lagega', `blocks[${i}]`, b.id));
      }
    });

    // ─── Proof: sources, fact-check, competitor dates, consent ───
    if (type === 'COMPLIANCE') {
      const urls = visible.flatMap((b) => {
        const rb = b as unknown as Rec;
        return [...(b.type === 'sources' && Array.isArray(rb.items) ? (rb.items as Rec[]) : []), ...(Array.isArray(rb.sources) ? (rb.sources as Rec[]) : [])].map((s) => str(s.url));
      });
      if (!urls.some((u) => hostMatches(u, settings.officialDomains))) {
        issues.push(issue('NO_SOURCE', 'error', 'Kam az kam ek official source (fbr.gov.pk, pra.punjab.gov.pk, ...) sources block me do'));
      }
    }
    if ((FACT_CHECK_TYPES as readonly string[]).includes(type) && !entry.factCheckedAt) {
      issues.push(issue('NOT_FACT_CHECKED', 'error', 'Publish se pehle fact-check stamp lagayein ("I checked this")', 'factCheckedAt'));
    }
    if ((COMPETITOR_TYPES as readonly string[]).includes(type)) {
      blocks.forEach((b, i) => {
        if (b.hidden || b.type !== 'comparisonTable') return;
        const rb = b as unknown as Rec;
        if (!rb.checkedAt || !Array.isArray(rb.sources) || rb.sources.length === 0) {
          issues.push(issue('COMPETITOR_UNDATED', 'error', 'Competitor table ke liye "checked" date aur kam az kam ek source zaroori hai', `blocks[${i}]`, b.id));
        }
      });
      if (type === 'BEST_OF' && Array.isArray(data.items)) {
        (data.items as Rec[]).forEach((item, i) => {
          if (item.isNafaa !== true && str(item.price) && !item.priceSource) {
            issues.push(issue('COMPETITOR_UNDATED', 'error', `"${str(item.name)}" ki price ka source/date do`, `data.items[${i}].priceSource`));
          }
        });
      }
      if ((type === 'COMPARE' || type === 'ALTERNATIVE') && str(data.competitorPrice) && !data.priceSource) {
        issues.push(issue('COMPETITOR_UNDATED', 'error', 'Competitor price ka source/date do', 'data.priceSource'));
      }
    }
    issues.push(...(await this.consentIssues(type, data, blocks, db)));

    // ─── FAQs ───
    const faqRows = draft.faqIds.length
      ? await db.cmsFaq.findMany({ where: { id: { in: draft.faqIds } }, select: { id: true, question: true, answer: true, status: true, locale: true } })
      : [];
    const faqById = new Map(faqRows.map((f) => [f.id, f]));
    const shownFaqIds = draft.faqIds.filter((id) => {
      const f = faqById.get(id);
      return f && (f.status === 'PUBLISHED' || input.publishFaqs);
    });
    draft.faqIds.forEach((id, i) => {
      const f = faqById.get(id);
      if (!f) issues.push(issue('FAQ_COUNT', 'warning', 'FAQ mojood nahi', `faqIds[${i}]`));
      else if (f.locale !== locale) issues.push(issue('FAQ_COUNT', 'warning', `FAQ "${f.question}" doosri language ka hai`, `faqIds[${i}]`));
      else if (f.status !== 'PUBLISHED' && !input.publishFaqs) issues.push(issue('FAQ_COUNT', 'warning', `FAQ "${f.question}" publish nahi; page par nahi dikhega ("Publish FAQs with page" chunein)`, `faqIds[${i}]`));
      if (f) {
        const words = countWords(markdownToPlainText(f.answer));
        if (words < TEXT_LIMITS.faqAnswerWords.min || words > TEXT_LIMITS.faqAnswerWords.max) {
          issues.push(issue('FAQ_ANSWER_LENGTH', 'warning', `FAQ "${f.question}" ka jawab ${words} words; ${TEXT_LIMITS.faqAnswerWords.min}-${TEXT_LIMITS.faqAnswerWords.max} behtar hai`, `faqIds[${i}]`));
        }
      }
    });
    const hasFaqBlock = visible.some((b) => b.type === 'faq');
    if (money && hasFaqBlock && (shownFaqIds.length < TEXT_LIMITS.faqCountMoney.min || shownFaqIds.length > TEXT_LIMITS.faqCountMoney.max)) {
      issues.push(issue('FAQ_COUNT', 'warning', `${shownFaqIds.length} FAQs; is page par ${TEXT_LIMITS.faqCountMoney.min}-${TEXT_LIMITS.faqCountMoney.max} behtar hain`, 'faqIds'));
    }

    // ─── Words, gate, similarity ───
    const ownFaqs = await this.ownFaqs(entry.id, shownFaqIds, faqById, db);
    const mainText = extractMainText({ type, summary: draft.summary, blocks: visible, data, ownFaqs });
    const wordCount = countWords(mainText);
    const gate: QualityGate | undefined = settings.qualityGates[type] ?? DEFAULT_QUALITY_GATES[type];
    let passed = gate ? wordCount >= gate.minWords : true;
    if (gate && !passed) {
      issues.push(issue('WORDS_BELOW_GATE', 'warning', `Live, noindex rahega: ${wordCount}/${gate.minWords} words`));
    }
    let similarity: number | undefined;
    let similarityFailed = false;
    if (gate?.similarityMax !== undefined && input.mode !== 'preview') {
      const others = await db.cmsEntry.findMany({
        where: { type, locale, publishedPath: { not: null }, id: { not: entry.id } },
        select: { id: true, title: true, published: true },
      });
      const texts = others.flatMap((o) => {
        const snap = readPublished(o);
        return snap ? [{ id: o.id, title: o.title, text: extractMainText({ type, summary: snap.summary, blocks: snap.blocks, data: snap.data }) }] : [];
      });
      const sim = maxSimilarity(mainText, texts);
      similarity = sim.value;
      if (sim.value >= gate.similarityMax) {
        similarityFailed = true;
        passed = false;
        issues.push(issue('SIMILARITY', 'warning', `"${sim.closest?.title ?? ''}" se ${Math.round(sim.value * 100)}% milta hai (had ${Math.round(gate.similarityMax * 100)}%); noindex rahega`));
      }
    }

    // ─── Title, description, robots ───
    const parentRow = draft.parentId ? refs.get(draft.parentId) : undefined;
    const pattern = titlePatternFor(settings.titlePatterns, type, titlePatternVariant(type, data));
    const seoTitle = (draft.seoTitle ?? '').trim() || fillTitlePattern(pattern, {
      type,
      title: draft.title,
      data,
      parent: parentRow ? { title: parentRow.title, data: (parentRow.data ?? {}) as Rec } : null,
    });
    const titleIncludesBrand = brandCount(seoTitle, settings.brand) > 0;
    const finalTitle = resolveTokensInText(seoTitle, ctx, 'remove').text;
    const titleLen = finalTitle.length;
    if (titleLen < TEXT_LIMITS.titleChars.min || titleLen > TEXT_LIMITS.titleChars.max) {
      issues.push(issue('TITLE_LENGTH', 'warning', `Title ${titleLen} characters; ${TEXT_LIMITS.titleChars.min}-${TEXT_LIMITS.titleChars.max} behtar hai`, 'seoTitle'));
    } else {
      issues.push(issue('TITLE_LENGTH', 'pass', `Title ${titleLen} characters`, 'seoTitle'));
    }
    if (brandCount(seoTitle, settings.brand) > 1) issues.push(issue('TITLE_LENGTH', 'warning', `"${settings.brand}" title me ek se zyada baar hai`, 'seoTitle'));

    const description = (draft.seoDescription ?? '').trim() || truncateDescription(summary);
    const finalDescription = resolveTokensInText(description, ctx, 'remove').text;
    if (!finalDescription) {
      issues.push(issue('DESCRIPTION_LENGTH', 'warning', 'Meta description khali hai (summary ya SEO description likhein)', 'seoDescription'));
    } else if (finalDescription.length < TEXT_LIMITS.descriptionChars.min || finalDescription.length > TEXT_LIMITS.descriptionChars.max) {
      issues.push(issue('DESCRIPTION_LENGTH', 'warning', `Description ${finalDescription.length} characters; ${TEXT_LIMITS.descriptionChars.min}-${TEXT_LIMITS.descriptionChars.max} behtar hai`, 'seoDescription'));
    } else {
      issues.push(issue('DESCRIPTION_LENGTH', 'pass', `Description ${finalDescription.length} characters`, 'seoDescription'));
    }

    let reason: PublicRobots['reason'];
    if (draft.noindex) reason = 'editor';
    else if (featureStatus === 'coming') reason = 'coming';
    else if (similarityFailed) reason = 'similarity';
    else if (!passed) reason = 'quality_gate';
    const robots: PublicRobots = { index: reason === undefined, follow: !draft.nofollow, ...(reason ? { reason } : {}) };
    if (featureStatus === 'coming') {
      issues.push(issue('MISSING_DATA', 'pass', '"Coming soon" feature: noindex rahega aur badge dikhega', 'data.status'));
    }

    if (robots.index && input.mode !== 'preview' && finalTitle) {
      const dup = await this.duplicateTitle(entry.id, locale, finalTitle, ctx, db);
      if (dup) issues.push(issue('DUPLICATE_TITLE', 'error', `Yahi title "${dup}" ka bhi hai; title badlein`, 'seoTitle'));
    }

    // ─── Focus keyword ───
    const focus = (draft.focusKeyword ?? '').trim().toLowerCase();
    if (focus) {
      const hero = visible.find((b) => b.type === 'hero') as Rec | undefined;
      const h1 = (str(hero?.heading) || draft.title).toLowerCase();
      const first100 = mainText.split(/\s+/).slice(0, 100).join(' ').toLowerCase();
      const missing: string[] = [];
      if (!finalTitle.toLowerCase().includes(focus)) missing.push('title');
      if (!h1.includes(focus)) missing.push('H1');
      if (!first100.includes(focus)) missing.push('pehle 100 words');
      if (!finalDescription.toLowerCase().includes(focus)) missing.push('description');
      if (!draft.slug.includes(focus.replace(/\s+/g, '-'))) missing.push('slug');
      issues.push(
        missing.length
          ? issue('FOCUS_KEYWORD', 'warning', `Focus keyword yahan nahi: ${missing.join(', ')}`, 'focusKeyword')
          : issue('FOCUS_KEYWORD', 'pass', 'Focus keyword har jagah hai', 'focusKeyword'),
      );
    }

    // ─── Typed prices ───
    const priceText = [summary, ...visible.map((b) => JSON.stringify(b))].join('\n');
    if (TYPED_PRICE_REGEX.test(priceText)) {
      issues.push(issue('TYPED_PRICE', 'warning', 'Text me price likhi hai; {{price:...}} token use karein taake Plans se aaye'));
    }

    // ─── Internal links ───
    const linkTargets = new Set<string>([...referencedIds, ...relationIds]);
    linkTargets.delete(entry.id);
    if ((money || type === 'BLOG_POST' || type === 'GUIDE') && linkTargets.size < 3) {
      issues.push(issue('FEW_INTERNAL_LINKS', 'warning', `Sirf ${linkTargets.size} internal links; kam az kam 3 rakhein`));
    }
    const required = REQUIRED_LINKS[type];
    if (required) {
      const byType = new Map<string, number>();
      for (const id of linkTargets) {
        const r = refs.get(id);
        if (r) byType.set(r.type, (byType.get(r.type) ?? 0) + 1);
      }
      for (const req of required) {
        const have = byType.get(req.type) ?? 0;
        if (have < req.min) issues.push(issue('REQUIRED_LINK', 'warning', `${req.label}: ${have}/${req.min} links`));
      }
    }
    if ((type === 'BLOG_POST' || type === 'GUIDE') && !this.moneyLinkEarly(visible, refs)) {
      issues.push(issue('FEW_INTERNAL_LINKS', 'warning', `Pehle ${TEXT_LIMITS.articleMoneyLinkWithinWords} words me kisi product/industry page ka link do`));
    }
    if (entry.publishedPath && robots.index && input.mode !== 'preview') {
      const inbound = await db.cmsEntryRelation.count({ where: { toId: entry.id, from: { publishedPath: { not: null } } } });
      if (inbound < TEXT_LIMITS.minInboundLinks) issues.push(issue('ORPHAN', 'warning', `Sirf ${inbound} pages is page ko link karte hain (kam az kam ${TEXT_LIMITS.minInboundLinks})`));
    }
    if (entry.contentUpdatedAt) {
      const months = (Date.now() - entry.contentUpdatedAt.getTime()) / (30.44 * 24 * 3600 * 1000);
      if (months > TEXT_LIMITS.staleMonths) issues.push(issue('STALE', 'warning', `Content ${Math.floor(months)} mahine purana hai`));
    }

    const errors = issues.filter((i) => i.severity === 'error');
    const report: SeoReport = {
      score: scoreFromIssues(issues),
      issues,
      finalTitle,
      finalDescription,
      robots,
      gate: { words: wordCount, required: gate?.minWords ?? null, ...(similarity !== undefined ? { similarity } : {}) },
    };
    return {
      issues,
      report,
      canPublish: errors.length === 0,
      prepared: {
        template,
        blocks: parsedBlocks,
        data: publishData,
        dataValid: dataResult.success,
        seoTitle,
        titleIncludesBrand,
        description,
        robots,
        quality: { wordCount, gate: gate?.minWords ?? null, passed, ...(similarity !== undefined ? { similarity } : {}) },
        mediaIds,
        referencedIds: [...new Set(referencedIds)].filter((id) => id !== entry.id),
        featureStatus,
      },
    };
  }

  private blockIdOf(field: string, blocks: readonly DraftBlock[]): string | undefined {
    const m = /^blocks\[(\d+)\]/.exec(field);
    return m ? blocks[Number(m[1])]?.id : undefined;
  }

  /** FAQs shown on this entry and attached (in a draft) to no other entry. */
  private async ownFaqs(
    entryId: string,
    shownIds: readonly string[],
    faqById: Map<string, { question: string; answer: string }>,
    db: Db,
  ): Promise<{ question: string; answer: string }[]> {
    if (shownIds.length === 0) return [];
    const others = await db.cmsEntry.findMany({ where: { id: { not: entryId }, faqIds: { hasSome: [...shownIds] } }, select: { faqIds: true } });
    const shared = new Set(others.flatMap((o) => o.faqIds));
    return shownIds.filter((id) => !shared.has(id)).flatMap((id) => {
      const f = faqById.get(id);
      return f ? [{ question: f.question, answer: f.answer }] : [];
    });
  }

  /** Another live, indexable entry in the locale with the same final title. */
  private async duplicateTitle(entryId: string, locale: string, finalTitle: string, ctx: TokenContext, db: Db): Promise<string | null> {
    const rows = await db.$queryRaw<{ title: string; seoTitle: string | null }[]>`
      SELECT "title", "published"->'seo'->>'title' AS "seoTitle" FROM "CmsEntry"
      WHERE "locale" = ${locale} AND "publishedPath" IS NOT NULL AND "id" <> ${entryId}
        AND COALESCE(("published"->'seo'->'robots'->>'index')::boolean, true) = true`;
    const mine = finalTitle.trim().toLowerCase();
    for (const r of rows) {
      if (r.seoTitle && resolveTokensInText(r.seoTitle, ctx, 'remove').text.trim().toLowerCase() === mine) return r.title;
    }
    return null;
  }

  /** NO_CONSENT for case studies, picked testimonials and picked logos. */
  private async consentIssues(type: CmsEntryType, data: Rec, blocks: readonly DraftBlock[], db: Db): Promise<Issue[]> {
    const issues: Issue[] = [];
    const hasScope = (c: { consentScope: string[]; consentAt: Date | null; isPublic?: boolean } | null | undefined, scope: string) =>
      !!c && c.consentAt !== null && c.consentScope.includes(scope);
    if (type === 'CASE_STUDY' && str(data.customerId)) {
      const c = await db.cmsCustomer.findUnique({ where: { id: str(data.customerId) }, select: { consentScope: true, consentAt: true } });
      if (!hasScope(c, 'CASE_STUDY')) issues.push(issue('NO_CONSENT', 'error', 'Customer ki CASE_STUDY consent record nahi', 'data.customerId'));
    }
    for (const [i, b] of blocks.entries()) {
      if (b.hidden) continue;
      const rb = b as unknown as Rec;
      if (rb.mode !== 'pick' || !Array.isArray(rb.ids) || rb.ids.length === 0) continue;
      const ids = (rb.ids as unknown[]).map(str).filter(Boolean);
      if (b.type === 'testimonial') {
        const rows = await db.cmsTestimonial.findMany({
          where: { id: { in: ids } },
          select: { id: true, status: true, customer: { select: { consentScope: true, consentAt: true, isPublic: true } } },
        });
        const ok = new Set(rows.filter((t) => t.status === 'PUBLISHED' && t.customer.isPublic && hasScope(t.customer, 'QUOTE')).map((t) => t.id));
        if (ids.some((id) => !ok.has(id))) issues.push(issue('NO_CONSENT', 'error', 'Kuch testimonials ki QUOTE consent / publish nahi', `blocks[${i}].ids`, b.id));
      }
      if (b.type === 'logoCloud') {
        const rows = await db.cmsCustomer.findMany({ where: { id: { in: ids } }, select: { id: true, consentScope: true, consentAt: true, isPublic: true, logoId: true } });
        const ok = new Set(rows.filter((c) => c.isPublic && c.logoId && hasScope(c, 'LOGO')).map((c) => c.id));
        if (ids.some((id) => !ok.has(id))) issues.push(issue('NO_CONSENT', 'error', 'Kuch customers ki LOGO consent / logo nahi', `blocks[${i}].ids`, b.id));
      }
    }
    return issues;
  }

  /** True when a money page is linked within the first N words of the article text. */
  private moneyLinkEarly(visible: readonly DraftBlock[], refs: Map<string, { type: string }>): boolean {
    const text = visible
      .filter((b) => b.type === 'richText')
      .map((b) => str((b as unknown as Rec).markdown))
      .join('\n');
    const words = text.split(/\s+/).slice(0, TEXT_LIMITS.articleMoneyLinkWithinWords).join(' ');
    for (const m of words.matchAll(/\]\(\s*entry:([A-Za-z0-9_-]{1,64})/g)) {
      const t = m[1] ? refs.get(m[1]) : undefined;
      if (t && ((MONEY_TYPES as readonly string[]).includes(t.type) || t.type === 'PAGE')) return true;
    }
    return false;
  }
}

/** Entry type label for messages. */
export function typeLabel(type: CmsEntryType): string {
  return ENTRY_TYPE_META[type].label;
}
