#!/usr/bin/env node
/**
 * i18n:wrap — wraps user-visible text in t() so it can be translated.
 *
 *   node scripts/i18n/wrap.mjs <file-or-folder...> [--write] [--json report.json] [--verbose]
 *
 * Dry run by default: prints what would change and what was left. With
 * --write the files are edited in place. Running it twice changes nothing.
 *
 * What it wraps
 *   - JSX text, joined with neighbouring {expressions} into one sentence:
 *       <p>Aap ke {count} products</p>  ->  <p>{t('Aap ke {{count}} products', { count })}</p>
 *   - text props: title, label, placeholder, hint, description, aria-label, alt, ... (TEXT_PROPS)
 *   - object keys with the same meaning: { label: 'Naya' } (TEXT_KEYS)
 *   - messages passed to toast.*, apiError, setError, confirm, alert, new Error, zod checks (MESSAGE_CALLS)
 *   - values of label maps and returns of label functions (STATUS_LABELS = {...}, function statusLabel())
 *   - template literals and string concatenation in those places, as placeholders
 *
 * --loose also wraps what a normal run lists under "left" (array items,
 * return values, other call arguments). Use it only on files whose "left"
 * list you have read and found to be all UI text.
 *
 * Text on a line with an `i18n-ignore` comment, or right below one, is
 * skipped: brand names and labels that must stay as written.
 *
 * What it leaves
 *   className and other technical props, keys, routes, ids, enum values,
 *   comparisons, imports, types, console calls, URLs, class lists, formats.
 *   Sentence-like strings it was not sure about are listed under "left" so a
 *   person can decide. Rich text split by elements is listed under "rich" and
 *   is best rewritten with <Trans>.
 */

import fs from 'node:fs';
import ts from 'typescript';
import { listFiles, parseArgs, rel } from './lib/files.mjs';
import { cleanJsxText, decodeEntities, hasLetter, isSentence, isUiText, jsString } from './lib/text.mjs';

const I18N_MODULES = new Set(['@core/i18n', '@core/i18n/runtime']);

const TEXT_PROPS = new Set([
  'title', 'label', 'placeholder', 'hint', 'description', 'desc', 'aria-label', 'alt', 'text', 'meta', 'empty',
  'emptyText', 'emptyTitle', 'emptyDescription', 'emptyHint', 'sub', 'subtitle', 'backLabel', 'cta', 'help',
  'helpText', 'helperText', 'confirm', 'confirmLabel', 'confirmText', 'cancelLabel', 'cancelText', 'ph', 'q',
  'what', 'note', 'tag', 'periodLabel', 'subline', 'linkLabel', 'badge', 'otherLabel', 'closedText', 'caption', 'heading', 'tooltip',
  'message', 'body', 'intro', 'k', 'find', 'actionLabel', 'submitLabel', 'saveLabel', 'loadingText',
  'searchPlaceholder', 'eyebrow', 'kicker', 'summary', 'tip', 'question', 'answer', 'lead',
  'okLabel', 'nextLabel', 'prevLabel', 'doneLabel', 'suffixText', 'prefixText', 'errorText',
]);

const TEXT_KEYS = new Set([
  ...TEXT_PROPS, 'group', 'reason', 'footer', 'namePlaceholder', 'searchHint', 'listLabel', 'paymentLabel',
  'partyLabel', 'footerNote', 'sample', 'content', 'short', 'shortLabel', 'shortName', 'btn', 'button', 'action',
  'detail', 'details', 'rule', 'who', 'where', 'cogsHint', 'a4Title', 'stamp', 'notes', 'emptyMessage',
  'successMessage', 'errorMessage', 'success', 'error', 'warning', 'info', 'loading', 'section', 'longLabel', 'menuLabel', 'pageTitle',
]);

/** Calls whose string arguments are messages for people. */
const MESSAGE_CALLS = /^(?:toast(?:\.\w+)?|notify(?:\.\w+)?|alert|confirm|window\.(?:alert|confirm|prompt)|prompt|apiError|apiErrorMessage|authErrorMessage|errorText|errText|distError|setError|setErr|setFormErr|setFormError|setMessage|setNotice|setStatusText|setHint|withManagerPin|showError|showSuccess|fail|failed|reportError)$/;
const ZOD_MESSAGE_METHODS = new Set(['min', 'max', 'length', 'email', 'url', 'regex', 'nonempty', 'refine', 'superRefine', 'positive', 'nonnegative', 'int', 'gt', 'gte', 'lt', 'lte', 'startsWith', 'endsWith', 'includes', 'uuid', 'trim', 'multipleOf', 'finite', 'safe', 'date', 'datetime', 'phone']);

