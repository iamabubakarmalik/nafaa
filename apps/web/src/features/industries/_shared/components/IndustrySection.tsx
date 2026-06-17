import { useMemo } from 'react';
import { useBusinessFeatures } from '@/hooks/useBusinessFeatures';
import {
  resolveIndustryPlugin,
} from '@/features/industries/_shared/registry/industry-registry';
import type {
  IndustryPlugin,
  IndustrySectionProps,
} from '@/features/industries/_shared/types/section.types';
import type { ProductVariant } from '@/api/product-variants.api';

export type IndustrySlot =
  | 'InventorySection'
  | 'VariantsBanner'
  | 'HeaderActionBar'
  | 'AdminStockBlock'
  | 'CustomerStockBlock';

interface Props extends Omit<IndustrySectionProps, 'businessType'> {
  slot: IndustrySlot;
}

/**
 * Renders the active plugin's component for a given slot.
 * If the plugin doesn't define that slot, renders nothing.
 *
 * Example:
 *   <IndustrySection slot="InventorySection" {...sharedProps} />
 */
export function IndustrySection({ slot, ...rest }: Props) {
  const { businessType, features } = useBusinessFeatures();

  const plugin: IndustryPlugin = useMemo(
    () =>
      resolveIndustryPlugin({
        businessType: businessType ?? 'STANDARD',
        unit: rest.unit,
        features,
      }),
    [businessType, rest.unit, features],
  );

  const Component = plugin[slot] as React.ComponentType<IndustrySectionProps> | undefined;
  if (!Component) return null;

  return (
    <Component
      {...rest}
      businessType={businessType ?? 'STANDARD'}
    />
  );
}

/**
 * Variant extra panel — needs the variant prop too.
 */
interface VariantPanelProps extends Omit<IndustrySectionProps, 'businessType'> {
  variant: ProductVariant;
}

export function IndustryVariantExtra(props: VariantPanelProps) {
  const { businessType, features } = useBusinessFeatures();
  const plugin = useMemo(
    () =>
      resolveIndustryPlugin({
        businessType: businessType ?? 'STANDARD',
        unit: props.unit,
        features,
      }),
    [businessType, props.unit, features],
  );

  const Component = plugin.VariantExtraPanel;
  if (!Component) return null;

  return <Component {...props} businessType={businessType ?? 'STANDARD'} />;
}

/**
 * Hook to know the active plugin key (e.g. for showing badges).
 */
export function useActiveIndustryPlugin(unit: string) {
  const { businessType, features } = useBusinessFeatures();
  return useMemo(
    () =>
      resolveIndustryPlugin({
        businessType: businessType ?? 'STANDARD',
        unit,
        features,
      }),
    [businessType, unit, features],
  );
}
