/**
 * The shop's label design with a debounced save, so every counter prints
 * the same stickers. Changes made within the debounce window go in one
 * request; a failed save keeps its fields for the next try.
 */

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { barcodeLabelsApi, LABEL_DEFAULTS, type LabelConfig } from '../api/barcode-labels.api';

export const LABEL_SETTINGS_KEY = ['barcode-label-settings'];

export function useLabelConfig() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: LABEL_SETTINGS_KEY, queryFn: barcodeLabelsApi.settings, staleTime: 5 * 60_000 });
  const [config, setConfig] = useState<LabelConfig>(LABEL_DEFAULTS);
  const [dirty, setDirty] = useState(false);
  const pending = useRef<Partial<LabelConfig>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.data) setConfig({ ...LABEL_DEFAULTS, ...query.data.config, ...pending.current });
  }, [query.data]);

  const save = useMutation({ mutationFn: barcodeLabelsApi.save });

  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const patch = pending.current;
    if (!Object.keys(patch).length) return;
    pending.current = {};
    save.mutate(patch, {
      onSuccess: (saved) => {
        qc.setQueryData(LABEL_SETTINGS_KEY, (old: typeof query.data) => (old ? { ...old, config: saved } : old));
        if (!Object.keys(pending.current).length) setDirty(false);
      },
      onError: () => {
        pending.current = { ...patch, ...pending.current };
        toast.error('Label ki setting save nahi hui — internet check karein');
      },
    });
  };

  // Save what is waiting when the page closes.
  useEffect(() => () => { if (timer.current) { clearTimeout(timer.current); flush(); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch: Partial<LabelConfig>) => {
    setConfig((c) => ({ ...c, ...patch }));
    pending.current = { ...pending.current, ...patch };
    setDirty(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 700);
  };

  return {
    config,
    set,
    loading: query.isLoading,
    saving: dirty || save.isPending,
    missingBarcodes: query.data?.missingBarcodes ?? 0,
    refetch: query.refetch,
  };
}