/** Variables and functions whose values are labels: STATUS_LABELS, typeLabel(), stepTitles. */
const LABELISH_NAME = /[a-z](?:Label|Title|Text|Caption|Hint|Desc|Description|Message)s?$|^(?:label|title|text|caption|hint|desc|description|message)s?$|^(?:label|title|caption|hint)[A-Z]/;
const LABELISH_VAR = /(?:LABEL|TITLE|TEXT|CAPTION|HINT|DESC|MESSAGE)S?$|[a-z](?:Label|Title|Text|Caption|Hint|Desc|Message)s?$|^(?:label|title|text|message|hint|desc|description|subtitle|caption|placeholder|heading|tooltip|msg)$/;

/** Elements whose text is not prose. */
const SKIP_ELEMENTS = new Set(['code', 'pre', 'kbd', 'Kbd', 'style', 'script', 'Trans', 'T']);

/** Props and keys that are never text; strings there are not even reported. */
const TECHNICAL_NAMES = new Set([
  'className', 'class', 'style', 'key', 'id', 'to', 'href', 'src', 'type', 'name', 'variant', 'size', 'tone', 'color',
  'icon', 'role', 'htmlFor', 'autoComplete', 'inputMode', 'pattern', 'method', 'target', 'rel', 'value', 'defaultValue',
  'path', 'url', 'slug', 'code', 'permission', 'route', 'event', 'field', 'format', 'endpoint', 'query', 'accept', 'mime',
  'keywords', 'words', 'data-testid', 'testId', 'align', 'justify', 'side', 'position', 'layout', 'mode', 'kind', 'shape',
  'cls', 'iconClass', 'ring', 'bg', 'fg', 'accent', 'gradient', 'chip', 'dot', 'bar', 'pill', 'border', 'tint', 'hover',
  'Authorization', 'headers', 'storageKey', 'queryKey', 'mutationKey', 'aria-keyshortcuts', 'patternTransform', 'fill',
  'stroke', 'd', 'viewBox', 'transform', 'google', 'stack', 'href', 'sample',
]);

const ARGS = parseArgs(process.argv.slice(2), ['write', 'verbose', 'quiet', 'loose']);
if (!ARGS.positional.length) {
  console.error('Usage: node scripts/i18n/wrap.mjs <file-or-folder...> [--write] [--json report.json] [--verbose]');
  process.exit(2);
}

const report = { files: [], totals: { wrapped: 0, left: 0, rich: 0, changedFiles: 0 } };

for (const file of listFiles(ARGS.positional)) {
  const result = processFile(file);
  if (!result) continue;
  report.files.push(result);
  report.totals.wrapped += result.wrapped.length;
  report.totals.left += result.left.length;
  report.totals.rich += result.rich.length;
  if (result.wrapped.length) report.totals.changedFiles++;
}

printReport(report);
if (ARGS.flags.json) fs.writeFileSync(ARGS.flags.json, JSON.stringify(report, null, 2));

// ---------------------------------------------------------------------------

function processFile(file) {
  const source = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const ctx = {
    sf,
    source,
    edits: [],
    handled: new Set(),
    wrapped: [],
    left: [],
    rich: [],
    fn: null,
  };
  const existing = findTranslatorImport(sf);
  ctx.fn = existing ?? (bindsName(sf, 't') ? (bindsName(sf, 'tr') ? 't_' : 'tr') : 't');

  visit(sf, ctx);
  collectLeftovers(sf, ctx);

  if (ctx.edits.length && !existing) addImport(ctx);
  if (ctx.edits.length && ARGS.flags.write) fs.writeFileSync(file, applyEdits(source, ctx.edits));
  if (!ctx.wrapped.length && !ctx.left.length && !ctx.rich.length) return null;
  return { file: rel(file), wrapped: ctx.wrapped, left: ctx.left, rich: ctx.rich };
}

/** Local name of `t` imported from '@core/i18n', if any. */
function findTranslatorImport(sf) {
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !I18N_MODULES.has(st.moduleSpecifier.text)) continue;
    const named = st.importClause?.namedBindings;
    if (named && ts.isNamedImports(named)) {
      for (const el of named.elements) if ((el.propertyName ?? el.name).text === 't') return el.name.text;
    }
  }
  return null;
}

