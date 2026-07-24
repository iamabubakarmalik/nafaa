import { ReactNode } from 'react';
import { usePageTracking } from '@/hooks/usePageTracking';

export function PageTrackingWrapper({ children }: { children: ReactNode }) {
  usePageTracking();
  return <>{children}</>;
}
