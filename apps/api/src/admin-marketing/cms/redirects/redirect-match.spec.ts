/**
 * Redirect rules (API-CONTRACT 8.5, ARCH 7.5): matching order, parameters,
 * 410s, chain following and loop detection, CSV parsing, and targets that
 * must never leave the site unless the rule says so.
 */
import { createRedirectBodySchema, redirectImportBodySchema } from '../contract/cms-contract';
import { splitLocalePath } from './cms-redirects.service';
import { RedirectMatcher, csvCell, looksLikePattern, normalizeRedirectPath, parseRedirectCsv, type RedirectRule } from './redirect-match';

let seq = 0;
function rule(fromPath: string, toPath: string | null, statusCode = 301): RedirectRule {
  seq += 1;
  return { id: `r${seq}`, fromPath, toPath, statusCode, isPattern: looksLikePattern(fromPath) };
}

describe('normalizeRedirectPath', () => {
  it('drops query, hash, duplicate and trailing slashes, and the origin', () => {
    expect(normalizeRedirectPath(' /a/b/?x=1#y ')).toBe('/a/b');
    expect(normalizeRedirectPath('a//b///')).toBe('/a/b');
    expect(normalizeRedirectPath('https://nafaa.pk/old?q')).toBe('/old');
    expect(normalizeRedirectPath('/')).toBe('/');
    expect(normalizeRedirectPath('')).toBe('/');
  });

  it('never yields a protocol-relative path', () => {
    for (const p of ['//evil.example', '///evil.example/x', 'https://nafaa.pk//evil.example']) {
      expect(normalizeRedirectPath(p).startsWith('//')).toBe(false);
    }
  });
});

describe('RedirectMatcher', () => {
  it('exact rules win over patterns, longer patterns win over shorter ones', () => {
    const m = new RedirectMatcher([
      rule('/lahore/*', '/pos-software/lahore'),
      rule('/lahore/:industry', '/pos-software/lahore/:industry'),
      rule('/lahore/pharmacy', '/pos-software/lahore/pharmacy-special'),
    ]);
    expect(m.match('/lahore/pharmacy')?.target).toBe('/pos-software/lahore/pharmacy-special');
    expect(m.match('/lahore/bakery')?.target).toBe('/pos-software/lahore/bakery');
    expect(m.match('/lahore/bakery/extra')?.target).toBe('/pos-software/lahore');
    expect(m.match('/karachi/bakery')).toBeNull();
  });

  it('fills :params and the * rest, ignoring query and trailing slash on the request', () => {
    const m = new RedirectMatcher([rule('/old-blog/:slug', '/blog/:slug'), rule('/docs/*', '/developers/*')]);
    expect(m.match('/old-blog/fbr-guide/?utm=x')?.target).toBe('/blog/fbr-guide');
    expect(m.match('/docs/api/v1')?.target).toBe('/developers/api/v1');
    expect(m.match('/docs')?.target).toBe('/developers');
  });

  it('410 rules match with no target', () => {
    const m = new RedirectMatcher([rule('/gone', null, 410), rule('/gone-all/*', null, 410)]);
    expect(m.match('/gone')).toEqual({ rule: expect.objectContaining({ statusCode: 410 }), target: null });
    expect(m.match('/gone-all/a/b')?.target).toBeNull();
  });

  it('keeps absolute targets as given (only an admin with the redirects permission can set them)', () => {
    const m = new RedirectMatcher([rule('/app', 'https://app.nafaa.pk/login')]);
    expect(m.match('/app')?.target).toBe('https://app.nafaa.pk/login');
  });

  it('a pattern rest cannot turn a site target into a protocol-relative URL', () => {
    const m = new RedirectMatcher([rule('/en/*', '/*'), rule('/x/:p', '/:p')]);
    for (const path of ['/en//evil.example', '/en/%2F%2Fevil.example', '/x/evil.example']) {
      const target = m.match(path)?.target ?? '/';
      expect(target.startsWith('//')).toBe(false);
    }
  });

  /**
   * Security review finding (A2 / S1): a backslash in a :param or * value is
   * passed through, so `/en/*` -> `/*` turns `/en/\evil.example` into
   * `/\evil.example`, which browsers follow as `//evil.example`. The site
   * resolver (apps/site/src/lib/cms/redirects.ts) has the same gap. This test
   * documents it and will start failing (and should become a normal `it`)
   * once matched values are sanitised.
   */
  it.failing('a backslash in a matched value never yields a target browsers read as another host', () => {
    const m = new RedirectMatcher([rule('/en/*', '/*'), rule('/x/:p', '/:p')]);
    for (const path of ['/en/\\evil.example', '/x/\\evil.example']) {
      const target = m.match(path)?.target ?? '/';
      expect(/^[/\\]{2}/.test(target)).toBe(false);
    }
  });

  it('follows chains to the final path and reports loops', () => {
    const chain = new RedirectMatcher([rule('/a', '/b'), rule('/b', '/c')]);
    expect(chain.follow('/a')).toMatchObject({ hops: ['/b', '/c'], finalPath: '/c', loop: false });

    const loop = new RedirectMatcher([rule('/a', '/b'), rule('/b', '/a')]);
    expect(loop.follow('/a')).toMatchObject({ loop: true });

    const self = new RedirectMatcher([rule('/p/:x', '/p/:x')]);
    expect(self.follow('/p/1').loop).toBe(true);

    const gone = new RedirectMatcher([rule('/a', '/b'), rule('/b', null, 410)]);
    expect(gone.follow('/a')).toMatchObject({ finalPath: null, loop: false });

    const external = new RedirectMatcher([rule('/a', 'https://example.com/x')]);
    expect(external.follow('/a')).toMatchObject({ finalPath: 'https://example.com/x', loop: false });
  });

  it('stops after maxHops on a long chain and calls it a loop', () => {
    const rules = Array.from({ length: 20 }, (_, i) => rule(`/s${i}`, `/s${i + 1}`));
    expect(new RedirectMatcher(rules).follow('/s0', 10)).toMatchObject({ loop: true });
  });

  it('treats regex characters in from paths literally', () => {
    const m = new RedirectMatcher([rule('/a.b/:x', '/ok/:x')]);
    expect(m.match('/aXb/1')).toBeNull();
    expect(m.match('/a.b/1')?.target).toBe('/ok/1');
  });
});