function bindsName(sf, name) {
  let found = false;
  const check = (n) => {
    if (found) return;
    if ((ts.isParameter(n) || ts.isVariableDeclaration(n) || ts.isBindingElement(n) || ts.isFunctionDeclaration(n) || ts.isClassDeclaration(n) || ts.isImportSpecifier(n) || ts.isImportClause(n) || ts.isNamespaceImport(n))
      && n.name && hasBinding(n.name, name)) found = true;
    ts.forEachChild(n, check);
  };
  check(sf);
  return found;
}

function hasBinding(nameNode, name) {
  if (ts.isIdentifier(nameNode)) return nameNode.text === name;
  if (ts.isObjectBindingPattern(nameNode) || ts.isArrayBindingPattern(nameNode)) {
    return nameNode.elements.some((el) => !ts.isOmittedExpression(el) && hasBinding(el.name, name));
  }
  return false;
}

function addImport(ctx) {
  const { sf } = ctx;
  const spec = ctx.fn === 't' ? '{ t }' : `{ t as ${ctx.fn} }`;
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st) && st.moduleSpecifier.text === '@core/i18n' && !st.importClause?.isTypeOnly) {
      const named = st.importClause?.namedBindings;
      if (named && ts.isNamedImports(named)) {
        const last = named.elements[named.elements.length - 1];
        ctx.edits.push({ start: last.end, end: last.end, text: `, ${ctx.fn === 't' ? 't' : `t as ${ctx.fn}`}` });
        return;
      }
    }
  }
  const imports = sf.statements.filter(ts.isImportDeclaration);
  const at = imports.length ? imports[imports.length - 1].end : firstStatementStart(sf);
  const text = imports.length ? `\nimport ${spec} from '@core/i18n';` : `import ${spec} from '@core/i18n';\n`;
  ctx.edits.push({ start: at, end: at, text });
}

function firstStatementStart(sf) {
  // After a leading file header comment, so the header stays on top.
  const first = sf.statements[0];
  return first ? first.getStart(sf) : 0;
}

function applyEdits(source, edits) {
  // Outer edits win: an edit inside another one is already part of its text.
  const ordered = [...edits].sort((a, b) => a.start - b.start || b.end - a.end);
  const kept = [];
  for (const e of ordered) {
    const prev = kept[kept.length - 1];
    if (prev && e.start < prev.end && e.end <= prev.end && prev.end > prev.start) continue;
    kept.push(e);
  }
  let out = source;
  for (const e of kept.reverse()) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return out;
}

// ---- Visiting ---------------------------------------------------------------

function visit(node, ctx) {
  if (ctx.handled.has(node)) return;
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node) || ts.isTypeNode(node) && !ts.isTypeLiteralNode(node)) return;
  if (isTranslatorCall(node, ctx)) return;

  if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
    const tag = ts.isJsxElement(node) ? tagName(node.openingElement) : '';
    if (!SKIP_ELEMENTS.has(tag)) processJsxChildren(node, ctx);
  } else if (ts.isJsxAttribute(node)) {
    processJsxAttribute(node, ctx);
  } else if (ts.isPropertyAssignment(node)) {
    const key = propName(node.name);
    if (key && TEXT_KEYS.has(key)) wrapStringish(node.initializer, ctx, 'ui');
  } else if (ts.isShorthandPropertyAssignment(node)) {
    // nothing: the value is a variable
  } else if (ts.isCallExpression(node)) {
    processCall(node, ctx);
  } else if (ts.isNewExpression(node)) {
    if (ts.isIdentifier(node.expression) && /Error$/.test(node.expression.text) && node.arguments?.[0]) {
      wrapStringish(node.arguments[0], ctx, 'sentence');
    }
  } else if (ts.isVariableDeclaration(node)) {
    if (ts.isIdentifier(node.name) && node.initializer && LABELISH_VAR.test(node.name.text)) wrapLabelCollection(node.initializer, ctx);
  } else if (ts.isBindingElement(node) || ts.isParameter(node)) {
    const name = ts.isIdentifier(node.name) ? node.name.text : null;
    if (name && node.initializer) wrapStringish(node.initializer, ctx, TEXT_PROPS.has(name) ? 'ui' : 'sentence');
  } else if (ts.isConditionalExpression(node) && conditionalHasSentence(node)) {
    // cond ? 'Save ho raha hai…' : `Bill complete · ${total}` — a sentence on one side makes both sides text.
    wrapStringish(node, ctx, 'ui');
  } else if (isLabelFunction(node)) {
    wrapReturns(node, ctx);
  }
  ts.forEachChild(node, (child) => visit(child, ctx));
}

