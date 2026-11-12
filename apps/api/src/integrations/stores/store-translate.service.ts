/**
 * Nafaa AI Urdu for a store's theme: the English text of sections, blocks
 * and the announcement/header/footer is translated into simple Urdu, only
 * where the Urdu box is still empty. Nothing is saved or published here; the
 * editor puts the proposed Urdu into its draft, which saves as usual.
 *
 * Uses the assistant's provider on the everyday model with low effort.
 * Without a model the editor hides the button. A shop gets 20 runs a day and
 * a person 3 a minute.
 */
import { BadRequestException, HttpException, HttpStatus, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { AuthenticatedUser } from '../../modules/auth/interfaces/jwt-payload.interface';
import { createProvider } from '../../modules/ai-assistant/ai-provider';
import { aiModels } from '../../modules/ai-assistant/ai.config';
import { StoreAccessService } from './store-access.service';
import { StoreThemeService } from './store-theme.service';
import { ThemeDoc, ThemeDocError, cleanThemeDoc } from './theme/theme-doc';
import { parseUrdu, proposeUrdu, urduTargets } from './theme/urdu-fill';

const DAILY_LIMIT = 20;
const BURST = { max: 3, windowMs: 60_000 };

const SYSTEM = [
  'You translate the English text of a Pakistani online shop website into Urdu (Urdu script).',
  'Use simple, everyday Urdu that ordinary shoppers understand. Keep it short and natural, like a shop would write it.',
  'Keep in English (Latin letters): brand names, product names, the shop name, sizes, codes, prices, numbers, emails, phone numbers and links.',
  'Common shopping words may stay as they are said in Pakistan (COD, Sale, Discount, Order, Delivery).',
  'Do not add or drop facts. Do not add emoji that are not in the English.',
  'Input: JSON {"items":[{"i":0,"text":"..."}]}. Return JSON only, no other text, in this shape:',
  '{"items":[{"i":0,"ur":"..."}]} with one entry for every input item and the same "i".',
].join('\n');

@Injectable()
export class StoreTranslateService {
  private readonly logger = new Logger(StoreTranslateService.name);
  private readonly burst = new Map<string, number[]>();
  private readonly daily = new Map<string, { day: string; count: number }>();

  constructor(
    private readonly access: StoreAccessService,
    private readonly theme: StoreThemeService,
  ) {}

  /** Whether the editor should show the button. */
  available() {
    return { available: !!createProvider() };
  }

  private take(user: AuthenticatedUser) {
    const now = Date.now();
    const list = (this.burst.get(user.id) ?? []).filter((t) => now - t < BURST.windowMs);
    if (list.length >= BURST.max) throw new HttpException('Thora ruk kar dobara try karein', HttpStatus.TOO_MANY_REQUESTS);
    const day = new Date().toISOString().slice(0, 10);
    const d = this.daily.get(user.tenantId);
    const used = d && d.day === day ? d.count : 0;
    if (used >= DAILY_LIMIT) throw new HttpException('Aaj ki Nafaa AI Urdu ki had poori ho gayi — kal dobara', HttpStatus.TOO_MANY_REQUESTS);
    list.push(now);
    this.burst.set(user.id, list);
    this.daily.set(user.tenantId, { day, count: used + 1 });
    if (this.burst.size > 5000) this.burst.clear();
  }

  /**
   * Proposed Urdu for the theme the editor has open (`doc`, else the saved
   * draft). Returns changes only; the draft and the live theme stay as they are.
   */
  async urdu(user: AuthenticatedUser, id: string, body: { doc?: unknown }) {
    await this.access.assertWrite(user);
    const ctx = await this.access.requireStore(user, id);
    if (!ctx.settings.languages.enabled.includes('ur')) throw new BadRequestException('Pehle Preferences me Urdu on karein');
    const provider = createProvider();
    if (!provider) throw new ServiceUnavailableException('Nafaa AI abhi dastiyab nahi');
    const draft = await this.theme.draft(ctx.store.id);
    const saved = draft.doc as unknown as ThemeDoc;
    let doc = saved;
    if (body?.doc) {
      try {
        doc = cleanThemeDoc(body.doc, saved);
      } catch (e) {
        if (e instanceof ThemeDocError) throw new BadRequestException(e.message);
        throw e;
      }
    }
    const targets = urduTargets(doc);
    if (!targets.length) return { changes: [], remaining: 0, total: 0 };
    this.take(user);
    const dynamicSystem = `Shop name: ${ctx.store.name.slice(0, 80)}`;
    const result = await proposeUrdu(targets, async (items) => {
      try {
        const res = await provider.turn({
          model: aiModels().chat, effort: 'low', maxTokens: 6000, staticSystem: SYSTEM, dynamicSystem,
          tools: [], messages: [{ role: 'user', content: JSON.stringify({ items }) }],
        }, () => undefined);
        const text = res.content.map((c) => ((c as { type?: string }).type === 'text' ? (c as { text: string }).text : '')).join('');
        return parseUrdu(text);
      } catch (e) {
        this.logger.warn(`Store Urdu failed (${user.tenantId}): ${(e as Error)?.message}`);
        throw new ServiceUnavailableException('Nafaa AI se jawab nahi aaya — thori dair baad dobara try karein');
      }
    });
    if (!result.changes.length) this.logger.warn(`Store Urdu answer was not usable (${user.tenantId})`);
    return result;
  }
}
