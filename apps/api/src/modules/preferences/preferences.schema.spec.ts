import { isPreferenceKey, PREFERENCE_VALIDATORS } from './preferences.schema';

describe('dashboard preference', () => {
  it('keeps valid widget ids, de-duplicated', () => {
    expect(PREFERENCE_VALIDATORS.dashboard({ order: ['kpis', 'sales-trend', 'kpis', 'Bad Id!'], hidden: ['low-stock', 5] }))
      .toEqual({ order: ['kpis', 'sales-trend'], hidden: ['low-stock'] });
  });
  it('handles garbage', () => {
    expect(PREFERENCE_VALIDATORS.dashboard('x')).toEqual({ order: [], hidden: [] });
  });
  it('rejects unknown keys', () => {
    expect(isPreferenceKey('dashboard')).toBe(true);
    expect(isPreferenceKey('__proto__')).toBe(false);
  });
});
