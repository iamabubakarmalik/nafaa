/**
 * Product tour page (/tour and /ur/tour). A code page, not a CMS entry:
 *
 *   hero → player (island) → every step as text → closing CTA
 *
 * The step titles and bodies are server HTML twice over: step 1 in the
 * player, and all steps in the list under it (crawlable, and readable
 * without JavaScript). Words live in lib/i18n/tour.ts; screenshots and
 * highlight boxes in ./steps.ts. Schema: Organization, WebSite and a
 * WebPage for the tour.
 */
import Link from 'next/link';
import { JsonLd } from '@/components/seo/JsonLd';
import { buttonClasses } from '@/components/ui/Button';
import { getEntity, getLayout, getPairedPaths } from '@/lib/cms/client';
import { absoluteUrl } from '@/lib/cms/env';
import { hreflangFor, localizePath } from '@/lib/cms/locale';
import { pathIn, type SiteLocale } from '@/lib/i18n/shell';
import { tourStrings } from '@/lib/i18n/tour';
import { cloudinaryUrl } from '@/lib/media';
import { loadPricingCatalog } from '@/lib/pricing/catalog';
import { buildSiteGraph, ids } from '@/lib/seo/graph';
import { TOUR_STEPS, shotMedia } from './steps';
import { TourPlayer, type TourPlayerStep } from './TourPlayer';
import { phoneZoom } from './zoom';

export const TOUR_PATH = '/tour';

const WIDTHS = [640, 960, 1280, 1600, 2000];
const PHONE_WIDTHS = [360, 540, 720];

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ''));

function playerSteps(locale: SiteLocale): TourPlayerStep[] {
  const t = tourStrings(locale);
  return TOUR_STEPS.map(({ id, shot, box, focus }) => {
    const media = shotMedia(shot);
    const widths = shot.height > shot.width ? PHONE_WIDTHS : WIDTHS;
    const text = t.steps[id];
    // Tag above the box when there is room, else below, else inside. When phones zoom to a part (focus),
    // the tag must sit in that part: above the box if the focus leaves room, else inside at its start or end.
    const tagAt: TourPlayerStep['tagAt'] = focus
      ? box[1] - focus[1] >= 3
        ? 'above'
        : focus[2] < box[2]
          ? 'inside'
          : 'end'
      : box[1] >= 9
        ? 'above'
        : box[1] + box[3] <= 88
          ? 'below'
          : 'inside';
    return {
      id,
      ...text,
      alt: locale === 'en' ? shot.alt : text.title,
      src: cloudinaryUrl(media, { width: widths[1] }),
      srcSet: widths.map((w) => `${cloudinaryUrl(media, { width: w })} ${w}w`).join(', '),
      width: shot.width,
      height: shot.height,
      address: shot.address,
      box,
      zoom: phoneZoom(shot.width, shot.height, focus ?? box, tagAt === 'above' && !focus),
      tagAt,
    };
  });
}

