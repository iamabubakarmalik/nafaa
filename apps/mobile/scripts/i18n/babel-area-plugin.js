/**
 * Binds `t` and `Trans` imported from '@/core/i18n' to the importing file's
 * catalog area (see areas.js and src/core/i18n/area.ts):
 *
 *   import { t, Trans, msg } from '@/core/i18n';
 * becomes
 *   import { msg } from '@/core/i18n';
 *   import { areaHelpers as __i18nArea } from '@/core/i18n/area';
 *   const { t, Trans } = __i18nArea('<area>');
 *
 * Aliases (`t as tr`) are kept. Files inside src/core/i18n are left alone.
 */

const { areaOf } = require('./areas');

const SOURCE = '@/core/i18n';
const BOUND = new Set(['t', 'Trans']);

module.exports = function i18nAreaPlugin({ types: t }) {
  return {
    name: 'nafaa-i18n-area',
    visitor: {
      ImportDeclaration(p, state) {
        if (p.node.source.value !== SOURCE || p.node.importKind === 'type') return;
        const filename = state.filename || '';
        if (/src[\\/]core[\\/]i18n[\\/]/.test(filename)) return;
        const bound = [];
        const keep = [];
        for (const s of p.node.specifiers) {
          if (t.isImportSpecifier(s) && s.importKind !== 'type' && BOUND.has(s.imported.name ?? s.imported.value)) bound.push(s);
          else keep.push(s);
        }
        if (!bound.length) return;
        const area = areaOf(filename);
        const helper = p.scope.generateUidIdentifier('i18nArea');
        const decl = t.variableDeclaration('const', [
          t.variableDeclarator(
            t.objectPattern(bound.map((s) => t.objectProperty(t.identifier(s.imported.name ?? s.imported.value), t.identifier(s.local.name), false, s.imported.name === s.local.name))),
            t.callExpression(helper, [t.stringLiteral(area)]),
          ),
        ]);
        const helperImport = t.importDeclaration([t.importSpecifier(helper, t.identifier('areaHelpers'))], t.stringLiteral('@/core/i18n/area'));
        const nodes = [helperImport, decl];
        if (keep.length) {
          p.node.specifiers = keep;
          p.insertAfter(nodes);
        } else {
          p.replaceWithMultiple(nodes);
        }
      },
    },
  };
};
