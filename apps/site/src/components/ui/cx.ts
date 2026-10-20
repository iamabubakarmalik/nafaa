/** Joins class names, skipping falsy values. No merging: variants are designed not to conflict. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
