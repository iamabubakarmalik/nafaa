/**
 * Authorization map of the CMS API (API-CONTRACT 1 and 8).
 *
 * MarketingPermissionsGuard lets a request through when a handler has no
 * `@RequireMarketingPermissions`, so a forgotten decorator would open a route
 * to every marketing admin. This spec reads the Nest metadata of every CMS
 * controller and checks it against the permission tables in
 * docs/marketing-site/API-CONTRACT.md section 8:
 * - every admin route runs JwtAuthGuard, MarketingAdminGuard and
 *   MarketingPermissionsGuard and names exactly the documented permission;
 * - every documented route exists and every admin route is documented;
 * - only `/public/site/*` is public, it is read-only apart from the throttled
 *   redirect hit counter.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { MARKETING_PERMISSIONS_KEY } from '../_shared/decorators/marketing-permissions.decorator';
import { MarketingAdminGuard } from '../_shared/guards/marketing-admin.guard';
import { MarketingPermissionsGuard } from '../_shared/guards/marketing-permissions.guard';
import { MARKETING_PERMISSIONS } from '../_shared/constants/marketing-permissions.constants';
import { IS_PUBLIC_KEY } from '../../modules/auth/decorators/public.decorator';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';

const ADMIN_PREFIX = 'admin/marketing/cms';
const CONTRACT = resolve(__dirname, '../../../../../docs/marketing-site/API-CONTRACT.md');

const PERMISSION_WORDS: Record<string, string> = {
  view: MARKETING_PERMISSIONS.CMS_VIEW,
  edit: MARKETING_PERMISSIONS.CMS_EDIT,
  publish: MARKETING_PERMISSIONS.CMS_PUBLISH,
  redirects: MARKETING_PERMISSIONS.CMS_REDIRECTS,
  settings: MARKETING_PERMISSIONS.CMS_SETTINGS,
};

/**
 * Admin routes that exist in code but not in the section 8 tables. Each one
 * still passes the guard and permission checks above; the contract owner
 * should add them to the tables (reported by A4).
 */
const UNDOCUMENTED_ROUTES: string[] = [
  'GET /admin/marketing/cms/customers/:p',
  'GET /admin/marketing/cms/faqs/:p',
  'GET /admin/marketing/cms/media/:p',
];

interface Route {
  key: string;
  controller: string;
  handler: string;
  method: string;
  classGuards: unknown[];
  handlerGuards: unknown[];
  permissions: string[] | undefined;
  isPublic: boolean;
  skipThrottle: boolean | undefined;
}

type Ctor = { name: string; prototype: Record<string, unknown> };

function controllerFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return controllerFiles(full);
    return name.endsWith('.controller.ts') ? [full] : [];
  });
}

/** `:id`, `:revisionId`, `:key` all become `:p` so contract and code compare by shape. */
function routeKey(method: string, ...parts: string[]): string {
  const path = parts
    .flatMap((p) => p.split('/'))
    .filter(Boolean)
    .map((seg) => (seg.startsWith(':') ? ':p' : seg))
    .join('/');
  return `${method} /${path}`;
}

function collectRoutes(): Route[] {
  const routes: Route[] = [];
  for (const file of controllerFiles(__dirname)) {
    const mod = require(file) as Record<string, unknown>;
    for (const exported of Object.values(mod)) {
      if (typeof exported !== 'function') continue;
      const cls = exported as unknown as Ctor;
      const base = Reflect.getMetadata(PATH_METADATA, cls) as string | undefined;
      if (base === undefined) continue;
      const classGuards = (Reflect.getMetadata(GUARDS_METADATA, cls) as unknown[] | undefined) ?? [];
      const classPublic = Reflect.getMetadata(IS_PUBLIC_KEY, cls) === true;
      const classSkip = Reflect.getMetadata('THROTTLER:SKIPdefault', cls) as boolean | undefined;
      for (const name of Object.getOwnPropertyNames(cls.prototype)) {
        if (name === 'constructor') continue;
        const fn = cls.prototype[name];
        if (typeof fn !== 'function') continue;
        const verb = Reflect.getMetadata(METHOD_METADATA, fn) as RequestMethod | undefined;
        if (verb === undefined) continue;
        const path = (Reflect.getMetadata(PATH_METADATA, fn) as string | undefined) ?? '';
        const method = RequestMethod[verb];
        const handlerSkip = Reflect.getMetadata('THROTTLER:SKIPdefault', fn) as boolean | undefined;
        routes.push({
          key: routeKey(method, base, path),
          controller: cls.name,
          handler: name,
          method,
          classGuards,
          handlerGuards: (Reflect.getMetadata(GUARDS_METADATA, fn) as unknown[] | undefined) ?? [],
          permissions: Reflect.getMetadata(MARKETING_PERMISSIONS_KEY, fn) as string[] | undefined,
          isPublic: classPublic || Reflect.getMetadata(IS_PUBLIC_KEY, fn) === true,
          skipThrottle: handlerSkip ?? classSkip,
        });
      }
    }
  }
  return routes;
}

