/**
 * Courier auto-booking rules: when Nafaa books by itself (on accept or on
 * "ready") and on which courier. Rules run top to bottom on the customer's
 * city, COD amount, risk and channel; the first that fits books (or waits
 * for the shop), else the fallback. Risky customers wait when the shop keeps
 * that on. Mirrors the web CourierRulesPage.
 */

import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Hand, Plus, Save, Trash2, Zap } from 'lucide-react-native';
import { moveRule, newRule, ruleIncomplete, type CourierRule, type CourierRules, type RuleTrigger } from '@nafaa/core/online-store';
import { t } from '@/core/i18n';
import { PERMISSIONS, usePermission } from '@/core/permissions';
import {
  Button, Card, ChipGroup, ErrorState, IconButton, Input, MoneyInput, Screen, Segmented, Select, SkeletonRows, Switch, Text, toast, useTheme,
} from '@/design';
import { apiErrorMessage, moneyApi, ordersApi } from '../api/online';
import { CourierLogo } from '../components/BrandLogo';
import { Note } from '../components/bits';
import { RISK_LABEL } from '../lib/labels';
import { KEYS, useOnlineGuard } from '../lib/online';

const RISKS = ['NEW', 'WATCH', 'HIGH', 'OK', 'TRUSTED'] as const;

