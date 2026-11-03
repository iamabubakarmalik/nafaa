/**
 * One cake order (web CakeOrderDetailPage): where it stands with the next
 * step one tap away, the cake and its design with photos, occasion, pickup
 * or delivery, money with advance and balance, the bill once handed over,
 * the timeline and the customer's rating. Share the customer or kitchen slip.
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Ban, ChefHat, CheckCircle2, MessageCircle, MoreHorizontal, Pencil, Phone, Printer, Receipt, Share2, Star, Undo2, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Pressable, Share, View } from 'react-native';
import { advanceShort, cakeNext, CAKE_FLOW, CAKE_PREV, dueOf, flowIndex, hoursTo, isClosedOrder, isDelivery } from '@nafaa/core/bakery';
import { apiErrorMessage } from '@/core/api/errors';
import { useAuthStore } from '@/core/auth/store';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { useBillLanguage } from '@/core/receipt';
import {
  Amount, Badge, Button, Card, DetailRow, DetailSection, DetailTemplate, HeroAmount, IconButton, ListRow, PageHero, PressableScale, Row, Sheet, Text, TextArea, toast, useTheme,
} from '@/design';
import { callPhone, openWhatsApp } from '@/modules/customers/lib/contact';
import { cakeOrdersApi, type CakeOrder } from '../api';
import { useCakeActions } from '../components/useOrderActions';
import {
  CAKE_KEY, cakeText, creamLabel, dateTime, dayOnly, deliveryOf, flavorLabel, leftText, occasionOf, refreshBakery, shapeLabel, sizeLabel, statusOf, stepLabel,
} from '../meta';
import { cakeSlip, sendSlip } from '../slip';

export function CakeOrderDetailScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const can = usePermission();
  const lang = useBillLanguage();
  const shop = useAuthStore((s) => s.tenant?.name) ?? t('Bakery');
  const canManage = can(P.BAKERY_ORDERS_MANAGE);
  const canRefund = can(P.RETURNS_CREATE);
  const [menu, setMenu] = useState(false);
  const [rating, setRating] = useState(false);
  const q = useQuery({ queryKey: [CAKE_KEY, 'one', id], queryFn: () => cakeOrdersApi.getOne(id!), enabled: !!id, refetchInterval: 30_000 });
  const o = q.data;
  const billQ = useQuery({ queryKey: [CAKE_KEY, 'bill', id], queryFn: () => cakeOrdersApi.bill(id!), enabled: !!id && o?.status === 'DELIVERED' });
  const act = useCakeActions();

  if (!o) return <DetailTemplate title={t('Cake order')} loading={q.isLoading} error={q.error} onRetry={() => void q.refetch()} />;

  const st = statusOf(o.status);
  const closed = isClosedOrder(o.status);
  const next = cakeNext(o);
  const left = hoursTo(o.neededBy);
  const late = !closed && left !== null && left < 0;
  const due = dueOf(o);
  const short = advanceShort(o);
  const idx = flowIndex(o.status);
  const busy = act.busyId === o.id;
  const wa = () => openWhatsApp(o.customerPhone, cakeText(o, shop, lang));
  const slip = (kitchen: boolean, pdf = false) => void sendSlip(cakeSlip(o, shop, kitchen, lang), shop, lang, pdf).catch((e) => toast.error(apiErrorMessage(e)));

  return (
    <>
      <DetailTemplate
        title={o.customerName}
        subtitle={`${o.orderNumber} · ${closed ? dateTime(o.neededBy) : `${leftText(left)} · ${dateTime(o.neededBy)}`}`}
        onRefresh={() => void q.refetch()}
        refreshing={q.isRefetching}
        actions={<Row gap={1}>
          <IconButton icon={MessageCircle} label={t('WhatsApp')} onPress={wa} />
          <IconButton icon={MoreHorizontal} label={t('Aur')} onPress={() => setMenu(true)} />
        </Row>}
        summary={<PageHero title={o.customerName} chip={t(st.label)}
          stats={[{ label: t('Kul'), value: <HeroAmount value={o.total} size="2xl" /> }, { label: t('Mila'), value: <HeroAmount value={o.paidAmount} size="xl" /> }, { label: t('Baqi'), value: <HeroAmount value={due} size="xl" /> }]} />}
        bottomActions={canManage && !closed ? (
          <Row gap={2} style={{ flex: 1 }}>
            {due > 0.5 && <Button style={{ flex: 1 }} variant="secondary" icon={Wallet} onPress={() => act.pay(o)}>{t('Paisa mila')}</Button>}
            {next && <Button style={{ flex: 1.4 }} variant={next.to === 'DELIVER' ? 'success' : 'primary'} icon={next.to === 'DELIVER' ? Receipt : ChefHat} loading={busy} onPress={() => act.next(o)}>{stepLabel(next.step)}</Button>}
          </Row>
        ) : o.status === 'DELIVERED' && billQ.data ? (
          <Button fullWidth icon={Receipt} onPress={() => router.push(`/pos/receipt/${billQ.data!.id}` as never)}>{t('Bill {{saleNumber}}', { saleNumber: billQ.data.saleNumber })}</Button>
        ) : undefined}
      >
        <View style={{ gap: th.space(3) }}>
          {o.status !== 'CANCELLED' && o.status !== 'REFUNDED' && (
            <Row gap={1.5}>
              {CAKE_FLOW.map((s, i) => (
                <View key={s} style={{ flex: 1, gap: 4 }}>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: i <= idx ? th.colors.brand.solid : th.colors.surfaceMuted }} />
                  <Text size="2xs" tone={i === idx ? 'brand' : 'muted'} weight={i === idx ? 'bold' : 'regular'} numberOfLines={1}>{t(statusOf(s).label)}</Text>
                </View>
              ))}
            </Row>
          )}
          {late && <Card tone="danger"><Text size="sm">{t('{{value}} — customer ko foran batayein', { value: leftText(left) })}</Text></Card>}
          {o.status === 'CANCELLED' && (
            <Card tone="danger" footer={canManage ? <Row gap={2}>
              {canRefund && Number(o.khataPaid) > 0 && <Button size="sm" variant="danger" icon={Undo2} onPress={() => act.refund(o)}>{t('Advance wapas')}</Button>}
              <Button size="sm" variant="secondary" loading={busy} onPress={() => act.confirmAgain(o)}>{t('Dobara pakka karein')}</Button>
            </Row> : undefined}>
              <Text size="sm">{t('Cancel hua {{cancelledAt}}{{value}}', { cancelledAt: dateTime(o.cancelledAt), value: o.cancellationReason ? ` — ${o.cancellationReason}` : '' })}</Text>
            </Card>
          )}
          {short > 0.5 && <Card tone="warning"><Text size="sm">{t('Advance me {{advanceShort}} kam hai — bara cake bina advance ke na banayein.', { advanceShort: formatMoney(short) })}</Text></Card>}

          <DetailSection title={t('Cake')}>
            <DetailRow label={t('Size')} value={o.size === 'CUSTOM' && o.customWeightKg ? `${o.customWeightKg} kg` : sizeLabel(o.size)} />
            <DetailRow label={t('Shape')} value={o.shape === 'CUSTOM_SHAPE' ? o.customShapeDesc || t('Apni') : shapeLabel(o.shape)} />
            <DetailRow label={t('Flavour')} value={o.flavor === 'CUSTOM_FLAVOR' ? o.customFlavorDesc || t('Apna') : flavorLabel(o.flavor)} />
            <DetailRow label={t('Cream')} value={o.creamType ? creamLabel(o.creamType) : '—'} />
            {o.numberOfTiers > 1 && <DetailRow label={t('Manzil')} value={String(o.numberOfTiers)} />}
            {!!o.numberOrLetter && <DetailRow label={t('Number / harf')} value={o.numberOrLetter} />}
            <DetailRow last label={t('Maal se jura')} value={o.productName || '—'} />
          </DetailSection>
          {!!o.messageOnCake && (
            <Card tone="brand" title={t('Cake par likhna hai{{value}}', { value: o.messageColor ? ` · ${o.messageColor}` : '' })}>
              <Text size="xl" weight="bold">“{o.messageOnCake}”</Text>
            </Card>
          )}
          {(o.isEggless || o.isSugarFree || o.isVegan || o.allergies?.length > 0 || !!o.dietaryNotes) && (
            <Card title={t('Parhez aur allergy')}>
              <Row gap={1.5} wrap>
                {o.isEggless && <Badge>{t('Anday ke bagair')}</Badge>}
                {o.isSugarFree && <Badge>{t('Cheeni ke bagair')}</Badge>}
                {o.isVegan && <Badge>{t('Vegan')}</Badge>}
                {(o.allergies ?? []).map((a) => <Badge key={a} tone="danger">{t('Allergy: {{a}}', { a: t(a) })}</Badge>)}
              </Row>
              {!!o.dietaryNotes && <Text size="sm" tone="secondary" style={{ marginTop: 6 }}>{o.dietaryNotes}</Text>}
            </Card>
          )}

          <DetailSection title={t('Design')}>
            <View style={{ padding: th.space(4), gap: th.space(2) }}>
              {o.designInstructions ? <Text size="sm">{o.designInstructions}</Text> : <Text size="sm" tone="muted">{t('Design ki details nahi likhi')}</Text>}
              {(!!o.colorTheme || !!o.primaryColor) && <Text size="sm" tone="secondary">{[o.colorTheme && `${t('Theme')}: ${o.colorTheme}`, o.primaryColor && `${t('Rang')}: ${o.primaryColor}${o.secondaryColor ? ` + ${o.secondaryColor}` : ''}`].filter(Boolean).join(' · ')}</Text>}
              {o.decorativeItems?.length > 0 && <Row gap={1.5} wrap>{o.decorativeItems.map((d) => <Badge key={d}>{t(d)}</Badge>)}</Row>}
              {(!!o.candlesRequired || o.cakeStand || o.cakeKnife) && (
                <Text size="sm" tone="secondary">{[o.candlesRequired ? t('{{count}} mombatti', { count: o.candlesRequired }) + (o.candleType ? ` (${o.candleType})` : '') : '', o.cakeStand && t('Cake stand'), o.cakeKnife && t('Chhuri')].filter(Boolean).join(' · ')}</Text>
              )}
              {(o.hasPhotoOnCake && !!o.photoUrl) || o.designReferenceUrls?.length > 0 ? (
                <Row gap={2} wrap>
                  {o.hasPhotoOnCake && !!o.photoUrl && <Photo url={o.photoUrl} />}
                  {(o.designReferenceUrls ?? []).map((u) => <Photo key={u} url={u} />)}
                </Row>
              ) : null}
              {o.hasPhotoOnCake && !o.photoUrl && <Text size="sm" tone="warning">{t('Photo cake hai magar photo nahi lagi — customer se mangwa lein.')}</Text>}
            </View>
          </DetailSection>

          <DetailSection title={t('Mauqa')}>
            <DetailRow label={t('Mauqa')} value={`${occasionOf(o.occasion).emoji} ${t(occasionOf(o.occasion).label)}`} />
            {!!o.celebrantName && <DetailRow label={t('Kis ke liye')} value={`${o.celebrantName}${o.celebrantAge ? ` (${o.celebrantAge})` : ''}`} />}
            {!!o.eventDate && <DetailRow label={t('Function')} value={`${dayOnly(o.eventDate)}${o.eventTime ? ` · ${o.eventTime}` : ''}`} />}
            <DetailRow last label={t('Jagah')} value={o.eventVenue || '—'} />
          </DetailSection>

          <DetailSection title={isDelivery(o.deliveryType) ? t('Pahunchana') : t('Dukaan se lena')}>
            <DetailRow label={t('Kab')} value={dateTime(o.neededBy)} />
            <DetailRow label={t('Kaise')} value={t(deliveryOf(o.deliveryType).label)} />
            {!!o.deliveryAddress && <DetailRow label={t('Pata')} value={`${o.deliveryAddress}${o.deliveryLandmark ? ` — ${o.deliveryLandmark}` : ''}`} />}
            <DetailRow last label={t('Delivery charges')} value={<Amount value={o.deliveryCharges} />} />
          </DetailSection>

          <DetailSection title={t('Paisa')}>
            <DetailRow label={t('Cake')} value={<Amount value={o.basePrice} />} />
            {o.customizationCharges > 0 && <DetailRow label={t('Design')} value={<Amount value={o.customizationCharges} signed />} />}
            {o.photoCakeCharges > 0 && <DetailRow label={t('Photo cake')} value={<Amount value={o.photoCakeCharges} signed />} />}
            {o.deliveryCharges > 0 && <DetailRow label={t('Delivery')} value={<Amount value={o.deliveryCharges} signed />} />}
            {o.taxAmount > 0 && <DetailRow label={t('Tax')} value={<Amount value={o.taxAmount} signed />} />}
            {o.discount > 0 && <DetailRow label={t('Discount')} value={<Amount value={-o.discount} signed tone="warning" />} />}
            <DetailRow label={t('Kul')} value={<Amount value={o.total} weight="bold" />} />
            <DetailRow label={t('Advance chahiye tha')} value={<Amount value={o.advanceRequired} />} />
            <DetailRow label={t('Mila')} value={<Amount value={o.paidAmount} tone="success" />} />
            {!closed && Number(o.khataPaid) > 0 && <DetailRow label={t('Is me se khate me advance')} value={<Amount value={Number(o.khataPaid)} />} />}
            <DetailRow last label={o.status === 'DELIVERED' ? (due > 0.5 ? t('Khate me gaya') : t('Poora mil gaya')) : due > 0.5 ? t('Lete waqt baqi') : t('Poora mil gaya')}
              value={<Amount value={due} weight="bold" tone={due > 0.5 ? 'warning' : 'success'} />} />
          </DetailSection>

          <DetailSection title={t('Customer')}>
            <ListRow title={o.customerName} subtitle={o.customerPhone} icon={Phone} onPress={() => callPhone(o.customerPhone)}
              trailing={<IconButton icon={MessageCircle} label={t('WhatsApp')} onPress={wa} />} />
            {!!o.customerId && <ListRow title={t('Customer ka khata →')} chevron onPress={() => router.push(`/customers/${o.customerId}` as never)} />}
          </DetailSection>

          <DetailSection title={t('Kab kya hua')}>
            {([[t('Order likha'), o.createdAt], [t('Pakka hua'), o.confirmedAt], [t('Banana shuru'), o.startedAt], [t('Tayyar hua'), o.completedAt], [t('De diya'), o.deliveredAt], [t('Cancel hua'), o.cancelledAt]] as Array<[string, string | null | undefined]>)
              .filter(([, at]) => !!at).map(([label, at], i, a) => <DetailRow key={label} last={i === a.length - 1} label={label} value={dateTime(at)} />)}
          </DetailSection>

          {(!!o.specialInstructions || !!o.internalNotes) && (
            <DetailSection title={t('Note')}>
              {!!o.specialInstructions && <DetailRow label={t('Customer ke liye:')} value={o.specialInstructions} last={!o.internalNotes} />}
              {!!o.internalNotes && <DetailRow last label={t('Andar ke liye:')} value={o.internalNotes} />}
            </DetailSection>
          )}

          {o.status === 'DELIVERED' && (
            <Card title={t('Customer ki raye')} action={canManage && !o.customerRating ? <Button size="sm" variant="secondary" onPress={() => setRating(true)}>{t('Raye likhein')}</Button> : undefined}>
              {o.customerRating ? (
                <View style={{ gap: 6 }}>
                  <Row gap={1}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={20} color={th.colors.warning.solid} fill={n <= (o.customerRating ?? 0) ? th.colors.warning.solid : 'transparent'} />)}</Row>
                  {!!o.customerFeedback && <Text size="sm" tone="secondary">“{o.customerFeedback}”</Text>}
                </View>
              ) : <Text size="sm" tone="muted">{t('Abhi raye nahi likhi. Customer se pooch kar likhein — aur bane hue cake ki photo bhi lagayein.')}</Text>}
            </Card>
          )}
        </View>
      </DetailTemplate>

      {act.sheets}
      <Sheet open={menu} onClose={() => setMenu(false)} title={o.orderNumber}>
        <View>
          <ListRow icon={Printer} title={t('Customer parchi')} onPress={() => { setMenu(false); slip(false); }} />
          <ListRow icon={ChefHat} title={t('Kitchen parchi')} onPress={() => { setMenu(false); slip(true); }} />
          <ListRow icon={Share2} title={t('Parchi share karein (PDF)')} onPress={() => { setMenu(false); slip(false, true); }} />
          <ListRow icon={MessageCircle} iconTone="success" title={t('WhatsApp')} onPress={() => { setMenu(false); wa(); }} />
          {canManage && !closed && <ListRow icon={Pencil} title={t('Badlein')} onPress={() => { setMenu(false); router.push(`/bakery/cake-orders/${o.id}/edit` as never); }} />}
          {canManage && !!CAKE_PREV[o.status] && <ListRow icon={Undo2} title={t('Ek qadam peeche')} onPress={() => { setMenu(false); act.back(o); }} />}
          {canManage && !closed && <ListRow icon={Ban} destructive title={t('Cancel')} onPress={() => { setMenu(false); act.cancel(o); }} />}
        </View>
      </Sheet>
      <RatingSheet o={o} open={rating} onClose={() => setRating(false)} />
    </>
  );
}

function Photo({ url }: { url: string }) {
  const th = useTheme();
  return (
    <Pressable onPress={() => void Share.share({ url })} accessibilityRole="imagebutton">
      <Image source={{ uri: url }} style={{ width: 88, height: 88, borderRadius: th.radius('lg'), backgroundColor: th.colors.surfaceMuted }} />
    </Pressable>
  );
}

function RatingSheet({ o, open, onClose }: { o: CakeOrder; open: boolean; onClose: () => void }) {
  const th = useTheme();
  const [stars, setStars] = useState(5);
  const [feedback, setFeedback] = useState('');
  const save = useMutation({
    mutationFn: () => cakeOrdersApi.rate(o.id, stars, feedback.trim() || undefined),
    onSuccess: () => { toast.success(t('Raye save ho gayi')); refreshBakery([CAKE_KEY]); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Save nahi hui'))),
  });
  return (
    <Sheet open={open} onClose={onClose} title={t('Customer ki raye')} description={`${o.customerName} · ${o.orderNumber}`}
      footer={<Button fullWidth size="lg" icon={CheckCircle2} loading={save.isPending} onPress={() => save.mutate()}>{t('Save karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Row gap={2} justify="center" style={{ direction: 'ltr' }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <PressableScale key={n} onPress={() => setStars(n)} accessibilityLabel={t('{{n}} sitare', { n })} haptic="select">
              <Star size={36} color={th.colors.warning.solid} fill={n <= stars ? th.colors.warning.solid : 'transparent'} />
            </PressableScale>
          ))}
        </Row>
        <TextArea label={t('Customer ne kya kaha')} value={feedback} onChangeText={setFeedback} maxLength={500} />
      </View>
    </Sheet>
  );
}
