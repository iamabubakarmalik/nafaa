/**
 * Root layout: the site shell (ARCH 3, S1).
 *
 * - Data: the `en` layout (menus + site settings, tag `layout:en`) and the
 *   entity facts (tags `settings`, `plans`). Both are cached; the page stays
 *   static and revalidates on publish.
 * - Theme: ThemeScript in <head> applies a stored light/dark choice before
 *   the first paint; with no choice the device setting wins (theme.css).
 *   suppressHydrationWarning on <html> covers the attributes it sets.
 * - Locale: English at the root. /ur pages are served by the catch-all with
 *   lang/dir on their content; when Urdu launches, the shell moves into
 *   per-locale root layouts (see the S1 report).
 * - Kept from the F2 scaffold: globals.css, fontVariables on <html>,
 *   <MotionObserver /> once, and <main id="main"> around the page.
 * - Islands: MotionObserver, Analytics, ConsentBanner (renders nothing until
 *   third-party analytics is configured), MobileNav, MegaMenuController,
 *   ThemeToggle; PreviewBar only in draft mode.
 */
import type { Metadata, Viewport } from 'next';
import { draftMode } from 'next/headers';
import type { ReactNode } from 'react';
import { PreviewBar } from '@/components/layout/PreviewBar';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { ThemeScript } from '@/components/layout/ThemeScript';
import { Analytics } from '@/components/islands/Analytics';
import { ConsentBanner } from '@/components/islands/ConsentBanner';
import { MotionObserver } from '@/components/motion/MotionObserver';
import { getEntity, getLayout, getPreviewToken, validatePreviewToken } from '@/lib/cms/client';
import { siteIndexable, siteUrl } from '@/lib/cms/env';
import { PREVIEW } from '@/lib/cms/preview';
import { DEFAULT_LOCALE, OG_LOCALE, dirFor } from '@/lib/cms/locale';
import { fontVariables } from '@/styles/fonts';
import '@/styles/globals.css';
import '@/components/layout/theme.css';

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getLayout(DEFAULT_LOCALE);
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: site.name, template: `%s | ${site.name}` },
    applicationName: site.name,
    robots: siteIndexable() ? undefined : { index: false, follow: false },
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: '48x48' },
        { url: '/icon.svg', type: 'image/svg+xml' },
      ],
      apple: '/apple-touch-icon.png',
    },
    manifest: '/site.webmanifest',
    formatDetection: { telephone: false, email: false, address: false },
    openGraph: { siteName: site.name, type: 'website', locale: OG_LOCALE[DEFAULT_LOCALE] },
    twitter: { card: 'summary_large_image' },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#090d16' },
  ],
  colorScheme: 'light dark',
};

async function previewState(): Promise<{ expiresAt: string | null } | null> {
  if (!(await draftMode()).isEnabled) return null;
  const token = await getPreviewToken();
  const validation = token ? await validatePreviewToken(token).catch(() => null) : null;
  return { expiresAt: validation?.expiresAt ?? null };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [layout, entity, preview] = await Promise.all([
    getLayout(DEFAULT_LOCALE),
    getEntity(DEFAULT_LOCALE),
    previewState(),
  ]);
  const analytics = layout.analytics;
  const consentEnabled = Boolean(analytics?.gtmId || analytics?.clarityId);
  const privacyHref = layout.menus.legal.find((item) => /privacy/.test(item.href))?.href;

  return (
    <html lang={DEFAULT_LOCALE} dir={dirFor(DEFAULT_LOCALE)} className={fontVariables} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-dvh flex-col">
        {preview ? <PreviewBar expiresAt={preview.expiresAt} exitPath={PREVIEW.siteExitPath} /> : null}
        <SiteHeader layout={layout} />
        <main id="main" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
        <SiteFooter layout={layout} entity={entity} consentEnabled={consentEnabled} />
        <MotionObserver />
        <Analytics
          signupUrl={layout.site.signupUrl}
          gtmId={analytics?.gtmId}
          clarityId={analytics?.clarityId}
          claritySample={analytics?.claritySample}
        />
        <ConsentBanner enabled={consentEnabled} privacyHref={privacyHref} />
      </body>
    </html>
  );
}
