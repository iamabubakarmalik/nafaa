/**
 * Path and slug rules for CMS entries (ARCH 5.2, API-CONTRACT 8.1).
 *
 * Pure functions only: no database access. `CmsPathService` loads the parent
 * chain and checks uniqueness, then calls `computeEntryPath`.
 *
 * Paths never include the locale prefix. `localizedPath` and `absoluteUrl`
 * add it for responses.
 */
import {
  DEFAULT_LOCALE,
  DOC_ROOT_PATH,
  ENTRY_TYPE_META,
  SITE_PATH_PATTERN,
  SLUG_MAX,
  SLUG_MIN,
  SLUG_PATTERN,
  isPagePathAllowed,
  type CmsEntryType,
} from '../contract/cms-contract';

/** Longest stored path (matches `sitePathSchema`). */
export const PATH_MAX = 512;

/** Fallback for `absoluteUrl` when neither the env var nor settings give a site URL. */
export const DEFAULT_SITE_URL = 'https://nafaa.pk';

/** The parent row as `computeEntryPath` needs it. */
export interface PathParent {
  id: string;
  type: CmsEntryType;
  locale: string;
  slug: string;
  /** The parent's current (draft) path. */
  path: string;
}

export interface PathInput {
  type: CmsEntryType;
  locale: string;
  slug: string;
  parent: PathParent | null;
}

export type PathProblemCode =
  | 'SLUG_FORMAT'
  | 'SLUG_EMPTY_NOT_ALLOWED'
  | 'PARENT_REQUIRED'
  | 'PARENT_NOT_ALLOWED'
  | 'PARENT_TYPE'
  | 'PARENT_LOCALE'
  | 'PARENT_CYCLE'
  | 'PARENT_NOT_FOUND'
  | 'PATH_RESERVED'
  | 'PATH_FORMAT'
  | 'PATH_TAKEN';

export interface PathProblem {
  code: PathProblemCode;
  field: 'slug' | 'parentId';
  /** Roman Urdu with English terms; the admin shows it as is. */
  message: string;
}

export type PathResult = { ok: true; path: string } | { ok: false; problems: PathProblem[] };

/** The parent type an entry type accepts, or null when it takes no parent. */
export function allowedParentType(type: CmsEntryType): CmsEntryType | null {
  if (type === 'PAGE') return 'PAGE';
  return ENTRY_TYPE_META[type].parentType;
}

/** True when the type must have a parent (CITY_INDUSTRY). */
export function parentRequired(type: CmsEntryType): boolean {
  return type === 'CITY_INDUSTRY';
}

/** `""` is the PAGE home and the DOC root; both sit at the top of their tree. */
export function emptySlugAllowed(type: CmsEntryType, hasParent: boolean): boolean {
  return (type === 'PAGE' || type === 'DOC') && !hasParent;
}

/** Checks a slug on its own (format and length). `""` is handled by `emptySlugAllowed`. */
export function isValidSlug(slug: string): boolean {
  return slug.length >= SLUG_MIN && slug.length <= SLUG_MAX && SLUG_PATTERN.test(slug);
}

function joinPath(base: string, slug: string): string {
  return base === '/' ? `/${slug}` : `${base}/${slug}`;
}

/**
 * Computes the public path for an entry, or the reasons it cannot have one.
 * The parent's own path is trusted (it was computed by this function when the
 * parent was saved).
 */
export function computeEntryPath(input: PathInput): PathResult {
  const { type, slug, parent } = input;
  const problems: PathProblem[] = [];
  const meta = ENTRY_TYPE_META[type];

  if (slug === '') {
    if (!emptySlugAllowed(type, parent !== null)) {
      problems.push({
        code: 'SLUG_EMPTY_NOT_ALLOWED',
        field: 'slug',
        message: 'Slug khali sirf Home page aur Developer docs ke root ka ho sakta hai',
      });
    }
  } else if (!isValidSlug(slug)) {
    problems.push({
      code: 'SLUG_FORMAT',
      field: 'slug',
      message: `Slug ${SLUG_MIN}-${SLUG_MAX} huroof ka ho: sirf a-z, 0-9 aur beech me ek hyphen (-)`,
    });
  }

  const parentType = allowedParentType(type);
  if (parent === null) {
    if (parentRequired(type)) {
      problems.push({
        code: 'PARENT_REQUIRED',
        field: 'parentId',
        message: `${meta.label} ke liye parent ${parentType ? ENTRY_TYPE_META[parentType].label : ''} zaroori hai`,
      });
    }
  } else {
    if (parentType === null) {
      problems.push({ code: 'PARENT_NOT_ALLOWED', field: 'parentId', message: `${meta.label} ka parent nahi ho sakta` });
    } else if (parent.type !== parentType) {
      problems.push({
        code: 'PARENT_TYPE',
        field: 'parentId',
        message: `${meta.label} ka parent sirf ${ENTRY_TYPE_META[parentType].label} ho sakta hai`,
      });
    }
    if (parent.locale !== input.locale) {
      problems.push({ code: 'PARENT_LOCALE', field: 'parentId', message: 'Parent ki language (locale) alag hai' });
    }
  }

  if (problems.length > 0) return { ok: false, problems };

  let path: string;
  if (type === 'PAGE') {
    path = slug === '' ? '/' : joinPath(parent ? parent.path : '/', slug);
  } else if (type === 'DOC') {
    path = slug === '' ? DOC_ROOT_PATH : joinPath(parent ? parent.path : DOC_ROOT_PATH, slug);
  } else if (meta.prefix !== null) {
    path = `/${meta.prefix}/${slug}`;
  } else {
    // CITY_INDUSTRY: under the parent CITY's path.
    path = joinPath((parent as PathParent).path, slug);
  }

  if (path.length > PATH_MAX || !SITE_PATH_PATTERN.test(path)) {
    return { ok: false, problems: [{ code: 'PATH_FORMAT', field: 'slug', message: `Path theek nahi ya bohat lamba hai: ${path}` }] };
  }
  if (type === 'PAGE' && !isPagePathAllowed(path)) {
    return {
      ok: false,
      problems: [{ code: 'PATH_RESERVED', field: 'slug', message: `Yeh path Page ke liye reserved hai: ${path}` }],
    };
  }
  return { ok: true, path };
}

