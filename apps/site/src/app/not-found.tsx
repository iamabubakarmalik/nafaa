/**
 * 404 page (also used for 410 redirects). Noindex. Suggests the top-level
 * links from the header menu, so it never points at a page that is not live.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Heading } from '@/components/ui/Heading';
import { Text } from '@/components/ui/Text';
import { buttonClasses } from '@/components/ui/Button';
import { getLayout } from '@/lib/cms/client';
import { DEFAULT_LOCALE } from '@/lib/cms/locale';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
};

export default async function NotFound() {
  const { menus } = await getLayout(DEFAULT_LOCALE);
  const suggestions = menus.header.filter((item) => item.href && item.href !== '#' && !item.external).slice(0, 6);

  return (
    <Container size="measure" className="py-section text-center">
      <p className="text-eyebrow uppercase text-fg-subtle">404</p>
      <Heading as="h1" className="mt-3">
        Page not found
      </Heading>
      <Text className="mx-auto mt-4 max-w-md">
        This page does not exist or has moved. Try one of these, or go back to the home page.
      </Text>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className={buttonClasses({ variant: 'primary' })}>
          Home page
        </Link>
        {suggestions.map((item) => (
          <Link key={item.id} href={item.href} className={buttonClasses({ variant: 'secondary' })}>
            {item.label}
          </Link>
        ))}
      </div>
    </Container>
  );
}
