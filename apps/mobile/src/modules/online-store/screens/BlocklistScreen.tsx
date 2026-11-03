/**
 * Block list: fake or RTO numbers. Their new orders are never accepted by
 * themselves and wait in "Naye" with a Blocked mark. Also the shop's
 * risky-customer rule (ask for an advance before dispatch). Mirrors the web
 * BlocklistPage.
 */

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldBan, Trash2 } from 'lucide-react-native';
import { formatDateTime } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS, usePermission } from '@/core/permissions';
import { Button, Card, EmptyState, IconButton, Input, ListTemplate, Switch, Text, confirm, toast, useTheme } from '@/design';
import { apiErrorMessage, ordersApi, scanApi } from '../api/online';
import { SavedDataNote } from '../components/bits';
import { KEYS, useOnlineGuard } from '../lib/online';

export function BlocklistScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const can = usePermission();
  const canManage = can(PERMISSIONS.ONLINE_ORDERS_MANAGE);
  const { guard } = useOnlineGuard();
  const q = useQuery({ queryKey: KEYS.blocklist, queryFn: ordersApi.blocklist });
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [search, setSearch] = useState('');
  const refresh = () => { qc.invalidateQueries({ queryKey: KEYS.blocklist }); qc.invalidateQueries({ queryKey: KEYS.orders }); };
  const add = useMutation({
    mutationFn: () => ordersApi.block({ phone: phone.trim(), name: name.trim() || undefined, reason: reason.trim() || undefined }),
    onSuccess: () => { toast.success(t('Number block ho gaya')); setPhone(''); setName(''); setReason(''); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const remove = useMutation({
    mutationFn: (p: string) => ordersApi.unblock(p),
    onSuccess: () => { toast.success(t('Unblock ho gaya')); refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const term = search.trim().toLowerCase();
  const digits = term.replace(/\D/g, '');
  const rows = (q.data ?? []).filter((b) => !term || (digits && b.key.includes(digits)) || (b.name ?? '').toLowerCase().includes(term));

  return (
    <ListTemplate
      title={t('Block list')}
      subtitle={t('Fake ya RTO karne wale numbers')}
      search={{ value: search, onChange: setSearch, placeholder: t('Number ya naam…') }}
      summary={(
        <View style={{ gap: th.space(3) }}>
          <SavedDataNote query={q} />
          <Text size="xs" tone="muted">{t("In se aane wale order khud accept nahi hote — 'Blocked' ke nishan ke saath 'Naye' me rukte hain.")}</Text>
          <RiskRuleCard canEdit={can(PERMISSIONS.SETTINGS_EDIT) || canManage} />
          {canManage && (
            <Card title={t('Number block karein')}>
              <View style={{ gap: th.space(2) }}>
                <Input label={t('Phone')} value={phone} onChangeText={setPhone} placeholder={t('03xxxxxxxxx')} keyboardType="phone-pad" ltr />
                <Input label={t('Naam (optional)')} value={name} onChangeText={setName} maxLength={80} />
                <Input label={t('Wajah (optional)')} value={reason} onChangeText={setReason} placeholder={t('Fake order')} maxLength={200} />
                <Button variant="critical" icon={ShieldBan} disabled={phone.replace(/\D/g, '').length < 10} loading={add.isPending} onPress={guard(() => add.mutate())}>{t('Block')}</Button>
              </View>
            </Card>
          )}
          <Text size="sm" weight="semibold" tone="secondary">{t('Blocked numbers ({{value}})', { value: q.data?.length ?? 0 })}</Text>
        </View>
      )}
      data={rows}
      loading={q.isLoading}
      error={q.isError && !q.data ? q.error : undefined}
      onRetry={q.refetch}
      refreshing={q.isRefetching}
      onRefresh={q.refetch}
      keyExtractor={(b) => b.key}
      renderItem={({ item: b }) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(3), paddingHorizontal: th.space(4), paddingVertical: th.space(2.5) }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text size="sm" weight="semibold" ltr>{b.phone}{b.name ? <Text size="sm" tone="secondary"> · {b.name}</Text> : null}</Text>
            <Text size="xs" tone="muted" numberOfLines={2}>{[b.reason, formatDateTime(b.at)].filter(Boolean).join(' · ')}</Text>
          </View>
          {canManage && <IconButton icon={Trash2} label={t('Unblock')} variant="secondary"
            onPress={guard(async () => { if (await confirm({ title: t('{{phone}} unblock karein?', { phone: b.phone }), confirmLabel: t('Unblock') })) remove.mutate(b.phone); })} />}
        </View>
      )}
      empty={<EmptyState icon={ShieldBan} title={t('Koi number block nahi')} message={t('Order ke andar "Number block" se bhi block kar sakte hain.')} />}
    />
  );
}

/** Shop rule: ask risky COD customers for an advance before dispatch. */
function RiskRuleCard({ canEdit }: { canEdit: boolean }) {
  const th = useTheme();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['risk-settings'], queryFn: scanApi.riskSettings });
  const [pct, setPct] = useState('');
  useEffect(() => { if (q.data) setPct(String(q.data.advancePct)); }, [q.data?.advancePct]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = useMutation({
    mutationFn: (body: { askAdvance?: boolean; advancePct?: number }) => scanApi.saveRiskSettings(body),
    onSuccess: (r) => { qc.setQueryData(['risk-settings'], r); toast.success(t('Setting save ho gayi')); qc.invalidateQueries({ queryKey: ['online-order'] }); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  if (!q.data) return null;
  return (
    <Card title={t('Fake / risky orders')} description={t('Nafaa har order par pichhle RTO, baar baar cancel, shehar jo courier nahi jaata, naye customer ka bahut bara COD aur kuch minute me dobara order dekhta hai.')}>
      <Switch value={q.data.askAdvance} disabled={!canEdit || save.isPending} onChange={(v) => save.mutate({ askAdvance: v })} label={t('Risk HIGH ho to advance maangein')}
        description={t('Aise COD order khud accept nahi honge, aur order par advance maangne ke button aayenge (WhatsApp, payment link, block).')} />
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: th.space(2), marginTop: th.space(2) }}>
        <Input containerStyle={{ flex: 1 }} label={t('Kitna advance (% order ka)')} value={pct} onChangeText={setPct} keyboardType="number-pad" ltr disabled={!canEdit} />
        {canEdit && <Button variant="secondary" loading={save.isPending} disabled={String(q.data.advancePct) === pct || !(Number(pct) >= 5 && Number(pct) <= 100)} onPress={() => save.mutate({ advancePct: Number(pct) })}>{t('Save')}</Button>}
      </View>
    </Card>
  );
}
