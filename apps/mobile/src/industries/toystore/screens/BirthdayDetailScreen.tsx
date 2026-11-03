/**
 * A child's page (web BirthdayDetailPage): days to the birthday, toys for the
 * coming age within budget and in stock, gift packs, the last gift, and
 * WhatsApp to the parent. Needs the server.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Cake, Gift, MessageCircle, Pencil, Phone, ShoppingCart } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import { t } from '@/core/i18n';
import { useAuthStore } from '@/core/auth/store';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { useBillLanguage } from '@/core/receipt';
import { Amount, Button, Card, DetailRow, DetailSection, DetailTemplate, HeroAmount, HeroText, IconButton, ListRow, PageHero, SkeletonRows, Text, useTheme } from '@/design';
import { formatMoney } from '@/core/format';
import { openWhatsApp } from '@/modules/customers/lib/contact';
import { toyBirthdaysApi } from '../api';
import { BirthdaySheet, GiftSheet } from '../components/BirthdaySheets';
import { CATEGORIES, GENDERS, KEYS, dayOnly, labelOf, refreshToy, reminderText } from '../meta';

export function BirthdayDetailScreen() {
  const th = useTheme();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const lang = useBillLanguage();
  const shop = useAuthStore((s) => s.tenant?.name);
  const can = usePermission();
  const canEdit = can(P.CUSTOMERS_EDIT);
  const canSell = can(P.POS_USE);
  const [editing, setEditing] = useState(false);
  const [gift, setGift] = useState(false);
  const q = useQuery({ queryKey: [KEYS.birthdays, 'one', id], queryFn: () => toyBirthdaysApi.getOne(id) });
  const ideas = useQuery({ queryKey: [KEYS.birthdays, 'ideas', id], queryFn: () => toyBirthdaysApi.giftSuggestions(id, 12), enabled: !!q.data });
  const sent = useMutation({ mutationFn: () => toyBirthdaysApi.markReminderSent(id), onSuccess: () => refreshToy([KEYS.birthdays]) });
  const r = q.data;
  const c = r?.computed;

  const remind = () => {
    if (!r || !openWhatsApp(r.customerPhone, reminderText(r, lang, shop))) return;
    if (canEdit) sent.mutate();
  };

  return (
    <DetailTemplate
      title={r?.childName ?? t('Saalgirah')} subtitle={r ? `${r.customerName} · ${r.customerPhone}${r.isActive ? '' : ` · ${t('yaad dihani band')}`}` : undefined}
      loading={q.isLoading} error={!r ? q.error : undefined} onRetry={() => void q.refetch()} onRefresh={() => { void q.refetch(); void ideas.refetch(); }} refreshing={q.isRefetching}
      actions={r ? (
        <>
          <IconButton icon={Phone} label={t('Call')} onPress={() => void Linking.openURL(`tel:${r.customerPhone.replace(/[^\d+]/g, '')}`)} />
          {canEdit && <IconButton icon={Pencil} label={t('Badlein')} onPress={() => setEditing(true)} />}
        </>
      ) : undefined}
      summary={r ? (
        <PageHero title={r.childName} chip={c?.daysUntilBirthday === 0 ? t('Aaj saalgirah hai') : t('{{daysUntilBirthday}} din baad saalgirah', { daysUntilBirthday: c?.daysUntilBirthday })}
          stats={[
            { label: t('Umar'), value: <HeroText size="lg" weight="bold">{t('{{count}} saal', { count: Math.floor(c?.currentAge ?? 0) })}</HeroText> },
            { label: t('Ho raha hai'), value: <HeroText size="lg" weight="bold">{t('{{count}} saal', { count: c?.turningAge ?? 0 })}</HeroText> },
            { label: t('Kul kharch'), value: <HeroAmount value={r.totalSpent} size="lg" /> },
          ]} />
      ) : undefined}
      bottomActions={r ? <Button fullWidth icon={MessageCircle} onPress={remind}>{t('WhatsApp')}</Button> : undefined}
    >
      {r && (
        <>
          <DetailSection title={t('{{turningAge}} saal ke liye khilone', { turningAge: c?.turningAge })}>
            <Card flush description={ideas.data?.budgetCeiling ? t('Budget {{budgetCeiling}} tak · sirf stock wale', { budgetCeiling: formatMoney(ideas.data.budgetCeiling) }) : t('Sirf stock wale')}>
              {ideas.isLoading ? <SkeletonRows count={3} /> : (ideas.data?.products ?? []).length === 0 ? (
                <Text tone="muted" style={{ padding: th.space(4) }}>{t('Is umar ke khilone stock me nahi — khilonon par umar likhein ya naya maal mangwayein.')}</Text>
              ) : ideas.data!.products.map((p, i) => (
                <ListRow key={p.productId} dense divider={i < ideas.data!.products.length - 1} icon={Gift} title={p.product.name}
                  subtitle={[labelOf(CATEGORIES, p.categoryType), p.brand, t('Stock {{stock}}', { stock: p.product.stock })].filter(Boolean).join(' · ')}
                  trailing={<Amount value={p.product.price} weight="semibold" />} onPress={() => router.push(`/products/${p.productId}` as never)} />
              ))}
            </Card>
            {(ideas.data?.giftPacks ?? []).length > 0 && (
              <Card flush title={t('Gift packs')}>
                {ideas.data!.giftPacks.map((g, i) => <ListRow key={g.id} dense divider={i < ideas.data!.giftPacks.length - 1} icon={Gift} iconTone="accent" title={g.name} trailing={<Amount value={g.giftPackPrice} weight="semibold" />} />)}
              </Card>
            )}
            {canSell && <Button variant="secondary" icon={ShoppingCart} onPress={() => router.push('/pos' as never)}>{t('POS par bechein')}</Button>}
          </DetailSection>

          <DetailSection title={t('Pichle gift')} action={canEdit ? <Button variant="link" size="sm" icon={Gift} onPress={() => setGift(true)}>{t('Gift likhein')}</Button> : undefined}>
            <Card>
              {r.lastGiftGiven ? <><Text weight="semibold">{r.lastGiftGiven}</Text>{r.lastPurchaseDate ? <Text size="xs" tone="muted">{dayOnly(r.lastPurchaseDate)}</Text> : null}</> : <Text size="sm" tone="muted">{t('Abhi koi gift nahi likha.')}</Text>}
              <Text size="xs" tone="muted">{t('Ye sirf yaad ke liye hai — paisa POS ke bill se aata hai.')}</Text>
              {r.notes ? <Text size="sm" tone="secondary">{r.notes}</Text> : null}
            </Card>
          </DetailSection>

          <DetailSection title={t('Tafseel')}>
            <Card flush>
              <DetailRow label={t('Saalgirah')} value={dayOnly(r.childBirthDate)} />
              <DetailRow label={t('Bacha / bachi')} value={labelOf(GENDERS, r.childGender) || '—'} />
              <DetailRow label={t('Gift liye')} value={`${r.totalPurchases}${c?.avgSpend ? ` · ${t('Ek gift {{avgSpend}}', { avgSpend: formatMoney(c.avgSpend) })}` : ''}`} />
              <DetailRow label={t('Aakhri message')} value={r.lastReminderSent ? dayOnly(r.lastReminderSent) : '—'} />
              <DetailRow label={t('Kitne din pehle yaad dilayein')} value={t('{{reminderDaysBefore}} din pehle', { reminderDaysBefore: r.reminderDaysBefore })} last />
            </Card>
          </DetailSection>

          <BirthdaySheet open={editing} value={r} onClose={() => setEditing(false)} onSaved={() => setEditing(false)} />
          <GiftSheet open={gift} id={r.id} onClose={() => setGift(false)} onSaved={() => setGift(false)} />
        </>
      )}
    </DetailTemplate>
  );
}
