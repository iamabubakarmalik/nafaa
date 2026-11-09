import { applyCaps, DEFAULT_CAPS, evaluateRules, normalizeRule, undoOf, type CampaignStat } from './ad-rules';

const stat = (o: Partial<CampaignStat> = {}): CampaignStat => ({
  id: '100', name: 'Lawn', status: 'ACTIVE', dailyBudget: 1000, currency: 'PKR', spend: 5000, delivered: 4, deliveredSales: 20000,
  roas: 4, cpa: 1250, metaRoas: 6, todaySpend: 300, ...o,
});

describe('ad rules engine', () => {
  it('cleans rules with defaults and suggest mode', () => {
    const r = normalizeRule({ kind: 'ROAS_RAISE', threshold: 3, pct: 500, days: 90, campaignIds: ['1', 'x', '1'] }, 'r1');
    expect(r).toMatchObject({ id: 'r1', kind: 'ROAS_RAISE', pct: 100, days: 30, campaignIds: ['1'], mode: 'SUGGEST', enabled: true, minSpend: 2000 });
    expect(normalizeRule({ kind: 'ROAS_PAUSE', threshold: 1 }).pct).toBe(0);
    expect(() => normalizeRule({ kind: 'NOPE' })).toThrow('KIND');
    expect(() => normalizeRule({ kind: 'CPA_LOWER', threshold: -1 })).toThrow('THRESHOLD');
  });

  it('dry-runs each kind', () => {
    const pause = normalizeRule({ kind: 'ROAS_PAUSE', threshold: 1.5 }, 'p');
    const lower = normalizeRule({ kind: 'CPA_LOWER', threshold: 1000, pct: 20 }, 'l');
    const raise = normalizeRule({ kind: 'ROAS_RAISE', threshold: 3, pct: 20 }, 'r');
    const cap = normalizeRule({ kind: 'SPEND_CAP', threshold: 2000 }, 'c');

    expect(evaluateRules([pause], [stat({ roas: 1.2 })])[0]).toMatchObject({ action: 'PAUSE', after: { status: 'PAUSED' }, reason: { kind: 'ROAS_PAUSE', value: 1.2 } });
    // Not enough spend yet: nothing happens.
    expect(evaluateRules([pause], [stat({ roas: 0.5, spend: 500 })])).toEqual([]);
    // Spent with nothing delivered counts as ROAS 0.
    expect(evaluateRules([pause], [stat({ roas: null, delivered: 0, spend: 3000 })])[0].reason.value).toBe(0);
    expect(evaluateRules([lower], [stat({ cpa: 1250 })])[0]).toMatchObject({ action: 'BUDGET', before: { dailyBudget: 1000 }, after: { dailyBudget: 800 }, changePct: -20 });
    expect(evaluateRules([raise], [stat({ roas: 4 })])[0]).toMatchObject({ after: { dailyBudget: 1200 }, changePct: 20 });
    expect(evaluateRules([cap], [stat({ todaySpend: 2500 })])[0]).toMatchObject({ action: 'PAUSE', reason: { kind: 'SPEND_CAP', value: 2500 } });
    // Paused campaigns and ad-set budgets are left alone.
    expect(evaluateRules([pause, raise], [stat({ status: 'PAUSED', roas: 0.2 })])).toEqual([]);
    expect(evaluateRules([raise], [stat({ dailyBudget: null })])).toEqual([]);
  });

  it('gives one action per campaign, the most protective first', () => {
    const rules = [
      normalizeRule({ kind: 'ROAS_RAISE', threshold: 0.5, pct: 20 }, 'r'),
      normalizeRule({ kind: 'SPEND_CAP', threshold: 100 }, 'c'),
    ];
    const out = evaluateRules(rules, [stat()]);
    expect(out).toHaveLength(1);
    expect(out[0].ruleId).toBe('c');
  });

  it('keeps rules to their campaigns', () => {
    const r = normalizeRule({ kind: 'ROAS_PAUSE', threshold: 2, campaignIds: ['999'] }, 'p');
    expect(evaluateRules([r], [stat({ roas: 1 })])).toEqual([]);
  });

  it('applies the daily caps', () => {
    const raise = normalizeRule({ kind: 'ROAS_RAISE', threshold: 3, pct: 25, mode: 'AUTO' }, 'r');
    const actions = evaluateRules([raise], [stat({ id: 'a' }), stat({ id: 'b' }), stat({ id: 'c' })]);
    const { allowed, held } = applyCaps(actions, { maxChangePct: 30, maxActions: 2 }, new Map([['a', 20], ['b', 30]]), 0);
    // a has 10% left, b none, c gets its full 25%.
    expect(allowed.map((a) => [a.campaignId, a.changePct, a.after.dailyBudget])).toEqual([['a', 10, 1100], ['c', 25, 1250]]);
    expect(held.map((h) => [h.campaignId, h.held])).toEqual([['b', 'CAP_PCT']]);
    // A third change on the same day goes over the count.
    expect(applyCaps(actions, { maxChangePct: 30, maxActions: 1 }, new Map(), 0).held.map((h) => h.held)).toEqual(['CAP_COUNT', 'CAP_COUNT']);
    const counted = applyCaps(actions, DEFAULT_CAPS, new Map(), 10);
    expect(counted.allowed).toEqual([]);
    expect(counted.held.every((h) => h.held === 'CAP_COUNT')).toBe(true);
  });

  it('undoes every kind of change', () => {
    expect(undoOf({ action: 'PAUSE', before: { status: 'ACTIVE' }, after: { status: 'PAUSED' } })).toEqual({ action: 'SET_STATUS', status: 'ACTIVE' });
    expect(undoOf({ action: 'RESUME', before: {}, after: { status: 'ACTIVE' } })).toEqual({ action: 'SET_STATUS', status: 'PAUSED' });
    expect(undoOf({ action: 'BUDGET', before: { dailyBudget: 1000 }, after: { dailyBudget: 800 } })).toEqual({ action: 'SET_BUDGET', dailyBudget: 1000 });
    expect(undoOf({ action: 'DUPLICATE', before: {}, after: { createdIds: ['9'] } })).toEqual({ action: 'DELETE', ids: ['9'] });
    expect(() => undoOf({ action: 'BUDGET', before: {}, after: {} })).toThrow('NO_BEFORE');
  });
});