function isTranslatorCall(node, ctx) {
  return ts.isCallExpression(node) && ts.isIdentifier(node.expression) && (node.expression.text === ctx.fn || node.expression.text === 'msg');
}

function tagName(opening) {
  return opening.tagName.getText();
}

function propName(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isPrivateIdentifier(name)) return name.text;
  return null;
}

function processJsxAttribute(node, ctx) {
  const name = node.name.getText();
  const owner = node.parent.parent;
  const tag = ts.isJsxOpeningElement(owner) || ts.isJsxSelfClosingElement(owner) ? tagName(owner) : '';
  if (SKIP_ELEMENTS.has(tag) || !TEXT_PROPS.has(name) || !node.initializer) return;
  const init = node.initializer;
  if (ts.isStringLiteral(init)) {
    const text = decodeEntities(init.text);
    if (text != null && isUiText(text, { strict: true })) {
      edit(ctx, init, `{${ctx.fn}(${jsString(text)})}`, text);
    }
    ctx.handled.add(init);
  } else if (ts.isJsxExpression(init) && init.expression) {
    wrapStringish(init.expression, ctx, 'ui');
  }
}

function processCall(node, ctx) {
  const callee = node.expression.getText();
  if (MESSAGE_CALLS.test(callee)) {
    node.arguments.forEach((arg) => wrapStringish(arg, ctx, 'sentence'));
    return;
  }
  if (ts.isPropertyAccessExpression(node.expression) && ZOD_MESSAGE_METHODS.has(node.expression.name.text) && /^z\./.test(callee)) {
    node.arguments.forEach((arg) => wrapStringish(arg, ctx, 'sentence'));
  }
}

function isLabelFunction(node) {
  let name = null;
  if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) && node.name && ts.isIdentifier(node.name)) name = node.name.text;
  else if ((ts.isArrowFunction(node) || ts.isFunctionExpression(node)) && ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) name = node.parent.name.text;
  if (!name || !LABELISH_NAME.test(name)) return false;
  // Components (PascalCase) return JSX, not labels.
  return !/^[A-Z][a-z]/.test(name) || /^[A-Z_]+$/.test(name);
}

function wrapReturns(fn, ctx) {
  if (!fn.body) return;
  if (!ts.isBlock(fn.body)) {
    wrapStringish(fn.body, ctx, 'ui');
    return;
  }
  const walk = (n) => {
    if (n !== fn && (ts.isFunctionLike(n))) return;
    if (ts.isReturnStatement(n) && n.expression) wrapStringish(n.expression, ctx, 'ui');
    ts.forEachChild(n, walk);
  };
  walk(fn.body);
}

/** Values of a label map or list: { PAID: 'Paid' }, ['Pehla', 'Doosra']. */
function wrapLabelCollection(init, ctx) {
  let node = init;
  while (ts.isAsExpression(node) || ts.isSatisfiesExpression?.(node) || ts.isParenthesizedExpression(node)) node = node.expression;
  if (ts.isObjectLiteralExpression(node)) {
    for (const p of node.properties) if (ts.isPropertyAssignment(p)) wrapStringish(p.initializer, ctx, 'ui');
  } else if (ts.isArrayLiteralExpression(node)) {
    for (const el of node.elements) wrapStringish(el, ctx, 'ui');
  } else if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    // handled by isLabelFunction
  } else {
    wrapStringish(node, ctx, 'ui');
  }
}

// ---- Wrapping expressions ---------------------------------------------------

/**
 * Wraps string-valued expressions. `level` is how sure the position is:
 * 'ui' accepts any human text, 'sentence' needs sentence-like text.
 */
