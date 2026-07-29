import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RegisterRedirect({ searchParams }: Props) {
  const params = await searchParams;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.nafaa.pk';

  const qs = Object.entries(params)
    .filter(([, v]) => typeof v === 'string' && v.length > 0)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`)
    .join('&');

  redirect(qs ? `${appUrl}/register?${qs}` : `${appUrl}/register`);
}

export const metadata = {
  title: 'Start free trial — Nafaa',
  description: "Start your free Nafaa trial — Pakistan's #1 business platform. No credit card required.",
};
