/**
 * Root layout: the site shell (ARCH 3, S1).
 *
 * - Data: the `en` layout (menus + site settings, tag `layout:en`) and the
 *   entity facts (tags `settings`, `plans`). Both are cached; the page stays
 *   static and revalidates on publish.
 * - Theme: ThemeScript in <head> applies a stored light/dark choice before
 *   the first paint; with no choice the device setting wins (theme.css).
 *   suppressHydrationWarning on <html> covers the attributes it sets.
 * - Locale: this layout holds the English shell. Under /ur (once settings
 *   `site.locales` lists "ur") app/ur/layout.tsx renders the Urdu shell and
 *   the English header, <main> and footer step aside (LocaleGate). <html
 *   lang dir> follows the path, in the static HTML too.
 * - Kept from the F2 scaffold: globals.css, fontVariables on <html>,
 *   <MotionObserver /> once, and <main id="main"> around the page.
 * - Islands: MotionObserver, Analytics, ConsentBanner (renders nothing until
 *   third-party analytics is configured), MobileNav, MegaMenuController,
 *   ThemeToggle; PreviewBar only in draft mode. WhatsAppFab is plain HTML
 *   and CSS on every page.
 * - Analytics ids: settings `analytics` first, then the NEXT_PUBLIC_* names
 *   the old site used on Vercel (lib/analytics/env.ts), so GA4, GTM, Clarity,
 *   the pixels and the Search Console tag carry over unchanged.
 */
import type { Metadata, Viewport } from 'next';
import { draftMode } from 'next/headers';
import type { ReactNode } from 'react';
import { PreviewBar } from '@/components/layout/PreviewBar';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { WhatsAppFab } from '@/components/layout/WhatsAppFab';
import { ThemeScript } from '@/components/layout/ThemeScript';
import { EnglishOnly, LocaleHtml, LocaleMain } from '@/components/layout/LocaleGate';
import { Analytics } from '@/components/islands/Analytics';
import { ConsentBanner } from '@/components/islands/ConsentBanner';
import { MotionObserver } from '@/components/motion/MotionObserver';
import { bingVerification, googleVerification, hasThirdParty, thirdPartyIdsFromEnv, whatsappFromEnv } from '@/lib/analytics/env';
import { getEntity, getLayout, getPairedPaths, getPreviewToken, validatePreviewToken } from '@/lib/cms/client';
import { siteIndexable, siteUrl } from '@/lib/cms/env';
import { PREVIEW } from '@/lib/cms/preview';
import { DEFAULT_LOCALE, OG_LOCALE } from '@/lib/cms/locale';
import { fontVariables } from '@/styles/fonts';
import '@/styles/globals.css';
import '@/components/layout/theme.css';

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getLayout(DEFAULT_LOCALE);
  const google = googleVerification();
  const bing = bingVerification();
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
    ...(google || bing
      ? { verification: { ...(google ? { google } : {}), ...(bing ? { other: { 'msvalidate.01': bing } } : {}) } }
      : {}),
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
  const [layout, entity, preview, paired] = await Promise.all([
    getLayout(DEFAULT_LOCALE),
    getEntity(DEFAULT_LOCALE),
    previewState(),
    getPairedPaths(),
  ]);
  const analytics = layout.analytics;
  const env = thirdPartyIdsFromEnv();
  const ids = { ...env, gtmId: analytics?.gtmId || env.gtmId, clarityId: analytics?.clarityId || env.clarityId };
  const consentEnabled = hasThirdParty(ids);
  const privacyHref = layout.menus.legal.find((item) => /privacy/.test(item.href))?.href;

  return (
    <LocaleHtml urLive={layout.site.locales.includes('ur')} className={fontVariables}>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-dvh flex-col">
        {preview ? <PreviewBar expiresAt={preview.expiresAt} exitPath={PREVIEW.siteExitPath} /> : null}
        <EnglishOnly>
          <SiteHeader layout={layout} paired={paired} />
        </EnglishOnly>
        <LocaleMain>{children}</LocaleMain>
        <EnglishOnly>
          <SiteFooter layout={layout} entity={entity} consentEnabled={consentEnabled} paired={paired} />
          <WhatsAppFab whatsapp={layout.site.whatsapp ?? whatsappFromEnv()} phone={entity?.contact?.phone} />
        </EnglishOnly>
        <MotionObserver />
        <Analytics
          signupUrl={layout.site.signupUrl}
          gtmId={ids.gtmId}
          gaId={ids.gaId}
          adsId={ids.adsId}
          adsConversions={ids.adsConversions}
          clarityId={ids.clarityId}
          claritySample={analytics?.claritySample}
          pixels={{ metaPixelId: ids.metaPixelId, tiktokPixelId: ids.tiktokPixelId, linkedinPartnerId: ids.linkedinPartnerId, hotjarId: ids.hotjarId }}
        />
        <ConsentBanner enabled={consentEnabled} privacyHref={privacyHref} />
      </body>
    </LocaleHtml>
  );
}