/** `| \`GET /entries/:id\` | view | ...` rows of the section 8 tables. */
function contractRoutes(): Map<string, string> {
  const text = readFileSync(CONTRACT, 'utf8');
  const start = text.indexOf('### 8.1 Entries');
  const end = text.indexOf('## 9.', start);
  const out = new Map<string, string>();
  for (const line of text.slice(start, end).split('\n')) {
    const m = /^\|\s*`(GET|POST|PATCH|PUT|DELETE) ([^`]+)`\s*\|\s*([a-z]+)\s*\|/.exec(line);
    if (!m?.[1] || !m[2] || !m[3]) continue;
    out.set(routeKey(m[1], ADMIN_PREFIX, m[2]), m[3]);
  }
  return out;
}

const routes = collectRoutes();
const adminRoutes = routes.filter((r) => r.key.split(' ')[1]?.startsWith(`/${ADMIN_PREFIX}`));
const publicRoutes = routes.filter((r) => r.key.split(' ')[1]?.startsWith('/public/site'));

describe('CMS authorization map', () => {
  it('finds the controllers', () => {
    expect(adminRoutes.length).toBeGreaterThanOrEqual(70);
    expect(publicRoutes.length).toBeGreaterThan(10);
    expect(adminRoutes.length + publicRoutes.length).toBe(routes.length);
  });

  it('every admin route runs the three guards in order and is not public', () => {
    const bad = adminRoutes.filter((r) => {
      const guards = [...r.classGuards, ...r.handlerGuards];
      return r.isPublic || guards[0] !== JwtAuthGuard || guards[1] !== MarketingAdminGuard || guards[2] !== MarketingPermissionsGuard;
    });
    expect(bad.map((r) => `${r.controller}.${r.handler}`)).toEqual([]);
  });

  it('every admin route names exactly one CMS permission', () => {
    const cmsPermissions = new Set(Object.values(PERMISSION_WORDS));
    const bad = adminRoutes.filter((r) => r.permissions?.length !== 1 || !cmsPermissions.has(r.permissions[0] ?? ''));
    expect(bad.map((r) => `${r.key} (${r.controller}.${r.handler}): ${JSON.stringify(r.permissions)}`)).toEqual([]);
  });

  it('matches the permission tables in API-CONTRACT section 8', () => {
    const documented = contractRoutes();
    expect(documented.size).toBeGreaterThan(60);
    const implemented = new Map(adminRoutes.map((r) => [r.key, r]));

    const missing = [...documented.keys()].filter((k) => !implemented.has(k));
    const undocumented = [...implemented.keys()].filter((k) => !documented.has(k));
    const wrong = [...documented].flatMap(([key, word]) => {
      const r = implemented.get(key);
      const expected = PERMISSION_WORDS[word];
      return r && r.permissions?.[0] !== expected ? [`${key}: contract ${word}, code ${r.permissions?.join(',')}`] : [];
    });
    expect({ missing, wrong }).toEqual({ missing: [], wrong: [] });
    // Routes added after the contract tables; keep this list short and document them.
    expect(undocumented.sort()).toEqual(UNDOCUMENTED_ROUTES);
  });

  it('writes never need only the view permission, except the dry-run validate and preview links', () => {
    const allowed = new Set([routeKey('POST', ADMIN_PREFIX, 'entries/:id/validate'), routeKey('POST', ADMIN_PREFIX, 'entries/:id/preview-link')]);
    const bad = adminRoutes.filter((r) => r.method !== 'GET' && r.permissions?.[0] === MARKETING_PERMISSIONS.CMS_VIEW && !allowed.has(r.key));
    expect(bad.map((r) => r.key)).toEqual([]);
  });

  it('public site routes are public, read-only and unthrottled, apart from the throttled hit counter', () => {
    const writes = publicRoutes.filter((r) => r.method !== 'GET');
    expect(writes.map((r) => r.key)).toEqual([routeKey('POST', 'public/site', 'redirects/hit')]);
    expect(writes[0]?.skipThrottle).toBe(false);
    for (const r of publicRoutes) {
      expect(r.isPublic).toBe(true);
      expect(r.permissions).toBeUndefined();
      if (r.method === 'GET') expect(r.skipThrottle).toBe(true);
    }
  });
});
