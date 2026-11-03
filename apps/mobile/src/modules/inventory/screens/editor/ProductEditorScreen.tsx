/**
 * Product editor (new and edit) for every industry: the industry config
 * gives the steps (shared basic / price / stock plus its own), shown as
 * tabs over one form with Save pinned at the bottom. A new product's draft is
 * kept on the phone until it is saved. Works offline: the product is saved
 * on the phone and sellable at once; photos, packs, variants and batches wait
 * for internet (the screen says which).
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { CloudOff, RotateCcw } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useAuthStore } from '@/core/auth/store';
import { apiErrorMessage } from '@/core/api/errors';
import { haptic } from '@/core/device/haptics';
import { t } from '@/core/i18n';
import { kv } from '@/core/storage/kv';
import { Card, ErrorState, FormTemplate, IconButton, Row, SkeletonRows, Tabs, Text, confirm, toast, useTheme } from '@/design';
import { useInventoryConfig, useProductRoutes } from '../../industry/registry';
import type { StepContext } from '../../industry/types';
import { INV, useOnline, useRefreshInventory } from '../../lib/shared';
import { freshDraft, loadCore } from './draft';
import { pendingParts, saveProduct } from './save';
import type { CoreDraft, EditorDraft, Errors } from './types';

type AnyDraft = EditorDraft<Record<string, unknown>>;

/** Keeps only the saved fields that still exist and have the same kind of value, so an old draft cannot break the editor. */
function pick(fresh: Record<string, unknown>, saved: unknown): Record<string, unknown> {
  const out = { ...fresh };
  if (!saved || typeof saved !== 'object') return out;
  for (const [k, v] of Object.entries(saved as Record<string, unknown>)) {
    if (!(k in fresh) || v === undefined) continue;
    const f = fresh[k];
    if (f == null || v == null ? true : Array.isArray(f) ? Array.isArray(v) : typeof f === typeof v && !Array.isArray(v)) out[k] = v;
  }
  return out;
}

function mergeSavedDraft(fresh: AnyDraft, saved: AnyDraft): AnyDraft {
  return { ...fresh, core: pick(fresh.core as unknown as Record<string, unknown>, saved.core) as unknown as AnyDraft['core'], extra: pick(fresh.extra, saved.extra) };
}