function wrapStringish(expr, ctx, level) {
  if (!expr || ctx.handled.has(expr)) return;
  const accept = (s) => (level === 'ui' ? isUiText(s, { strict: true }) : isSentence(s));

  if (ts.isParenthesizedExpression(expr) || ts.isAsExpression(expr) || ts.isNonNullExpression(expr)) {
    wrapStringish(expr.expression, ctx, level);
  } else if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
    ctx.handled.add(expr);
    const call = `${ctx.fn}(${jsString(expr.text)})`;
    if (accept(expr.text)) edit(ctx, expr, ts.isJsxAttribute(expr.parent) ? `{${call}}` : call, expr.text);
  } else if (ts.isTemplateExpression(expr)) {
    ctx.handled.add(expr);
    const built = buildFromTemplate(expr, ctx);
    if (built && accept(built.key.replace(/\{\{\w+\}\}/g, ' x '))) edit(ctx, expr, callText(ctx, built), built.key);
  } else if (ts.isBinaryExpression(expr) && expr.operatorToken.kind === ts.SyntaxKind.PlusToken && containsStringLiteral(expr)) {
    ctx.handled.add(expr);
    const built = buildFromConcat(expr, ctx);
    if (built && accept(built.key.replace(/\{\{\w+\}\}/g, ' x '))) edit(ctx, expr, callText(ctx, built), built.key);
  } else if (ts.isConditionalExpression(expr)) {
    wrapStringish(expr.whenTrue, ctx, level);
    wrapStringish(expr.whenFalse, ctx, level);
  } else if (ts.isBinaryExpression(expr) && [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.AmpersandAmpersandToken].includes(expr.operatorToken.kind)) {
    wrapStringish(expr.right, ctx, level);
    if (expr.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken) wrapStringish(expr.left, ctx, level);
  }
}

function conditionalHasSentence(node) {
  const leaves = [];
  const collect = (n) => {
    while (ts.isParenthesizedExpression(n)) n = n.expression;
    if (ts.isConditionalExpression(n)) {
      collect(n.whenTrue);
      collect(n.whenFalse);
    } else leaves.push(n);
  };
  collect(node);
  const text = (n) => (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) ? n.text
    : ts.isTemplateExpression(n) ? [n.head.text, ...n.templateSpans.map((s) => s.literal.text)].join(' x ') : null);
  return leaves.some((l) => { const s = text(l); return s != null && isSentence(s); })
    && leaves.every((l) => { const s = text(l); return s == null || !/^\s*$/.test(s) && !isClassListLike(s); });
}

function isClassListLike(s) {
  return /^[a-z0-9:[\]/.!#%-]+(?:\s+[a-z0-9:[\]/.!#%-]+)*$/.test(s.trim()) && /-/.test(s);
}

function containsStringLiteral(expr) {
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr) || ts.isTemplateExpression(expr)) return true;
  if (ts.isBinaryExpression(expr) && expr.operatorToken.kind === ts.SyntaxKind.PlusToken) return containsStringLiteral(expr.left) || containsStringLiteral(expr.right);
  if (ts.isParenthesizedExpression(expr)) return containsStringLiteral(expr.expression);
  return false;
}

function edit(ctx, node, text, key) {
  if (isIgnored(ctx, node)) return;
  ctx.edits.push({ start: node.getStart(ctx.sf), end: node.end, text });
  ctx.wrapped.push({ line: lineOf(ctx, node), key });
}

/** A line with an `i18n-ignore` comment (or right after one) is left as written. */
function isIgnored(ctx, node) {
  const { line } = ctx.sf.getLineAndCharacterOfPosition(node.getStart(ctx.sf));
  const lines = ctx.source.split('\n');
  return /i18n-ignore/.test(lines[line] ?? '') || /^\s*(?:\/\/|\{?\/\*).*i18n-ignore/.test(lines[line - 1] ?? '');
}

function lineOf(ctx, node) {
  return ctx.sf.getLineAndCharacterOfPosition(node.getStart(ctx.sf)).line + 1;
}

function callText(ctx, built) {
  const entries = Object.entries(built.params);
  if (!entries.length) return `${ctx.fn}(${jsString(built.key)})`;
  const params = entries.map(([name, code]) => (name === code ? name : `${name}: ${code}`)).join(', ');
  return `${ctx.fn}(${jsString(built.key)}, { ${params} })`;
}

/** Source text of an expression used as a placeholder value, with its own text wrapped. */
function paramCode(expr, ctx) {
  let node = expr;
  while (ts.isParenthesizedExpression(node)) node = node.expression;
  if (ts.isConditionalExpression(node)) {
    return `${node.condition.getText(ctx.sf)} ? ${paramCode(node.whenTrue, ctx)} : ${paramCode(node.whenFalse, ctx)}`;
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && isStringNode(node.right)) {
    return `${node.left.getText(ctx.sf)} ? ${paramCode(node.right, ctx)} : ''`;
  }
  if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && isUiText(node.text)) {
    return `${ctx.fn}(${jsString(node.text)})`;
  }
  if (ts.isTemplateExpression(node)) {
    const built = buildFromTemplate(node, ctx);
    if (built) return callText(ctx, built);
  }
  return node.getText(ctx.sf);
}

