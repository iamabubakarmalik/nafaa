import type { Metadata } from 'next';
import { t } from '@/lib/i18n';
import { meta } from '@/lib/seo';
import { site, type SiteParams } from '@/lib/store';
import { CheckoutClient } from '@/components/checkout/CheckoutClient';

type Props = { params: Promise<SiteParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ctx = await site(params);
  return meta(ctx, { title: t(ctx.lang, 'checkout.title'), path: '/checkout', noindex: true });
}

export default async function CheckoutPage({ params }: Props) {
  const ctx = await site(params);
  if (ctx.blocked) return null;
  const p = ctx.boot.platform;
  if (p?.checkoutPaused) {
    return (
      <div className="page grid min-h-[50vh] place-items-center text-center">
        <p className="max-w-md text-[16px]">{p.checkoutMessage || 'Checkout is paused for a short while. Please try again soon.'}</p>
      </div>
    );
  }
  return <CheckoutClient />;
}