/**
 * The hub page path for a type (used for breadcrumbs and "back to" links).
 * Null for PAGE. The hub itself is a PAGE entry and may not exist yet.
 */
export function typeHubPath(type: CmsEntryType): string | null {
  if (type === 'PAGE') return null;
  if (type === 'DOC') return DOC_ROOT_PATH;
  if (type === 'CITY_INDUSTRY') return `/${ENTRY_TYPE_META.CITY.prefix}`;
  const prefix = ENTRY_TYPE_META[type].prefix;
  if (prefix === null) return null;
  return `/${prefix.split('/')[0]}`;
}

/** Adds the locale prefix: "en" has none, other locales get "/<locale>". */
export function localizedPath(locale: string, path: string): string {
  if (locale === DEFAULT_LOCALE) return path;
  return path === '/' ? `/${locale}` : `/${locale}${path}`;
}

/** Absolute URL for a path in a locale. The site root keeps its trailing slash. */
export function absoluteUrl(siteUrl: string, locale: string, path: string): string {
  return `${siteUrl.replace(/\/+$/, '')}${localizedPath(locale, path)}`;
}

/**
 * Site URL used for absolute URLs: env `SITE_PUBLIC_URL` first (so staging
 * points at staging), then settings `site.baseUrl`, then nafaa.pk.
 */
export function resolveSiteUrl(envValue: string | undefined, settingsBaseUrl: string | null | undefined): string {
  const raw = envValue?.trim() || settingsBaseUrl?.trim() || DEFAULT_SITE_URL;
  return raw.replace(/\/+$/, '');
}

/**
 * Turns a title into a slug: lowercase ASCII words joined by single hyphens,
 * cut at a word boundary to `SLUG_MAX`. Returns "" when nothing usable is
 * left (for example an Urdu-script title); the caller then asks for a slug.
 */
export function slugify(title: string): string {
  const base = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (base.length <= SLUG_MAX) return base.length >= SLUG_MIN ? base : '';
  const cut = base.slice(0, SLUG_MAX + 1);
  const lastHyphen = cut.lastIndexOf('-');
  const trimmed = (lastHyphen >= SLUG_MIN ? cut.slice(0, lastHyphen) : base.slice(0, SLUG_MAX)).replace(/-+$/g, '');
  return trimmed.length >= SLUG_MIN ? trimmed : '';
}

/** `base`, `base-2`, `base-3`, ... kept within `SLUG_MAX`. */
export function slugCandidate(base: string, attempt: number): string {
  if (attempt <= 1) return base;
  const suffix = `-${attempt}`;
  return `${base.slice(0, SLUG_MAX - suffix.length).replace(/-+$/g, '')}${suffix}`;
}

/**
 * New paths for descendants after an ancestor's path changes. `children` is
 * the whole subtree as flat rows; each row's path is rebuilt from its own
 * slug under the new parent path. Rows whose path does not change are left out.
 */
export function descendantPaths(
  rootId: string,
  rootNewPath: string,
  subtree: readonly { id: string; parentId: string | null; slug: string; path: string }[],
): { id: string; path: string }[] {
  const byParent = new Map<string, { id: string; parentId: string | null; slug: string; path: string }[]>();
  for (const row of subtree) {
    if (!row.parentId) continue;
    const list = byParent.get(row.parentId) ?? [];
    list.push(row);
    byParent.set(row.parentId, list);
  }
  const out: { id: string; path: string }[] = [];
  const seen = new Set<string>([rootId]);
  const queue: { id: string; path: string }[] = [{ id: rootId, path: rootNewPath }];
  while (queue.length > 0) {
    const current = queue.shift() as { id: string; path: string };
    for (const child of byParent.get(current.id) ?? []) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      const path = child.slug === '' ? current.path : joinPath(current.path, child.slug);
      if (path !== child.path) out.push({ id: child.id, path });
      queue.push({ id: child.id, path });
    }
  }
  return out;
}
