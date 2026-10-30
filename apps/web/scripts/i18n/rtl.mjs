#!/usr/bin/env node
/**
 * i18n:rtl — makes layouts follow the text direction (needed for Urdu).
 *
 *   node scripts/i18n/rtl.mjs <file-or-folder...> [--write] [--verbose]
 *
 * Physical Tailwind classes become logical ones, which are identical in
 * left-to-right languages and mirror in right-to-left:
 *   ml/mr -> ms/me, pl/pr -> ps/pe, left/right -> start/end,
 *   text-left/right -> text-start/end, rounded-l/r/tl/... -> rounded-s/e/ss/...,
 *   border-l/r -> border-s/e, float-left/right -> float-start/end,
 *   space-x-* and divide-x-* get rtl:space-x-reverse / rtl:divide-x-reverse.
 * Directional icons (ChevronLeft/Right, ArrowLeft/Right, ...) get the
 * `rtl-flip` class so they point the right way.
 *
 * Left alone and reported: strings that combine left/right with translate-x
 * (centering and slide-in panels need a person to decide), translate-x on its
 * own (switch knobs, slides), origin-left/right, and rotated icons.
 * Classes that already carry an ltr:/rtl: variant are never changed.
 */

import fs from 'node:fs';
import ts from 'typescript';
import { listFiles, parseArgs, rel } from './lib/files.mjs';

const { flags, positional } = parseArgs(process.argv.slice(2), ['write', 'verbose']);
if (!positional.length) {
  console.error('Usage: node scripts/i18n/rtl.mjs <file-or-folder...> [--write] [--verbose]');
  process.exit(2);
}

const DIRECTIONAL_ICON = /^(?:Chevron|Chevrons|Arrow|ArrowBig|Move|CircleArrow|CircleChevron|SquareArrow|SquareChevron|ArrowLeftTo|ArrowRightTo|Undo|Redo|CornerDown|CornerUp|Reply|Forward|LogIn|LogOut|PanelLeft|PanelRight)(?:Left|Right)?(?:Icon)?$/;
const FLIPPABLE = /(?:Left|Right)(?:Icon)?$|^(?:Undo|Redo|Reply|Forward|LogIn|LogOut)(?:Icon)?$/;

const SIMPLE = [
  [/^ml-(.+)$/, 'ms-$1'], [/^mr-(.+)$/, 'me-$1'],
  [/^pl-(.+)$/, 'ps-$1'], [/^pr-(.+)$/, 'pe-$1'],
  [/^text-left$/, 'text-start'], [/^text-right$/, 'text-end'],
  [/^float-left$/, 'float-start'], [/^float-right$/, 'float-end'],
  [/^rounded-l$/, 'rounded-s'], [/^rounded-r$/, 'rounded-e'],
  [/^rounded-l-(.+)$/, 'rounded-s-$1'], [/^rounded-r-(.+)$/, 'rounded-e-$1'],
  [/^rounded-tl(-.+)?$/, 'rounded-ss$1'], [/^rounded-tr(-.+)?$/, 'rounded-se$1'],
  [/^rounded-bl(-.+)?$/, 'rounded-es$1'], [/^rounded-br(-.+)?$/, 'rounded-ee$1'],
  [/^border-l$/, 'border-s'], [/^border-r$/, 'border-e'],
  [/^border-l-(.+)$/, 'border-s-$1'], [/^border-r-(.+)$/, 'border-e-$1'],
];
const POSITION = [[/^left-(.+)$/, 'start-$1'], [/^right-(.+)$/, 'end-$1']];

/** Splits `sm:hover:!-ml-2` into variants, important flag, sign and the utility. */
function splitToken(tok) {
  const m = /^((?:[^\s:]+:)*)(!?)(-?)(.+)$/.exec(tok);
  return m ? { variants: m[1], important: m[2], neg: m[3], core: m[4] } : null;
}

function convertClassString(text, report) {
  const tokens = text.split(/(\s+)/);
  const words = tokens.filter((t) => t && !/^\s+$/.test(t));
  if (!words.length) return text;
  const hasTranslate = words.some((w) => /(?:^|:)-?translate-x-/.test(w));
  const hasPosition = words.some((w) => /(?:^|:)-?(?:left|right)-/.test(w));
  if (hasTranslate) report.push(hasPosition ? 'left/right with translate-x (kept physical)' : 'translate-x (check direction)');
  if (words.some((w) => /(?:^|:)origin-(?:left|right|top-left|top-right|bottom-left|bottom-right)$/.test(w))) report.push('origin-left/right');

  let changed = false;
  const out = tokens.map((tok) => {
    if (!tok || /^\s+$/.test(tok)) return tok;
    const p = splitToken(tok);
    if (!p || /(?:^|:)(?:ltr|rtl):/.test(p.variants)) return tok;
    const rules = hasTranslate ? SIMPLE : [...SIMPLE, ...POSITION];
    for (const [re, to] of rules) {
      if (re.test(p.core)) {
        changed = true;
        return `${p.variants}${p.important}${p.neg}${p.core.replace(re, to)}`;
      }
    }
    return tok;
  });
  let result = out.join('');
  const add = (needle, cls) => {
    if (words.some((w) => new RegExp(`(?:^|:)${needle}-(?!reverse)`).test(w)) && !result.includes(cls)) {
      result = `${result.replace(/\s+$/, '')} ${cls}${/\s$/.test(result) ? ' ' : ''}`;
      changed = true;
    }
  };
  add('space-x', 'rtl:space-x-reverse');
  add('divide-x', 'rtl:divide-x-reverse');
  return changed ? result : text;
}

