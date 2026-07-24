import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

export function usePrefetchOnHover() {
  const qc = useQueryClient();
  const timerRef = useRef<any>(null);

  const prefetch = useCallback(
    <T>(queryKey: any[], queryFn: () => Promise<T>, delay = 300) => {
      return {
        onMouseEnter: () => {
          timerRef.current = setTimeout(() => {
            qc.prefetchQuery({ queryKey, queryFn, staleTime: 30_000 });
          }, delay);
        },
        onMouseLeave: () => {
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
        },
      };
    },
    [qc],
  );

  return prefetch;
}
