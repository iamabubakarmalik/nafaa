/**
 * Product editor state: the draft, loading an existing product (product and
 * industry details together, so neither arrives late and gets lost), a saved
 * draft for new products only, step validation, and saving.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { forceRefreshProducts } from '@core/lib/offline/offlineProducts';
import { useShopParam } from '@core/stores/auth.store';
import { CATALOG_KEY } from '../list/useCatalog';
import { freshDraft, loadCore } from './draft';
import { saveProduct } from './save';
import type { CoreDraft, EditorConfig, EditorDraft, Errors } from './types';

const readStored = <X,>(key: string): EditorDraft<X> | null => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
};

export function useProductEditor<X>(config: EditorConfig<X>) {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const isEdit = !!id;
  const qc = useQueryClient();
  const shopId = useShopParam();
  const defaultUnit = config.core.units[0]?.value ?? 'pcs';

  const [draft, setDraft] = useState<EditorDraft<X>>(() => {
    const d = freshDraft(config.extra.initial, defaultUnit);
    const code = params.get('barcode');
    if (code) d.core.barcode = code;
    return d;
  });
  const [stored, setStored] = useState<EditorDraft<X> | null>(() => (isEdit ? null : readStored<X>(config.draftKey)));
  const original = useRef<CoreDraft | undefined>(undefined);
  const [ready, setReady] = useState(!isEdit);

  const existing = useQuery({
    queryKey: ['product-editor', id],
    enabled: isEdit,
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const [core, extra] = await Promise.all([loadCore(id!), config.extra.load?.(id!) ?? Promise.resolve({})]);
      return { core, extra };
    },
  });
  useEffect(() => {
    if (!existing.data || ready) return;
    original.current = structuredClone(existing.data.core);
    setDraft({ core: existing.data.core, extra: { ...structuredClone(config.extra.initial), ...existing.data.extra } as X });
    setReady(true);
  }, [existing.data, ready, config.extra.initial]);

  // Only a new product keeps a draft; editing never overwrites it.
  useEffect(() => {
    if (isEdit || stored) return;
    const t = setTimeout(() => {
      try {
        if (draft.core.name.trim()) localStorage.setItem(config.draftKey, JSON.stringify(draft));
      } catch { /* storage full or blocked */ }
    }, 400);
    return () => clearTimeout(t);
  }, [draft, isEdit, stored, config.draftKey]);

  const setCore = useCallback((patch: Partial<CoreDraft>) => setDraft((d) => ({ ...d, core: { ...d.core, ...patch } })), []);
  const setExtra = useCallback((patch: Partial<X>) => setDraft((d) => ({ ...d, extra: { ...d.extra, ...patch } })), []);

  const steps = useMemo(() => config.steps.filter((s) => !s.when || s.when(draft)), [config.steps, draft]);
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const stepErrors = useMemo(() => steps.map((s) => s.validate?.(draft, isEdit) ?? {}), [steps, draft, isEdit]);
  const errorsFor = (i: number): Errors => {
    const all = stepErrors[i] ?? {};
    return showAll ? all : Object.fromEntries(Object.entries(all).filter(([k]) => touched.has(k)));
  };
  const firstInvalid = stepErrors.findIndex((e) => Object.keys(e).length > 0);
  const valid = firstInvalid === -1;

  const goTo = (i: number) => {
    // Forward only through valid steps; back is always allowed.
    const blocked = stepErrors.slice(0, i).findIndex((e) => Object.keys(e).length > 0);
    if (i > stepIndex && blocked !== -1 && blocked < i) { setStepIndex(blocked); setShowAll(true); return false; }
    setStepIndex(i); setShowAll(false);
    return true;
  };
  const next = () => {
    if (Object.keys(stepErrors[stepIndex] ?? {}).length) { setShowAll(true); return false; }
    return goTo(Math.min(stepIndex + 1, steps.length - 1));
  };

  const [saving, setSaving] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const save = async () => {
    if (!valid) { setStepIndex(firstInvalid); setShowAll(true); throw new Error('Kuch khane adhoore hain'); }
    setSaving('Shuru');
    try {
      const pid = await saveProduct(config, draft, { existingId: id, original: original.current, shopId, onStep: setSaving });
      ['products', 'product', 'products-for-pos', CATALOG_KEY, 'product-units', 'product-variants', 'product-batches', 'product-images', 'product-insights', ...(config.refresh ?? [])]
        .forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      void forceRefreshProducts().catch(() => undefined);
      if (!isEdit) { try { localStorage.removeItem(config.draftKey); } catch { /* storage blocked */ } }
      setSavedId(pid);
      return pid;
    } finally { setSaving(null); }
  };

  const dirty = isEdit ? ready && JSON.stringify(draft.core) !== JSON.stringify(original.current) : !!draft.core.name.trim();

  return {
    id, isEdit, ready, loadError: existing.error as Error | null,
    draft, setDraft, setCore, setExtra,
    steps, step, stepIndex, goTo, next, back: () => goTo(Math.max(0, stepIndex - 1)),
    errors: errorsFor(stepIndex), stepErrors, valid,
    touch: (f: string) => setTouched((t) => (t.has(f) ? t : new Set(t).add(f))),
    stored,
    restore: () => { if (stored) setDraft({ core: { ...freshDraft(config.extra.initial, defaultUnit).core, ...stored.core }, extra: { ...structuredClone(config.extra.initial), ...stored.extra } }); setStored(null); },
    discardStored: () => { try { localStorage.removeItem(config.draftKey); } catch { /* storage blocked */ } setStored(null); },
    reset: () => { setDraft(freshDraft(config.extra.initial, defaultUnit)); setStepIndex(0); setTouched(new Set()); setShowAll(false); setSavedId(null); },
    save, saving, savedId, dirty,
  };
}

export type EditorState<X> = ReturnType<typeof useProductEditor<X>>;