/** Only strings that look like class lists are touched. */
function looksLikeClasses(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return false;
  return words.every((w) => /^[!-]?[a-z0-9[\]&>_:./%#@*()'"=,-]+$/i.test(w)) && words.some((w) => /^(?:[^\s:]+:)*!?-?[a-z]+-/.test(w));
}

const totals = { files: 0, classEdits: 0, icons: 0, notes: 0 };

for (const file of listFiles(positional)) {
  const source = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const edits = [];
  const notes = [];
  const line = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;

  const handleText = (node, raw, startOffset, isTemplatePart) => {
    if (!looksLikeClasses(raw)) return;
    const report = [];
    // A template part touching ${...} may end in half a class name; leave its edges alone.
    let core = raw;
    let lead = '';
    let trail = '';
    if (isTemplatePart) {
      const m = /^(\S*)([\s\S]*?)(\S*)$/.exec(raw);
      if (!ts.isTemplateHead(node) && !ts.isNoSubstitutionTemplateLiteral(node)) { lead = m[1]; core = raw.slice(lead.length); }
      if (!ts.isTemplateTail(node) && !ts.isNoSubstitutionTemplateLiteral(node)) {
        const t = /(\S*)$/.exec(core)[1];
        trail = t;
        core = core.slice(0, core.length - t.length);
      }
    }
    const next = convertClassString(core, report);
    for (const r of report) notes.push({ line: line(node), note: r, text: raw.trim().slice(0, 100) });
    if (next !== core) {
      edits.push({ start: startOffset, end: startOffset + raw.length, text: lead + next + trail });
      totals.classEdits++;
    }
  };

  const visit = (n) => {
    if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) return;
    const isKey = !!n.parent && ts.isPropertyAssignment(n.parent) && n.parent.name === n;
    if (ts.isStringLiteral(n) && !isKey && !ts.isLiteralTypeNode(n.parent) && !ts.isImportDeclaration(n.parent)) {
      handleText(n, n.text, n.getStart(sf) + 1, false);
    } else if (ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) {
      // Text starts after the opening ` or the } that closes ${...}.
      handleText(n, n.rawText ?? n.text, n.getStart(sf) + 1, true);
    }
    if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && ts.isIdentifier(n.tagName)) {
      const tag = n.tagName.text;
      if (DIRECTIONAL_ICON.test(tag) && FLIPPABLE.test(tag)) flipIcon(n);
    }
    ts.forEachChild(n, visit);
  };

  function flipIcon(el) {
    const cls = el.attributes.properties.find((a) => ts.isJsxAttribute(a) && a.name.getText(sf) === 'className');
    if (!cls) {
      edits.push({ start: el.tagName.end, end: el.tagName.end, text: ' className="rtl-flip"' });
      totals.icons++;
      return;
    }
    const src = cls.getText(sf);
    if (src.includes('rtl-flip')) return;
    if (/rotate-|rtl:/.test(src)) {
      notes.push({ line: line(el), note: 'icon with rotate/rtl classes (not flipped)', text: src.slice(0, 100) });
      return;
    }
    const init = cls.initializer;
    if (init && ts.isStringLiteral(init)) {
      edits.push({ start: init.end - 1, end: init.end - 1, text: ' rtl-flip' });
    } else if (init && ts.isJsxExpression(init) && init.expression) {
      const e = init.expression;
      if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) edits.push({ start: e.end - 1, end: e.end - 1, text: ' rtl-flip' });
      else if (ts.isTemplateExpression(e)) edits.push({ start: e.end - 1, end: e.end - 1, text: ' rtl-flip' });
      else if (ts.isCallExpression(e)) edits.push({ start: e.end - 1, end: e.end - 1, text: ", 'rtl-flip'" });
      else edits.push({ start: e.getStart(sf), end: e.end, text: `\`\${${e.getText(sf)}} rtl-flip\`` });
    } else return;
    totals.icons++;
  }

  visit(sf);
  if (edits.length || notes.length) {
    totals.files++;
    totals.notes += notes.length;
    console.log(`${rel(file)}  ${edits.length} change(s)${notes.length ? `, ${notes.length} to check` : ''}`);
    if (flags.verbose) for (const nt of notes) console.log(`   ? ${nt.line}: ${nt.note}  —  ${nt.text}`);
  }
  if (edits.length && flags.write) {
    // Edits never overlap: each touches one literal or one icon tag.
    let out = source;
    for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
    fs.writeFileSync(file, out);
  }
}

console.log(`\n${flags.write ? 'Changed' : 'Would change'} ${totals.classEdits} class string(s) and ${totals.icons} icon(s); ${totals.notes} spot(s) to check by hand.`);
if (!flags.write) console.log('Dry run. Add --write to edit the files, --verbose to list the spots to check.');