function isStringNode(n) {
  return ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateExpression(n);
}

/** Picks a readable placeholder name: `count`, `name`, `total`, then p1, p2. */
function placeholderName(expr, taken, ctx) {
  let node = expr;
  while (ts.isParenthesizedExpression(node) || ts.isNonNullExpression(node) || ts.isAsExpression(node)) node = node.expression;
  let base = null;
  if (ts.isIdentifier(node)) base = node.text;
  else if (ts.isPropertyAccessExpression(node)) base = node.name.text === 'length' ? 'count' : node.name.text;
  else if (ts.isCallExpression(node)) {
    const arg = node.arguments[0];
    if (arg && (ts.isIdentifier(arg) || ts.isPropertyAccessExpression(arg))) base = placeholderName(arg, new Map(), ctx);
    else if (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'toLocaleString') base = placeholderName(node.expression.expression, new Map(), ctx);
    // fmt(b) says less than its function name: expiryText(b) -> expiryText.
    if ((!base || base === 'value' || base.length <= 2) && ts.isIdentifier(node.expression) && !/^(?:fmt|format|f|n|num|money|String|Number)$/.test(node.expression.text)) base = node.expression.text;
  }
  if (!base || !/^[A-Za-z_]\w*$/.test(base)) base = 'value';
  const code = paramCode(expr, ctx);
  for (const [n, c] of taken) if (c === code) return n;
  let name = base;
  for (let i = 2; taken.has(name); i++) name = `${base}${i}`;
  taken.set(name, code);
  return name;
}

function buildFromTemplate(expr, ctx) {
  const taken = new Map();
  let key = expr.head.text;
  for (const span of expr.templateSpans) {
    key += `{{${placeholderName(span.expression, taken, ctx)}}}` + span.literal.text;
  }
  if (!hasLetter(key.replace(/\{\{\w+\}\}/g, ''))) return null;
  return { key, params: Object.fromEntries(taken) };
}

function buildFromConcat(expr, ctx) {
  const parts = [];
  const flatten = (n) => {
    while (ts.isParenthesizedExpression(n)) n = n.expression;
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      flatten(n.left);
      flatten(n.right);
    } else parts.push(n);
  };
  flatten(expr);
  // Numeric additions at the start (a + b + ' items') cannot be split safely.
  if (!(ts.isStringLiteral(parts[0]) || ts.isNoSubstitutionTemplateLiteral(parts[0]) || ts.isTemplateExpression(parts[0]))
    && !(parts[1] && (ts.isStringLiteral(parts[1]) || ts.isNoSubstitutionTemplateLiteral(parts[1]) || ts.isTemplateExpression(parts[1])))) return null;
  const taken = new Map();
  let key = '';
  for (const p of parts) {
    if (ts.isStringLiteral(p) || ts.isNoSubstitutionTemplateLiteral(p)) key += p.text;
    else if (ts.isTemplateExpression(p)) {
      key += p.head.text;
      for (const span of p.templateSpans) key += `{{${placeholderName(span.expression, taken, ctx)}}}` + span.literal.text;
    } else key += `{{${placeholderName(p, taken, ctx)}}}`;
  }
  if (!hasLetter(key.replace(/\{\{\w+\}\}/g, ''))) return null;
  return { key, params: Object.fromEntries(taken) };
}

// ---- JSX children -----------------------------------------------------------

/**
 * Splits children into runs of text and inline expressions and turns each run
 * that holds words into one t() call. Elements end a run.
 */
