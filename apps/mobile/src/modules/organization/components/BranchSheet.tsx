/** One branch: today's figures, drawer, stock and staff on duty, with its actions. */

import { AlertTriangle, BarChart3, Boxes, MapPin, Pencil, Phone, Power, Trash2, Users, Wallet } from 'lucide-react-native';
import { Linking, View } from 'react-native';
import { t } from '@/core/i18n';
import { Amount, Badge, Button, Card, Icon, Row, Sheet, StatTile, Text, useTheme } from '@/design';
import { KV } from './parts';
import type { Shop, ShopAnalyticsRow } from '../api/organization';
import { SHOP_TYPES } from '../lib/meta';

export function BranchSheet({ shop, figures, costHidden, canManage, onClose, onEdit, onToggle, onDelete, onCompare }: {
  shop: Shop | null;
  figures?: ShopAnalyticsRow;
  costHidden: boolean;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onCompare: () => void;
}) {
  const th = useTheme();
  const type = shop ? SHOP_TYPES[shop.type] : null;
  const f = figures;
  return (
    <Sheet open={!!shop} onClose={onClose} title={shop?.name}
      footer={shop && canManage ? (
        <Row gap={2}>
          <Button variant="secondary" icon={Pencil} style={{ flex: 1 }} onPress={onEdit}>{t('Edit')}</Button>
          <Button variant={shop.isActive ? 'secondary' : 'primary'} icon={Power} style={{ flex: 1 }} onPress={onToggle}>{shop.isActive ? t('Switch off') : t('Switch on')}</Button>
        </Row>
      ) : undefined}>
      {shop && type && (
        <View style={{ gap: th.space(3) }}>
          <Row gap={2} wrap>
            <Badge tone="info" icon={type.icon}>{t(type.label)}</Badge>
            {shop.isMain && <Badge tone="warning">{t('Main')}</Badge>}
            {!shop.isActive && <Badge tone="neutral">{t('Off')}</Badge>}
          </Row>
          {!!shop.address && <Row gap={2}><Icon icon={MapPin} size={16} tone="subtle" /><Text size="sm" style={{ flex: 1 }}>{shop.address}</Text></Row>}
          {!!shop.phone && (
            <Row gap={2}><Icon icon={Phone} size={16} tone="subtle" /><Text size="sm" ltr onPress={() => Linking.openURL(`tel:${shop.phone}`)}>{shop.phone}</Text></Row>
          )}
          {f ? (
            <>
              <View style={{ flexDirection: 'row', gap: th.space(2) }}>
                <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Today sale')} value={<Amount value={f.todaySales} weight="bold" />} hint={t('{{count}} bills', { count: f.todayOrders })} />
                <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Wallet} tone={f.registerOpen ? 'success' : 'neutral'} label={t('Drawer')}
                  value={f.registerOpen ? <Amount value={f.registerBalance} weight="bold" /> : <Text weight="bold">{t('Closed')}</Text>}
                  hint={f.registerOpen ? undefined : shop.type === 'SHOP' ? t('Aaj abhi nahi khula') : t('Store — drawer nahi')} />
              </View>
              <View style={{ flexDirection: 'row', gap: th.space(2) }}>
                <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Boxes} tone="info" label={t('Stock (cost)')}
                  value={costHidden || f.stockValue === undefined ? <Text weight="bold">—</Text> : <Amount value={f.stockValue} weight="bold" />}
                  hint={f.lowStockCount > 0 ? t('{{count}} cheezein kam', { count: f.lowStockCount }) : undefined} />
                <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} icon={Users} tone="accent" label={t('Duty par')} value={<Text weight="bold" ltr>{`${f.staffOnDuty} / ${f.staffCount}`}</Text>}
                  hint={f.onDutyNames.length ? f.onDutyNames.join(', ') : t('Abhi koi nahi')} />
              </View>
              <Card flush>
                <View style={{ padding: th.space(3), gap: th.space(1.5) }}>
                  <KV label={t('Is mahine')} value={<Amount value={f.monthSales} />} />
                  {f.outstandingCredit > 0 && <KV label={t('Udhaar baqi')} value={<Amount value={f.outstandingCredit} />} />}
                  {f.lowStockCount > 0 && (
                    <Row gap={2}><Icon icon={AlertTriangle} size={14} tone="warning" /><Text size="xs" tone="warning">{t('{{count}} cheezein kam', { count: f.lowStockCount })}</Text></Row>
                  )}
                </View>
              </Card>
              <Button variant="soft" icon={BarChart3} onPress={onCompare}>{t('Compare branches')}</Button>
            </>
          ) : (
            <Text size="sm" tone="muted">
              {!shop.isActive ? t('Branch band hai — is me sale nahi hoti. Chalu karne ke liye power ka button dabayein.') : t('{{value}} login · {{value2}} cheezon ka stock record', { value: shop._count?.users ?? 0, value2: shop._count?.shopStocks ?? 0 })}
            </Text>
          )}
          {canManage && !shop.isMain && (
            <Button variant="danger" icon={Trash2} onPress={onDelete}>{t('Delete')}</Button>
          )}
        </View>
      )}
    </Sheet>
  );
}
