/**
 * Running numbers for industry records (tailoring orders, alteration
 * tickets, repair jobs). Money for these jobs is booked through
 * industries/_shared/industry-sale.helper.
 */

/**
 * Next running number for a prefix such as "TO-2026-". Reads the highest
 * number used so far instead of counting rows, so a deleted record never
 * makes the next number collide with an existing one.
 */
export async function nextRunningNumber(
  find: (prefix: string) => Promise<string | null | undefined>,
  prefix: string,
  width = 4,
) {
  const last = await find(prefix);
  const n = last ? parseInt(last.slice(prefix.length), 10) : 0;
  return `${prefix}${String((Number.isFinite(n) ? n : 0) + 1).padStart(width, '0')}`;
}
