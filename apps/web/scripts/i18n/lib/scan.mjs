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

/** Unwraps parentheses, `!`, `as` and `x ?? 'fallback'` to the expressions a message can be. */
function messageBranches(n) {
  if (!n) return [];
  if (ts.isParenthesizedExpression(n) || ts.isNonNullExpression(n) || ts.isAsExpression(n)) return messageBranches(n.expression);
  if (ts.isConditionalExpression(n)) return [...messageBranches(n.whenTrue), ...messageBranches(n.whenFalse)];
  if (ts.isBinaryExpression(n) && [ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken].includes(n.operatorToken.kind)) {
    return messageBranches(n.right);
  }
  return [n];
}

const calleeName = (n) =>
  ts.isIdentifier(n.expression) ? n.expression.text : ts.isPropertyAccessExpression(n.expression) ? n.expression.name.text : null;

// Nest exceptions, and the integrations' own errors (CourierApiError, ShopifyError…) whose text reaches the user.
const isException = (n) =>
  ts.isNewExpression(n) && ts.isIdentifier(n.expression) && /(Exception|[A-Z]\w*[a-z]Error)$/.test(n.expression.text) && !/^(Type|Range|Syntax|Reference)Error$/.test(n.expression.text) && n.arguments?.length;
const isApiMessage = (n) => ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'apiMessage';
/** apiText('...') marks a fixed text that reaches the user indirectly. */
const isApiText = (n) => ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'apiText';
const propName = (p, sf) => (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) && p.name ? p.name.getText(sf) : null;

/**
 * Helpers that turn one of their arguments into a message, such as
 * `positive(value, message)` or `assertCan(user, perms, action)`: a parameter
 * that reaches an exception or an apiMessage() value. Returns name → indexes.
 */
export function findApiMessageHelpers(files) {
  const helpers = new Map();
  for (const file of files) {
    const sf = parse(file);
    const visit = (n) => {
      if ((ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n) || ts.isArrowFunction(n) || ts.isFunctionExpression(n)) && n.body) {
        let name = n.name && (ts.isIdentifier(n.name) || ts.isPrivateIdentifier(n.name)) ? n.name.text : null;
        if (!name && ts.isVariableDeclaration(n.parent) && ts.isIdentifier(n.parent.name)) name = n.parent.name.text;
        const params = n.parameters.map((p) => (ts.isIdentifier(p.name) ? p.name.text : null));
        if (name && params.some(Boolean)) {
          const hit = (e) => {
            for (const b of messageBranches(e)) {
              if (!ts.isIdentifier(b)) continue;
              const i = params.indexOf(b.text);
              if (i < 0) continue;
              if (!helpers.has(name)) helpers.set(name, new Set());
              helpers.get(name).add(i);
            }
          };
          const inner = (m) => {
            if (isException(m)) {
              hit(m.arguments[0]);
              const a = m.arguments[0];
              if (ts.isObjectLiteralExpression(a)) for (const pr of a.properties) if (ts.isPropertyAssignment(pr) && pr.name.getText(sf) === 'message') hit(pr.initializer);
            }
            if (isApiMessage(m) && m.arguments[1] && ts.isObjectLiteralExpression(m.arguments[1])) {
              for (const pr of m.arguments[1].properties) {
                if (ts.isShorthandPropertyAssignment(pr)) hit(pr.name);
                else if (ts.isPropertyAssignment(pr)) hit(pr.initializer);
              }
            }
            ts.forEachChild(m, inner);
          };
          inner(n.body);
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return helpers;
}

/**
 * Messages the API sends: exception texts, apiMessage() templates, apiText()
 * marks, `message: '...'` values (and the `title` beside one), constants of
 * the same file used as messages, and texts passed to message helpers (see
 * findApiMessageHelpers; only phrases, so codes and statuses stay out).
 * Template literals with values are skipped; they must be converted to
 * apiMessage() first (the scan lists them).
 */
export function scanApiFile(file, helpers = new Map()) {
  const sf = parse(file);
  const keys = [];
  const unconverted = [];
  const line = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  // `const TEXT = '...'` in this file, so `throw new X(TEXT)` finds its text.
  const consts = new Map();
  const collect = (n) => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && ts.isVariableDeclarationList(n.parent) && n.parent.flags & ts.NodeFlags.Const) {
      consts.set(n.name.text, n.initializer);
    }
    ts.forEachChild(n, collect);
  };
  collect(sf);
  const take = (n, phrasesOnly = false, seen = new Set()) => {
    for (const b of messageBranches(n)) {
      const text = literalText(b);
      if (text != null && /\p{L}/u.test(text) && (!phrasesOnly || /\p{L}\s+\p{L}/u.test(text))) keys.push({ key: text, line: line(b) });
      else if (ts.isIdentifier(b) && consts.has(b.text) && !seen.has(b.text)) take(consts.get(b.text), phrasesOnly, new Set([...seen, b.text]));
      else if (ts.isTemplateExpression(b) || (ts.isBinaryExpression(b) && b.operatorToken.kind === ts.SyntaxKind.PlusToken)) {
        unconverted.push({ line: line(b), code: b.getText(sf).slice(0, 100) });
      }
    }
  };
  const walk = (n) => {
    if (isException(n)) take(n.arguments[0]);
    if (isApiMessage(n) || isApiText(n)) take(n.arguments[0]);
    // Fixed words passed as values (fallbacks such as 'Customer'); the client translates them too.
    if (isApiMessage(n) && n.arguments[1] && ts.isObjectLiteralExpression(n.arguments[1])) {
      for (const p of n.arguments[1].properties) {
        if (!ts.isPropertyAssignment(p)) continue;
        for (const b of messageBranches(p.initializer)) {
          const text = literalText(b);
          if (text != null && /\p{Ll}/u.test(text)) keys.push({ key: text, line: line(b) });
        }
      }
    }
    if (ts.isPropertyAssignment(n) && ts.isIdentifier(n.name) && n.name.text === 'message') take(n.initializer);
    // Notification-like objects: { title, message } — the title is shown too.
    if (ts.isObjectLiteralExpression(n) && n.properties.some((p) => propName(p, sf) === 'message')) {
      for (const p of n.properties) if (ts.isPropertyAssignment(p) && propName(p, sf) === 'title') take(p.initializer);
    }
    if (ts.isCallExpression(n) && !isApiMessage(n) && !isApiText(n)) {
      const idx = helpers.get(calleeName(n));
      if (idx) for (const i of idx) if (n.arguments[i]) take(n.arguments[i], true);
    }
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
    const apiFiles = listFiles(dirs, { root: API_SRC });
    const helpers = findApiMessageHelpers(apiFiles);
    for (const file of apiFiles) {
      const { keys, unconverted: un } = scanApiFile(file, helpers);
      const where = path.relative(path.resolve(API_SRC, '../..'), file);
      for (const k of keys) add('api', k.key, `${where}:${k.line}`);
      for (const u of un) unconverted.push({ where: `${where}:${u.line}`, code: u.code });
    }
    if (!byArea.has('api')) byArea.set('api', new Map());
  }
  return { byArea, dynamic, unconverted };
}