function processJsxChildren(node, ctx) {
  const runs = [];
  let current = [];
  for (const child of node.children) {
    if (ts.isJsxText(child) || (ts.isJsxExpression(child) && isInlineExpression(child))) current.push(child);
    else {
      if (current.length) runs.push(current);
      current = [];
    }
  }
  if (current.length) runs.push(current);

  const textRuns = runs.filter((run) => run.some((c) => ts.isJsxText(c) && hasLetter(c.text)));
  if (textRuns.length > 1 && node.children.some((c) => ts.isJsxElement(c) || ts.isJsxSelfClosingElement(c))) {
    ctx.rich.push({ line: lineOf(ctx, node), text: textRuns.map((r) => r.filter(ts.isJsxText).map((c) => c.text.trim()).join(' ')).join(' … ').slice(0, 120) });
  }
  for (const run of textRuns) wrapRun(run, ctx);
  // Expression children outside text runs: wrap their string branches.
  for (const child of node.children) {
    if (ts.isJsxExpression(child) && child.expression && !textRuns.some((r) => r.includes(child))) {
      wrapStringish(child.expression, ctx, 'ui');
    }
  }
}

function isInlineExpression(child) {
  const e = child.expression;
  if (!e) return false; // {/* comment */}
  let node = e;
  while (ts.isParenthesizedExpression(node)) node = node.expression;
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) return false;
  if (containsJsx(node)) return false;
  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'map') return false;
  if (ts.isStringLiteral(node) && /^\s+$/.test(node.text)) return true; // {' '}
  return true;
}

function containsJsx(node) {
  let found = false;
  const walk = (n) => {
    if (found) return;
    if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n)) found = true;
    else ts.forEachChild(n, walk);
  };
  walk(node);
  return found;
}

function wrapRun(run, ctx) {
  const taken = new Map();
  let key = '';
  for (const child of run) {
    if (ts.isJsxText(child)) {
      const decoded = decodeEntities(cleanJsxText(child.text));
      if (decoded == null) {
        ctx.left.push({ line: lineOf(ctx, child), text: child.text.trim().slice(0, 120), why: 'unknown HTML entity' });
        return;
      }
      key += decoded;
    } else {
      let e = child.expression;
      while (ts.isParenthesizedExpression(e)) e = e.expression;
      if ((ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) && !hasLetter(e.text)) key += e.text; // {' '}, {'·'}
      else if (isTranslatorCall(e, ctx)) return; // already translated pieces: leave the run alone
      else key += `{{${placeholderName(e, taken, ctx)}}}`;
    }
  }
  const lead = /^\s/.test(key) ? "{' '}" : '';
  const trail = /\s$/.test(key) ? "{' '}" : '';
  const trimmed = key.trim();
  if (!isUiText(trimmed.replace(/\{\{\w+\}\}/g, ' '))) return;
  const first = run[0];
  const last = run[run.length - 1];
  // `key` was built from rendered text (cleanJsxText drops whitespace that holds a
  // line break), so an edge space in it is one React really renders.
  const leadText = lead;
  const trailText = trail;
  const start = ts.isJsxText(first) ? first.pos + (first.text.length - first.text.trimStart().length) : first.getStart(ctx.sf);
  const end = ts.isJsxText(last) ? last.end - (last.text.length - last.text.trimEnd().length) : last.end;
  const call = callText(ctx, { key: trimmed, params: Object.fromEntries(taken) });
  if (isIgnored(ctx, first.kind === ts.SyntaxKind.JsxText ? run.find((c) => !ts.isJsxText(c) || c.text.trim()) ?? first : first)) return;
  ctx.edits.push({ start, end, text: `${leadText}{${call}}${trailText}` });
  ctx.wrapped.push({ line: lineOf(ctx, first.kind === ts.SyntaxKind.JsxText ? run.find((c) => ts.isJsxText(c) && c.text.trim()) ?? first : first), key: trimmed });
  for (const c of run) ctx.handled.add(c);
}

// ---- Leftovers --------------------------------------------------------------

