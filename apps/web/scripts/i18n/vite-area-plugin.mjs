/**
 * Vite plugin: binds `t` and `Trans` to the catalog area of the file that
 * imports them.
 *
 * Catalogs are written per area (catalog/<locale>/<area>.json), and the same
 * source text may be translated differently in two areas. This plugin rewrites
 *
 *   import { t, Trans, msg } from '@core/i18n';
 *
 * in a source file to import from a generated module for that file's area,
 * `virtual:nafaa-i18n/<area>`, which re-exports '@core/i18n' with `t` and
 * `Trans` bound to the area (core/i18n/area.ts). The area comes from areaOf(),
 * the same rule the extractor uses, so lookups hit the catalog file the key
 * was extracted to. Call sites and types stay unchanged; tsc never sees this.
 */

import path from 'node:path';
import { areaOf, SRC } from './lib/files.mjs';

const PREFIX = 'virtual:nafaa-i18n/';
const RESOLVED = '\0' + PREFIX;
const I18N_DIR = path.join(SRC, 'core/i18n') + path.sep;
const SKIP_DIRS = [I18N_DIR, path.join(SRC, 'marketplace') + path.sep];
const IMPORT = /(\bimport\s*\{([^}]*)\}\s*from\s*)(['"])@core\/i18n\3/g;
const BOUND = /^(t|Trans)(\s+as\s+\w+)?$/;

export default function i18nAreaPlugin() {
  return {
    name: 'nafaa-i18n-area',
    enforce: 'pre',
    resolveId(id) {
      return id.startsWith(PREFIX) ? '\0' + id : null;
    },
    load(id) {
      if (!id.startsWith(RESOLVED)) return null;
      const area = id.slice(RESOLVED.length);
      return [
        "import { areaHelpers } from '@core/i18n/area';",
        "export * from '@core/i18n';",
        `const bound = areaHelpers(${JSON.stringify(area)});`,
        'export const t = bound.t;',
        'export const Trans = bound.Trans;',
      ].join('\n');
    },
    transform(code, id) {
      if (id.startsWith('\0') || !code.includes('@core/i18n')) return null;
      const file = id.split('?')[0];
      if (!/\.(tsx?|mts)$/.test(file) || !file.startsWith(SRC + path.sep) || SKIP_DIRS.some((d) => file.startsWith(d))) return null;
      const area = areaOf(file);
      let changed = false;
      const out = code.replace(IMPORT, (whole, head, names, quote) => {
        // `import type { … }` and imports without t/Trans stay as they are.
        if (/^import\s+type\b/.test(head)) return whole;
        if (!names.split(',').some((n) => BOUND.test(n.trim()))) return whole;
        changed = true;
        return `${head}${quote}${PREFIX}${area}${quote}`;
      });
      return changed ? { code: out, map: null } : null;
    },
  };
}
