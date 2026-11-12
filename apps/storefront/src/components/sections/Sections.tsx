/**
 * Renders a template's sections in the merchant's order. Each section is
 * wrapped in data-section-id so the theme editor can find, outline and
 * scroll to it (see layout/PreviewBridge). Unknown or hidden types render
 * nothing, so a newer theme doc never breaks an older storefront.
 */
import type { ReactNode } from 'react';
import type { Section } from '@/lib/api';
import type { SiteContext } from '@/lib/store';
import { padClass, reader, schemeClass } from '@/lib/settings';
import { BoughtTogether, MainProduct, ProductRecommendations, ProductReviews } from '../product/sections';
import { CollectionList } from './CollectionList';
import { BannerCta, BrandLogos, Faq, Gallery, ImageWithText, NewsletterSection, RichTextSection, Testimonials, TrustBadges } from './Content';
import { FeaturedCollection, ProductCarousel } from './FeaturedCollection';
import { Hero } from './Hero';
import { MainAccount, MainArticle, MainBlog, MainCart, MainCollection, MainPage, MainSearch, NotFoundView } from './Main';
import { Countdown, Video } from './Media';
import { Slideshow } from './Slideshow';
import type { PageData, SectionProps } from './types';

export const SECTIONS: Record<string, (p: SectionProps) => ReactNode | Promise<ReactNode>> = {
  hero: Hero,
  slideshow: Slideshow,
  featured_collection: FeaturedCollection,
  product_carousel: ProductCarousel,
  collection_list: CollectionList,
  image_with_text: ImageWithText,
  banner_cta: BannerCta,
  testimonials: Testimonials,
  faq: Faq,
  trust_badges: TrustBadges,
  video: Video,
  newsletter: NewsletterSection,
  gallery: Gallery,
  brand_logos: BrandLogos,
  countdown: Countdown,
  rich_text: RichTextSection,
  main_product: MainProduct,
  product_recommendations: ProductRecommendations,
  bought_together: BoughtTogether,
  product_reviews: ProductReviews,
  main_collection: MainCollection,
  main_search: MainSearch,
  main_cart: MainCart,
  main_page: MainPage,
  main_blog: MainBlog,
  main_article: MainArticle,
  main_account: MainAccount,
  not_found: NotFoundView,
};

export function Sections({ sections, ctx, data }: { sections: Section[]; ctx: SiteContext; data?: PageData }) {
  const preview = !!ctx.opts.preview;
  return (
    <>
      {sections
        .filter((s) => !s.hidden || preview)
        .map((s, i) => {
          const C = SECTIONS[s.type];
          if (!C || s.hidden) return preview && s.hidden ? <div key={s.id} data-section-id={s.id} hidden /> : null;
          return (
            <div key={s.id} data-section-id={s.id} data-section-type={s.type} className={`${schemeClass(reader(s, ctx.lang))} ${padClass(reader(s, ctx.lang))}`.trim() || undefined}>
              <C section={s} ctx={ctx} index={i} data={data} />
            </div>
          );
        })}
    </>
  );
}
