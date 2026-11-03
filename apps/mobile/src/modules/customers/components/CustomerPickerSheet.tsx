/** Pick a customer: instant search of the phone's own copy (name in any script, phone in any format), with "new customer" on top. */

import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { useCustomerSearch, type CustomerRow } from '@/core/offline';
import { Amount, Avatar, Button, EmptyState, ListGroup, ListRow, SearchBar, Sheet, SkeletonRows, useDebouncedValue, useTheme } from '@/design';
import { QuickAddSheet } from './QuickAddSheet';

export interface PickedCustomer { id: string; name: string; phone: string | null; balance: number; creditLimit: number }

export const pickedFrom = (c: CustomerRow): PickedCustomer => ({ id: c.id, name: c.name, phone: c.phone, balance: c.balance ?? 0, creditLimit: c.creditLimit ?? 0 });

export function CustomerPickerSheet({ open, title, onPick, onClose, owingOnly }: {
  open: boolean;
  title: string;
  onPick: (c: PickedCustomer) => void;
  onClose: () => void;
  owingOnly?: boolean;
}) {
  const th = useTheme();
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const query = useDebouncedValue(q.trim(), 120);
  const list = useCustomerSearch({ query: query || undefined, owing: owingOnly || undefined, limit: 30 }, { enabled: open });
  return (
    <>
      <Sheet open={open && !adding} onClose={onClose} title={title} height={0.8} scrollable={false}>
        <View style={{ flex: 1, gap: th.space(3) }}>
          <SearchBar value={q} onChangeText={setQ} placeholder={t('Naam ya phone likhein')} autoFocus />
          {list.isLoading ? <SkeletonRows count={4} /> : (list.data?.length ?? 0) === 0 ? <EmptyState title={t('Koi nahi mila')} /> : (
            <ListGroup>
              {(list.data ?? []).map((c) => (
                <ListRow key={c.id} dense avatar={<Avatar name={c.name} size={36} />} title={c.name} subtitle={c.phone ?? undefined}
                  trailing={Math.abs(c.balance ?? 0) > 0.009 ? <Amount value={Math.abs(c.balance ?? 0)} size="sm" tone={(c.balance ?? 0) > 0 ? 'danger' : 'success'} /> : undefined}
                  onPress={() => { onPick(pickedFrom(c)); }} />
              ))}
            </ListGroup>
          )}
          <Button variant="secondary" icon={Plus} onPress={() => setAdding(true)}>{t('Naya customer banayein')}</Button>
        </View>
      </Sheet>
      <QuickAddSheet open={open && adding} initialName={q.trim()} onClose={() => setAdding(false)}
        onCreated={(c) => { setAdding(false); onPick({ id: c.id, name: c.name, phone: c.phone, balance: 0, creditLimit: 0 }); }} />
    </>
  );
}
