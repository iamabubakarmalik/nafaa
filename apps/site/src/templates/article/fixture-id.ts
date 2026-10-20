/** Id prefix that marks a development fixture (same prefix as the S4 fixtures, so one rule spots them all). */
export const FIXTURE_ID_PREFIX = 'fixture__';

export function isFixture(entry: { id: string }): boolean {
  return entry.id.startsWith(FIXTURE_ID_PREFIX);
}
