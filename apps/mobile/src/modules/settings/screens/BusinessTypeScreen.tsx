/**
 * Settings → Business type: how the business sells, the industry it runs as
 * (switching keeps all data) and every feature switch grouped by area
 * (web BusinessConfigSection + BusinessModelsCard). Feature changes save at
 * once. Only the owner can change any of it.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useAuthStore } from '@/core/auth/store';
import { cleanModels, effectiveModels, type BusinessModel } from '@/core/business-models';
import { t } from '@/core/i18n';
import { Badge, Button, Card, Chip, EmptyState, SearchBar, SettingSwitch, SettingsGroup, SettingsTemplate, SkeletonRows, Text, toast, useTheme } from '@/design';
import { BusinessModelPicker } from '@/modules/auth/components/BusinessModelPicker';
import { IndustryPicker } from '@/modules/auth/components/IndustryPicker';
import { industryChoices } from '@/modules/auth/lib/industry-choices';
import { businessConfigApi, setDistributionMode, type BusinessConfig } from '../api/settings';
import { FEATURES, FEATURE_GROUPS } from '../lib/features';
import { useSettingsOnline } from '../hooks/useSettings';
import { Note, OfflineNote, ownerOnly } from '../components/SettingsParts';

const KEY = ['business-config'];

function BusinessType() {
  const th = useTheme();
  const qc = useQueryClient();
  const online = useSettingsOnline();
  const updateTenant = useAuthStore((s) => s.updateTenant);
  const savedModels = useAuthStore((s) => s.tenant?.businessModels);
  const [models, setModels] = useState<BusinessModel[]>(() => effectiveModels(savedModels));
  const [changing, setChanging] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState<string | null>(null);

  const config = useQuery({ queryKey: KEY, queryFn: businessConfig, staleTime: 0 });
  const options = useQuery({ queryKey: ['onboarding-options'], queryFn: businessConfigApi.options, staleTime: 5 * 60_000, enabled: changing });
  const cfg = config.data;

  const saveFeature = useMutation({
    mutationFn: (patch: Record<string, boolean>) => businessConfigApi.updateFeatures(patch),
    onMutate: async (patch) => {
      const before = qc.getQueryData<BusinessConfig>(KEY);
      if (before) qc.setQueryData<BusinessConfig>(KEY, { ...before, features: { ...before.features, ...patch } });
      return { before };
    },
    onSuccess: (r) => { const c = qc.getQueryData<BusinessConfig>(KEY); if (c) { qc.setQueryData(KEY, { ...c, features: r.features }); updateTenant({ businessFeatures: r.features }); } },
    onError: (_e, _p, ctx) => { if (ctx?.before) qc.setQueryData(KEY, ctx.before); toast.error(t('Save nahi hua')); },
  });

  const changeType = useMutation({
    mutationFn: (type: string) => businessConfigApi.changeType(type),
    onSuccess: (next) => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ['settings'] });
      updateTenant({ businessType: next.businessType, businessFeatures: next.features, defaultUnit: next.defaultUnit });
      setChanging(false); setPending(null);
      toast.success(t('Business type badal gaya — features naye type ke hisaab se lag gaye'));
    },
    onError: () => { setPending(null); toast.error(t('Type nahi badla')); },
  });

  const saveModels = useMutation({
    mutationFn: async (next: BusinessModel[]) => {
      const r = await businessConfigApi.setModels(next);
      if (r.distributionMode) await setDistributionMode(r.distributionMode).catch(() => undefined);
      return r;
    },
    onSuccess: (r) => { updateTenant({ businessModels: r.businessModels }); toast.success(t('Save ho gaya — menu aur dashboard is hisaab se set ho gaye')); },
    onError: () => { setModels(effectiveModels(savedModels)); toast.error(t('Save nahi hua')); },
  });

  const enabledCount = useMemo(() => (cfg ? FEATURES.filter((f) => cfg.features[f.key]).length : 0), [cfg]);
  const counts = useMemo(() => {
    const m: Record<string, { on: number; total: number }> = {};
    for (const f of FEATURES) { const c = (m[f.group] ??= { on: 0, total: 0 }); c.total++; if (cfg?.features[f.key]) c.on++; }
    return m;
  }, [cfg]);
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return FEATURES.filter((f) => (!group || f.group === group) && (!q || `${t(f.label)} ${t(f.description)} ${t(f.group)} ${f.key}`.toLowerCase().includes(q)));
  }, [search, group]);
  const grouped = useMemo(() => {
    const m = new Map<string, typeof FEATURES>();
    for (const f of shown) m.set(f.group, [...(m.get(f.group) ?? []), f]);
    return [...m.entries()];
  }, [shown]);
  const choices = useMemo(() => {
    const allowed = new Set((options.data?.businessTypes ?? []).map((b) => b.value));
    return industryChoices(models).filter((c) => allowed.has(c.businessType));
  }, [options.data, models]);

  return (
    <SettingsTemplate title={t('Business type')} description={t('Industry aur us ke features on/off')} loading={config.isLoading && !cfg} error={!cfg && config.error} onRetry={config.refetch}>
      {!online && <OfflineNote />}
      {cfg && (
        <>
          <Card title={t('Aap kaise bechte hain?')} description={t('Is se menu, dashboard aur shortcuts aap ke kaam ke hisaab se lagte hain')}>
            <BusinessModelPicker value={models} hint="" label={t('Ek se zyada chun sakte hain')} onChange={(next) => { if (!online) return; setModels(cleanModels(next)); saveModels.mutate(cleanModels(next)); }} />
          </Card>

          <Card title={t('Aap ka business type')} description={t('Is se tay hota hai ke menu, product form aur POS me kya kya aata hai')}
            action={<Button size="sm" variant={changing ? 'secondary' : 'soft'} disabled={!online} onPress={() => setChanging((v) => !v)}>{changing ? t('Band karein') : t('Type badlein')}</Button>}>
            <View style={{ gap: th.space(2) }}>
              <Text size="xl" weight="bold">{`${cfg.template.emoji} ${cfg.template.label || cfg.businessType}`.trim()}</Text>
              {!!cfg.template.description && <Text size="sm" tone="muted">{cfg.template.description}</Text>}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(1.5) }}>
                <Badge>{t('Unit: {{unit}}', { unit: cfg.defaultUnit })}</Badge>
                <Badge>{t('{{on}} / {{count}} features chalu', { on: enabledCount, count: FEATURES.length })}</Badge>
              </View>
            </View>
            {changing && (
              <View style={{ gap: th.space(3), marginTop: th.space(4) }}>
                <Note tone="warning">{t('Features is type ke hisaab se dobara set ho jayenge. Aap ka purana data (products, Sales, customers) waise hi rahega.')}</Note>
                {options.isLoading ? <SkeletonRows count={3} avatar={false} /> : (
                  <IndustryPicker choices={choices} value={pending ?? cfg.businessType} label={t('Naya business type')} onChange={(v) => { if (v === cfg.businessType || changeType.isPending) return; setPending(v); changeType.mutate(v); }} />
                )}
                {changeType.isPending && <Text size="sm" tone="brand">{t('Business type badal raha hai…')}</Text>}
              </View>
            )}
          </Card>

          <Card title={t('Features')} description={t('Jo kaam aap ka store karta hai sirf wohi chalu rakhein — menu aur forms saaf rehte hain')}>
            <View style={{ gap: th.space(3) }}>
              <SearchBar value={search} onChangeText={setSearch} placeholder={t('Feature search karein (IMEI, expiry, warranty, tailoring…)')} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
                <Chip label={t('Sab')} selected={group === null} count={FEATURES.length} onPress={() => setGroup(null)} />
                {FEATURE_GROUPS.map((g) => <Chip key={g} label={t(g)} selected={group === g} count={counts[g]?.on} onPress={() => setGroup(group === g ? null : g)} />)}
              </View>
            </View>
          </Card>

          {grouped.length === 0 ? <EmptyState compact title={t('Kuch nahi mila')} /> : grouped.map(([g, list]) => (
            <SettingsGroup key={g} title={`${t(g)}  ${counts[g]?.on ?? 0}/${counts[g]?.total ?? 0}`}>
              {list.map((f) => (
                <SettingSwitch key={f.key} label={t(f.label)} description={t(f.description)} value={!!cfg.features[f.key]} disabled={!online}
                  onChange={(v) => saveFeature.mutate({ [f.key]: v })} />
              ))}
            </SettingsGroup>
          ))}

          {cfg.template.suggestedCategories.length > 0 && (
            <Card title={t('Mashwara: categories')} description={t('Is business type ke liye aam product categories')}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(1.5) }}>{cfg.template.suggestedCategories.map((c) => <Badge key={c}>{c}</Badge>)}</View>
            </Card>
          )}
          {cfg.template.quickUnits.length > 0 && (
            <Card title={t('Quick units')} description={t('POS par jaldi chunne wale units')}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(1.5) }}>{cfg.template.quickUnits.map((u) => <Badge key={u}>{u}</Badge>)}</View>
            </Card>
          )}
        </>
      )}
    </SettingsTemplate>
  );
}

const businessConfig = () => businessConfigApi.get();

export const BusinessTypeScreen = ownerOnly(BusinessType, 'Business type');
