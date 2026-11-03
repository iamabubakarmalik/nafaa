/** Record or edit other income (incentive, scheme claim, commission, rent, interest). Works offline for cash-drawer income. */

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';
import { apiErrorMessage, isNetworkError } from '@/core/api/errors';
import { isAllShops } from '@/core/auth/shopScope';
import { useAuthStore } from '@/core/auth/store';
import { useShops } from '@/core/auth/useShops';
import { businessDayKey, formatMoney } from '@/core/format';
import { isOnline } from '@/core/net';
import { t } from '@/core/i18n';
import { enqueueIncome } from '@/core/offline';
import { Button, Chip, ChipGroup, DatePicker, Field, Input, MoneyInput, Select, Sheet, Switch, Text, TextArea, toast, useTheme } from '@/design';
import { dateOfKey, localKey, useDayStart } from '@/modules/reports/lib/period';
import { incomeApi, type Income, type IncomeCategoryCode, type IncomeCustomCategory, type IncomePayload, type IncomeReceivedVia } from '../api/expenses';
import { moneyApi } from '../api/money';
import { FIN, FIXED_INCOME, VIA } from '../lib/meta';

export type IncomeDraft = { mode: 'edit'; income: Income } | { mode: 'new'; income?: Partial<Income> };

export function IncomeSheet({ draft, categories, onClose, onManageCategories }: { draft: IncomeDraft | null; categories: IncomeCustomCategory[]; onClose: () => void; onManageCategories: () => void }) {
  const th = useTheme();
  const qc = useQueryClient();
  const startHour = useDayStart();
  const allShops = useAuthStore((s) => isAllShops(s.currentShopId));
  const shops = (useShops().data ?? []).filter((s) => s.isActive);
  const editing = draft?.mode === 'edit' ? draft.income : null;
  const today = businessDayKey(Date.now(), startHour);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number | null>(null);
  const [category, setCategory] = useState<IncomeCategoryCode>('COMPANY_INCENTIVE');
  const [categoryId, setCategoryId] = useState('');
  const [via, setVia] = useState<IncomeReceivedVia>('CASH_DRAWER');
  const [accountId, setAccountId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');
  const [repeat, setRepeat] = useState(false);
  const [shopId, setShopId] = useState('');

  useEffect(() => {
    if (!draft) return;
    const s = draft.mode === 'edit' ? draft.income : draft.income ?? {};
    setTitle(s.title ?? ''); setAmount(s.amount ? Number(s.amount) : null); setCategory(s.category ?? 'COMPANY_INCENTIVE'); setCategoryId(s.categoryId ?? '');
    setVia(s.receivedVia ?? 'CASH_DRAWER'); setAccountId(s.moneyAccountId ?? ''); setSupplierId(s.supplierId ?? '');
    setDate(draft.mode === 'edit' ? businessDayKey(new Date(draft.income.incomeDate), startHour) : today);
    setNote(draft.mode === 'edit' ? draft.income.note ?? '' : ''); setRepeat(!!s.repeatMonthly); setShopId('');
  }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (allShops && !shopId && shops.length && !editing) setShopId((shops.find((s) => s.isMain) ?? shops[0]).id); }, [allShops, shopId, shops, editing]);

  const accountsQ = useQuery({ queryKey: [FIN, 'money-accounts'], queryFn: () => moneyApi.moneyAccounts(), enabled: !!draft && via === 'ACCOUNT' });
  const suppliersQ = useQuery({ queryKey: [FIN, 'suppliers-pick'], enabled: !!draft, staleTime: 5 * 60_000,
    queryFn: () => apiClient.get<{ items?: Array<{ id: string; name: string }>; suppliers?: Array<{ id: string; name: string }> }>('/suppliers', { params: { status: 'active', sort: 'name', limit: 500 } }).then((r) => r.data.items ?? r.data.suppliers ?? []) });

  const problem = !title.trim() ? t('Aamdani kis cheez ki hai, likhein') : !(amount && amount > 0) ? t('Amount likhein') : date > today ? t('Aane wale din ki aamdani nahi likh sakte')
    : category === 'CUSTOM' && !categoryId ? t('Apni category chunein') : via === 'ACCOUNT' && !accountId ? t('Paisa kis account mein aaya — account chunein')
      : via === 'SUPPLIER_KHATA' && !supplierId ? t('Kis company/supplier ke khate mein adjust karna hai — chunein') : allShops && !editing && !shopId ? t('Branch chunein') : null;

  const save = useMutation({
    mutationFn: async () => {
      if (problem) throw new Error(problem);
      const body: IncomePayload = {
        title: title.trim(), amount: amount!, category, categoryId: category === 'CUSTOM' ? categoryId : null, incomeDate: date, receivedVia: via,
        moneyAccountId: via === 'ACCOUNT' ? accountId : null, supplierId: supplierId || null, note: note.trim() || null, repeatMonthly: repeat,
        ...(allShops && !editing && shopId && { shopId }),
      };
      if (editing) { const { shopId: _s, ...rest } = body; void _s; await incomeApi.update(editing.id, rest); return 'saved' as const; }
      const queue = async () => {
        await enqueueIncome({ title: body.title, amount: body.amount, category, categoryId: body.categoryId ?? undefined, receivedVia: via, moneyAccountId: body.moneyAccountId ?? undefined, supplierId: body.supplierId ?? undefined, incomeDate: date === today ? undefined : date, note: body.note ?? undefined, shopId: body.shopId, ...(repeat ? { repeatMonthly: true } : {}) });
        return 'queued' as const;
      };
      if (!isOnline()) return queue();
      try { await incomeApi.create(body); return 'saved' as const; } catch (e) { if (isNetworkError(e)) return queue(); throw e; }
    },
    onSuccess: (r) => {
      toast.success(r === 'queued' ? t('Internet nahi — aamdani phone me save, baad me khud chali jayegi') : editing ? t('Aamdani ka record badal gaya') : t('{{amount}} ki aamdani likh li — profit mein jud gayi', { amount: formatMoney(amount) }));
      void qc.invalidateQueries({ queryKey: [FIN] }); void qc.invalidateQueries({ queryKey: ['report'] }); void qc.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error && e.message === problem ? e.message : apiErrorMessage(e, t('Save nahi hua'))),
  });

  return (
    <Sheet open={!!draft} onClose={onClose} height={0.94} title={editing ? t('Edit income') : t('New income')}
      footer={<Button fullWidth size="lg" loading={save.isPending} disabled={!!problem && !!(title || amount)} onPress={() => save.mutate()}>{editing ? t('Save') : t('Aamdani likhein')}</Button>}>
      <View style={{ gap: th.space(4) }}>
        {allShops && !editing && shops.length > 0 && <Field label={t('Branch')}><ChipGroup wrap options={shops.map((s) => ({ value: s.id, label: s.name }))} value={shopId} onChange={setShopId} /></Field>}
        <Input label={t('Kis cheez ki aamdani?')} value={title} onChangeText={setTitle} maxLength={120} placeholder={t('Maslan: Pepsi incentive October')} />
        <MoneyInput label={t('Amount (Rs)')} value={amount} onChangeValue={setAmount} size="xl" />
        <Field label={t('Category')} labelAction={<Text size="xs" weight="semibold" tone="brand" onPress={onManageCategories}>{t('Categories')}</Text>}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
            {FIXED_INCOME.map((c) => <Chip key={c.id} icon={c.icon} label={t(c.label)} selected={category === c.id} onPress={() => setCategory(c.id)} />)}
            {categories.filter((c) => c.isActive !== false).map((c) => <Chip key={c.id} label={c.name} selected={category === 'CUSTOM' && categoryId === c.id} onPress={() => { setCategory('CUSTOM'); setCategoryId(c.id); }} />)}
          </View>
        </Field>
        <Field label={t('Paisa kahan aaya?')} hint={t(VIA[via].hint)}>
          <ChipGroup wrap value={via} onChange={setVia} options={(Object.keys(VIA) as IncomeReceivedVia[]).map((k) => ({ value: k, label: t(VIA[k].label), icon: VIA[k].icon }))} />
        </Field>
        {via === 'ACCOUNT' && (
          <Select label={t('Account')} value={accountId || null} onChange={setAccountId} placeholder={accountsQ.isLoading ? t('Accounts aa rahe hain…') : t('Account chunein')}
            options={(accountsQ.data?.accounts ?? []).filter((a) => a.isActive).map((a) => ({ value: a.id, label: `${a.name}${a.shop ? ` · ${a.shop.name}` : ''}` }))} />
        )}
        {(
          <Select label={via === 'SUPPLIER_KHATA' ? t('Company / supplier *') : t('Company / supplier (marzi)')} value={supplierId || 'none'} onChange={(v) => setSupplierId(v === 'none' ? '' : v)}
            options={[{ value: 'none', label: t('Koi nahi') }, ...(suppliersQ.data ?? []).map((s) => ({ value: s.id, label: s.name }))]} />
        )}
        <DatePicker label={t('Kis din?')} value={dateOfKey(date)} onChange={(d) => setDate(localKey(d) > today ? today : localKey(d))} maximumDate={new Date()} />
        <TextArea label={t('Details')} value={note} onChangeText={setNote} maxLength={500} placeholder={t('Marzi hai — maslan: claim number, mahina')} />
        <Switch value={repeat} onChange={setRepeat} label={t('Har mahine aati hai')} description={t('Agle mahine Nafaa yaad dilayega ke is mahine ki abhi nahi likhi.')} />
        {(title || amount) && problem ? <Text size="sm" tone="warning">{problem}</Text> : null}
      </View>
    </Sheet>
  );
}
