/**
 * Loads and validates the capture manifest (see ../README.md for the format).
 *
 * Alt text and tags are checked with the same rules the media upload endpoint
 * applies (`altTextSchema`, `mediaTagSchema` from the CMS contract), so a shot
 * that would be rejected at upload fails here, before any browser starts.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const DEVICES = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, isMobile: false, hasTouch: false },
  laptop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, isMobile: false, hasTouch: false },
  tablet: { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2, isMobile: false, hasTouch: true },
  phone: {
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
  },
};

/** Frames the site renders (contract FRAMES); recorded so editors pick the right one. */
const FRAMES = new Set(['browser', 'phone', 'tablet', 'desktop', 'receipt', 'none']);
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}$/;
const APP_PATH_PATTERN = /^\/[A-Za-z0-9/_{}.?=&%-]*$/;
const ACTION_KEYS = new Set(['click', 'fill', 'press', 'wait', 'waitFor', 'scroll', 'hover']);

/** Imports the CMS contract copy in apps/site (Node strips its TypeScript types). */
export async function loadContract(siteRoot) {
  const file = path.join(siteRoot, 'src/lib/cms/contract/cms-contract.ts');
  try {
    return await import(pathToFileURL(file).href);
  } catch (error) {
    throw new Error(
      `Could not load the CMS contract (${file}). It needs Node 22.18+ (TypeScript type stripping) and ` +
        `apps/site dependencies installed (zod). Cause: ${error.message}`,
    );
  }
}

/**
 * Returns `{ manifest, problems }`. `problems` lists every invalid field; the
 * caller stops when it is not empty.
 */
export async function loadManifest(file, contract) {
  const manifest = JSON.parse(await readFile(file, 'utf8'));
  const problems = [];
  const defaults = manifest.defaults ?? {};
  const accounts = manifest.accounts ?? {};
  const seen = new Set();

  if (manifest.version !== 1) problems.push('version: expected 1');
  if (!Array.isArray(manifest.shots) || manifest.shots.length === 0) problems.push('shots: at least one shot is required');

  for (const [key, account] of Object.entries(accounts)) {
    if (!account.emailEnv || !account.passwordEnv) problems.push(`accounts.${key}: emailEnv and passwordEnv are required`);
  }

  for (const [index, shot] of (manifest.shots ?? []).entries()) {
    const where = `shots[${index}]${shot?.id ? ` (${shot.id})` : ''}`;
    if (!shot || typeof shot !== 'object') {
      problems.push(`${where}: must be an object`);
      continue;
    }
    if (!ID_PATTERN.test(shot.id ?? '')) problems.push(`${where}.id: lower-case letters, digits and hyphens`);
    if (seen.has(shot.id)) problems.push(`${where}.id: duplicate`);
    seen.add(shot.id);

    if (typeof shot.path !== 'string' || !APP_PATH_PATTERN.test(shot.path)) problems.push(`${where}.path: an app path such as /pos`);
    if (shot.path?.includes('{') && !shot.resolve) problems.push(`${where}.resolve: required when path has a {param}`);
    if (shot.resolve && (typeof shot.resolve.api !== 'string' || !shot.resolve.api.startsWith('/') || !shot.resolve.param)) {
      problems.push(`${where}.resolve: { api: "/endpoint", param: "id" }`);
    }
    if (shot.account !== null && shot.account !== undefined && !accounts[shot.account]) {
      problems.push(`${where}.account: "${shot.account}" is not in accounts`);
    }
    if (shot.resolve && !shot.account) problems.push(`${where}.account: resolve needs a signed-in account`);

    const device = shot.device ?? defaults.device ?? 'desktop';
    if (!DEVICES[device]) problems.push(`${where}.device: one of ${Object.keys(DEVICES).join(', ')}`);
    if (shot.frame !== undefined && !FRAMES.has(shot.frame)) problems.push(`${where}.frame: one of ${[...FRAMES].join(', ')}`);

    const alt = contract.altTextSchema.safeParse(shot.alt ?? '');
    if (!alt.success) {
      problems.push(`${where}.alt: required, ${contract.MEDIA_LIMITS.altMin}-${contract.MEDIA_LIMITS.altMax} characters (a screenshot without alt text is never uploaded)`);
    }
    if (shot.caption !== undefined && (typeof shot.caption !== 'string' || shot.caption.length > 300)) {
      problems.push(`${where}.caption: up to 300 characters`);
    }
    if (!Array.isArray(shot.tags)) {
      problems.push(`${where}.tags: an array such as ["industry:bakery", "feature:pos"]`);
    } else {
      for (const tag of shot.tags) {
        if (!contract.mediaTagSchema.safeParse(tag).success) problems.push(`${where}.tags: "${tag}" is not a valid media tag`);
      }
      if (!shot.tags.some((tag) => tag.startsWith('feature:'))) problems.push(`${where}.tags: needs a feature:<key> tag`);
    }
    if (shot.mediaId !== undefined && shot.mediaId !== null && !contract.ID_PATTERN.test(shot.mediaId)) {
      problems.push(`${where}.mediaId: a media id or null`);
    }
    for (const [actionIndex, action] of (shot.actions ?? []).entries()) {
      const keys = Object.keys(action ?? {});
      if (keys.length !== 1 || !ACTION_KEYS.has(keys[0])) {
        problems.push(`${where}.actions[${actionIndex}]: one of ${[...ACTION_KEYS].join(', ')}`);
      }
    }
  }

  return { manifest, problems };
}

/** Resolved settings for one shot (defaults applied). */
export function shotSettings(manifest, shot) {
  const defaults = manifest.defaults ?? {};
  return {
    device: shot.device ?? defaults.device ?? 'desktop',
    locale: shot.locale ?? defaults.locale ?? 'en',
    waitMs: shot.waitMs ?? defaults.waitMs ?? 800,
    hide: [...(defaults.hide ?? []), ...(shot.hide ?? [])],
    frame: shot.frame ?? 'browser',
    fullPage: shot.fullPage === true,
  };
}
