/**
 * Startup timing marks.
 *
 * `index.js` stamps the moment the JS bundle starts running; later steps add
 * named marks (ms since that moment). When the build sets
 * EXPO_PUBLIC_PERF_LOG=1 the marks are written to Documents/perf.json once
 * Home is interactive, so a test run can read them from the app container.
 * Without the flag nothing is written.
 */

import * as FileSystem from 'expo-file-system/legacy';

const g = globalThis as { __nafaaBootT0?: number; __nafaaMarks?: [string, number][] };
const t0 = g.__nafaaBootT0 ?? Date.now();
const marks: [string, number][] = (g.__nafaaMarks ??= []);
const LOG = process.env.EXPO_PUBLIC_PERF_LOG === '1';
let flushed = false;

/** Records a named mark once (the first time wins). */
export function perfMark(name: string): void {
  if (marks.some(([n]) => n === name)) return;
  marks.push([name, Date.now() - t0]);
}

/** Writes the marks for a test run (only in builds with EXPO_PUBLIC_PERF_LOG=1). */
export function perfFlush(): void {
  if (!LOG || flushed) return;
  flushed = true;
  const body = JSON.stringify({ t0, marks: Object.fromEntries(marks) });
  void FileSystem.writeAsStringAsync(`${FileSystem.documentDirectory}perf.json`, body).catch(() => undefined);
}
