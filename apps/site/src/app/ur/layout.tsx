/**
 * Urdu shell for /ur/... (Urdu script, right to left).
 *
 * The root layout keeps <html>, <head>, the theme script, analytics and the
 * consent banner, and sets lang="ur" dir="rtl" on <html> for these paths
 * (LocaleGate); its English header, <main> and footer step aside here.
 * This layout adds the Urdu header, <main>, footer and WhatsApp button with
 * the `ur` layout data (menus fall back to the English ones in the CMS and
 * are translated by lib/i18n/shell until editors save Urdu menus), and
 * loads Noto Nastaliq Urdu for these pages only.
 *
 * Before settings `site.locales` lists "ur" it renders the page alone: /ur
 * paths are ordinary English paths then and 404 under the English shell.
 */
import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { WhatsAppFab } from '@/components/layout/WhatsAppFab';
import { hasThirdParty, thirdPartyIdsFromEnv, whatsappFromEnv } from '@/lib/analytics/env';
import { getEntity, getLayout, getPairedPaths, type SiteLayout } from '@/lib/cms/client';
import { DEFAULT_LOCALE } from '@/lib/cms/locale';
import { pathIn, urduMenu } from '@/lib/i18n/shell';
import { URDU_FONT_STACK } from '@/styles/fonts-urdu';

/** Urdu menus and CTA paths: translated labels, links moved under /ur where the page exists in Urdu. */
function urduLayout(layout: SiteLayout, paired: ReadonlySet<string>): SiteLayout {
  const { menus, site } = layout;
  return {
    ...layout,
    site: { ...site, demoPath: paired.has(site.demoPath) ? pathIn('ur', site.demoPath) : site.demoPath },
    menus: {
      header: urduMenu(menus.header, paired),
      footer: urduMenu(menus.footer, paired),
      legal: urduMenu(menus.legal, paired),
      mobile: urduMenu(menus.mobile, paired),
    },
  };
}

export default async function UrduLayout({ children }: { children: ReactNode }) {
  const [base, layout, entity, paired] = await Promise.all([getLayout(DEFAULT_LOCALE), getLayout('ur'), getEntity('ur'), getPairedPaths()]);
  if (!base.site.locales.includes('ur')) return children;

  const shell = urduLayout(layout, new Set(paired));
  const env = thirdPartyIdsFromEnv();
  const consentEnabled = hasThirdParty({ ...env, gtmId: base.analytics?.gtmId || env.gtmId, clarityId: base.analytics?.clarityId || env.clarityId });

  return (
    <>
      {/* On <html> so the mobile menu (portalled to <body>) gets the font too. */}
      <style>{`:root{--font-urdu:${URDU_FONT_STACK}}`}</style>
      <SiteHeader layout={shell} locale="ur" paired={paired} />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <SiteFooter layout={shell} entity={entity} consentEnabled={consentEnabled} locale="ur" paired={paired} />
      <WhatsAppFab whatsapp={layout.site.whatsapp ?? whatsappFromEnv()} phone={entity?.contact?.phone} locale="ur" />
    </>
  );
}
