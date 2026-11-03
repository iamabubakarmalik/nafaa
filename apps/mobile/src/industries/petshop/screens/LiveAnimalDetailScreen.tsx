/** Live animal detail (web LiveAnimalDetailPage): photo, money, health record, reserve, back, died. */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Pencil, Plus, ShoppingCart, Skull, Stethoscope, Tag, Undo2 } from 'lucide-react-native';
import { useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { animalProfit, daysInShop, isOnSale, LONG_STAY_DAYS, nextDueDate } from '@nafaa/core/industries/petshop';
import { formatDate, formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Badge, Button, Card, DetailRow, DetailSection, DetailTemplate, IconButton, ListRow, PressableScale, Row, StatTile, Text, toast, useTheme } from '@/design';
import { useCostMask } from '@/modules/sales/lib/mask';
import { OfflineNote, errorText, todayKey, useDeskOnline } from '../../_shared/deskKit';
import { liveAnimalsApi } from '../api';
import { CloseSheet, RecordSheet, ReserveSheet } from '../components/AnimalSheets';
import { ANIMAL_STATUS, PET_KEYS, ageText, recordLabel, refreshPet, speciesEmoji, speciesLabel } from '../meta';

export function LiveAnimalDetailScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const can = usePermission();
  const { guard } = useDeskOnline('petshopAnimals');
  const { cost, costHidden } = useCostMask();
  const [photo, setPhoto] = useState(0);
  const [sheet, setSheet] = useState<'record' | 'reserve' | null>(null);
  const [closing, setClosing] = useState<'DECEASED' | 'RETURNED' | null>(null);
  const q = useQuery({ queryKey: [PET_KEYS.animal, id], queryFn: () => liveAnimalsApi.getOne(id!), enabled: !!id });
  const a = q.data;
  const unreserve = useMutation({
    mutationFn: () => liveAnimalsApi.unreserve(id!),
    onSuccess: () => { refreshPet([PET_KEYS.animal, PET_KEYS.animals, PET_KEYS.posAnimals]); toast.success(t('Dobara bikne ke liye')); },
    onError: (e) => toast.error(errorText(e, t('Nahi hua'))),
  });

  const onSale = !!a && isOnSale(a.status);
  const title = a ? a.name || a.breed || speciesLabel(a.species) : t('Janwar');
  const history = [...(a?.medicalHistory ?? [])].reverse();
  const days = a ? daysInShop(a.acquiredDate, todayKey()) : null;
  const profit = a ? animalProfit(a) : null;
  const nextDue = nextDueDate(history);
  const canEdit = can(P.PRODUCTS_EDIT);
  const st = a ? ANIMAL_STATUS[a.status] : null;

  return (
    <DetailTemplate
      title={title}
      subtitle={a ? [a.animalNumber, ageText(a.ageMonths)].filter(Boolean).join(' · ') : undefined}
      loading={q.isLoading} error={q.data ? null : q.error} onRetry={() => void q.refetch()} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}
      actions={a && canEdit && onSale ? <IconButton icon={Pencil} label={t('Badlein')} onPress={() => guard(() => router.push(`/petshop/live-animals/${a.id}/edit` as never))} /> : undefined}
      bottomActions={a && onSale && can(P.POS_USE) ? <Button fullWidth icon={ShoppingCart} onPress={() => router.push('/pos' as never)}>{t('Counter par bechein')}</Button> : undefined}
    >
      {a && (
        <View style={{ gap: th.space(4) }}>
          <OfflineNote feature="petshopAnimals" />
          <View style={{ borderRadius: th.radius('xl'), overflow: 'hidden', backgroundColor: th.colors.warning.soft, ...(a.imageUrls?.[photo] ? { aspectRatio: 4 / 3 } : { height: 120 }), alignItems: 'center', justifyContent: 'center' }}>
            {a.imageUrls?.[photo] ? <Image source={{ uri: a.imageUrls[photo] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Text style={{ fontSize: 56, lineHeight: 72 }}>{speciesEmoji(a.species)}</Text>}
          </View>
          {a.imageUrls.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: th.space(2) }}>
              {a.imageUrls.map((u, i) => (
                <PressableScale key={u} onPress={() => setPhoto(i)} style={{ width: 56, height: 56, borderRadius: th.radius('md'), overflow: 'hidden', borderWidth: 2, borderColor: i === photo ? th.colors.brand.solid : 'transparent' }}>
                  <Image source={{ uri: u }} style={{ width: '100%', height: '100%' }} />
                </PressableScale>
              ))}
            </ScrollView>
          )}
          <Row gap={2} wrap>
            {st && <Badge tone={st.tone}>{t(st.label)}</Badge>}
            <Text size="sm" tone="muted">{[speciesLabel(a.species), a.breed, a.gender].filter(Boolean).join(' · ')}</Text>
          </Row>

          <Row gap={2}>
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={a.status === 'SOLD' ? t('Bika') : t('Rate')} value={formatMoney(a.status === 'SOLD' ? a.soldPrice ?? 0 : a.askingPrice)} />
            <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Dukaan me')} tone={days !== null && days > LONG_STAY_DAYS && onSale ? 'warning' : 'neutral'} value={days === null ? '—' : t('{{count}} din', { count: days })} />
          </Row>
          {!costHidden && (
            <Row gap={2}>
              <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Cost')} value={cost(a.costPrice ?? 0)} />
              <StatTile style={{ flex: 1, flexBasis: 0, minWidth: 0 }} label={t('Profit')} tone={profit !== null && profit < 0 ? 'danger' : 'success'} value={profit === null ? '—' : cost(profit)} />
            </Row>
          )}
          {a.status === 'SOLD' && <Text size="sm" tone="secondary">{[a.soldAt ? formatDate(a.soldAt, { year: true }) : '', a.soldToCustomerName].filter(Boolean).join(' · ')}</Text>}
          {onSale && can(P.POS_USE) && (
            <Row gap={2}>
              {a.status === 'AVAILABLE'
                ? <Button variant="secondary" icon={Tag} style={{ flex: 1 }} onPress={() => guard(() => setSheet('reserve'))}>{t('Rok lein')}</Button>
                : <Button variant="secondary" icon={Undo2} style={{ flex: 1 }} loading={unreserve.isPending} onPress={() => guard(() => unreserve.mutate())}>{t('Rokna khatam')}</Button>}
            </Row>
          )}

          <DetailSection title={t('Vaccine / deworming')}>
            <Card flush>
              <DetailRow label={t('Vaccine')} value={<Badge tone={a.isVaccinated ? 'success' : 'danger'}>{a.isVaccinated ? t('Vaccine lagi') : t('Vaccine nahi lagi')}</Badge>} last={!a.vaccinationDetails && !a.isDewormed} />
              {!!a.vaccinationDetails && <DetailRow label={t('Tafseel')} value={a.vaccinationDetails} />}
              <DetailRow label={t('Deworming')} value={<Badge tone={a.isDewormed ? 'success' : 'warning'}>{a.isDewormed ? t('Deworming hui') : t('Deworming baqi')}</Badge>} last={!nextDue} />
              {nextDue && <DetailRow label={t('Agli baar')} value={formatDate(nextDue, { year: true })} last />}
            </Card>
          </DetailSection>

          <DetailSection title={t('Dukaan me')}>
            <Card flush>
              <DetailRow label={t('Cage')} value={a.currentCage || t('Cage nahi likha')} />
              {!!a.feedingSchedule && <DetailRow label={t('Khana')} value={a.feedingSchedule} />}
              {!!a.specialNeeds && <DetailRow label={t('Khaas dekh bhaal')} value={a.specialNeeds} />}
              {(a.sourceType || a.sourceName) && <DetailRow label={t('Kahan se aaya')} value={[a.sourceType, a.sourceName].filter(Boolean).join(' · ')} />}
              <DetailRow label={t('Aane ki date')} value={a.acquiredDate ? formatDate(a.acquiredDate, { year: true }) : '—'} last />
            </Card>
          </DetailSection>

          <DetailSection title={t('Sehat record')} action={canEdit && a.status !== 'DECEASED' ? <Button size="sm" variant="soft" icon={Plus} onPress={() => guard(() => setSheet('record'))}>{t('Record likhein')}</Button> : undefined}>
            <Card flush>
              {history.length === 0 ? (
                <View style={{ padding: th.space(4) }}><Text size="sm" tone="muted">{t('Abhi koi record nahi. Vaccine, deworming ya doctor visit yahan likhein.')}</Text></View>
              ) : history.map((h, i) => (
                <ListRow key={i} divider={i < history.length - 1} icon={Stethoscope}
                  title={`${recordLabel(h.type)} · ${formatDate(h.at)}`}
                  subtitle={[h.description, h.vetName, h.nextDueDate ? t('Agli baar: {{nextDueDate}}', { nextDueDate: formatDate(h.nextDueDate) }) : ''].filter(Boolean).join(' · ')}
                  trailing={h.cost && !costHidden ? <Text size="sm" ltr>{formatMoney(h.cost)}</Text> : undefined} />
              ))}
            </Card>
          </DetailSection>

          {(a.healthNotes || a.notes) && <Card><Text size="sm" tone="secondary">{[a.healthNotes, a.notes].filter(Boolean).join('\n\n')}</Text></Card>}

          {canEdit && onSale && (
            <Row gap={2}>
              <Button variant="secondary" icon={Undo2} style={{ flex: 1 }} onPress={() => guard(() => setClosing('RETURNED'))}>{t('Wapas gaya')}</Button>
              <Button variant="secondary" icon={Skull} style={{ flex: 1 }} onPress={() => guard(() => setClosing('DECEASED'))}>{t('Mar gaya')}</Button>
            </Row>
          )}
          <RecordSheet animal={a} open={sheet === 'record'} onClose={() => setSheet(null)} />
          <ReserveSheet animal={a} open={sheet === 'reserve'} onClose={() => setSheet(null)} />
          <CloseSheet animal={a} kind={closing} onClose={() => setClosing(null)} />
        </View>
      )}
    </DetailTemplate>
  );
}
