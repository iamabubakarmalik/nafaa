#!/usr/bin/env node
/**
 * Copies the shared design tokens from the web app into the marketing site.
 *
 * Source: apps/web/src/design-system/styles/tokens.css (the `:root` block).
 * Target: apps/site/src/styles/tokens.css (GENERATED, do not edit by hand).
 *
 * Only the variables the site uses are copied: the brand scale, the brand
 * foreground, the font stacks, the focus ring colour and the base surfaces.
 * App-only parts (density, radius scale, app shell, dark class, print rules,
 * runtime appearance overrides) are dropped on purpose.
 *
 * Usage:
 *   node scripts/sync-tokens.mjs           write the target file
 *   node scripts/sync-tokens.mjs --check   exit 1 when the target is missing or stale
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const siteRoot = resolve(here, '..');
const repoRoot = resolve(siteRoot, '..', '..');
const sourcePath = resolve(repoRoot, 'apps/web/src/design-system/styles/tokens.css');
const targetPath = resolve(siteRoot, 'src/styles/tokens.css');

/** Variables copied from the source `:root`, in output order. */
const KEEP = [
  /^--brand-(50|[1-9]00|950)$/,
  /^--brand-fg$/,
  /^--brand-hex$/,
  /^--font-(latin|urdu|mono)$/,
  /^--ring-color$/,
  /^--(surface|surface-muted|fg|fg-subtle|line)$/,
];

/** Variables the site relies on; the check fails when the source drops one. */
const REQUIRED = [
  '--brand-50', '--brand-100', '--brand-200', '--brand-300', '--brand-400', '--brand-500',
  '--brand-600', '--brand-700', '--brand-800', '--brand-900', '--brand-950',
  '--font-latin', '--font-mono', '--surface', '--fg', '--line',
];

function fail(message) {
  console.error(`sync-tokens: ${message}`);
  process.exit(1);
}

function readRootBlock(css) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const match = withoutComments.match(/(^|\})\s*:root\s*\{([^}]*)\}/m);
  if (!match) fail(`no :root block found in ${relative(repoRoot, sourcePath)}`);
  return match[2];
}

function parseDeclarations(block) {
  const out = [];
  for (const raw of block.split(';')) {
    const decl = raw.trim();
    if (!decl.startsWith('--')) continue;
    const colon = decl.indexOf(':');
    if (colon === -1) continue;
    const name = decl.slice(0, colon).trim();
    const value = decl.slice(colon + 1).trim().replace(/\s+/g, ' ');
    out.push({ name, value });
  }
  return out;
}

function render(source) {
  const declarations = parseDeclarations(readRootBlock(source));
  const kept = [];
  for (const pattern of KEEP) {
    for (const d of declarations) {
      if (pattern.test(d.name) && !kept.includes(d)) kept.push(d);
    }
  }
  const names = new Set(kept.map((d) => d.name));
  const missing = REQUIRED.filter((name) => !names.has(name));
  if (missing.length) fail(`source is missing required variables: ${missing.join(', ')}`);

  const lines = kept.map((d) => `  ${d.name}: ${d.value};`);
  // Hash only what is copied, so unrelated edits to the source (dark theme,
  // shell, comments) do not make the generated file stale.
  const hash = createHash('sha256').update(lines.join('\n')).digest('hex').slice(0, 16);
  return [
    '/* GENERATED FILE. Do not edit.',
    ` * Source: apps/web/src/design-system/styles/tokens.css (copied values sha256 ${hash}).`,
    ' * Run `pnpm tokens:sync` in apps/site after the source changes.',
    ' * Brand values are bare RGB channels: rgb(var(--brand-700) / <alpha>).',
    ' */',
    ':root {',
    ...lines,
    '}',
    '',
  ].join('\n');
}

if (!existsSync(sourcePath)) fail(`source not found: ${sourcePath}`);
const expected = render(readFileSync(sourcePath, 'utf8'));
const current = existsSync(targetPath) ? readFileSync(targetPath, 'utf8') : null;

if (process.argv.includes('--check')) {
  if (current !== expected) {
    fail(`${relative(repoRoot, targetPath)} is ${current === null ? 'missing' : 'out of date'}. Run: pnpm tokens:sync`);
  }
  console.log('sync-tokens: up to date');
} else if (current === expected) {
  console.log('sync-tokens: already up to date');
} else {
  writeFileSync(targetPath, expected);
  console.log(`sync-tokens: wrote ${relative(repoRoot, targetPath)}`);
}
