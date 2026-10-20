/** Visible marker on development fixtures, so nobody mistakes sample content for published content. */
import { isFixture } from '../fixture-id';

export function FixtureRibbon({ entry }: { entry: { id: string } }) {
  if (!isFixture(entry)) return null;
  return (
    <div role="note" className="border-b border-amber-300/60 bg-amber-50 text-amber-900">
      <p className="mx-auto max-w-wide px-gutter py-2 text-xs font-medium">
        Development fixture: sample content shown because the local CMS has no published entry here. Never served in production.
      </p>
    </div>
  );
}
