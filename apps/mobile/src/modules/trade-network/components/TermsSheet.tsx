/** Seller sets a network customer's terms: price list, route, credit limit and days, booker. Used on approval too. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/i18n';
import { Button, Checkbox, Input, MoneyInput, Select, Sheet, toast, useTheme } from '@/design';
import { TRADE_KEY, tradeApi, tradeError, type BusinessCard, type Terms } from '../api/trade.api';
import { rsInt } from './shared';

export function TermsSheet({ linkId, mode, buyer, initial, suggested, onClose }: {
  linkId: string; mode: 'approve' | 'terms'; buyer: BusinessCard | null;
  initial?: { priceListId?: string | null; routeId?: string | null; creditLimit?: number; creditDays?: number | null; bookedById?: string | null };
  suggested?: { id: string; name: string; balance: number } | null;
  onClose: () => void;
}) {
  const th = useTheme();
  const qc = useQueryClient();
  const opts = useQuery({ queryKey: [TRADE_KEY, 'seller-options'], queryFn: tradeApi.sellerOptions, staleTime: 5 * 60_000 });
  const [priceListId, setPriceListId] = useState(initial?.priceListId ?? '');
  const [routeId, setRouteId] = useState(initial?.routeId ?? '');
  const [creditLimit, setCreditLimit] = useState<number | null>(initial?.creditLimit ?? null);
  const [creditDays, setCreditDays] = useState(initial?.creditDays != null ? String(initial.creditDays) : '');
  const [bookedById, setBookedById] = useState(initial?.bookedById ?? '');
  const [useExisting, setUseExisting] = useState(!!suggested);

  const save = useMutation({
    mutationFn: () => {
      const body: Terms = {
        priceListId: priceListId || null, routeId: routeId || null,
        ...(creditLimit != null && { creditLimit }),
        ...(creditDays !== '' ? { creditDays: Number(creditDays) || null } : {}),
        ...(bookedById && { bookedById }),
        ...(mode === 'approve' && useExisting && suggested && { customerId: suggested.id }),
      };
      return mode === 'approve' ? tradeApi.approve(linkId, body) : tradeApi.terms(linkId, body);
    },
    onSuccess: () => {
      toast.success(mode === 'approve' ? t('Approve — ab yeh dukaan Order bhej sakti hai') : t('Terms save'));
      void qc.invalidateQueries({ queryKey: [TRADE_KEY] });
      onClose();
    },
    onError: (e) => toast.error(tradeError(e)),
  });
  const o = opts.data;

  return (
    <Sheet open onClose={onClose}
      title={mode === 'approve' ? t('{{value}} ko approve karein', { value: buyer?.name ?? 'Dukaan' }) : t('{{value}} ke terms', { value: buyer?.name ?? 'Customer' })}
      description={mode === 'approve' ? t('Yeh dukaan aap ke customers me aa jayegi aur aap is ke supplier ban jayenge.') : undefined}
      footer={<Button fullWidth size="lg" loading={save.isPending} onPress={() => save.mutate()}>{mode === 'approve' ? t('Approve') : t('Save')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        {mode === 'approve' && suggested && (
          <Checkbox value={useExisting} onChange={setUseExisting}
            label={t('Pehle se customer {{name}} hai (khata Rs {{balance}}) — isi se jorein, naya na banayein', { name: suggested.name, balance: rsInt(suggested.balance) })} />
        )}
        <Select label={t('Price list')} value={priceListId} onChange={setPriceListId}
          options={[{ value: '', label: t('Default (settings wali)') }, ...(o?.priceLists ?? []).map((p) => ({ value: p.id, label: p.isDefault ? t('{{name}} (default)', { name: p.name }) : p.name }))]} />
        <Select label={t('Route')} value={routeId} onChange={setRouteId}
          options={[{ value: '', label: t('Koi route nahi') }, ...(o?.routes ?? []).map((r) => ({ value: r.id, label: r.area ? `${r.name} · ${r.area}` : r.name }))]} />
        <MoneyInput label={t('Udhaar ki had (Rs)')} placeholder={t('0 = koi had nahi')} value={creditLimit} onChangeValue={setCreditLimit} />
        <Input label={t('Udhaar ke din')} keyboardType="number-pad" placeholder={t('Misal: 15')} value={creditDays} onChangeText={(v) => setCreditDays(v.replace(/\D/g, ''))} />
        <Select label={t('Order kis ke naam (booker)')} value={bookedById} onChange={setBookedById}
          options={[{ value: '', label: mode === 'approve' ? t('Main khud') : t('Jo pehle tha') }, ...(o?.staff ?? []).map((s) => ({ value: s.id, label: s.fullName }))]} />
      </View>
    </Sheet>
  );
}
