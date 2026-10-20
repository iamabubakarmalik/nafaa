import { CMS_ENTRY_TYPES, CMS_PERMISSIONS, ENTRY_TYPE_META } from '../contract/cms-contract';
import {
  MARKETING_PERMISSIONS,
  MARKETING_ROLE_PERMISSIONS,
  hasMarketingPermission,
} from '../../_shared/constants/marketing-permissions.constants';
import {
  absoluteUrl,
  computeEntryPath,
  descendantPaths,
  localizedPath,
  resolveSiteUrl,
  slugCandidate,
  slugify,
  typeHubPath,
  type PathParent,
} from './cms-paths';

const page = (id: string, path: string, slug = path.split('/').pop() ?? ''): PathParent => ({ id, type: 'PAGE', locale: 'en', slug, path });

describe('computeEntryPath', () => {
  it('builds prefixed paths for every fixed-prefix type', () => {
    for (const type of CMS_ENTRY_TYPES) {
      const prefix = ENTRY_TYPE_META[type].prefix;
      if (prefix === null) continue;
      expect(computeEntryPath({ type, locale: 'en', slug: 'abc', parent: null })).toEqual({ ok: true, path: `/${prefix}/abc` });
    }
  });

  it('keeps existing industry slugs and the blog category prefix', () => {
    expect(computeEntryPath({ type: 'INDUSTRY', locale: 'en', slug: 'kiryana', parent: null })).toEqual({ ok: true, path: '/industries/kiryana' });
    expect(computeEntryPath({ type: 'BLOG_CATEGORY', locale: 'en', slug: 'tax', parent: null })).toEqual({ ok: true, path: '/blog/category/tax' });
  });

  it('handles the home page, hubs and nested pages', () => {
    expect(computeEntryPath({ type: 'PAGE', locale: 'en', slug: '', parent: null })).toEqual({ ok: true, path: '/' });
    expect(computeEntryPath({ type: 'PAGE', locale: 'en', slug: 'industries', parent: null })).toEqual({ ok: true, path: '/industries' });
    expect(computeEntryPath({ type: 'PAGE', locale: 'en', slug: 'privacy', parent: page('l', '/legal') })).toEqual({ ok: true, path: '/legal/privacy' });
    expect(computeEntryPath({ type: 'PAGE', locale: 'en', slug: 'about', parent: page('h', '/', '') })).toEqual({ ok: true, path: '/about' });
  });

  it('rejects reserved and type-owned PAGE paths', () => {
    for (const slug of ['api', 'ur', 'sitemaps', 'indexnow', 'developers']) {
      const r = computeEntryPath({ type: 'PAGE', locale: 'en', slug, parent: null });
      expect(r.ok).toBe(false);
    }
    const nested = computeEntryPath({ type: 'PAGE', locale: 'en', slug: 'kiryana', parent: page('i', '/industries') });
    expect(nested).toEqual({ ok: false, problems: [expect.objectContaining({ code: 'PATH_RESERVED' })] });
  });

  it('builds DOC paths under /developers', () => {
    const root: PathParent = { id: 'r', type: 'DOC', locale: 'en', slug: '', path: '/developers' };
    expect(computeEntryPath({ type: 'DOC', locale: 'en', slug: '', parent: null })).toEqual({ ok: true, path: '/developers' });
    expect(computeEntryPath({ type: 'DOC', locale: 'en', slug: 'auth', parent: root })).toEqual({ ok: true, path: '/developers/auth' });
    expect(computeEntryPath({ type: 'DOC', locale: 'en', slug: 'auth', parent: null })).toEqual({ ok: true, path: '/developers/auth' });
    expect(computeEntryPath({ type: 'DOC', locale: 'en', slug: '', parent: root }).ok).toBe(false);
  });

  it('puts CITY_INDUSTRY under its CITY and requires that parent', () => {
    const city: PathParent = { id: 'c', type: 'CITY', locale: 'en', slug: 'lahore', path: '/pos-software/lahore' };
    expect(computeEntryPath({ type: 'CITY_INDUSTRY', locale: 'en', slug: 'pharmacy', parent: city })).toEqual({ ok: true, path: '/pos-software/lahore/pharmacy' });
    expect(computeEntryPath({ type: 'CITY_INDUSTRY', locale: 'en', slug: 'pharmacy', parent: null })).toEqual({ ok: false, problems: [expect.objectContaining({ code: 'PARENT_REQUIRED' })] });
    expect(computeEntryPath({ type: 'CITY_INDUSTRY', locale: 'en', slug: 'pharmacy', parent: page('p', '/x') })).toEqual({ ok: false, problems: [expect.objectContaining({ code: 'PARENT_TYPE' })] });
  });

  it('rejects parents on flat types, mixed locales and bad slugs', () => {
    expect(computeEntryPath({ type: 'INDUSTRY', locale: 'en', slug: 'abc', parent: page('p', '/x') })).toEqual({ ok: false, problems: [expect.objectContaining({ code: 'PARENT_NOT_ALLOWED' })] });
    expect(computeEntryPath({ type: 'PAGE', locale: 'ur', slug: 'abc', parent: page('p', '/x') })).toEqual({ ok: false, problems: [expect.objectContaining({ code: 'PARENT_LOCALE' })] });
    for (const slug of ['A', 'a', 'a--b', '-ab', 'ab-', 'a_b', 'a'.repeat(81)]) {
      expect(computeEntryPath({ type: 'PRODUCT', locale: 'en', slug, parent: null }).ok).toBe(false);
    }
    expect(computeEntryPath({ type: 'PRODUCT', locale: 'en', slug: '', parent: null })).toEqual({ ok: false, problems: [expect.objectContaining({ code: 'SLUG_EMPTY_NOT_ALLOWED' })] });
  });
});

