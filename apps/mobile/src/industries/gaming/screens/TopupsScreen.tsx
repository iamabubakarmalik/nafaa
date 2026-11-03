/** Digital top-ups (web GamingTopupsPage): card stock by kind, count in hand, cost and selling price; add a batch of cards. Cards are sold from the counter. */

import { CreditCard } from 'lucide-react-native';
import { useState } from 'react';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, StatTile, Row, toast } from '@/design';
import { useDeskOnline } from '../../_shared/deskKit';
import { DeskList, FormSheet } from '../../_shared/serviceKit';
import { gamingApi, type TopupInventoryRow, type TopupSummary } from '../api';
import { GAMING_KEYS, providerOf, providerOptions, refreshGaming } from '../meta';

export function TopupsScreen() {
  const canEdit = usePermission()(P.PRODUCTS_EDIT);
  const { guard } = useDeskOnline('gamingDesk');
  const [add, setAdd] = useState(false);
  return (
    <DeskList<{ rows: TopupInventoryRow[]; sum?: TopupSummary }> title={t('Digital top-ups')} queryKey={[GAMING_KEYS.topups]} fetch={async () => ({ rows: await gamingApi.topups.inventory(), sum: await gamingApi.topups.summary().catch(() => undefined) })} feature="gamingDesk" emptyIcon={CreditCard} empty={t('Abhi koi card stock nahi')}
      summary={(d) => d?.sum && <Row gap={2}><StatTile style={{ flex: 1, minWidth: 0 }} label={t('Stock me')} value={String(d.sum.available)} /><StatTile style={{ flex: 1, minWidth: 0 }} label={t('Stock value')} value={formatMoney(d.sum.stockValue)} /><StatTile style={{ flex: 1, minWidth: 0 }} label={t('Munafa')} value={formatMoney(d.sum.totalProfit)} /></Row>}
      rows={(d) => d.rows.map((r) => ({
        id: `${r.provider}-${r.topupType}-${r.denomination}`, icon: CreditCard, tone: r.count <= 5 ? 'warning' : 'accent', search: `${providerOf(r.provider)} ${r.denomination}`, title: `${providerOf(r.provider)} ${r.denomination}`,
        subtitle: t('Cost {{c}} · Sale {{s}}', { c: formatMoney(r.avgCost), s: formatMoney(r.sellingPrice) }), trailing: <Badge tone={r.count <= 5 ? 'warning' : 'info'}>{t('{{n}} card', { n: r.count })}</Badge>,
      }))}
      fab={canEdit ? { label: t('Cards jorein'), onPress: () => guard(() => setAdd(true)) } : undefined}>
      <FormSheet open={add} title={t('Cards jorein')} onClose={() => setAdd(false)}
        fields={[{ key: 'provider', label: t('Kis ka card'), kind: 'select', options: providerOptions(), required: true }, { key: 'denominationValue', label: t('Card ki value'), kind: 'number', required: true }, { key: 'costPrice', label: t('Cost'), kind: 'money', required: true }, { key: 'sellingPrice', label: t('Bechne ki qeemat'), kind: 'money', required: true }, { key: 'codes', label: t('Card codes (har line me ek)'), kind: 'multiline', required: true }]}
        initial={{ provider: 'PUBG_UC' }}
        onSubmit={async (v) => {
          const cards = String(v.codes).split(/\r?\n/).map((x) => x.trim()).filter(Boolean).map((cardCode) => ({ cardCode }));
          if (!cards.length) throw new Error(t('Kam az kam ek code likhein'));
          const r = await gamingApi.topups.bulkCreate({ provider: v.provider, topupType: 'VOUCHER', denominationValue: v.denominationValue, costPrice: v.costPrice ?? 0, sellingPrice: v.sellingPrice ?? 0, cards });
          refreshGaming(); toast.success(t('{{n}} card jur gaye', { n: r.created }));
        }} />
    </DeskList>
  );
}
