#!/usr/bin/env node
/**
 * Copies the marketing CMS contract into the apps that use it.
 *
 *   node scripts/sync-cms-contract.mjs           write the generated copies
 *   node scripts/sync-cms-contract.mjs --check   exit 1 when a copy is missing or stale (CI)
 *
 * Source: packages/cms-contract/src/cms-contract.ts (the only file to edit).
 * Copies: apps/api, apps/admin and apps/site each get a GENERATED file with a
 * header carrying the source hash. A copy is used instead of a workspace
 * import so the API keeps its NodeNext/CommonJS build and apps/site stays a
 * standalone pnpm project.
 *
 * In --check mode an app that does not exist yet (no package.json) is skipped
 * with a notice, so the check can run before every app is scaffolded.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = 'packages/cms-contract/src/cms-contract.ts';
const TARGETS = [
  { app: 'apps/api', file: 'apps/api/src/admin-marketing/cms/contract/cms-contract.ts' },
  { app: 'apps/admin', file: 'apps/admin/src/features/marketing/cms/contract/cms-contract.ts' },
  { app: 'apps/site', file: 'apps/site/src/lib/cms/contract/cms-contract.ts' },
];

const check = process.argv.includes('--check');

function render(source) {
  const hash = createHash('sha256').update(source).digest('hex').slice(0, 16);
  const header = [
    '/* eslint-disable */',
    '// GENERATED FILE. Do not edit.',
    `// Source: ${SOURCE} (sha256 ${hash}).`,
    '// Edit the source, then run `node scripts/sync-cms-contract.mjs`.',
    '',
  ].join('\n');
  return `${header}${source.endsWith('\n') ? source : `${source}\n`}`;
}

const sourcePath = join(ROOT, SOURCE);
if (!existsSync(sourcePath)) {
  console.error(`sync-cms-contract: source not found: ${SOURCE}`);
  process.exit(1);
}
const expected = render(readFileSync(sourcePath, 'utf8'));

let stale = 0;
for (const target of TARGETS) {
  const targetPath = join(ROOT, target.file);
  const label = relative(ROOT, targetPath);
  const appExists = existsSync(join(ROOT, target.app, 'package.json'));
  const current = existsSync(targetPath) ? readFileSync(targetPath, 'utf8') : null;

  if (check) {
    if (current === expected) {
      console.log(`ok       ${label}`);
    } else if (!appExists) {
      console.log(`skipped  ${label} (${target.app} has no package.json yet)`);
    } else {
      stale += 1;
      console.error(`${current === null ? 'missing' : 'stale'}  ${label}`);
    }
    continue;
  }

  if (current === expected) {
    console.log(`same     ${label}`);
    continue;
  }
  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, expected);
  console.log(`written  ${label}`);
}

if (check && stale > 0) {
  console.error(`sync-cms-contract: ${stale} copy(ies) out of date. Run: node scripts/sync-cms-contract.mjs`);
  process.exit(1);
}
