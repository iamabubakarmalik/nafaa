/**
 * Pick the customer for the bill: search by name (any script) or phone,
 * walk-in, or add a new one in two fields (works offline). Shows khata
 * balance, credit limit and points so the cashier sees them before
 * selling on khata.
 */

import { Check, UserPlus, UserRound, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { creditStatus, looksLikePhone } from '@nafaa/core/pos';
import { t } from '@/core/i18n';
import { formatMoney } from '@/core/format';
import { enqueueCustomerCreate, offline, OfflineRuleError, useCustomerSearch, type CustomerRow } from '@/core/offline';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { Avatar, Badge, Button, Input, ListRow, Row, SearchBar, Sheet, Text, toast, useDebouncedValue, useTheme } from '@/design';
import { useBill } from '../engine/bill';
import { useCounter } from '../engine/counter';
import { closeSheet, usePosUi } from '../engine/usePos';

export function CustomerSheet() {
  const th = useTheme();
  const open = usePosUi((s) => s.sheet === 'customer');
  const can = usePermission();
  const counter = useCounter();
  const current = useBill((s) => s.customer);
  const setCustomer = useBill((s) => s.setCustomer);
  const setTier = useBill((s) => s.setTier);
  const [q, setQ] = useState('');
  const query = useDebouncedValue(q, 120);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const { data: list = [], isLoading } = useCustomerSearch({ query: query || undefined, limit: 60 }, { enabled: open });

  useEffect(() => { if (open) { setQ(''); setName(''); setPhone(''); setAdding(usePosUi.getState().customerAdd); } }, [open]);

  const pick = (c: CustomerRow | null) => {
    setCustomer(c);
    // A customer with their own default price brings it to the bill (Settings → POS counter).
    const parts = counter.parts;
    if (c?.priceTier && parts.priceTiers && parts.tierFromCustomer && parts.priceTierList.includes(c.priceTier)) setTier(c.priceTier);
    else if (!c && parts.priceTiers) setTier(parts.defaultPriceTier);
    closeSheet();
  };

  const startAdd = () => {
    const typed = q.trim();
    if (looksLikePhone(typed)) { setPhone(typed); setName(''); } else { setName(typed); setPhone(''); }
    setAdding(true);
  };

  const save = async () => {
    if (!name.trim()) { toast.error(t('Enter the name')); return; }
    setSaving(true);
    try {
      const { customerId } = await enqueueCustomerCreate({ name: name.trim(), phone: phone.trim() || undefined });
      const row = await offline.customers.get(customerId);
      if (row) pick(row);
      toast.success(t('Customer added'));
    } catch (e) {
      toast.error(e instanceof OfflineRuleError ? e.message : t('Customer was not saved'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={closeSheet} title={adding ? t('New customer') : t('Customer')} height={0.85} scrollable={false}
      footer={adding ? (
        <Row gap={2}>
          <Button variant="secondary" style={{ flex: 1 }} onPress={() => setAdding(false)}>{t('Back')}</Button>
          <Button style={{ flex: 1 }} icon={Check} loading={saving} onPress={() => void save()}>{t('Save and use')}</Button>
        </Row>
      ) : undefined}>
      {adding ? (
        <View style={{ gap: th.space(3), paddingHorizontal: th.space(4) }}>
          <Input label={t('Name')} value={name} onChangeText={setName} autoFocus returnKeyType="next" />
          <Input label={t('Phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" ltr placeholder="03xx xxxxxxx" />
          <Text size="xs" tone="muted">{t('Saved on this phone at once and sent when internet is available.')}</Text>
        </View>
      ) : (
        <View style={{ flex: 1, gap: th.space(2) }}>
          <View style={{ paddingHorizontal: th.space(4), gap: th.space(2) }}>
            <SearchBar value={q} onChangeText={setQ} placeholder={t('Name or phone')} autoFocus />
            <Row gap={2}>
              <Button size="sm" variant={current ? 'secondary' : 'soft'} icon={UserRound} style={{ flex: 1 }} onPress={() => pick(null)}>{t('Walk-in')}</Button>
              {can(P.CUSTOMERS_EDIT) && <Button size="sm" variant="soft" icon={UserPlus} style={{ flex: 1 }} onPress={startAdd}>{q.trim() ? t('Add "{{q}}"', { q: q.trim().slice(0, 18) }) : t('New customer')}</Button>}
            </Row>
          </View>
          <FlatList
            data={list}
            keyExtractor={(c) => c.id}
            keyboardShouldPersistTaps="handled"
            style={{ flex: 1 }}
            ListEmptyComponent={!isLoading ? <Text tone="muted" align="center" style={{ padding: th.space(6) }}>{q ? t('No customer found') : t('No customers yet')}</Text> : null}
            renderItem={({ item: c }) => {
              const cs = creditStatus(c);
              const owes = (c.balance ?? 0) > 0;
              return (
                <ListRow
                  avatar={<Avatar name={c.name} size={40} />}
                  title={c.name}
                  subtitle={[c.phone, c.businessName, cs.limit > 0 ? t('Limit {{amount}}', { amount: formatMoney(cs.limit) }) : null, c.loyaltyPoints ? t('{{n}} points', { n: c.loyaltyPoints }) : null].filter(Boolean).join(' · ')}
                  trailing={
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      {owes ? <Text size="sm" weight="bold" color={cs.over ? th.colors.danger.text : th.colors.warning.text} ltr>{formatMoney(c.balance)}</Text>
                        : (c.balance ?? 0) < 0 ? <Text size="sm" weight="bold" color={th.colors.success.text} ltr>{formatMoney(-(c.balance ?? 0))}</Text> : null}
                      {c.pendingCreate && <Badge tone="warning" size="sm">{t('Not synced')}</Badge>}
                    </View>
                  }
                  selected={current?.id === c.id}
                  onPress={() => pick(c)}
                />
              );
            }}
          />
          {current && (
            <View style={{ paddingHorizontal: th.space(4), paddingBottom: th.space(4) }}>
              <Button variant="ghost" icon={X} onPress={() => pick(null)}>{t('Remove {{name}} from the bill', { name: current.name })}</Button>
            </View>
          )}
        </View>
      )}
    </Sheet>
  );
}
