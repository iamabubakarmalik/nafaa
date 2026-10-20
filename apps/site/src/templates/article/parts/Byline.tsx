/**
 * Article byline: author (a real PERSON entry), reviewer, published and
 * updated dates, reading time. Shows "Updated" on every non-PAGE type (ARCH 8
 * freshness rule). No author → the organisation is the author in schema and
 * the byline shows only the dates.
 */
import Link from 'next/link';
import type { PersonCard, PublicEntry } from '@/lib/cms/contract/cms-contract';
import { CmsImage } from '@/lib/media';
import { relativePath } from './Cards';
import { formatDate, initials, isoDate } from './format';

function Avatar({ person, size = 36 }: { person: PersonCard; size?: number }) {
  if (person.photo) {
    return (
      <span className="inline-block shrink-0 overflow-hidden rounded-full ring-2 ring-canvas" style={{ '--s': `${size}px` }}>
        <CmsImage media={person.photo} sizes={`${size}px`} aspectRatio="1:1" maxWidth={size * 2} alt="" className="size-[var(--s)] object-cover" />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-800 ring-2 ring-canvas ink:bg-brand-400/15 ink:text-brand-200"
    >
      {initials(person.title)}
    </span>
  );
}

function readingMinutes(entry: PublicEntry): number | null {
  const data = entry.data as { readingMinutes?: number };
  if (data.readingMinutes) return data.readingMinutes;
  if (entry.quality.wordCount > 0) return Math.max(1, Math.round(entry.quality.wordCount / 220));
  return null;
}

export function Byline({ entry }: { entry: PublicEntry }) {
  const { author, reviewer } = entry;
  const minutes = readingMinutes(entry);
  const published = entry.datePublished;
  const updated = entry.dateModified;
  const showUpdated = updated && formatDate(updated) !== formatDate(published);
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-small text-fg-muted">
      {author ? (
        <div className="flex items-center gap-3">
          <span className="flex -space-x-2">
            <Avatar person={author} />
            {reviewer && reviewer.id !== author.id ? <Avatar person={reviewer} /> : null}
          </span>
          <span className="leading-snug">
            <span className="block">
              By{' '}
              <Link href={relativePath(author)} rel="author" className="font-medium text-fg-strong hover:text-link">
                {author.title}
              </Link>
            </span>
            {reviewer ? (
              <span className="block text-fg-subtle">
                Reviewed by{' '}
                <Link href={relativePath(reviewer)} className="font-medium text-fg hover:text-link">
                  {reviewer.title}
                </Link>
              </span>
            ) : null}
          </span>
        </div>
      ) : null}
      <dl className="flex flex-wrap items-center gap-x-5 gap-y-1">
        {published ? (
          <div className="flex gap-1.5">
            <dt className="text-fg-subtle">Published</dt>
            <dd>
              <time dateTime={isoDate(published)}>{formatDate(published)}</time>
            </dd>
          </div>
        ) : null}
        {showUpdated || (!published && updated) ? (
          <div className="flex gap-1.5">
            <dt className="text-fg-subtle">Updated</dt>
            <dd>
              <time dateTime={isoDate(updated)}>{formatDate(updated)}</time>
            </dd>
          </div>
        ) : null}
        {minutes ? (
          <div className="flex gap-1.5">
            <dt className="sr-only">Reading time</dt>
            <dd>{minutes} min read</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}

/** Author box at the end of an article: who wrote it and what they know. */
export function AuthorBox({ person }: { person: PersonCard }) {
  return (
    <aside aria-label="About the author" className="flex gap-4 rounded-lg border border-line bg-surface-2 p-5 md:p-6">
      <Avatar person={person} />
      <div className="min-w-0">
        <p className="text-small text-fg-subtle">Written by</p>
        <p className="font-semibold text-fg-strong">
          <Link href={relativePath(person)} className="hover:text-link">
            {person.title}
          </Link>
          {person.role ? <span className="font-normal text-fg-muted">, {person.role}</span> : null}
        </p>
        {person.summary ? <p className="mt-1.5 text-small text-fg-muted">{person.summary}</p> : null}
      </div>
    </aside>
  );
}
