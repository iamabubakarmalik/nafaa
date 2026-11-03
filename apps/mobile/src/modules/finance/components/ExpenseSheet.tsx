/**
 * Record or edit an expense: what it was for, category, amount, day, how it
 * was paid, paid now or a bill still to pay, a note and a photo of the bill.
 * Offline, a new expense goes to the outbox and is sent when the phone is
 * back online. On the all-branches view the branch is picked here.
 */

import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, isNetworkError } from '@/core/api/errors';
import { isAllShops } from '@/core/auth/shopScope';
import { useAuthStore } from '@/core/auth/store';
import { useShops } from '@/core/auth/useShops';
import { businessDayKey, formatMoney } from '@/core/format';
import { isOnline } from '@/core/net';
import { t } from '@/core/i18n';
import { enqueueExpense, OfflineRuleError } from '@/core/offline';
import { Button, Chip, ChipGroup, Field, Input, Segmented, Sheet, Text, TextArea, MoneyInput, DatePicker, toast, useTheme } from '@/design';
import { dateOfKey, localKey, useDayStart } from '@/modules/reports/lib/period';
import { expensesApi, type CreateExpensePayload, type Expense, type ExpenseCategory, type ExpenseOverview, type UpdateExpensePayload } from '../api/expenses';
import { FIN, METHODS, STARTER_CATEGORIES, categoryEmoji } from '../lib/meta';
import { PhotoPick } from './PhotoPick';

export type ExpenseDraft =
  | { mode: 'edit'; expense: Expense }
  | { mode: 'new'; title?: string; amount?: number; categoryId?: string; paymentMethod?: string; description?: string; pending?: boolean };

