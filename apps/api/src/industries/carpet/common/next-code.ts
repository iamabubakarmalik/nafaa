/**
 * Next roll number / piece code under a prefix (CR-2026-0007, CP-2026-0012).
 *
 * Sorting the codes as text picked the wrong "last" one once other formats
 * were present (purchases write CR-2026-409640-1), so the next number could
 * repeat an existing one and the unique index rejected the save. Only codes
 * of the exact PREFIX + digits form are counted here.
 */
export async function nextCode(
  find: (prefix: string) => Promise<string[]>,
  prefix: string,
  width = 4,
): Promise<string> {
  const pattern = new RegExp(`^${prefix.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}(\\d+)$`);
  let max = 0;
  for (const code of await find(prefix)) {
    const m = pattern.exec(code);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}${String(max + 1).padStart(width, '0')}`;
}
