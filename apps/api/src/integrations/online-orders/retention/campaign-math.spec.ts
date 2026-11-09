import { birthdaySoon, conversionOf, fillCampaignText } from './campaign-math';

describe('campaign messages', () => {
  it('fills the first name, shop, code, link and product', () => {
    expect(fillCampaignText('Salam {name}! {shop}: {product} wapas aa gaya. Code {code} — {link}', {
      name: 'Ayesha Khan', shop: 'Hiba Store', code: 'WAPAS10', link: 'https://x.pk', product: 'Lawn suit',
    })).toBe('Salam Ayesha! Hiba Store: Lawn suit wapas aa gaya. Code WAPAS10 — https://x.pk');
  });

  it('leaves no double spaces when a value is empty', () => {
    expect(fillCampaignText('Code {code} lagayein', {})).toBe('Code lagayein');
  });
});

describe('conversion', () => {
  const sent = new Date('2026-11-01T10:00:00Z');
  const o = (id: string, at: string, status = 'PENDING') => ({ id, receivedAt: new Date(at), total: 1000, status, no: id });

  it('counts the first order within 7 days after sending', () => {
    expect(conversionOf(sent, [o('late', '2026-11-09T10:00:01Z'), o('b', '2026-11-05T00:00:00Z'), o('a', '2026-11-03T00:00:00Z')])?.id).toBe('a');
  });

  it('ignores orders before sending, cancelled ones, and unsent messages', () => {
    expect(conversionOf(sent, [o('x', '2026-10-31T00:00:00Z'), o('c', '2026-11-02T00:00:00Z', 'CANCELLED')])).toBeNull();
    expect(conversionOf(null, [o('a', '2026-11-03T00:00:00Z')])).toBeNull();
  });
});

describe('birthdays', () => {
  it('finds birthdays in the next 7 days, across the new year', () => {
    const now = new Date(Date.UTC(2026, 11, 28));
    expect(birthdaySoon(new Date(Date.UTC(1990, 0, 2)), now)).toBe(true);
    expect(birthdaySoon(new Date(Date.UTC(1990, 0, 10)), now)).toBe(false);
  });
});
