/**
 * Gift finder (web GiftFinderPage): the customer says age, boy or girl and
 * budget; toys in stock that fit come up, with small parts and cells flagged.
 * Under three, toys with small parts are left out by the server.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Baby, Gift, ShieldCheck, ShoppingCart } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { cellsNeeded } from '@nafaa/core/industries/toystore';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Amount, Badge, Button, Card, ChipGroup, EmptyState, ListRow, MoneyInput, Row, Screen, SkeletonRows, Switch, Text, useDebouncedValue, useTheme } from '@/design';
import { toyProductsApi } from '../api';
import { CATEGORIES, labelOf } from '../meta';

const AGES = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14];
const BUDGETS = [500, 1000, 2000, 3000, 5000];

export function GiftFinderScreen() {
  const th = useTheme();
  const canSell = usePermission()(P.POS_USE);
  const [years, setYears] = useState(5);
  const [gender, setGender] = useState<'' | 'BOYS' | 'GIRLS'>('');
  const [budget, setBudget] = useState<number | null>(null);
  const [educational, setEducational] = useState(false);
  const maxBudget = useDebouncedValue(budget ?? 0, 300);
  const q = useQuery({
    queryKey: ['toy-gift-finder', years, gender, maxBudget, educational],
    queryFn: () => toyProductsApi.forAge({ years, gender: gender || undefined, maxBudget: maxBudget || undefined, educationalOnly: educational || undefined, safeOnly: true }),
    staleTime: 30_000,
  });
  const items = q.data?.items ?? [];

  return (
    <Screen title={t('Gift finder')} onRefresh={() => void q.refetch()} refreshing={q.isRefetching}>
      <View style={{ gap: th.space(3) }}>
        <Text size="sm" tone="muted">{t('Customer ki baat sunein — umar, larka/larki aur budget chunein, stock wale khilone saamne')}</Text>
        <Card style={{ gap: th.space(3) }}>
          <Text size="sm" weight="semibold" tone="secondary">{t('Bachay ki umar (saal)')}</Text>
          <ChipGroup wrap value={String(years)} onChange={(v) => setYears(Number(v))} options={AGES.map((a) => ({ value: String(a), label: `${a}${a === 14 ? '+' : ''}` }))} />
          <Text size="sm" weight="semibold" tone="secondary">{t('Kis ke liye')}</Text>
          <ChipGroup wrap value={gender} onChange={setGender} options={[{ value: '', label: t('Koi bhi') }, { value: 'BOYS', label: t('Larka') }, { value: 'GIRLS', label: t('Larki') }]} />
          <MoneyInput label={t('Budget (Rs)')} value={budget} onChangeValue={setBudget} placeholder={t('Koi had nahi')} decimals={false} />
          <ChipGroup wrap value={String(budget ?? '')} onChange={(v) => setBudget(Number(v))} options={BUDGETS.map((b) => ({ value: String(b), label: t('{{b}} tak', { b: b.toLocaleString('en-US') }) }))} />
          <Switch value={educational} onChange={setEducational} label={t('Sirf seekhne wale')} />
          {years < 3 && <Row gap={2}><ShieldCheck size={16} color={th.colors.success.text} /><Text size="sm" tone="success" style={{ flex: 1 }}>{t('3 saal se chhote bachay ke liye chhote purze wale khilone nahi dikhaye ja rahe.')}</Text></Row>}
        </Card>

        {q.isLoading ? <SkeletonRows count={5} /> : items.length === 0 ? (
          <EmptyState icon={Baby} title={t('Is umar aur budget me kuch nahi')} message={t('Budget barha kar dekhein, ya khilonon par umar likhein — jin khilonon par umar nahi likhi wo yahan nahi aate.')} />
        ) : (
          <>
            <Text size="sm" tone="secondary">{t('Mile: {{count}}', { count: items.length })}</Text>
            <Card flush>
              {items.map((x, i) => {
                const cells = cellsNeeded(x, t('cell'));
                return (
                  <ListRow key={x.productId} divider={i < items.length - 1} icon={Gift} iconTone="accent" title={x.product.name}
                    subtitle={[labelOf(CATEGORIES, x.categoryType), x.brand, t('Stock {{stock}}', { stock: x.product.stock })].filter(Boolean).join(' · ')}
                    trailing={(
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Amount value={x.product.price} weight="bold" />
                        <Row gap={1} wrap>
                          {x.isEducational ? <Badge tone="accent">{t('Seekhne wala')}</Badge> : null}
                          {x.chokingHazard ? <Badge tone="warning">{t('Purze')}</Badge> : null}
                          {cells ? <Badge tone="info">{cells}</Badge> : null}
                        </Row>
                      </View>
                    )}
                    onPress={() => router.push(`/products/${x.productId}` as never)} />
                );
              })}
            </Card>
            {canSell && <Button icon={ShoppingCart} onPress={() => router.push('/pos' as never)}>{t('POS par bechein')}</Button>}
          </>
        )}
      </View>
    </Screen>
  );
}
