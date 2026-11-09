import { BuyerStats, clvOf, frequencyScore, monetaryCuts, monetaryScore, recencyScore, repeatRateOf, rfmOf, segmentsOf, vipCutOf } from './segments';

const NOW = Date.UTC(2026, 10, 9);
const ago = (d: number) => new Date(NOW - d * 86_400_000);
const buyer = (p: Partial<BuyerStats>): BuyerStats => ({
  orders: 1, delivered: 1, returned: 0, cancelled: 0, spent: 2000, firstAt: ago(10), lastAt: ago(10), blocked: false, ...p,
});

describe('segment rules', () => {
  it('marks a first order in the last 30 days as new', () => {
    const s = segmentsOf(buyer({ firstAt: ago(5), lastAt: ago(5) }), NOW, Infinity);
    expect(s.new).toBe(true);
    expect(s.repeat).toBe(false);
  });

  it('a new buyer who returned the parcel is not new but high RTO', () => {
    const s = segmentsOf(buyer({ delivered: 0, returned: 1, spent: 0 }), NOW, Infinity);
    expect(s.new).toBe(false);
    expect(s.high_rto).toBe(true);
  });

  it('splits quiet buyers into at risk (60–119 days) and lost (120+)', () => {
    expect(segmentsOf(buyer({ lastAt: ago(59) }), NOW, Infinity).at_risk).toBe(false);
    expect(segmentsOf(buyer({ lastAt: ago(60) }), NOW, Infinity).at_risk).toBe(true);
    expect(segmentsOf(buyer({ lastAt: ago(119) }), NOW, Infinity).lost).toBe(false);
    const lost = segmentsOf(buyer({ lastAt: ago(120) }), NOW, Infinity);
    expect(lost.lost).toBe(true);
    expect(lost.at_risk).toBe(false);
  });

  it('never calls someone who never received a parcel at risk or lost', () => {
    const s = segmentsOf(buyer({ delivered: 0, spent: 0, lastAt: ago(200), firstAt: ago(200) }), NOW, Infinity);
    expect(s.at_risk || s.lost).toBe(false);
  });

  it('VIP is the top 10% by spend among buyers with 2+ delivered orders', () => {
    const all = Array.from({ length: 20 }, (_, i) => buyer({ delivered: 2, orders: 2, spent: (i + 1) * 1000 }));
    const cut = vipCutOf(all);
    expect(cut).toBe(19_000);
    expect(segmentsOf(all[19], NOW, cut).vip).toBe(true);
    expect(segmentsOf(all[18], NOW, cut).vip).toBe(true);
    expect(segmentsOf(all[17], NOW, cut).vip).toBe(false);
  });

  it('high RTO needs two returns or returns at least equal to deliveries', () => {
    expect(segmentsOf(buyer({ delivered: 3, returned: 1 }), NOW, Infinity).high_rto).toBe(false);
    expect(segmentsOf(buyer({ delivered: 1, returned: 1 }), NOW, Infinity).high_rto).toBe(true);
    expect(segmentsOf(buyer({ delivered: 9, returned: 2 }), NOW, Infinity).high_rto).toBe(true);
  });

  it('repeat rate counts buyers with 2+ delivered among buyers with any', () => {
    const all = [buyer({ delivered: 2 }), buyer({ delivered: 1 }), buyer({ delivered: 1 }), buyer({ delivered: 0, spent: 0 })];
    expect(repeatRateOf(all)).toBe(33.3);
  });
});

describe('RFM', () => {
  it('scores recency, frequency and monetary on 1–5', () => {
    expect([recencyScore(3), recencyScore(20), recencyScore(45), recencyScore(100), recencyScore(400)]).toEqual([5, 4, 3, 2, 1]);
    expect([frequencyScore(0), frequencyScore(1), frequencyScore(2), frequencyScore(3), frequencyScore(5), frequencyScore(8)]).toEqual([0, 1, 2, 3, 4, 5]);
    const cuts = monetaryCuts([1000, 2000, 3000, 4000, 5000]);
    expect(cuts).toEqual([2000, 3000, 4000, 5000]);
    expect(monetaryScore(1000, cuts)).toBe(1);
    expect(monetaryScore(5000, cuts)).toBe(5);
    expect(monetaryScore(0, cuts)).toBe(0);
  });

  it('labels champions, new, at risk and lost', () => {
    const cuts = [1000, 2000, 3000, 4000];
    expect(rfmOf(buyer({ delivered: 6, orders: 6, spent: 9000, lastAt: ago(3), firstAt: ago(300) }), NOW, cuts).label).toBe('CHAMPION');
    expect(rfmOf(buyer({ firstAt: ago(5), lastAt: ago(5) }), NOW, cuts).label).toBe('NEW');
    expect(rfmOf(buyer({ lastAt: ago(90), firstAt: ago(200) }), NOW, cuts).label).toBe('AT_RISK');
    expect(rfmOf(buyer({ lastAt: ago(200), firstAt: ago(300) }), NOW, cuts).label).toBe('LOST');
    expect(rfmOf(buyer({ delivered: 0, spent: 0 }), NOW, cuts).label).toBe('NO_BUY');
    expect(rfmOf(buyer({ delivered: 6, orders: 6, spent: 9000, lastAt: ago(3), firstAt: ago(300) }), NOW, cuts).score).toBe('555');
  });
});

describe('CLV', () => {
  it('is zero without a delivered order', () => {
    expect(clvOf(buyer({ delivered: 0, spent: 0 }), NOW)).toBe(0);
  });

  it('projects 12 months at the buyer\'s own pace, counted over at least 6 months', () => {
    // 1 order of 2000 in 10 days → 2 orders a year at most → 4000.
    expect(clvOf(buyer({}), NOW)).toBe(4000);
    // 12 orders of 1500 over 12 months → 12 a year → 18000.
    expect(clvOf(buyer({ delivered: 12, orders: 12, spent: 18_000, firstAt: ago(360), lastAt: ago(5) }), NOW)).toBe(18_000);
  });

  it('shrinks for quiet buyers', () => {
    const active = clvOf(buyer({ delivered: 4, spent: 8000, firstAt: ago(360), lastAt: ago(10) }), NOW);
    const atRisk = clvOf(buyer({ delivered: 4, spent: 8000, firstAt: ago(360), lastAt: ago(90) }), NOW);
    const lost = clvOf(buyer({ delivered: 4, spent: 8000, firstAt: ago(360), lastAt: ago(200) }), NOW);
    expect(atRisk).toBe(Math.round(active * 0.5));
    expect(lost).toBeLessThan(atRisk);
  });
});
