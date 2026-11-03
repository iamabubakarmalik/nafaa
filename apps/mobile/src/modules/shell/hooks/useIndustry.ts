/** The business's industry identity (from Tenant.businessType). */

import { useAuthStore } from '@/core/auth/store';
import { industryIdForBusinessType, industryIdentity } from '@/design';

export function useIndustry() {
  const businessType = useAuthStore((s) => s.tenant?.businessType);
  const id = industryIdForBusinessType(businessType);
  return { id, identity: industryIdentity(id), businessType: businessType ?? null };
}
