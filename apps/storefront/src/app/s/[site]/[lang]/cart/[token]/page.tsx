import { AdoptCart } from './AdoptCart';

/** Abandoned-cart recovery link (/cart/<token>): adopts the cart into this browser, then opens checkout. */
export default async function RecoverCart({ params }: { params: Promise<{ token: string; lang: string }> }) {
  const { token, lang } = await params;
  return <AdoptCart token={token} next={lang === 'ur' ? '/ur/checkout' : '/checkout'} />;
}

export const metadata = { robots: { index: false, follow: false } };