export function ProductEditorScreen() {
  const th = useTheme();
  const params = useLocalSearchParams<{ id?: string; barcode?: string; name?: string }>();
  const existingId = params.id && params.id !== 'new' ? params.id : undefined;
  const isEdit = !!existingId;
  const cfg = useInventoryConfig();
  const config = cfg.editor;
  const routes = useProductRoutes();
  const online = useOnline();
  const refresh = useRefreshInventory();
  const shopId = useAuthStore((s) => s.currentShopId);
  const draftKey = `nafaa.inv.product-draft.${cfg.id}`;

  const loaded = useQuery({
    queryKey: [INV, 'editor', existingId],
    queryFn: async () => {
      const { core, fromPhone } = await loadCore(existingId!);
      const extra = config.extra.load ? await config.extra.load(existingId!).catch(() => ({})) : {};
      return { core, extra, fromPhone };
    },
    enabled: isEdit,
    gcTime: 0,
  });

  const [draft, setDraft] = useState<AnyDraft | null>(() => {
    if (isEdit) return null;
    const saved = kv.get<AnyDraft | null>(draftKey, null);
    const fresh = freshDraft(config.extra.initial, config.core.units[0]?.value) as AnyDraft;
    const base = saved && !params.barcode ? mergeSavedDraft(fresh, saved) : fresh;
    return params.barcode || params.name ? { ...base, core: { ...base.core, barcode: params.barcode ?? base.core.barcode, name: params.name ?? base.core.name } } : base;
  });
  const original = useRef<CoreDraft | undefined>(undefined);
  const [restored] = useState(() => !isEdit && !!kv.get(draftKey, null) && !params.barcode);
  const [tab, setTab] = useState(config.steps[0]?.id ?? 'basic');
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (loaded.data && !draft) {
      original.current = loaded.data.core;
      setDraft({ core: loaded.data.core, extra: { ...(config.extra.initial as object), ...loaded.data.extra } as Record<string, unknown> });
    }
  }, [loaded.data]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep a new product's draft so an interrupted entry is not lost.
  useEffect(() => {
    if (!isEdit && draft && dirty) kv.set(draftKey, draft);
  }, [draft, dirty, isEdit, draftKey]);

  useEffect(() => {
    if (!done) return;
    router.replace(routes.detail(done) as never);
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const steps = useMemo(() => (draft ? config.steps.filter((s) => !s.when || s.when(draft)) : config.steps), [config.steps, draft]);

  if (isEdit && (loaded.isLoading || !draft)) {
    return (
      <FormTemplate title={t('Edit product')} onSave={() => undefined} saveDisabled>
        {loaded.error ? <ErrorState error={loaded.error} onRetry={loaded.refetch} /> : <SkeletonRows count={6} />}
      </FormTemplate>
    );
  }
  if (!draft) return null;

  const ctx: StepContext<Record<string, unknown>> = {
    draft, isEdit, productId: existingId, errors, online,
    setCore: (patch) => { setDirty(true); setDraft((d) => (d ? { ...d, core: { ...d.core, ...patch } } : d)); },
    setExtra: (patch) => { setDirty(true); setDraft((d) => (d ? { ...d, extra: { ...d.extra, ...patch } } : d)); },
  };

  const validate = (): boolean => {
    const all: Errors = {};
    let first: string | null = null;
    for (const s of steps) {
      const e = s.validate?.(draft, isEdit) ?? {};
      if (Object.keys(e).length && !first) first = s.id;
      Object.assign(all, e);
    }
    setErrors(all);
    if (first) { setTab(first); haptic('error'); toast.error(Object.values(all)[0]); }
    return !first;
  };

  const save = async () => {
    if (saving || !validate()) return;
    setSaving(t('Product save ho raha hai'));
    try {
      const res = await saveProduct(config, draft, { existingId, original: original.current, shopId, online, onStep: setSaving });
      kv.remove(draftKey);
      haptic('success');
      if (res.queued || res.skipped.length) {
        toast.info(res.queued ? t('Phone par save ho gaya — internet aane par bhej diya jayega') : t('Product save ho gaya'),
          res.skipped.length ? { message: t('Internet aane par dobara kholein aur save karein: {{parts}}', { parts: res.skipped.join(', ') }) } : undefined);
      } else {
        toast.success(isEdit ? t('Product update ho gaya') : t('"{{name}}" ban gaya', { name: draft.core.name.trim() }));
      }
      void refresh();
      setDirty(false);
      setDone(res.id);
    } catch (e) {
      toast.error(e instanceof Error && !(e as { response?: unknown }).response ? e.message : apiErrorMessage(e, t('Save nahi hua')));
    } finally {
      setSaving(null);
    }
  };

  const reset = async () => {
    if (!(await confirm({ title: t('Naya shuru karein?'), message: t('Likha hua mit jayega.'), tone: 'danger', confirmLabel: t('Saaf karein') }))) return;
    kv.remove(draftKey);
    setDraft(freshDraft(config.extra.initial, config.core.units[0]?.value) as AnyDraft);
    setDirty(false);
    setErrors({});
  };

  const active = steps.find((s) => s.id === tab) ?? steps[0];
  const waiting = !online ? pendingParts(config, draft.core, original.current) : [];
  const errorTabs = new Set(steps.filter((s) => Object.keys(s.validate?.(draft, isEdit) ?? {}).some((k) => errors[k])).map((s) => s.id));
  return (
    <FormTemplate
      title={isEdit ? t('Edit product') : t('New product')}
      subtitle={isEdit ? draft.core.name : t(cfg.label)}
      dirty={dirty}
      saving={!!saving}
      saveLabel={saving ?? (isEdit ? t('Save karein') : t('Product banayein'))}
      onSave={() => void save()}
      actions={!isEdit && (restored || dirty) ? <IconButton icon={RotateCcw} label={t('Naya shuru karein')} onPress={() => void reset()} /> : undefined}
    >
      <View style={{ gap: th.space(4) }}>
        <Tabs value={active.id} onChange={setTab}
          tabs={steps.map((s) => ({ value: s.id, label: errorTabs.has(s.id) ? `${t(s.title)} •` : t(s.title), icon: s.icon }))} />
        {restored && !dirty && <Text size="xs" tone="muted">{t('Pichla adhoora product wapas aa gaya')}</Text>}
        {(!online || loaded.data?.fromPhone) && (
          <Card tone="info">
            <Row gap={2} align="start">
              <CloudOff size={18} color={th.colors.info.text} />
              <Text size="sm" style={{ flex: 1 }}>
                {waiting.length
                  ? t('Internet nahi — product phone par save hoga. Ye internet aane par: {{parts}}', { parts: waiting.join(', ') })
                  : t('Internet nahi — product phone par save hoga aur internet aane par bhej diya jayega.')}
              </Text>
            </Row>
          </Card>
        )}
        {active.render(ctx)}
      </View>
    </FormTemplate>
  );
}
