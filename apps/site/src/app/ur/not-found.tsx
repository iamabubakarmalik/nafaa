/**
 * 404 under /ur. With Urdu live it renders inside the Urdu shell in Urdu;
 * before that /ur paths are English paths and get the English 404.
 */
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Heading } from '@/components/ui/Heading';
import { Text } from '@/components/ui/Text';
import { buttonClasses } from '@/components/ui/Button';
import { getLayout } from '@/lib/cms/client';
import { DEFAULT_LOCALE } from '@/lib/cms/locale';
import { shellStrings } from '@/lib/i18n/shell';
import RootNotFound from '../not-found';

export { metadata } from '../not-found';

export default async function UrduNotFound() {
  const { site } = await getLayout(DEFAULT_LOCALE);
  if (!site.locales.includes('ur')) return <RootNotFound />;
  const t = shellStrings('ur');
  return (
    <Container size="measure" className="py-section text-center">
      <p className="text-eyebrow uppercase text-fg-subtle">404</p>
      <Heading as="h1" className="mt-3">
        {t.notFoundTitle}
      </Heading>
      <Text className="mx-auto mt-4 max-w-md">{t.notFoundBody}</Text>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/ur" className={buttonClasses({ variant: 'primary' })}>
          {t.notFoundHome}
        </Link>
      </div>
    </Container>
  );
}