/** Sentence-like strings that were not wrapped and are not in a technical spot. */
function collectLeftovers(sf, ctx) {
  const walk = (n) => {
    if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n) || ts.isLiteralTypeNode(n)) return;
    if (ctx.handled.has(n) || isTranslatorCall(n, ctx)) return;
    if (ts.isCallExpression(n) && /^console\./.test(n.expression.getText(sf))) return;
    if (ts.isCallExpression(n) && /(?:querySelector(?:All)?|closest|toLocale\w*|addEventListener|removeEventListener|getItem|setItem|removeItem|matchMedia|createElement|setAttribute|getAttribute|replace|replaceAll|split|join|startsWith|endsWith|includes|indexOf|test|match|matchAll|format|DateTimeFormat|NumberFormat|Date)$/.test(n.expression.getText(sf))) return;
    if (ts.isCallExpression(n) && /^(?:cn|clsx|cx|twMerge|classNames)$/.test(n.expression.getText(sf))) return;
    if (ts.isJsxAttribute(n) && (TECHNICAL_NAMES.has(n.name.getText(sf)) || /^data-/.test(n.name.getText(sf)))) return;
    if (ts.isPropertyAssignment(n) && TECHNICAL_NAMES.has(propName(n.name) ?? '')) return;
    if (ts.isBinaryExpression(n) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken, ts.SyntaxKind.InKeyword].includes(n.operatorToken.kind)) return;
    if (ts.isCaseClause(n)) {
      n.statements.forEach(walk);
      return;
    }
    if (ts.isElementAccessExpression(n)) return;
    if (ts.isJsxText(n)) {
      const text = cleanJsxText(n.text).trim();
      const parentTag = ts.isJsxElement(n.parent) ? tagName(n.parent.openingElement) : '';
      if (text && hasLetter(text) && !ctx.wrapped.some((w) => w.line === lineOf(ctx, n)) && !SKIP_ELEMENTS.has(parentTag) && isUiText(text)) {
        ctx.left.push({ line: lineOf(ctx, n), text: text.slice(0, 120), why: 'JSX text' });
      }
      return;
    }
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      const p = n.parent;
      const isKey = (ts.isPropertyAssignment(p) && p.name === n) || ts.isPropertyAccessExpression(p);
      if (!isKey && isSentence(n.text)) {
        if (ARGS.flags.loose) wrapStringish(n, ctx, 'sentence');
        else ctx.left.push({ line: lineOf(ctx, n), text: n.text.slice(0, 120), why: describeSpot(n, sf) });
      }
      return;
    }
    if (ts.isTemplateExpression(n)) {
      const stat = [n.head.text, ...n.templateSpans.map((s) => s.literal.text)].join(' x ');
      if (isSentence(stat)) {
        if (ARGS.flags.loose) {
          wrapStringish(n, ctx, 'sentence');
          return;
        }
        ctx.left.push({ line: lineOf(ctx, n), text: n.getText(sf).slice(0, 120), why: describeSpot(n, sf) });
      }
    }
    ts.forEachChild(n, walk);
  };
  walk(sf);
}

function describeSpot(n, sf) {
  const p = n.parent;
  if (ts.isPropertyAssignment(p)) return `key "${propName(p.name) ?? '?'}"`;
  if (ts.isJsxAttribute(p) || (ts.isJsxExpression(p) && ts.isJsxAttribute(p.parent))) return `prop "${(ts.isJsxAttribute(p) ? p : p.parent).name.getText(sf)}"`;
  if (ts.isCallExpression(p)) return `argument of ${p.expression.getText(sf).slice(0, 40)}()`;
  if (ts.isVariableDeclaration(p)) return `variable ${p.name.getText(sf)}`;
  if (ts.isArrayLiteralExpression(p)) return 'array item';
  if (ts.isReturnStatement(p)) return 'return value';
  return ts.SyntaxKind[p.kind];
}

// ---- Output -----------------------------------------------------------------

function printReport(r) {
  const verbose = !!ARGS.flags.verbose;
  if (!ARGS.flags.quiet) {
    for (const f of r.files) {
      console.log(`${f.file}  wrapped ${f.wrapped.length}, left ${f.left.length}${f.rich.length ? `, rich ${f.rich.length}` : ''}`);
      if (verbose) {
        for (const w of f.wrapped) console.log(`   + ${w.line}: ${w.key}`);
        for (const l of f.left) console.log(`   ? ${l.line}: ${l.text}   [${l.why}]`);
        for (const l of f.rich) console.log(`   ~ ${l.line}: ${l.text}   [text split by elements: use <Trans>]`);
      }
    }
  }
  const t = r.totals;
  console.log(`\n${ARGS.flags.write ? 'Wrapped' : 'Would wrap'} ${t.wrapped} text(s) in ${t.changedFiles} file(s). Left ${t.left} for review, ${t.rich} rich-text spot(s).`);
  if (!ARGS.flags.write) console.log('Dry run. Add --write to edit the files, --verbose to list every string.');
}