describe('redirect CSV', () => {
  it('parses quotes, CRLF, an optional header and blank lines', () => {
    const csv = 'from,to,status,note\r\n/a,/b,301,"moved, again"\r\n\r\n"/q""x",,410,\n/c,/d';
    expect(parseRedirectCsv(csv)).toEqual([
      { from: '/a', to: '/b', status: '301', note: 'moved, again' },
      { from: '/q"x', status: '410' },
      { from: '/c', to: '/d' },
    ]);
  });

  it('quotes cells that need it on export', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell(null)).toBe('');
    expect(csvCell(301)).toBe('301');
  });

  it('caps import size and status codes', () => {
    expect(redirectImportBodySchema.safeParse({ rows: [] }).success).toBe(false);
    expect(redirectImportBodySchema.safeParse({ rows: [{ from: '/a', to: '/b', status: '307' }] }).success).toBe(false);
    expect(redirectImportBodySchema.safeParse({ rows: Array.from({ length: 5001 }, () => ({ from: '/a' })) }).success).toBe(false);
  });
});

describe('redirect bodies', () => {
  it('requires a target for 301/302 and none for 410', () => {
    expect(createRedirectBodySchema.safeParse({ fromPath: '/a', statusCode: 301 }).success).toBe(false);
    expect(createRedirectBodySchema.safeParse({ fromPath: '/a', toPath: '/b', statusCode: 410 }).success).toBe(false);
    expect(createRedirectBodySchema.safeParse({ fromPath: '/a', statusCode: 410 }).success).toBe(true);
  });

  it('from paths must be site paths without query, hash or a mid-path *', () => {
    for (const bad of ['a', 'https://x.com/a', '/a?b=1', '/a#b', '/a/*/b', '/a b']) {
      expect(createRedirectBodySchema.safeParse({ fromPath: bad, toPath: '/b', statusCode: 301 }).success).toBe(false);
    }
  });
});

describe('splitLocalePath', () => {
  it('splits only known locale prefixes', () => {
    expect(splitLocalePath('/ur/pricing')).toEqual({ locale: 'ur', path: '/pricing' });
    expect(splitLocalePath('/pricing')).toEqual({ locale: 'en', path: '/pricing' });
    expect(splitLocalePath('/ur')).toEqual({ locale: 'ur', path: '/' });
  });
});