export function ExpenseSheet({ draft, categories, register, onClose, onManageCategories }: {
  draft: ExpenseDraft | null;
  categories: ExpenseCategory[];
  register?: ExpenseOverview['register'];
  onClose: () => void;
  onManageCategories: () => void;
}) {
  const th = useTheme();
  const qc = useQueryClient();
  const startHour = useDayStart();
  const allShops = useAuthStore((s) => isAllShops(s.currentShopId));
  const shopsQ = useShops();
  const shops = (shopsQ.data ?? []).filter((s) => s.isActive);
  const editing = draft?.mode === 'edit' ? draft.expense : null;
  const today = businessDayKey(Date.now(), startHour);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [method, setMethod] = useState('CASH');
  const [date, setDate] = useState(today);
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState('');
  const [shopId, setShopId] = useState('');
  const originalDay = editing ? businessDayKey(new Date(editing.expenseDate), startHour) : today;

  useEffect(() => {
    if (!draft) return;
    const e = draft.mode === 'edit' ? draft.expense : null;
    const n = draft.mode === 'new' ? draft : null;
    setTitle(e?.title ?? n?.title ?? '');
    setAmount(e ? Number(e.amount) : n?.amount ?? null);
    setCategoryId(e?.category?.id ?? e?.categoryId ?? n?.categoryId ?? '');
    setMethod(e?.paymentMethod ?? n?.paymentMethod ?? 'CASH');
    setDate(e ? businessDayKey(new Date(e.expenseDate), startHour) : today);
    setPending(e ? e.status === 'PENDING' : !!n?.pending);
    setNote(e?.description ?? n?.description ?? '');
    setPhoto(e?.attachmentUrl ?? '');
    setShopId('');
  }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (allShops && !shopId && shops.length && !editing) setShopId((shops.find((s) => s.isMain) ?? shops[0]).id);
  }, [allShops, shopId, shops, editing]);

  const cancelled = editing?.status === 'CANCELLED';
  const problem = !title.trim() ? t('Expense kis cheez ka hai, likhein') : !(amount && amount > 0) ? t('Amount likhein')
    : date > today ? t('Aane wale din ka expense nahi likh sakte') : allShops && !editing && !shopId ? t('Branch chunein') : null;

  const save = useMutation({
    mutationFn: async () => {
      if (problem) throw new Error(problem);
      if (editing) {
        const payload: UpdateExpensePayload = {
          title: title.trim(), amount: amount!, categoryId, paymentMethod: method, description: note.trim(), attachmentUrl: photo,
          ...(!cancelled && { status: pending ? 'PENDING' : 'PAID' }),
          ...(date !== originalDay && { expenseDate: date }),
        };
        await expensesApi.update(editing.id, payload);
        return 'saved' as const;
      }
      const payload: CreateExpensePayload = {
        title: title.trim(), amount: amount!, paymentMethod: method, expenseDate: date, status: pending ? 'PENDING' : 'PAID',
        ...(categoryId && { categoryId }), ...(note.trim() && { description: note.trim() }), ...(photo && { attachmentUrl: photo }),
        ...(allShops && shopId && { shopId }),
      };
      const queue = async () => {
        await enqueueExpense({ title: payload.title, amount: payload.amount, paymentMethod: method as never, categoryId: payload.categoryId, description: payload.description, expenseDate: date === today ? undefined : date, status: payload.status as 'PAID' | 'PENDING', shopId: payload.shopId });
        return 'queued' as const;
      };
      if (!isOnline()) return queue();
      try {
        await expensesApi.create(payload);
        return 'saved' as const;
      } catch (e) {
        if (isNetworkError(e)) return queue();
        throw e;
      }
    },
    onSuccess: (r) => {
      toast.success(r === 'queued' ? t('Internet nahi — expense phone me save, baad me khud chala jayega') : editing ? t('Expense badal gaya') : t('{{amount}} ka expense likh liya', { amount: formatMoney(amount) }));
      void qc.invalidateQueries({ queryKey: [FIN] });
      void qc.invalidateQueries({ queryKey: ['dashboard'] });
      void qc.invalidateQueries({ queryKey: ['report'] });
      onClose();
    },
    onError: (e) => toast.error(e instanceof OfflineRuleError || e instanceof Error && e.message === problem ? e.message : apiErrorMessage(e, t('Save nahi hua'))),
  });

  const samples = useMemo(() => STARTER_CATEGORIES.map((s) => ({ ...s, cat: categories.find((c) => c.name.toLowerCase() === s.name.toLowerCase()) })).filter((s) => s.cat), [categories]);
  const cash = method === 'CASH' && !pending && !cancelled;
  const cashNote = !cash ? null : date !== today ? t('Pichli date ka cash expense aaj ki shift (galla) me nahi ginta — sirf us din ke hisaab me aata hai.')
    : register && register.open ? t('Shift {{registerNumber}} ke galle se ghatega.', { registerNumber: register.registerNumber })
      : register && !register.open ? t('Is branch me abhi koi shift khuli nahi. Yeh cash kisi galle ke hisaab me nahi aayega.') : null;

  return (
    <Sheet open={!!draft} onClose={onClose} height={0.94}
      title={editing ? t('Edit expense') : t('New expense')}
      footer={<Button fullWidth size="lg" loading={save.isPending} disabled={!!problem && !!(title || amount)} onPress={() => save.mutate()}>
        {editing ? t('Save') : pending ? t('Baqi bill likhein') : t('Expense likhein')}
      </Button>}>
      <View style={{ gap: th.space(4) }}>
        {allShops && !editing && shops.length > 0 && (
          <Field label={t('Branch')} hint={t('Expense jis branch ka hai woh chunein.')}>
            <ChipGroup options={shops.map((s) => ({ value: s.id, label: s.name }))} value={shopId} onChange={setShopId} wrap />
          </Field>
        )}
        {!editing && samples.length > 0 && !title && (
          <Field label={t('Jaldi chunein')}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
              {samples.map((s) => <Chip key={s.name} label={`${s.icon} ${t(s.sample)}`} onPress={() => { setTitle(t(s.sample)); setCategoryId(s.cat!.id); }} />)}
            </View>
          </Field>
        )}
        <Input label={t('Kis cheez ka expense?')} value={title} onChangeText={setTitle} maxLength={120} placeholder={t('Maslan: Bijli ka bill October')} />
        <MoneyInput label={t('Amount (Rs)')} value={amount} onChangeValue={setAmount} size="xl" />
        <Field label={t('Category')} labelAction={<Text size="xs" weight="semibold" tone="brand" onPress={onManageCategories}>{t('Categories')}</Text>}>
          {categories.length === 0 ? (
            <Text size="sm" tone="muted">{t('Abhi koi category nahi')}</Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: th.space(2) }}>
              <Chip label={t('Bina category')} selected={!categoryId} onPress={() => setCategoryId('')} />
              {categories.map((c) => <Chip key={c.id} label={`${categoryEmoji(c.icon) ? `${categoryEmoji(c.icon)} ` : ''}${c.name}`} selected={categoryId === c.id} onPress={() => setCategoryId(categoryId === c.id ? '' : c.id)} />)}
            </View>
          )}
        </Field>
        <Field label={t('Kahan se diye?')} hint={cashNote ?? t('Cash galle se jata hai; JazzCash, Easypaisa, bank aur card galle ko nahi chhoote.')}>
          <ChipGroup wrap options={METHODS.map((m) => ({ value: m.id, label: t(m.label), icon: m.icon }))} value={method} onChange={setMethod} />
        </Field>
        <DatePicker label={t('Kis din?')} value={dateOfKey(date)} onChange={(d) => setDate(localKey(d) > today ? today : localKey(d))} maximumDate={new Date()} />
        {!cancelled && (
          <Field label={t('Paise diye?')} hint={pending ? t('Baqi bill ban jayega. "Ada karein" dabane par us waqt ki date lagti hai aur cash galle se ghatta hai.') : t('Paise ja chuke hain — hisaab me abhi ginega.')}>
            <Segmented value={pending ? 'later' : 'now'} onChange={(v) => setPending(v === 'later')} options={[{ value: 'now', label: t('Haan, de diye') }, { value: 'later', label: t('Baad me dene') }]} />
          </Field>
        )}
        <TextArea label={t('Details')} value={note} onChangeText={setNote} maxLength={500} placeholder={t('Marzi hai — maslan: meter no. 1234, mistri ka naam')} />
        <PhotoPick label={t('Bill ki photo')} value={photo} onChange={setPhoto} />
        {(title || amount) && problem ? <Text size="sm" tone="warning">{problem}</Text> : null}
      </View>
    </Sheet>
  );
}
