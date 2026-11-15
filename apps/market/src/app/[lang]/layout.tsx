/**
 * Root layout for every language (/, /ur, /roman). Sets <html lang/dir>,
 * fonts, the saved light/dark theme before paint, and the app shell
 * (header, phone bottom navigation, footer).
 */
import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { AppProvider } from '@/components/providers/AppProvider';
import { BottomNav } from '@/components/layout/BottomNav';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { api } from '@/lib/api';
import { dirOf, getDict, htmlLang, isLang, makeT } from '@/lib/i18n';
import { LOC_COOKIE, parseLoc } from '@/lib/location';
import { JsonLd, pageMeta } from '@/lib/seo';
import { SITE_URL } from '@/lib/site';
import type { Lang, MarketConfig } from '@/lib/types';
import { inter, naskh, nastaliq } from '../fonts';
import '../globals.css';

export function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'ur' }, { lang: 'roman' }];
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const l: Lang = isLang(lang) ? lang : 'en';
  const t = makeT(getDict(l));
  return {
    metadataBase: new URL(SITE_URL),
    applicationName: 'Nafaa Market',
    icons: {
      icon: [{ url: '/favicon.ico', sizes: '48x48' }, { url: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' }],
      apple: '/brand/apple-touch-icon.png',
    },
    manifest: '/manifest.webmanifest',
    ...pageMeta({ lang: l, path: '/', title: t('seo.homeTitle'), description: t('seo.homeDesc') }),
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#111a2b' },
  ],
};

const THEME_BOOT = `try{var t=localStorage.getItem('nm-theme');if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

const FALLBACK_CONFIG: MarketConfig = { gates: [], payments: ['cod'], launchCities: [] };

export default async function LangLayout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const config = await api.config().catch(() => FALLBACK_CONFIG);
  const loc = parseLoc((await cookies()).get(LOC_COOKIE)?.value);
  return (
    <html lang={htmlLang(lang)} dir={dirOf(lang)} className={`${inter.variable} ${naskh.variable} ${nastaliq.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="min-h-dvh antialiased">
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Nafaa Market',
            url: SITE_URL,
            logo: `${SITE_URL}/brand/icon-512.png`,
            parentOrganization: { '@type': 'Organization', name: 'Nafaa', url: 'https://nafaa.pk' },
          }}
        />
        <AppProvider lang={lang} gates={config.gates} payments={config.payments} cities={config.launchCities} loc={loc}>
          <Header />
          <main className="min-h-[60vh] pb-[calc(var(--bottom-nav)+1rem)]">{children}</main>
          <Footer lang={lang} gates={config.gates} />
          <BottomNav />
        </AppProvider>
      </body>
    </html>
  );
}
