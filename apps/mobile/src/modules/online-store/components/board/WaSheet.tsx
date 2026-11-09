/**
 * WhatsApp sheet of an order: the shop's message templates (the one that
 * fits the order first) and, for COD orders not yet sent, the customer's
 * answer (yes / no answer / refused). Sending a message adds the "Texted" tag.
 */

import { View } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, PhoneMissed, Settings2, XCircle } from 'lucide-react-native';
import { orderNo } from '@nafaa/core/online-store';
import { useAuthStore } from '@/core/auth/store';
import { haptic } from '@/core/device/haptics';
import { t } from '@/core/i18n';
import { Badge, Button, Icon, ListGroup, ListRow, Sheet, Text, toast, useTheme } from '@/design';
import { apiErrorMessage, ordersApi, scanApi } from '../../api/online';
import type { BoardOrder } from '../../api/board';
import { openWhatsApp } from '../../lib/device';
import { refreshOrders } from '../../lib/online';
import { WA_TEMPLATES, fillTemplate, orderValues, suggestTemplate, templateText, useWaTemplates } from '../../lib/wa';

type Result = 'CONFIRMED' | 'NO_ANSWER' | 'REFUSED';
export const TEXTED_TAG = 'Texted';

export function WaSheet({ order: o, onClose }: { order: BoardOrder | null; onClose: () => void }) {
  const th = useTheme();
  const qc = useQueryClient();
  const shop = useAuthStore((s) => s.tenant?.name ?? '');
  const saved = useWaTemplates(!!o).data?.templates;
  const risk = useQuery({ queryKey: ['risk-settings'], queryFn: scanApi.riskSettings, staleTime: 10 * 60_000, enabled: !!o });
  const set = useMutation({
    mutationFn: (r: Result) => ordersApi.setConfirmation(o!.id, r),
    onSuccess: (_d, r) => {
      refreshOrders(qc, o!.id);
      haptic('success');
      toast.success(r === 'CONFIRMED' ? t('Customer ne confirm kar diya') : r === 'NO_ANSWER' ? t('Jawab nahi — baad me dobara') : t('Customer ne mana kiya — order cancel kar dein'));
      onClose();
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('Nahi hua'))),
  });
  const texted = useMutation({
    mutationFn: (x: BoardOrder) => ordersApi.setTags(x.id, [...new Set([...(x.metadata?.tags ?? []), TEXTED_TAG])]),
    onSuccess: (_d, x) => refreshOrders(qc, x.id),
  });

  const best = o ? suggestTemplate(o) : 'confirm';
  const list = WA_TEMPLATES.filter((x) => x.key !== 'cart').sort((a, b) => (a.key === best ? -1 : b.key === best ? 1 : 0));
  const askResult = !!o && o.isCod && !o.dispatchedAt && !['CANCELLED', 'REJECTED', 'RETURNED', 'DELIVERED'].includes(o.orderStatus);
  const conf = o?.confirmation?.result;
  const send = (key: (typeof list)[number]['key']) => {
    if (!o) return;
    void openWhatsApp(o.customerPhone, fillTemplate(templateText(key, saved), orderValues(o, shop, risk.data?.advancePct ?? 30)));
    if (!(o.metadata?.tags ?? []).includes(TEXTED_TAG)) texted.mutate(o);
    if (!askResult) onClose();
  };
  const answer = (r: Result, label: string, icon: typeof CheckCircle2, tone: 'success' | 'warning' | 'danger') => (
    <Button key={r} size="sm" variant={conf === r ? (tone === 'warning' ? 'secondary' : tone) : 'secondary'} icon={icon} style={{ flex: 1 }}
      loading={set.isPending && set.variables === r} disabled={set.isPending} onPress={() => set.mutate(r)}>{label}</Button>
  );

  return (
    <Sheet open={!!o} onClose={onClose} title={o ? t('WhatsApp · #{{no}}', { no: orderNo(o) }) : undefined} description={o?.customerName}>
      {o && (
        <View style={{ gap: th.space(3) }}>
          <ListGroup>
            {list.map((x) => (
              <ListRow key={x.key} dense title={t(x.label)} subtitle={t(x.hint)} onPress={() => send(x.key)}
                leading={<View style={{ width: 30, height: 30, borderRadius: th.radius('md'), alignItems: 'center', justifyContent: 'center', backgroundColor: th.colors[x.tone].soft }}><Icon icon={x.icon} size={15} color={th.colors[x.tone].text} /></View>}
                trailing={x.key === best ? <Badge tone="success">{t('Behtar')}</Badge> : undefined} />
            ))}
          </ListGroup>
          {askResult && (
            <View style={{ gap: th.space(2) }}>
              <Text size="sm" weight="semibold" tone="secondary">{t('Customer ka jawab')}</Text>
              <View style={{ flexDirection: 'row', gap: th.space(2) }}>
                {answer('CONFIRMED', t('Haan'), CheckCircle2, 'success')}
                {answer('NO_ANSWER', t('Jawab nahi'), PhoneMissed, 'warning')}
                {answer('REFUSED', t('Mana kiya'), XCircle, 'danger')}
              </View>
            </View>
          )}
          <Button variant="ghost" icon={Settings2} onPress={() => { onClose(); setTimeout(() => router.push('/online/whatsapp-templates' as never), 250); }}>{t('Messages badlein')}</Button>
        </View>
      )}
    </Sheet>
  );
}
