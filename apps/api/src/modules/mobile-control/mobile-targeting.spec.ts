import {
  compareVersions, isLive, matchesTarget, pickText, sanitizeTarget, sanitizeText, versionInRange,
  type MobileTarget,
} from './mobile-targeting';
import { resolveFlags, sanitizeConfig, updateStateFor, FLAG_KEYS } from './mobile-config.schema';

const target = (t: Partial<MobileTarget>): MobileTarget => ({
  audience: 'all', planSlugs: [], industries: [], tenantIds: [], platforms: [], minVersion: null, maxVersion: null, ...t,
});

describe('compareVersions', () => {
  it('compares numerically, not as text', () => {
    expect(compareVersions('2.0.10', '2.0.9')).toBe(1);
    expect(compareVersions('2.0.9', '2.0.10')).toBe(-1);
    expect(compareVersions('10.0.0', '9.9.9')).toBe(1);
  });

  it('treats missing parts as zero', () => {
    expect(compareVersions('2', '2.0.0')).toBe(0);
    expect(compareVersions('2.1', '2.0.5')).toBe(1);
  });

  it('ignores build and pre-release suffixes', () => {
    expect(compareVersions('2.0.0-beta.1', '2.0.0')).toBe(0);
    expect(compareVersions('2.0.1+45', '2.0.0')).toBe(1);
  });

  it('sorts garbage as 0.0.0', () => {
    expect(compareVersions('abc', '0.0.1')).toBe(-1);
    expect(compareVersions(null, undefined)).toBe(0);
  });
});

describe('versionInRange', () => {
  it('is open when no bounds are set, even without a version', () => {
    expect(versionInRange(null)).toBe(true);
  });

  it('needs a version once a bound is set', () => {
    expect(versionInRange(null, '2.0.0')).toBe(false);
  });

  it('includes both ends', () => {
    expect(versionInRange('2.0.0', '2.0.0', '2.1.0')).toBe(true);
    expect(versionInRange('2.1.0', '2.0.0', '2.1.0')).toBe(true);
    expect(versionInRange('2.1.1', '2.0.0', '2.1.0')).toBe(false);
    expect(versionInRange('1.9.9', '2.0.0')).toBe(false);
  });
});

describe('matchesTarget', () => {
  const viewer = { platform: 'android', version: '2.0.3', tenantId: 't1', planSlug: 'pro', industry: 'GROCERY' };

  it('matches everyone for "all"', () => {
    expect(matchesTarget(target({}), viewer)).toBe(true);
    expect(matchesTarget(target({}), {})).toBe(true);
  });

  it('filters by plan, industry (any case) and business', () => {
    expect(matchesTarget(target({ audience: 'plan', planSlugs: ['pro'] }), viewer)).toBe(true);
    expect(matchesTarget(target({ audience: 'plan', planSlugs: ['basic'] }), viewer)).toBe(false);
    expect(matchesTarget(target({ audience: 'industry', industries: ['grocery'] }), viewer)).toBe(true);
    expect(matchesTarget(target({ audience: 'industry', industries: ['BAKERY'] }), viewer)).toBe(false);
    expect(matchesTarget(target({ audience: 'tenant', tenantIds: ['t1', 't2'] }), viewer)).toBe(true);
    expect(matchesTarget(target({ audience: 'tenant', tenantIds: ['t2'] }), viewer)).toBe(false);
  });

  it('never shows business-targeted items to a signed-out viewer', () => {
    const anon = { platform: 'android', version: '2.0.3' };
    expect(matchesTarget(target({ audience: 'plan', planSlugs: ['pro'] }), anon)).toBe(false);
    expect(matchesTarget(target({ audience: 'tenant', tenantIds: ['t1'] }), anon)).toBe(false);
  });

  it('applies platform and version on top of the audience', () => {
    expect(matchesTarget(target({ platforms: ['ios'] }), viewer)).toBe(false);
    expect(matchesTarget(target({ platforms: ['android'] }), viewer)).toBe(true);
    expect(matchesTarget(target({ audience: 'plan', planSlugs: ['pro'], maxVersion: '2.0.2' }), viewer)).toBe(false);
    expect(matchesTarget(target({ minVersion: '2.0.0', maxVersion: '2.0.3' }), viewer)).toBe(true);
    expect(matchesTarget(target({ platforms: ['android'] }), { version: '2.0.3' })).toBe(false);
  });
});

