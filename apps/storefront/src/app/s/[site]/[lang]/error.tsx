'use client';

export default function ShopError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="page flex min-h-[50vh] flex-col items-center justify-center py-20 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-muted">Please try again in a moment.</p>
      <button type="button" className="btn btn-primary mt-6" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
