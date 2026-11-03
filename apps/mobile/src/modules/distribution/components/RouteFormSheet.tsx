/**
 * Create or edit a route: name, code, area, the weekdays it is visited, its
 * booker and delivery man, and the godown whose stock it sells.
 */

import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { Button, Chip, Input, Row, Select, Sheet, Switch, Text, useTheme } from '@/design';
import type { Route, SaveRoute } from '../api/distribution.api';
import { useGodowns, useTeam } from '../api/setup-lookups';
import { useDeliveryStaff } from '../hooks/useDistribution';
import { WEEKDAYS, WEEKDAYS_SHORT } from '../lib/setup';

const BOOK = 'distribution.orders.book';
const NONE = '';

export function RouteFormSheet({ route, saving, onClose, onSave }: {
  route: Route | null; saving: boolean; onClose: () => void; onSave: (body: SaveRoute) => void;
}) {
  const th = useTheme();
  const teamQ = useTeam();
  const shopsQ = useGodowns();
  const [name, setName] = useState(route?.name ?? '');
  const [code, setCode] = useState(route?.code ?? '');
  const [area, setArea] = useState(route?.area ?? '');
  const [days, setDays] = useState<number[]>(route?.visitDays ?? []);
  const [bookerId, setBookerId] = useState(route?.bookerId ?? NONE);
  const [deliveryUserId, setDeliveryUserId] = useState(route?.deliveryUserId ?? NONE);
  const [shopId, setShopId] = useState(route?.shopId ?? NONE);
  const [isActive, setActive] = useState(route?.isActive ?? true);

  const bookers = useMemo(() => (teamQ.data ?? [])
    .filter((m) => m.isActive || m.id === bookerId)
    .filter((m) => m.role === 'OWNER' || m.permissions?.includes(BOOK) || m.id === bookerId), [teamQ.data, bookerId]);
  const drivers = useDeliveryStaff([{ id: route?.deliveryUserId, name: route?.deliveryUserName }]).list;
  const shops = (shopsQ.data ?? []).filter((s) => s.isActive || s.id === shopId);
  const toggleDay = (d: number) => setDays((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d].sort()));

  const submit = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(), code: code.trim() || undefined, area: area.trim() || undefined, visitDays: days,
      bookerId: bookerId || null, deliveryUserId: deliveryUserId || null, shopId: shopId || null, isActive,
    });
  };

  return (
    <Sheet open onClose={onClose} height={0.92} title={route ? t('{{name}} — badlein', { name: route.name }) : t('Naya route')}
      description={t('Ek route = ek ilaqa, mukarrar din, ek booker aur ek delivery wala.')}
      footer={<Row gap={2}>
        <Button variant="secondary" style={{ flex: 1 }} onPress={onClose}>{t('Rehne dein')}</Button>
        <Button style={{ flex: 1.4 }} loading={saving} disabled={!name.trim()} onPress={submit}>{route ? t('Save karein') : t('Route banayein')}</Button>
      </Row>}>
      <View style={{ gap: th.space(4) }}>
        <Input label={t('Naam')} value={name} onChangeText={setName} maxLength={80} placeholder={t('Shadman - Ichhra')} />
        <Row gap={3} align="start">
          <Input containerStyle={{ flex: 1 }} label={t('Code')} value={code} onChangeText={(v) => setCode(v.toUpperCase())} maxLength={20} placeholder={t('R1')} ltr autoCapitalize="characters" />
          <Input containerStyle={{ flex: 2 }} label={t('Ilaqe')} value={area} onChangeText={setArea} maxLength={120} placeholder={t('Shadman, Ichhra, Mozang')} hint={t('Comma se likhein')} />
        </Row>
        <View style={{ gap: th.space(2) }}>
          <Text size="sm" weight="medium">{t('Kin dinon jana hai')}</Text>
          <Row gap={2} style={{ flexWrap: 'wrap' }}>
            {WEEKDAYS_SHORT.map((d, i) => <Chip key={i} label={t(d)} selected={days.includes(i)} onPress={() => toggleDay(i)} />)}
          </Row>
          <Text size="xs" tone="muted">
            {days.length ? t('Har hafte: {{value}}', { value: days.map((d) => t(WEEKDAYS[d])).join(', ') }) : t('Koi din nahi chuna — route din ke plan me nahi aayega')}
          </Text>
        </View>
        <Select label={t('Order booker')} value={bookerId} onChange={setBookerId}
          options={[{ value: NONE, label: t('— Koi nahi —') }, ...bookers.map((m) => ({ value: m.id, label: m.fullName }))]}
          hint={bookers.length ? t('Jin ke paas "Order book karein" ki permission hai') : t('Team me Order Booker login banayein')} />
        <Select label={t('Delivery wala')} value={deliveryUserId} onChange={setDeliveryUserId}
          options={[{ value: NONE, label: t('— Koi nahi —') }, ...drivers.map((m) => ({ value: m.id, label: m.label }))]}
          hint={drivers.length ? t('Load sheet aur delivery isi ke naam') : t('Team me Delivery login banayein')} />
        <Select label={t('Godown')} value={shopId} onChange={setShopId}
          options={[{ value: NONE, label: t('— Settings wala default —') }, ...shops.map((s) => ({ value: s.id, label: s.name }))]}
          hint={t('Is route ka maal kis godown ke stock se nikle')} />
        <Switch value={isActive} onChange={setActive} label={t('Chalu')} description={t('Band route booker app aur din ke plan me nahi aata.')} />
      </View>
    </Sheet>
  );
}
