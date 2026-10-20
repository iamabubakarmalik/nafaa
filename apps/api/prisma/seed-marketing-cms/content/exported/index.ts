/**
 * Entries written in the admin and exported with `export-entries.ts`
 * (`entries.json`, plain data reviewed in git). Empty until the first export.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SeedEntry } from '../../lib/types';

const FILE = join(__dirname, 'entries.json');

export const exportedEntries: SeedEntry[] = existsSync(FILE) ? (JSON.parse(readFileSync(FILE, 'utf8')) as SeedEntry[]) : [];
