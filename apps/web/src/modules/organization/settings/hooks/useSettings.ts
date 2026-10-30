import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi, type TenantSettings } from '@modules/organization/settings/api/settings.api';
import { toast } from 'sonner';
import { t } from '@core/i18n';

export function useSettings(options: { enabled?: boolean; retry?: boolean | number } = {}) {
  return useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
    staleTime: 30_000,
    ...options,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TenantSettings>) => settingsApi.update(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      toast.success(t('Save ho gaya ✅'));
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || t('Save fail ho gaya'));
    },
  });
}

export function useSecurityScore() {
  return useQuery({
    queryKey: ['security-score'],
    queryFn: settingsApi.securityScore,
    staleTime: 60_000,
  });
}
