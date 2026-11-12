/**
 * Merchant tracking tags: Meta Pixel, GA4 + Google Ads (one gtag), TikTok.
 * Only rendered when the merchant pasted an ID; loaded after the page is
 * interactive so they never slow the first paint. IDs are checked to a
 * safe character set before they go into the inline scripts.
 */
import Script from 'next/script';
import type { StoreSettings } from '@/lib/api';

const safe = (v: string | null | undefined) => (v && /^[A-Za-z0-9_-]{3,40}$/.test(v) ? v : null);

export function Pixels({ tracking }: { tracking: StoreSettings['tracking'] }) {
  const meta = safe(tracking.metaPixelId);
  const ga = safe(tracking.ga4Id);
  const ads = safe(tracking.googleAdsId);
  const adsLabel = safe(tracking.googleAdsLabel);
  const tt = safe(tracking.tiktokPixelId);
  const gtagId = ga ?? ads;
  return (
    <>
      {meta && (
        <Script id="nf-meta" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${meta}');fbq('track','PageView');`}
        </Script>
      )}
      {gtagId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gtagId}`} strategy="afterInteractive" />
          <Script id="nf-gtag" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());${ga ? `gtag('config','${ga}');` : ''}${ads ? `gtag('config','${ads}');window.__nfAds={googleAdsId:'${ads}',googleAdsLabel:${adsLabel ? `'${adsLabel}'` : 'null'}};` : ''}`}
          </Script>
        </>
      )}
      {tt && (
        <Script id="nf-tiktok" strategy="afterInteractive">
          {`!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=d.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${tt}');ttq.page()}(window,document,'ttq');`}
        </Script>
      )}
    </>
  );
}
