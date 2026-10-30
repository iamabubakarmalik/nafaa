/**
 * Settings → Business type: how the business sells (the same cards as
 * sign-up). Saving wholesale or distribution switches Distribution on in the
 * matching mode; dropping one never switches anything off. Only the owner
 * can change it, like the business type itself.
 */

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Globe, Loader2, Truck, Waypoints } from 'lucide-react';
import { useAuthStore } from '@core/stores/auth.store';
import { isOwner } from '@core/lib/permissions';
import { effectiveModels, type BusinessModel } from '@core/lib/business-models';
import { BusinessModelPicker } from '@modules/auth/components/BusinessModelPicker';
import { onboardingApi } from '@modules/onboarding/api/onboarding.api';
import { DIST_KEY, distSetupApi } from '@modules/distribution/api/distribution.api';
import { useDistributionState } from '@modules/distribution/hooks/useDistribution';
import { PageLink, SectionCard } from '../components/SettingsBlocks';

export function BusinessModelsCard() {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const saved = useAuthStore((s) => s.tenant?.businessModels);
  const updateTenant = useAuthStore((s) => s.updateTenant);
  const [models, setModels] = useState<BusinessModel[]>(() => effectiveModels(saved));
  const dist = useDistributionState();
  const owner = isOwner(role);

  useEffect(() => { setModels(effectiveModels(saved)); }, [saved]);

  const save = useMutation({
    mutationFn: async (next: BusinessModel[]) => {
      const result = await onboardingApi.setBusinessModels(next);
      // Goes through the distribution settings so its cached on/off state refreshes at once.
      if (result.distributionMode) await distSetupApi.updateSettings({ mode: result.distributionMode }).catch(() => undefined);
      return result;
    },
    onSuccess: (result) => {
      updateTenant({ businessModels: result.businessModels });
      void qc.invalidateQueries({ queryKey: [DIST_KEY] });
      toast.success('Save ho gaya — menu aur dashboard is hisaab se set ho gaye');
    },
    onError: (e: any) => {
      setModels(effectiveModels(saved));
      toast.error(e?.response?.data?.message || 'Save nahi hua');
    },
  });

  const change = (next: BusinessModel[]) => {
    setModels(next);
    save.mutate(next);
  };

  const sellsToShops = models.includes('WHOLESALE') || models.includes('DISTRIBUTION');

  return (
    <SectionCard
      title="Aap kaise bechte hain?"
      desc="Is se menu, dashboard aur shortcuts aap ke kaam ke hisaab se lagte hain"
      icon={Waypoints}
      color="sky"
      badge={save.isPending ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-label="Save ho raha hai" /> : undefined}
    >
      <BusinessModelPicker value={models} onChange={change} disabled={!owner || save.isPending} label="Ek se zyada chun sakte hain" hint="" />
      {!owner && <p className="mt-2 text-xs text-slate-500">Sirf dukaan ka malik ise badal sakta hai.</p>}

      {(sellsToShops || models.includes('ONLINE')) && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {sellsToShops && (
            <PageLink
              to="/settings/distribution"
              icon={Truck}
              title="Distribution settings"
              desc={dist.state === 'plan' ? 'Aap ke plan me shamil nahi — plan dekhein' : models.includes('DISTRIBUTION') ? 'Routes, booker, load sheet, udhaar' : 'Price list, order, udhaar, recovery'}
            />
          )}
          {models.includes('ONLINE') && (
            <PageLink to="/online-store/connect" icon={Globe} title="Connect a channel" desc="Shopify, WooCommerce, Daraz ya apni website" />
          )}
        </div>
      )}
    </SectionCard>
  );
}
