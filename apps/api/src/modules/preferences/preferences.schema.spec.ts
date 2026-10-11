import { isPreferenceKey, PREFERENCE_VALIDATORS } from './preferences.schema';

describe('dashboard preference', () => {
  it('keeps valid widget ids, de-duplicated', () => {
    expect(PREFERENCE_VALIDATORS.dashboard({ order: ['kpis', 'sales-trend', 'kpis', 'Bad Id!'], hidden: ['low-stock', 5] }))
      .toMatchObject({ order: ['kpis', 'sales-trend'], hidden: ['low-stock'] });
  });
  it('handles garbage', () => {
    expect(PREFERENCE_VALIDATORS.dashboard('x')).toEqual({ order: [], hidden: [], sizes: {}, kpis: [], target: 0 });
  });
  it('validates sizes, kpis and target', () => {
    expect(PREFERENCE_VALIDATORS.dashboard({
      sizes: { 'sales-trend': 'full', 'top-products': 'huge', 'Bad!': 'half' },
      kpis: ['sales', 'bills'],
      target: '25000.6',
    })).toMatchObject({ sizes: { 'sales-trend': 'full' }, kpis: ['sales', 'bills'], target: 25001 });
    expect(PREFERENCE_VALIDATORS.dashboard({ target: -5 })).toMatchObject({ target: 0 });
  });
  it('rejects unknown keys', () => {
    expect(isPreferenceKey('dashboard')).toBe(true);
    expect(isPreferenceKey('__proto__')).toBe(false);
  });
});
