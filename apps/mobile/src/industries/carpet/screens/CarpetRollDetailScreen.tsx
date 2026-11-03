/**
 * One roll (web CarpetRollDetailPage): size left, value, every movement
 * (opening, bill cuts with their bill, adjustments, waste, voids) and the
 * pieces cut from it. Edit, adjust, damage, finish and remove need their own permissions.
 */

import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Ban, CheckCircle2, History, Layers, Pencil, Ruler, SlidersHorizontal, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Card, DetailRow, DetailSection, DetailTemplate, IconButton, ListRow, ProgressBar, Row, Text, useTheme } from '@/design';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote, useDeskOnline } from '../../_shared/deskKit';
import { StatGrid } from '../../_shared/trade/kit';
import { carpetRollsApi } from '../api';
import { AdjustRollSheet, RollActionSheet, type RollAction } from '../components/RollSheets';
import { MOVE_LABEL, ROLLS_KEY, ftIn, pieceStatus, r2, realFt, rollStatus } from '../meta';

export function CarpetRollDetailScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const can = usePermission();
  const { cost } = useCostMask();
  const { guard } = useDeskOnline('carpetDesk');
  const [adjust, setAdjust] = useState(false);
  const [action, setAction] = useState<RollAction | null>(null);
  const q = useQuery({ queryKey: [ROLLS_KEY, 'one', id], queryFn: () => carpetRollsApi.getOne(id!), enabled: !!id });
  const roll = q.data;
  const canEdit = can(P.PRODUCTS_EDIT);
  const canStock = can(P.STOCK_ADJUSTMENTS_MANAGE);

  const st = roll ? rollStatus(roll.status) : null;
  const orig = roll ? realFt(roll.originalLengthFt, roll.originalLengthInch) : 0;
  const left = roll ? realFt(roll.remainingLengthFt, roll.remainingLengthInch) : 0;
  const pct = orig > 0 ? Math.round((1 - left / orig) * 100) : 0;
  const open = roll?.status === 'ACTIVE' || roll?.status === 'RESERVED';
  const moves = roll?.movements ?? [];
  const cuts = moves.filter((m) => m.type === 'CUT_FOR_SALE');
  const pieces = roll?.cutPieces ?? [];

  return (
    <DetailTemplate
      title={roll?.rollNumber ?? t('Roll')}
      subtitle={roll ? [roll.product?.name, roll.variant?.name, roll.rackNumber && t('Rack {{rackNumber}}', { rackNumber: roll.rackNumber })].filter(Boolean).join(' · ') : undefined}
      loading={q.isLoading} error={q.data ? null : q.error} onRetry={() => void q.refetch()} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
      actions={roll && canEdit ? <IconButton icon={Pencil} label={t('Edit')} onPress={() => guard(() => router.push(`/carpet/rolls/${roll.id}/edit` as never))} /> : undefined}
      bottomActions={roll && canStock && roll.status !== 'TRANSFERRED' ? <Button fullWidth icon={SlidersHorizontal} onPress={() => guard(() => setAdjust(true))}>{t('Adjust')}</Button> : undefined}
    >
      {roll && st && (
        <View style={{ gap: th.space(4) }}>
          <OfflineNote feature="carpetDesk" />
          <Row gap={2}><Badge tone={st.tone}>{t(st.label)}</Badge><Text size="sm" tone="muted" ltr>{ftIn(roll.widthFt, roll.widthInch)} × {ftIn(roll.remainingLengthFt, roll.remainingLengthInch)}</Text></Row>
          <StatGrid items={[
            { icon: Ruler, label: t('Bacha'), value: `${r2(roll.remainingSqft)} sqft`, hint: ftIn(roll.remainingLengthFt, roll.remainingLengthInch) },
            { icon: Layers, tone: 'success', label: t('Bechne par'), value: formatMoney(roll.remainingSqft * roll.salePricePerSqft) },
          ]} />
          <View style={{ gap: 6 }}>
            <ProgressBar value={pct / 100} tone={pct > 90 ? 'danger' : pct > 60 ? 'warning' : 'success'} />
            <Text size="xs" tone="muted">{t('Istemal')} {pct}% · {t('{{count}} cut', { count: cuts.length })}</Text>
          </View>

          <DetailSection title={t('Roll ki details')}>
            <DetailRow label={t('Asal size')} value={`${ftIn(roll.widthFt, roll.widthInch)} × ${ftIn(roll.originalLengthFt, roll.originalLengthInch)} (${r2(roll.originalSqft)} sqft)`} />
            <DetailRow label={t('Cost / sqft')} value={cost(roll.costPerSqft)} />
            <DetailRow label={t('Rate / sqft')} value={formatMoney(roll.salePricePerSqft)} />
            <DetailRow label={t('Wholesale / sqft')} value={roll.wholesalePricePerSqft ? formatMoney(roll.wholesalePricePerSqft) : '—'} />
            <DetailRow label={t('Design code')} value={roll.designCode || '—'} />
            <DetailRow label={t('Quality')} value={[roll.quality, roll.pile].filter(Boolean).join(' · ') || '—'} />
            <DetailRow label={t('Kahan se')} value={roll.sourceType === 'PURCHASE' ? t('Purchase') : roll.sourceType === 'OPENING_STOCK' ? t('Opening stock') : roll.sourceType} />
            <DetailRow label={t('Aaya')} value={formatDate(roll.receivedAt)} last />
          </DetailSection>
          {roll.notes ? <Card tone="default"><Text size="sm">{roll.notes}</Text></Card> : null}

          {canStock && open && (
            <Row gap={2} wrap>
              <Button variant="secondary" icon={CheckCircle2} onPress={() => guard(() => setAction('finish'))}>{t('Khatam')}</Button>
              <Button variant="secondary" icon={Ban} onPress={() => guard(() => setAction('damage'))}>{t('Damage')}</Button>
              <Button variant="ghost" icon={Trash2} onPress={() => guard(() => setAction('remove'))}>{t('Stock se hatayein')}</Button>
            </Row>
          )}

          <Card flush title={t('History')} description={t('Har kami, zyadti aur bill ka cut')}>
            {moves.length === 0 ? <View style={{ padding: th.space(4) }}><Text size="sm" tone="muted">{t('Koi record nahi.')}</Text></View> : moves.map((m, i) => (
              <ListRow key={m.id} divider={i < moves.length - 1} icon={History} iconTone={m.lengthFt < 0 ? 'danger' : 'success'}
                title={MOVE_LABEL[m.type] ? t(MOVE_LABEL[m.type]) : m.type}
                subtitle={[formatDate(m.createdAt), m.note].filter(Boolean).join(' · ')}
                trailing={<View style={{ alignItems: 'flex-end' }}>
                  <Text size="sm" weight="semibold" tone={m.lengthFt < 0 ? 'danger' : 'success'} ltr>{t('{{value}}{{lengthFt}} ft', { value: m.lengthFt > 0 ? '+' : '', lengthFt: r2(m.lengthFt) })}</Text>
                  <Text size="2xs" tone="muted" ltr>{t('{{balanceLengthAfter}} ft', { balanceLengthAfter: r2(m.balanceLengthAfter) })}</Text>
                </View>}
                onPress={m.saleId ? () => router.push(`/sales/${m.saleId}` as never) : undefined} chevron={!!m.saleId} />
            ))}
          </Card>

          <Card flush title={t('Is roll ke tukre')} description={t('Cut ke baad bachi patti, ya wapas aaya hissa')}>
            {pieces.length === 0 ? <View style={{ padding: th.space(4) }}><Text size="sm" tone="muted">{t('Abhi koi tukra nahi.')}</Text></View> : pieces.map((p, i) => {
              const ps = pieceStatus(p.status);
              return (
                <ListRow key={p.id} divider={i < pieces.length - 1} title={<Text weight="semibold" ltr>{p.pieceCode}</Text>}
                  subtitle={t('{{widthFt}} × {{lengthFt}} · {{totalSqft}} sqft · {{salePrice}}', { widthFt: ftIn(p.widthFt, p.widthInch), lengthFt: ftIn(p.lengthFt, p.lengthInch), totalSqft: r2(p.totalSqft), salePrice: formatMoney(p.salePrice) })}
                  trailing={<Badge tone={ps.tone}>{t(ps.label)}</Badge>}
                  onPress={() => router.push({ pathname: '/carpet/cut-pieces', params: { search: p.pieceCode } } as never)} chevron />
              );
            })}
          </Card>
          <AdjustRollSheet roll={roll} open={adjust} onClose={() => { setAdjust(false); void q.refetch(); }} />
          <RollActionSheet roll={roll} action={action} onClose={() => setAction(null)} onDone={(a) => { setAction(null); if (a === 'remove') router.back(); else void q.refetch(); }} />
        </View>
      )}
    </DetailTemplate>
  );
}