describe('slugs', () => {
  it('slugifies titles', () => {
    expect(slugify('POS Software for Kiryana & General Stores')).toBe('pos-software-for-kiryana-and-general-stores');
    expect(slugify("Nafaa's Café — Lahore")).toBe('nafaas-cafe-lahore');
    expect(slugify('  ')).toBe('');
    expect(slugify('نفع')).toBe('');
    const long = slugify('word '.repeat(40));
    expect(long.length).toBeLessThanOrEqual(80);
    expect(long.endsWith('-')).toBe(false);
  });

  it('numbers candidates within the length limit', () => {
    expect(slugCandidate('pos', 1)).toBe('pos');
    expect(slugCandidate('pos', 3)).toBe('pos-3');
    expect(slugCandidate('a'.repeat(80), 12)).toHaveLength(80);
  });
});

describe('locale and URLs', () => {
  it('prefixes non-default locales', () => {
    expect(localizedPath('en', '/pricing')).toBe('/pricing');
    expect(localizedPath('ur', '/pricing')).toBe('/ur/pricing');
    expect(localizedPath('ur', '/')).toBe('/ur');
    expect(absoluteUrl('https://nafaa.pk/', 'ur', '/blog/x')).toBe('https://nafaa.pk/ur/blog/x');
    expect(absoluteUrl('https://nafaa.pk', 'en', '/')).toBe('https://nafaa.pk/');
  });

  it('prefers the env site URL, then settings', () => {
    expect(resolveSiteUrl('https://site-staging.nafaa.pk/', 'https://nafaa.pk')).toBe('https://site-staging.nafaa.pk');
    expect(resolveSiteUrl(undefined, 'https://nafaa.pk/')).toBe('https://nafaa.pk');
    expect(resolveSiteUrl('', null)).toBe('https://nafaa.pk');
  });

  it('maps types to hub paths', () => {
    expect(typeHubPath('INDUSTRY')).toBe('/industries');
    expect(typeHubPath('BLOG_CATEGORY')).toBe('/blog');
    expect(typeHubPath('CITY_INDUSTRY')).toBe('/pos-software');
    expect(typeHubPath('DOC')).toBe('/developers');
    expect(typeHubPath('PAGE')).toBeNull();
  });
});

describe('descendantPaths', () => {
  it('rebuilds a subtree under a moved root and skips unchanged rows', () => {
    const rows = [
      { id: 'a', parentId: 'root', slug: 'privacy', path: '/legal/privacy' },
      { id: 'b', parentId: 'a', slug: 'cookies', path: '/legal/privacy/cookies' },
      { id: 'c', parentId: 'root', slug: 'terms', path: '/policies/terms' },
    ];
    expect(descendantPaths('root', '/policies', rows)).toEqual([
      { id: 'a', path: '/policies/privacy' },
      { id: 'b', path: '/policies/privacy/cookies' },
    ]);
  });
});

describe('CMS permissions', () => {
  it('match the contract values', () => {
    expect(MARKETING_PERMISSIONS.CMS_VIEW).toBe(CMS_PERMISSIONS.CMS_VIEW);
    expect(MARKETING_PERMISSIONS.CMS_EDIT).toBe(CMS_PERMISSIONS.CMS_EDIT);
    expect(MARKETING_PERMISSIONS.CMS_PUBLISH).toBe(CMS_PERMISSIONS.CMS_PUBLISH);
    expect(MARKETING_PERMISSIONS.CMS_REDIRECTS).toBe(CMS_PERMISSIONS.CMS_REDIRECTS);
    expect(MARKETING_PERMISSIONS.CMS_SETTINGS).toBe(CMS_PERMISSIONS.CMS_SETTINGS);
  });

  it('give each role the ARCH 13 defaults', () => {
    const cms = (role: string) => (MARKETING_ROLE_PERMISSIONS[role] ?? []).filter((p) => p.startsWith('marketing.cms.')).sort();
    expect(cms('SUPER')).toEqual(Object.values(CMS_PERMISSIONS).sort());
    expect(cms('MARKETING_MANAGER')).toEqual(['marketing.cms.edit', 'marketing.cms.publish', 'marketing.cms.redirects', 'marketing.cms.view']);
    expect(cms('CONTENT')).toEqual(['marketing.cms.edit', 'marketing.cms.view']);
    expect(cms('ANALYST')).toEqual(['marketing.cms.view']);
    expect(cms('AGENT')).toEqual([]);
  });

  it('lets a custom grant add a permission the role lacks', () => {
    expect(hasMarketingPermission('CONTENT', [], MARKETING_PERMISSIONS.CMS_PUBLISH)).toBe(false);
    expect(hasMarketingPermission('CONTENT', ['marketing.cms.publish'], MARKETING_PERMISSIONS.CMS_PUBLISH)).toBe(true);
  });
});
