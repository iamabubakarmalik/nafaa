import Link from 'next/link';

/** 404 inside a shop. The shop's header and footer stay around it (layout). */
export default function NotFound() {
  return (
    <section className="page flex min-h-[55vh] flex-col items-center justify-center py-20 text-center">
      <p className="font-heading text-7xl font-semibold text-fg/15">404</p>
      <h1 className="mt-2 text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 max-w-md text-muted">The page you are looking for has moved or does not exist.</p>
      <div className="mt-7 flex gap-3">
        <Link href="/" className="btn btn-primary">
          Go to home page
        </Link>
        <Link href="/collections/all" className="btn btn-outline">
          Shop all
        </Link>
      </div>
    </section>
  );
}
