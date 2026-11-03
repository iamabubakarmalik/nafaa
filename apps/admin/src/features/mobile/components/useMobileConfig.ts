/** Loads the mobile remote settings into an editable draft and saves the whole object back. */

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { adminMobileApi, type MobileConfig } from '@/api/admin-mobile.api';

export function useMobileConfig() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['admin-mobile-config'], queryFn: adminMobileApi.config });
  const [draft, setDraft] = useState<MobileConfig | null>(null);
  useEffect(() => { if (query.data) setDraft(structuredClone(query.data.config)); }, [query.data]);

  const save = useMutation({
    mutationFn: (config: MobileConfig) => adminMobileApi.saveConfig(config),
    onSuccess: (res) => {
      qc.setQueryData(['admin-mobile-config'], res);
      toast.success('Saved. Apps pick this up within a minute.');
    },
    onError: () => toast.error('Could not save'),
  });

  const dirty = !!draft && !!query.data && JSON.stringify(draft) !== JSON.stringify(query.data.config);
  return {
    ...query,
    draft,
    setDraft,
    dirty,
    save: () => draft && save.mutate(draft),
    saving: save.isPending,
    reset: () => query.data && setDraft(structuredClone(query.data.config)),
  };
}
