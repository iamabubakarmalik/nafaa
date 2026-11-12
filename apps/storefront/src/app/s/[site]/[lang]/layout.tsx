/**
 * Shop shell (root layout for every storefront page): <html lang dir>, theme
 * variables, fonts, announcement, header, footer, cart drawer, search,
 * WhatsApp button, pixels, and the theme editor bridge in preview.
 * Password mode and suspended shops render their own page instead.
 */
import type { Metadata, Viewport } from 'next';
import { Suspense, type CSSProperties, type ReactNode } from 'react';
import '../../../globals.css';
import { fontVariables } from '../../../fonts';
import { site, type SiteParams } from '@/lib/store';
import { reader, schemeClass, visibleBlocks } from '@/lib/settings';
import { t } from '@/lib/i18n';
import { href } from '@/lib/format';
import { indexable, JsonLd, pageUrl } from '@/lib/seo';
import { DEFAULT_GLOBAL } from '@/lib/theme/defaults';
import { StoreProvider, type ShopInfo } from '@/components/providers/StoreProvider';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/layout/CartDrawer';
import { SearchOverlay } from '@/components/layout/SearchOverlay';
import { WhatsAppFloat } from '@/components/layout/WhatsAppFloat';
import { RouteEvents } from '@/components/layout/RouteEvents';
import { PreviewBridge } from '@/components/layout/PreviewBridge';
import { Pixels } from '@/components/layout/Pixels';
import { PasswordPage } from '@/components/layout/PasswordPage';

type Props = { children: ReactNode; params: Promise<SiteParams> };

/** No shop is built ahead; each is rendered on first visit and cached (ISR), refreshed by tag from the API. */
export async function generateStaticParams() {
  return [];
}

/** Pages refresh at least every 5 minutes; the API's tag webhook refreshes them at once on changes. */
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<SiteParams> }): Promise<Metadata> {
  const ctx = await site(params);
  const s = ctx.boot.settings;
  const name = ctx.boot.store.name;
  return {
    metadataBase: new URL(ctx.origin),
    title: { default: s.seo.title || (s.tagline ? `${name} | ${s.tagline}` : name), template: `%s | ${name}` },
    description: s.seo.description || s.tagline || undefined,
    applicationName: name,
    icons: s.faviconUrl ? { icon: s.faviconUrl, apple: s.faviconUrl } : undefined,
    robots: indexable(ctx) ? undefined : { index: false, follow: false },
    formatDetection: { telephone: false },
  };
}

export async function generateViewport({ params }: { params: Promise<SiteParams> }): Promise<Viewport> {
  const ctx = await site(params);
  return { themeColor: ctx.theme.layout.darkHeader ? ctx.theme.tokens.colors.text : ctx.theme.tokens.colors.background, width: 'device-width', initialScale: 1 };
}

export default async function ShopLayout({ children, params }: Props) {
  const ctx = await site(params);
  const { boot, theme, lang } = ctx;
  const dir = lang === 'ur' ? 'rtl' : 'ltr';
  const bodyStyle = theme.vars as CSSProperties;
  const data = { 'data-btn': theme.tokens.buttonStyle, 'data-card': theme.tokens.cardStyle, 'data-case': theme.layout.headingCase, 'data-theme': theme.themeId };

  if (ctx.unavailable) {
    return (
      <html lang="en" className={fontVariables}>
        <body style={bodyStyle} {...data}>
          <main className="grid min-h-screen place-items-center px-6 text-center">
            <div>
              <h1 className="text-2xl font-semibold">{t('en', 'unavailable.title')}</h1>
              <p className="mt-2 text-muted">{t('en', 'unavailable.text')}</p>
            </div>
          </main>
        </body>
      </html>
    );
  }

  const g = boot.theme?.global ?? DEFAULT_GLOBAL;
  const ann = g.announcement && !g.announcement.hidden ? g.announcement : null;
  const annR = ann ? reader(ann, lang) : null;
  const messages = ann
    ? visibleBlocks(ann)
        .map((b) => {
          const r = reader(b, lang);
          const link = r.text('link');
          return { text: r.text('text'), link: link ? href(lang, link) : null };
        })
        .filter((m) => m.text)
    : [];
  const wa = boot.settings.whatsappButton;
  const shop: ShopInfo = {
    storeId: ctx.storeId,
    name: boot.store.name,
    lang,
    langs: boot.settings.languages.enabled.length ? boot.settings.languages.enabled : ['en'],
    symbol: boot.settings.currencyDisplay.symbol || 'Rs',
    whatsapp: wa.number || boot.settings.contact.whatsapp || null,
    payments: boot.payments,
    checkout: boot.checkout,
    shipping: boot.shipping,
    layout: theme.layout,
    newsletter: boot.settings.newsletter,
    preview: !!ctx.opts.preview,
  };
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: boot.store.name,
    url: pageUrl(ctx, '/'),
    logo: boot.settings.logoUrl || undefined,
    sameAs: Object.values(boot.settings.social ?? {}).filter((v) => typeof v === 'string' && v.startsWith('http')),
    contactPoint: boot.settings.contact.phone ? { '@type': 'ContactPoint', telephone: boot.settings.contact.phone, contactType: 'customer service', areaServed: 'PK' } : undefined,
  };
  const banner = boot.platform?.banner;

  return (
    <html lang={lang === 'ur' ? 'ur' : 'en'} dir={dir} className={fontVariables}>
      <head>
        {theme.externalFonts.length > 0 && (
          <>
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?${theme.externalFonts.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;500;600;700`).join('&')}&display=swap`} />
          </>
        )}
      </head>
      <body style={bodyStyle} {...data}>
        <StoreProvider shop={shop}>
          {ctx.locked ? (
            <PasswordPage message={boot.settings.password.message} logoUrl={boot.settings.logoUrl} />
          ) : (
            <>
              <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[100] focus:rounded-btn focus:bg-bg focus:px-4 focus:py-2">
                Skip to content
              </a>
              {banner?.message && <div className={`px-4 py-2 text-center text-[13px] font-medium ${banner.tone === 'warning' ? 'bg-amber-100 text-amber-900' : 'bg-sky-100 text-sky-900'}`}>{banner.message}</div>}
              {ann && messages.length > 0 && (
                <div data-section-id={ann.id} data-section-type="announcement_bar">
                  <AnnouncementBar messages={messages} scheme={schemeClass(annR!, 'inverse')} autoplay={annR!.bool('autoplay', true)} speed={annR!.num('speed', 5)} marquee={annR!.bool('marquee', false)} />
                </div>
              )}
              {g.header && !g.header.hidden && (
                <div data-section-id={g.header.id} data-section-type="header" className="contents">
                  <Header section={g.header} ctx={ctx} />
                </div>
              )}
              <main id="main" className="min-h-[50vh]">
                {children}
              </main>
              {g.footer && !g.footer.hidden && (
                <div data-section-id={g.footer.id} data-section-type="footer">
                  <Footer section={g.footer} ctx={ctx} />
                </div>
              )}
              <CartDrawer />
              <SearchOverlay />
              {wa.enabled && <WhatsAppFloat number={wa.number || boot.settings.contact.whatsapp} message={wa.message || t(lang, 'whatsapp.hello')} position={wa.position} label={t(lang, 'whatsapp.float')} />}
              <JsonLd data={org} />
            </>
          )}
          <Suspense fallback={null}>
            <RouteEvents />
          </Suspense>
          {ctx.opts.preview ? <PreviewBridge label={t(lang, 'common.previewBar')} /> : <Pixels tracking={boot.settings.tracking} />}
        </StoreProvider>
      </body>
    </html>
  );
}