describe('isLive', () => {
  const now = new Date('2026-11-02T10:00:00Z');
  it('respects start and end', () => {
    expect(isLive(null, null, now)).toBe(true);
    expect(isLive(new Date('2026-11-03T00:00:00Z'), null, now)).toBe(false);
    expect(isLive(null, new Date('2026-11-02T10:00:00Z'), now)).toBe(false);
    expect(isLive(new Date('2026-11-01T00:00:00Z'), new Date('2026-11-05T00:00:00Z'), now)).toBe(true);
  });
});

describe('text helpers', () => {
  it('picks the language and falls back to English', () => {
    const t = { en: 'Hello', ur: 'سلام', roman: '' };
    expect(pickText(t, 'ur')).toBe('سلام');
    expect(pickText(t, 'roman')).toBe('Hello');
    expect(pickText(t, 'fr')).toBe('Hello');
    expect(pickText(null, 'en')).toBe('');
  });

  it('requires English and drops empty translations', () => {
    expect(sanitizeText({ en: '  Hi ', ur: ' ', roman: 'Salam', x: 'y' })).toEqual({ en: 'Hi', roman: 'Salam' });
    expect(sanitizeText({ ur: 'only urdu' })).toBeNull();
    expect(sanitizeText('plain', 3)).toEqual({ en: 'pla' });
  });
});

describe('sanitizeTarget', () => {
  it('keeps only the list that matches the audience', () => {
    expect(sanitizeTarget({ audience: 'industry', industries: ['grocery', 'grocery', ''], planSlugs: ['pro'] }))
      .toMatchObject({ audience: 'industry', industries: ['GROCERY'], planSlugs: [] });
  });

  it('falls back to all and drops bad platforms and versions', () => {
    expect(sanitizeTarget({ audience: 'everyone', platforms: ['ios', 'web'], minVersion: 'x', maxVersion: '2.1' }))
      .toEqual({ audience: 'all', planSlugs: [], industries: [], tenantIds: [], platforms: ['ios'], minVersion: null, maxVersion: '2.1' });
  });
});

describe('update prompts', () => {
  const config = sanitizeConfig({
    releases: {
      android: { latestVersion: '2.1.0', minVersion: '2.0.2' },
      ios: { latestVersion: '2.1.0', minVersion: null },
    },
  });

  it('forces below the minimum, suggests below the latest', () => {
    expect(updateStateFor(config, 'android', '2.0.1')).toBe('force');
    expect(updateStateFor(config, 'android', '2.0.2')).toBe('soft');
    expect(updateStateFor(config, 'android', '2.1.0')).toBe('none');
    expect(updateStateFor(config, 'ios', '1.0.0')).toBe('soft');
  });

  it('says nothing without a platform or version', () => {
    expect(updateStateFor(config, 'web', '1.0.0')).toBe('none');
    expect(updateStateFor(config, 'android', null)).toBe('none');
  });

  it('skips the soft prompt when it is turned off', () => {
    const off = sanitizeConfig({ releases: { android: { latestVersion: '3.0.0' }, softUpdate: { enabled: false } } });
    expect(updateStateFor(off, 'android', '2.0.0')).toBe('none');
  });
});

describe('sanitizeConfig', () => {
  it('fills defaults and keeps the store URL for Android', () => {
    const c = sanitizeConfig(null);
    expect(c.maintenance.enabled).toBe(false);
    expect(c.releases.android.storeUrl).toContain('com.nafaa.app');
    expect(c.releases.forceUpdate.title.en).toBeTruthy();
  });

  it('drops unknown flags and keeps known ones; missing flags resolve to on', () => {
    const c = sanitizeConfig({ flags: { 'feature.ai': false, 'evil.flag': false, 'module.pos': 'no' } });
    expect(c.flags).toEqual({ 'feature.ai': false });
    const flags = resolveFlags(c);
    expect(flags['feature.ai']).toBe(false);
    expect(flags['module.pos']).toBe(true);
    expect(Object.keys(flags)).toEqual(FLAG_KEYS);
  });

  it('rejects non-https store links and sorts release notes newest first', () => {
    const c = sanitizeConfig({
      releases: {
        ios: { storeUrl: 'http://example.com' },
        notes: [
          { version: '2.0.1', text: { en: 'Fixes' } },
          { version: '2.1.0', text: { en: 'New POS' }, platform: 'ios' },
          { version: 'bad', text: { en: 'x' } },
        ],
      },
    });
    expect(c.releases.ios.storeUrl).toBeNull();
    expect(c.releases.notes.map((n) => n.version)).toEqual(['2.1.0', '2.0.1']);
  });

  it('keeps only valid maintenance platforms', () => {
    expect(sanitizeConfig({ maintenance: { enabled: true, platforms: ['ios', 'web'] } }).maintenance.platforms).toEqual(['ios']);
  });
});