export function CourierRulesScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const can = usePermission();
  const canEdit = can(PERMISSIONS.ONLINE_ORDERS_MANAGE);
  const { guard } = useOnlineGuard('settings');
  const q = useQuery({ queryKey: KEYS.rules, queryFn: moneyApi.courierRules });
  const channelsQ = useQuery({ queryKey: KEYS.channels, queryFn: ordersApi.channels, staleTime: 5 * 60_000 });
  const [draft, setDraft] = useState<CourierRules | null>(null);
  useEffect(() => { if (q.data && !draft) setDraft(q.data.rules); }, [q.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = useMemo(() => !!draft && !!q.data && (!q.data.saved || JSON.stringify(draft) !== JSON.stringify(q.data.rules)), [draft, q.data]);
  const save = useMutation({
    mutationFn: () => moneyApi.saveCourierRules(draft!),
    onSuccess: (r) => { qc.setQueryData(KEYS.rules, r); setDraft(r.rules); toast.success(t('Auto booking save ho gayi')); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const couriers = q.data?.couriers ?? [];
  const courierOptions = couriers.map((c) => ({ value: c.code, label: `${c.name}${c.connected ? '' : c.api ? ` ${t('(jura nahi)')}` : ` ${t('(sirf haath se)')}`}`, disabled: !c.connected }));
  const setRule = (i: number, p: Partial<CourierRule>) => setDraft((d) => d && ({ ...d, rules: d.rules.map((r, j) => (j === i ? { ...r, ...p } : r)) }));
  const channels = channelsQ.data ?? [];

  return (
    <Screen title={t('Auto booking')} subtitle={t('Shehar, COD, risk aur channel ke rules')} keyboard
      actions={canEdit ? <IconButton icon={Save} label={t('Save')} variant={dirty ? 'primary' : 'ghost'} disabled={!dirty} onPress={guard(() => save.mutate())} /> : undefined}
      footer={dirty && canEdit ? <Button fullWidth size="lg" icon={Save} loading={save.isPending} onPress={guard(() => save.mutate())}>{t('Save')}</Button> : undefined}>
      {q.isLoading || !draft ? (q.error ? <ErrorState error={q.error} onRetry={q.refetch} /> : <SkeletonRows count={6} />) : (
        <>
          {!q.data!.saved && draft.trigger !== 'OFF' && (
            <Note tone="info">{t('Abhi purani setting chal rahi hai ({{name}} par accept hote hi). Save karne par yahi rules chalenge.', { name: couriers.find((c) => c.code === draft.fallback)?.name })}</Note>
          )}
          {!couriers.some((c) => c.connected) && <Note tone="warning">{t('Koi courier API se jura nahi — khud booking ke liye pehle Couriers me PostEx, Leopards ya TCS jorein.')}</Note>}
          <Card title={t('Kab book ho')} description={t('Book karne se pehle Nafaa dobara dekhta hai ke order pehle se book to nahi — do CN kabhi nahi bante.')}>
            <Segmented value={draft.trigger} onChange={(v: RuleTrigger) => canEdit && setDraft({ ...draft, trigger: v })}
              options={[{ value: 'OFF', label: t('Band') }, { value: 'ACCEPT', label: t('Accept hote hi') }, { value: 'READY', label: t('"Ready" par') }]} />
            <View style={{ marginTop: th.space(3) }}>
              <Switch value={draft.holdRisky} disabled={!canEdit} onChange={(v) => setDraft({ ...draft, holdRisky: v })} label={t('RTO khatre wale customer par ruk jao')}
                description={t('Customer ka risk zyada ho ya number block ho to khud book nahi hoga — order par likha aayega, aap dekh kar book karein.')} />
            </View>
          </Card>

          <Card title={t('Rules')} description={t('Upar se neeche — jo pehla rule fit ho wahi chalega.')}
            action={canEdit ? <Button size="sm" variant="secondary" icon={Plus} onPress={() => setDraft({ ...draft, rules: [...draft.rules, newRule(draft.rules.length)] })}>{t('Rule')}</Button> : undefined}>
            {!draft.rules.length ? <Text size="sm" tone="muted" align="center">{t('Koi rule nahi — sab orders neeche wale courier par jayenge.')}</Text> : (
              <View style={{ gap: th.space(4) }}>
                {draft.rules.map((r, i) => (
                  <View key={r.id} style={{ gap: th.space(2.5), paddingTop: i ? th.space(4) : 0, borderTopWidth: i ? 1 : 0, borderTopColor: th.colors.divider }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: th.colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}><Text size="xs" weight="bold">{i + 1}</Text></View>
                      <Text size="sm" weight="semibold" style={{ flex: 1 }}>{t('Agar')}</Text>
                      {canEdit && <>
                        <IconButton icon={ArrowUp} label={t('Upar')} size="sm" disabled={i === 0} onPress={() => setDraft({ ...draft, rules: moveRule(draft.rules, i, -1) })} />
                        <IconButton icon={ArrowDown} label={t('Neeche')} size="sm" disabled={i === draft.rules.length - 1} onPress={() => setDraft({ ...draft, rules: moveRule(draft.rules, i, 1) })} />
                        <IconButton icon={Trash2} label={t('Rule hatayein')} size="sm" variant="danger" onPress={() => setDraft({ ...draft, rules: draft.rules.filter((_, j) => j !== i) })} />
                      </>}
                    </View>
                    <Input label={t('Shehar (comma se)')} placeholder={t('Koi bhi')} value={r.cities.join(', ')} disabled={!canEdit}
                      onChangeText={(v) => setRule(i, { cities: v.split(',').map((x) => x.trimStart()).filter((x, k, a) => x || k === a.length - 1) })}
                      onBlur={() => setRule(i, { cities: r.cities.map((x) => x.trim()).filter(Boolean) })} />
                    <View style={{ flexDirection: 'row', gap: th.space(2) }}>
                      <MoneyInput containerStyle={{ flex: 1 }} label={t('COD kam az kam (Rs)')} placeholder={t('Koi had nahi')} value={r.codMin} disabled={!canEdit} onChangeValue={(v) => setRule(i, { codMin: v })} />
                      <MoneyInput containerStyle={{ flex: 1 }} label={t('COD zyada se zyada (Rs)')} placeholder={t('Koi had nahi')} value={r.codMax} disabled={!canEdit} onChangeValue={(v) => setRule(i, { codMax: v })} />
                    </View>
                    <Text size="xs" weight="semibold" tone="secondary">{t('Customer risk')} <Text size="xs" tone="muted">{r.risks.length ? '' : t('· koi bhi')}</Text></Text>
                    <ChipGroup wrap multiple value={r.risks} onChange={(v) => canEdit && setRule(i, { risks: v })} options={RISKS.map((k) => ({ value: k, label: t(RISK_LABEL[k]) }))} />
                    {channels.length > 1 && <>
                      <Text size="xs" weight="semibold" tone="secondary">{t('Channel')} <Text size="xs" tone="muted">{r.channelIds.length ? '' : t('· koi bhi')}</Text></Text>
                      <ChipGroup wrap multiple value={r.channelIds} onChange={(v) => canEdit && setRule(i, { channelIds: v })} options={channels.map((c) => ({ value: c.id, label: c.displayName }))} />
                    </>}
                    <View style={{ backgroundColor: th.colors.surfaceMuted, borderRadius: th.radius('md'), padding: th.space(3), gap: th.space(2) }}>
                      <Text size="sm" weight="semibold">{t('To')}</Text>
                      <Segmented value={r.action} onChange={(action) => canEdit && setRule(i, { action })} options={[{ value: 'BOOK', label: t('Book karo'), icon: Zap }, { value: 'ASK', label: t('Mujh se poocho'), icon: Hand }]} />
                      {r.action === 'BOOK' && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
                          {r.courier && <CourierLogo code={r.courier} size={28} />}
                          <View style={{ flex: 1 }}>
                            <Select value={r.courier ?? ''} disabled={!canEdit} placeholder={t('— courier chunein —')} title={t('Courier')} onChange={(v) => setRule(i, { courier: v || null })} options={courierOptions} />
                          </View>
                        </View>
                      )}
                    </View>
                    {ruleIncomplete(r) && <Text size="xs" weight="semibold" tone="warning">{t('Courier chunein — warna ye rule save nahi hoga.')}</Text>}
                  </View>
                ))}
              </View>
            )}
          </Card>

          <Card title={t('Baqi sab orders')} description={t('Jab koi rule fit na ho.')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(2) }}>
              {draft.fallback && <CourierLogo code={draft.fallback} size={28} />}
              <View style={{ flex: 1 }}>
                <Select value={draft.fallback ?? ''} disabled={!canEdit} title={t('Baqi orders ka courier')} onChange={(v) => setDraft({ ...draft, fallback: v || null })}
                  options={[{ value: '', label: t('Mujh se poocho (khud book na karo)') }, ...courierOptions]} />
              </View>
            </View>
          </Card>
        </>
      )}
    </Screen>
  );
}
