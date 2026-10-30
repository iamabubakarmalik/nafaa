/**
 * Finds the translation keys a file uses: t('...') and msg('...') calls (under
 * whatever local name they were imported as) and <Trans text="..." />.
 * Also reads translatable messages from the API source.
 */

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { API_DIRS, API_SRC, areaOf, listFiles, rel } from './files.mjs';

const I18N_MODULES = new Set(['@core/i18n', '@core/i18n/runtime']);

function parse(file) {
  const source = fs.readFileSync(file, 'utf8');
  return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}

function translatorNames(sf) {
  const fns = new Set();
  const trans = new Set();
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !I18N_MODULES.has(st.moduleSpecifier.text)) continue;
    const named = st.importClause?.namedBindings;
    if (!named || !ts.isNamedImports(named)) continue;
    for (const el of named.elements) {
      const imported = (el.propertyName ?? el.name).text;
      if (imported === 't' || imported === 'msg') fns.add(el.name.text);
      if (imported === 'Trans') trans.add(el.name.text);
    }
  }
  // The runtime itself and Trans call t internally with variables; that is fine.
  return { fns, trans };
}

const literalText = (n) => (n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text : null);

/** Keys used by one web source file. */
export function scanFile(file) {
  const sf = parse(file);
  const { fns, trans } = translatorNames(sf);
  const keys = [];
  const dynamic = [];
  if (!fns.size && !trans.size) return { keys, dynamic };
  const line = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const walk = (n) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && fns.has(n.expression.text)) {
      const text = literalText(n.arguments[0]);
      if (text != null) keys.push({ key: text, line: line(n) });
      else dynamic.push({ line: line(n), code: n.getText(sf).slice(0, 80) });
    }
    if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && trans.has(n.tagName.getText(sf))) {
      for (const attr of n.attributes.properties) {
        if (!ts.isJsxAttribute(attr) || attr.name.getText(sf) !== 'text' || !attr.initializer) continue;
        const init = attr.initializer;
        const text = ts.isStringLiteral(init) ? init.text : ts.isJsxExpression(init) ? literalText(init.expression) : null;
        if (text != null) keys.push({ key: text, line: line(n) });
        else dynamic.push({ line: line(n), code: n.getText(sf).slice(0, 80) });
      }
    }
    ts.forEachChild(n, walk);
  };
  walk(sf);
  return { keys, dynamic };
}

/**
 * Messages the API sends: exception texts, apiMessage() templates and
 * `message: '...'` values. Template literals with values are skipped; they
 * must be converted to apiMessage() first (the scan lists them).
 */
export function scanApiFile(file) {
  const sf = parse(file);
  const keys = [];
  const unconverted = [];
  const line = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const take = (n) => {
    const text = literalText(n);
    if (text != null && /\p{L}/u.test(text)) keys.push({ key: text, line: line(n) });
    else if (n && ts.isTemplateExpression(n)) unconverted.push({ line: line(n), code: n.getText(sf).slice(0, 100) });
  };
  const walk = (n) => {
    if (ts.isNewExpression(n) && ts.isIdentifier(n.expression) && /Exception$/.test(n.expression.text) && n.arguments?.length) {
      take(n.arguments[0]);
    }
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'apiMessage') take(n.arguments[0]);
    if (ts.isPropertyAssignment(n) && ts.isIdentifier(n.name) && n.name.text === 'message') take(n.initializer);
    ts.forEachChild(n, walk);
  };
  walk(sf);
  return { keys, unconverted };
}

/**
 * Keys by area for the web app, plus the "api" area.
 * `areas` limits the scan to those areas (null = all).
 */
export function scanAll({ areas = null } = {}) {
  const byArea = new Map();
  const dynamic = [];
  const unconverted = [];
  const add = (area, key, where) => {
    if (!byArea.has(area)) byArea.set(area, new Map());
    const m = byArea.get(area);
    if (!m.has(key)) m.set(key, []);
    m.get(key).push(where);
  };
  for (const file of listFiles(['src'])) {
    const area = areaOf(file);
    if (areas && !areas.includes(area)) continue;
    const { keys, dynamic: dyn } = scanFile(file);
    for (const k of keys) add(area, k.key, `${rel(file)}:${k.line}`);
    for (const d of dyn) dynamic.push({ area, where: `${rel(file)}:${d.line}`, code: d.code });
  }
  if (!areas || areas.includes('api')) {
    const dirs = API_DIRS.map((d) => path.join(API_SRC, d)).filter((d) => fs.existsSync(d));
    for (const file of listFiles(dirs, { root: API_SRC })) {
      const { keys, unconverted: un } = scanApiFile(file);
      const where = path.relative(path.resolve(API_SRC, '../..'), file);
      for (const k of keys) add('api', k.key, `${where}:${k.line}`);
      for (const u of un) unconverted.push({ where: `${where}:${u.line}`, code: u.code });
    }
    if (!byArea.has('api')) byArea.set('api', new Map());
  }
  return { byArea, dynamic, unconverted };
}
