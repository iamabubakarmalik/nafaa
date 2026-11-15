'use client';
/** Error boundary for pages: neutral message and a retry, never technical text. */
import { RotateCcw, WifiOff } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { Button, EmptyState } from '@/components/ui';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const { t } = useApp();
  return (
    <div className="container-page pt-10">
      <EmptyState icon={<WifiOff />} title={t('errors.failed')} body={t('errors.failedSub')} action={<Button onClick={reset} icon={<RotateCcw className="h-4 w-4" />}>{t('common.retry')}</Button>} />
    </div>
  );
}
