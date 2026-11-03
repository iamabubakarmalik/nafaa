/** Shoe brands (web ShoeBrandsPage): brands are made from the products once, then the shared Brands screen opens. */

import { router } from 'expo-router';
import { useEffect } from 'react';
import { SkeletonRows } from '@/design';
import { Screen } from '@/design';
import { shoeProductsApi } from '../api';

export function ShoeBrandsScreen() {
  useEffect(() => { void shoeProductsApi.syncBrands().catch(() => undefined).finally(() => router.replace('/brands' as never)); }, []);
  return <Screen title=""><SkeletonRows count={4} /></Screen>;
}
