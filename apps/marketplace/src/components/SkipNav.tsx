export function SkipNav() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-brand-600 focus:text-white focus:font-black focus:shadow-brand focus:outline-none focus:ring-4 focus:ring-brand-500/40"
    >
      Skip to main content
    </a>
  );
}
