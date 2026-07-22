import { createContext, useMemo, type ReactNode } from 'react';
import { useAuthStore } from '@core/stores/auth.store';
import { IndustryRegistry } from './IndustryRegistry';
import type { IndustryPack } from '../types/industry-pack';

interface IndustryContextValue {
  /** Currently active industry pack (or undefined if none matches) */
  industry: IndustryPack | undefined;
  /** All registered packs — for pickers / admin UI */
  allPacks: IndustryPack[];
}

export const IndustryContext = createContext<IndustryContextValue>({
  industry: undefined,
  allPacks: [],
});

/**
 * Wrap your app with this provider (usually inside <QueryClientProvider>
 * and after auth is initialized).
 *
 *   <IndustryProvider>
 *     <AppShell />
 *   </IndustryProvider>
 */
export function IndustryProvider({ children }: { children: ReactNode }) {
  const tenant = useAuthStore((s) => s.tenant);

  const value = useMemo<IndustryContextValue>(() => {
    return {
      industry: IndustryRegistry.resolve(tenant),
      allPacks: IndustryRegistry.all(),
    };
  }, [tenant]);

  return <IndustryContext.Provider value={value}>{children}</IndustryContext.Provider>;
}
