import { Transform } from 'class-transformer';

/**
 * Normalises an industry "item type" enum before validation. Products imported
 * from other channels (or edited with a shop category name in this field) have
 * no valid type; empty, missing or unknown values fall back to `fallback`
 * (the enum's OTHER member) so an edit never fails on it.
 */
export function normalizeEnum<T extends string>(allowed: Record<string, T>, value: unknown, fallback: T): T {
  if (typeof value === 'string') {
    const key = value.trim().toUpperCase();
    if ((Object.values(allowed) as string[]).includes(key)) return key as T;
  }
  return fallback;
}

/** Property decorator: apply the normalisation during class-transformer's plain-to-class step. */
export const EnumOrDefault = <T extends string>(allowed: Record<string, T>, fallback: T) =>
  // An absent key stays undefined so an edit keeps the stored type; present-but-empty or unknown becomes the fallback.
  Transform(({ value }) => (value === undefined ? undefined : normalizeEnum(allowed, value, fallback)));
