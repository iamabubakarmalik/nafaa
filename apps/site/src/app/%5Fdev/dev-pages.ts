/**
 * The /_dev galleries are for building and reviewing the design system. They
 * render in `next dev`, and in a production build only when SITE_DEV_PAGES=true
 * (staging review). Everywhere else they return 404, and they are always
 * noindex (metadata here and an X-Robots-Tag header in next.config.ts).
 *
 * The folder is named `%5Fdev` because Next treats `_dev` as a private folder;
 * `%5F` is the URL-encoded underscore, so the route is still /_dev.
 */
export const devPagesEnabled =
  process.env.NODE_ENV !== 'production' || process.env.SITE_DEV_PAGES === 'true';
