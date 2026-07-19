import type { ComponentType, ReactNode } from 'react';
import { useCurrentIndustry } from '../registry/useCurrentIndustry';
import type { IndustryPack } from '../types/industry-pack';

/**
 * Render a slot component contributed by the active industry pack.
 * If no pack is active or the pack doesn\'t provide this slot,
 * renders `fallback` (or nothing).
 *
 *   <IndustrySlot slot={(p) => p.pos?.modeBar} />
 *
 *   <IndustrySlot
 *     slot={(p) => p.receipt?.metaSection}
 *     slotProps={{ sale }}
 *   />
 */
interface IndustrySlotProps {
  slot: (pack: IndustryPack) => ComponentType<any> | undefined;
  slotProps?: Record<string, any>;
  fallback?: ReactNode;
  wrapper?: ComponentType<{ children: ReactNode }>;
}

export function IndustrySlot({
  slot,
  slotProps,
  fallback = null,
  wrapper: Wrapper,
}: IndustrySlotProps) {
  const industry = useCurrentIndustry();
  const Component = industry ? slot(industry) : undefined;
  const rendered = Component ? <Component {...(slotProps ?? {})} /> : fallback;
  if (Wrapper) return <Wrapper>{rendered}</Wrapper>;
  return <>{rendered}</>;
}

/**
 * Hook variant — returns the slot component itself.
 * Useful when the caller needs to conditionally render or pass props
 * that depend on other logic.
 */
export function useIndustrySlot<T = any>(
  slot: (pack: IndustryPack) => ComponentType<T> | undefined,
): ComponentType<T> | undefined {
  const industry = useCurrentIndustry();
  return industry ? slot(industry) : undefined;
}
