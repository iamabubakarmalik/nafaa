/**
 * Cache tags (ARCH 7.3). The tag strings themselves live in the contract so
 * the API's fan-out and the site's fetches can never disagree; this file adds
 * the checks the revalidate route applies to an incoming list.
 */
import { REVALIDATION, cacheTags } from './contract/cms-contract';

export { cacheTags };

/**
 * Deduplicates a tag list from the API. More than `REVALIDATION.maxTags`
 * collapses to `all` (revalidateTag only marks entries stale, so this is safe).
 */
export function normalizeTags(tags: readonly string[]): string[] {
  const unique = [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
  if (unique.length > REVALIDATION.maxTags) return [cacheTags.all];
  return unique;
}
