import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi, type TenantSettings } from '@modules/organization/settings/api/settings.api';
import { toast } from 'sonner';

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
    staleTime: 30_000,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TenantSettings> & { managerPin?: string }) => settingsApi.update(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Save ho gaya ✅');
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Save fail ho gaya');
    },
  });
}

export function useResetSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (section: string) => settingsApi.reset(section),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Reset complete');
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

export function useIntegrations() {
  return useQuery({
    queryKey: ['integrations'],
    queryFn: settingsApi.listIntegrations,
    staleTime: 30_000,
  });
}
