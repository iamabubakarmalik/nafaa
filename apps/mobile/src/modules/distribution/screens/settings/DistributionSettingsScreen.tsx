/**
 * Settings → Distribution. The on/off switch (refused while the plan lacks
 * the feature, which shows an upgrade prompt instead), the credit rule used
 * at invoicing, visit check-in, recovery verification, document number
 * prefixes and the default price list and godown. Changes save by
 * themselves a moment after the last edit.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { PLAN_FEATURE_TEXT, canPurchaseInApp } from '@/core/platform/purchases';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Button, Card, Input, Select, SettingLink, SettingsGroup, SettingsTemplate, SettingSwitch, Text, toast, useTheme } from '@/design';
import { DIST_KEY, distSetupApi, type CreditMode, type DistributionMode, type DistributionSettings, type SettingsResponse, type UpdateSettings } from '../../api/distribution.api';
import { useGodowns } from '../../api/setup-lookups';
import { useDistributionSettings } from '../../hooks/useDistribution';
import { PRICE_LISTS_KEY, digits } from '../../lib/setup';

const SETTINGS_KEY = [DIST_KEY, 'settings'];

const MODES: Array<{ value: DistributionMode; label: string; desc: string }> = [
  { value: 'WHOLESALE', label: t('Sirf wholesale'), desc: t('Price list, order, udhaar aur recovery') },
  { value: 'FULL', label: t('Poori distribution'), desc: t('Upar sab, saath me routes, booker, load sheet aur delivery') },
];
const CREDIT_MODES: Array<{ value: CreditMode; label: string; desc: string }> = [
  { value: 'WARN_THEN_PIN', label: t('Warning, phir PIN'), desc: t('Limit se zyada ya purana udhaar ho to Invoice par manager ka PIN') },
  { value: 'BLOCK', label: t('Rok dein'), desc: t('Limit se zyada udhaar par Invoice nahi banega') },
  { value: 'OFF', label: t('Check na karein'), desc: t('Udhaar ki limit aur din nahi dekhe jayenge') },
];

export function DistributionSettingsScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const q = useDistributionSettings();
  const can = usePermission();
  const canEdit = can(P.SETTINGS_EDIT);
  const data = q.data;
  const [draft, setDraft] = useState<DistributionSettings | null>(null);
  const pending = useRef<UpdateSettings>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { if (data) setDraft({ ...data.settings, ...pending.current }); }, [data]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const on = !!data?.access.enabled && !!data.access.planAllows;
  const listsQ = useQuery({ queryKey: PRICE_LISTS_KEY, queryFn: distSetupApi.priceLists, enabled: on });
  const shopsQ = useGodowns();

  const save = useMutation({
    mutationFn: (body: UpdateSettings) => distSetupApi.updateSettings(body),
    onSuccess: (r: SettingsResponse, body) => {
      qc.setQueryData(SETTINGS_KEY, r);
      if (body.enabled !== undefined) {
        void qc.invalidateQueries({ queryKey: [DIST_KEY] });
        toast.success(body.enabled ? t('Distribution chalu ho gaya') : t('Distribution band ho gaya'));
      }
    },
    onError: (_e, body) => {
      pending.current = { ...body, ...pending.current };
      if (data) setDraft({ ...data.settings });
    },
  });

  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const body = pending.current;
    if (!Object.keys(body).length) return;
    pending.current = {};
    save.mutate(body);
  };
  const set = <K extends keyof UpdateSettings>(k: K, v: UpdateSettings[K], now = false) => {
    setDraft((d) => (d ? { ...d, [k]: v } : d));
    pending.current = { ...pending.current, [k]: v };
    if (timer.current) clearTimeout(timer.current);
    if (now) flush(); else timer.current = setTimeout(flush, 700);
  };

  const access = data?.access;
  const lists = (listsQ.data ?? []).filter((l) => l.isActive);
  const shops = (shopsQ.data ?? []).filter((s) => s.isActive);

  return (
    <SettingsTemplate
      title={t('Distribution')}
      description={t('Field me booker order leta hai, office Invoice aur load sheet banata hai, delivery wala maal aur cash laata hai')}
      loading={q.isLoading || (!draft && !q.error)}
      error={!data && q.error ? q.error : undefined}
      onRetry={q.refetch}
    >
      {data && draft && access && (
        <>
          {!access.planAllows && (
            <Card tone="brand" title={t('Aap ke plan{{value}} me Distribution shamil nahi', { value: access.planName ? ` (${access.planName})` : '' })}
              description={canPurchaseInApp() ? t('Order booker app, routes, price lists, schemes, load sheet, settlement aur recovery — plan upgrade karke chalu karein.') : t(PLAN_FEATURE_TEXT)}
              action={<Sparkles size={20} color={th.colors.brand.text} />}>
              {canPurchaseInApp() && <Button style={{ marginTop: th.space(2) }} onPress={() => router.push('/billing' as never)}>{t('Plans dekhein')}</Button>}
            </Card>
          )}

          <SettingsGroup footnote={access.planAllows ? t('Band karne se purana data nahi mitta — sirf menu aur booker app band hote hain.') : canPurchaseInApp() ? t('Pehle plan upgrade karein.') : t('Aap ke plan me shamil nahi')}>
            <SettingSwitch label={t('Distribution chalu karein')} value={draft.enabled} disabled={!canEdit || !access.planAllows || save.isPending} onChange={(v) => set('enabled', v, true)} />
          </SettingsGroup>

          {on && (
            <>
              <View style={{ gap: th.space(2) }}>
                <Text size="sm" weight="semibold" tone="muted">{t('Kitna kaam chahiye?')}</Text>
                <Select value={draft.mode ?? 'FULL'} onChange={(v) => set('mode', v as DistributionMode, true)} disabled={!canEdit}
                  options={MODES.map((m) => ({ value: m.value, label: m.label, description: m.desc }))} />
              </View>

              <SettingsGroup title={t('Udhaar ka usool')} footnote={t('Order book karte waqt sirf warning aati hai. "Purana" = customer ke udhaar ke din (customer form me) guzar gaye.')}>
                <View style={{ padding: th.space(3) }}>
                  <Select value={draft.creditMode} onChange={(v) => set('creditMode', v as CreditMode)} disabled={!canEdit}
                    options={CREDIT_MODES.map((m) => ({ value: m.value, label: m.label, description: m.desc }))} />
                </View>
              </SettingsGroup>

              <SettingsGroup title={t('Visit aur recovery')}>
                <SettingSwitch label={t('Dukaan par check-in zaroori')} description={t('Door se visit likhi jaye to warning aati hai (rokti nahi) aur report me nishan lagta hai')}
                  value={draft.requireCheckIn} disabled={!canEdit} onChange={(v) => set('requireCheckIn', v)} />
                <SettingSwitch label={t('Recovery office verify kare')}
                  description={draft.recoveryNeedsVerify ? t('Booker ka laya cash office ke verify karne par khata me jata hai') : t('Booker ka laya cash foran khata me chala jata hai')}
                  value={draft.recoveryNeedsVerify} disabled={!canEdit} onChange={(v) => set('recoveryNeedsVerify', v)} />
                <View style={{ padding: th.space(3) }}>
                  <Input ltr label={t('Dukaan se kitni door tak theek')} hint={t('Customer ki GPS location se itne meter tak visit theek maani jati hai')}
                    value={String(draft.checkInRadiusM ?? '')} onChangeText={(v) => { const n = Number(digits(v)); set('checkInRadiusM', Math.min(5000, n)); }}
                    keyboardType="number-pad" trailing={<Text tone="muted">{t('meter')}</Text>} disabled={!canEdit} />
                </View>
              </SettingsGroup>

              <SettingsGroup title={t('Default')} footnote={t('Jab customer ya route par kuch na likha ho')}>
                <View style={{ padding: th.space(3), gap: th.space(3) }}>
                  <Select label={t('Default price list')} value={draft.defaultPriceListId ?? ''} onChange={(v) => set('defaultPriceListId', v || null)} disabled={!canEdit}
                    options={[{ value: '', label: t('— List par "Default" wali —') }, ...lists.map((l) => ({ value: l.id, label: l.name }))]}
                    hint={t('Jis customer ki apni list nahi, us par yeh list')} />
                  <Select label={t('Default godown')} value={draft.defaultShopId ?? ''} onChange={(v) => set('defaultShopId', v || null)} disabled={!canEdit}
                    options={[{ value: '', label: t('— Route ka godown —') }, ...shops.map((s) => ({ value: s.id, label: s.name }))]}
                    hint={t('Route par godown na ho to maal yahan se nikalta hai')} />
                </View>
              </SettingsGroup>

              <SettingsGroup title={t('Numbers')} footnote={t('Order aur load sheet ke number ka shuru ka hissa')}>
                <View style={{ padding: th.space(3), gap: th.space(3) }}>
                  <Input ltr label={t('Order')} value={draft.orderPrefix} maxLength={10} autoCapitalize="characters" disabled={!canEdit}
                    onChangeText={(v) => set('orderPrefix', v.toUpperCase())} hint={t('Misal: {{value}}000042', { value: draft.orderPrefix || 'SO-' })} />
                  <Input ltr label={t('Load sheet')} value={draft.loadSheetPrefix} maxLength={10} autoCapitalize="characters" disabled={!canEdit}
                    onChangeText={(v) => set('loadSheetPrefix', v.toUpperCase())} hint={t('Misal: {{value}}000007', { value: draft.loadSheetPrefix || 'LS-' })} />
                </View>
              </SettingsGroup>

              <SettingsGroup title={t('Distribution')}>
                <SettingLink label={t('Price lists')} description={t('Har customer group ka rate')} onPress={() => router.push('/distribution/price-lists' as never)} />
                {draft.mode !== 'WHOLESALE' && <SettingLink label={t('Routes')} description={t('Din, booker, dukaanein')} onPress={() => router.push('/distribution/routes' as never)} />}
                <SettingLink label={t('Schemes')} description={t('10+1, % off, slab')} onPress={() => router.push('/distribution/schemes' as never)} />
              </SettingsGroup>
            </>
          )}
        </>
      )}
    </SettingsTemplate>
  );
}
