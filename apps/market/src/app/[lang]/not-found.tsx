'use client';
/** Not-found page inside the language layout (language read from the URL). */
import { Compass } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { ButtonLink, EmptyState } from '@/components/ui';

export default function NotFound() {
  const { t, href } = useApp();
  return (
    <div className="container-page pt-10">
      <EmptyState icon={<Compass />} title={t('errors.notFound')} body={t('errors.notFoundSub')} action={<ButtonLink href={href('/')}>{t('errors.goHome')}</ButtonLink>} />
    </div>
  );
}
