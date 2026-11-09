/**
 * WhatsApp messages (web WaTemplatesPage): the shop's own text for each
 * template (confirm, address, advance, dispatched, delivered, cart). Empty
 * keeps the default. {name}, {no}, {total}… are filled per order.
 */

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, Save } from 'lucide-react-native';
import { haptic } from '@/core/device/haptics';
import { t } from '@/core/i18n';
import { PERMISSIONS, usePermission } from '@/core/permissions';
import { Button, Card, Icon, Screen, SkeletonRows, TextArea, Text, toast, useTheme } from '@/design';
import { apiErrorMessage } from '../api/online';
import { commerceApi, type WaTemplateKey } from '../api/board';
import { CommerceHero } from '../components/CommerceHero';
import { OnlineMenuButton } from '../components/OnlineMenu';
import { WA_KEY, WA_TEMPLATES, useWaTemplates } from '../lib/wa';
import { useOnlineGuard } from '../lib/online';

const PLACEHOLDERS = '{name} {shop} {no} {items} {total} {cod} {address} {city} {advance} {courier} {tracking} {trackingUrl} {cartUrl}';

export function WaTemplatesScreen() {
  const th = useTheme();
  const qc = useQueryClient();
  const can = usePermission();
  const canEdit = can(PERMISSIONS.ONLINE_ORDERS_MANAGE);
  const { guard } = useOnlineGuard();
  const q = useWaTemplates();
  const [draft, setDraft] = useState<Partial<Record<WaTemplateKey, string>>>({});
  useEffect(() => { if (q.data) setDraft(q.data.templates ?? {}); }, [q.data]);
  const own = WA_TEMPLATES.filter((x) => draft[x.key]?.trim()).length;

  const save = useMutation({
    mutationFn: () => commerceApi.saveWaTemplates(draft),
    onSuccess: (r) => { qc.setQueryData(WA_KEY, r); haptic('success'); toast.success(t('Messages save ho gaye')); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hua'))),
  });

  return (
    <Screen title={t('WhatsApp messages')} keyboard actions={<OnlineMenuButton current="/online/whatsapp-templates" />}
      footer={canEdit ? <Button size="lg" fullWidth icon={Save} loading={save.isPending} onPress={guard(() => save.mutate())}>{t('Save karein')}</Button> : undefined}>
      <CommerceHero chip={t('wa.me')} loading={q.isLoading}
        stats={[
          { label: t('Messages'), value: String(WA_TEMPLATES.length) },
          { label: t('Apne likhe'), value: String(own) },
          { label: t('Default'), value: String(WA_TEMPLATES.length - own) },
        ]} />
      <Text size="xs" tone="muted">{t('Ye khali jagahen har order se khud bharti hain: {{list}}', { list: PLACEHOLDERS })}</Text>
      {q.isLoading ? <SkeletonRows count={4} /> : WA_TEMPLATES.map((x) => (
        <Card key={x.key} title={t(x.label)} description={t(x.hint)}
          action={<View style={{ flexDirection: 'row', alignItems: 'center', gap: th.space(1) }}>
            <Icon icon={x.icon} size={16} color={th.colors[x.tone].text} />
            {canEdit && !!draft[x.key]?.trim() && <Button size="sm" variant="ghost" icon={RotateCcw} onPress={() => setDraft((d) => ({ ...d, [x.key]: '' }))}>{t('Default')}</Button>}
          </View>}>
          <TextArea value={draft[x.key] ?? ''} onChangeText={(v) => setDraft((d) => ({ ...d, [x.key]: v }))} placeholder={t(x.text)} disabled={!canEdit} numberOfLines={5} />
        </Card>
      ))}
    </Screen>
  );
}
