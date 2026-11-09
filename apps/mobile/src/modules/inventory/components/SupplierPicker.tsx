/**
 * Searchable supplier list in a sheet, with inline "new supplier" (name
 * required, phone optional). Suppliers already on the product are left out.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Truck } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { apiErrorMessage } from '@/core/api/errors';
import { t } from '@/core/i18n';
import { Button, EmptyState, Input, ListRow, SearchBar, Sheet, toast, useTheme } from '@/design';
import { suppliersApi, type Supplier } from '../../purchasing/api/suppliers';
import { useOnline } from '../lib/shared';

export const SUPPLIER_LIST_KEY = ['inventory', 'supplier-picker'] as const;

export function SupplierPickerSheet({ open, onClose, exclude, onPick }: {
  open: boolean; onClose: () => void; exclude: string[]; onPick: (s: { id: string; name: string }) => void;
}) {
  const th = useTheme();
  const online = useOnline();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const list = useQuery({
    queryKey: SUPPLIER_LIST_KEY, enabled: open, staleTime: 60_000,
    queryFn: () => suppliersApi.list({ status: 'active', sort: 'recent', limit: 500 }).then((r) => r.items),
  });
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (list.data ?? []).filter((x: Supplier) => !exclude.includes(x.id) && (!s || `${x.name} ${x.phone ?? ''} ${x.city ?? ''}`.toLowerCase().includes(s)));
  }, [list.data, exclude, q]);

  const close = () => { setAdding(false); setName(''); setPhone(''); setQ(''); onClose(); };
  const create = async () => {
    if (!name.trim()) { toast.error(t('Naam likhein')); return; }
    setBusy(true);
    try {
      const made = await suppliersApi.create({ name: name.trim(), ...(phone.trim() ? { phone: phone.trim() } : {}) });
      await qc.invalidateQueries({ queryKey: SUPPLIER_LIST_KEY });
      onPick({ id: made.id, name: made.name });
      close();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onClose={close} title={t('Supplier chunein')} height={0.8}>
      <SearchBar value={q} onChangeText={setQ} style={{ marginBottom: th.space(2) }} />
      <View style={{ marginHorizontal: -th.space(4) }}>
        {online && (adding ? (
          <View style={{ paddingHorizontal: th.space(4), paddingBottom: th.space(3), gap: th.space(2) }}>
            <Input label={t('Supplier ka naam')} value={name} onChangeText={setName} autoFocus />
            <Input label={t('Phone (ikhtiyari)')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" ltr />
            <Button fullWidth loading={busy} onPress={() => void create()}>{t('Supplier banayein')}</Button>
          </View>
        ) : (
          <ListRow title={t('+ Naya supplier')} icon={Plus} iconTone="brand" onPress={() => { setName(q.trim()); setAdding(true); }} />
        ))}
        {rows.map((s) => (
          <ListRow key={s.id} title={s.name} subtitle={[s.city, s.phone].filter(Boolean).join(' · ') || undefined} icon={Truck}
            onPress={() => { onPick({ id: s.id, name: s.name }); close(); }} />
        ))}
        {!list.isLoading && rows.length === 0 && <EmptyState compact title={t('Kuch nahi mila')} />}
      </View>
    </Sheet>
  );
}