export async function TourTemplate({ locale }: { locale: SiteLocale }) {
  const t = tourStrings(locale);
  const [{ site }, entity, paired, catalog] = await Promise.all([getLayout(locale), getEntity(locale), getPairedPaths(), loadPricingCatalog()]);
  const steps = playerSteps(locale);
  const local = (path: string) => (locale === 'ur' && paired.includes(path) ? pathIn('ur', path) : path);
  const demoHref = local(site.demoPath);
  const url = absoluteUrl(localizePath(locale, TOUR_PATH));

  const graph = buildSiteGraph({ site, entity });
  (graph['@graph'] as unknown[]).push({
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: t.metaTitle,
    description: t.metaDescription,
    inLanguage: hreflangFor(locale),
    isPartOf: { '@id': ids.website() },
    primaryImageOfPage: steps[0] ? { '@type': 'ImageObject', url: cloudinaryUrl(shotMedia(TOUR_STEPS[0]!.shot), { width: 1600, format: 'jpg' }) } : undefined,
  });

  return (
    <>
      <JsonLd data={graph} />
      <section aria-labelledby="tour-heading" className="relative isolate overflow-hidden">
        <div aria-hidden className="bg-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="mx-auto box-content max-w-container px-gutter pb-8 pt-12 text-center md:pb-12 md:pt-20">
          <p className="text-eyebrow uppercase text-link">{t.kicker}</p>
          <h1 id="tour-heading" className="mx-auto mt-4 max-w-[22ch] text-h1 text-fg-strong">
            {t.heading}
          </h1>
          <p className="mx-auto mt-5 max-w-[44rem] text-body-lg text-fg-muted">{t.intro}</p>
          <p className="mt-4 text-small font-medium text-fg-subtle">{fill(t.meta, { n: steps.length })}</p>
        </div>
      </section>

      <section aria-label={t.carousel} className="mx-auto box-content max-w-wide px-gutter pb-section">
        <TourPlayer
          steps={steps}
          signupUrl={site.signupUrl}
          demoHref={demoHref}
          t={{
            carousel: t.carousel,
            slide: t.slide,
            stepOf: t.stepOf,
            back: t.back,
            next: t.next,
            restart: t.restart,
            zoomOut: t.zoomOut,
            zoomIn: t.zoomIn,
            keysHint: t.keysHint,
            goToStep: t.goToStep,
            startTrial: t.startTrial,
            bookDemo: t.bookDemo,
            finishNote: t.finishNote,
          }}
        />
      </section>

      <section aria-labelledby="tour-steps" className="border-t border-line bg-surface-2/50 py-section">
        <div className="mx-auto box-content max-w-container px-gutter">
          <h2 id="tour-steps" className="text-h2 text-fg-strong">
            {t.listHeading}
          </h2>
          <p className="mt-3 text-body-lg text-fg-muted">{t.listIntro}</p>
          <ol className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2">
            {steps.map((step, i) => (
              <li key={step.id} id={`step-${i + 1}`} className="flex scroll-mt-28 gap-4">
                <span aria-hidden className="flex size-8 flex-none items-center justify-center rounded-full bg-brand-700 text-small font-semibold tabular-nums text-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-h4 text-fg-strong">{step.title}</h3>
                  <p className="mt-1 text-small text-fg-muted">{step.body}</p>
                  <a href={`#step-${i + 1}`} className="mt-2 inline-block text-small font-medium text-link underline-offset-4 hover:underline">
                    {t.showStep}
                    <span className="sr-only">: {step.title}</span>
                  </a>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="tour-cta" className="py-section">
        <div className="mx-auto box-content max-w-container px-gutter">
          <div className="theme-ink rounded-2xl bg-ink px-6 py-14 text-center md:px-16 md:py-20" data-track-area="tour-cta">
            <h2 id="tour-cta" className="mx-auto max-w-[30ch] text-h2 text-white">
              {t.ctaHeading}
            </h2>
            <p className="mx-auto mt-4 max-w-[40rem] text-body-lg text-slate-300">
              {t.ctaBody} {catalog ? fill(t.ctaTrial, { days: catalog.trialDays }) : null}
            </p>
            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <a href={site.signupUrl} className={buttonClasses({ variant: 'on-ink', size: 'lg' })} data-track-label="Tour CTA: Start free trial">
                {t.startTrial}
              </a>
              <Link href={demoHref} prefetch={false} className={buttonClasses({ variant: 'secondary', size: 'lg', className: 'border-white/25 bg-transparent text-white hover:bg-white/10' })} data-track="cta_click" data-track-label="Tour CTA: Book a demo">
                {t.bookDemo}
              </Link>
            </div>
            <p className="mt-6 text-small">
              <Link href={local('/pricing')} prefetch={false} className="font-medium text-slate-300 underline underline-offset-4 hover:text-white">
                {t.seePricing}
              </Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
