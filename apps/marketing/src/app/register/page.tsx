import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ ref?: string; [key: string]: string | string[] | undefined }>;
}

export default async function RegisterRedirect({ searchParams }: PageProps) {
  const params = await searchParams;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.nafaa.pk';

  // Build query string from all params (preserves ref + any future tracking params)
  const queryString = Object.entries(params)
    .filter(([_, v]) => typeof v === 'string' && v.length > 0)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`)
    .join('&');

  const target = queryString
    ? `${appUrl}/register?${queryString}`
    : `${appUrl}/register`;

  redirect(target);
}

export const metadata = {
  title: 'Sign Up — Nafaa',
  description: 'Free 7-day trial — Pakistan ka smartest POS',
};
