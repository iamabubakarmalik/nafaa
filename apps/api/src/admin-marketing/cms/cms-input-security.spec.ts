/**
 * Input validation that keeps CMS content safe to render (security review,
 * ARCH 15 A4): link and URL fields cannot carry script URLs or leave the
 * site by accident, public query parameters are bounded, and Markdown is
 * treated as text by everything the API produces.
 */
import {
  ctaSchema,
  hrefSchema,
  httpUrlSchema,
  isValidHref,
  publicEntriesQuerySchema,
  publicEntryQuerySchema,
  publicPreviewQuerySchema,
  publicTestimonialsQuerySchema,
  redirectHitBodySchema,
  redirectTargetSchema,
  revalidateRequestSchema,
  siteSettingsSchema,
  sitePathSchema,
} from './contract/cms-contract';
import { markdownToPlainText } from './content/markdown';
import { resolveTokensInText } from './content/tokens';
import { tokenContext } from '../../../test/cms/fixtures';

describe('href fields (CTA links, menu links, featuresGrid hrefs)', () => {
  it('accept the documented forms', () => {
    for (const ok of ['/pricing', '/blog/x?utm=a#top', '#faq', 'https://nafaa.pk/x', 'http://example.com', 'mailto:hello@nafaa.pk', 'tel:+92-300-1234567', 'entry:abc123', 'entry:abc123#faq', 'signup', 'demo', 'whatsapp']) {
      expect(isValidHref(ok)).toBe(true);
    }
  });

  it('reject script and data URLs in any case, protocol-relative URLs and whitespace', () => {
    for (const bad of [
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      ' javascript:alert(1)',
      'data:text/html;base64,PHNjcmlwdD4=',
      'vbscript:msgbox(1)',
      '//evil.example',
      '/x y',
      'https://evil.example/\nx',
      'https://',
      'ftp://example.com/x',
      'entry:../../x',
      '#Not-An-Anchor',
      'mailto:a@b@c',
      'tel:12',
      '',
    ]) {
      expect(isValidHref(bad)).toBe(false);
    }
    expect(ctaSchema.safeParse({ label: 'Go', href: 'javascript:alert(1)' }).success).toBe(false);
    // hrefSchema trims first, so a leading space does not smuggle a scheme in.
    expect(hrefSchema.safeParse(' javascript:alert(1)').success).toBe(false);
  });

  /**
   * Finding (contract owner): "/\evil.example" passes because only a leading
   * "//" is refused, and browsers read "/\" as "//". Admin-only input, low
   * severity. Flip to `it` once isValidHref refuses a backslash.
   */
  it.failing('reject "/\\host" (browsers treat it as protocol-relative)', () => {
    expect(isValidHref('/\\evil.example')).toBe(false);
  });

  it('http(s) URL fields refuse other schemes', () => {
    for (const bad of ['javascript:alert(1)', 'data:,x', 'file:///etc/passwd', '//evil.example']) {
      expect(httpUrlSchema.safeParse(bad).success).toBe(false);
    }
    const site = {
      name: 'Nafaa', baseUrl: 'https://nafaa.pk', appUrl: 'https://app.nafaa.pk', signupUrl: 'javascript:alert(1)', demoPath: '/demo', locales: ['en'], whatsapp: null,
    };
    expect(siteSettingsSchema.safeParse(site).success).toBe(false);
    expect(siteSettingsSchema.safeParse({ ...site, signupUrl: 'https://app.nafaa.pk/signup', demoPath: 'https://evil.example' }).success).toBe(false);
  });

  it('unpublish/archive redirect targets are site paths or entry links only', () => {
    expect(redirectTargetSchema.safeParse('/pricing').success).toBe(true);
    expect(redirectTargetSchema.safeParse('entry:abc').success).toBe(true);
    for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', '/a/../b', 'javascript:alert(1)']) {
      expect(redirectTargetSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe('public query bounds', () => {
  it('paths are lowercase slug paths: no traversal, encoding, dots or backslashes', () => {
    for (const bad of ['/../admin', '/a/./b', '/a%2Fb', '/A', '/a//b', '/a\\b', '/a/', 'a', '/a?b', `/${'a'.repeat(600)}`]) {
      expect(sitePathSchema.safeParse(bad).success).toBe(false);
      expect(publicEntryQuerySchema.safeParse({ path: bad }).success).toBe(false);
    }
    expect(publicEntryQuerySchema.safeParse({ path: '/pos-software/lahore' }).success).toBe(true);
  });

  it('locales are two letters', () => {
    expect(publicEntryQuerySchema.safeParse({ path: '/', locale: 'en' }).success).toBe(true);
    for (const bad of ['EN', 'eng', 'e', '../', "en' OR 1=1"]) {
      expect(publicEntryQuerySchema.safeParse({ path: '/', locale: bad }).success).toBe(false);
    }
  });

  it('list limits, ids and statuses are bounded', () => {
    expect(publicEntriesQuerySchema.safeParse({ type: 'INDUSTRY', limit: '100000' }).success).toBe(false);
    expect(publicEntriesQuerySchema.safeParse({ type: 'NOT_A_TYPE' }).success).toBe(false);
    expect(publicEntriesQuerySchema.safeParse({ type: 'INDUSTRY', status: 'planned' }).success).toBe(false);
    expect(publicEntriesQuerySchema.safeParse({ type: 'INDUSTRY', tag: 'x'.repeat(65) }).success).toBe(false);
    expect(publicTestimonialsQuerySchema.safeParse({ ids: Array.from({ length: 200 }, (_, i) => `t${i}`).join(',') }).success).toBe(false);
    expect(redirectHitBodySchema.safeParse({ id: { $gt: '' } }).success).toBe(false);
  });

  it('preview needs a token of sane length and a site path', () => {
    expect(publicPreviewQuerySchema.safeParse({ token: 'short' }).success).toBe(false);
    expect(publicPreviewQuerySchema.safeParse({ token: 'x'.repeat(5000) }).success).toBe(false);
    expect(publicPreviewQuerySchema.safeParse({ token: 'x'.repeat(40), path: 'https://evil.example' }).success).toBe(false);
  });

  it('revalidation bodies need a non-empty tag list of bounded strings', () => {
    expect(revalidateRequestSchema.safeParse({ tags: [], reason: 'publish' }).success).toBe(false);
    expect(revalidateRequestSchema.safeParse({ tags: ['x'.repeat(300)], reason: 'publish' }).success).toBe(false);
    expect(revalidateRequestSchema.safeParse({ tags: ['all'], reason: 'nope' }).success).toBe(false);
  });
});

describe('text the API derives from Markdown', () => {
  it('plain text drops raw HTML tags (meta descriptions, llms.txt, JSON-LD)', () => {
    const text = markdownToPlainText('Hello <script>alert(1)</script> <img src=x onerror=alert(1)> **bold**');
    expect(text).not.toMatch(/<\s*script|<\s*img|onerror=/i);
    expect(text).toContain('Hello');
    expect(text).toContain('bold');
  });

  it('token values are inserted as text and an unknown token never echoes markup', () => {
    const { text } = resolveTokensInText('{{fact:<script>}} {{price:basic.monthly}}', tokenContext, 'remove');
    expect(text).not.toContain('<script>');
    expect(text).toContain('Rs 1,500');
  });
});
