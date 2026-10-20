/**
 * Shown only in draft mode (the root layout renders it when draftMode() is
 * on). Tells the editor the page is not live and links to exit preview; the
 * exit route returns to the page the editor was on (Referer, same site only).
 * A server component, so preview adds no client JS.
 */
export function PreviewBar({ expiresAt, exitPath }: { expiresAt: string | null; exitPath: string }) {
  const expires = expiresAt
    ? new Date(expiresAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' })
    : null;
  return (
    <div role="status" className="sticky top-0 z-[45] bg-amber-400 text-small text-slate-950">
      <div className="mx-auto box-content flex max-w-wide flex-wrap items-center justify-between gap-x-4 gap-y-1 px-gutter py-2">
        <p>
          <strong className="font-semibold">Preview: not live.</strong> This page shows the draft.
          {expires ? ` Link valid until ${expires} (PKT).` : null}
        </p>
        <a href={exitPath} className="font-semibold underline underline-offset-2">
          Exit preview
        </a>
      </div>
    </div>
  );
}
